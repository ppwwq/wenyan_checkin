import test from 'node:test';
import assert from 'node:assert/strict';
import {project,hkDay} from '../src/domain/review.mjs';
import {validTraining,dailyProgress,dailyQuestions,retryQuestions,questionMistakes} from '../src/domain/training.mjs';
import {trainingView,dailyHomeView} from '../src/features/training.mjs';
import {validateBackup} from '../src/storage/repository.mjs';
import * as trainingDomain from '../src/domain/training.mjs';
const plan={version:1,chapters:{a:['vocabulary'],b:['theme']},dailyCount:3,appendix:false,retry:true};
const setting=(value=plan,time='2026-09-24T00:00:00Z')=>({id:time,type:'settings',createdAt:time,payload:{training:value}});
const q=(id,essays=['a'],ability='vocabulary')=>({id,memoryId:id,essayIds:essays,ability,status:'reviewed',active:true,choices:[]});
const questions=[q('a1'),q('a2'),q('a3'),q('b1',['b'],'theme'),q('b2',['b'],'vocabulary'),q('cross',['a','b'])];
const bank={questions,essays:[{id:'a',title:'甲篇'},{id:'b',title:'乙篇'}]};
const attempt=(id,correct,time='2026-09-24T01:00:00Z',extra={})=>({id,type:'attempt',createdAt:time,payload:{memoryId:'a1',questionId:'a1',submittedAt:time,mode:'choice',correct,trainingPolicy:2,practiceKind:'daily',...extra}});
const state=(events=[],today='2026-09-24',corrections=[])=>project([setting(),...events],today,corrections);
test('per-chapter types restrict all cross-essay participants and never mutate saved configuration',()=>{
 const s=state(),before=structuredClone(s.settings.training);
 const ids=dailyQuestions(questions,s,'2026-09-24').map(q=>q.id);
 assert.ok(ids.includes('b1'));assert.ok(!ids.includes('b2'));assert.ok(!ids.includes('cross'));assert.deepEqual(s.settings.training,before);
});

test('saving a new training scope replaces pending daily questions while preserving submitted answers and drafts',()=>{
 const submitted=attempt('saved-a1',true,'2026-09-24T01:00:00Z',{sessionId:'daily'});
 const s=state([submitted,setting({...plan,chapters:{b:['theme']}},'2026-09-24T02:00:00Z')]);
 const session={id:'daily',kind:'daily',questions:questions.slice(0,3),answers:{a1:'saved-a1'},drafts:{a2:'unfinished answer'},index:1,completed:false,essayIds:['a'],trainingSnapshot:plan};
 const before=structuredClone({session,attempts:s.attempts});
 const updated=trainingDomain.refreshTrainingSession(questions,s,session,'2026-09-24');
 assert.deepEqual(updated.questions.map(q=>q.id),['a1','b1']);
 assert.equal(updated.index,1);assert.equal(updated.completed,false);
 assert.deepEqual(updated.answers,{a1:'saved-a1'});assert.equal(updated.drafts.a2,'unfinished answer');
 assert.deepEqual({session,attempts:s.attempts},before);
});

test('enabling and disabling standalone techniques refreshes unfinished work without removing answered appendix history',()=>{
 const appendix={...q('appendix',[],'technique'),tags:['appendix']},pool=[q('a1'),q('a2'),appendix];
 const off={...plan,chapters:{a:['vocabulary']}},on={...off,appendix:true};
 const original={id:'daily',kind:'daily',questions:pool.slice(0,2),answers:{},drafts:{a1:'draft-a'},index:0,completed:false,essayIds:['a'],trainingSnapshot:off};
 const enabled=trainingDomain.refreshTrainingSession(pool,state([setting(on,'2026-09-24T02:00:00Z')]),original,'2026-09-24');
 assert.deepEqual(enabled.questions.map(q=>q.id),['a1','a2','appendix']);assert.equal(enabled.drafts.a1,'draft-a');
 enabled.index=2;enabled.drafts.appendix='draft-technique';
 const disabled=trainingDomain.refreshTrainingSession(pool,state([setting(off,'2026-09-24T03:00:00Z')]),enabled,'2026-09-24');
 assert.ok(disabled.questions.every(q=>!q.tags?.includes('appendix')));assert.equal(disabled.drafts.appendix,'draft-technique');
 const answered=attempt('saved-technique',true,'2026-09-24T01:00:00Z',{questionId:'appendix',memoryId:'appendix',sessionId:'daily'});
 const retained=trainingDomain.refreshTrainingSession(pool,state([answered,setting(off,'2026-09-24T03:00:00Z')]),enabled,'2026-09-24');
 assert.equal(retained.questions[0].id,'appendix');assert.equal(retained.answers.appendix,'saved-technique');assert.equal(retained.index,1);
});

