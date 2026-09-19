"""Merge the reviewed source-coverage packs while preserving identities and recording explicit revisions."""
import json,sys,hashlib,re,unicodedata,collections
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
DIR=Path(__file__).parent
ROOT=DIR.parents[2]
OUT=ROOT/'web-study/content'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def dump(p,obj):p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def pdfnorm(s):return re.sub(r'[^\u3400-\u9fffA-Za-z]','',re.sub('<[^>]*>','',str(s)))
def norm(s):return ''.join(c for c in re.sub('<[^>]*>','',str(s)) if not c.isspace() and unicodedata.category(c)[0] not in 'PZS')
base=read(DIR/'base-bank.json');data=read(OUT/'sources/student-content.json');appendix=read(OUT/'sources/appendix-content.json');pages=read(ROOT/'tools/question-bank/pdf-pages.json')
revision_pack=read(DIR/'revisions.json')
revisions={q['id']:q for q in revision_pack['questions']}
questions=[revisions.get(q['id'],q) for q in base['questions']];coverage=[]
original_quotes={f'essay-{ci+1:02d}':norm(''.join(b[1] for pg in e['pages'] for b in pg['blocks'] if b[0]=='annot')) for ci,e in enumerate(data)}
for group in 'abcd':
 path=DIR/f'group-{group}.json'
 if '--audit' in sys.argv and not path.exists():continue
 pack=read(path);questions.extend(pack['questions']);coverage.extend(pack['coverage'])
errors=[];warnings=[]
def check(ok,message):
 if not ok:errors.append(message)
def resolve(p):
 ix=[int(x) for x in re.findall(r'\[(\d+)\]',p)]
 if p.startswith('$appendix.self_check'):return appendix['self_check'][ix[0]]
 if p.startswith('$appendix'):return appendix['sections'][ix[0]]['rows'][ix[1]]
 ci,pi,bi,*tail=ix;obj=data[ci]['pages'][pi]['blocks'][bi]
 for i in tail:obj=obj[i]
 return obj
inventory={}
for ci,chapter in enumerate(data):
 for pi,page in enumerate(chapter['pages']):
  for bi,block in enumerate(page['blocks']):
   prefix=f'$[{ci}].pages[{pi}].blocks[{bi}]';kind=block[0]
   if kind in ['vocab','table','polytable']:
    for ri,row in enumerate(block[1]):
     if kind!='vocab' and ri==0:continue
     inventory[f'{prefix}[1][{ri}]']={'essayId':f'essay-{ci+1:02d}','kind':kind}
   elif kind!='head':inventory[prefix]={'essayId':f'essay-{ci+1:02d}','kind':kind}
for si,section in enumerate(appendix['sections']):
 for ri,row in enumerate(section['rows']):inventory[f'$appendix.sections[{si}].rows[{ri}]']={'essayId':None,'kind':'appendix'}
