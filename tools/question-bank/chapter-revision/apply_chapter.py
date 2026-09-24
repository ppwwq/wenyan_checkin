"""Apply a complete chapter's frozen author revision without claiming independent review."""
import copy, hashlib, json
from pathlib import Path
HERE=Path(__file__).resolve().parent
FIELDS={'stem','targetStart','choices','explanation','summary','misconception'}
def read(path):return json.loads(path.read_text(encoding='utf-8-sig'))
def digest(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode('utf-8')).hexdigest()
def require(ok,message):
 if not ok:raise ValueError(message)
def checked(directory,name,expected):
 path=(directory/name).resolve()
 require(path.is_relative_to(directory.resolve()),'Path outside chapter directory')
 require(hashlib.sha256(path.read_bytes()).hexdigest()==expected,'Frozen file changed: '+name)
 return read(path)

def apply_chapter(questions,directory=HERE):
 directory=Path(directory)
 if not (directory/'manifest.json').exists():return questions,None
 m=read(directory/'manifest.json')
 base=checked(directory,'baseline-bank.json',m['baselineSha256'])
 require(questions==base['questions'],'Chapter baseline differs from generated questions')
 pack=checked(directory,m['pack'],m['packSha256'])
 evidence=checked(directory,m['evidence'],m['evidenceSha256'])
 require(pack['reviewMethod']=='source-review-and-author-self-check','Invalid chapter review method')
 require(pack['baselineVersion']==base['version'],'Wrong baseline version')
 expected={q['id'] for q in questions if m['essayId'] in q['essayIds']}
 records=pack['records']
 require(len(records)==len(expected) and {r['id'] for r in records}==expected,'Incomplete or duplicate chapter coverage')
 require(set(evidence['questions'])==expected and evidence['errors']==[],'Incomplete source evidence')
 originals={q['id']:q for q in questions}; revised={}
 for r in records:
  old=originals[r['id']]; patch=r['patch']; ident=r['id']
  require(r['baseQuestionHash']==digest(old),'Stale question: '+ident)
  require(not(set(patch)-FIELDS),'Identity or unapproved field mutation: '+ident)
  require(all(isinstance(patch.get(k),str) and patch[k].strip() for k in ['explanation','summary','misconception']),'Missing explanation: '+ident)
  new=copy.deepcopy(old);new.update(copy.deepcopy(patch))
  require(len(new['choices'])==4 and [c['id'] for c in new['choices']]==[c['id'] for c in old['choices']],'Choice identities changed: '+ident)
  require(len({c['text'].strip() for c in new['choices']})==4,'Duplicate choices: '+ident)
  require(all(isinstance(c.get('explanation'),str) and c['explanation'].strip() for c in new['choices']),'Missing choice rationale: '+ident)
  require(new['answerId'] in {c['id'] for c in new['choices']},'Missing correct choice: '+ident)
  if new.get('targetStart') is not None and new.get('target'):
   start=new['targetStart']; require(isinstance(start,int) and start>=0 and new['quote'][start:start+len(new['target'])]==new['target'],'Incorrect highlight: '+ident)
  require(new!=old,'Empty revision: '+ident)
  new['version']=old['version']+1
  new['revisionReason']='按篇章重寫原文依據、推理及逐項排除理由；同步檢查並修訂選項，保留來源異說。'
  evidence_base=m.get('evidenceReferenceBase','chapter-revision')
  new['review']={'method':pack['reviewMethod'],'date':pack['date'],'author':pack['author'],'disposition':'revise','scope':'本章全題作者逐項來源核對和自檢；非獨立盲審、教師審定或學生實測。','evidence':f"{evidence_base}/source-evidence.json#/questions/{ident}",'previousReviewVersion':old['version'],'trialStatus':'not-run'}
  revised[ident]=new
 output=[revised.get(q['id'],q) for q in questions]
 summary={'version':m['version'],'baselineVersion':base['version'],'essayId':m['essayId'],'questions':len(records),'explanationsRewritten':len(records),'optionTextChangedQuestions':sum(any(a['text']!=b['text'] for a,b in zip(originals[k]['choices'],v['choices'])) for k,v in revised.items()),'changedOptionTexts':sum(a['text']!=b['text'] for k,v in revised.items() for a,b in zip(originals[k]['choices'],v['choices'])),'stemChanged':sum(v['stem']!=originals[k]['stem'] for k,v in revised.items()),'highlightChanged':sum(v.get('targetStart')!=originals[k].get('targetStart') for k,v in revised.items()),'untouchedQuestions':len(questions)-len(records),'independentReview':'not-run','studentTrial':'not-run','scope':'按篇章全題修訂；作者自檢。先前 qualityRevisionSummary 只記舊版階段，不代表本版改寫後仍獲獨立覆核。','currentReviewMethods':{}}
 for q in output:
  method=q.get('review',{}).get('method','none');summary['currentReviewMethods'][method]=summary['currentReviewMethods'].get(method,0)+1
 return output,summary

def apply_sequence(questions,directory=HERE):
 """Compose only explicitly registered chapters, preserving each frozen baseline."""
 directory=Path(directory)
 current,first=apply_chapter(questions,directory)
 sequence=directory/'sequence.json'
 if not sequence.exists():return current,first
 summaries=[first] if first else [];seen=set()
 for name in read(sequence)['chapters']:
  require(isinstance(name,str) and name not in seen,'Duplicate chapter directory')
  child=(directory/name).resolve();require(child!=directory.resolve() and child.is_relative_to(directory.resolve()),'Chapter directory outside root')
  require((child/'manifest.json').exists(),'Missing registered chapter manifest')
  seen.add(name);current,summary=apply_chapter(current,child);summaries.append(summary)
 changed={q['id'] for q,old in zip(current,questions) if q!=old}
 methods={}
 for q in current:
  method=q.get('review',{}).get('method','none');methods[method]=methods.get(method,0)+1
 return current,{'version':summaries[-1]['version'],'chapterCount':len(summaries),'uniqueQuestions':len(changed),'untouchedQuestions':len(questions)-len(changed),'chapters':summaries,'currentReviewMethods':methods,'scope':'各篇全題作者修訂；跨篇題按篇章可再次更新，uniqueQuestions去重。非獨立盲審、教師審定或學生實測。'}
