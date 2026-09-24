"""Read-only full-bank checks. Outputs stay beside this audit, never in content/."""
import collections, hashlib, json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
read = lambda p: json.loads(p.read_text(encoding='utf-8-sig'))
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
bank_path = ROOT / 'web-study/content/bank.json'
bank = read(bank_path)
data = read(ROOT / 'web-study/content/sources/student-content.json')
appendix = read(ROOT / 'web-study/content/sources/appendix-content.json')
pdf_path = ROOT / 'web-study/content/sources/revision-book.pdf'
from pypdf import PdfReader
pages = [p.extract_text() or '' for p in PdfReader(pdf_path).pages]
cached_pages = read(ROOT / 'tools/question-bank/pdf-pages.json')
norm = lambda s: re.sub(r'[^\u3400-\u9fffA-Za-z]', '', re.sub(r'<[^>]*>', '', str(s)))
clean = lambda s: re.sub(r'[\s\W_]', '', str(s), flags=re.UNICODE)
original = {f'essay-{i+1:02d}':norm(''.join(b[1] for p in e['pages'] for b in p['blocks'] if b[0]=='annot')) for i,e in enumerate(data)}
npages = [norm(p) for p in pages]
def resolve(path):
    ix = list(map(int, re.findall(r'\[(\d+)\]',path)))
    if path.startswith('$appendix.self_check'): return appendix['self_check'][ix[0]]
    if path.startswith('$appendix'): return appendix['sections'][ix[0]]['rows'][ix[1]]
    a,b,c,*tail = ix
    obj = data[a]['pages'][b]['blocks'][c]
    for i in tail: obj = obj[i]
    return obj

qs = bank['questions']; byid = {q['id']:q for q in qs}
base = read(ROOT/'tools/question-bank/mcq-revision/baseline-bank.json')
old = {q['id']:q for q in base['questions']}
manifest = read(ROOT/'tools/question-bank/mcq-revision/release-manifest.json')
expected = dict(old); pack_map = {}; pack_checks=[]
for p in manifest['packs']:
    path=ROOT/'tools/question-bank/mcq-revision'/p['file']; pack=read(path)
    pack_checks.append({'file':p['file'],'hashMatches':digest(path)==p['sha256']})
    for q in pack['questions']:
        q=dict(q,responseFormat='single-choice');expected[q['id']]=q;pack_map[q['id']]=p['file']