for ri in range(len(appendix['self_check'])):inventory[f'$appendix.self_check[{ri}]']={'essayId':None,'kind':'self-check'}
ids={};valid_essays={e['id'] for e in base['essays']};normalized_pages=[pdfnorm(p) for p in pages]
for q in questions:
 ident=q['id'];check(q['ability'] in ['vocabulary','meaning','theme','technique'],'Unsupported ability '+ident);check(ident not in ids,'Duplicate question '+ident);ids[ident]=q
 check(q.get('status')=='reviewed' and q.get('active') is True,'Inactive/unreviewed '+ident)
 check(set(q['essayIds'])<=valid_essays,'Unknown essay '+ident)
 check(q['essayIds'] or 'appendix' in q.get('tags',[]),'Unassigned regular question '+ident)
 choices=q.get('choices',[])
 check(len(choices)==4 and len({norm(c['text']) for c in choices})==4,'Non-distinct choices '+ident)
 check(len({c['id'] for c in choices})==4 and sum(c['id']==q['answerId'] for c in choices)==1,'Invalid answer key '+ident)
 check(all(c.get('explanation','').strip() for c in choices),'Missing option rationale '+ident)
 source=q['source']
 try: block=resolve(source['blockPath'])
 except Exception as ex:errors.append('Unresolvable source '+ident+': '+str(ex));continue
 physical=source['pdfPage'];check(isinstance(physical,int) and 1<=physical<=len(pages),'Invalid PDF page '+ident)
 if not isinstance(physical,int) or not 1<=physical<=len(pages):continue
 anchor=source.get('anchor',q['quote']);check(pdfnorm(anchor) in normalized_pages[physical-1],'Missing PDF anchor '+ident)
 if isinstance(source['printedPage'],int):
  check(str(source['printedPage'])==pages[physical-1].strip().splitlines()[-1].strip(),'Wrong printed page '+ident)
 else:check(norm(source['printedPage']) in norm(pages[physical-1]),'Wrong appendix label '+ident)
 if ident.startswith('full-'):
  check(bool(q.get('review')),'Missing review record '+ident)
  source_indices=[int(x) for x in re.findall(r'\[(\d+)\]',source['blockPath'])]
  is_vocab_row=not source['blockPath'].startswith('$appendix') and data[source_indices[0]]['pages'][source_indices[1]]['blocks'][source_indices[2]][0]=='vocab'
  if q['ability']=='vocabulary' and is_vocab_row and isinstance(block,list) and len(block)>=2 and isinstance(block[1],str):
   answer=next(c['text'] for c in choices if c['id']==q['answerId'])
   check(pdfnorm(block[1]) in normalized_pages[physical-1],'Vocabulary meaning missing from PDF page '+ident)
   if norm(answer)!=norm(block[1]):warnings.append({'id':ident,'type':'vocabulary-answer-phrasing','answer':answer,'sourceMeaning':block[1]})
  correct_text=next(c['text'] for c in choices if c['id']==q['answerId'])
  assessed_text=q['stem']+q['quote']+correct_text
  for essay in base['essays']:
   short=essay['title'].split('・')[0]
   if any('《'+title+'》' in assessed_text for title in [essay['title'],short]) and essay['id'] not in q['essayIds']:
    warnings.append({'type':'cross-essay-scope','id':ident,'missingEssay':essay['id']})
  if len(q['essayIds'])==1 and 'appendix' not in q.get('tags',[]) and not all(norm(part) in original_quotes[q['essayIds'][0]] for part in q['quote'].splitlines() if part.strip()):
   warnings.append({'type':'quote-needs-context-review','id':ident,'quote':q['quote']})
  for s in source.get('relatedSources',[])+q.get('supportingSources',[]):
   check(pdfnorm(s.get('anchor',s.get('quote',''))) in normalized_pages[s['pdfPage']-1],'Missing related source anchor '+ident)
  if q.get('targetStart') is not None and q.get('target'):
   check(q['quote'][q['targetStart']:q['targetStart']+len(q['target'])]==q['target'],'Incorrect highlight span '+ident)
mapping={}
for row in coverage:
 path=row['sourcePath'];check(path not in mapping,'Duplicate coverage '+path);mapping[path]=row
 try:resolve(path)
 except Exception as ex:errors.append('Invalid coverage path '+path+': '+str(ex))
 check(bool(row.get('reason')),'Missing coverage reason '+path)
 refs=row.get('questionIds',[])
 check(all(q in ids for q in refs),'Unknown coverage question '+path)
 if row['status']=='covered':check(bool(refs),'Covered without a question '+path)
 else:check(row['status'] in ['disputed','excluded','reference-only'],'Unknown coverage status '+path)
for path,meta in inventory.items():
 if path in mapping and meta['kind'] in ['vocab','annot']:
  check(mapping[path]['status'] in ['covered','disputed'],'Required learning item excluded '+path)
missing=[dict(sourcePath=p,**meta) for p,meta in inventory.items() if p not in mapping]
for item in missing:errors.append('Unmapped source '+item['sourcePath'])
unknown=[p for p in mapping if p not in inventory]
# Additional pointers may identify a paragraph subpart; retain them, but report them for review.
for p in unknown:
 block=resolve(p)
 is_heading=isinstance(block,list) and block and block[0]=='head'
 is_header=bool(re.search(r'\.blocks\[\d+\]\[1\]\[0\]$',p))
 if not (is_heading or is_header):warnings.append({'type':'extra-coverage-pointer','sourcePath':p})
for previous in base['questions']:
 current=ids.get(previous['id'])
 if previous['id'] in revisions:
  check(current==revisions[previous['id']] and current['memoryId']==previous['memoryId'] and current['version']>previous['version'],'Invalid explicit revision '+previous['id'])
 else:check(current==previous,'Changed existing question '+previous['id'])
