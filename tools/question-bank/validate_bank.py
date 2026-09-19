"""Validate release bank against fixed JSON and physical PDF pages."""
import hashlib,json,re,sys
from collections import Counter
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'web-study/content'
bank=json.loads((OUT/'bank.json').read_text(encoding='utf-8-sig'))
source=json.loads((OUT/'sources/student-content.json').read_text(encoding='utf-8-sig'))
pages=json.loads((ROOT/'tools/question-bank/pdf-pages.json').read_text(encoding='utf-8'))
clean=lambda s:re.sub(r'[^\u3400-\u9fffA-Za-z]','',s)
errors=[]
ids=set()
memory=set()
def check(ok,msg):
    if not ok: errors.append(msg)
def resolve(path):
    if path.startswith('$appendix'):
        a=json.loads((OUT/'sources/appendix-content.json').read_text(encoding='utf-8-sig'))
        ix=list(map(int,re.findall(r'\[(\d+)\]',path)))
        return a['sections'][ix[0]]['rows'][ix[1]]
    values=list(map(int,re.findall(r'\[(\d+)\]',path)))
    ci,pi,bi,*tail=values
    obj=source[ci]['pages'][pi]['blocks'][bi]
    for ix in tail:obj=obj[ix]
    return obj
for q in bank['questions']:
    check(q['id'] not in ids,f"duplicate ID {q['id']}")
    ids.add(q['id'])
    # Curated variants deliberately share a stable memory unit.
    memory.add(q['memoryId'])
    check(q['status']=='reviewed' and q['active'] is True,f"unreviewed release {q['id']}")
    check(len(q['choices'])==4 and len({c['text'] for c in q['choices']})==4,f"duplicate choices {q['id']}")
    check(sum(c['id']==q['answerId'] for c in q['choices'])==1,f"no unique answer {q['id']}")
    check(all(c.get('explanation') for c in q['choices']),f"missing option rationale {q['id']}")
    s=q['source']
    check(1<=s['pdfPage']<=len(pages),f"invalid physical page {q['id']}")
    actual=pages[s['pdfPage']-1]
    if isinstance(s['printedPage'],int):
        check(s['printedPage']==int(actual.strip().splitlines()[-1]),f"printed page mismatch {q['id']}")
    else:
        check(re.sub(r'\s','',s['printedPage']) in re.sub(r'\s','',actual),f"appendix printed label mismatch {q['id']}")
    try: block=resolve(s['blockPath'])
    except Exception as e: errors.append(f"invalid JSON locator {q['id']}: {e}");continue
    anchor=s.get('anchor',q['quote'])
    check(clean(anchor) in clean(actual),f"anchor missing on PDF {q['id']}")
    # Vocabulary answers are verbatim source meanings; conceptual answers use explicit review evidence.
    if q['id'].startswith('pilot-'):
        answer=next(c['text'] for c in q['choices'] if c['id']==q['answerId'])
        check(answer==block[1],f"answer differs from source {q['id']}")
        check(clean(answer) in clean(actual),f"meaning missing on PDF {q['id']}")
    if q['id'].startswith('concept-'):
        check(clean(anchor) in clean(json.dumps(block,ensure_ascii=False)),f"evidence absent from JSON block {q['id']}")
for comp in bank['comparisons']:
    check(all(i['questionId'] in ids for i in comp['items']),f"broken comparison {comp['id']}")
coverage=[]
for e in bank['essays']:
    qs=[q for q in bank['questions'] if e['id'] in q['essayIds']]
    counts=Counter(q['ability'] for q in qs)
    coverage.append({**e,'questions':len(qs),'abilityCounts':dict(counts),'missingDimensions':[a for a in ['vocabulary','meaning','theme','technique'] if not counts[a]]})
report={'result':'PASS' if not errors else 'FAIL','questions':len(ids),'memoryUnits':len(memory),'comparisons':len(bank['comparisons']),'coverage':coverage,'errors':errors,'scope':'題庫結構、選項唯一性、來源區塊和物理頁錨點逐題檢查；內容為依提供復習書編寫之練習，非官方真題或全書學術終核。','pdfSha256':hashlib.sha256((OUT/'sources/revision-book.pdf').read_bytes()).hexdigest()}
(OUT/'quality-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
sys.exit(bool(errors))

