export function needsAnswer(session,state,q){
 const id=session.answers[q.id];
 if(!id)return true;
 return state.attempts.some(a=>a.id===id&&a.payload.mode==='typing'&&!state.assessments.has(id));
}
export function skippedQuestions(session){
 const skipped=new Set(session.skipped||[]);
 return session.questions.filter(q=>skipped.has(q.id)&&!session.answers[q.id]);
}
// A skip only changes the session, never the attempt history or review schedule.
export function advanceSession(session,state,skip=false){
 const current=session.questions[session.index];if(!current||session.completed||session.passComplete)return false;
 if(skip){
  if(session.answers[current.id])return false;
  session.skipped=[...new Set([...(session.skipped||[]),current.id])];
 }else if(needsAnswer(session,state,current))return false;
 session.skipped=skippedQuestions(session).map(q=>q.id);
 const skipped=new Set(session.skipped);
 for(let offset=1;offset<=session.questions.length;offset++){
  const index=(session.index+offset)%session.questions.length,q=session.questions[index];
  if(!skipped.has(q.id)&&needsAnswer(session,state,q)){session.index=index;return true;}
 }
 session.passComplete=skipped.size>0;session.completed=!session.passComplete;
 if(session.completed)session.index=0;
 return true;
}
export function resumeSkipped(session,state){
 session.skipped=[];session.passComplete=false;
 const index=session.questions.findIndex(q=>needsAnswer(session,state,q));
 session.completed=index<0;session.index=Math.max(0,index);
 return !session.completed;
}
