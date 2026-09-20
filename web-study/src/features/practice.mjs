import {esc,button,source,quote,essayTitle,abilities,heading} from './shared.mjs';
export function answerMode(q,session,payload){
 return payload?.mode||(q.responseFormat==='single-choice'?'choice':session.mode==='mixed'&&session.index%3===2?'typing':'choice');
}
export function answerPanel(q,session,state){
 const attempt=state.attempts.find(e=>e.id===session.answers[q.id]),p=attempt?.payload,mode=answerMode(q,session,p),draft=session.drafts[q.id]||'';
 let html='<div class="question-top"><span class="question-tag">'+esc(abilities[q.ability])+' · '+(mode==='typing'?'文字自查':'單項選擇')+'</span><button class="chip" data-action="favorite" data-id="'+esc(q.id)+'">'+(state.favorites[q.id]?.saved?'★ 已收藏':'☆ 收藏')+'</button><button class="chip" data-action="report" data-id="'+esc(q.id)+'">報錯</button></div><h2>'+esc(q.stem)+'</h2>';
 if(mode==='typing')html+=p?'<div class="answer-saved">'+esc(p.answer)+'</div>':'<label class="screen-reader" for="answer-input">你的答案</label><textarea id="answer-input" class="answer-input" placeholder="先用自己的話回答，再提交查看參考。">'+esc(draft)+'</textarea><p class="subtle">輸入會自動保存在此帳號。</p>';
 else html+='<div class="options" role="group" aria-label="答案選項">'+q.choices.map(c=>'<button class="option '+((p?.answer||draft)===c.id?'selected ':'')+(p&&c.id===q.answerId?'correct':'')+(p&&p.answer===c.id&&!p.correct?' wrong':'')+'" data-action="choose" data-choice="'+esc(c.id)+'" aria-pressed="'+((p?.answer||draft)===c.id)+'" '+(p?'disabled':'')+'><b>'+esc(c.id.toUpperCase())+'</b><span>'+esc(c.text)+'</span>'+(p&&c.id===q.answerId?'<small class="status">正確答案</small>':'')+'</button>').join('')+'</div>';
 if(!p)return html+'<div class="question-actions">'+button('unknown','暫時不會','','quiet')+button('submit','提交答案')+'</div><p class="section-note">提交後鎖定本次答案，再開放解析與來源。</p>';
 const correction=state.corrections?.filter(c=>c.attemptId===attempt.id).at(-1);if(correction)html+='<p class="banner">此作答的有效評分已更正為'+(correction.correct?'正確':'待鞏固')+'。原始答案保留。'+esc(correction.reason)+'</p>';
 const first=state.firsts.find(f=>f.memoryId===q.memoryId&&f.day===p.day),assessment=state.assessments.get(attempt.id);
 html+='<section class="feedback" tabindex="-1"><div class="verdict '+(p.correct===false?'miss':'')+'">'+(mode==='typing'?'對照答案，完成自查':p.correct?'這次答對了':'把這個語境再讀一次')+'</div><div class="first-label">'+(first?.id===attempt.id?'這是本題今天的首次作答':'今天重練 · 不改變記憶間隔')+'</div><div class="explanation"><h3>參考答案</h3><p>'+esc(q.choices.find(c=>c.id===q.answerId)?.text)+'</p><p class="explanation-detail">'+esc(q.explanation)+'</p><details><summary>逐項辨析</summary>'+q.choices.map(c=>'<p class="choices-explained">'+esc(c.id.toUpperCase())+' · '+esc(c.explanation)+'</p>').join('')+'</details></div>'+source(q);
 if(mode==='typing'&&assessment===undefined)html+='<div class="self-check"><h3>先完整核對，再確定本次結果</h3><label class="check-row"><input type="checkbox" id="check-meaning"> 我已逐項比較核心詞義／意思</label><br><label class="check-row"><input type="checkbox" id="check-context"> 我已核對語境、否定與因果，讀完辨析</label><div class="toolbar">'+button('assess-good','意思完整一致')+button('assess-bad','仍有欠缺','','secondary')+'</div><p>自查結果只確定一次，歸入原提交的香港日期。</p></div>';
 else html+='<div class="next-area">'+button('next',session.index===session.questions.length-1?'完成本組':'下一題 →')+'</div>';
 html+='<div class="toolbar">'+(q.comparisonAvailable?button('compare-question','看看這個字的其他用法','data-id="'+esc(q.id)+'"','quiet'):'')+button('report','題目報錯','data-id="'+esc(q.id)+'"','quiet')+'</div></section>';
 return html;
}
export function practiceView(bank,session,state){
 if(session.completed)return summaryView(bank,session,state);
 const q=session.questions[session.index],titles=q.essayIds.map(id=>essayTitle(bank,id)).join('／')||'手法附錄';
 const hasQuote=Boolean(q.quote?.trim());
 const material=hasQuote?'<section class="source-panel"><span class="eyebrow">讀懂每一個語境</span><h2>'+esc(titles)+'</h2>'+(q.quote.length>130?'<details open id="quote-details"><summary>原文 · 可收起</summary><blockquote>'+quote(q)+'</blockquote></details>':'<blockquote>'+quote(q)+'</blockquote>')+'<p class="hint">先思考，再看解析。每一步都算積累。</p></section>':'';
 return '<div class="practice-head">'+button('pause','← 暫停並保存','','quiet')+'<span class="session-meta">'+(session.index+1)+' / '+session.questions.length+' · 題目順序已固定</span></div><div class="progress-track"><span style="width:'+((session.index/session.questions.length)*100)+'%"></span></div><div class="steps"><span class="step active">1 '+(hasQuote?(q.essayIds.length?'先讀原句':'看清概念'):'讀清題意')+'</span><span class="step">2 獨立作答</span><span class="step">3 理解語境</span></div>'+(!hasQuote?'<p class="section-note">'+esc(titles)+'</p>':'')+'<div class="question-layout'+(!hasQuote?' question-only':'')+'">'+material+'<section class="answer-panel" id="answer-panel">'+answerPanel(q,session,state)+'</section></div>';
}
export function summaryView(bank,session,state){
 const records=state.attempts.filter(e=>e.payload.sessionId===session.id),firstIds=new Set(state.firsts.map(f=>f.id));
 return heading('這一組，積累好了','首次表現與當天重練分開看；一題答對不代表整篇已掌握。')+'<div class="metric-grid"><div class="metric"><strong>'+records.length+'</strong>已完成作答</div><div class="metric"><strong>'+records.filter(e=>firstIds.has(e.id)).length+'</strong>每日首次</div><div class="metric"><strong>'+records.filter(e=>!firstIds.has(e.id)).length+'</strong>當天重練</div></div>'+session.essayIds.map(id=>{const rs=records.filter(e=>e.payload.question.essayIds.includes(id)),fs=rs.filter(e=>firstIds.has(e.id)),weak=fs.filter(e=>state.firsts.find(f=>f.id===e.id)?.correct!==true);return '<div class="saved-row"><h3>'+esc(essayTitle(bank,id))+'</h3><p>'+rs.length+' 題 · 每日首次 '+fs.length+' 題 · 待鞏固 '+weak.length+' 題</p><p class="subtle">'+weak.map(e=>esc(e.payload.question.target||e.payload.question.stem)).join('、')+'</p></div>';}).join('')+'<div class="toolbar">'+button('nav','再選一組','data-page="library"')+button('nav','看看薄弱地圖','data-page="weakness"','secondary')+'</div>';
}

