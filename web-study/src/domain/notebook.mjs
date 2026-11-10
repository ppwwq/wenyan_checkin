import {hkDay,questionMistakes} from './review.mjs';
import {seenInPractice,wasSeen} from './daily-availability.mjs';
import {writtenState} from './written.mjs';
const abilities={vocabulary:'字詞',meaning:'句意',theme:'主旨',technique:'手法'};

export const notebookTypes=[['vocabulary','選擇 · 字詞'],['meaning','選擇 · 句意'],['theme','選擇 · 主旨'],['technique','選擇 · 手法'],['written','打字／文字']];
const choiceText=(q,id)=>{
 if(!id)return '';
 if(id==='暫時不會')return '暫時不會';
 const choice=q?.choices?.find(c=>c.id===id);
 return choice?(choice.displayLabel||String(choice.id).toUpperCase())+' · '+choice.text:id;
};
const explanationFor=q=>{
 if(q?.explanation?.trim())return q.explanation.trim();
 return q?.choices?.find(c=>c.id===q.answerId)?.explanation?.trim()||'';
};
function writtenDay(saved,attempt){
 const revisit=(saved.selfReviews.get(attempt.id)||[]).filter(e=>e.payload.outcome==='revisit').at(-1);
 return hkDay(revisit?.createdAt||attempt.createdAt);
}
export function notebookItems(bank,state,writtenItems=[],today=hkDay()){
 const questions=bank?.questions||[];
 const byId=new Map(questions.map(q=>[q.id,q]));
 const seen=seenInPractice(state,questions,today);
 const items=[];
 for(const attempt of questionMistakes(state).values()){
  const current=byId.get(attempt.questionId);
  const q=current||attempt.question;
  if(!q||q.active===false||current?.active===false)continue;
  const ability=q.ability||'vocabulary';
  items.push({kind:'mcq',id:q.id,essayIds:q.essayIds||[],type:ability,typeLabel:abilities[ability]||'選擇題',stem:q.stem||q.id,student:choiceText(attempt.question||q,attempt.answer),correct:choiceText(q,q.answerId)||'這題沒有記下參考答案',explanation:explanationFor(q),day:attempt.day,retryable:!!current&&current.active!==false&&current.status==='reviewed'&&!wasSeen(current,seen)});
 }
 const saved=writtenState(state?.events||[]);
 for(const [id,attempt] of saved.mistakes){
  const live=(writtenItems||[]).find(item=>item.id===id);
  const item=live||attempt.payload?.item;
  if(!item)continue;
  const day=writtenDay(saved,attempt);
  const touchedToday=(state?.events||[]).some(e=>e.type==='written'&&e.payload?.itemId===id&&hkDay(e.createdAt)===today);
  items.push({kind:'written',id,essayIds:[item.essayId].filter(Boolean),type:'written',typeLabel:item.kind==='translation'?'句譯':item.kind==='short-answer'?'短答':'打字測義',stem:item.prompt||id,quote:item.context||'',student:attempt.payload.answer||'',correct:item.reference||'這題沒有已核對的參考答案',explanation:[item.rubric,...(item.points||[])].filter(Boolean).join('\n'),day,retryable:!!live&&day<today&&!touchedToday});
 }
 return items.sort((a,b)=>String(b.day).localeCompare(String(a.day))||String(a.stem).localeCompare(String(b.stem),'zh-Hant'));
}
export function filterNotebook(items,filters={}){
 return items.filter(item=>{
  if(filters.essay==='@appendix')return !item.essayIds.length;
  if(filters.essay&&!item.essayIds.includes(filters.essay))return false;
  if(filters.type&&item.type!==filters.type)return false;
  return true;
 });
}
export function retryableIds(items){
 return items.filter(item=>item.kind==='mcq'&&item.retryable).map(item=>item.id);
}
