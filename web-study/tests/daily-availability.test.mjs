import test from 'node:test';
import assert from 'node:assert/strict';
import {project} from '../src/domain/review.mjs';
import {queue,quickCards,scopePool} from '../src/domain/queue.mjs';
import {seenInPractice,wasSeen} from '../src/domain/daily-availability.mjs';
import {dailyProgress,retryQuestions,refreshTrainingSession} from '../src/domain/training.mjs';
import {validateBackup} from '../src/storage/backup.mjs';
import {practiceView} from '../src/features/practice.mjs';

const day='2026-10-15',time='2026-10-15T03:00:00Z';
const plan={version:1,chapters:{e:['technique']},dailyCount:3,appendix:false,retry:true};
const opts={essayIds:['e'],count:3,scope:'all'};
const qs=Array.from({length:6},(_,i)=>({id:'q'+i,memoryId:'m'+i,version:1,essayIds:['e'],ability:'technique',stem:'哪種手法？',quote:'月亮像小船。',status:'reviewed',active:true,responseFormat:'single-choice',choices:[{id:'a',text:'比喻',explanation:'以月比船'},{id:'b',text:'反問',explanation:'沒有問句'}],answerId:'a'}));
qs[1].memoryId=qs[0].memoryId;qs[0].practiceGroup=qs[2].practiceGroup='same-context';
const shown=(q=qs[0],sessionId='s',createdAt=time)=>({id:sessionId+'/shown/'+q.id,type:'browse',createdAt,payload:{purpose:'practice',questionId:q.id,memoryId:q.memoryId,practiceGroup:q.practiceGroup||'',sessionId}});
const answered=(q=qs[0],correct=false,submittedAt=time,sessionId='other')=>({id:sessionId+'/'+q.id,type:'attempt',createdAt:submittedAt,payload:{questionId:q.id,memoryId:q.memoryId,questionVersion:q.version,question:q,sessionId,submittedAt,mode:correct===null?'typing':'choice',answer:'b',correct,practiceKind:'extra',trainingPolicy:2}});
const state=events=>project([{id:'plan',type:'settings',createdAt:'2026-10-14T00:00:00Z',payload:{training:plan}},...events],day);
const session=fields=>({id:'s',kind:'extra',selection:opts,targetCount:3,questions:[qs[0],qs[3],qs[4]],index:0,answers:{},drafts:{q0:'b'},essayIds:['e'],mode:'choice',completed:false,startedAt:time,...fields});

