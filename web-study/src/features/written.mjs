import {esc,button,heading} from './shared.mjs';
import {filterWritten,writtenState} from '../domain/written.mjs';
const origins={'authored-basic':'自編基礎 · 文字作答','official-original':'官方題 · 文字作答','authored-translation':'自編整句翻譯'};
export function writtenView(items,bank,events,options={}){
 const state=writtenState(events),item=items.find(i=>i.id===options.itemId);
 const attempts=state.attempts,done=new Set(attempts.map(a=>a.payload.itemId));
 if(!item){
  const visible=filterWritten(items,options,events);
  return heading('字詞與整句翻譯','先寫自己的答案，再看參考與逐項自查。這裏的記錄與選擇題分開。打字測義可以一卷連續寫。')+
   (options.kind!=='translation'?button('sheet-start','打字測義 · 開始一卷','','secondary'):'')+
   '<form id="written-filters" class="scope-panel"><label>練習<select name="kind"><option value="">全部</option><option value="vocabulary" '+(options.kind==='vocabulary'?'selected':'')+'>打字測義（看句寫義）</option><option value="translation" '+(options.kind==='translation'?'selected':'')+'>整句翻譯</option></select></label> '+
   '<label>篇章<select name="essay"><option value="">全部篇章</option>'+bank.essays.filter(e=>items.some(i=>i.essayId===e.id)).map(e=>'<option value="'+esc(e.id)+'" '+(options.essay===e.id?'selected':'')+'>'+esc(e.title)+'</option>').join('')+'</select></label> '+
   '<label>來源<select name="origin"><option value="">全部來源</option>'+Object.entries(origins).map(([id,label])=>'<option value="'+id+'" '+(options.origin===id?'selected':'')+'>'+label+'</option>').join('')+'</select></label> '+
   '<label>進度<select name="progress"><option value="">全部</option><option value="unanswered" '+(options.progress==='unanswered'?'selected':'')+'>未作答</option><option value="revisit" '+(options.progress==='revisit'?'selected':'')+'>待自查／需重練</option></select></label> '+
   '<label>搜尋字詞或原句<input name="query" maxlength="100" value="'+esc(options.query||'')+'"></label><label class="check-row"><input type="checkbox" name="dedupe" '+(options.dedupe?'checked':'')+'>同字同義先練一個語境</label><button class="btn" type="submit">篩選</button></form>'+
   '<p role="status">可選 '+visible.length+' 個語境 · 已提交 '+done.size+' 題 · '+attempts.filter(a=>a.payload.result.correct===true).length+' 次命中已核答案 · '+state.assessments.size+' 次完成自查</p>'+
   '<p class="section-note">按已核原文、詞義差異與官方題例選材，不標作高頻預測。整句翻譯不自動判分；不同年份的官方評分要求分別保留。</p>'+
   '<div class="library-grid">'+visible.map(i=>'<article class="library-card"><p class="question-tag">'+origins[i.origin]+'</p><h2>'+esc(i.target||i.title)+'</h2><p>'+esc(i.context.slice(0,100))+'</p>'+button('written-open',done.has(i.id)?'查看／再練':'開始輸入','data-id="'+esc(i.id)+'"')+'</article>').join('')+'</div>'+(visible.length?'':'<p>此範圍暫無已核文字練習，請調整篩選。</p>');
 }
 const last=options.fresh?null:attempts.filter(a=>a.payload.itemId===item.id).at(-1);
 const q=last?.payload.item||item,assessment=last&&state.assessments.get(last.id);
 const draft=state.drafts.get(item.id)?.answer||'';
 const context=q.target&&Number.isInteger(q.targetStart)&&q.context.slice(q.targetStart,q.targetStart+q.target.length)===q.target?
  esc(q.context.slice(0,q.targetStart))+'<mark>'+esc(q.target)+'</mark>'+esc(q.context.slice(q.targetStart+q.target.length)):esc(q.context);
 const sheet=options.sheet,sheetLast=sheet&&sheet.index+1>=sheet.ids.length;
 const sheetMove=submitted=>!sheet?'':sheetLast&&submitted?button('nav','本卷完成，返回題型館','data-page="review"'):button('sheet-next',sheetLast?(submitted?'本卷完成，返回題型館':'跳過並完卷'):submitted?'下一題 →':'跳過，下一題','',submitted?'':'secondary');
 const back=sheet?'<p class="sheet-progress">打字測義 · 第 '+(sheet.index+1)+' / '+sheet.ids.length+' 題</p>'+button('nav','← 題型館','data-page="review"','quiet'):button('written-list','← 返回文字練習','','quiet');
 let html=back+'<section class="answer-panel written-panel"><p class="question-tag">'+origins[q.origin]+'</p><h1>'+esc(q.prompt)+'</h1><blockquote>'+context+'</blockquote>';
 if(!last)return html+'<label for="written-answer">你的'+(q.kind==='translation'?'完整譯文':'答案')+'</label><textarea id="written-answer" class="answer-input" maxlength="3000" placeholder="'+(q.kind==='translation'?'保留人物、動作、否定、條件及語氣。':q.kind==='short-answer'?'按題目要求摘錄原句，或用自己的話簡答。':'用這個語境中的意思作答。')+'">'+esc(draft)+'</textarea><p class="subtle">草稿會保存到此帳號。提交後才顯示參考答案。</p><div class="toolbar">'+button('written-submit','提交並核對','data-id="'+esc(q.id)+'"')+sheetMove(false)+'</div></section>';
 html+='<div class="answer-saved">'+esc(last.payload.answer)+'</div><section class="feedback"><h2 tabindex="-1" id="written-feedback">'+(last.payload.result.correct===true?'與已核答案一致':'請逐項核對意思')+'</h2><p>'+(q.kind!=='vocabulary'?'本題不按關鍵字自動判分；下列是核對依據。':last.payload.result.correct===true?'這是文字練習的答案匹配；不是另算一次官方考試分數。':'未匹配不等於答錯。合理改寫請依語境和下列要點自查。')+'</p><h3>參考答案</h3><p>'+esc(q.reference)+'</p>';
 if(q.accepted.length>1)html+='<p>已核可接受表述：'+esc(q.accepted.join('／'))+'</p>';
 if(q.teachingExamples?.length)html+='<p>教學同義示例（編者補充）：'+esc(q.teachingExamples.join('／'))+'</p>';
 html+='<ul>'+q.points.map(p=>'<li>'+esc(p)+'</li>').join('')+'</ul><h3>本題評分／自查規則</h3><p class="preserve-lines">'+esc(q.rubric)+'</p><details><summary>來源與常見錯譯</summary><p>'+esc(q.sourceLabel)+'</p><p>'+esc(q.commonErrors||'')+'</p></details>';
 if(last.payload.result.correct===null&&!assessment)html+='<label class="check-row"><input id="written-checked" type="checkbox">我已核對每項意思、否定、施受及範圍，沒有只對關鍵字。</label><div class="toolbar">'+button('written-self','自查：意思完整','data-attempt="'+esc(last.id)+'" data-outcome="complete"')+button('written-self','自查：仍有欠缺','data-attempt="'+esc(last.id)+'" data-outcome="revisit"','secondary')+'</div>';
 else if(assessment)html+='<p class="banner">自查記錄：'+(assessment==='complete'?'意思完整':'仍有欠缺')+'。這是你的自查，並非官方評分。</p>';
 if(q.kind!=='vocabulary')html+='<section class="written-correction"><label for="written-correction">訂正稿（不改原答案或得分）</label><textarea id="written-correction" data-attempt="'+esc(last.id)+'" maxlength="3000">'+esc(state.corrections.get(last.id)?.answer||'')+'</textarea><p class="subtle">按上述要點改寫；訂正草稿自動保存。重新檢驗請按「再練一次」。</p>'+button('written-correction-save','保存訂正稿')+'</section>';
 const reviews=state.selfReviews.get(last.id)||[];
 if(reviews.length>1)html+='<details class="written-conflicts"><summary>已保留 '+reviews.length+' 份裝置自查</summary><p>以伺服器首先收到的自查為主；其他裝置的記錄亦完整保留，沒有覆蓋原作答。</p>'+reviews.map(e=>'<p>'+esc(e.createdAt)+' · '+(e.payload.outcome==='complete'?'意思完整':'仍有欠缺')+' · '+(e.selfReviewAccepted===true?'已確認首份':e.selfReviewAccepted===false?'另份記錄已備份':'待同步確認')+'</p>').join('')+'</details>';
 const previous=attempts.filter(a=>a.payload.itemId===item.id&&a.id!==last.id).reverse();
 if(previous.length)html+='<details class="written-history"><summary>先前作答（'+previous.length+'）</summary>'+previous.map(a=>'<article><p>'+esc(a.createdAt)+' · '+(a.payload.result.correct===true?'命中已核答案':state.assessments.get(a.id)==='complete'?'自查：意思完整':state.assessments.get(a.id)==='revisit'?'自查：仍有欠缺':'尚待自查')+'</p><p class="answer-saved">'+esc(a.payload.answer)+'</p><p>當時參考：'+esc(a.payload.item.reference)+'</p></article>').join('')+'</details>';
 return html+'<div class="toolbar">'+button('written-again','再練一次','data-id="'+esc(item.id)+'"','secondary')+sheetMove(true)+'</div></section></section>';
}
