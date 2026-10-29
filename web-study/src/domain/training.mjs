import {hkDay,effectiveAttempts,questionMistakes} from './review.mjs';
export {effectiveAttempts,questionMistakes} from './review.mjs';
import {queue,available} from './queue.mjs';
import {answerMode} from './answer-mode.mjs';
import {studyPools} from './editorial.mjs';
import {seenInPractice,wasSeen} from './daily-availability.mjs';
import {reviewTypeIds} from './review-types.mjs';

export const trainingAbilities=['vocabulary','meaning','theme','technique'];
export function validTraining(plan){
 if(plan?.studyPool!==undefined&&!Object.hasOwn(studyPools,plan.studyPool))return false;
 if(plan?.vocabularyTyping!==undefined&&typeof plan.vocabularyTyping!=='boolean')return false;
 if(plan?.reviewTypes!==undefined&&!(Array.isArray(plan.reviewTypes)&&plan.reviewTypes.length<=reviewTypeIds.length&&new Set(plan.reviewTypes).size===plan.reviewTypes.length&&plan.reviewTypes.every(id=>reviewTypeIds.includes(id))))return false;
 return !!plan&&plan.version===1&&Number.isInteger(plan.dailyCount)&&plan.dailyCount>=1&&plan.dailyCount<=100&&typeof plan.retry==='boolean'&&typeof plan.appendix==='boolean'&&!!plan.chapters&&typeof plan.chapters==='object'&&!Array.isArray(plan.chapters)&&Object.entries(plan.chapters).length<=100&&Object.entries(plan.chapters).every(([id,types])=>/^[\w-]{1,100}$/.test(id)&&Array.isArray(types)&&types.length>0&&types.length<=4&&new Set(types).size===types.length&&types.every(t=>trainingAbilities.includes(t)));
}
export function trainingOptions(plan){return {essayIds:Object.keys(plan.chapters),essayTypes:plan.chapters,appendix:plan.appendix,count:plan.dailyCount,scope:'all',ability:'',vocabularyTyping:false,reviewTypes:plan.reviewTypes||[],studyPool:plan.studyPool};}
export function dailyProgress(state,today=hkDay()){
 const attempts=effectiveAttempts(state),todays=attempts.filter(a=>a.day===today);
 const seen=new Set(todays.map(a=>a.memoryId));
 const goal=state.dailyGoals?.[today]||state.settings.training?.dailyCount||20;
 return {today,goal,done:seen.size,remaining:Math.max(0,goal-seen.size),seen,total:new Set(attempts.map(a=>a.memoryId)).size,retries:todays.filter(a=>a.practiceKind==='retry').length};
}
export function retryQuestions(questions,state,today=hkDay()){
 const plan=state.settings.training;if(!validTraining(plan)||!plan.retry)return [];
 const ids=[...questionMistakes(state)].filter(([,a])=>a.day<today).map(([id])=>id);
 const seen=seenInPractice(state,questions,today);
 const pastDays=available(questions,{...trainingOptions(plan),questionIds:ids}).filter(q=>!wasSeen(q,seen));
 // 例外：今天打字自查答錯的題目，當天自動再練一次；
 // 其他今天已出現的題目仍按每日去重，不再安排。
 const today1=available(questions,{...trainingOptions(plan),questionIds:[...todayRetryIds(state,today)]});
 return [...pastDays,...today1.filter(q=>!pastDays.some(p=>p.id===q.id))];
}
// 今天打字自查答錯、而且之後還沒再交過答案的題目（每個知識點只自動回練一次）。
export function todayRetryIds(state,today=hkDay()){
 const groups=new Map();
 for(const a of effectiveAttempts(state).filter(a=>a.day===today)){if(!groups.has(a.memoryId))groups.set(a.memoryId,[]);groups.get(a.memoryId).push(a);}
 const ids=new Set();
 for(const rows of groups.values()){
  // 選擇題答錯或打字自查答錯，當日都可回練一次。
  const firstFailure=rows.findIndex(a=>a.trainingPolicy===2&&a.correct===false);
  // 答錯之後再交的任何答案（包括未自查的打字答案）都已算回練。
  if(firstFailure>=0&&firstFailure===rows.length-1)ids.add(rows[firstFailure].questionId);
 }
 return ids;
}
export function dailyQuestions(questions,state,today=hkDay(),schoolVocab=[]){
 const plan=state.settings.training;if(!validTraining(plan))return [];
 const progress=dailyProgress(state,today);if(!progress.remaining)return [];
 return queue(questions,{...trainingOptions(plan),count:progress.remaining,rotation:state.settings.rotation||0,excludeMemoryIds:[...progress.seen],priorityMode:'daily',...(schoolVocab.length?{schoolVocab}:{})},state,today);
}

