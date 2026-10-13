"""Independent integrity checks for the generated knowledge layer.
Requires PyMuPDF only for fresh PDF text extraction. Does not modify app data.
"""
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
import fitz

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'knowledge-base'
SRC = ROOT / 'web-study/content'
load = lambda p: json.loads(p.read_text(encoding='utf-8-sig'))
source = load(SRC/'sources/student-content.json')
appendix = load(SRC/'sources/appendix-content.json')
bank = load(SRC/'bank.json')
manifest = load(OUT/'manifest.json')
concepts = load(OUT/'data/concepts.json')
qindex = load(OUT/'data/questions.json')
coverage = load(SRC/'source-coverage.json')
records = [r for path in sorted((OUT/'data').glob('essay-*.json')) for r in load(path)] + load(OUT/'data/general.json')
errors = []

def check(ok, message):
    if not ok: errors.append(message)

cache = {}

def resolve(file, path):
    if file not in cache: cache[file] = load(ROOT/file)
    root = cache[file]
    for name, index in re.findall(r'\.([A-Za-z_]+)|\[(\d+)\]',path):
        root = root[name] if name else root[int(index)]
    return root

ids = {r['id'] for r in records}
check(len(ids)==len(records), 'Duplicate knowledge IDs')
check(len({c['id'] for c in concepts})==len(concepts), 'Duplicate concept IDs')
check(len(records)==manifest['knowledgeRecords'], 'Record count mismatch')
check({e['id'] for e in bank['essays']} == {g['id'] for g in load(OUT/'editorial/guide.json')['chapters']}, 'Missing chapter overview')
qids = {q['id'] for q in bank['questions']}
check(qids=={q['id'] for q in qindex}, 'Question inventory mismatch')
check(all(q['knowledgeIds'] for q in qindex), 'Question with no knowledge link')
check(all(set(q['knowledgeIds'])<=ids for q in qindex), 'Question points to unknown knowledge ID')
check(all(set(r['questionIds'])<=qids for r in records), 'Knowledge points to unknown question')
check({rid for c in concepts for rid in c['knowledgeIds']}==ids, 'Concept coverage mismatch')
qmap={q['id']:q for q in qindex}
for r in records:
    for qid in r['questionIds']:
        check(r['id'] in qmap[qid]['knowledgeIds'], f'One-way backlink {r["id"]}/{qid}')

paths = set()
resolved = 0
for r in records:
    check(bool(r['fields']) and bool(r['evidence']),f'Empty knowledge record {r["id"]}')
    for ev in r['evidence']:
        try:
            obj=resolve(ev['file'],ev['path']); resolved+=1
            check(obj is not None,f'Null source {r["id"]}')
        except (KeyError, IndexError, TypeError, FileNotFoundError) as exc:
            errors.append(f'Invalid source {r["id"]}: {exc}')
        paths.add((ev['file'],ev['path']))

# Independently enumerate every substantive source block and table row.
expected=set()
for ci,ch in enumerate(source):
    expected.add(('web-study/content/sources/student-content.json', f'$[{ci}].author'))
    expected.add(('web-study/content/sources/student-content.json', f'$[{ci}].desc'))
    for pi,page in enumerate(ch['pages']):
        pre=f'$[{ci}].pages[{pi}]';file='web-study/content/sources/student-content.json'
        if page.get('core'):expected.add((file,pre+'.core'))
        for bi,block in enumerate(page['blocks']):
            p=pre+f'.blocks[{bi}]'
            if block[0]=='head':
                if pi==0 and bi==0 and '｜' in block[1]:expected.add((file,p))
                continue
            if block[0] in ['table','polytable','vocab']:
                for ri in range(0 if block[0]=='vocab' else 1,len(block[1])):expected.add((file,p+f'[1][{ri}]'))
            else:expected.add((file,p))
for si,section in enumerate(appendix['sections']):
    for ri,row in enumerate(section['rows']):expected.add(('web-study/content/sources/appendix-content.json',f'$appendix.sections[{si}].rows[{ri}]'))
for ri in range(len(appendix['self_check'])):expected.add(('web-study/content/sources/appendix-content.json',f'$appendix.self_check[{ri}]'))
check(expected<=paths,'Missing source facts: '+str(sorted(expected-paths)[:10]))

