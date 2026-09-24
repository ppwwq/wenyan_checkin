"""Record the low-token disposition of unchanged questions without approving their content."""
from collections import Counter
from pathlib import Path
import hashlib
import json

from apply_quality import digest, read

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
TEXT = {'echo-template-phrase', 'generic-main-explanation',
        'same-wrong-rationales', 'short-main-explanation', 'short-wrong-rationale'}
FORM = {'correct-uniquely-longest', 'key-length-disparity',
        'all-wrong-absolute', 'most-wrong-absolute'}
SOURCE = {'cross-essay', 'known-dispute-context'}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    baseline = read(HERE / 'baseline-bank.json')
    live_path = ROOT / 'web-study/content/bank.json'
    live = read(live_path)
    manifest = read(HERE / 'release-manifest.json')
    inventory = read(HERE / 'prior-review-inventory.json')
    previous = {q['id']: q for q in baseline['questions']}
    current = {q['id']: q for q in live['questions']}
    inventory_by_id = {r['id']: r for r in inventory['records']}
    released = set(manifest['reviewedIds']) | set(manifest.get('authorReviewedIds', []))
    assert live['version'] == manifest['version']
    assert len(previous) == len(current) == 2134 and set(previous) == set(current)
    assert len(inventory_by_id) == len(inventory['records'])
    assert released.isdisjoint(set(inventory_by_id) - set(previous))
    pending = set(current) - released
    assert pending <= set(inventory_by_id), 'Inventory lacks an unchanged pending question'

    drafts = {}
    for name in ('record-b08-vocab.json', 'record-b09-vocab.json'):
        path = HERE / 'drafts' / name
        if path.exists():
            for row in read(path)['records']:
                assert row['id'] in pending and row['id'] not in drafts
                drafts[row['id']] = name

    rows = []
    for ident in sorted(pending):
        q = current[ident]
        old = previous[ident]
        inv = inventory_by_id[ident]
        assert q == old, 'Pending question changed: ' + ident
        assert digest(q) == inv['baseQuestionHash'] == inv['currentQuestionHash']
        assert digest(q['review']) == inv['priorReviewHash']
        assert inv['priorReview']['path'] == 'baseline-bank.json'
        assert all(all(s.get(k) is True for k in ('blockResolved', 'anchorInPdf',
                                                 'sourceMetadataMatches'))
                   for s in inv['sourceChecks'])
        signals = inv['riskSignals']
        if set(signals) & SOURCE:
            route = 'source-or-interpretation-priority'
        elif set(signals) & TEXT:
            route = 'explanation-priority'
        elif set(signals) & FORM:
            route = 'option-form-priority'
        elif 'missing-revision-reason' in signals:
            route = 'record-gap-priority'
        else:
            route = 'no-machine-signal'
        rows.append({
            'id': ident,
            'disposition': 'kept-from-prior-bank',
            'semanticRecheckedThisPass': False,
            'newContentApproved': False,
            'questionSha256': inv['baseQuestionHash'],
            'priorReviewSha256': inv['priorReviewHash'],
            'priorReview': inv['priorReview'],
            'sourceLocatorCheck': 'passed',
            'riskSignals': signals,
            'route': route,
            'unreleasedDraft': drafts.get(ident),
        })
    routes = dict(sorted(Counter(r['route'] for r in rows).items()))
    methods = dict(sorted(Counter(r['priorReview']['method'] for r in rows).items()))
    result = {
        'schemaVersion': 1,
        'bankVersion': live['version'],
        'bankSha256': sha(live_path),
        'inventorySha256': sha(HERE / 'prior-review-inventory.json'),
        'releaseManifestSha256': sha(HERE / 'release-manifest.json'),
        'summary': {
            'publishedCrossReviewed': len(manifest['reviewedIds']),
            'carriedForwardUnchangedNotRechecked': len(rows),
            'unreleasedDrafts': len(drafts),
            'routes': routes,
            'priorReviewMethods': methods,
            'sourceLocatorChecks': 'passed-for-all-carried-forward',
            'semanticReview': 'not-inferred-from-old-record-or-mechanical-check',
        },
        'records': rows,
    }
    assert len(released) + len(rows) == len(current)
    write(HERE / 'fast-disposition.json', result)
    print(json.dumps(result['summary'], ensure_ascii=False))


if __name__ == '__main__':
    main()
