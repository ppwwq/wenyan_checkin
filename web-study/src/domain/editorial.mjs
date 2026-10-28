import {reviewedMaterialErrors,hasReviewedMaterialContract} from './reviewed-material-contract.mjs';
import {targetRanges} from '../features/shared.mjs';
import {editorialPrototypes} from './editorial-prototypes.mjs';
import {originalPresentationErrors,hasOriginalPresentationContract} from './original-presentation.mjs';
import {learningCardErrors,hasLearningCardContract} from './learning-card-contract.mjs';
import {materialErrors,hasMaterialContract} from './material-contract.mjs';
export const studyPools={basic:'基礎鞏固',simulation:'已審自編仿真',official:'DSE 官方真題'};
export function questionPool(q){
 if(!q.editorial&&q.status==='reviewed')return q.provenance?.kind==='dse-original'?'official':'basic';
 if(q.provenance?.kind==='dse-original'&&q.editorial?.status==='reviewed'&&q.editorial.questionVersion===q.version)return 'official';
 return q.editorial?.status==='reviewed'&&q.editorial.questionVersion===q.version&&['basic','simulation'].includes(q.editorial.purpose)?q.editorial.purpose:'pending';
}
export function contentForReview(q){
 const fields=['id','memoryId','version','essayIds','ability','quote','stem','choices','answerId','explanation','summary','misconception','target','targetStart','targetEnd','targetContext','targetSpans','responseFormat','source','learning','prototypeRef','prototypeItems','questionMaterial','rhetoricEvidence'];
 return Object.fromEntries(fields.filter(k=>q[k]!==undefined).map(k=>[k,q[k]]));
}
export function canonical(value){
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
export async function reviewHash(q){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(contentForReview(q))))),b=>b.toString(16).padStart(2,'0')).join('');}
// A known corrected original cannot bypass release checks by dropping editorial.
export async function validateReleaseQuestion(q){return q.editorial||hasOriginalPresentationContract(q)||hasLearningCardContract(q)||hasMaterialContract(q)||hasReviewedMaterialContract(q)?validateEditorial(q):[];}
export async function validateEditorial(q,{requireReview=true}={}){
 const errors=[...originalPresentationErrors(q),...learningCardErrors(q),...materialErrors(q),...await reviewedMaterialErrors(q)],add=(condition,message)=>{if(!condition)errors.push(message);};
 add(q.responseFormat==='single-choice','作答形式須明示為選擇題');
 add(Array.isArray(q.choices)&&q.choices.length>=2&&q.choices.length<=(q.provenance?.kind==='school-original'?5:4),'選項數量不符');
 const choices=q.choices||[],ids=choices.map(c=>c.id);
 add(new Set(ids).size===ids.length&&ids.includes(q.answerId),'選項ID或答案不唯一');
 add(new Set(choices.map(c=>c.text?.trim())).size===choices.length,'選項文字重複');
 add(choices.every(c=>c.text?.trim()&&c.explanation?.trim())&&!!q.explanation?.trim(),'缺逐項解析');
 const checkTarget=(item,label)=>{
  if(!item.target)return;
  add(targetRanges(item).length>0,label+'缺明確有效區間');
  const text=String(item.quote||''),first=text.indexOf(item.target);
  if(first>=0&&text.indexOf(item.target,first+1)>=0&&item.targetSpans===undefined)
   add(Number.isInteger(item.targetStart)&&item.targetEnd===item.targetStart+item.target.length&&typeof item.targetContext==='string'&&!!item.targetContext.trim(),label+'重複字須附完整區間及受考上下文');
 };
 checkTarget(q,'受考字');
 for(const c of choices)checkTarget({...c,quote:c.text},'選項受考字');
 if(q.questionMaterial)add(['source','answer-context','independent-context'].includes(q.questionMaterial.role)&&q.questionMaterial.note?.trim(),'缺原題材料與顯示關係');
 const e=q.editorial;
 if(!e){if(requireReview)errors.push('缺逐題審查紀錄');return errors;}
 add(e.status==='reviewed'&&e.questionVersion===q.version,'審查狀態或版本不符');
 add(['basic','simulation','official'].includes(e.purpose),'用途未核定');
 add(e.contentSha256===await reviewHash(q),'題目已變動，須重新逐題核查');
 add(typeof e.reviewRecord==='string'&&e.reviewRecord.length>0,'缺可追溯審查紀錄');
 add(Array.isArray(e.sourceEvidence)&&e.sourceEvidence.length>0&&e.sourceEvidence.every(s=>Number.isInteger(s.pdfPage)&&s.pdfPage>0&&s.file&&/^[a-f0-9]{64}$/.test(s.sha256)&&s.pageViewed===true),'缺已看原頁的來源證據');
 const checks=e.optionChecks||[];
 add(checks.length===choices.length&&new Set(checks.map(c=>c.choiceId)).size===ids.length&&checks.every(c=>ids.includes(c.choiceId)&&c.reason?.trim()&&['supported','excluded'].includes(c.verdict)),'逐項排除記錄不完整');
 add(checks.filter(c=>c.verdict==='supported').length===1&&checks.find(c=>c.verdict==='supported')?.choiceId===q.answerId,'逐項判斷與唯一答案不符');
 if(e.purpose==='simulation'){
  const p=editorialPrototypes[q.prototypeRef];add(!!p,'沒有已核驗的真題原型');
  add(e.imitationScope?.trim()&&e.prototypeRef===q.prototypeRef,'缺模仿範圍或原型關係');
  add(q.provenance?.kind==='authored','自編仿真不得冒稱官方原題');
  if(p?.kind==='direct-rhetoric'){
   add(choices.length===4&&choices.every((c,i)=>c.rhetoricClass===p.classes[i]&&c.text===p.labels[i]),'四種修辭選項不符已核原型');
   const r=q.rhetoricEvidence;
   add(r?.reason?.trim()&&r.quotedText?.trim()&&(q.stem.includes(r.quotedText)||q.quote.includes(r.quotedText)),'缺限定句段的修辭依據');
   const matches=choices.filter(c=>c.rhetoricClass===r?.correctClass);
   add(matches.length===1&&matches[0].id===q.answerId,'修辭判斷與唯一答案不符');
  }else if(p){
   const items=q.prototypeItems||[];add(items.length===4&&items.every((x,i)=>x.number===i+1),'原型需要四個編號項');
   add(['a','b','c','d'].every((id,i)=>JSON.stringify(choices.find(c=>c.id===id)?.itemNumbers)===JSON.stringify(p.pairs[i])),'組合選項結構不符原型');
   if(items.length===4){
    const winners=[];for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)if(p.kind==='usage-comparison'?items[i].usage===items[j].usage:items[i].supportedBySelectedLines===true&&items[j].supportedBySelectedLines===true)winners.push([i+1,j+1]);
    add(winners.length===1&&JSON.stringify(winners[0])===JSON.stringify(choices.find(c=>c.id===q.answerId)?.itemNumbers),'材料判斷產生多解或與答案不符');
    if(p.usageClasses)add(JSON.stringify(items.map(x=>x.usage))===JSON.stringify(p.usageClasses),'具體語法辨析關係不符原型');
   }
  }
 }
 return errors;
}
