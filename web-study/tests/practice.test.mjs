import test from 'node:test';
import assert from 'node:assert/strict';
import {answerMode,answerPanel,practiceView} from '../src/features/practice.mjs';
import {savedView,quickView} from '../src/features/records.mjs';
import {textScale} from '../src/features/preferences.mjs';
import {attemptAnswerText,esc} from '../src/features/shared.mjs';
import * as practice from '../src/features/practice.mjs';
const q={id:'q',essayIds:['e'],ability:'meaning',stem:'兩句的意思有何關係？',quote:'',choices:['a','b','c','d'].map(id=>({id,text:id,explanation:'辨析'})),answerId:'a',responseFormat:'single-choice'};
const session={id:'s',mode:'mixed',index:2,questions:[q,q,q],answers:{},drafts:{}};
const state={attempts:[],favorites:{},firsts:[],assessments:new Map()};

test('reading annotations preserve original explanation and distinguish evidence from the rejected inference',()=>{
 const question={...q,quote:'二者不可得兼，舍生而取義者也。',choices:q.choices.map(c=>({...c,text:c.id==='a'?'不能兩全時取義':c.text}))};
 const original='「二者不可得兼」是前提，因此不能兩全時取義。不能說作者完全不珍惜生命。';
 const html=practice.annotatedExplanation(original,question);
 const copy=[...html.matchAll(/<span class="annotated-copy">([\s\S]*?)<\/span>/g)].map(m=>m[1].replace(/<[^>]*>/g,'')).join('');
 assert.equal(copy,original);assert.match(html,/原文依據/);assert.match(html,/關鍵區別/);assert.match(html,/explanation-highlight/);assert.match(html,/explanation-evidence/);
 assert.ok(!html.includes('<mark>不能</mark>'));
});

test('administrator answer descriptions use the attempt snapshot display label and text',()=>{
 const attempt={mode:'choice',answer:'a',question:{choices:[{id:'a',displayLabel:'D',text:'當時選項'}]}};
 assert.equal(attemptAnswerText(attempt),'D · 當時選項');
 assert.equal(attemptAnswerText({...attempt,question:q}),'A · a');
 assert.equal(attemptAnswerText({...attempt,mode:'typing',answer:'a'}),'a');
 assert.equal(attemptAnswerText({...attempt,answer:'暫時不會'}),'暫時不會');
 assert.ok(!esc(attemptAnswerText({...attempt,question:{choices:[{id:'a',displayLabel:'D',text:'<img src=x>'}]}})).includes('<img'));
});

test('saved shuffled options display matching letters without changing the answer ID',()=>{
 const question={...q,choices:[q.choices[1],q.choices[2],q.choices[3],q.choices[0]].map((c,i)=>({...c,displayLabel:'ABCD'[i]}))};
 const html=answerPanel(question,{...session,answers:{q:'s/q'}},{...state,attempts:[{id:'s/q',payload:{mode:'choice',answer:'b',correct:false}}]});
 assert.ok(html.includes('<b>A</b><span>b</span>'));
 assert.ok(html.includes('A · b'));
 assert.ok(html.includes('<b>D</b><span>a</span><small class="status">正確答案</small>'));
 assert.equal(question.answerId,'a');
 const resumed=JSON.parse(JSON.stringify(question));
 assert.equal(answerPanel(resumed,{...session,answers:{q:'s/q'}},{...state,attempts:[{id:'s/q',payload:{mode:'choice',answer:'b',correct:false}}]}),html);
});

test('feedback leads with the answer and selected distractor before optional details',()=>{
 const question={...q,summary:'記住否定範圍',explanation:'原句\n推理',choices:q.choices.map(c=>({...c,explanation:'原因'+c.id}))};
 const before=answerPanel(question,session,state);
 assert.ok(!before.includes('記住否定範圍')&&!before.includes('原因b'));
 const after=answerPanel(question,{...session,answers:{q:'s/q'}},{...state,attempts:[{id:'s/q',payload:{mode:'choice',answer:'b',correct:false}}]});
 assert.ok(after.indexOf('先看這題答案')<after.indexOf('你選的選項差在哪裏'));
 assert.ok(after.indexOf('你選的選項差在哪裏')<after.indexOf('看原文與完整解析'));
 assert.ok(after.indexOf('看原文與完整解析')<after.indexOf('逐項辨析'));
 assert.equal(after.split('原因b').length-1,1);
 assert.ok(after.includes('原句\n</span>'));assert.ok(after.includes('推理</span>'));
});

