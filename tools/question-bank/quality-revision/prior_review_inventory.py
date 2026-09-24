"""Inventory unchanged pending questions against their embedded prior reviews.

This is an evidence and routing index, not a semantic approval or a release.
"""
import argparse
import collections
import hashlib
import json
import re
from pathlib import Path

from apply_quality import digest, read
from prepare import resolve
from release import norm

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUTPUT = HERE / 'prior-review-inventory.json'
QUEUE_OUTPUT = HERE / 'prior-review-work-queue.json'
CALIBRATION = HERE / 'record-calibration-2026-09-23.json'
ABSOLUTE = re.compile(r'只有|只能|一定|完全|一律|全部|任何|毫無|絕不|永遠|必然')
KNOWN_DISPUTES = ('學則不固', '又敬不違', '瓠落', '玉壺', '無情遊', '非兵不利', '絖')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_entries(q):
    yield 'source', 0, q['source']
    for i, source in enumerate(q['source'].get('relatedSources', [])):
        yield 'source.relatedSources', i, source
    for i, source in enumerate(q.get('supportingSources', [])):
        yield 'supportingSources', i, source


def source_check(kind, index, source, data, appendix, pages, pdf_sha):
    result = {'kind': kind, 'index': index,
              'blockPath': source.get('blockPath'), 'pdfPage': source.get('pdfPage'),
              'sourceHash': digest(source), 'blockResolved': False,
              'anchorInPdf': False, 'sourceMetadataMatches': False,
              'sourceSha256Status': 'not-provided'}
    errors = []
    try:
        resolve(source['blockPath'], data, appendix)
        result['blockResolved'] = True
    except (KeyError, IndexError, ValueError, TypeError) as exc:
        errors.append('block: ' + str(exc))
    page = source.get('pdfPage')
    anchor = source.get('anchor', source.get('quote', ''))
    if isinstance(page, int) and not isinstance(page, bool) and 1 <= page <= len(pages):
        result['anchorInPdf'] = bool(anchor and norm(anchor) and norm(anchor) in norm(pages[page - 1]))
        if not result['anchorInPdf']:
            errors.append('anchor absent or empty')
    else:
        errors.append('invalid PDF page')
    supplied = source.get('sha256')
    if supplied:
        result['sourceSha256Status'] = 'matched' if supplied.lower() == pdf_sha else 'mismatch'
        if result['sourceSha256Status'] == 'mismatch':
            errors.append('source PDF SHA-256 differs')
    result['sourceMetadataMatches'] = result['sourceSha256Status'] != 'mismatch'
    if errors:
        result['error'] = '; '.join(errors)
    return result


def text_signals(q):
    choices = q['choices']
    wrong = [c for c in choices if c['id'] != q['answerId']]
    answer = next((c for c in choices if c['id'] == q['answerId']), None)
    signals = []
    if len(choices) != 4 or len({c['id'] for c in choices}) != 4 or len(wrong) != 3 or answer is None:
        return ['invalid-choice-or-answer-structure']
    if any('此項把文意理解為' in c.get('explanation', '') for c in choices):
        signals.append('echo-template-phrase')
    if len({c.get('explanation', '') for c in wrong}) == 1:
        signals.append('same-wrong-rationales')
    if '須核對本句的行動者、施受關係和詞語搭配' in q.get('explanation', ''):
        signals.append('generic-main-explanation')
    if all(ABSOLUTE.search(c['text']) for c in wrong) and not ABSOLUTE.search(answer['text']):
        signals.append('all-wrong-absolute')
    elif sum(bool(ABSOLUTE.search(c['text'])) for c in wrong) >= 2 and not ABSOLUTE.search(answer['text']):
        signals.append('most-wrong-absolute')
    if len(answer['text']) > max(len(c['text']) for c in wrong):
        signals.append('correct-uniquely-longest')
    if len(answer['text']) >= 1.5 * max(len(c['text']) for c in wrong):
        signals.append('key-length-disparity')
    if re.search(r'復習書|所附|分析句|［\s*］|\[\s*\]', q['stem']):
        signals.append('editor-or-cloze-stem')
    if len(q.get('essayIds', [])) > 1:
        signals.append('cross-essay')
    visible = q.get('stem', '') + q.get('quote', '') + ' '.join(c['text'] for c in choices)
    if any(term in visible for term in KNOWN_DISPUTES):
        signals.append('known-dispute-context')
    if not q.get('revisionReason', '').strip():
        signals.append('missing-revision-reason')
    if len(q.get('explanation', '').strip()) < 20:
        signals.append('short-main-explanation')
    if any(len(c.get('explanation', '').strip()) < 10 for c in wrong):
        signals.append('short-wrong-rationale')
    return signals


