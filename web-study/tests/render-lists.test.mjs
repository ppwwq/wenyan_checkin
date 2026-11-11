import test from 'node:test';
import assert from 'node:assert/strict';
import {historyView} from '../src/features/records.mjs';
import {writtenView} from '../src/features/written.mjs';
import {project} from '../src/domain/review.mjs';
import {libraryView} from '../src/features/library.mjs';
import {writtenResult} from '../src/domain/written.mjs';

test('large choice history renders forty rows at a time and retains every older answer',()=>{
 const question={id:'q',memoryId:'m',essayIds:['a'],choices:[{id:'a',text:'參考'}],quote:'原文',stem:'題目'};
 const events=Array.from({length:85},(_,i)=>({id:'a'+i,type:'attempt',createdAt:new Date(1000000+i*1000).toISOString(),payload:{questionId:'q',memoryId:'m',question:{...question,stem:'題目'+i},mode:'choice',answer:'a',correct:true,submittedAt:new Date(1000000+i*1000).toISOString()}}));
 const state=project(events),bank={essays:[{id:'a',title:'篇章'}],questions:[question]};
 const first=historyView(bank,state,[],{choice:0});
 const second=historyView(bank,state,[],{choice:1});
 const last=historyView(bank,state,[],{choice:2});
 assert.equal((first.match(/<article class="saved-row">/g)||[]).length,40);
 assert.match(first,/<h3>題目84<\/h3>/);
 assert.doesNotMatch(first,/<h3>題目44<\/h3>/);
 assert.match(second,/<h3>題目44<\/h3>/);
 assert.match(last,/<h3>題目0<\/h3>/);
 assert.equal((last.match(/<article class="saved-row">/g)||[]).length,5);
 assert.match(first,/共 85/);
});

test('written list pagination preserves the filtered total and clamps an old page after filtering',()=>{
 const items=Array.from({length:85},(_,i)=>({id:'written:page.'+i,kind:'translation',origin:'authored-translation',essayId:'a',title:'題目'+i,prompt:'翻譯',context:'原文'+i,reference:'答案',accepted:[],points:[]}));
 const bank={questions:[],essays:[{id:'a',title:'篇章'}]};
 const first=writtenView(items,bank,[],{}),next=writtenView(items,bank,[],{listPage:1});
 assert.equal((first.match(/data-action="written-open"/g)||[]).length,40);
 assert.match(first,/可選 85 個語境/);
 assert.doesNotMatch(first,/data-id="written:page.40"/);
 assert.match(next,/data-id="written:page.40"/);
 const filtered=writtenView(items.slice(0,2),bank,[],{listPage:8});
 assert.match(filtered,/data-id="written:page.0"/);
});

test('older written answers remain reachable without rendering the whole history',()=>{
 const item={id:'written:history',version:1,kind:'vocabulary',origin:'authored-basic',essayId:'a',prompt:'解釋',context:'原文',reference:'意思',accepted:['意思'],points:[],rubric:'核對',sourceLabel:'測試'};
 const events=Array.from({length:85},(_,i)=>({id:'written-'+i,type:'written',createdAt:new Date(1000000+i*1000).toISOString(),payload:{action:'submit',itemId:item.id,item,answer:'作答'+i,result:writtenResult(item,'作答'+i)}}));
 const state=project(events),bank={questions:[],essays:[{id:'a',title:'篇章'}]};
 const first=historyView(bank,state,[item]),last=historyView(bank,state,[item],{written:2});
 assert.equal((first.match(/<article class="saved-row">/g)||[]).length,40);
 assert.doesNotMatch(first,/你的答案：作答0<\/p>/);
 assert.match(last,/你的答案：作答0<\/p>/);
});

test('cached catalogue counts change when questions are revised or withdrawn',()=>{
 const q={id:'q',version:1,memoryId:'m',essayIds:['a'],ability:'vocabulary',status:'reviewed',active:true,stem:'詞義',choices:[{id:'a',text:'意思'}],answerId:'a'};
 const bank={questions:[q],essays:[{id:'a',title:'篇章'}]},state=project([]),options={essayIds:['a'],count:1,scope:'all'};
 assert.match(libraryView(bank,state,options),/語境詞義/);
 Object.assign(q,{version:2,ability:'technique',assessmentType:'比喻',stem:'修辭手法'});
 assert.match(libraryView(bank,state,options),/value="比喻"/);
 q.active=false;
 assert.match(libraryView(bank,state,options),/全部來源（0）/);
});
