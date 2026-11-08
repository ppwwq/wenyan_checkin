import {filterWritten,writtenState} from '../domain/written.mjs';
import {hkDay} from '../domain/review.mjs';
import {esc,button,heading,empty,essayTitle} from './shared.mjs';

const wrongItems=(items,events)=>filterWritten(items,{kind:'vocabulary',progress:'wrong'},events);
export function writtenRecordEntry(items,events){
 const count=wrongItems(items,events).length;
 return '<section class="mistake-entry"><div><h2>打字測義錯題</h2><p>'+count+' 題待重練 · 按篇章回顧</p></div>'+button('typing-mistakes','分篇章回顧錯題','','secondary')+'</section>';
}
export function writtenMistakesView(bank,state,items){
 const wrong=wrongItems(items,state.events);
 const groups=bank.essays.map(e=>({...e,items:wrong.filter(i=>i.essayId===e.id)})).filter(e=>e.items.length);
 return heading('打字測義錯題','按篇章重練標記「不會」的字詞，先前作答會保留。')+
  button('nav','← 學習記錄','data-page="history"','quiet')+
  (groups.length?groups.map(e=>'<section class="mistake-chapter"><header class="chapter-heading"><h2>《'+esc(e.title)+'》 <span class="subtle">· '+e.items.length+' 題</span></h2>'+button('typing-retry','重練本篇錯題','data-essay="'+esc(e.id)+'"')+'</header>'+
   e.items.map(i=>'<article class="mistake-item"><div><h3>'+esc(i.prompt)+'</h3><p class="mistake-quote">'+esc(i.context)+'</p></div>'+button('written-open','回顧原作答與答案','data-id="'+esc(i.id)+'"','quiet')+'</article>').join('')+'</section>').join(''):empty('目前沒有打字測義錯題','按「不會，下一題」的字詞會出現在這裏。尚未核對的答案不會自動算錯。'));
}
export function writtenHistoryView(bank,events){
 const state=writtenState(events);
 const status=a=>state.assessments.get(a.id)==='revisit'?'不會 · 待重練':a.payload.result.correct===true?'命中已核答案':state.assessments.get(a.id)==='complete'?'自查：意思完整':'待自查';
 return '<section class="written-history"><h2>打字測義作答記錄</h2>'+(state.attempts.length?[...state.attempts].reverse().map(a=>{
  const p=a.payload,i=p.item;
  return '<article class="saved-row"><p class="record-meta"><span>'+esc(hkDay(a.createdAt))+'</span><span>'+esc(essayTitle(bank,i.essayId))+'</span></p><h3>'+esc(i.prompt)+'</h3><p class="history-answer">你的答案：'+esc(p.answer)+'</p><p class="record-status">'+status(a)+'</p><details><summary>當時原文與參考答案</summary><blockquote>'+esc(i.context)+'</blockquote><p>'+esc(i.reference)+'</p></details>'+button('written-open','查看／再練','data-id="'+esc(i.id)+'"','quiet')+'</article>';
 }).join(''):empty('還沒有文字作答記錄','提交後會保留作答；直接看答案和普通跳過不計作答。'))+'</section>';
}
