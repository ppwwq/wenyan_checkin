import test from 'node:test';
import assert from 'node:assert/strict';
import {project} from '../src/domain/review.mjs';
import {queue} from '../src/domain/queue.mjs';
import {mistakeOptions,mistakesView} from '../src/features/mistakes.mjs';
import {libraryView} from '../src/features/library.mjs';

const question=(id,essayIds=['a'],extra={})=>({id,memoryId:id,essayIds,ability:'vocabulary',status:'reviewed',active:true,stem:'題目 '+id,choices:[],...extra});
const bank={essays:[{id:'a',title:'甲篇'},{id:'b',title:'乙篇'}],questions:[question('wrong'),question('sibling',['a'],{memoryId:'wrong'}),question('outside',['b']),question('appendix',[],{tags:['appendix'],ability:'technique'}),question('held',['a'],{active:false}),question('unseen')]};
const attempt=(id,correct=false,time='2026-09-24T01:00:00Z',extra={})=>({id:id+time,type:'attempt',createdAt:time,payload:{questionId:id,memoryId:id,question:bank.questions.find(q=>q.id===id),submittedAt:time,mode:'choice',answer:'b',correct,trainingPolicy:2,...extra}});
const state=(events=[],corrections=[])=>project(events,'2026-09-24',corrections);

test('mistake entry covers actual failed questions across chapters and appendix, without changing training settings',()=>{
 const s=state(['wrong','outside','appendix','held'].map(id=>attempt(id)));
 s.settings.training={chapters:{a:['theme']},dailyCount:20,appendix:false,retry:false};
 const before=structuredClone(s);
 const opts=mistakeOptions(bank,s);
 assert.deepEqual(queue(bank.questions,opts,s).map(q=>q.id),['wrong','outside','appendix']);
 assert.deepEqual(s,before);
 const html=mistakesView(bank,s);
 assert.match(html,/<h1>錯題複習<\/h1>/);
 assert.match(html,/可重練 3 道錯題/);
 assert.match(html,/本組 3 題/);
 assert.doesNotMatch(html,/題目 sibling|題目 unseen|題目 held|選幾篇，一起練/);
 assert.match(html,/data-action="mistake-start" data-id="outside"/);
});

test('wrong-only library uses exact question history and displays the filtered count',()=>{
 const s=state([attempt('wrong')]),opts={essayIds:['a'],count:20,scope:'wrong'};
 assert.deepEqual(queue(bank.questions,opts,s).map(q=>q.id),['wrong']);
 const html=libraryView(bank,s,opts);
 assert.match(html,/可用 1 題/);
 assert.match(html,/開始錯題複習/);
});

test('mistake entry keeps same-day corrections, clears next-day success, and respects teacher corrections',()=>{
 const wrong=attempt('wrong');
 const sameDay=state([wrong,attempt('wrong',true,'2026-09-24T02:00:00Z')]);
 assert.deepEqual(mistakeOptions(bank,sameDay).questionIds,['wrong']);
 const nextDay=state([wrong,attempt('wrong',true,'2026-09-25T02:00:00Z')]);
 assert.deepEqual(mistakeOptions(bank,nextDay).questionIds,[]);
 const corrected=state([wrong],[{attemptId:wrong.id,correct:true,createdAt:'2026-09-24T03:00:00Z'}]);
 assert.deepEqual(mistakeOptions(bank,corrected).questionIds,[]);
 assert.equal(corrected.attempts[0].payload.correct,false);
});

test('empty, withdrawn and single-question cases cannot start unrelated practice',()=>{
 for(const s of [state(),state([attempt('held')])]){
  const html=mistakesView(bank,s);
  assert.match(html,/目前沒有可重練的錯題/);
  assert.doesNotMatch(html,/data-action="mistake-start"/);
 }
 const s=state([attempt('wrong'),attempt('outside')]);
 assert.deepEqual(queue(bank.questions,mistakeOptions(bank,s,'outside'),s).map(q=>q.id),['outside']);
 assert.deepEqual(queue(bank.questions,mistakeOptions(bank,s,'unseen'),s),[]);
});
