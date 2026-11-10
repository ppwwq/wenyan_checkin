import test from 'node:test';
import assert from 'node:assert/strict';
import {filterWritten,writtenResult} from '../src/domain/written.mjs';
import * as records from '../src/features/records.mjs';
import {project} from '../src/domain/review.mjs';
const bank={essays:[{id:'essay-01',title:'論仁'},{id:'essay-02',title:'魚我所欲也'}],questions:[]};
const item={id:'written:a',version:1,kind:'vocabulary',origin:'authored-basic',essayId:'essay-01',prompt:'解釋習',target:'習',context:'學而時習之',reference:'溫習',accepted:['溫習'],points:[],rubric:'按語境',sourceLabel:'測試'};
const second={...item,id:'written:b',essayId:'essay-02'};
const submit=(id,i,answer,time)=>({id,type:'written',createdAt:time,payload:{action:'submit',itemId:i.id,item:i,answer,result:writtenResult(i,answer)}});
const first=submit('a',item,'不知道','2026-11-04T01:00:00Z');
const wrong={id:'self',type:'written',createdAt:'2026-11-04T01:01:00Z',payload:{action:'self',attemptId:'a',outcome:'revisit',checked:true}};
test('typed mistakes include explicitly unknown answers by chapter, excluding pending and later mastered items',()=>{
 const pending=submit('b',second,'未核答案','2026-11-04T01:02:00Z');
 assert.deepEqual(filterWritten([item,second],{progress:'wrong'},[first,wrong,pending]).map(i=>i.id),['written:a']);
 assert.deepEqual(filterWritten([item,second],{progress:'wrong',essay:'essay-02'},[first,wrong,pending]),[]);
 const unassessedRetry=submit('retry',item,'我還未核對的新表述','2026-11-04T01:30:00Z');
 assert.deepEqual(filterWritten([item],{progress:'wrong'},[first,wrong,unassessedRetry]).map(i=>i.id),['written:a']);
 const mastered=submit('mastered',item,'溫習','2026-11-04T02:00:00Z');
 assert.deepEqual(filterWritten([item],{progress:'wrong'},[first,wrong,mastered]),[]);
});
test('records includes typed history and a grouped mistake entrance; review keeps answers hidden until opened',()=>{
 const state=project([first,wrong]);
 const html=records.historyView(bank,state,[item,second]);
 assert.match(html,/data-action="typing-mistakes"/);assert.match(html,/打字測義作答記錄/);assert.match(html,/不知道/);
 const review=records.writtenMistakesView(bank,state,[item,second]);
 assert.match(review,/論仁/);assert.match(review,/不知道/);assert.match(review,/溫習/);
 assert.match(review,/data-action="notebook-written-retry" data-id="written:a"/);
 assert.doesNotMatch(review,/data-action="typing-retry"/);
});
