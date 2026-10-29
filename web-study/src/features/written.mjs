import {esc,button,heading,quote} from './shared.mjs';
import {readingContext} from '../domain/reading-context.mjs';
import {readingTranslation} from './reading-context.mjs';
import {filterWritten,writtenState} from '../domain/written.mjs';
const origins={'authored-basic':'自編基礎 · 文字作答','official-original':'官方題 · 文字作答','authored-translation':'自編整句翻譯','school-sheet':'校練詞義','authored-expansion':'自擬短答 · 非官方'};
export function writtenView(items,bank,events,options={}){
 const state=writtenState(events),item=items.find(i=>i.id===options.itemId);
 const attempts=state.attempts,done=new Set(attempts.map(a=>a.payload.itemId));
 if(!item){
  const visible=filterWritten(items,options,events);
  return heading('字詞與整句翻譯','先寫自己的答案，再看參考與逐項自查。這裏的記錄與選擇題分開。打字測義可以一卷連續寫。')+
   (options.kind!=='translation'?button('sheet-start','打字測義 · 開始一卷','','secondary'):'')+
   '<form id="written-filters" class="scope-panel"><label>練習<select name="kind"><option value="">全部</option><option value="vocabulary" '+(options.kind==='vocabulary'?'selected':'')+'>打字測義（看句寫義）</option><option value="translation" '+(options.kind==='translation'?'selected':'')+'>整句翻譯</option><option value="short-answer" '+(options.kind==='short-answer'?'selected':'')+'>自擬短答（非官方）</option></select></label> '+
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
 const reading=readingContext(q,bank,options.sourceContent),context=quote(reading.excerpt);
 const sheet=options.sheet;
 const next=button(sheet?'sheet-next':'written-list','跳過，下一題','','secondary');
 const back=sheet?'<p class="sheet-progress">打字測義 · 第 '+(sheet.index+1)+' / '+sheet.ids.length+' 題</p>'+button('nav','← 題型館','data-page="review"','quiet'):button('written-list','← 返回文字練習','','quiet');
 let html=back+'<section class="answer-panel written-panel"><p class="question-tag">'+reading.titles.map(t=>'《'+esc(t)+'》').join('／')+' · '+origins[q.origin]+'</p><h1>'+esc(q.prompt)+'</h1><blockquote>'+context+'</blockquote>'+(reading.excerpt.multiple?'<p class="subtle">原資料未指定單一位置，已標出本段全部「'+esc(q.target)+'」。</p>':'');
 if(!last&&!options.revealed)return html+'<label for="written-answer">你的'+(q.kind==='translation'?'完整譯文':'答案')+'</label><textarea id="written-answer" class="answer-input" maxlength="3000" placeholder="'+(q.kind==='translation'?'保留人物、動作、否定、條件及語氣。':q.kind==='short-answer'?'按題目要求摘錄原句，或用自己的話簡答。':'用這個語境中的意思作答。')+'">'+esc(draft)+'</textarea><div class="toolbar">'+button('written-submit','提交','data-id="'+esc(q.id)+'"')+next+button('written-reveal','直接看答案','','secondary')+'</div></section>';
 html+=(last?'<div class="answer-saved">'+esc(last.payload.answer)+'</div>':'')+'<section class="feedback"><h2 tabindex="-1" id="written-feedback">參考答案</h2><p class="card-answer">'+esc(q.reference)+'</p>';
 if(q.confidence==='待核')html+='<p class="subtle">這條詞義仍待核，請連同語境閱讀。</p>';
 if(q.accepted.length>1)html+='<p>已核可接受表述：'+esc(q.accepted.join('／'))+'</p>';
 if(q.teachingExamples?.length)html+='<p>教學同義示例（編者補充）：'+esc(q.teachingExamples.join('／'))+'</p>';
 html+=readingTranslation(reading);
 if(q.kind!=='vocabulary')html+='<h3>答題要點</h3><ul>'+q.points.map(p=>'<li>'+esc(p)+'</li>').join('')+'</ul>';
 html+='<details><summary>詞義說明與來源</summary>'+(q.kind==='vocabulary'?'<ul>'+q.points.map(p=>'<li>'+esc(p)+'</li>').join('')+'</ul>':'')+'<p>'+esc(q.sourceLabel)+'</p><p>'+esc(q.commonErrors||'')+'</p><p>'+esc(q.rubric)+'</p></details>';
 if(assessment==='revisit')html+='<p class="subtle">已記下：這題不會。</p>';
 const reviews=last?state.selfReviews.get(last.id)||[]:[];
 if(reviews.length>1)html+='<details class="written-conflicts"><summary>已保留 '+reviews.length+' 份裝置自查</summary><p>以伺服器首先收到的自查為主；其他裝置的記錄亦完整保留，沒有覆蓋原作答。</p>'+reviews.map(e=>'<p>'+esc(e.createdAt)+' · '+(e.payload.outcome==='complete'?'意思完整':'仍有欠缺')+' · '+(e.selfReviewAccepted===true?'已確認首份':e.selfReviewAccepted===false?'另份記錄已備份':'待同步確認')+'</p>').join('')+'</details>';
 const previous=attempts.filter(a=>a.payload.itemId===item.id&&a.id!==last?.id).reverse();
 if(previous.length)html+='<details class="written-history"><summary>先前作答（'+previous.length+'）</summary>'+previous.map(a=>'<article><p>'+esc(a.createdAt)+' · '+(a.payload.result.correct===true?'命中已核答案':state.assessments.get(a.id)==='complete'?'自查：意思完整':state.assessments.get(a.id)==='revisit'?'自查：仍有欠缺':'尚待自查')+'</p><p class="answer-saved">'+esc(a.payload.answer)+'</p><p>當時參考：'+esc(a.payload.item.reference)+'</p></article>').join('')+'</details>';
 return html+'<div class="toolbar">'+next+button('written-unknown-next','不會，下一題','data-id="'+esc(item.id)+'"')+'</div></section></section>';
}
