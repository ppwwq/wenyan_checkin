import {reviewTypes} from '../domain/review-types.mjs';
import {available} from '../domain/queue.mjs';
import {schoolSectionType} from '../domain/school-vocab.mjs';
import {esc,button,heading} from './shared.mjs';

export function reviewTypeChecks(selected=[]){
 const picked=new Set(selected||[]);
 return reviewTypes.map(t=>'<label class="check-row"><input id="review-type-'+t.id+'" type="checkbox" data-review-type="'+t.id+'" '+(picked.has(t.id)?'checked':'')+'> '+esc(t.label)+'</label>').join('');
}

export function reviewHallEntry(){
 return '<section class="review-hall-entry start-card" aria-label="複習（題型館）"><div class="start-copy"><p class="eyebrow">複習</p><h2>題型館</h2><p>和今日訓練分開。按題型複習：語境辨義、打字測義、一詞多義、活用、通假、虛詞、跨篇，以及句意、主旨、手法。</p></div>'+button('nav','進入題型館','data-page="review"')+'</section>';
}

export function reviewHallView(bank,schoolItems=[],writtenItems=[],shortItems=[]){
 const questions=bank.questions||[],essayIds=(bank.essays||[]).map(e=>e.id);
 const card=t=>{
  if(t.id==='short-answer'){
   const countText=shortItems.length?shortItems.length+' 題自擬短答 · 非官方':'暫時沒有自擬短答';
   const actions=shortItems.length?button('sheet-start','開始短答','data-section="short-answer" data-all="1"'):'';
   return '<article class="review-type-card"><h2>'+esc(t.label)+'</h2><p>'+esc(t.note)+'</p><p class="subtle">'+countText+'</p><div class="toolbar">'+actions+'</div></article>';
  }
  const school=schoolItems.filter(item=>t.id==='typing'||schoolSectionType[item.section]===t.id);
  const mcq=t.id==='typing'?0:available(questions,{essayIds,studyPool:'default',reviewTypes:[t.id]}).length;
  const sheetCount=t.id==='typing'?school.length+writtenItems.length:school.length;
  const countText=t.id==='typing'?(sheetCount?sheetCount+' 題可連續寫，校練在卷首':'暫時沒有可寫的字詞'):(school.length?(school.length+' 條校練可打字'+(mcq?' · 選擇 '+mcq+' 題':'')):(mcq?mcq+' 題':'尚無已標記題目'));
  const actions=t.id==='typing'?button('sheet-start','開始一卷','data-all="1"'):(school.length?button('sheet-start','打字練這批','data-section="'+t.id+'" data-all="1"'):'')+(mcq?button('review-type','選擇題','data-type="'+t.id+'"'):'')+(t.id==='cross'?button('nav','只讀對照','data-page="compare"','quiet'):'');
  return '<article class="review-type-card"><h2>'+esc(t.label)+'</h2><p>'+esc(t.note)+'</p><p class="subtle">'+countText+'</p><div class="toolbar">'+actions+'</div></article>';
 };
 return heading('複習（題型館）','按題型進入。打字測義是看句寫義，一卷接一卷寫，不用返回列表。')+
  '<div class="review-hall-grid">'+reviewTypes.map(card).join('')+'</div>'+
  '<section class="review-sub" aria-label="我的記錄"><h2>我的記錄</h2><p class="section-note">錯題、薄弱、收藏和快速回顧放在題型館裡面，不是首頁主入口。</p><div class="toolbar">'+
  button('wrong-practice','錯題')+button('nav','薄弱知識點','data-page="weakness"','secondary')+button('nav','收藏','data-page="saved"','secondary')+button('nav','快速回顧','data-page="quick"','secondary')+
  '</div></section>';
}
