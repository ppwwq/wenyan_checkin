import {questionMistakes} from '../domain/review.mjs';
import {practicePool,queue} from '../domain/queue.mjs';
import {esc,button,heading,empty,essayTitle,abilities} from './shared.mjs';

// This entry reviews all actual mistakes, independently of extra-practice filters.
export function mistakeOptions(bank,state,questionId){
 const wrong=questionMistakes(state);
 return {essayIds:bank.essays.map(e=>e.id),appendix:true,scope:'wrong',
  count:state.settings.training?.dailyCount||20,rotation:state.settings.rotation||0,
  questionIds:[...wrong.keys()].filter(id=>!questionId||id===questionId)};
}

export function mistakesView(bank,state){
 const opts=mistakeOptions(bank,state),pool=practicePool(bank.questions,opts,state),list=queue(bank.questions,opts,state);
 const intro=heading('錯題複習','列出各篇章及手法附錄中實際答錯、仍待鞏固的題目。')+
  '<p class="section-note">當天答對後仍保留錯題標記；之後另一天答對才移出。這裏可自行重練，不受當日自動回練次數限制。</p>';
 if(!pool.length)return intro+empty('目前沒有可重練的錯題','暫停使用的題目不會加入新練習；原作答可在「記錄」查看。')+button('nav','返回首頁','data-page="home"','secondary');
 return intro+'<section class="scope-panel"><h2>可重練 '+pool.length+' 道錯題</h2><p>本組 '+list.length+' 題 · 同一知識點及同組辨析題不重複湊數。</p>'+button('mistake-start','開始錯題複習 →')+'</section>'+
  pool.map(q=>'<article class="saved-row"><span class="tag">'+esc(q.essayIds.length?q.essayIds.map(id=>essayTitle(bank,id)).join('／'):'手法附錄')+'</span><span class="tag">'+esc(abilities[q.ability]||q.ability)+'</span><h3>'+esc(q.stem)+'</h3>'+button('mistake-start','重練此題','data-id="'+esc(q.id)+'"','secondary')+'</article>').join('');
}
