import {reviewTypes,matchesReviewType} from '../domain/review-types.mjs';
import {esc,button,heading} from './shared.mjs';

export function reviewTypeChecks(selected=[]){
 const picked=new Set(selected||[]);
 return reviewTypes.map(t=>'<label class="check-row"><input id="review-type-'+t.id+'" type="checkbox" data-review-type="'+t.id+'" '+(picked.has(t.id)?'checked':'')+'> '+esc(t.label)+'</label>').join('');
}

export function reviewHallEntry(){
 return '<section class="review-hall-entry start-card" aria-label="複習（題型館）"><div class="start-copy"><p class="eyebrow">複習</p><h2>題型館</h2><p>和今日訓練分開。按題型複習：語境辨義、打字測義、一詞多義、活用、通假、虛詞、跨篇，以及句意、主旨、手法。</p></div>'+button('nav','進入題型館','data-page="review"')+'</section>';
}

export function reviewHallView(bank,writtenVocabCount=0){
 const questions=bank.questions||[];
 const card=t=>{
  const count=t.id==='typing'?writtenVocabCount:questions.filter(q=>q.status==='reviewed'&&q.active!==false&&matchesReviewType(q,t.id)).length;
  const countText=t.id==='typing'?(count?count+' 題可連續寫':'暫時沒有可寫的字詞'):count?count+' 題':'尚無已標記題目';
  const actions=t.id==='typing'?button('sheet-start','開始一卷'):button('review-type','練習這類','data-type="'+t.id+'"')+(t.id==='cross'?button('nav','只讀對照','data-page="compare"','quiet'):'');
  return '<article class="review-type-card"><h2>'+esc(t.label)+'</h2><p>'+esc(t.note)+'</p><p class="subtle">'+countText+'</p><div class="toolbar">'+actions+'</div></article>';
 };
 return heading('複習（題型館）','按題型進入。打字測義是看句寫義，一卷接一卷寫，不用返回列表。')+
  '<div class="review-hall-grid">'+reviewTypes.map(card).join('')+'</div>'+
  '<section class="review-sub" aria-label="我的記錄"><h2>我的記錄</h2><p class="section-note">錯題、薄弱、收藏和快速回顧放在題型館裡面，不是首頁主入口。</p><div class="toolbar">'+
  button('wrong-practice','錯題')+button('nav','薄弱知識點','data-page="weakness"','secondary')+button('nav','收藏','data-page="saved"','secondary')+button('nav','快速回顧','data-page="quick"','secondary')+
  '</div></section>';
}
