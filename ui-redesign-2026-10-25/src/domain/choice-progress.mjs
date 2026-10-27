import {effectiveAttempts} from './review.mjs';

export function practicedIds(state){
 return new Set(effectiveAttempts(state).filter(a=>typeof a.correct==='boolean').map(a=>a.questionId));
}
export function questionProgress(questions,seen){
 const ids=new Set(questions.map(q=>q.id));
 const done=[...ids].filter(id=>seen.has(id)).length;
 return {total:ids.size,done,remaining:ids.size-done};
}
