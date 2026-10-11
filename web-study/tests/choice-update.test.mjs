import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceWithReplacement,sessionProgress} from '../src/domain/replacement.mjs';
import {practicedIds,questionProgress} from '../src/domain/choice-progress.mjs';
import {project,hkDay} from '../src/domain/review.mjs';
import {refreshTrainingSession} from '../src/domain/training.mjs';
import {queue,available,quickScopeKey} from '../src/domain/queue.mjs';
import {validateBackup} from '../src/storage/backup.mjs';
import {answerPanel,practiceView} from '../src/features/practice.mjs';
import {libraryView} from '../src/features/library.mjs';

const qs=Array.from({length:8},(_,i)=>({id:'q'+i,memoryId:'m'+i,version:1,essayIds:['e'],ability:'vocabulary',stem:'字義？',quote:'原句。',status:'reviewed',active:true,responseFormat:'single-choice',choices:[{id:'a',text:'甲',explanation:'依據'},{id:'b',text:'乙',explanation:'原因'}],answerId:'a'}));
const opts={essayIds:['e'],count:2,scope:'all'};
const make=()=>({id:'s',selection:{...opts},targetCount:2,skippedIds:[],kind:'extra',questions:structuredClone(qs.slice(0,2)),index:0,answers:{},drafts:{q0:'b'},mode:'choice',essayIds:['e'],completed:false,startedAt:new Date().toISOString()});
const event=(q,i,correct=false,mode='choice')=>({id:'a'+i,type:'attempt',createdAt:'2026-10-11T00:00:00Z',payload:{questionId:q.id,memoryId:q.memoryId,question:q,questionVersion:1,submittedAt:'2026-10-11T00:00:00Z',day:'2026-10-11',sessionId:'s',mode,answer:'b',correct}});
const state=()=>project([]);
test('quick review caches are scoped to the selected source filter',()=>{
 assert.notEqual(quickScopeKey(opts),quickScopeKey({...opts,sourceKind:'dse-original'}));
 assert.equal(quickScopeKey(opts),quickScopeKey({...opts,sourceKind:'all'}));
});

