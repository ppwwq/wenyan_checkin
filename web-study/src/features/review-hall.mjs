import {reviewTypes} from '../domain/review-types.mjs';
import {available} from '../domain/queue.mjs';
import {schoolSectionType,schoolVocabForSheet} from '../domain/school-vocab.mjs';
import {readingContext} from '../domain/reading-context.mjs';
import {readingTranslation} from './reading-context.mjs';
import {esc,button,heading,quote} from './shared.mjs';

export function reviewTypeChecks(selected=[]){
 const picked=new Set(selected||[]);
 return reviewTypes.map(t=>'<label class="check-row"><input id="review-type-'+t.id+'" type="checkbox" data-review-type="'+t.id+'" '+(picked.has(t.id)?'checked':'')+'> '+esc(t.label)+'</label>').join('');
}

export function reviewHallEntry(){
 return '<section class="review-hall-entry start-card" aria-label="複習（題型館）"><div class="start-copy"><h2>題型館</h2><p>按題型直接閱讀題目、答案與語譯；也可另開打字或選擇練習。</p></div>'+button('nav','進入題型館','data-page="review"')+'</section>';
}

export function reviewHallView(bank,schoolItems=[],writtenItems=[],shortItems=[]){
 const questions=bank.questions||[],essayIds=(bank.essays||[]).map(e=>e.id);
 const card=t=>{
  if(t.id==='short-answer'){
   const countText=shortItems.length?shortItems.length+' 題自擬短答 · 非官方':'暫時沒有自擬短答';
   const actions=shortItems.length?button('review-read','直接閱讀','data-type="short-answer"')+button('sheet-start','開始短答','data-section="short-answer" data-all="1"','secondary'):'';
   return '<article class="review-type-card"><h2>'+esc(t.label)+'</h2><p>'+esc(t.note)+'</p><p class="subtle">'+countText+'</p><div class="toolbar">'+actions+'</div></article>';
  }
  const school=schoolItems.filter(item=>t.id==='typing'||t.id==='context'&&item.section==='gloss'||schoolSectionType[item.section]===t.id);
  const mcq=t.id==='typing'?0:available(questions,{essayIds,studyPool:'default',reviewTypes:[t.id]}).length;
  const sheetCount=t.id==='typing'?school.length+writtenItems.length:school.length;
  const countText=t.id==='typing'?(sheetCount?sheetCount+' 題可連續寫，校練在卷首':'暫時沒有可寫的字詞'):(school.length?(school.length+' 條校練可打字'+(mcq?' · 選擇 '+mcq+' 題':'')):(mcq?mcq+' 題':'尚無已標記題目'));
  const read=sheetCount||mcq?button('review-read','直接閱讀','data-type="'+t.id+'"'):'';
  const actions=read+(t.id==='typing'?button('sheet-start','打字練習','data-all="1"','secondary'):(school.length?button('sheet-start','打字練習','data-section="'+(t.id==='context'?'gloss':t.id)+'" data-all="1"','secondary'):'')+(mcq?button('review-type','選擇練習','data-type="'+t.id+'"','secondary'):'')+(t.id==='cross'?button('nav','詞義對照','data-page="compare"','quiet'):''));
  return '<article class="review-type-card"><h2>'+esc(t.label)+'</h2><p>'+esc(t.note)+'</p><p class="subtle">'+countText+'</p><div class="toolbar">'+actions+'</div></article>';
 };
 return heading('複習（題型館）','直接看題目、原文、答案與語譯，不用作答。想測試自己時，再開練習。')+
  '<div class="review-hall-grid">'+reviewTypes.map(card).join('')+'</div>'+
  '<section class="review-sub" aria-label="我的記錄"><h2>我的記錄</h2><p class="section-note">錯題、薄弱、收藏和快速回顧放在題型館裡面，不是首頁主入口。</p><div class="toolbar">'+
  button('wrong-practice','錯題')+button('nav','薄弱知識點','data-page="weakness"','secondary')+button('nav','收藏','data-page="saved"','secondary')+button('nav','快速回顧','data-page="quick"','secondary')+
  '</div></section>';
}

