import {queue} from './queue.mjs';
import {needsAnswer,advanceSession} from './session.mjs';
import {dailyProgress,retryQuestions} from './training.mjs';

export function sessionProgress(session,state){
 const done=session.questions.filter(q=>!needsAnswer(session,state,q)).length;
 const target=session.targetCount??session.questions.length;
 return {done,target,remaining:Math.max(0,target-done)};
}

// Unanswered skips retain only IDs and drafts, not another full question bank snapshot.
export function advanceWithReplacement(session,state,questions,skip=false){
 if(!session.selection)return advanceSession(session,state,skip);
 const current=session.questions[session.index];
 if(!current||session.completed||session.passComplete)return false;
 if(!skip)return advanceSession(session,state);
 if(session.answers[current.id])return false;
 session.skippedIds=[...new Set([...(session.skippedIds||[]),current.id])];
 const seen=new Set([...session.questions.map(q=>q.id),...session.skippedIds]);
 const seenQuestions=[...session.questions,...questions.filter(q=>session.skippedIds.includes(q.id))];
 const memories=new Set(seenQuestions.map(q=>q.memoryId));
 const groups=new Set(seenQuestions.map(q=>q.practiceGroup).filter(Boolean));
 const opts={...session.selection,count:1};
 if(session.kind==='daily')opts.excludeMemoryIds=[...dailyProgress(state).seen];
 if(session.kind==='retry')opts.questionIds=retryQuestions(questions,state).map(q=>q.id);
 const candidates=questions.filter(q=>!seen.has(q.id)&&!memories.has(q.memoryId)&&(!q.practiceGroup||!groups.has(q.practiceGroup)));
 const replacement=queue(candidates,opts,state)[0];
 if(replacement){session.questions[session.index]=replacement;return true;}
 session.questions.splice(session.index,1);
 const next=session.questions.findIndex(q=>needsAnswer(session,state,q));
 session.index=Math.max(0,next);session.completed=next<0;
 return true;
}