test('skip replaces immediately, retains draft, does not count, and two answers meet target',()=>{
 const s=make(),p=state();assert.ok(advanceWithReplacement(s,p,qs,true));
 assert.equal(s.questions[0].id,'q2');assert.deepEqual(s.skippedIds,['q0']);assert.equal(s.drafts.q0,'b');assert.equal(p.attempts.length,0);assert.deepEqual(sessionProgress(s,p),{done:0,target:2,remaining:2});
 s.answers.q2='a1';assert.ok(advanceWithReplacement(s,p,qs));assert.equal(s.questions[s.index].id,'q1');
 s.answers.q1='a2';assert.ok(advanceWithReplacement(s,p,qs));assert.equal(s.completed,true);assert.equal(sessionProgress(s,p).done,2);
});
test('skipping the whole limited pool ends below target without looping or manufacturing attempts',()=>{
 const s=make(),p=state();for(let i=0;i<8;i++)assert.ok(advanceWithReplacement(s,p,qs,true));
 assert.equal(s.completed,true);assert.equal(s.questions.length,0);assert.equal(s.skippedIds.length,8);assert.equal(p.attempts.length,0);
 assert.match(practiceView({essays:[]},s,p),/本組已練 0 題/);assert.equal(advanceWithReplacement(s,p,qs,true),false);
});
test('replacement respects selected IDs, source, ability, chapters and both deduplication keys',()=>{
 const s=make(),p=state();s.selection={...opts,questionIds:['q0','q1','q2','q3','q4','q5'],sourceKind:'dse-original',ability:'vocabulary'};
 const pool=structuredClone(qs);for(const q of pool)q.provenance={kind:'dse-original'};
 pool[2].memoryId='m0';pool[0].practiceGroup='same';s.questions[0].practiceGroup='same';pool[3].practiceGroup='same';pool[4].essayIds=['outside'];pool[5].ability='meaning';
 advanceWithReplacement(s,p,pool,true);assert.deepEqual(s.questions.map(q=>q.id),['q1']);assert.equal(s.completed,false);
});
test('skip state survives backup and further skips never reintroduce the skipped question',()=>{
 const s=make(),p=state();advanceWithReplacement(s,p,qs,true);
 const restored=validateBackup({format:'wenyan-backup-v1',userId:'u',events:[{id:'save',type:'session',createdAt:s.startedAt,payload:{session:s}}]},'u')[0].payload.session;
 advanceWithReplacement(restored,p,qs,true);assert.deepEqual(restored.skippedIds,['q0','q2']);assert.equal(restored.questions[0].id,'q3');assert.equal(restored.drafts.q0,'b');
});
test('training refresh excludes skipped variants and keeps answered snapshots',()=>{
 const s=make(),p=state(),pool=structuredClone(qs);s.kind='daily';s.skippedIds=['q3'];pool[4].memoryId='m3';pool[3].practiceGroup='pair';pool[5].practiceGroup='pair';
 p.settings.training={version:1,chapters:{e:['vocabulary']},dailyCount:6,appendix:false,retry:true};s.answers.q0='a0';
 const updated=refreshTrainingSession(pool,p,s,hkDay());assert.ok(updated.questions.some(q=>q.id==='q0'));assert.ok(updated.questions.every(q=>!['q3','q4','q5'].includes(q.id)));
});
test('progress deduplicates question IDs, counts wrong answers, and waits for legacy self-assessment',()=>{
 const events=[event(qs[0],0),event(qs[0],1,true),event(qs[1],2,null,'typing')];
 let p=project(events);assert.deepEqual(questionProgress([...qs,qs[0]],practicedIds(p)),{total:8,done:1,remaining:7});
 p=project([...events,{id:'assess',type:'assessment',createdAt:'2026-10-11T00:00:01Z',payload:{attemptId:'a2',correct:false}}]);assert.equal(questionProgress(qs,practicedIds(p)).done,2);
 const html=libraryView({questions:qs,essays:[{id:'e',title:'篇章'}]},p,opts);assert.match(html,/共 8 題 · 已練 2 題 · 未練 6 題/);
});
test('only the question quotation is shown before answering; related original, translation and knowledge follow submission',()=>{
 const q={...qs[0],quote:'(1) 原句。\n(2) 另一句。',learning:{passages:[{title:'篇章',original:'完整原句。另一句。',translation:'這是完整語譯。'}],knowledge:[{title:'聯次',text:'第5–6句是頸聯。'}]}};
 const s={...make(),questions:[q]},p=state(),bank={essays:[{id:'e',title:'篇章'}]};
 const before=practiceView(bank,s,p);assert.match(before,/\(1\) 原句/);assert.doesNotMatch(before,/完整原句/);assert.doesNotMatch(before,/這是完整語譯|第5–6句/);
 const attempt=event(q,0);s.answers.q0=attempt.id;p.attempts=[attempt];const after=answerPanel(q,s,p);assert.match(after,/完整原句/);assert.match(after,/全句語譯/);assert.match(after,/這是完整語譯/);assert.match(after,/第5–6句是頸聯/);
});
const bank=JSON.parse(readFileSync(new URL('../content/bank.json',import.meta.url)));
test('release contains 27 traceable original choice items with unchanged option order',()=>{
 const originals=bank.questions.filter(q=>q.provenance?.kind==='dse-original');assert.equal(originals.length,27);
 assert.deepEqual([...new Set(originals.map(q=>q.choices.length))].sort(),[2,3,4]);
 for(const q of originals){assert.equal(q.responseFormat,'single-choice');assert.equal(q.answerId.toUpperCase(),q.provenance.officialAnswer);assert.equal(q.source.sha256.length,64);assert.deepEqual(queue([q],{essayIds:q.essayIds,count:1},state(),hkDay(),()=>0)[0].choices,q.choices);}
 assert.equal(available(bank.questions,{essayIds:bank.essays.map(e=>e.id),sourceKind:'dse-original'}).length,27);
});
test('every vocabulary item has full translation and no original-source mutation',()=>{
 const vocab=bank.questions.filter(q=>q.ability==='vocabulary');assert.ok(vocab.length>1000);
 for(const q of vocab){assert.ok(q.learning?.passages.length,q.id);assert.ok(q.learning.passages.every(p=>p.original&&p.translation&&p.sourcePath),q.id);}
 const multi=bank.questions.find(q=>q.id==='dse-2025-1a-2');assert.equal(multi.learning.passages.length,4);assert.ok(multi.learning.passages.some(p=>p.original.includes('開張聖聽')));
});

 test('combination vocabulary answer is not presented as the definition of a word',()=>{
 const q=bank.questions.find(q=>q.id==='dse-2025-1a-2'),s=make(),p=state(),a=event(q,0);s.answers[q.id]=a.id;p.attempts=[a];
 const html=answerPanel(q,s,p);assert.match(html,/本題選項/);assert.doesNotMatch(html,/「以」在這裏是「/);assert.match(html,/原卷 PDF 第 1 頁/);
 });
