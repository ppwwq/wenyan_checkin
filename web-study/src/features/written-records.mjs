import {filterWritten,writtenState} from '../domain/written.mjs';
import {hkDay} from '../domain/review.mjs';
import {notebookView} from './notebook.mjs';
import {esc,button,empty,essayTitle} from './shared.mjs';

const wrongItems=(items,events)=>filterWritten(items,{kind:'vocabulary',progress:'wrong'},events);
export function writtenRecordEntry(items,events,mcqCount=0){
 const count=wrongItems(items,events).length+mcqCount;
 return '<section class="mistake-entry"><div><h2>錯題本</h2><p>'+count+' 題可回看 · 選擇題和打字在一起</p></div>'+button('typing-mistakes','打開錯題本','','secondary')+'</section>';
}
export function writtenMistakesView(bank,state,items,filters={},today=hkDay()){
 return notebookView(bank,state,items,filters,today);
}
export function writtenHistoryView(bank,events){
 const state=writtenState(events);
 const status=a=>state.assessments.get(a.id)==='revisit'?'不會 · 待重練':a.payload.result.correct===true?'命中已核答案':state.assessments.get(a.id)==='complete'?'自查：意思完整':'待自查';
 return '<section class="written-history"><h2>打字測義作答記錄</h2>'+(state.attempts.length?[...state.attempts].reverse().map(a=>{
  const p=a.payload,i=p.item;
  return '<article class="saved-row"><p class="record-meta"><span>'+esc(hkDay(a.createdAt))+'</span><span>'+esc(essayTitle(bank,i.essayId))+'</span></p><h3>'+esc(i.prompt)+'</h3><p class="history-answer">你的答案：'+esc(p.answer)+'</p><p class="record-status">'+status(a)+'</p><details><summary>當時原文與參考答案</summary><blockquote>'+esc(i.context)+'</blockquote><p>'+esc(i.reference)+'</p></details>'+button('written-open','查看／再練','data-id="'+esc(i.id)+'"','quiet')+'</article>';
 }).join(''):empty('還沒有文字作答記錄','提交後會保留作答；直接看答案和普通跳過不計作答。'))+'</section>';
}