test('any submitted result blocks the question, memory variants and practice group across all practice scopes',()=>{
 for(const correct of [true,false,null]){
  const p=state([answered(qs[0],correct)]);
  for(const scope of ['all','wrong'])assert.ok(queue(qs,{...opts,scope},p,day).every(q=>!['q0','q1','q2'].includes(q.id)));
  assert.equal(retryQuestions(qs,p,day).length,0);
 }
});
test('presentation without an answer consumes the daily slot but does not inflate learning progress',()=>{
 const p=state([shown()]);
 assert.deepEqual(queue(qs,opts,p,day).map(q=>q.id),['q3','q4','q5']);
 assert.equal(dailyProgress(p,day).done,0);assert.deepEqual(p.memories,{});
 const favorite={id:'fav',type:'favorite',createdAt:time,payload:{questionId:'q0',saved:true}};
 assert.equal(quickCards(qs,{...opts,scope:'saved'},state([shown(),favorite])).length,1);
});
test('ordinary browsing and unshown reserved questions do not consume a daily slot',()=>{
 const p=state([{...shown(),payload:{questionId:'q0'}},{id:'session',type:'session',createdAt:time,payload:{session:session()}}]);
 assert.ok(queue(qs,opts,p,day).some(q=>q.id==='q0'));
});
test('daily exclusion changes the draw pool without shrinking cumulative library totals',()=>{
 const p=state([answered(qs[0],true)]);
 assert.equal(scopePool(qs,opts,p).length,6);
 assert.equal(queue(qs,opts,p,day).length,3);
 assert.equal(dailyProgress(p,day).done,1);
});
test('a revised bank cannot bypass the old snapshot memory and group exclusions',()=>{
 const pool=structuredClone(qs),event=answered(qs[0]);pool[0].memoryId='revised-memory';pool[0].practiceGroup='revised-group';
 const seen=seenInPractice(state([event]),pool,day);
 assert.equal(wasSeen(pool[0],seen),true);assert.equal(wasSeen(pool[1],seen),true);assert.equal(wasSeen(pool[2],seen),true);
});
test('Hong Kong midnight releases presentations and attempts, including skipped questions',()=>{
 const before='2026-10-14T15:59:59Z',p=state([shown(qs[0],'s',before),answered(qs[3],false,before)]);
 assert.ok(queue(qs,opts,p,day).some(q=>q.id==='q0'));
 assert.ok(retryQuestions(qs,p,day).some(q=>q.id==='q3'));
 const atMidnight=state([shown(qs[0],'s','2026-10-14T16:00:00Z')]);
 assert.ok(queue(qs,opts,atMidnight,day).every(q=>!['q0','q1','q2'].includes(q.id)));
});
test('only the same unfinished screen may resume its presentation; another session or a submission blocks it',()=>{
 const continuation={sessionId:'s',questionId:'q0'};
 assert.equal(wasSeen(qs[0],seenInPractice(state([shown()]),qs,day,continuation)),false);
 for(const event of [shown(qs[0],'other'),answered()])assert.equal(wasSeen(qs[0],seenInPractice(state([shown(),event]),qs,day,continuation)),true);
 const original=session(),copy=structuredClone(original);
 const updated=refreshTrainingSession(qs,state([shown()]),original,day);
 assert.equal(updated.questions[updated.index].id,'q0');assert.equal(updated.drafts.q0,'b');assert.deepEqual(original,copy);
});
test('unchanged daily settings and manual queues both reconcile after another session answers',()=>{
 for(const kind of ['daily','extra']){
  const original=session({kind,trainingSnapshot:plan}),p=state([shown(),answered(qs[3])]);
  const updated=refreshTrainingSession(qs,p,original,day);
  assert.equal(updated.questions[updated.index].id,'q0');assert.ok(!updated.questions.some(q=>q.id==='q3'));
  assert.ok(updated.questions.some(q=>q.id==='q4'));
 }
});
test('legacy queues are deduplicated and wrong-only queues cannot be padded with non-mistakes',()=>{
 const legacy=session();delete legacy.selection;
 assert.ok(refreshTrainingSession(qs,state([shown(qs[0],'other')]),legacy,day).questions.every(q=>!['q0','q1','q2'].includes(q.id)));
 const p=state([answered(qs[0],false,'2026-10-14T01:00:00Z')]);
 const updated=refreshTrainingSession(qs,p,session({selection:{...opts,scope:'wrong'}}),day);
 assert.deepEqual(updated.questions.map(q=>q.id),['q0']);
});
test('pending bank revisions archive stale drafts while submitted snapshots remain unchanged',()=>{
 const pool=structuredClone(qs);pool[0].version=2;pool[0].stem='新題幹';
 const updated=refreshTrainingSession(pool,state([shown()]),session(),day);
 assert.equal(updated.questions[0].version,2);assert.equal(updated.drafts.q0,undefined);assert.equal(updated.archivedDrafts['q0@v1'],'b');
 const original=session({answers:{q0:'s/q0'},index:1});
 const after=refreshTrainingSession(pool,state([answered(qs[0],true,time,'s')]),original,day);
 assert.deepEqual(after.questions[0],qs[0]);assert.equal(after.answers.q0,'s/q0');
});
test('presentation markers round-trip through backup validation; malformed markers are rejected',()=>{
 const data={format:'wenyan-backup-v1',userId:'u',events:[shown()]};
 assert.deepEqual(validateBackup(data,'u')[0],shown());
 for(const field of ['memoryId','sessionId']){const bad=structuredClone(data);delete bad.events[0].payload[field];assert.throws(()=>validateBackup(bad,'u'),/出題/);}
});
test('report is visible exactly once before answering and outside collapsed correct-answer feedback',()=>{
 for(const result of [undefined,true,false]){
  const s=session({questions:[qs[0]],index:0}),p=state([]);
  if(result!==undefined){const a=answered(qs[0],result,time,'s');p.attempts=[a];s.answers.q0=a.id;}
  const html=practiceView({essays:[{id:'e',title:'篇章'}]},s,p);
  assert.equal((html.match(/data-action="report"/g)||[]).length,1);assert.match(html,/反饋／舉報/);
  assert.ok(html.indexOf('data-action="report"')<html.indexOf('class="question-layout'));
 }
});
