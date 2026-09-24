import {hkDay} from './review.mjs';
import {queue,available} from './queue.mjs';

export const trainingAbilities=['vocabulary','meaning','theme','technique'];
export function validTraining(plan){
 return !!plan&&plan.version===1&&Number.isInteger(plan.dailyCount)&&plan.dailyCount>=1&&plan.dailyCount<=100&&typeof plan.retry==='boolean'&&typeof plan.appendix==='boolean'&&!!plan.chapters&&typeof plan.chapters==='object'&&!Array.isArray(plan.chapters)&&Object.entries(plan.chapters).length<=100&&Object.entries(plan.chapters).every(([id,types])=>/^[\w-]{1,100}$/.test(id)&&Array.isArray(types)&&types.length>0&&types.length<=4&&new Set(types).size===types.length&&types.every(t=>trainingAbilities.includes(t)));
}
export function trainingOptions(plan){return {essayIds:Object.keys(plan.chapters),essayTypes:plan.chapters,appendix:plan.appendix,count:plan.dailyCount,scope:'all',ability:''};}
export function effectiveAttempts(state){
 const corrections=new Map([...(state.corrections||[])].sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)).map(c=>[c.attemptId,c.correct]));
 return [...(state.attempts||[])].sort((a,b)=>Date.parse(a.payload.submittedAt)-Date.parse(b.payload.submittedAt)||a.id.localeCompare(b.id)).map(e=>({...e.payload,id:e.id,day:hkDay(e.payload.submittedAt),correct:corrections.has(e.id)?corrections.get(e.id):e.payload.mode==='typing'?(state.assessments.get(e.id)??null):e.payload.correct}));
}
export function questionMistakes(state){
 const wrong=new Map();
 for(const a of effectiveAttempts(state)){
  if(a.correct===false)wrong.set(a.questionId,a);
  else if(a.correct===true&&wrong.get(a.questionId)?.day<a.day)wrong.delete(a.questionId);
 }
 return wrong;
}
export function dailyProgress(state,today=hkDay()){
 const attempts=effectiveAttempts(state),todays=attempts.filter(a=>a.day===today);
 const seen=new Set(todays.map(a=>a.memoryId));
 const goal=state.dailyGoals?.[today]||state.settings.training?.dailyCount||20;
 return {today,goal,done:seen.size,remaining:Math.max(0,goal-seen.size),seen,total:new Set(attempts.map(a=>a.memoryId)).size,retries:todays.filter(a=>a.practiceKind==='retry').length};
}
export function retryQuestions(questions,state,today=hkDay()){
 const plan=state.settings.training;if(!validTraining(plan)||!plan.retry)return [];
 const groups=new Map();
 for(const a of effectiveAttempts(state).filter(a=>a.day===today)){if(!groups.has(a.memoryId))groups.set(a.memoryId,[]);groups.get(a.memoryId).push(a);}
 const ids=new Set();
 for(const rows of groups.values()){
  const firstFailure=rows.findIndex(a=>a.trainingPolicy===2&&a.correct===false);
  // Any subsequent submission is already a retry, including a pending self-check.
  if(firstFailure>=0&&firstFailure===rows.length-1)ids.add(rows[firstFailure].questionId);
 }
 return available(questions,{...trainingOptions(plan),questionIds:[...ids]});
}
export function dailyQuestions(questions,state,today=hkDay()){
 const plan=state.settings.training;if(!validTraining(plan))return [];
 const progress=dailyProgress(state,today);if(!progress.remaining)return [];
 return queue(questions,{...trainingOptions(plan),count:progress.remaining,rotation:state.settings.rotation||0,excludeMemoryIds:[...progress.seen],priorityMode:'daily'},state,today);
}

// Rebuild only unfinished daily/retry work; submitted snapshots remain intact.
export function refreshTrainingSession(questions,state,original,today=hkDay()){
 const plan=state.settings.training;
 if(original.completed||!['daily','retry'].includes(original.kind)||!validTraining(plan))return original;
 const progress=dailyProgress(state,today);
 if(JSON.stringify(original.trainingSnapshot)===JSON.stringify(plan)&&original.goalDay===today&&original.goalSnapshot===progress.goal)return original;
 const session=structuredClone(original),answers=session.answers||={};
 for(const a of state.attempts.filter(e=>e.payload.sessionId===session.id))answers[a.payload.questionId]=a.id;
 const answered=session.questions.filter(q=>answers[q.id]),current=session.questions[session.index];
 const opts=trainingOptions(plan),pool=(session.kind==='retry'?retryQuestions(questions,state,today):available(questions,opts).filter(q=>!progress.seen.has(q.memoryId))).filter(q=>!answers[q.id]);
 const capacity=Math.max(0,Math.min(100-answered.length,session.kind==='daily'?progress.remaining:100));
 const pending=capacity&&current&&pool.some(q=>q.id===current.id)?[current]:[];
 const rest=pool.filter(q=>!pending.some(p=>p.memoryId===q.memoryId||(p.practiceGroup&&p.practiceGroup===q.practiceGroup)));
 const previous=new Map(session.questions.map(q=>[q.id,q]));
 if(capacity>pending.length)pending.push(...queue(rest,{...opts,count:capacity-pending.length,rotation:state.settings.rotation||0,priorityMode:'daily'},state,today).map(q=>previous.get(q.id)||q));
 session.questions=[...answered,...pending];session.essayIds=opts.essayIds;session.trainingSnapshot=structuredClone(plan);session.goalDay=today;session.goalSnapshot=progress.goal;
 const unassessed=answered.findIndex(q=>state.attempts.some(a=>a.id===answers[q.id]&&a.payload.mode==='typing'&&!state.assessments.has(a.id)));
 session.index=unassessed>=0?unassessed:answered.length;session.completed=!pending.length&&unassessed<0;
 if(session.completed)session.index=0;
 return session;
}
