import test from 'node:test';
import assert from 'node:assert/strict';
import { project, hkDay } from '../src/domain/review.mjs';
const attempt=(id,time,correct,mode='choice')=>({id,type:'attempt',createdAt:time,payload:{memoryId:'m',submittedAt:time,day:hkDay(time),correct,mode}});
test('first correct remains the observation after same-day mistakes and retries',()=>{
 const a=attempt('a','2026-09-19T01:00:00Z',true), b=attempt('b','2026-09-19T02:00:00Z',false);
 const state=project([a,b,a]);
 assert.equal(state.firsts.length,1); assert.equal(state.memories.m.correct,true);
 assert.equal(state.memories.m.due,undefined); assert.equal(state.memories.m.errors,0); assert.equal(state.attempts.length,2);
});
test('wrong then same-day correct completes reminder without moving next day review',()=>{
 const state=project([attempt('a','2026-09-19T01:00:00Z',false),attempt('b','2026-09-19T02:00:00Z',true)],'2026-09-19');
 assert.equal(state.memories.m.correct,false); assert.equal(state.memories.m.due,'2026-09-20');
 assert.equal(state.memories.m.errors,1); assert.equal(state.memories.m.againAt,null);
});
test('Hong Kong midnight and early practice do not shift an existing review',()=>{
 const state=project([attempt('a','2026-09-19T15:59:59Z',false),attempt('b','2026-09-19T16:00:00Z',true),attempt('c','2026-09-20T16:00:00Z',true)]);
 assert.equal(state.firsts.length,3); assert.equal(state.memories.m.due,'2026-09-22'); assert.equal(state.memories.m.interval,2);
});
test('typing reserves submission day and delayed self-check cannot overwrite a newer first',()=>{
 const state=project([attempt('a','2026-09-19T01:00:00Z',null,'typing'),attempt('b','2026-09-19T02:00:00Z',true),attempt('c','2026-09-20T02:00:00Z',true),{id:'s',type:'assessment',createdAt:'2026-09-21T00:00:00Z',payload:{attemptId:'a',correct:false}}]);
 assert.equal(state.firsts[0].id,'a'); assert.equal(state.firsts[0].correct,false);
 assert.equal(state.memories.m.day,'2026-09-20'); assert.equal(state.memories.m.due,'2026-09-22');
});

test('same-millisecond session writes restore the highest revision rather than random UUID order',()=>{
 const events=[{id:'z',type:'session',createdAt:'2026-09-19T00:00:00Z',payload:{session:{id:'s',revision:1,index:0}}},{id:'a',type:'session',createdAt:'2026-09-19T00:00:00Z',payload:{session:{id:'s',revision:2,index:1}}}];
 assert.equal(project(events).sessions.s.index,1);
});
test('due intervals extend to the approved 90-day cap and a lapse resets to tomorrow',()=>{
 const events=[attempt('0','2026-01-01T00:00:00Z',false)];
 const dates=['2026-01-02','2026-01-04','2026-01-08','2026-01-15','2026-01-30','2026-03-01','2026-04-30','2026-07-29'];
 dates.forEach((d,i)=>events.push(attempt(String(i+1),d+'T00:00:00Z',true)));
 let m=project(events).memories.m;assert.equal(m.interval,90);assert.equal(m.due,'2026-10-27');
 events.push(attempt('lapse','2026-07-30T00:00:00Z',false));m=project(events).memories.m;assert.equal(m.due,'2026-07-31');assert.equal(m.errors,2);assert.equal(m.interval,1);
});
test('a new pending typing first keeps the previous valid wrong observation and schedule',()=>{
 const state=project([attempt('old','2026-09-19T01:00:00Z',false),attempt('pending','2026-09-20T01:00:00Z',null,'typing')]);
 const m=state.memories.m;
 assert.equal(m.correct,false);assert.equal(m.day,'2026-09-19');assert.equal(m.due,'2026-09-20');assert.equal(m.interval,1);assert.equal(m.errors,1);
 assert.equal(m.pending,true);assert.equal(m.pendingAttempt.id,'pending');assert.equal(m.pendingAttempt.day,'2026-09-20');
});
test('a new pending typing first keeps previous valid correct status and interval',()=>{
 const state=project([attempt('wrong','2026-09-18T01:00:00Z',false),attempt('correct','2026-09-19T01:00:00Z',true),attempt('pending','2026-09-20T01:00:00Z',null,'typing')]);
 const m=state.memories.m;
 assert.equal(m.correct,true);assert.equal(m.day,'2026-09-19');assert.equal(m.due,'2026-09-21');assert.equal(m.interval,2);assert.equal(m.reviews,2);
 assert.equal(m.pending,true);assert.equal(m.pendingAttempt.id,'pending');
});
