"""Apply frozen reviewed edits and separately verified prior-review reuse."""
import copy, hashlib, json, math, re
from pathlib import Path
HERE=Path(__file__).resolve().parent
FIELDS={'stem','quote','target','targetStart','choices','answerId','explanation','summary','misconception','active','status','source','supportingSources','assessmentType','revisionReason','practiceGroup'}
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def digest(v):return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def checked(directory,name,sha):
 p=(directory/name).resolve()
 if not p.is_relative_to(directory.resolve()):raise ValueError('Pack path escapes directory')
 if hashlib.sha256(p.read_bytes()).hexdigest()!=sha:raise ValueError('Unapproved file hash: '+name)
 return read(p)
def require(ok,message):
 if not ok:raise ValueError(message)
def reuse_risks(q):
 wrong=[c for c in q['choices'] if c['id']!=q['answerId']]
 key=next(c for c in q['choices'] if c['id']==q['answerId'])
 flags=[]
 if len({c.get('explanation','') for c in wrong})==1:flags.append('same-wrong-rationale')
 if all(re.search('只有|只能|完全|一定|任何|毫無',c['text']) for c in wrong):flags.append('all-wrong-absolute')
 if any('此項把文意理解為' in c.get('explanation','') or '不是此處的語境義' in c.get('explanation','') for c in wrong):flags.append('echo-rationale')
 if '須核對本句的行動者' in q.get('explanation',''):flags.append('generic-reason')
 if len(key['text'])>max(len(c['text']) for c in wrong):flags.append('key-longest')
 return flags
def required_sample_ids(records,questions,seed):
 size=max(10,math.ceil(len(records)*0.1))
 ordered=sorted((r['id'] for r in records),key=lambda ident:(hashlib.sha256((seed+':'+ident).encode()).hexdigest(),ident))
 selected=set(ordered[:size]);strata={}
 for r in records:
  q=questions[r['id']];stratum=((q.get('essayIds') or ['appendix'])[0],q['review']['method'])
  strata.setdefault(stratum,[]).append(r['id'])
 for ids in strata.values():
  if not selected.intersection(ids):selected.add(next(ident for ident in ordered if ident in ids))
 return selected
def validate_reuse_audit(pack,audit,questions):
 records=pack['records'];seed=audit.get('sampleSeed')
 require(isinstance(seed,str) and bool(seed.strip()),'Missing reuse sample seed')
 require(audit.get('findings')==[] and audit.get('escalatedStrata')==[],'Reuse sample requires escalation')
 expected=required_sample_ids(records,questions,seed)
 samples=audit.get('records',[])
 require(isinstance(samples,list) and len(samples)==len(expected) and {r.get('id') for r in samples}==expected,'Reuse sample coverage differs')
 for r in samples:
  ident=r['id'];q=questions[ident]
  require(isinstance(r.get('reviewer'),str) and bool(r['reviewer'].strip()) and r.get('verdict')=='approve' and isinstance(r.get('notes'),str) and bool(r['notes'].strip()),'Unapproved reuse sample: '+ident)
  require(r['reviewer']!=q['review'].get('author'),'Reuse sample author cannot approve own question: '+ident)
  require(r.get('questionHash')==digest(q) and all(r.get(k) is True for k in ('sourceChecked','answerChecked','optionsChecked')),'Incomplete reuse sample: '+ident)
 return len(expected)
def validate_reuse_record(r,old,current,index):
 ident=old['id']
 require(r.get('version')==current['version'],'Prior review version drift: '+ident)
 require(r.get('baseQuestionHash')==digest(old),'Reuse baseline question hash drift: '+ident)
 require(r.get('currentQuestionHash')==digest(current),'Reuse current question hash drift: '+ident)
 require(old==current,'Reuse cannot change a question: '+ident)
 prior=old.get('review')
 require(isinstance(prior,dict) and bool(prior.get('method')) and bool(prior.get('scope')),'Missing prior review: '+ident)
 require(r.get('priorReviewHash')==digest(prior),'Prior review hash drift: '+ident)
 locator=r.get('priorReview',{})
 require(locator.get('path')=='baseline-bank.json' and locator.get('pointer')==f'/questions/{index}/review','Prior review locator drift: '+ident)
 require(locator.get('method')==prior.get('method') and locator.get('reviewedAt')==prior.get('date',prior.get('reviewedAt')) and locator.get('scope')==prior.get('scope'),'Prior review metadata drift: '+ident)
 evidence=r.get('evidence',{});provenance=evidence.get('provenance',{})
 require(bool(old.get('explanation','').strip()) and evidence.get('answerBasis')==old['explanation'] and provenance.get('answerBasis')=='question.explanation','Missing answer evidence: '+ident)
 reasons=evidence.get('optionReasons',{});wrong={c['id']:c.get('explanation') for c in old['choices'] if c['id']!=old['answerId']}
 require(isinstance(reasons,dict) and reasons==wrong and all(isinstance(v,str) and v.strip() for v in reasons.values()) and provenance.get('optionReasons')=='choices[].explanation','Missing option evidence: '+ident)
 require(r.get('riskSignals')==reuse_risks(current) and not reuse_risks(current) and r.get('eligibilityCandidate')=='reuse-candidate','Reuse has unresolved risk: '+ident)
 sources=[old['source']]+old['source'].get('relatedSources',[])+old.get('supportingSources',[])
 checks=r.get('sourceChecks',[])
 require(isinstance(checks,list) and len(checks)==len(sources),'Missing reuse source checks: '+ident)
 for source,check in zip(sources,checks):
  require(check.get('blockPath')==source.get('blockPath') and check.get('pdfPage')==source.get('pdfPage'),'Reuse source locator drift: '+ident)
  require(all(check.get(k) is True for k in ('blockResolved','anchorInPdf','sourceMetadataMatches')),'Failed reuse source check: '+ident)
  require(check.get('sourceSha256Status')==('matched' if source.get('sha256') else 'not-provided'),'Failed reuse source SHA check: '+ident)