def inventory(bank_path, baseline_path, manifest_path, source_dir, pdf_pages_path):
    bank = read(bank_path)
    baseline = read(baseline_path)
    manifest = read(manifest_path)
    old_questions = baseline['questions']
    current_questions = bank['questions']
    old = {q['id']: (i, q) for i, q in enumerate(old_questions)}
    current = {q['id']: q for q in current_questions}
    if len(old) != len(old_questions) or len(current) != len(current_questions) or set(old) != set(current):
        raise ValueError('Duplicate or changed question ID set')
    if sha(baseline_path) != manifest['baselineSha256']:
        raise ValueError('Frozen baseline differs from release manifest')
    reviewed_ids = manifest['reviewedIds']
    if len(reviewed_ids) != len(set(reviewed_ids)) or not set(reviewed_ids) <= set(old):
        raise ValueError('Invalid released review IDs')
    pending = set(old) - set(reviewed_ids)
    data = read(source_dir / 'student-content.json')
    appendix = read(source_dir / 'appendix-content.json')
    pages = read(pdf_pages_path)
    pdf_sha = sha(source_dir / 'revision-book.pdf')
    calibration = read(CALIBRATION)
    report_path = Path(calibration['reportPath'])
    if (calibration['bankSha256'] != sha(bank_path)
            or calibration['sourcePdfSha256'] != pdf_sha
            or calibration['reportSha256'] != sha(report_path)):
        raise ValueError('Calibration evidence drift')
    calibrations = {r['id']: r for r in calibration['records']}
    if len(calibrations) != len(calibration['records']) or not set(calibrations) <= pending:
        raise ValueError('Duplicate or non-pending calibration ID')
    records = []
    for i, old_q in enumerate(old_questions):
        ident = old_q['id']
        if ident not in pending:
            continue
        q = current[ident]
        review = old_q.get('review')
        if not isinstance(review, dict):
            raise ValueError('Missing prior review: ' + ident)
        checks = [source_check(kind, j, s, data, appendix, pages, pdf_sha)
                  for kind, j, s in source_entries(q)]
        signals = text_signals(q)
        if digest(old_q) != digest(q):
            signals.append('baseline-current-drift')
        if any(not (c['blockResolved'] and c['anchorInPdf'] and c['sourceMetadataMatches']) for c in checks):
            signals.append('source-locator-or-file-mismatch')
        if not review.get('method') or not (review.get('date') or review.get('reviewedAt')):
            signals.append('incomplete-prior-review-metadata')
        reviewed = calibrations.get(ident)
        if reviewed:
            if (reviewed['questionSha256'] != digest(q) or reviewed['version'] != q['version']
                    or reviewed['reviewMethod'] != review.get('method')
                    or reviewed['essayIds'] != q.get('essayIds', [])
                    or reviewed['ability'] != q.get('ability')
                    or reviewed['sourcePdfPage'] != q['source'].get('pdfPage')):
                raise ValueError('Calibration question drift: ' + ident)
            if reviewed['verdict'] == 'requires-revision':
                signals.append('calibration-requires-revision')
            elif reviewed['verdict'] == 'requires-record-supplement':
                signals.append('calibration-requires-record-supplement')
            elif reviewed['verdict'] != 'reuse-supported':
                raise ValueError('Unknown calibration verdict: ' + ident)
        answer = next((c for c in q['choices'] if c['id'] == q['answerId']), None)
        wrong = [c for c in q['choices'] if c['id'] != q['answerId']]
        evidence = {
            'answerBasis': q.get('explanation', ''),
            'optionReasons': {c['id']: c.get('explanation', '') for c in wrong},
            'provenance': {'answerBasis': 'question.explanation',
                           'optionReasons': 'choices[].explanation'},
        }
        reasons = []
        if signals:
            reasons.append('Objective routing signals require targeted review; signals are not proven errors.')
        if not q.get('explanation', '').strip() or len(wrong) != 3 or any(not c.get('explanation', '').strip() for c in wrong):
            reasons.append('Missing answer or wrong-option explanation.')
        eligibility = 'requires-review' if reasons else 'reuse-candidate'
        records.append({
            'id': ident, 'version': q['version'], 'essayIds': q.get('essayIds', []),
            'ability': q.get('ability'), 'baseQuestionHash': digest(old_q),
            'currentQuestionHash': digest(q), 'priorReviewHash': digest(review),
            'priorReview': {'path': 'baseline-bank.json',
                            'pointer': f'/questions/{i}/review',
                            'method': review.get('method'),
                            'reviewedAt': review.get('date', review.get('reviewedAt')),
                            'scope': review.get('scope')},
            'revisionReason': q.get('revisionReason'),
            'evidence': evidence, 'sourceChecks': checks, 'riskSignals': signals,
            'eligibilityCandidate': eligibility, 'reasons': reasons,
            'calibration': ({'verdict': reviewed['verdict'], 'riskTag': reviewed['riskTag'],
                             'reason': reviewed['reason'],
                             'recordPath': CALIBRATION.name,
                             'recordSha256': sha(CALIBRATION)} if reviewed else None),
            'semanticApproval': 'not-evaluated',
        })
    counts = collections.Counter(r['eligibilityCandidate'] for r in records)
    flags = collections.Counter(s for r in records for s in r['riskSignals'])
    return {
        'schemaVersion': 1, 'bankPath': 'web-study/content/bank.json',
        'bankVersion': bank['version'], 'bankSha256': sha(bank_path),
        'baselinePath': 'tools/question-bank/quality-revision/baseline-bank.json',
        'baselineSha256': sha(baseline_path),
        'releaseManifestSha256': sha(manifest_path),
        'sourcePdfSha256': pdf_sha,
        'calibrationSha256': sha(CALIBRATION),
        'summary': {'releasedPriorRound': len(reviewed_ids), 'pending': len(records),
                    'eligibilityCandidateCounts': dict(sorted(counts.items())),
                    'signalCounts': dict(sorted(flags.items())),
                    'calibrationVerdicts': dict(sorted(collections.Counter(
                        r['verdict'] for r in calibration['records']).items())),
                    'routingOnly': True, 'bulkReuseApproved': False,
                    'semanticApproval': 'not-evaluated'},
        'records': records,
    }


