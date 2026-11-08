import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterWritten,validWrittenItem,writtenItems,writtenResult} from '../src/domain/written.mjs';
import {writtenView} from '../src/features/written.mjs';
import {libraryView} from '../src/features/library.mjs';
import {project} from '../src/domain/review.mjs';

const read=name=>JSON.parse(readFileSync(new URL('../content/'+name,import.meta.url),'utf8'));
const bank=read('bank.json');

test('the source-checked DSE vocabulary supplement is available through the written practice filter',()=>{
 const items=writtenItems(read('written-practice.json'),bank);
 const official=filterWritten(items,{origin:'official-original',kind:'vocabulary'});
 assert.equal(official.length,24);
 assert.equal(new Set(official.map(item=>item.id)).size,official.length);
 assert.ok(official.every(validWrittenItem));
 const item=official.find(q=>q.id==='written:official.2018.1-i');
 assert.equal(item.context,'今子有大樹，患其無用。');
 assert.equal(item.reference,'擔憂');
 const practice=writtenView(items,bank,[],{itemId:item.id});
 assert.match(practice,/DSE 真題/);
 assert.match(practice,/id="written-answer"/);
 assert.doesNotMatch(practice,/擔憂/);
});

test('the private integration index is offered only when the local catalogue is present',()=>{
 const state=project([]);
 const options={essayIds:[],count:10,scope:'all'};
 assert.doesNotMatch(libraryView(bank,state,options),/local-private\/integration-audit\/index\.html/);
 assert.match(libraryView({...bank,localIntegrationAvailable:true},state,options),/local-private\/integration-audit\/index\.html/);
});

test('DSE written analysis retains the original marks and keeps the reference behind self-review',()=>{
 const items=writtenItems(read('written-practice.json'),bank);
 const official=filterWritten(items,{origin:'official-original',kind:'short-answer'});
 assert.equal(official.length,26);
 assert.ok(official.every(validWrittenItem));
 const item=official.find(q=>q.id==='written:official.2019.4-ii');
 assert.equal(item.source.marks,2);
 assert.match(writtenView(items,bank,[],{kind:'short-answer',origin:'official-original'}),/短答與分析/);
 assert.doesNotMatch(writtenView(items,bank,[],{itemId:item.id}),/清泉石上流/);
 assert.match(writtenView(items,bank,[],{itemId:item.id,revealed:true}),/清泉石上流/);
 assert.equal(writtenResult(item,item.reference).status,'review');
});
