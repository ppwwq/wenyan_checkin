export function hkDay(value = new Date()) {
  return new Date(new Date(value).getTime() + 8 * 3600000).toISOString().slice(0, 10);
}
export const addDays = (day, count) => new Date(Date.parse(day + 'T00:00:00Z') + count * 86400000).toISOString().slice(0, 10);
const intervals = [1,2,4,7,15,30,60,90];
export function project(input, today = hkDay(), corrections = []) {
  const events = [...new Map(input.map(e => [e.id, e])).values()].sort((a,b) => (Date.parse(a.createdAt)-Date.parse(b.createdAt)) || a.id.localeCompare(b.id));
  const attempts = events.filter(e => e.type === 'attempt');
  const assessments = new Map();
  for (const e of events.filter(e => e.type === 'assessment')) if (!assessments.has(e.payload.attemptId)) assessments.set(e.payload.attemptId, e.payload.correct);
  const correctionMap = new Map([...corrections].sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)).map(c=>[c.attemptId,c]));
  const firstMap = new Map(), memories = {}, favorites = {}, sessions = {}, reports = [], browsed = {};
  let settings = {typing:false, fontSize:24, rotation:0};
  for (const e of attempts.sort((a,b) => (Date.parse(a.payload.submittedAt)-Date.parse(b.payload.submittedAt)) || a.id.localeCompare(b.id))) {
    const p = e.payload, day = hkDay(p.submittedAt), key = p.memoryId + '/' + day;
    if (!firstMap.has(key)) firstMap.set(key, {...p, day, id:e.id, correct:correctionMap.has(e.id)?correctionMap.get(e.id).correct:(p.mode === 'typing' ? (assessments.get(e.id) ?? null) : p.correct)});
  }
  const firsts = [...firstMap.values()];
  for (const f of firsts) {
    const old = memories[f.memoryId], base = {...old,...f,errors:old?.errors||0,reviews:old?.reviews||0};
    if (f.correct === null) { memories[f.memoryId] = {...(old||{memoryId:f.memoryId,correct:null,errors:0,reviews:0}),pending:true,pendingAttempt:f}; continue; }
    if (!f.correct) {
      memories[f.memoryId] = {...base,pending:false,pendingAttempt:null,stage:0,interval:1,due:addDays(f.day,1),againAt:Date.parse(f.submittedAt)+600000,errors:base.errors+1,reviews:base.reviews+1};
    } else {
      let stage=old?.stage, interval=old?.interval, due=old?.due;
      if (due && f.day>=due) { stage=Math.min((stage||0)+1,intervals.length-1); interval=intervals[stage]; due=addDays(f.day,interval); }
      memories[f.memoryId] = {...base,pending:false,pendingAttempt:null,stage,interval,due,againAt:null,reviews:base.reviews+1};
    }
  }
  for (const e of events) {
    const p=e.payload;
    if(e.type==='favorite') favorites[p.questionId]=p;
    if(e.type==='session'&&(!sessions[p.session.id]||(p.session.revision||0)>=(sessions[p.session.id].revision||0))) sessions[p.session.id]=p.session;
    if(e.type==='settings') settings={...settings,...p};
    if(e.type==='report') reports.push({...p,id:e.id,status:'pending'});
    if(e.type==='browse') browsed[p.questionId]=e.createdAt;
  }
  // Repeated success clears only the reminder belonging to that same day.
  const completedToday = new Set();
  for(const e of attempts) {
    const p=e.payload, correct=correctionMap.has(e.id)?correctionMap.get(e.id).correct:(p.mode==='typing'?assessments.get(e.id):p.correct), day=hkDay(p.submittedAt);
    if(correct===true && day===today) completedToday.add(p.memoryId);
    const m=memories[p.memoryId];
    if(correct===true && m?.day===day && Date.parse(p.submittedAt)>=Date.parse(m.submittedAt)) m.againAt=null;
  }
  return {events,attempts,assessments,firsts,memories,favorites,sessions,settings,reports,browsed,completedToday,corrections};
}
export function isDue(memory,today=hkDay(),now=Date.now()) { return !!memory && ((!!memory.due && memory.due<=today) || (!!memory.againAt && memory.againAt<=now)); }
export const isWeak = memory => !!memory && memory.correct===false;

