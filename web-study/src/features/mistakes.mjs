import {questionMistakes,hkDay} from '../domain/review.mjs';
import {notebookView} from './notebook.mjs';

// This entry reviews all actual mistakes, independently of extra-practice filters.
export function mistakeOptions(bank,state,questionId){
 const wrong=questionMistakes(state);
 return {essayIds:bank.essays.map(e=>e.id),appendix:true,scope:'wrong',
  count:state.settings.training?.dailyCount||20,rotation:state.settings.rotation||0,
  questionIds:[...wrong.keys()].filter(id=>!questionId||id===questionId)};
}
export function mistakesView(bank,state,items=[],filters={},today=hkDay()){
 return notebookView(bank,state,items,filters,today);
}