def work_queue(result):
    groups = collections.defaultdict(list)
    for record in result['records']:
        signals = set(record['riskSignals'])
        templates = [s for s in ('echo-template-phrase', 'same-wrong-rationales',
                                  'generic-main-explanation') if s in signals]
        template = '+'.join(templates) if templates else 'none'
        if any(s.startswith('calibration-requires') for s in signals):
            risk = 'calibration-finding'
        elif 'source-locator-or-file-mismatch' in signals or 'baseline-current-drift' in signals:
            risk = 'source-or-version'
        elif signals & {'known-dispute-context', 'cross-essay'}:
            risk = 'context-or-cross-essay'
        elif templates or signals & {'short-main-explanation', 'short-wrong-rationale'}:
            risk = 'rationale'
        elif signals & {'all-wrong-absolute', 'most-wrong-absolute',
                        'correct-uniquely-longest', 'key-length-disparity',
                        'editor-or-cloze-stem'}:
            risk = 'form-cue'
        elif signals:
            risk = 'record-or-other'
        else:
            risk = 'no-text-signal-awaits-sampling'
        essay = record['essayIds'][0] if record['essayIds'] else 'appendix'
        key = (record['eligibilityCandidate'], essay, record['ability'] or 'unknown', template, risk)
        groups[key].append(record['id'])
    return {'schemaVersion': 1,
            'routingOnly': True, 'bulkReuseApproved': False,
            'groups': [{'status': key[0], 'essay': key[1], 'ability': key[2],
                        'template': key[3], 'risk': key[4], 'count': len(ids),
                        'ids': sorted(ids)}
                       for key, ids in sorted(groups.items())]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=OUTPUT)
    parser.add_argument('--queue-output', type=Path, default=QUEUE_OUTPUT)
    args = parser.parse_args()
    result = inventory(ROOT / 'web-study/content/bank.json', HERE / 'baseline-bank.json',
                       HERE / 'release-manifest.json', ROOT / 'web-study/content/sources',
                       ROOT / 'tools/question-bank/pdf-pages.json')
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    queue = work_queue(result)
    queue['inventorySha256'] = sha(args.output)
    args.queue_output.write_text(json.dumps(queue, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result['summary'], ensure_ascii=False))


if __name__ == '__main__':
    main()
