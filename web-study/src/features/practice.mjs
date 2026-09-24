import {questionMistakes} from '../domain/training.mjs';
import {esc,button,quote,essayTitle,abilities,heading} from './shared.mjs';
const choiceLabel=c=>c.displayLabel||c.id.toUpperCase();
function explanationView(q,p,mode){
 const correct=q.choices.find(c=>c.id===q.answerId);
 const selected=mode==='choice'&&p.answer!==q.answerId?q.choices.find(c=>c.id===p.answer):null;
 const paragraphs=value=>String(value||'').split(/\r?\n/).filter(s=>s.trim()).map(s=>'<p class="explanation-detail">'+esc(s)+'</p>').join('');
 const others=q.choices.filter(c=>!selected||c.id!==selected.id);
 const answer=correct?.text||'請核對下方解析';
 const summary=String(q.summary||'').trim();
 const focus=q.ability==='vocabulary'&&q.target?'「'+q.target+'」在這裏是「'+answer+'」':summary&&summary.length<=48?summary:answer;
 const quote=String(q.quote||'');
 const hasTargetSpan=Number.isInteger(q.targetStart)&&q.targetStart>=0&&quote.slice(q.targetStart,q.targetStart+String(q.target||'').length)===q.target;
 const targetIndex=q.ability==='vocabulary'&&q.target?(hasTargetSpan?q.targetStart:quote.indexOf(q.target)):-1;
 const clause=targetIndex<0?'':quote.slice(Math.max(0,quote.lastIndexOf('，',targetIndex)+1,quote.lastIndexOf('。',targetIndex)+1,quote.lastIndexOf('；',targetIndex)+1),Math.min(...['，','。','；'].map(mark=>{const i=quote.indexOf(mark,targetIndex);return i<0?quote.length:i}))).trim();
 const keyQuote=clause.length<=30?clause:'';
 const extraSummary=summary&&summary!==focus&&summary!==q.explanation?'<p class="explanation-detail">'+esc(summary)+'</p>':'';
 const detail=q.explanation||correct?.explanation||'';
 const showDetail=extraSummary||detail&&detail!==focus&&detail!==answer;
 const genericWrong=selected&&q.ability==='vocabulary'&&q.target&&/^(?:此項把文意理解為|「[^」]+」不合本句所指或語法關係)/.test(selected.explanation||'');
 const wrongReason=genericWrong?'<p class="explanation-detail">你選了「'+esc(selected.text)+'」。'+(keyQuote?'看原句「'+esc(keyQuote)+'」，':'')+'這裏的「'+esc(q.target)+'」是「'+esc(answer)+'」。</p><details><summary>查看原有選項解析</summary>'+paragraphs(selected.explanation)+'</details>':paragraphs(selected?.explanation||'請對照原文及參考答案。');
 return '<div class="explanation"><div class="learning-point"><h3>先看這題答案</h3><p>'+esc(focus)+'</p>'+(keyQuote?'<p class="key-quote">原句關鍵：'+esc(keyQuote)+'</p>':'')+'</div>'+
  (selected?'<section class="selected-explanation"><h3>你選的選項差在哪裏</h3><p class="selected-answer">'+esc(choiceLabel(selected))+' · '+esc(selected.text)+'</p>'+wrongReason+'</section>':'')+
  (showDetail?'<details class="answer-reason"'+(mode==='typing'?' open':'')+'><summary>看原文與完整解析</summary>'+extraSummary+paragraphs(detail)+'</details>':'')+
  '<details><summary>逐項辨析'+(selected?' · 其他選項':'')+'</summary>'+others.map(c=>'<div class="choice-review"><p class="choice-review-title">'+esc(choiceLabel(c))+' · '+esc(c.text)+'</p>'+paragraphs(c.explanation)+'</div>').join('')+'</details></div>';
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
 const records=state.attempts.filter(e=>e.payload.sessionId===session.id),firstIds=new Set(state.firsts.map(f=>f.id));
 return heading('這一組，積累好了','首次表現與當天重練分開看；一題答對不代表整篇已掌握。')+'<div class="metric-grid"><div class="metric"><strong>'+records.length+'</strong>已完成作答</div><div class="metric"><strong>'+records.filter(e=>firstIds.has(e.id)).length+'</strong>每日首次</div><div class="metric"><strong>'+records.filter(e=>!firstIds.has(e.id)).length+'</strong>當天重練</div></div>'+session.essayIds.map(id=>{const rs=records.filter(e=>e.payload.question.essayIds.includes(id)),fs=rs.filter(e=>firstIds.has(e.id)),weak=fs.filter(e=>state.firsts.find(f=>f.id===e.id)?.correct!==true);return '<div class="saved-row"><h3>'+esc(essayTitle(bank,id))+'</h3><p>'+rs.length+' 題 · 每日首次 '+fs.length+' 題 · 待鞏固 '+weak.length+' 題</p><p class="subtle">'+weak.map(e=>esc(e.payload.question.target||e.payload.question.stem)).join('、')+'</p></div>';}).join('')+'<div class="toolbar">'+button('nav','返回今日訓練','data-page="home"')+button('retry-today','錯題回練','','secondary')+button('extra','自選加練','','quiet')+button('nav','看看薄弱地圖','data-page="weakness"','secondary')+'</div>';
}