test('empty scope and disabling retries close pending work while keeping submitted snapshots and unfinished self-assessment',()=>{
 const original={id:'retry',kind:'retry',questions:[questions[0]],answers:{},drafts:{a1:'draft'},index:0,completed:false};
 for(const change of [{retry:false},{chapters:{}}]){
  const updated=trainingDomain.refreshTrainingSession(questions,state([attempt('wrong',false),setting({...plan,...change},'2026-09-24T02:00:00Z')]),original,'2026-09-24');
  assert.equal(updated.completed,true);assert.deepEqual(updated.questions,[]);assert.equal(updated.drafts.a1,'draft');
 }
 const pending=attempt('typing',null,'2026-09-24T01:00:00Z',{mode:'typing',sessionId:'daily'});
 const updated=trainingDomain.refreshTrainingSession(questions,state([pending,setting({...plan,chapters:{}},'2026-09-24T02:00:00Z')]),{...original,id:'daily',kind:'daily'},'2026-09-24');
 assert.equal(updated.completed,false);assert.equal(updated.index,0);assert.equal(updated.questions[0].id,'a1');
});
test('daily target counts distinct knowledge points, including wrong and pending submissions',()=>{
 const s=state([attempt('wrong',false),attempt('retry',true,'2026-09-24T01:01:00Z',{practiceKind:'retry'}),attempt('pending',null,'2026-09-24T01:02:00Z',{mode:'typing',memoryId:'a2',questionId:'a2'})]);
 assert.equal(dailyProgress(s,'2026-09-24').done,2);assert.equal(dailyProgress(s,'2026-09-24').retries,1);
 const list=dailyQuestions(questions,s,'2026-09-24');assert.equal(list.length,1);assert.ok(!list.some(q=>['a1','a2'].includes(q.memoryId)));
});
test('wrong answers are eligible immediately, no ten-minute waiting period',()=>{
 const s=state([attempt('wrong',false)]);
 assert.deepEqual(retryQuestions(questions,s,'2026-09-24').map(q=>q.id),['a1']);assert.equal(s.memories.a1.againAt,null);assert.equal(s.memories.a1.due,'2026-09-25');
});
test('one same-day retry maximum, whether corrected, still wrong or pending self-check',()=>{
 for(const result of [true,false,null]){
  const s=state([attempt('first',false),attempt('again',result,'2026-09-24T01:00:01Z',{mode:result===null?'typing':'choice',practiceKind:'retry'})]);
  assert.equal(retryQuestions(questions,s,'2026-09-24').length,0);assert.equal(s.memories.a1.due,'2026-09-25');assert.equal(s.firsts[0].correct,false);
 }
});
test('correct then wrong preserves first accuracy but creates immediate retry and next-day review',()=>{
 const s=state([attempt('first',true),attempt('lapse',false,'2026-09-24T01:01:00Z',{practiceKind:'extra'})]);
 assert.equal(s.firsts[0].correct,true);assert.equal(s.memories.a1.correct,true);assert.equal(s.memories.a1.hasFailure,true);assert.equal(s.memories.a1.due,'2026-09-25');assert.equal(retryQuestions(questions,s,'2026-09-24').length,1);
});
test('mistake badges use exact questions, survive same-day correction and clear after next-day success',()=>{
 const wrong=attempt('first',false),fixed=attempt('fixed',true,'2026-09-24T01:01:00Z');
 let s=state([wrong,fixed]);assert.equal(questionMistakes(s).has('a1'),true);assert.equal(questionMistakes(s).has('a2'),false);
 s=state([wrong,fixed,attempt('tomorrow',true,'2026-09-25T01:00:00Z')],'2026-09-25');assert.equal(questionMistakes(s).size,0);assert.equal(s.memories.a1.hasFailure,false);
});
test('effective correction removes false mistake and retry without rewriting the original answer',()=>{
 const a=attempt('wrong',false),s=state([a],'2026-09-24',[{attemptId:'wrong',correct:true,createdAt:'2026-09-24T02:00:00Z'}]);
 assert.equal(questionMistakes(s).size,0);assert.equal(retryQuestions(questions,s,'2026-09-24').length,0);assert.equal(s.attempts[0].payload.correct,false);
});
test('turning retry off, suspending a chapter or withdrawing a question removes automatic eligibility',()=>{
 for(const change of [{retry:false},{chapters:{b:['theme']}}])assert.equal(retryQuestions(questions,state([attempt('wrong',false),setting({...plan,...change},'2026-09-24T02:00:00Z')]),'2026-09-24').length,0);
 assert.equal(retryQuestions(questions.map(q=>({...q,active:false})),state([attempt('wrong',false)]),'2026-09-24').length,0);
});
test('Hong Kong midnight creates a new daily count and due task, not a leftover automatic retry',()=>{
 const before=attempt('night',false,'2026-09-24T15:59:59Z'),s=state([before],'2026-09-25');
 assert.equal(dailyProgress(s,'2026-09-25').done,0);assert.equal(retryQuestions(questions,s,'2026-09-25').length,0);assert.ok(dailyQuestions(questions,s,'2026-09-25').some(q=>q.id==='a1'));
 assert.equal(hkDay('2026-09-24T16:00:00Z'),'2026-09-25');
});
test('legacy setting events without an explicit daily goal keep their original frozen target',()=>{
 const freeze={id:'freeze',type:'settings',createdAt:'2026-09-24T00:10:00Z',payload:{dailyGoal:{day:'2026-09-24',count:3}}};
 const s=state([freeze,setting({...plan,dailyCount:30},'2026-09-24T01:00:00Z')]);assert.equal(dailyProgress(s,'2026-09-24').goal,3);assert.equal(dailyProgress(s,'2026-09-25').goal,30);
});

