import {validTraining} from '../domain/training.mjs';
import {project,hkDay} from '../domain/review.mjs';

const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v,max=300)=>typeof v==='string'&&v.length>0&&v.length<=max;
const safeId=(v,max=200)=>text(v,max)&&!['__proto__','constructor','prototype'].includes(v);
const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const strings=v=>Array.isArray(v)&&v.every(id=>safeId(id));
const check=(value,message='記錄格式無效')=>{if(!value)throw new Error('備份'+message);};
const canonical=value=>JSON.stringify(value,(_,v)=>object(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
export const sameEvent=(a,b)=>a.type===b.type&&a.createdAt===b.createdAt&&canonical(a.payload)===canonical(b.payload);

function question(q){
 check(object(q)&&safeId(q.id)&&strings(q.essayIds)&&typeof q.stem==='string'&&Array.isArray(q.choices),'題目快照無效');
 check(q.choices.every(c=>object(c)&&safeId(c.id)&&typeof c.text==='string'&&(c.explanation===undefined||typeof c.explanation==='string')),'選項快照無效');
 check(new Set(q.choices.map(c=>c.id)).size===q.choices.length,'選項編號重複');
 for(const k of ['quote','explanation','target','summary','misconception'])check(q[k]===undefined||typeof q[k]==='string','題目文字無效');
 if(q.memoryId!==undefined)check(safeId(q.memoryId),'知識點編號無效');
 if(q.source!==undefined)check(object(q.source),'來源快照無效');
}
function session(s){
 check(object(s)&&safeId(s.id)&&Array.isArray(s.questions)&&s.questions.length<=100,'練習草稿無效');
 s.questions.forEach(question);
 check(new Set(s.questions.map(q=>q.id)).size===s.questions.length,'練習題目編號重複');
 check(Number.isInteger(s.index)&&s.index>=0&&s.index<Math.max(1,s.questions.length)&&strings(s.essayIds)&&date(s.startedAt)&&typeof s.completed==='boolean','練習進度無效');
 for(const key of ['answers','drafts'])check(object(s[key])&&Object.entries(s[key]).every(([id,v])=>safeId(id)&&typeof v==='string'&&v.length<=20000),'練習答案或草稿無效');
 check(['choice','mixed','typing'].includes(s.mode)&&(s.paused===undefined||typeof s.paused==='boolean'),'練習模式無效');
 check(s.revision===undefined||(Number.isSafeInteger(s.revision)&&s.revision>=0),'練習版本無效');
 check(s.trainingSnapshot===undefined||validTraining(s.trainingSnapshot),'學習設定無效');
}
export function validateBackup(data,userId){
 check(data?.format==='wenyan-backup-v1'&&data.userId===userId&&Array.isArray(data.events),'格式不符或屬於另一個帳號');
 const unique=new Map();
 for(const e of data.events){
  check(object(e)&&safeId(e.id,300)&&date(e.createdAt)&&object(e.payload));
  const p=e.payload;
  check(['attempt','assessment','favorite','report','browse','session','settings'].includes(e.type));
  if(e.type==='attempt'){
   check(safeId(p.memoryId)&&safeId(p.questionId)&&Number.isInteger(p.questionVersion)&&p.questionVersion>0&&date(p.submittedAt),'作答時間或編號無效');
   question(p.question);check(p.question.id===p.questionId,'作答與題目編號不符');
   check(['choice','typing'].includes(p.mode)&&typeof p.answer==='string'&&p.answer.length<=20000,'作答格式無效');
   check(p.mode==='typing'?p.correct===null:typeof p.correct==='boolean','作答評分無效');
   check(!p.day||p.day===hkDay(p.submittedAt),'作答日期不符');
   check(p.sessionId===undefined||safeId(p.sessionId),'題組編號無效');
   check(p.trainingPolicy===undefined||(p.trainingPolicy===2&&['daily','retry','extra'].includes(p.practiceKind)),'訓練記錄無效');
  }
  if(e.type==='assessment')check(safeId(p.attemptId,300)&&typeof p.correct==='boolean','自查格式無效');
  if(e.type==='favorite')check(safeId(p.questionId)&&typeof p.saved==='boolean','收藏格式無效');
  if(e.type==='browse')check(safeId(p.questionId),'瀏覽格式無效');
  if(e.type==='report')check(safeId(p.questionId)&&Number.isInteger(p.questionVersion)&&p.questionVersion>0&&text(p.category,100)&&typeof p.detail==='string'&&p.detail.length<=5000,'回報格式無效');
  if(e.type==='session')session(p.session);
  if(e.type==='settings'){
   check(p.training===undefined||validTraining(p.training),'學習設定無效');
   if(p.training)check(Object.keys(p.training.chapters).every(id=>safeId(id)),'篇章編號無效');
   check(p.dailyGoal===undefined||(/^\d{4}-\d{2}-\d{2}$/.test(p.dailyGoal?.day)&&date(p.dailyGoal.day)&&Number.isInteger(p.dailyGoal.count)&&p.dailyGoal.count>=1&&p.dailyGoal.count<=100),'每日目標無效');
   check(p.typing===undefined||typeof p.typing==='boolean','作答設定無效');
   check(p.fontSize===undefined||(Number.isFinite(p.fontSize)&&p.fontSize>=12&&p.fontSize<=48),'字號設定無效');
   check(p.rotation===undefined||(Number.isSafeInteger(p.rotation)&&p.rotation>=0),'輪替設定無效');
  }
  if(unique.has(e.id))check(sameEvent(unique.get(e.id),e),'包含內容衝突的相同編號');
  else unique.set(e.id,{id:e.id,type:e.type,payload:e.payload,createdAt:e.createdAt,...(e.receivedAt?{receivedAt:e.receivedAt}:{})});
 }
 return [...unique.values()];
}

// Validate the complete union before any write. Server and local event IDs are immutable.
export function mergeBackupEvents(existing,incoming){
 const map=new Map(existing.map(e=>[e.id,e]));
 for(const e of incoming){if(map.has(e.id))check(sameEvent(map.get(e.id),e),'與本機相同編號的內容衝突');else map.set(e.id,e);}
 const checked=new Set();
 for(const e of map.values())if(e.type==='assessment'){
  const attempt=map.get(e.payload.attemptId);
  check(attempt?.type==='attempt'&&attempt.payload.mode==='typing','自查找不到對應文字作答');
  check(!checked.has(e.payload.attemptId),'同一作答有重複自查');checked.add(e.payload.attemptId);
 }
 const union=[...map.values()];project(union);
 return union;
}
