// Written practice has its own event family. It never projects into MCQ scores.
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const id=v=>typeof v==='string'&&/^(?:written|school-vocab):[\w:.-]+$/.test(v)&&v.length<=250&&!v.includes('school-original');
const text=(v,max=3000)=>typeof v==='string'&&v.length<=max;
export const normalizeWritten=value=>String(value??'').normalize('NFKC').replace(/[\s，。！？、；：,.!?;:“”「」『』"'（）()]/gu,'');
export function writtenResult(item,answer){
 if(!answer.trim())return {status:'empty',correct:null,method:'none'};
 // 待核不自动算对，也不判错。
 if(item.confidence==='待核')return {status:'review',correct:null,method:'self-review-required'};
 if(item.kind==='vocabulary'&&item.accepted.some(a=>normalizeWritten(a)===normalizeWritten(answer)))
  return {status:'matched',correct:true,method:'exact-reviewed-answer'};
 return {status:'review',correct:null,method:'self-review-required'};
}
export function validWrittenItem(item){
 return object(item)&&id(item.id)&&Number.isInteger(item.version)&&item.version>0&&
 ['vocabulary','translation','short-answer'].includes(item.kind)&&text(item.prompt,2000)&&item.prompt.length>0&&
 text(item.context,12000)&&text(item.reference,6000)&&Array.isArray(item.accepted)&&item.accepted.length<=100&&
 item.accepted.every(a=>text(a,1000)&&a.length>0)&&
 (item.kind==='vocabulary'||item.accepted.length===0)&&
 ['authored-basic','official-original','authored-translation','school-sheet'].includes(item.origin)&&
 Array.isArray(item.points)&&item.points.length<=100&&item.points.every(a=>text(a,2000))&&
 (item.teachingExamples===undefined||Array.isArray(item.teachingExamples)&&item.teachingExamples.length<=100&&item.teachingExamples.every(a=>text(a,1000)))&&
 ['target','title','essayId','senseId','commonErrors'].every(k=>item[k]===undefined||text(item[k],6000))&&text(item.rubric,6000)&&text(item.sourceLabel,2000);
}
export function validWrittenPayload(p){
 if(!object(p)||!['draft','submit','self','correction'].includes(p.action))return false;
 if(p.action==='self')return text(p.attemptId,300)&&!!p.attemptId&&['complete','revisit'].includes(p.outcome)&&p.checked===true;
 if(p.action==='correction')return text(p.attemptId,300)&&!!p.attemptId&&text(p.answer)&&Number.isSafeInteger(p.revision)&&p.revision>=0;
 if(!id(p.itemId)||!text(p.answer))return false;
 if(p.action==='draft')return Number.isSafeInteger(p.revision)&&p.revision>=0;
 if(!p.answer.trim()||!validWrittenItem(p.item)||p.item.id!==p.itemId)return false;
 const result=writtenResult(p.item,p.answer);
 return object(p.result)&&p.result.status===result.status&&p.result.correct===result.correct&&p.result.method===result.method;
}
export function writtenState(events){
 const drafts=new Map(),attempts=[],assessments=new Map(),selfReviews=new Map(),corrections=new Map();
 const sorted=[...events].filter(e=>e.type==='written').sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)||a.id.localeCompare(b.id));
 for(const e of sorted){
  const p=e.payload;if(!validWrittenPayload(p))continue;
  if(p.action==='draft'){
   const previous=drafts.get(p.itemId);
   if(!previous||p.revision>previous.revision)drafts.set(p.itemId,p);
  }
  if(p.action==='correction'){const previous=corrections.get(p.attemptId);if(!previous||p.revision>previous.revision)corrections.set(p.attemptId,p);}
  if(p.action==='submit')attempts.push(e);
  if(p.action==='self'){const reviews=selfReviews.get(p.attemptId)||[];reviews.push(e);selfReviews.set(p.attemptId,reviews);}
 }
 for(const [attemptId,reviews] of selfReviews){
  const accepted=reviews.find(e=>e.selfReviewAccepted===true)||reviews.find(e=>e.selfReviewAccepted!==false);
  if(accepted)assessments.set(attemptId,accepted.payload.outcome);
 }
 return {drafts,attempts,assessments,selfReviews,corrections};
}
export function writtenItems(content,bank){
 const current=new Map(bank.questions.map(q=>[q.id,q]));
 return content.items.filter(item=>!item.bankQuestionId||(
  current.get(item.bankQuestionId)?.active!==false&&current.get(item.bankQuestionId)?.status==='reviewed'&&
  current.get(item.bankQuestionId)?.version===item.bankQuestionVersion&&
  current.get(item.bankQuestionId)?.editorial?.contentSha256===item.bankReviewHash
 ));
}
export function filterWritten(items,filters={},events=[]){
 const state=writtenState(events),latest=new Map(state.attempts.map(e=>[e.payload.itemId,e]));
 const seen=new Set(),query=normalizeWritten(filters.query||'');
 return items.filter(item=>{
  const last=latest.get(item.id);
  if(filters.progress==='unanswered'&&last)return false;
  if(filters.progress==='revisit'&&(!last||last.payload.result.correct===true||state.assessments.get(last.id)==='complete'&&!(state.selfReviews.get(last.id)||[]).some(e=>e.payload.outcome==='revisit')))return false;
  if(filters.kind&&item.kind!==filters.kind||filters.essay&&item.essayId!==filters.essay)return false;
  if(filters.origin&&item.origin!==filters.origin)return false;
  if(query&&!normalizeWritten(item.target+' '+item.context).includes(query))return false;
  if(filters.dedupe&&item.kind==='vocabulary'){const key=item.senseId||item.id;if(seen.has(key))return false;seen.add(key);}
  return true;
 });
}