duplicate_groups=collections.defaultdict(list)
concept_groups=collections.defaultdict(list)
ledger=[]
dispute_terms=['學則不固','又敬不違','妻妾之奉','瓠落','絖','無情遊','玉壺','星如雨','憔悴損','非兵不利','鄉為身死','晚來','曉來']
absolute=re.compile(r'只有|只能|一定|完全|一律|全部|任何|毫無|絕不|永遠|只要.+便|都不|必然')
for index,q in enumerate(qs):
    errors=[];flags={};choices=q['choices'];answer=next((c for c in choices if c['id']==q['answerId']),{})
    def err(ok,msg):
        if not ok: errors.append(msg)
    err(len(choices)==4,'not-four-choices')
    err(len({c['id'] for c in choices})==4,'duplicate-choice-id')
    err(len({clean(c['text']) for c in choices})==4,'duplicate-choice-text')
    err(sum(c['id']==q['answerId'] for c in choices)==1,'invalid-answer-key')
    err(q['status']=='reviewed' and q.get('active') is True,'inactive-or-unreviewed')
    err(bool(q.get('stem','').strip()) and bool(q.get('explanation','').strip()),'empty-stem-or-explanation')
    err(all(c.get('explanation','').strip() for c in choices),'empty-choice-explanation')
    err(set(q['essayIds'])<=original.keys(),'unknown-essay')
    err('\ufffd' not in json.dumps(q,ensure_ascii=False),'replacement-character')
    s=q['source'];locators=[]
    related=s.get('relatedSources',[])+q.get('relatedSources',[])+q.get('supportingSources',[])
    for source in [s]+related:
        result={'path':source.get('blockPath'),'page':source.get('pdfPage')}
        try:
            block=resolve(source['blockPath']);result['resolved']=True
        except Exception as e:
            errors.append('unresolved-source:'+str(e));result['resolved']=False;locators.append(result);continue
        page=source.get('pdfPage');valid=isinstance(page,int) and 1<=page<=len(pages)
        err(valid,'invalid-source-page')
        anchor=source.get('anchor',source.get('quote',''))
        result['anchorInFreshPdf']=valid and norm(anchor) in npages[page-1]
        err(result['anchorInFreshPdf'],'source-anchor-absent-from-pdf:'+str(page))
        result['anchorInSourceBlock']=bool(norm(anchor)) and norm(anchor) in norm(json.dumps(block,ensure_ascii=False))
        # Vocabulary records often anchor the containing annot, not its vocab row.
        locators.append(result)
    if isinstance(s.get('printedPage'),int):
        lines=pages[s['pdfPage']-1].strip().splitlines()
        err(lines and str(s['printedPage'])==lines[-1].strip(),'printed-page-mismatch')
    else:err(clean(s.get('printedPage','')) in clean(pages[s['pdfPage']-1]),'appendix-page-label-mismatch')
    if q.get('targetStart') is not None and q.get('target'):
        i=q['targetStart'];err(q['quote'][i:i+len(q['target'])]==q['target'],'invalid-explicit-highlight')
    target=q.get('target','');quote=q.get('quote','')
    if target and quote and target not in quote:flags['targetAbsentFromQuote']=target
    if target and quote.count(target)>1 and q.get('targetStart') is None:
        flags['firstOccurrenceHighlight']={'target':target,'count':quote.count(target)}
    if q['ability']=='vocabulary':
        block=resolve(s['blockPath'])
        if isinstance(block,list) and len(block)>1 and isinstance(block[1],str):
            ix=list(map(int,re.findall(r'\[(\d+)\]',s['blockPath'])))
            vocab=not s['blockPath'].startswith('$appendix') and data[ix[0]]['pages'][ix[1]]['blocks'][ix[2]][0]=='vocab'
            if vocab and norm(answer.get('text',''))!=norm(block[1]):flags['sourceMeaningDiff']={'answer':answer.get('text'),'source':block[1]}
    if q['id'] in old:
        err(q==expected[q['id']],'differs-from-approved-packs')
        if not q['essayIds']:err(q==old[q['id']],'appendix-mutated-since-baseline')
    if re.search(r'自擬片段|自擬梗概',q['stem']+quote):flags['syntheticPassage']=True
    if re.search(r'復習書|所附|分析句|［\s*］|\[\s*\]',q['stem']):flags['editorOrClozeStem']=True
    if len(q['essayIds']) and quote:
        corpus=''.join(original[e] for e in q['essayIds'])
        visible=re.sub(r'(?m)^(?:《[^》]+》[：:]?|[甲乙丙丁][：:])','',quote)
        segments=[norm(t) for t in re.split(r'[。；！？\n…]+',visible) if len(norm(t))>3]
        misses=[p for p in segments if p not in corpus]
        if misses:flags['quoteSequenceMisses']=misses
    lens=[len(c['text']) for c in choices];al=len(answer.get('text',''));wrong=[c for c in choices if c['id']!=q['answerId']]
    if wrong and all(al>len(c['text']) for c in wrong):
        flags['uniquelyLongestCorrect']=round(al/max(len(c['text']) for c in wrong),2)
    if wrong and all(absolute.search(c['text']) for c in wrong) and not absolute.search(answer['text']):flags['allWrongAbsolute']=True
    if any('此項把文意理解為' in c['explanation'] for c in choices):flags['echoTemplate']=True
    if '須核對本句的行動者、施受關係和詞語搭配' in q['explanation']:flags['instructionInsteadOfWorkedReason']=True
    if len({c['explanation'] for c in wrong})==1:flags['sameAllWrongReasons']=True
    if q.get('summary','').strip()==q['explanation'].strip():flags['summaryEqualsExplanation']=True
    if q['explanation'].strip()==answer.get('explanation','').strip():flags['mainEqualsCorrectReason']=True
    if q.get('misconception') and len(q['misconception'])>len(q['explanation'])*2:flags['longMisconception']=True
    text=q['stem']+quote+' '.join(c['text'] for c in choices)
    relevant=[t for t in dispute_terms if t in text]
    if relevant:flags['disputedTermContext']=relevant
    if q['essayIds'] and len(q['explanation'])<=18 and q['ability']!='vocabulary':flags['shortConceptExplanation']=True
    key=json.dumps([q['essayIds'],norm(quote),clean(q['stem']),sorted(clean(c['text']) for c in choices)],ensure_ascii=False)
    duplicate_groups[key].append(q['id'])
    concept_groups[(tuple(q['essayIds']),s['blockPath'])].append(q['id'])
    ledger.append({'index':index+1,'id':q['id'],'essayIds':q['essayIds'],'ability':q['ability'],'memoryId':q['memoryId'],'pack':pack_map.get(q['id'],'retained' if q['id'] in old else 'new-confusable'),'errors':errors,'flags':flags,'sourceChecks':locators,'semanticReview':'not-individually-adjudicated'})

sys.path.insert(0,str(ROOT/'tools/question-bank/confusable'))
from build_questions import add_confusable_questions
rebuilt,_=add_confusable_questions(list(expected.values()),base['comparisons'])
rebuilt_matches={q['id']:q for q in rebuilt}==byid
duplicates=[v for v in duplicate_groups.values() if len(v)>1]
paired=[q for q in qs if '甲：' in q['stem'] and '乙：' in q['stem']]
flag_counts=collections.Counter(k for row in ledger for k in row['flags'])
errors=[{'id':r['id'],'errors':r['errors']} for r in ledger if r['errors']]
summary={'version':bank['version'],'bankSha256':digest(bank_path),'questions':len(qs),'uniqueIds':len(byid),'memoryUnits':len({q['memoryId'] for q in qs}),'pdfPages':len(pages),'pdfSha256':digest(pdf_path),'freshPdfMatchesCachedNormalized':all(norm(a)==norm(b) for a,b in zip(pages,cached_pages)) and len(pages)==len(cached_pages),'sourceLinksChecked':sum(len(r['sourceChecks']) for r in ledger),'structuralErrors':errors,'approvedPackChecks':pack_checks,'reconstructedApprovedBankMatches':rebuilt_matches,'exactDuplicateGroups':duplicates,'answerPositions':dict(collections.Counter(q['answerId'] for q in qs)),'pairedCount':len(paired),'pairedAnswers':dict(collections.Counter(next(c['text'] for c in q['choices'] if c['id']==q['answerId']) for q in paired)),'flagCounts':dict(flag_counts),'knownRemovedQuestionAbsent':'pilot-01-09-03' not in byid,'method':'Every record receives structural, source, historical and formal-risk checks. Flags are not semantic failure verdicts; separate adjudications record source/meaning review.'}
out={'summary':summary,'ledger':ledger,'sameSourceGroups':[{'source':k[1],'essays':k[0],'ids':v} for k,v in concept_groups.items() if len(v)>1]}
(HERE/'full-bank-audit.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(HERE/'fresh-pdf-pages.json').write_text(json.dumps(pages,ensure_ascii=False),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
