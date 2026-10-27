export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const abilities={vocabulary:'字詞',meaning:'句意',theme:'主旨',technique:'手法'};
export function attemptAnswerText(attempt){
 if(attempt.mode!=='choice')return attempt.answer||'暫時不會';
 const choice=attempt.question?.choices?.find(c=>c.id===attempt.answer);
 return choice?(choice.displayLabel||choice.id.toUpperCase())+' · '+choice.text:attempt.answer||'暫時不會';
}
export const button=(action,label,extra='',kind='')=>'<button type="button" class="btn '+kind+'" data-action="'+action+'" '+extra+'>'+label+'</button>';
export const empty=(title,text='')=>'<div class="empty"><h2>'+esc(title)+'</h2><p>'+esc(text)+'</p></div>';
export const heading=(title,note='')=>'<div class="page-head"><div><h1>'+esc(title)+'</h1>'+(note?'<p>'+esc(note)+'</p>':'')+'</div></div>';
export function quote(q){const i=Number.isInteger(q.targetStart)?q.targetStart:q.quote?.indexOf(q.target);return i>=0&&q.target&&q.quote.slice(i,i+q.target.length)===q.target?esc(q.quote.slice(0,i))+'<mark>'+esc(q.target)+'</mark>'+esc(q.quote.slice(i+q.target.length)):esc(q.quote);}
export const essayTitle=(bank,id)=>bank.essays.find(e=>e.id===id)?.title||id;


const navigationIcons={
  "weakness": "<rect x=\"5\" y=\"5\" width=\"9\" height=\"9\" rx=\"2\"/><rect x=\"18\" y=\"5\" width=\"9\" height=\"9\" rx=\"2\"/><rect x=\"5\" y=\"18\" width=\"9\" height=\"9\" rx=\"2\"/><rect x=\"18\" y=\"18\" width=\"9\" height=\"9\" rx=\"2\" fill=\"currentColor\"/><path d=\"M22.5 20.5v3m0 2h.01\" stroke=\"var(--paper)\"/>",
  "saved": "<path d=\"M9 5h14a2 2 0 0 1 2 2v21l-9-6-9 6V7a2 2 0 0 1 2-2Z\"/><path d=\"M12 11h8m-8 5h5\"/>",
  "quick": "<path d=\"M7 9V7a3 3 0 0 1 3-3h15a3 3 0 0 1 3 3v14\"/><rect x=\"4\" y=\"9\" width=\"20\" height=\"19\" rx=\"3\"/><path d=\"M9 15h10m-10 5h5m3 3 3-3-3-3\"/>",
  "home": "<path d=\"m4 15 12-10 12 10M7 13v14h7v-8h4v8h7V13\"/>",
  "library": "<path d=\"M16 8C12 5 7 5 3 6v20c4-1 9-1 13 2 4-3 9-3 13-2V6c-4-1-9-1-13 2Zm0 0v20M7 11h4m-4 5h4m10-5h4m-4 5h4\"/>",
  "history": "<rect x=\"5\" y=\"7\" width=\"22\" height=\"21\" rx=\"3\"/><path d=\"M10 4v6m12-6v6M5 14h22m-16 7 3 3 7-6\"/>",
  "account": "<circle cx=\"16\" cy=\"10\" r=\"5\"/><path d=\"M6 28v-3a10 10 0 0 1 20 0v3\"/>"
};
export const navigationIcon=name=>'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+navigationIcons[name]+'</svg>';
