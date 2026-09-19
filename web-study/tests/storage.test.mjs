import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBackup} from '../src/storage/repository.mjs';
import {project} from '../src/domain/review.mjs';
import {queue,weakness,quickCards} from '../src/domain/queue.mjs';
test('backup cannot cross account boundary and duplicates are merged by stable event id',()=>{
 const e={id:'x',type:'favorite',createdAt:'2026-09-19T00:00:00Z',payload:{questionId:'q',saved:true}},data={format:'wenyan-backup-v1',userId:'A',events:[e,e]};
 assert.throws(()=>validateBackup(data,'B'),/另一個帳號/);assert.equal(validateBackup(data,'A').length,1);
});
test('pending typing is visibly pending, never an incorrect answer or wrong-only question',()=>{
 const q={id:'q',memoryId:'m',essayIds:['a'],ability:'meaning',status:'reviewed'};
 const state=project([{id:'a',type:'attempt',createdAt:'2026-09-19T00:00:00Z',payload:{memoryId:'m',submittedAt:'2026-09-19T00:00:00Z',mode:'typing',correct:null}}]);
 assert.equal(weakness([q],state,'a','meaning').pending,1);
 assert.equal(weakness([q],state,'a','meaning').weak,0);
 assert.equal(weakness([q],state,'a','meaning').status,'unassessed');
 assert.equal(weakness([q],state,'a','meaning').studied,0);
 assert.deepEqual(queue([q],{essayIds:['a'],count:10,scope:'wrong'},state),[]);
});
test('quick-review browse events never generate first observations or change schedules',()=>{
 const state=project([{id:'b',type:'browse',createdAt:'2026-09-19T00:00:00Z',payload:{questionId:'q',version:1}}]);
 assert.equal(state.firsts.length,0);assert.deepEqual(state.memories,{});assert.equal(state.browsed.q,'2026-09-19T00:00:00Z');
});