test('explicit training saves update today target without resetting progress, and later startup cannot restore the old target',()=>{
 const freeze={id:'freeze',type:'settings',createdAt:'2026-09-24T00:10:00Z',payload:{dailyGoal:{day:'2026-09-24',count:3}}};
 const save=setting({...plan,dailyCount:5},'2026-09-24T02:00:00Z');save.payload.dailyGoal={day:'2026-09-24',count:5};
 const stale={...freeze,id:'late-start',createdAt:'2026-09-24T03:00:00Z'};
 const s=state([freeze,attempt('answered',true),save,stale]);
 assert.equal(dailyProgress(s,'2026-09-24').goal,5);assert.equal(dailyProgress(s,'2026-09-24').done,1);assert.equal(dailyProgress(s,'2026-09-24').remaining,4);
});
test('blank scope is explicit, unavailable pool is not padded, and completed goal stops new daily groups',()=>{
 assert.equal(dailyQuestions(questions,state([setting({...plan,chapters:{}},'2026-09-24T01:00:00Z')]),'2026-09-24').length,0);
 assert.equal(dailyQuestions([q('only')],state(),'2026-09-24').length,1);
 const s=state(questions.slice(0,3).map((q,i)=>attempt('done'+i,true,`2026-09-24T01:00:0${i}Z`,{questionId:q.id,memoryId:q.id})));assert.equal(dailyQuestions(questions,s,'2026-09-24').length,0);
});
test('old policy events are preserved without retroactively adding new automatic retries',()=>{
 const s=state([attempt('old',false,'2026-09-24T01:00:00Z',{trainingPolicy:undefined})]);assert.equal(retryQuestions(questions,s,'2026-09-24').length,0);assert.equal(questionMistakes(s).has('a1'),true);
});
test('settings validate and survive account backup with duplicate events deduplicated',()=>{
 assert.equal(validTraining(plan),true);for(const p of [{...plan,dailyCount:0},{...plan,chapters:{a:[]}},{...plan,chapters:{a:['unknown']}}])assert.equal(validTraining(p),false);
 const data={format:'wenyan-backup-v1',userId:'u',events:[setting(),setting()]};assert.equal(validateBackup(data,'u').length,1);
 assert.throws(()=>validateBackup({...data,events:[setting({...plan,dailyCount:1000})]},'u'),/設定/);
});
test('settings and home render persistent chapter types and only mistake history labels',()=>{
 const s=state(),html=trainingView(bank,s,{});assert.match(html,/data-training-type="theme"/);assert.match(html,/data-training-essay="a" checked/);assert.match(html,/daily-count/);
 const home=dailyHomeView(bank,s);assert.match(home,/開始今日訓練/);assert.doesNotMatch(home,/已練過|未練過/);
});

test('setting shortcuts and cancel actions are non-submit buttons',()=>{
 const html=trainingView(bank,state(),{});
 assert.match(html,/<button type="button"[^>]*data-action="daily-count"/);
 assert.match(html,/<button type="button"[^>]*data-action="nav"/);
 assert.match(html,/<button class="btn" type="submit">/);
});

test('first setup starts with an explicit empty choice, while legacy and saved selections survive',()=>{
 const fresh=project([]),options={essayIds:['a','b'],count:20};
 const html=trainingView(bank,fresh,options);
 assert.doesNotMatch(html,/data-training-essay="[ab]" checked/);
 assert.doesNotMatch(html,/沿用原有/);
 const legacy=trainingView(bank,fresh,{...options,hasPreviousSelection:true});
 assert.match(legacy,/data-training-essay="a" checked/);
 assert.match(legacy,/沿用原有/);
 assert.match(trainingView(bank,state(),options),/data-training-essay="b" checked/);
});
