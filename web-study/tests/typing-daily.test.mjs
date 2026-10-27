import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {answerMode,isTypingVocabulary} from '../src/domain/answer-mode.mjs';
import {validTraining,trainingOptions,dailyQuestions,dailyProgress,retryQuestions,refreshTrainingSession} from '../src/domain/training.mjs';
import {project} from '../src/domain/review.mjs';
import {answerPanel} from '../src/features/practice.mjs';
import {trainingView} from '../src/features/training.mjs';
import {advanceWithReplacement} from '../src/domain/replacement.mjs';
import {validateBackup} from '../src/storage/backup.mjs';

const day='2026-10-23',time=day+'T01:00:00Z';
const q={id:'a',memoryId:'a',version:1,essayIds:['e'],ability:'vocabulary',target:'字',stem:'字的意思？',quote:'原字。',status:'reviewed',active:true,choices:[{id:'a',text:'意思',explanation:'根據'},{id:'b',text:'別解',explanation:'誤解'}],answerId:'a'};
const qs=[q,{...q,id:'b',memoryId:'b'}, {...q,id:'c',memoryId:'c',responseFormat:'single-choice'}, {...q,id:'d',memoryId:'d',ability:'theme'}];
const plan={version:1,chapters:{e:['vocabulary','theme']},dailyCount:3,appendix:false,retry:true};
const setting=p=>({id:'setting',type:'settings',createdAt:time,payload:{training:p}});
const state=(p=plan,events=[])=>project([setting(p),...events],day);
const make=()=>({id:'s',kind:'daily',questions:structuredClone(qs.slice(0,3)),index:0,answers:{},drafts:{a:'b'},mode:'choice',essayIds:['e'],completed:false,startedAt:time,trainingSnapshot:plan,goalDay:day,goalSnapshot:3,selection:trainingOptions(plan),targetCount:3});
const attempt=(question=q,mode='typing',sessionId='s')=>({id:sessionId+'/'+question.id,type:'attempt',createdAt:time,payload:{questionId:question.id,memoryId:question.memoryId,question,questionVersion:1,submittedAt:time,day,mode,answer:'意思',correct:mode==='typing'?null:true,sessionId,trainingPolicy:2,practiceKind:'daily'}});
const assess=(id,correct)=>({id:'assessment/'+id,type:'assessment',createdAt:day+'T01:01:00Z',payload:{attemptId:id,correct}});

test('typing vocabulary reuses 56 choice records without adding a separate bank or duplicate memory',()=>{
 const bank=JSON.parse(readFileSync(new URL('../content/bank.json',import.meta.url))),vocab=bank.questions.filter(q=>q.status==='reviewed'&&q.active!==false&&isTypingVocabulary(q));
 assert.equal(vocab.length,56);assert.equal(new Set(vocab.map(q=>q.memoryId)).size,56);
 for(const q of vocab)assert.equal(q.choices.filter(c=>c.id===q.answerId).length,1);
});

test('daily typing is opt-in, only affects compatible vocabulary, and never overrides a submitted mode',()=>{
 for(const enabled of [undefined,false])assert.equal(answerMode(q,{mode:'choice',vocabularyTyping:enabled,index:2}),'choice');
 const s={mode:'choice',vocabularyTyping:true,index:0};assert.equal(answerMode(q,s),'typing');
 for(const other of [qs[2],qs[3],{...q,provenance:{kind:'dse-original'}}])assert.equal(answerMode(other,s),'choice');
 assert.equal(answerMode(q,s,{mode:'choice'}),'choice');assert.equal(answerMode(q,{...s,vocabularyTyping:false},{mode:'typing'}),'typing');
 assert.equal(answerMode(q,{mode:'mixed',index:2}),'typing');
});

