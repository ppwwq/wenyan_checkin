import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {choiceCatalogue} from '../scripts/choice-catalogue.mjs';
import {queue} from '../src/domain/queue.mjs';
import {project} from '../src/domain/review.mjs';
import {libraryView} from '../src/features/library.mjs';
import {refreshTrainingSession} from '../src/domain/training.mjs';
import {mergeAuthoredBatches} from '../src/domain/authored-expansion.mjs';

const bank=JSON.parse(readFileSync(new URL('../content/bank.json',import.meta.url),'utf8'));

test('the choice inventory separates word form, word sense and the assessed rhetorical device',()=>{
 const ids=['full-c-15-04-00-04','full-d-00-00','full-d-01-01','dse-2025-1a-2','dse-2023-1a-3'];
 const questions=ids.map(id=>bank.questions.find(q=>q.id===id));
 const records=choiceCatalogue([...questions,{id:'written',kind:'short-answer',prompt:'試分析。'}],bank.essays);
 assert.deepEqual(records.map(q=>q.id),ids);
 assert.deepEqual(records.map(q=>q.topic),['字形辨識','比喻','襯托','虛詞','句式與語法']);
 assert.equal(records[3].source,'DSE 真題');
 assert.doesNotMatch(JSON.stringify(records),/"(?:answerId|choices|explanation)":/);
});

test('the whole bank assigns every choice entry one countable topic and keeps the suspended item separate',()=>{
 const records=choiceCatalogue(bank.questions,bank.essays);
 assert.equal(records.length,bank.questions.length);
 assert.equal(new Set(records.map(q=>q.id)).size,records.length);
 assert.ok(records.every(q=>q.family&&q.topic));
 assert.equal(records.filter(q=>q.status==='已停用').length,1);
});

test('practice can combine a source and a fine-grained topic across the selected chapters',()=>{
 const options={essayIds:bank.essays.map(e=>e.id),count:20,choiceSource:'dse-original',choiceFamily:'字詞',choiceTopic:'虛詞'};
 const drawn=queue(bank.questions,options,project([]));
 assert.deepEqual(drawn.map(q=>q.id).sort(),['dse-2022-1a-2','dse-2025-1a-2','dse-2025-1a-3']);
 assert.match(libraryView(bank,project([]),options),/id="choiceSource"/);
 assert.match(libraryView(bank,project([]),options),/id="choiceTopic"/);
});

test('explicitly opening the complete pool includes old templates while the default pool omits them',()=>{
 const options={essayIds:bank.essays.map(e=>e.id),count:20,choiceSource:'existing',choiceFamily:'字詞',choiceTopic:'語境詞義'};
 const template=bank.questions.find(q=>q.id.startsWith('full-')&&q.ability==='vocabulary'&&q.active!==false&&q.assessmentType==='vocabulary-context');
 assert.ok(template);
 assert.equal(queue([template],options,project([])).length,0);
 assert.equal(queue([template],{...options,studyPool:'complete'},project([]))[0]?.id,template.id);
});

test('official reasoning questions stay under argumentation while remaining searchable by their assessed device',()=>{
 const ids=['dse-2021-1a-3','dse-2021-1a-5','dse-2024-1a-3-ii','dse-2025-1a-5'];
 const records=choiceCatalogue(ids.map(id=>bank.questions.find(q=>q.id===id)),bank.essays);
 assert.deepEqual(records.map(q=>q.topic),['論證與說明','論證與說明','論證與說明','體裁與聲律']);
 assert.ok(records.slice(0,2).every(q=>q.related.includes('比喻')));
});

test('a new account can start a classified practice round before setting a daily plan',()=>{
 const state=project([]);
 const selection={essayIds:bank.essays.map(e=>e.id),count:1,choiceSource:'dse-original',choiceFamily:'字詞',choiceTopic:'虛詞'};
 const questions=queue(bank.questions,selection,state);
 const round={id:'new-round',kind:'extra',selection,questions,answers:{},drafts:{},index:0,targetCount:1};
 const started=refreshTrainingSession(bank.questions,state,round);
 assert.equal(started.completed,false);
 assert.equal(started.questions[0]?.id,questions[0].id);
});

test('the public practice view lists actual source editions and fine topics with public counts',()=>{
 const batch=JSON.parse(readFileSync(new URL('../content/authored-expansion/v1.json',import.meta.url),'utf8'));
 const extra=mergeAuthoredBatches([batch],new Set(bank.questions.map(q=>q.id))).questions;
 const options={essayIds:bank.essays.map(e=>e.id),count:1};
 const html=libraryView({...bank,questions:[...bank.questions,...extra]},project([]),options);
 assert.match(html,/來源明細與分類表/);
 assert.match(html,/2024 年卷一甲部原卷 6 題/);
 assert.match(html,/自擬增補 v1 55 題/);
 assert.match(html,/手法附錄 128 題/);
 assert.match(html,/虛詞 3 · 語境詞義 2|語境詞義 2 · 虛詞 3/);
 assert.doesNotMatch(html,/其他本機原題|school-original/);
});
