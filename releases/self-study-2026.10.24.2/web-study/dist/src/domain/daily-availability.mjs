import {hkDay} from './review.mjs';

// A displayed question consumes its daily slot; reserving a queue does not.
// Browsing a revision card remains separate from a practice presentation.
export function seenInPractice(state,questions=[],today=hkDay(),continuation={}){
 const byId=new Map(questions.map(q=>[q.id,q])),ids=new Set(),memories=new Set(),groups=new Set();
 const add=p=>{
  if(p.questionId)ids.add(p.questionId);
  for(const q of [p,p.question,byId.get(p.questionId)]){
   if(q?.memoryId)memories.add(q.memoryId);
   if(q?.practiceGroup)groups.add(q.practiceGroup);
  }
 };
 for(const e of state.attempts||[]){const p=e.payload;if(hkDay(p.submittedAt)===today)add(p);}
 for(const e of state.events||[]){
  const p=e.payload;
  if(e.type!=='browse'||p.purpose!=='practice'||hkDay(e.createdAt)!==today)continue;
  // Resuming the same unfinished screen is not a new draw of that question.
  if(p.sessionId===continuation.sessionId&&p.questionId===continuation.questionId)continue;
  add(p);
 }
 return {ids,memories,groups};
}
export function wasSeen(q,seen){return seen.ids.has(q.id)||seen.memories.has(q.memoryId)||!!q.practiceGroup&&seen.groups.has(q.practiceGroup);}