test('unknown, correct and typing answers never infer a selected misconception',()=>{
 for(const payload of [{mode:'choice',answer:'',correct:false},{mode:'choice',answer:'a',correct:true},{mode:'typing',answer:'b',correct:null}]){
  const html=answerPanel({...q,explanation:'依據'}, {...session,answers:{q:'s/q'}},{...state,attempts:[{id:'s/q',payload}]});
  assert.ok(!html.includes('你選的選項差在哪裏'));
  assert.ok(!html.includes('undefined'));
 }
});

test('legacy vocabulary templates show a short source clause and keep the original wording available',()=>{
 const question={...q,ability:'vocabulary',target:'拜',quote:'取陽晉，拜為上卿，以勇氣聞於諸侯。',summary:'授予官職',explanation:'在長句中應理解為授予官職。',choices:q.choices.map(c=>({...c,text:c.id==='a'?'授予官職':'跪拜行禮',explanation:c.id==='b'?'「跪拜行禮」不合本句所指或語法關係；本句應解作「授予官職」。':'辨析'}))};
 const html=answerPanel(question,{...session,answers:{q:'s/q'}},{...state,attempts:[{id:'s/q',payload:{mode:'choice',answer:'b',correct:false}}]});
 assert.ok(html.includes('「拜」在這裏是「授予官職」'));
 assert.ok(html.includes('原句關鍵：拜為上卿'));
 assert.ok(html.includes('你選了「跪拜行禮」。看原句「拜為上卿」'));
 assert.ok(html.includes('<summary>查看原有選項解析</summary>'));
 assert.ok(html.includes('不合本句所指或語法關係'));
});

test('vocabulary feedback uses the assessed occurrence when a word appears twice',()=>{
 const source='克己復禮為仁。一日克己復禮，天下歸仁焉。為仁由己，而由人乎哉？';
 const question={...q,ability:'vocabulary',quote:source,target:'為',targetStart:source.indexOf('為仁由己'),explanation:'此處為是實行。'};
 const render=item=>answerPanel(item,{...session,answers:{q:'s/q'}},{...state,attempts:[{id:'s/q',payload:{mode:'choice',answer:'a',correct:true}}]});
 assert.ok(render(question).includes('原句關鍵：為仁由己'));
 assert.ok(!render(question).includes('原句關鍵：克己復禮為仁'));
 assert.ok(render({...question,targetStart:0}).includes('原句關鍵：克己復禮為仁'));
});

test('feedback escapes content and does not mutate legacy snapshots',()=>{
 const question={...q,summary:'<img src=x>',explanation:'<script>test</script>\n第二段'};const original=structuredClone(question);
 const html=answerPanel(question,{...session,answers:{q:'s/q'}},{...state,attempts:[{id:'s/q',payload:{mode:'choice',answer:'a',correct:true}}]});
 assert.ok(!html.includes('<script>')&&!html.includes('<img src=x>'));
 assert.ok(html.includes('&lt;script&gt;'));
 assert.deepEqual(question,original);
});

test('global font scale supports saved legacy values and falls back for invalid preferences',()=>{
 assert.equal(textScale(24),1);
 assert.equal(textScale(36),1.5);
 for(const value of [null,undefined,'broken',0,-24,100000])assert.equal(textScale(value),1);
});

test('answer rendering retains source data without exposing PDF or version metadata',()=>{
 const question={...q,version:2,source:{pdfUrl:'/content/book.pdf',pdfPage:5,printedPage:1,blockPath:'private-locator'},explanation:'這是核心解析。'};
 const copy=structuredClone(question);
 const answered={...session,answers:{q:'s/q'}};
 const html=answerPanel(question,answered,{...state,attempts:[{id:'s/q',payload:{mode:'choice',answer:'a',correct:true}}]});
 assert.ok(html.replace(/<[^>]*>/g,'').includes('這是核心解析。'));
 assert.ok(html.includes('逐項辨析'));
 assert.ok(!html.includes('source-link')&&!html.includes('private-locator')&&!html.includes('book.pdf'));
 assert.deepEqual(question,copy);
});
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

test('one-question retry summary lists only the practiced chapter and its effective result',()=>{
 const record={id:'retry/q',type:'attempt',createdAt:'2026-09-24T02:00:00Z',payload:{sessionId:'retry',question:q,questionId:q.id,memoryId:'m',submittedAt:'2026-09-24T02:00:00Z',mode:'choice',correct:false,answer:'b'}};
 const html=practice.summaryView({essays:[{id:'e',title:'實際練習篇章'},{id:'other',title:'沒有練習的篇章'}]}, {...session,id:'retry',essayIds:['e','other'],completed:true}, {...state,attempts:[record],corrections:[{attemptId:'retry/q',correct:true,createdAt:'2026-09-24T03:00:00Z'}]});
 assert.match(html,/實際練習篇章/);assert.doesNotMatch(html,/沒有練習的篇章/);
 assert.match(html,/本次答對 1/);assert.match(html,/次日複習/);
});