test('the daily setting validates, persists in backup, and lives within the existing training form',()=>{
 const p={...plan,vocabularyTyping:true};assert.equal(validTraining(p),true);assert.equal(validTraining(plan),true);
 for(const value of [null,'true',1])assert.equal(validTraining({...plan,vocabularyTyping:value}),false);
 assert.equal(trainingOptions(p).vocabularyTyping,true);
 assert.equal(validateBackup({format:'wenyan-backup-v1',userId:'u',events:[setting(p)]},'u')[0].payload.training.vocabularyTyping,true);
 const html=trainingView({essays:[{id:'e',title:'篇章'}],questions:qs},state(p),{});
 assert.match(html,/name="vocabularyTyping" type="checkbox" checked/);assert.equal((html.match(/<form/g)||[]).length,1);assert.doesNotMatch(html,/data-action="typing/);
});

test('changing daily mode restores the correct draft in both directions without rewriting history',()=>{
 const original=make(),on={...plan,vocabularyTyping:true};
 let updated=refreshTrainingSession(qs,state(on),original,day);
 assert.equal(updated.vocabularyTyping,true);assert.equal(updated.drafts.a,'');assert.equal(updated.draftsByMode.a.choice,'b');assert.equal(original.drafts.a,'b');
 updated.drafts.a='自己的詞義';
 updated=refreshTrainingSession(qs,state({...plan,vocabularyTyping:false}),updated,day);
 assert.equal(updated.drafts.a,'b');assert.equal(updated.draftsByMode.a.typing,'自己的詞義');
 updated=refreshTrainingSession(qs,state(on),updated,day);assert.equal(updated.drafts.a,'自己的詞義');
 const backup={format:'wenyan-backup-v1',userId:'u',events:[{id:'save',type:'session',createdAt:time,payload:{session:updated}}]};
 assert.deepEqual(validateBackup(backup,'u')[0].payload.session.draftsByMode,updated.draftsByMode);
 const invalid=structuredClone(backup);invalid.events[0].payload.session.draftsByMode.a.typing=42;assert.throws(()=>validateBackup(invalid,'u'),/草稿/);
});

test('mode changes preserve submitted typing answers and pending self-check even after disabling typing',()=>{
 const a=attempt(),original={...make(),vocabularyTyping:true,answers:{a:a.id},drafts:{a:'意思'},trainingSnapshot:{...plan,vocabularyTyping:true}};
 const s=state({...plan,vocabularyTyping:false},[a]),updated=refreshTrainingSession(qs,s,original,day);
 assert.equal(updated.index,0);assert.equal(updated.completed,false);assert.equal(updated.answers.a,a.id);assert.equal(answerMode(q,updated,a.payload),'typing');
 assert.match(answerPanel(q,updated,s),/self-check/);assert.equal(updated.drafts.a,'意思');
});

test('a legacy daily session keeps its mixed-mode behavior when no new answer setting was saved',()=>{
 const original={...make(),mode:'mixed',index:2,trainingSnapshot:{...plan,dailyCount:2}};
 const updated=refreshTrainingSession(qs,state(),original,day);assert.equal(updated.vocabularyTyping,undefined);assert.equal(answerMode(q,{...updated,index:2}),'typing');
});

test('typing does not duplicate daily questions or count the choice and typed versions twice',()=>{
 const p={...plan,vocabularyTyping:true},pool=[...qs,{...q,id:'a-variant'}];
 const list=dailyQuestions(pool,state(p),day);assert.equal(new Set(list.map(q=>q.memoryId)).size,list.length);
 const a=attempt(),again=attempt(q,'choice','s2'),s=state(p,[a,again]);assert.equal(dailyProgress(s,day).done,1);
 assert.ok(dailyQuestions(pool,s,day).every(item=>item.memoryId!=='a'));
});

test('typed self-check drives wrong-question retry, with no extra daily credit and only one automatic retry',()=>{
 const p={...plan,vocabularyTyping:true},a=attempt(),wrong=assess(a.id,false),s=state(p,[a,wrong]);
 assert.deepEqual(retryQuestions(qs,s,day).map(q=>q.id),['a']);assert.equal(dailyProgress(s,day).done,1);
 const again=attempt(q,'typing','retry');again.payload.practiceKind='retry';again.payload.submittedAt=day+'T01:02:00Z';again.createdAt=again.payload.submittedAt;
 assert.equal(retryQuestions(qs,state(p,[a,wrong,again]),day).length,0);
 assert.equal(dailyProgress(state(p,[a,wrong,again]),day).done,1);
});

test('typed skip keeps draft, supplies an unseen question, and creates no attempted knowledge point',()=>{
 const s={...make(),vocabularyTyping:true,drafts:{a:'草稿'},questions:[q],selection:{...trainingOptions({...plan,vocabularyTyping:true}),count:1},targetCount:1},p=state();
 advanceWithReplacement(s,p,qs,true);assert.equal(s.questions[0].id,'b');assert.equal(answerMode(s.questions[0],s),'typing');assert.equal(s.drafts.a,'草稿');assert.deepEqual(s.skippedIds,['a']);assert.equal(dailyProgress(p,day).done,0);
 const switched=refreshTrainingSession(qs,state({...plan,vocabularyTyping:false}),s,day);assert.equal(switched.draftsByMode.a.typing,'草稿');assert.equal(switched.drafts.a,'');
});

test('typing shows no options or answer before submission and requires self-check afterwards',()=>{
 const s={...make(),vocabularyTyping:true,drafts:{}},p=state();
 const before=answerPanel(q,s,p);assert.match(before,/textarea/);assert.doesNotMatch(before,/class="options"|先看這題答案/);
 const a=attempt();s.answers.a=a.id;const after=answerPanel(q,s,state(plan,[a]));assert.match(after,/意思/);assert.match(after,/self-check/);assert.doesNotMatch(after,/data-action="next"/);
 assert.match(answerPanel(q,s,state(plan,[a,assess(a.id,true)])),/data-action="next"/);
});
