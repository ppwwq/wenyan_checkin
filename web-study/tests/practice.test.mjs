import test from 'node:test';
import assert from 'node:assert/strict';
import {answerMode,answerPanel,practiceView} from '../src/features/practice.mjs';
import {savedView,quickView} from '../src/features/records.mjs';
const q={id:'q',essayIds:['e'],ability:'meaning',stem:'兩句的意思有何關係？',quote:'',choices:['a','b','c','d'].map(id=>({id,text:id,explanation:'辨析'})),answerId:'a',responseFormat:'single-choice'};
const session={id:'s',mode:'mixed',index:2,questions:[q,q,q],answers:{},drafts:{}};
const state={attempts:[],favorites:{},firsts:[],assessments:new Map()};
test('choice-specific tasks remain four-option questions in a mixed session',()=>{
 assert.equal(answerMode(q,session),'choice');
 const html=answerPanel(q,session,state);
 assert.equal((html.match(/data-action="choose"/g)||[]).length,4);
 assert.ok(!html.includes('<textarea'));
});
test('legacy session snapshots and submitted typing attempts retain original mode',()=>{
 const old={...q};delete old.responseFormat;
 assert.equal(answerMode(old,session),'typing');
 assert.equal(answerMode(q,session,{mode:'typing'}),'typing');
});
test('questions with in-stem evidence do not show an empty source panel',()=>{
 const html=practiceView({essays:[{id:'e',title:'指定篇章'}]},session,state);
 assert.ok(html.includes('question-only'));
 assert.ok(!html.includes('<blockquote>'));
 assert.ok(html.includes('指定篇章'));
 assert.ok(html.includes(q.stem));
 const quoted={...q,quote:'原文內容'};
 const withQuote=practiceView({essays:[{id:'e',title:'指定篇章'}]},{...session,questions:[q,q,quoted]},state);
 assert.ok(withQuote.includes('<blockquote>原文內容</blockquote>'));
});

test('saved and quick-review views retain context for questions without a separate quote',()=>{
 const question={...q,version:2,status:'reviewed',active:true,source:{pdfPage:1}};
 const bank={version:'new',questions:[question],essays:[{id:'e',title:'指定篇章'}]};
 const savedState={...state,favorites:{q:{saved:true,questionId:'q',version:1}}};
 const options={essayIds:['e']};
 const saved=savedView(bank,savedState,options);
 assert.ok(!saved.includes('此題目前不可用'));
 assert.ok(saved.includes('指定篇章'));
 assert.ok(saved.includes('題目已更新'));
 const quick=quickView(bank,state,options,{cards:[question],index:0,version:'new'});
 assert.ok(quick.includes('<blockquote>'+q.stem+'</blockquote>'));
 assert.ok(!quick.includes('<blockquote></blockquote>'));
});
