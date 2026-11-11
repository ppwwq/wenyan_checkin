import {dailyHomeView} from './training.mjs';
import {paginate,pageButtons} from './pagination.mjs';
import {reviewHallEntry} from './review-hall.mjs';
import {writtenRecordEntry,writtenHistoryView} from './written-records.mjs';
export {writtenMistakesView} from './written-records.mjs';
import {hkDay,addDays,isDue,isWeak,questionMistakes} from '../domain/review.mjs';
import {weakness,quickCards,available} from '../domain/queue.mjs';
import {esc,button,heading,essayTitle,abilities,empty,quote} from './shared.mjs';
export function studyShelf(){
 const items=[['papers','原','原卷對照','看引文，答這一年已收錄的原題'],['map','圖','知識地圖','十六篇知識點，登入後可標掌握'],['handbook','查','文言速查','虛詞、句式、易混詞和手法'],['mistakes','錯','錯題本','先看答案，再選擇重練']];
 return '<section class="study-shelf" aria-label="研習"><div class="section-title"><h2>研習</h2><span class="subtle">原卷 · 地圖 · 速查 · 錯題</span></div><div class="study-shelf-grid">'+items.map(([page,letter,title,note])=>'<button type="button" class="study-path" data-action="nav" data-page="'+page+'"><span class="path-letter" aria-hidden="true">'+letter+'</span><span class="path-copy"><strong>'+title+'</strong><small>'+note+'</small></span></button>').join('')+'</div></section>';
}
export function studyPaths(compact=false){
 const entries=[['sheet-start','','打字測義（看句寫義）','看原句，寫出這個語境的意思。一卷連續寫。','字'],['written-list','translation','整句理解／翻譯','先寫譯文，再逐項核對。','句'],['nav','library','篇章與混合重溫','選擇篇章，練習與辨析。','篇']];
 return '<section class="study-paths '+(compact?'compact':'')+'" aria-label="練習方式"><div class="section-title"><h2>換個方式，讀深一點</h2><span class="subtle">字 · 句 · 篇</span></div><div class="study-path-grid">'+entries.filter(e=>!compact||e[0]!=='nav').map(([action,value,label,note,letter])=>'<button type="button" class="study-path" data-action="'+action+'" '+(action==='nav'?'data-page="'+value+'"':value?'data-kind="'+value+'"':'')+'><span class="path-letter" aria-hidden="true">'+letter+'</span><span class="path-copy"><strong>'+label+'</strong><small>'+note+'</small></span><span class="path-arrow" aria-hidden="true">↗</span></button>').join('')+'</div></section>';
}
export function homeView(bank,state,options={}){
 const shelf=studyShelf();
 if(options.guest)return '<header class="home-heading"><div><h1>溫故，而知新。</h1></div><span class="home-heading-note">未登入也可以先讀、先練。</span></header><p class="banner">公開練習、原卷、知識地圖和速查不用登入。錯題本、掌握標記和學習記錄要登入後才保存，這次作答也不會在登入後自動帶入。</p>'+shelf+'<section class="start-card"><div class="start-copy"><h2>先做公開練習</h2><p>十六篇裡已公開的題可以現在做。關閉頁面後，這次答案不會留下。</p></div><div class="toolbar">'+button('nav','進入練習','data-page="library"')+button('show-auth','登入以保存進度','','secondary')+'</div></section>'+reviewHallEntry()+studyPaths();
 return '<header class="home-heading"><div><h1>溫故，而知新。</h1></div><span class="home-heading-note">把理解留住，讓積累有跡可循。</span></header>'+dailyHomeView(bank,state,reviewHallEntry())+shelf+studyPaths();
}
export function weaknessView(bank,state,options){
 const essays=bank.essays.filter(e=>options.essayIds.includes(e.id));
 const rows=essays.map(e=>({essay:e,cells:Object.entries(abilities).map(([id,label])=>({id,label,...weakness(bank.questions,state,e.id,id)}))}));
 const cell=(e,w,mobile=false)=>'<button class="'+(w.weak?'weak':'')+'" data-action="weak-cell" data-essay="'+esc(e.id)+'" data-ability="'+w.id+'" '+(!w.total?'disabled':'')+'>'+(mobile?'<strong>'+w.label+'</strong>':'')+'<span>'+(w.status==='unavailable'?'題目待補充':w.status==='unassessed'?'未評估'+(w.pending?' · '+w.pending+' 項待自查':''):w.weak+' 項待鞏固')+'</span><small>已練 '+w.studied+' / '+w.total+' · 到期 '+w.due+'</small>'+(w.studied?'<small>選擇 '+w.choice+' · 自查 '+w.typing+(w.pending?' · 待自查 '+w.pending:'')+'</small><small>最近 '+esc(w.latest)+'</small>':'')+'</button>';
 const table='<div class="table-wrap weakness-desktop"><table><thead><tr><th>篇章</th>'+Object.values(abilities).map(label=>'<th>'+label+'</th>').join('')+'</tr></thead><tbody>'+rows.map(({essay,cells})=>'<tr><th>'+esc(essay.title)+'</th>'+cells.map(w=>'<td>'+cell(essay,w)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 const cards='<div class="weakness-mobile">'+rows.map(({essay,cells})=>{
  const weak=cells.reduce((n,w)=>n+w.weak,0),due=cells.reduce((n,w)=>n+w.due,0),studied=cells.reduce((n,w)=>n+w.studied,0),pending=cells.reduce((n,w)=>n+w.pending,0);
  return '<details class="weakness-card" '+(weak?'open':'')+'><summary><strong>'+esc(essay.title)+'</strong><span>'+(studied?weak+' 項待鞏固 · '+due+' 項到期':'未評估'+(pending?' · '+pending+' 項待自查':''))+'</span></summary><div class="weakness-cells">'+cells.map(w=>cell(essay,w,true)).join('')+'</div></details>';
 }).join('')+'</div>';
 return heading('薄弱知識點','依每日首次表現與當日失誤安排；回練答對不會取消次日複習。')+'<p class="section-note">範圍沿用自選練習勾選的篇章。展開篇章，點選題型可進入相應練習。</p><div class="toolbar">'+button('nav','調整篇章範圍','data-page="library"','secondary')+'</div>'+(rows.length?table+cards:empty('尚未選擇篇章','請先調整篇章範圍。'))+'<p class="section-note">樣本量反映已練知識點，不等同整篇掌握率。未評估、待自查與題目未覆蓋分開顯示。</p>';
}
export function historyView(bank,state,writtenItems=[],pages={}){
 const today=hkDay(),schedule=Object.values(state.memories).filter(m=>m.due);
 const current=paginate([...state.attempts].reverse(),pages.choice),controls=pageButtons('history-page',current,'data-section="choice"');
 return heading('學習記錄','複習安排與作答記錄')+writtenRecordEntry(writtenItems,state.events,questionMistakes(state).size)+writtenHistoryView(bank,state.events,pages.written)+'<h2>接下來七天</h2><div class="review-calendar">'+Array.from({length:7},(_,i)=>{const day=addDays(today,i),n=schedule.filter(m=>i===0?m.due<=day:m.due===day).length;return '<div class="review-day '+(!i?'active':'')+'"><span>'+(!i?'今天與逾期':day.slice(5))+'</span><strong>'+n+'</strong><em>待複習知識點</em></div>';}).join('')+'</div>'+Object.entries(schedule.reduce((a,m)=>{if(m.due>addDays(today,6))a[m.due]=(a[m.due]||0)+1;return a;},{})).sort().map(([date,n])=>'<div class="calendar-extra">'+date+' · '+n+' 項</div>').join('')+'<p class="review-rule">同一知識點及同組辨析題每天只出現一次，答錯或跳過的題目最早翌日再練。到期首次答對，間隔按 2、4、7、15、30、60、90 天增加；提前答對不推遲原安排。舊版同日重練記錄保留。</p><h2 id="choice-history">作答記錄</h2>'+(state.attempts.length?controls+current.items.map(e=>{const p=e.payload,q=p.question||{},first=state.firsts.some(f=>f.id===e.id),correct=p.mode==='typing'?state.assessments.get(e.id):p.correct;return '<article class="saved-row"><span class="tag">'+esc(p.day)+'</span><span class="tag">'+(first?'每日首次':'當天重練')+'</span><h3>'+esc(q.stem)+'</h3><p class="history-answer">你的答案：'+esc(p.mode==='choice'?(q.choices?.find(c=>c.id===p.answer)?.text||'暫時不會'):p.answer)+'</p><p>'+ (correct===undefined?'待自查':correct?'原作答：答對／自查完整':'原作答：待鞏固')+'</p><details><summary>當時題目與解析</summary><blockquote>'+esc(q.quote)+'</blockquote><p>'+esc(q.explanation)+'</p>'+'</details></article>';}).join('')+controls:empty('還沒有作答記錄','從一組練習開始，記錄會保存在你的帳號。'));
}
export function savedView(bank,state,options){
 const rows=Object.values(state.favorites).filter(f=>f.saved).map(f=>({f,q:bank.questions.find(q=>q.id===f.questionId)})).filter(({q})=>!q||q.essayIds.every(id=>options.essayIds.includes(id))&&(!options.ability||q.ability===options.ability));
 return heading('留住想再看的重點','收藏與答錯分開記錄；收藏不改變複習曲線。')+'<div class="toolbar">'+button('nav','調整篇章與能力篩選','data-page="library"','secondary')+button('saved-practice','收藏混練')+button('saved-quick','收藏快速回顧','','secondary')+'</div>'+(rows.length?rows.map(({f,q})=>'<article class="saved-row"><h3>'+esc(q?.stem||f.questionId)+'</h3><p>'+esc(q?(q.quote||q.essayIds.map(id=>essayTitle(bank,id)).join('／')):'此題目前不可用，收藏仍保留。')+'</p><span class="tag">'+esc(q?abilities[q.ability]:'')+'</span>'+(!q||q.status!=='reviewed'||q.active===false?'<span class="tag">已下架 · 不進新練習</span>':q.version!==f.version?'<span class="tag">題目已更新</span>':'')+'<div class="toolbar">'+button('favorite','取消收藏','data-id="'+esc(f.questionId)+'"','quiet')+'</div></article>').join(''):empty('這個範圍還沒有收藏','答題時按「收藏」，原本的答案和草稿都會保留。'));
}
export function quickView(bank,state,options,quick){
 const cards=quick.cards,idx=Math.min(quick.index,Math.max(0,cards.length-1)),q=cards[idx];
 return heading('考前，把重點再讀一遍','翻卡、展開與「看過了」只記為瀏覽，不計答對。')+(quick.version&&quick.version!==bank.version?'<p class="banner">題庫已更新；保留你上次卡片的位置與原版本。重新選擇上方範圍即可載入最新重點。</p>':'')+'<div class="toolbar">'+button('quick-scope','薄弱重點','data-scope="weak"','secondary')+button('quick-scope','我的收藏','data-scope="saved"','secondary')+button('quick-scope','兩者合併','data-scope="both"','secondary')+button('nav','選擇篇章','data-page="library"','quiet')+'</div>'+(q?'<article class="quick-card"><div class="quick-position">'+(idx+1)+' / '+cards.length+' · '+esc(q.essayIds.map(id=>essayTitle(bank,id)).join('／')||'手法附錄')+'</div><blockquote>'+(q.quote?.trim()?quote(q):esc(q.stem))+'</blockquote><p class="card-answer">'+esc(q.summary||q.choices.find(c=>c.id===q.answerId)?.text)+'</p><p>辨析提醒：'+esc(q.misconception||q.choices.find(c=>c.id!==q.answerId)?.explanation)+'</p><details><summary>詳細解析</summary><p>'+esc(q.explanation)+'</p>'+'</details><div class="toolbar">'+button('quick-prev','上一張',idx===0?'disabled':'','secondary')+button('quick-seen',idx===cards.length-1?'看過了 · 完成':'看過了 · 下一張')+button('quick-practice','轉為練習','','quiet')+'</div></article>':empty(options.quickScope==='saved'?'所選範圍暫無收藏':'暫無個人薄弱記錄','可以改看所選篇章的已核對重點。')+'<div class="toolbar">'+button('quick-all','查看已核對重點','','secondary')+'</div>');
}
export function reportsView(reports){
 const labels={pending:'待發送',received:'已收到',processing:'處理中',corrected:'已修正',replied:'說明已回覆'};
 return heading('我的題目回報','回報不會自動更改答案；維護者會按來源復核。')+(reports.length?reports.map(r=>'<article class="saved-row"><span class="report-status">'+esc(labels[r.status]||r.status)+'</span><h3>'+esc(r.category)+'</h3><p>'+esc(r.detail)+'</p><p class="subtle">'+esc(r.questionId)+' · v'+esc(r.questionVersion)+'</p>'+(r.reply?'<p>回覆：'+esc(r.reply)+'</p>':'')+'</article>').join(''):empty('還沒有題目回報','每題上方都有「反饋／舉報」，作答前後都可回報。'));
}

