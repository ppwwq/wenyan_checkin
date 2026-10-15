import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceSession,resumeSkipped,skippedQuestions} from '../src/domain/session.mjs';
import {project} from '../src/domain/review.mjs';
import {dailyProgress,refreshTrainingSession} from '../src/domain/training.mjs';
import {validateBackup} from '../src/storage/backup.mjs';
import {answerPanel,practiceView} from '../src/features/practice.mjs';

const questions=['q1','q2','q3'].map(id=>({id,memoryId:id,version:1,essayIds:['e'],ability:'meaning',stem:id,quote:'原文',status:'reviewed',active:true,responseFormat:'single-choice',choices:[{id:'a',text:'答案',explanation:'依據'},{id:'b',text:'錯項',explanation:'原因'}],answerId:'a'}));
const makeSession=()=>({id:'s',kind:'extra',questions:structuredClone(questions),index:0,answers:{},drafts:{q1:'b'},mode:'choice',essayIds:['e'],completed:false,startedAt:'2026-10-02T16:01:00Z'});
const state=()=>project([],'2026-10-03');
const bank={essays:[{id:'e',title:'篇章'}],questions};

test('skip advances without submitting, scoring, revealing the answer or losing drafts',()=>{
 const s=makeSession(),p=state();
 assert.equal(advanceSession(s,p,true),true);
 assert.equal(s.index,1);assert.deepEqual(s.skipped,['q1']);assert.deepEqual(s.answers,{});assert.equal(s.drafts.q1,'b');
 assert.equal(p.attempts.length,0);assert.equal(dailyProgress(p,'2026-10-03').done,0);assert.deepEqual(p.memories,{});
 const html=answerPanel(s.questions[s.index],s,p);
 assert.match(html,/data-action="skip"/);assert.doesNotMatch(html,/class="feedback"|option correct|option wrong/);
});

test('legacy all-skipped groups retain their backup but no longer offer same-day restart',()=>{
 const s=makeSession(),p=state();
 for(let i=0;i<3;i++)advanceSession(s,p,true);
 assert.equal(s.passComplete,true);assert.equal(s.completed,false);assert.equal(skippedQuestions(s).length,3);
 const html=practiceView(bank,s,p);
 assert.match(html,/本輪練習已結束/);assert.doesNotMatch(html,/data-action="resume-skipped"/);assert.match(html,/跳過 3 題/);assert.match(html,/明日/);assert.doesNotMatch(html,/這組練習已完成/);
 const restored=validateBackup({format:'wenyan-backup-v1',userId:'u',events:[{id:'save',type:'session',createdAt:s.startedAt,payload:{session:s}}]},'u')[0].payload.session;
 assert.equal(resumeSkipped(restored,p),true);assert.equal(restored.index,0);assert.equal(restored.passComplete,false);assert.deepEqual(restored.skipped,[]);assert.equal(restored.drafts.q1,'b');
});

test('answering the last question returns to skipped work and only completes after it is answered',()=>{
 const s={...makeSession(),questions:questions.slice(0,2)},p=state();
 advanceSession(s,p,true);s.answers.q2='s/q2';advanceSession(s,p);
 assert.equal(s.passComplete,true);assert.equal(s.completed,false);assert.equal(skippedQuestions(s).length,1);
 resumeSkipped(s,p);s.answers.q1='s/q1';advanceSession(s,p);
 assert.equal(s.completed,true);assert.equal(s.passComplete,false);assert.equal(skippedQuestions(s).length,0);
});

test('submitted and unassessed typing answers cannot be skipped or silently advanced',()=>{
 const s=makeSession(),p=state();s.answers.q1='s/q1';
 p.attempts.push({id:'s/q1',payload:{mode:'typing'}});
 assert.equal(advanceSession(s,p,true),false);assert.equal(advanceSession(s,p),false);assert.equal(s.index,0);
 p.assessments.set('s/q1',true);assert.equal(advanceSession(s,p),true);assert.equal(s.index,1);
});

test('single-question groups can skip, resume and skip again without loops or completion inflation',()=>{
 const s={...makeSession(),questions:questions.slice(0,1)},p=state();
 advanceSession(s,p,true);assert.equal(s.index,0);assert.equal(s.passComplete,true);
 resumeSkipped(s,p);advanceSession(s,p,true);assert.equal(s.passComplete,true);assert.equal(s.completed,false);assert.deepEqual(s.skipped,['q1']);
});

test('changed training scope removes stale skips while preserving unfinished drafts',()=>{
 const p=state(),plan={version:1,chapters:{e:['meaning']},dailyCount:3,appendix:false,retry:true};p.settings.training=plan;
 const s={...makeSession(),kind:'daily',skipped:['q1','q2'],passComplete:true};
 const updated=refreshTrainingSession(questions.slice(2),p,s,'2026-10-03');
 assert.deepEqual(updated.skipped,[]);assert.equal(updated.passComplete,false);assert.equal(updated.questions[updated.index].id,'q3');assert.equal(updated.drafts.q1,'b');
});

test('backup rejects malformed skip fields but accepts legacy sessions',()=>{
 const wrap=s=>({format:'wenyan-backup-v1',userId:'u',events:[{id:'save',type:'session',createdAt:s.startedAt,payload:{session:s}}]});
 assert.equal(validateBackup(wrap(makeSession()),'u').length,1);
 for(const fields of [{skipped:'q1'},{skipped:['missing']},{skipped:['q1','q1']},{passComplete:'yes'},{skipped:['q1'],answers:{q1:'s/q1'}}])assert.throws(()=>validateBackup(wrap({...makeSession(),...fields}),'u'),/跳過|進度/);
});

test('choice results use color classes and accessible labels without visible verdict text',()=>{
 const s=makeSession(),p=state();s.answers.q1='s/q1';p.attempts.push({id:'s/q1',payload:{mode:'choice',answer:'b',correct:false}});
 const html=answerPanel(questions[0],s,p);
 assert.match(html,/class="option correct"/);assert.match(html,/class="option selected  wrong"/);
 assert.match(html,/aria-label="A · 答案 · 正確答案"/);assert.match(html,/aria-label="B · 錯項 · 你的答案，答錯"/);
 assert.doesNotMatch(html,/<small class="status">|<div class="verdict/);assert.match(html,/先看這題答案/);assert.doesNotMatch(html,/data-action="skip"/);
});
