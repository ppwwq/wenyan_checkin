import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {queue} from '../src/domain/queue.mjs';
import {project} from '../src/domain/review.mjs';
import {advanceWithReplacement} from '../src/domain/replacement.mjs';
import {learningView,questionMaterialView} from '../src/features/learning-context.mjs';

const bank=JSON.parse(readFileSync(new URL('../content/bank.json',import.meta.url),'utf8'));
const get=id=>{const q=bank.questions.find(q=>q.id===id);assert.ok(q,id);return q;};
const state=()=>project([],'2026-10-24');

test('reviewed bank supplies consistent corrected context across chapter boundaries',()=>{
 assert.equal(bank.selfStudyReviewSummary.reviewedQuestions,2010);
 const translations=new Map();
 const refs=['$[1].pages[2]','$[1].pages[4]','$[3].pages[1]','$[6].pages[4]','$[6].pages[5]','$[8].pages[5]','$[9].pages[3]'];
 for(const q of bank.questions.filter(q=>q.essayIds.length))for(const p of q.learning?.passages||[]){
  if(!refs.includes(p.sourcePath))continue;
  if(translations.has(p.sourcePath))assert.equal(p.translation,translations.get(p.sourcePath),q.id);
  else translations.set(p.sourcePath,p.translation);
 }
 assert.equal(translations.size,refs.length);
 assert.match(translations.get('$[9].pages[3]'),/這樣看來，六國/);
 assert.match(translations.get('$[8].pages[5]'),/外物的好壞或個人的得失/);
 const comparison=get('full-c-01-22-02-03');
 assert.match(comparison.quote,/事父母幾諫/);
 assert.match(comparison.quote,/指從此以往/);
 assert.doesNotMatch(comparison.quote,/義以為質|相如從/);
});

test('original short option sets still render with corrected authored rhyme explanation',()=>{
 const original=bank.questions.filter(q=>q.provenance?.kind==='dse-original');
 assert.equal(original.length,27);
 for(const q of original)assert.ok([2,3,4].includes(q.choices.length),q.id);
 const q=get('dse-2024-1a-2-ii');
 assert.deepEqual(q.choices.map(c=>c.text),['是','否']);
 assert.equal(q.answerId,'a');assert.match(q.explanation,/第4句/);
 assert.match(q.explanation,/心、臨、今、侵、吟/);
 assert.match(learningView(q),/編者補充/);
 const note=get('full-c-14-03-00-19');
 assert.match(learningView(note),/讀法與自查/);
 assert.doesNotMatch(questionMaterialView(note),/讀法與自查/);
});

test('real revised duplicate clusters yield only one item per practice round',()=>{
 const originals=bank.questions.filter(q=>q.provenance?.kind==='dse-original');
 const before=structuredClone(originals);
 const options={essayIds:bank.essays.map(e=>e.id),count:100,scope:'all'};
 const list=queue(bank.questions,options,state(),'2026-10-24',()=>0.25);
 assert.equal(list.length,100);
 const groups=list.map(q=>q.practiceGroup).filter(Boolean);
 assert.equal(groups.length,new Set(groups).size);
 assert.deepEqual(originals,before);
 const pair=[get('q-e14-exp-006'),get('full-c-14-06-01-02')];
 assert.equal(pair[0].practiceGroup,pair[1].practiceGroup);
 assert.equal(queue(pair,{essayIds:['essay-14'],count:20},state()).length,1);
});

test('skipping a reviewed item cannot replace it with a differently worded copy',()=>{
 const first=get('q-e14-exp-006'),same=get('full-c-14-06-01-02');
 const session={id:'isolated',questions:[structuredClone(first)],index:0,answers:{},
   selection:{essayIds:['essay-14'],count:1},targetCount:1};
 assert.equal(advanceWithReplacement(session,state(),[first,same],true),true);
 assert.equal(session.questions.length,0);
 assert.deepEqual(session.skippedIds,[first.id]);
 assert.equal(session.completed,true);
});
