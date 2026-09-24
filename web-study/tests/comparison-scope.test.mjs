import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {available,queue} from '../src/domain/queue.mjs';
import {answerPanel,practiceView} from '../src/features/practice.mjs';

const bank=JSON.parse(readFileSync(new URL('../content/bank.json',import.meta.url),'utf8'));
const state={memories:{},favorites:{}};
const wordComparisons=[
 ['confusable-gui-lunyu-yueyang',['essay-01','essay-09']],
 ['confusable-gui-lunyu-shanju',['essay-01','essay-11']],
 ['confusable-gui-yueyang-shanju',['essay-09','essay-11']],
 ['full-c-01-22-02-02',['essay-01','essay-07']],
 ['full-c-01-22-02-03',['essay-01','essay-05']],
 ['full-c-01-23-02-01',['essay-01','essay-07']],
 ['full-c-01-23-02-02',['essay-01','essay-09']],
 ['full-c-01-23-02-03',['essay-01','essay-02']],
];

test('existing cross-essay word questions enter the pool only when both related essays are selected',()=>{
 for(const [id,essays] of wordComparisons){
  const question=bank.questions.find(q=>q.id===id);
  assert.ok(question,id);
  assert.deepEqual(question.essayIds,essays,id);
  for(const essayIds of [[],[essays[0]],[essays[1]],[essays[0],'essay-16']]){
   assert.ok(!available(bank.questions,{essayIds}).some(q=>q.id===id),`${id}: ${essayIds}`);
  }
  for(const essayIds of [essays,[...essays].reverse(),[...essays,'essay-16']]){
   assert.ok(available(bank.questions,{essayIds}).some(q=>q.id===id),`${id}: ${essayIds}`);
  }
 }
});

test('confusable reading content becomes distinct, answerable cross-essay questions in normal practice',()=>{
 const questions=bank.questions.filter(q=>q.tags?.includes('confusable'));
 assert.equal(questions.length,3);
 for(const question of questions){
  assert.equal(question.comparisonGroupId,'compare-1');
  assert.equal(question.essayIds.length,2);
  assert.equal(question.responseFormat,'single-choice');
  assert.equal(question.ability,'vocabulary');
  assert.equal(question.relatedSources.length,2);
  assert.deepEqual([...new Set(question.relatedSources.map(s=>s.essayId))].sort(),question.essayIds);
  assert.ok(question.relatedSources.every(s=>s.pdfPage&&s.blockPath&&s.meaning));
  const group=bank.comparisons.find(g=>g.id===question.comparisonGroupId);
  assert.ok(!group.items.some(i=>i.questionId===question.id),'Existing reading cards keep their own question links');
  const list=queue(bank.questions,{essayIds:question.essayIds,count:20},state);
  assert.ok(list.some(q=>q.id===question.id),'New cross-essay content reaches a normal 20-question session');
  assert.equal(list.filter(q=>q.id===question.id).length,1);
  const session={id:'s',questions:[question],index:0,answers:{},drafts:{},mode:'choice'};
  const progress={...state,attempts:[],firsts:[],assessments:new Map()};
  const html=practiceView(bank,session,progress);
  assert.ok(html.includes(question.stem));
  assert.equal((html.match(/data-action="choose"/g)||[]).length,4);
  const feedback=answerPanel(question,{...session,answers:{[question.id]:'attempt'}},{...progress,
   attempts:[{id:'attempt',payload:{answer:question.answerId,correct:true,mode:'choice'}}]});
  const explanationText=[...feedback.matchAll(/<span class="annotated-copy">([\s\S]*?)<\/span>/g)].map(m=>m[1].replace(/<[^>]*>/g,'')).join('');
  assert.ok(explanationText.includes(question.explanation));
  assert.ok(feedback.includes('這次答對了'));
 }
});

test('eligible word comparisons reach actual practice and still obey ability, subset and wrong-only filters',()=>{
 for(const [id,essayIds] of wordComparisons){
  const question=bank.questions.find(q=>q.id===id);
  const options={essayIds,count:20,scope:'wrong'};
  const wrong={memories:{[question.memoryId]:{correct:false}},favorites:{},attempts:[{id:'wrong/'+id,payload:{questionId:id,memoryId:question.memoryId,submittedAt:'2026-09-24T01:00:00Z',mode:'choice',correct:false}}]};
  assert.deepEqual(queue(bank.questions,options,wrong).map(q=>q.id),[id]);
  assert.deepEqual(queue(bank.questions,{...options,essayIds:[essayIds[0]]},wrong),[]);
  assert.deepEqual(queue(bank.questions,{...options,essayIds:[essayIds[1]]},wrong),[]);
  assert.deepEqual(queue(bank.questions,options,state),[]);
  assert.deepEqual(queue(bank.questions,{...options,ability:'technique'},wrong),[]);
  assert.deepEqual(queue(bank.questions,{...options,questionIds:[]},wrong),[]);
  assert.deepEqual(queue(bank.questions,{...options,scope:'all',questionIds:[id]},state).map(q=>q.id),[id]);
 }
});

test('all released cross-essay questions require every related essay, including three-essay comparisons',()=>{
 const comparisons=bank.questions.filter(q=>q.essayIds.length>1&&q.status==='reviewed'&&q.active!==false);
 assert.ok(comparisons.length>0);
 for(const question of comparisons){
  for(const omitted of question.essayIds){
   const essayIds=bank.essays.map(e=>e.id).filter(id=>id!==omitted);
   assert.ok(!available(bank.questions,{essayIds}).some(q=>q.id===question.id),`${question.id}: missing ${omitted}`);
  }
  assert.ok(available(bank.questions,{essayIds:question.essayIds}).some(q=>q.id===question.id),question.id);
 }
});