export function reviewReadingView(bank,schoolItems=[],writtenItems=[],shortItems=[],options={}){
 const type=reviewTypes.find(t=>t.id===options.type)||reviewTypes[0];
 const essayIds=Array.isArray(options.essayIds)?options.essayIds:options.essay?[options.essay]:bank.essays.map(e=>e.id);
 const selected=new Set(essayIds);
 const school=schoolVocabForSheet(schoolItems.filter(item=>type.id==='typing'||type.id==='context'&&item.section==='gloss'||schoolSectionType[item.section]===type.id));
 const written=type.id==='short-answer'?shortItems:type.id==='typing'?[...school,...writtenItems]:school;
 const choices=['typing','short-answer'].includes(type.id)?[]:available(bank.questions,{essayIds,studyPool:'default',reviewTypes:[type.id]});
 const seen=new Set(),items=[...written,...choices].filter(item=>{
  if(!selected.size||seen.has(item.id)||!(item.essayIds||[item.essayId]).every(id=>selected.has(id)))return false;
  seen.add(item.id);return true;
 });
 const size=12,total=Math.max(1,Math.ceil(items.length/size)),index=Math.max(0,Math.min(total-1,options.index||0));
 const shown=items.slice(index*size,(index+1)*size);
 const cards=shown.map(item=>{
  const reading=readingContext(item,bank,options.sourceContent);
  const isChoice=Array.isArray(item.choices),answer=isChoice?item.choices.find(c=>c.id===item.answerId)?.text:item.reference;
  const answers=isChoice?'<ol class="review-choices">'+item.choices.map(c=>'<li>'+esc(c.text)+'</li>').join('')+'</ol>':'';
  const explanation=isChoice?item.explanation||'':item.kind==='vocabulary'?'':(item.points||[]).join('\n');
  return '<article class="review-reading-item"><p class="question-tag">'+reading.titles.map(t=>'《'+esc(t)+'》').join('／')+(item.confidence==='待核'?' · 詞義待核':'')+'</p><h2>'+esc(item.prompt||item.stem)+'</h2>'+(reading.excerpt.quote?'<blockquote>'+quote(reading.excerpt)+'</blockquote>':'')+answers+'<h3>參考答案</h3><p class="card-answer">'+esc(answer||'暫缺參考，待核。')+'</p>'+readingTranslation(reading)+(explanation?'<h3>解析</h3><p class="preserve-lines">'+esc(explanation)+'</p>':'')+'</article>';
 }).join('');
 const turn='<div class="toolbar review-reading-pages">'+(index?button('review-reading-page','上一頁','data-index="'+(index-1)+'"','secondary'):'')+'<span>第 '+(index+1)+' / '+total+' 頁 · '+items.length+' 題</span>'+(index+1<total?button('review-reading-page','下一頁','data-index="'+(index+1)+'"','secondary'):'')+'</div>';
 const scope='<details class="review-reading-scope" '+(options.scopeOpen?'open':'')+'><summary>選擇篇章 · '+(selected.size===bank.essays.length?'全部 '+selected.size+' 篇':'已選 '+selected.size+' 篇')+'</summary><p class="subtle">可選一篇或多篇，切換題型時保留。</p><div class="toolbar">'+button('reading-scope-all','全選','','secondary')+button('reading-scope-none','清空','','secondary')+'</div><div class="review-type-options">'+bank.essays.map(e=>'<label class="check-row"><input id="reading-'+esc(e.id)+'" type="checkbox" data-reading-essay="'+esc(e.id)+'" '+(selected.has(e.id)?'checked':'')+'>'+esc(e.title)+'</label>').join('')+'</div></details>';
 return button('nav','← 題型館','data-page="review"','quiet')+heading(type.label+' · 直接閱讀','題目與答案一起看；閱讀不計作答。')+scope+turn+(cards||'<p>'+(selected.size?'這個篇章暫無此類題目。':'請先選擇篇章。')+'</p>')+turn;
}