# Extend comparison cards only from explicitly authored polysemy tables in the source.
comparisons=json.loads(json.dumps(base['comparisons']))
for ci,chapter in enumerate(data):
 for pi,page in enumerate(chapter['pages']):
  for bi,block in enumerate(page['blocks']):
   if block[0]!='polytable':continue
   grouped=collections.defaultdict(list)
   for ri,row in enumerate(block[1][1:],1):
    target,quote,meaning=row[:3];path=f'$[{ci}].pages[{pi}].blocks[{bi}][1][{ri}]'
    candidates=[ids[qid] for qid in mapping.get(path,{}).get('questionIds',[]) if qid in ids and norm(quote) in norm(ids[qid]['quote'])]
    if not candidates:
     candidates=[q for q in questions if q['essayIds']==[f'essay-{ci+1:02d}'] and q.get('target')==target and norm(quote) in norm(q['quote'])]
    if not candidates:
     warnings.append({'type':'comparison-row-unlinked','sourcePath':path});continue
    candidates.sort(key=lambda q:(q['ability']!='vocabulary',len(q['quote'])))
    grouped[target].append({'questionId':candidates[0]['id'],'meaning':meaning,'clue':f'原書指定語境「{quote}」：依句中對象、指代及語法分辨，不按同一字形合併詞義。','sourcePath':path})
   for target,items in grouped.items():
    if len({i['questionId'] for i in items})<2:continue
    existing=next((c for c in comparisons if c['target']==target),None)
    if existing:
     known={x['questionId'] for x in existing['items']};existing['items'].extend(i for i in items if i['questionId'] not in known)
    else:comparisons.append({'id':f'compare-full-{ci+1:02d}-{pi:02d}-{target}','target':target,'title':f'「{target}」在不同語境中的用法','status':'reviewed','items':items})
by_essay=[]
for essay in base['essays']:
 subset=[q for q in questions if essay['id'] in q['essayIds']]
 src=[mapping[p] for p,v in inventory.items() if v['essayId']==essay['id'] and p in mapping]
 by_essay.append({**essay,'questions':len(subset),'abilities':dict(collections.Counter(q['ability'] for q in subset)),'sourceItems':len(src),'coverageStatus':dict(collections.Counter(r['status'] for r in src))})
report={'result':'PASS' if not errors else 'FAIL','version':'2026.09.19.2','questions':len(questions),'previousQuestions':len(base['questions']),'revisions':revision_pack['notes'],'newQuestions':len(questions)-len(base['questions']),'memoryUnits':len({q['memoryId'] for q in questions}),'comparisons':len(comparisons),'abilities':dict(collections.Counter(q['ability'] for q in questions)),'sourceInventory':dict(collections.Counter(v['kind'] for v in inventory.values())),'sourceItems':len(inventory),'mappedSourceItems':len(inventory)-len(missing),'coverageStatus':dict(collections.Counter(mapping[p]['status'] for p in inventory if p in mapping)),'layoutEntries':len(unknown),'coverage':by_essay,'exceptions':[r for r in coverage if r['sourcePath'] in inventory and r['status']!='covered'],'missing':missing,'warnings':warnings,'errors':errors,'baseBankSha256':hashlib.sha256((DIR/'base-bank.json').read_bytes()).hexdigest(),'scope':'所供復習書範圍的逐項出題及代理核對；來源分歧明列保留。不是官方真題或教師獨立審定。'}
dump(DIR/'validation-report.json',report)
print(json.dumps({k:report[k] for k in ['result','questions','newQuestions','sourceItems','mappedSourceItems','coverageStatus']},ensure_ascii=False))
print('Errors:',len(errors),'Warnings:',len(warnings))
for err in errors[:30]:print(err)
if errors:sys.exit(1)
if '--audit' in sys.argv:sys.exit(0)
bank={**base,'version':report['version'],'notice':'按所附復習書逐項整理的自編練習，非官方真題。爭議解讀另行列明，不強行判作唯一答案。','questions':questions,'comparisons':comparisons,'coverageSummary':{'sourceItems':len(inventory),'mappedSourceItems':len(inventory),'exceptions':len(report['exceptions'])}}
dump(OUT/'bank.json',bank);dump(OUT/'coverage-report.json',report);dump(OUT/'source-coverage.json',coverage)
print('Published local bank and coverage report; previous question IDs and snapshots preserved.')
