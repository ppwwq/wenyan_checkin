"""Release an explicitly approved MC revision over an immutable source-bank snapshot.

Authoring packs are drafts until their exact hashes appear in release-manifest.json.
The original generators and snapshots remain usable, but cannot silently overwrite
the reviewed revisions or apply revisions to a different upstream bank.
"""
import copy, hashlib, json
from pathlib import Path

HERE = Path(__file__).parent

def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))

def apply_revision(questions, directory=HERE):
    manifest_path = directory / 'release-manifest.json'
    if not manifest_path.exists():
        return questions, None
    manifest = read(manifest_path)
    baseline_path = directory / 'baseline-bank.json'
    if hashlib.sha256(baseline_path.read_bytes()).hexdigest() != manifest['baselineSha256']:
        raise ValueError('MC revision baseline hash changed')
    baseline = {q['id']: q for q in read(baseline_path)['questions']}
    current = {q['id']: q for q in questions}
    if len(current) != len(questions) or current != baseline:
        raise ValueError('Source-generated bank differs from MC revision baseline; review upstream changes first')
    patches, reviewed, unchanged = {}, set(), set()
    for entry in manifest['packs']:
        path = directory / entry['file']
        if path.parent.resolve() != directory.resolve():
            raise ValueError('Revision pack must be inside its authoring directory')
        if hashlib.sha256(path.read_bytes()).hexdigest() != entry['sha256']:
            raise ValueError('Unapproved revision pack change: ' + entry['file'])
        pack = read(path)
        pids = [q['id'] for q in pack['questions']]
        rids, uids = pack['reviewedIds'], pack['unchangedIds']
        if len(set(pids)) != len(pids) or len(set(rids)) != len(rids) or len(set(uids)) != len(uids):
            raise ValueError('Duplicate disposition IDs: ' + entry['file'])
        if set(pids) & set(uids) or set(rids) != set(pids) | set(uids):
            raise ValueError('Incomplete revision dispositions: ' + entry['file'])
        if reviewed & set(rids) or not set(rids) <= baseline.keys():
            raise ValueError('Overlapping/unknown review IDs: ' + entry['file'])
        reviewed.update(rids)
        unchanged.update(uids)
        for draft in pack['questions']:
            q = copy.deepcopy(draft)
            old = baseline[q['id']]
            for field in ('id', 'memoryId', 'source', 'answerId', 'essayIds'):
                if q[field] != old[field]:
                    raise ValueError('Unapproved identity/source change: ' + q['id'] + '/' + field)
            if q['version'] != old['version'] + 1:
                raise ValueError('Revision must increment exactly once: ' + q['id'])
            if len(q['choices']) != 4 or {c['id'] for c in q['choices']} != {c['id'] for c in old['choices']}:
                raise ValueError('MC choice identities changed: ' + q['id'])
            if len({c['text'].strip() for c in q['choices']}) != 4 or not all(c['explanation'].strip() for c in q['choices']):
                raise ValueError('Invalid choices or rationales: ' + q['id'])
            if not q.get('revisionReason') or not q.get('assessmentType'):
                raise ValueError('Missing pedagogic revision record: ' + q['id'])
            if q.get('active') is not True or q.get('status') != 'reviewed' or not q.get('stem','').strip():
                raise ValueError('Inactive or incomplete approved question: ' + q['id'])
            if not isinstance(q.get('quote'),str) or not q.get('explanation','').strip():
                raise ValueError('Missing material or explanation: ' + q['id'])
            if q.get('targetStart') is not None and q.get('target') and q['quote'][q['targetStart']:q['targetStart']+len(q['target'])] != q['target']:
                raise ValueError('Incorrect target highlight: ' + q['id'])
            # New choice-specific tasks must not turn into free-text prompts at
            # the third position of a legacy mixed-mode session.
            q['responseFormat'] = 'single-choice'
            patches[q['id']] = q
    expected = {q['id'] for q in questions if q['essayIds']}
    if reviewed != expected:
        raise ValueError('Designated-text review incomplete: missing=' + str(sorted(expected-reviewed)) + '; extra=' + str(sorted(reviewed-expected)))
    result = [patches.get(q['id'], q) for q in questions]
    summary = {'version': manifest['version'], 'reviewed': len(reviewed),
               'revised': len(patches), 'retainedAfterReview': len(unchanged),
               'unchangedAppendix': len(questions)-len(expected),
               'scope': '指定篇章選擇題改寫；自擬附錄草稿不發布；未經學生試做或教師獨立終審。'}
    return result, summary