// Reconcile all unfinished queues against today's presentations and bank revisions.
// Submitted snapshots and unfinished self-assessment remain intact.
export function refreshTrainingSession(questions,state,original,today=hkDay()){
 const plan=state.settings.training;
 if(original.completed)return original;
 const training=['daily','retry'].includes(original.kind);
 if(training&&!validTraining(plan))return original;
 const progress=dailyProgress(state,today);
 const session=structuredClone(original),answers=session.answers||={};
 for(const a of state.attempts.filter(e=>e.payload.sessionId===session.id))answers[a.payload.questionId]=a.id;
 // Keep both draft formats when a learner changes the daily answer setting.
 // Submitted answers always use the mode stored with their attempt.
 const nextMode=plan.vocabularyTyping!==undefined||session.vocabularyTyping!==undefined?{...session,vocabularyTyping:false}:session;
 const snapshots=new Map([...questions,...session.questions].map(q=>[q.id,q]));
 for(const [id,draft] of Object.entries(session.drafts||{})){
  const q=snapshots.get(id);if(!q||answers[id])continue;
  const before=answerMode(q,session),after=answerMode(q,nextMode);
  if(before===after)continue;
  session.draftsByMode||={};session.draftsByMode[id]||={};
  session.draftsByMode[id][before]=draft;
  session.drafts[id]=session.draftsByMode[id][after]||'';
 }
 session.vocabularyTyping=nextMode.vocabularyTyping;
 const answered=session.questions.filter(q=>answers[q.id]),current=session.questions[session.index];
 const skipped=questions.filter(q=>[...(session.skippedIds||[]),...(session.skipped||[])].includes(q.id));
 const excludedMemories=new Set([...answered,...skipped].map(q=>q.memoryId));
 const excludedGroups=new Set([...answered,...skipped].map(q=>q.practiceGroup).filter(Boolean));
 const opts=training?trainingOptions(plan):session.selection||{essayIds:session.essayIds||[...new Set(session.questions.flatMap(q=>q.essayIds))],questionIds:session.questions.map(q=>q.id),appendix:session.questions.some(q=>q.tags?.includes('appendix')),scope:'all'};
 const continuation=current&&!answers[current.id]&&!skipped.some(q=>q.id===current.id)?{sessionId:session.id,questionId:current.id}:{};
 const seen=seenInPractice(state,questions,today,continuation);
 const mistakes=questionMistakes(state);
 const retryIds=new Set([...mistakes].filter(([,a])=>a.day<today).map(([id])=>id));
 const todayRetry=session.kind==='retry'&&plan.retry?todayRetryIds(state,today):new Set();
 // 當天答錯回練的題目不受「今天已出現」限制，其餘題目照舊去重。
 const pool=available(questions,opts).filter(q=>(opts.scope!=='wrong'||mistakes.has(q.id))&&(todayRetry.has(q.id)||!wasSeen(q,seen))&&!answers[q.id]&&!excludedMemories.has(q.memoryId)&&(!q.practiceGroup||!excludedGroups.has(q.practiceGroup))&&(session.kind!=='retry'||plan.retry&&(retryIds.has(q.id)||todayRetry.has(q.id))));
 const capacity=Math.max(0,Math.min(100-answered.length,session.kind==='daily'?progress.remaining:(session.targetCount??original.questions.length)-answered.length));
 const previous=new Map(session.questions.map(q=>[q.id,q]));
 const retain=q=>{
  const old=previous.get(q.id);if(old&&old.version===q.version)return old;
  if(old&&session.drafts?.[q.id]){session.archivedDrafts||={};session.archivedDrafts[q.id+'@v'+old.version]=session.drafts[q.id];delete session.drafts[q.id];}
  return q;
 };
 const nextCurrent=current&&pool.find(q=>q.id===current.id);
 const pending=capacity&&nextCurrent?[retain(nextCurrent)]:[];
 const rest=pool.filter(q=>!pending.some(p=>p.memoryId===q.memoryId||(p.practiceGroup&&p.practiceGroup===q.practiceGroup)));
 if(capacity>pending.length)pending.push(...queue(rest,{...opts,count:capacity-pending.length,rotation:state.settings.rotation||0,priorityMode:training?'daily':opts.priorityMode},state,today).map(retain));
 if(session.selection){session.selection=structuredClone(opts);session.targetCount=session.kind==='daily'?Math.max(1,Math.min(100,answered.length+progress.remaining)):(original.targetCount??original.questions.length);}
 session.questions=[...answered,...pending];session.essayIds=opts.essayIds;if(training)session.trainingSnapshot=structuredClone(plan);session.goalDay=today;session.goalSnapshot=progress.goal;
 const unassessed=answered.findIndex(q=>state.attempts.some(a=>a.id===answers[q.id]&&a.payload.mode==='typing'&&!state.assessments.has(a.id)));
 session.skipped=(session.skipped||[]).filter(id=>pending.some(q=>q.id===id));
 const next=pending.findIndex(q=>!session.skipped.includes(q.id));
 session.passComplete=unassessed<0&&pending.length>0&&next<0;
 session.index=unassessed>=0?unassessed:answered.length+Math.max(0,next);session.completed=!pending.length&&unassessed<0;
 if(session.completed)session.index=0;
 return JSON.stringify(session)===JSON.stringify(original)?original:session;
}