def apply_quality(questions,directory=HERE):
 directory=Path(directory);mp=directory/'release-manifest.json'
 if not mp.exists():return questions,None
 m=read(mp);base=checked(directory,'baseline-bank.json',m['baselineSha256'])
 baseline={q['id']:q for q in base['questions']};current={q['id']:q for q in questions}
 require(len(baseline)==len(base['questions']),'Duplicate baseline question IDs')
 require(len(current)==len(questions) and current==baseline,'Quality baseline differs from generated bank')
 outputs={};decisions={};seen=set();author_ids=set();author_sampled=0
 for entry,author_only in [(e,False) for e in m['packs']]+[(e,True) for e in m.get('authorPacks',[])]:
  pack=checked(directory,entry['file'],entry['sha256'])
  require(isinstance(pack.get('records'),list) and bool(pack['records']),'Missing pack records')
  if author_only:
   require(isinstance(pack.get('author'),str) and bool(pack['author'].strip()),'Missing author')
   checks=None
  else:
   review=checked(directory,entry['review'],entry['reviewSha256'])
   require(review['reviewer']!=pack['author'],'Author cannot approve own pack')
   require(review['packSha256']==entry['sha256'],'Review is stale')
   checks={r['id']:r for r in review['records']}
   require(len(checks)==len(review['records']),'Duplicate review IDs')
   require(set(checks)=={r['id'] for r in pack['records']},'Review coverage differs')
  for r in pack['records']:
   ident=r['id'];require(ident in baseline and ident not in seen,'Unknown or duplicate ID: '+ident);seen.add(ident)
   old=baseline[ident];require(r['baseQuestionHash']==digest(old),'Question baseline hash drift: '+ident)
   decision=r['decision'];require(decision in {'revise','retain','hold'},'Invalid decision')
   if author_only:
    require(decision=='revise' and r.get('riskSignals')==reuse_risks(old) and r.get('contentRisk')=='none' and len(old.get('essayIds',[]))<=1 and old.get('review',{}).get('uncertain') is not True and r.get('uncertain') is not True,'High-risk revision requires another reviewer: '+ident)
    author_ids.add(ident)
   else:
    verdict=checks[ident];require(bool(verdict.get('notes')),'Missing review notes: '+ident)
    require(verdict['verdict']==('hold' if decision=='hold' else 'approve'),'Unresolved review: '+ident)
   patch=r['patch'];require(not(set(patch)-FIELDS),'Unapproved field: '+ident)
   require(bool(r.get('reason')) and bool(r.get('objective')) and bool(r.get('evidence')),'Missing content evidence: '+ident)
   for e in r['evidence']:require(all(e.get(k) for k in ['blockPath','quote','claim','pdfPage']),'Incomplete source evidence: '+ident)
   require(set(r.get('gates',{}))=={f'G{i}' for i in range(1,6)} and all(r['gates'].values()),'Missing gate reasons: '+ident)
   audits=r.get('optionAudit',[])
   require(len(audits)==4 and {a['id'] for a in audits}=={c['id'] for c in old['choices']},'Missing option audit: '+ident)
   require(all(all(a.get(k) for k in ['attraction','misreading','refutation','followUp']) for a in audits),'Empty option audit: '+ident)
   if decision=='retain':require(not patch,'Retained item has edits: '+ident)
   if decision=='hold':require(patch=={'active':False},'Hold must only stop new selections: '+ident)
   q=copy.deepcopy(old);q.update(copy.deepcopy(patch))
   if author_only:
    require(not(set(patch)&{'stem','quote','target','targetStart','answerId','source','supportingSources','active','status','assessmentType'}),'High-risk revision requires another reviewer: '+ident)
    require(q['source']==old['source'] and q['answerId']==old['answerId'] and q['active'] is True and not reuse_risks(q),'High-risk revision requires another reviewer: '+ident)
   if 'practiceGroup' in q:require(isinstance(q['practiceGroup'],str) and bool(q['practiceGroup'].strip()),'Invalid practice group: '+ident)
   if decision=='revise':require(q!=old,'Revision contains no change: '+ident)
   require(len(q['choices'])==4 and {c['id'] for c in q['choices']}=={c['id'] for c in old['choices']},'Choice IDs changed: '+ident)
   require(len({c['text'].strip() for c in q['choices']})==4 and all(c.get('explanation','').strip() for c in q['choices']),'Invalid choice text or explanation: '+ident)
   require(q['answerId'] in {c['id'] for c in q['choices']},'Invalid key: '+ident)
   require(q.get('status')=='reviewed' and (q.get('active') is True or decision=='hold'),'Invalid release state: '+ident)
   require(bool(q.get('stem')) and bool(q.get('explanation')),'Missing student text: '+ident)
   if q.get('targetStart') is not None and q.get('target'):
    start=q['targetStart'];require(isinstance(start,int) and start>=0 and q['quote'][start:start+len(q['target'])]==q['target'],'Highlight mismatch: '+ident)
   if decision!='retain':
    q['version']=old['version']+1;q['responseFormat']='single-choice'
    q['revisionReason']=r['reason']
    if author_only:
     q['review']={'method':'source-review-and-author-check','date':'2026-09-23','author':pack['author'],'disposition':decision,'scope':'作者逐項核對來源及選項；抽樣覆核另有記錄，非全題交叉審查或教師終審。','evidence':'；'.join(e['quote'] for e in r['evidence'])}
    else:
     q['review']={'method':'source-review-and-agent-cross-review','date':'2026-09-23','author':pack['author'],'reviewer':review['reviewer'],'disposition':decision,'scope':'逐項來源審讀及另一代理覆核；非教師終審或學生實測。','evidence':'；'.join(e['quote'] for e in r['evidence'])}
   outputs[ident]=q;decisions[ident]=decision
  if author_only:
   audit=checked(directory,entry['audit'],entry['auditSha256'])
   author_sampled+=validate_reuse_audit(pack,audit,outputs)
 require(len(m['reviewedIds'])==len(set(m['reviewedIds'])) and seen-author_ids==set(m['reviewedIds']),'Manifest dispositions differ')
 if 'authorPacks' in m:
  require(len(m.get('authorReviewedIds',[]))==len(set(m.get('authorReviewedIds',[]))) and author_ids==set(m.get('authorReviewedIds',[])),'Author pack IDs differ')
 reused=set();sampled=0
 indices={q['id']:i for i,q in enumerate(base['questions'])}
 for entry in m.get('reusePacks',[]):
  pack=checked(directory,entry['file'],entry['sha256'])
  require(isinstance(pack.get('records'),list) and bool(pack['records']),'Missing reuse records')
  for r in pack['records']:
   ident=r.get('id')
   require(isinstance(ident,str) and ident in baseline and ident not in seen and ident not in reused,'Unknown or duplicate reuse ID: '+str(ident))
   reused.add(ident)
   validate_reuse_record(r,baseline[ident],outputs.get(ident,current[ident]),indices[ident])
  audit=checked(directory,entry['audit'],entry['auditSha256'])
  sampled+=validate_reuse_audit(pack,audit,current)
 summary={'version':m['version'],'reviewed':len(seen)-len(author_ids),'revised':sum(v=='revise' for v in decisions.values()),'retained':sum(v=='retain' for v in decisions.values()),'held':sum(v=='hold' for v in decisions.values()),'pending':len(questions)-len(seen)-len(reused),'scope':'本輪逐題審讀及交叉審查覆蓋；未計作教師或學生驗收。'}
 if 'authorPacks' in m:
  summary['revisedAuthorReviewed']=len(author_ids)
  summary['sampledCrossReviewed']=author_sampled
  summary['scope']='作者逐題修訂與抽樣覆核分開計數；未計作全題交叉審查或教師、學生驗收。'
 if 'reusePacks' in m:
  summary['reusedPriorReview']=len(reused)
  summary['sampledCrossReviewed']=sampled+author_sampled
  summary['scope']='舊審題記錄沿用、作者修訂、抽樣覆核與逐題交叉審查分開計數；未計作全庫逐題交叉審查或教師、學生驗收。'
 return [outputs.get(q['id'],q) for q in questions],summary
