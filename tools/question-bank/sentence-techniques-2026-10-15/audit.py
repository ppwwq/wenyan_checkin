"""Read-only release checks; writes a separate audit record, never edits the bank."""
import hashlib
import json
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
KB = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / 'dse-chinese-knowledge-base'
read = lambda p: json.loads(p.read_text(encoding='utf-8'))
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
qhash = lambda q: hashlib.sha256(json.dumps(q, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
bank = read(ROOT / 'web-study/content/bank.json')
baseline = read(HERE / 'baseline.json')
release = read(HERE / 'release-manifest.json')
assert sha(ROOT / 'web-study/content/bank.json') == release['bankSha256']
changed = [q['id'] for q in bank['questions'] if qhash(q) != baseline['questionHashes'][q['id']]]
assert set(changed) == set(release['revisedIds'])
assert all(not q['essayIds'] for q in bank['questions'] if q['id'] in changed)
rows = []
for q in bank['questions']:
    if q.get('provenance', {}).get('kind') != 'dse-original':
        continue
    p = q['provenance']
    source = KB / q['source']['knowledgeBasePath']
    marking = source.parent / p['markingTitle']
    row = {'id': q['id'], 'unchanged': qhash(q) == baseline['questionHashes'][q['id']],
           'questionPdfSha256Matches': sha(source) == q['source']['sha256'],
           'markingPdfSha256Matches': sha(marking) == p['markingSha256'],
           'questionPdfPage': q['source']['pdfPage'], 'markingPdfPage': p['markingPdfPage']}
    assert all(row[k] for k in ['unchanged', 'questionPdfSha256Matches', 'markingPdfSha256Matches']), q['id']
    rows.append(row)
assert len(rows) == 27
report = {'result': 'PASS', 'bankVersion': bank['version'], 'questions': len(bank['questions']),
          'revisedStandaloneRhetoric': len(changed), 'unchangedQuestions': len(bank['questions']) - len(changed),
          'chapterQuestionsChanged': 0, 'dseOriginals': rows,
          'scope': '全庫逐題雜湊比較；27原題及評分PDF原件雜湊核對。原題欄位與806c8f9版本完全一致；本輪沒有新增逐字轉錄或教師語義覆核。'}
(HERE / 'audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({k: v for k, v in report.items() if k != 'dseOriginals'}, ensure_ascii=False))
