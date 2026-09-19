import test from 'node:test';
import assert from 'node:assert/strict';
import {queue, available, quickCards, weakness, quickScopeKey} from '../src/domain/queue.mjs';
const q=(id,essays=['a'],extra={})=>({id,memoryId:id,essayIds:essays,ability:'vocabulary',status:'reviewed',active:true,...extra});
const state={memories:{},favorites:{}};
test('balanced queue distributes 7/7/6 with stable rotation and no variants or unselected essays',()=>{
 const bank=Array.from({length:12},(_,i)=>['a','b','c'].map(e=>q(e+i,[e]))).flat();
 bank.push(q('variant',['a'],{memoryId:'a0'}),q('outside',['d']),q('cross',['a','d']),q('draft',['a'],{status:'draft'}));
 const list=queue(bank,{essayIds:['a','b','c'],count:20,rotation:0},state);
 assert.deepEqual(['a','b','c'].map(e=>list.filter(x=>x.essayIds[0]===e).length),[7,7,6]);
 assert.equal(new Set(list.map(x=>x.memoryId)).size,20);
 assert.ok(!list.some(x=>['outside','cross','draft'].includes(x.id)));
 assert.deepEqual(queue(bank,{essayIds:['a','b','c'],count:2,rotation:1},state).map(x=>x.essayIds[0]),['b','c']);
});
test('wrong-only never fills with unseen questions and cross-essay needs every selected essay',()=>{
 const bank=[q('a'),q('b'),q('x',['a','b'])];
 assert.deepEqual(queue(bank,{essayIds:['a'],count:10,scope:'wrong'},state),[]);
 assert.equal(available(bank,{essayIds:['a']}).length,2);
 const s={memories:{a:{correct:false}},favorites:{a:{saved:true},b:{saved:true}}};
 assert.deepEqual(quickCards(bank,{essayIds:['a'],scope:'both'},s).map(x=>x.id),['a','b']);
 assert.equal(weakness(bank,s,'a','theme').status,'unavailable');
 assert.equal(weakness(bank,state,'a','vocabulary').status,'unassessed');
});

test('quick review cache invalidates for ability, appendix and personal scope changes',()=>{
 const base={essayIds:['a'],ability:'',appendix:false,quickScope:'both'};
 for(const change of [{ability:'theme'},{appendix:true},{quickScope:'saved'},{essayIds:['b']}]) assert.notEqual(quickScopeKey(base),quickScopeKey({...base,...change}));
 assert.equal(quickScopeKey({...base,essayIds:['a','b']}),quickScopeKey({...base,essayIds:['b','a']}));
});

test('standalone appendix concepts respect opt-in and enter balanced or appendix-only practice',()=>{
 const bank=[q('a'),q('outside',['b']),q('appendix',[],{ability:'technique',tags:['appendix']}),q('bound',['b'],{tags:['appendix']})];
 assert.deepEqual(queue(bank,{essayIds:['a'],count:10},state).map(x=>x.id),['a']);
 assert.deepEqual(queue(bank,{essayIds:['a'],count:10,appendix:true},state).map(x=>x.id),['a','appendix']);
 assert.deepEqual(queue(bank,{essayIds:[],count:10,appendix:true},state).map(x=>x.id),['appendix']);
 assert.deepEqual(queue(bank,{essayIds:['a'],count:10,appendix:true,ability:'vocabulary'},state).map(x=>x.id),['a']);
 assert.deepEqual(queue(bank,{essayIds:[],count:10,appendix:true,scope:'wrong'},state),[]);
 assert.deepEqual(queue(bank,{essayIds:[],count:10,appendix:true,scope:'wrong'},{memories:{appendix:{correct:false}},favorites:{}}).map(x=>x.id),['appendix']);
});