# Re-extract from the actual tracked PDF rather than trusting the cached text file.
with fitz.open(SRC/'sources/revision-book.pdf') as pdf:
    pages=[page.get_text() for page in pdf]
clean=lambda s:re.sub(r'[^\u3400-\u9fffA-Za-z]','',s)
checked=0
for q in bank['questions']:
    if q.get('provenance',{}).get('kind')=='dse-original':continue
    s=q['source']; n=s.get('pdfPage',0)
    checked+=1
    anchor=clean(s.get('anchor',q.get('quote','')))
    check(0<n<=len(pages) and bool(anchor) and anchor in clean(pages[n-1]),f'PDF anchor not found {q["id"]}')

existing_disputed={x['sourcePath'] for x in coverage if x['status']=='disputed'}
marked_disputed={ev['path'] for r in records if r['review']['status']=='multiple-interpretations' for ev in r['evidence']}
check(existing_disputed<=marked_disputed,'Lost existing dispute')
check(sum(r['review']['status']=='hold' for r in records)==sum(q.get('active') is False for q in bank['questions']),'Lost held definition')
for file,digest in manifest['sourceFiles'].items():check(hashlib.sha256((ROOT/file).read_bytes()).hexdigest()==digest,f'Input changed: {file}')

# Check relative Markdown targets and explicit fragment anchors.
links=0
for path in OUT.rglob('*.md'):
    for target in re.findall(r'\]\(([^)]+)\)',path.read_text()):
        if re.match(r'https?://|mailto:',target):continue
        file,_,fragment=target.partition('#')
        dest=(path.parent/file).resolve() if file else path
        check(dest.exists() or dest == OUT/'audit/report.json',f'Broken link {path.relative_to(ROOT)} -> {target}')
        if dest.is_file() and fragment:
            check(f'id="{fragment}"' in dest.read_text(),f'Missing anchor {target} in {path.relative_to(ROOT)}')
        links+=1
all_markdown='\n'.join(p.read_text() for p in OUT.rglob('*.md'))
for r in records:
    check(f'id="{r["id"]}"' in all_markdown, f'Record not visible in any document: {r["id"]}')

core_review=load(OUT/'editorial/review.json')['cards']
check(len(core_review)==48,'Missing core cards')
for card in core_review:
    check(bool(card['sourcePaths']), 'Core card has no source')
    for path in card['sourcePaths']:
        block=resolve('web-study/content/sources/student-content.json',path)
        check(block[0]=='annot' and clean(card['quote']) in clean(block[1]), 'Core card quote mismatch: '+card['quote'])
# Every supplementary knowledge paragraph in the existing bank must remain reachable.
for qi,q in enumerate(bank['questions']):
    for ki,item in enumerate(q.get('learning',{}).get('knowledge',[])):
        check(('web-study/content/bank.json',f'$.questions[{qi}].learning.knowledge[{ki}]') in paths, 'Missing learning supplement: '+q['id'])

report={
    'version':manifest['version'],'result':'PASS' if not errors else 'FAIL',
    'scope':'全量結構與來源定位；自編題逐題PDF文字錨點。篇首提要、六組比較及既有異解另作編輯審讀；不是全部知識逐條獨立學術終核。',
    'coreCardsOriginalQuotesChecked':len(core_review),'knowledgeRecords':len(records),'concepts':len(concepts),'sourceFactsExpected':len(expected),
    'sourceFactsMapped':len(expected&paths),'provenanceLocationsResolved':resolved,
    'questionLinks':len(qindex),'pdfPages':len(pages),'authoredQuestionPdfAnchorsChecked':checked,
    'existingDisputedLocationsPreserved':len(existing_disputed),'markdownLinksChecked':links,
    'reviewStates':dict(Counter(r['review']['status'] for r in records)),
    'notIndependentlyRechecked':['27道DSE原題的外部原卷和評分文件','全部細項與獨立權威版本的逐條語義核對','歷年考查提示中的全部年份和題號'],
    'sourceFiles':manifest['sourceFiles'],'errors':errors}
(OUT/'audit/report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='sourceFiles'},ensure_ascii=False,indent=2))
raise SystemExit(bool(errors))
