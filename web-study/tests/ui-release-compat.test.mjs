import test from 'node:test';
import assert from 'node:assert/strict';
import {validTraining,trainingOptions,dailyQuestions,retryQuestions} from '../src/domain/training.mjs';
import {project} from '../src/domain/review.mjs';
const plan={version:1,chapters:{e:['vocabulary']},dailyCount:10,retry:true,appendix:false,vocabularyTyping:true,studyPool:'basic'};
const day='2026-10-28',at=day+'T01:00:00Z';
const q={id:'legacy',memoryId:'legacy',essayIds:['e'],ability:'vocabulary',status:'reviewed',version:1,active:true};
const settings={id:'settings',type:'settings',createdAt:at,payload:{training:plan}};
test('new pool selection and existing vocabulary typing coexist and reject invalid pools',()=>{
 assert.equal(validTraining(plan),true);assert.equal(validTraining({...plan,studyPool:'unknown'}),false);
 assert.equal(trainingOptions(plan).studyPool,'basic');assert.equal(trainingOptions(plan).vocabularyTyping,true);
});
test('production legacy questions stay drawable and wrong choices retain one same-day retry',()=>{
 const state=project([settings],day);assert.deepEqual(dailyQuestions([q],state,day).map(q=>q.id),['legacy']);
 const wrong={id:'wrong',type:'attempt',createdAt:at,payload:{questionId:q.id,memoryId:q.id,submittedAt:at,mode:'choice',correct:false,trainingPolicy:2}};
 assert.deepEqual(retryQuestions([q],project([settings,wrong],day),day).map(q=>q.id),['legacy']);
 const retried={...wrong,id:'retry',createdAt:day+'T02:00:00Z',payload:{...wrong.payload,submittedAt:day+'T02:00:00Z'}};
 assert.deepEqual(retryQuestions([q],project([settings,wrong,retried],day),day),[]);
});
