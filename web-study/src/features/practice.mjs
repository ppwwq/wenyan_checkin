import {questionMistakes,effectiveAttempts} from '../domain/training.mjs';
import {esc,button,quote,essayTitle,abilities,heading} from './shared.mjs';
const choiceLabel=c=>c.displayLabel||c.id.toUpperCase();
function readingUnits(text){
 const units=[];let start=0,depth=0;
 const add=part=>{if(!part.trim()&&units.length)units[units.length-1]+=part;else units.push(part);};
 for(let i=0;i<text.length;i++){
  if('「『“（('.includes(text[i]))depth++;
  else if('」』”）)'.includes(text[i]))depth=Math.max(0,depth-1);
  if(!depth&&('。！？\n'.includes(text[i])||(text[i]==='；'&&i-start>45))){add(text.slice(start,i+1));start=i+1;}
 }
 if(start<text.length)add(text.slice(start));
 return units;
}
function readingMarks(text,q,budget){
 const answer=q.choices?.find(c=>c.id===q.answerId)?.text||'';
 const evidence=String(q.quote||'').split(/[，。；！？\n「」『』《》]/).map(s=>s.trim()).filter(s=>s.length>=4&&s.length<=28&&text.includes(s)).sort((a,b)=>text.indexOf(a)-text.indexOf(b))[0];
 const answerParts=[answer,...answer.split(/[，。、；：]/)].filter(s=>s.length>=4&&s.length<=32&&text.includes(s)).sort((a,b)=>b.length-a.length);
 const contrast=text.match(/(?:並非|而非|不是|不能|不應|不等於|不代表|不可|只有|還須|須有)[^，。；！？\n]+/)?.[0];
 const conclusion=text.match(/(?:重點是|應解作|應譯成|因此|所以|可見)[^，。；！？\n]+/)?.[0];
 const clauses=text.split(/[，。；：\n]/).map(s=>s.trim()).filter(s=>s.length>=4&&s.length<=28&&!/^(?:依本|按本|例如|例子|作用)/.test(s));
 const example=/^\s*(?:例子|例如|例：)/.test(text);
 const focus=example?text.match(/[）)]([^，。；！？\n]{4,28})(?=[。；！？\n]|$)/)?.[1]:[answerParts[0],contrast,conclusion,clauses[0]].find(s=>s&&s.length<=40);
 const ranges=[];
 for(const [value,kind] of [[focus,'highlight'],[evidence,'evidence']]){
  if(!value||value.length>budget)continue;
  const start=text.indexOf(value),end=start+value.length;
  if(ranges.some(r=>start<r.end&&end>r.start))continue;
  ranges.push({start,end,kind});budget-=value.length;
 }
 ranges.sort((a,b)=>a.start-b.start);let result='',cursor=0;
 for(const r of ranges){const tag=r.kind==='highlight'?'mark':'u';result+=esc(text.slice(cursor,r.start))+'<'+tag+' class="explanation-'+r.kind+'">'+esc(text.slice(r.start,r.end))+'</'+tag+'>';cursor=r.end;}
 return {html:result+esc(text.slice(cursor)),used:ranges.reduce((n,r)=>n+r.end-r.start,0),evidence:!!evidence,contrast:!!contrast};
}
export function annotatedExplanation(value,q,role='detail'){
 const text=String(value||'');if(!text)return '';
 let budget=Math.min(72,Math.max(24,Math.ceil(text.length*.45)));
 return '<div class="annotated-explanation">'+readingUnits(text).map((part,index)=>{
  const marked=readingMarks(part,q,budget);budget-=marked.used;
  const label=/^\s*(?:例子|例如|例：)/.test(part)?'例子':/^\s*作用[：:]/.test(part)?'作用':role==='wrong'&&index===0?'錯在這裏':marked.evidence?'原文依據':index===0?'要點':marked.contrast?'關鍵區別':'補充';
  return '<p class="explanation-detail annotated-paragraph"><span class="annotation-label">'+label+'</span><span class="annotated-copy">'+marked.html+'</span></p>';
 }).join('')+'</div>';
}
function explanationView(q,p,mode){
 const correct=q.choices.find(c=>c.id===q.answerId);
 const selected=mode==='choice'&&p.answer!==q.answerId?q.choices.find(c=>c.id===p.answer):null;
 const paragraphs=(value,role)=>annotatedExplanation(value,q,role);
 const others=q.choices.filter(c=>!selected||c.id!==selected.id);
 const answer=correct?.text||'請核對下方解析';
 const summary=String(q.summary||'').trim();
 const focus=q.ability==='vocabulary'&&q.target?'「'+q.target+'」在這裏是「'+answer+'」':summary&&summary.length<=48?summary:answer;
 const quote=String(q.quote||'');
 const hasTargetSpan=Number.isInteger(q.targetStart)&&q.targetStart>=0&&quote.slice(q.targetStart,q.targetStart+String(q.target||'').length)===q.target;
 const targetIndex=q.ability==='vocabulary'&&q.target?(hasTargetSpan?q.targetStart:quote.indexOf(q.target)):-1;
 const clause=targetIndex<0?'':quote.slice(Math.max(0,quote.lastIndexOf('，',targetIndex)+1,quote.lastIndexOf('。',targetIndex)+1,quote.lastIndexOf('；',targetIndex)+1),Math.min(...['，','。','；'].map(mark=>{const i=quote.indexOf(mark,targetIndex);return i<0?quote.length:i}))).trim();
 const keyQuote=clause.length<=30?clause:'';
 const detail=q.explanation||correct?.explanation||'';
 const extraSummary=summary&&summary!==focus&&!detail.includes(summary)?paragraphs(summary):'';
 const showDetail=extraSummary||detail&&detail!==focus&&detail!==answer;
 const genericWrong=selected&&q.ability==='vocabulary'&&q.target&&/^(?:此項把文意理解為|「[^」]+」不合本句所指或語法關係)/.test(selected.explanation||'');
 const wrongReason=genericWrong?'<p class="explanation-detail">你選了「'+esc(selected.text)+'」。'+(keyQuote?'看原句「'+esc(keyQuote)+'」，':'')+'這裏的「'+esc(q.target)+'」是「'+esc(answer)+'」。</p><details><summary>查看原有選項解析</summary>'+paragraphs(selected.explanation,'wrong')+'</details>':paragraphs(selected?.explanation||'請對照原文及參考答案。','wrong');
 return '<div class="explanation"><div class="learning-point"><h3>先看這題答案</h3><p>'+esc(focus)+'</p>'+(keyQuote?'<p class="key-quote">原句關鍵：'+esc(keyQuote)+'</p>':'')+'</div>'+
  (selected?'<section class="selected-explanation"><h3>你選的選項差在哪裏</h3><p class="selected-answer">'+esc(choiceLabel(selected))+' · '+esc(selected.text)+'</p>'+wrongReason+'</section>':'')+
  (showDetail?'<details class="answer-reason"'+(mode==='typing'?' open':'')+'><summary>看原文與完整解析</summary>'+extraSummary+paragraphs(detail)+'</details>':'')+
  '<details><summary>逐項辨析'+(selected?' · 其他選項':'')+'</summary>'+others.map(c=>'<div class="choice-review"><p class="choice-review-title">'+esc(choiceLabel(c))+' · '+esc(c.text)+'</p>'+paragraphs(c.explanation,c.id===q.answerId?'detail':'wrong')+'</div>').join('')+'</details></div>';
}
export function answerMode(q,session,payload){
 return payload?.mode||(q.responseFormat==='single-choice'?'choice':session.mode==='mixed'&&session.index%3===2?'typing':'choice');
}
export function answerPanel(q,session,state){
 const attempt=state.attempts.find(e=>e.id===session.answers[q.id]),p=attempt?.payload,mode=answerMode(q,session,p),draft=session.drafts[q.id]||'';
 let html='<div class="question-top">'+(questionMistakes(state).has(q.id)?'<span class="mistake-tag">錯題</span>':'')+'<span class="question-tag">'+esc(abilities[q.ability])+' · '+(mode==='typing'?'文字自查':'單項選擇')+'</span><button class="chip" data-action="favorite" data-id="'+esc(q.id)+'">'+(state.favorites[q.id]?.saved?'★ 已收藏':'☆ 收藏')+'</button></div><h2>'+esc(q.stem)+'</h2>';
 if(mode==='typing')html+=p?'<div class="answer-saved">'+esc(p.answer)+'</div>':'<label class="screen-reader" for="answer-input">你的答案</label><textarea id="answer-input" class="answer-input" placeholder="先用自己的話回答，再提交查看參考。">'+esc(draft)+'</textarea><p class="subtle">輸入會自動保存在此帳號。</p>';
 else html+='<div class="options" role="group" aria-label="答案選項">'+q.choices.map(c=>'<button class="option '+((p?.answer||draft)===c.id?'selected ':'')+(p&&c.id===q.answerId?'correct':'')+(p&&p.answer===c.id&&!p.correct?' wrong':'')+'" data-action="choose" data-choice="'+esc(c.id)+'" aria-pressed="'+((p?.answer||draft)===c.id)+'" '+(p?'disabled':'')+'><b>'+esc(choiceLabel(c))+'</b><span>'+esc(c.text)+'</span>'+(p&&c.id===q.answerId?'<small class="status">正確答案</small>':'')+'</button>').join('')+'</div>';
 if(!p)return html+'<div class="question-actions">'+button('unknown','暫時不會','','quiet')+button('submit','提交答案')+'</div>';
 const correction=state.corrections?.filter(c=>c.attemptId===attempt.id).at(-1);if(correction)html+='<p class="banner">此作答的有效評分已更正為'+(correction.correct?'正確':'待鞏固')+'。原始答案保留。'+esc(correction.reason)+'</p>';
 const first=state.firsts.find(f=>f.memoryId===q.memoryId&&f.day===p.day),assessment=state.assessments.get(attempt.id);
 if(session.kind==='retry')html+='<p class="section-note">本次回練不重複計入今日目標；今日已訂正的錯題，明日仍會複習。</p>';
 html+='<section class="feedback" tabindex="-1"><div class="verdict '+(p.correct===false?'miss':'')+'">'+(mode==='typing'?'對照答案，完成自查':p.correct?'這次答對了':'把這個語境再讀一次')+'</div><details class="attempt-note"><summary>作答記錄</summary><p>'+ (first?.id===attempt.id?'今天首次作答':'今天重練 · 不改變複習間隔')+'</p></details>'+explanationView(q,p,mode);
 if(mode==='typing'&&assessment===undefined)html+='<div class="self-check"><h3>先完整核對，再確定本次結果</h3><label class="check-row"><input type="checkbox" id="check-meaning"> 我已逐項比較核心詞義／意思</label><br><label class="check-row"><input type="checkbox" id="check-context"> 我已核對語境、否定與因果，讀完辨析</label><div class="toolbar">'+button('assess-good','意思完整一致')+button('assess-bad','仍有欠缺','','secondary')+'</div><p>自查結果只確定一次，歸入原提交的香港日期。</p></div>';
 else html+='<div class="next-area">'+button('next',session.index===session.questions.length-1?'完成本組':'下一題 →')+'</div>';
 html+='<div class="toolbar">'+(q.comparisonAvailable?button('compare-question','看看這個字的其他用法','data-id="'+esc(q.id)+'"','quiet'):'')+button('report','題目報錯','data-id="'+esc(q.id)+'"','quiet')+'</div></section>';
 return html;
}
export function practiceView(bank,session,state){
 if(session.completed)return summaryView(bank,session,state);
 const q=session.questions[session.index],titles=q.essayIds.map(id=>essayTitle(bank,id)).join('／')||'手法附錄';
 const hasQuote=Boolean(q.quote?.trim());
 const material=hasQuote?'<section class="source-panel"><h2>'+esc(titles)+'</h2>'+(q.quote.length>130?'<details open id="quote-details"><summary>原文 · 可收起</summary><blockquote>'+quote(q)+'</blockquote></details>':'<blockquote>'+quote(q)+'</blockquote>')+'</section>':'';
 return '<div class="practice-head">'+button('pause','← 暫停並保存','','quiet')+'<span class="session-meta">'+(session.index+1)+' / '+session.questions.length+'</span></div><div class="progress-track"><span style="width:'+((session.index/session.questions.length)*100)+'%"></span></div>'+(!hasQuote?'<p class="section-note">'+esc(titles)+'</p>':'')+'<div class="question-layout'+(!hasQuote?' question-only':'')+'">'+material+'<section class="answer-panel" id="answer-panel">'+answerPanel(q,session,state)+'</section></div>';
}
export function summaryView(bank,session,state){
 const records=effectiveAttempts(state).filter(a=>a.sessionId===session.id),firstIds=new Set(state.firsts.map(f=>f.id));
 const chapterIds=[...new Set(records.flatMap(a=>a.question.essayIds.length?a.question.essayIds:['']))];
 const rows=chapterIds.map(id=>{
  const rs=records.filter(a=>id?a.question.essayIds.includes(id):!a.question.essayIds.length);
  const correct=rs.filter(a=>a.correct===true).length,wrong=rs.filter(a=>a.correct===false).length,pending=rs.length-correct-wrong;
  return '<div class="saved-row"><h3>'+esc(id?essayTitle(bank,id):'手法附錄')+'</h3><p>'+rs.length+' 題 · 本次答對 '+correct+' · 本次答錯 '+wrong+(pending?' · 待自查 '+pending:'')+'</p></div>';
 }).join('');
 return heading('這組練習已完成','本次結果與長期複習分開看；一題答對不代表整篇已掌握。')+
 '<div class="metric-grid"><div class="metric"><strong>'+records.length+'</strong>本組已完成作答</div><div class="metric"><strong>'+records.filter(a=>firstIds.has(a.id)).length+'</strong>每日首次作答</div><div class="metric"><strong>'+records.filter(a=>!firstIds.has(a.id)).length+'</strong>當天重練作答</div></div>'+
 rows+'<p class="section-note">回練答對表示這次已訂正；當日曾答錯的知識點仍保留次日複習安排，薄弱頁不會立即清零。回練不重複計入今日目標。</p>'+
 (records.some(a=>a.question.essayIds.length>1)?'<p class="subtle">跨篇題會列於相關篇章；上方總數按實際作答次數計算。</p>':'')+
 '<div class="toolbar">'+button('nav','返回今日訓練','data-page="home"')+button('retry-today','錯題回練','','secondary')+button('extra','自選加練','','quiet')+button('nav','看看薄弱知識點','data-page="weakness"','secondary')+'</div>';
}
