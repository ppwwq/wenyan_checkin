import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {questionMaterialView,learningView} from '../src/features/learning-context.mjs';
import {practiceView,summaryView} from '../src/features/practice.mjs';
import {esc,quote} from '../src/features/shared.mjs';
import {project} from '../src/domain/review.mjs';
const bank=JSON.parse(readFileSync(new URL('../content/bank.json',import.meta.url)));
const make=q=>({id:'s',index:0,questions:[q],answers:{},drafts:{},mode:'choice',essayIds:q.essayIds,targetCount:1,selection:{essayIds:q.essayIds,count:1},skippedIds:[]});

test('every full passage and vocabulary translation survives the paired learning layout',()=>{
 for(const q of bank.questions){
  const html=learningView(q);
  for(const p of q.learning?.passages||[]){
   assert.ok(html.replace(/<mark>|<\/mark>/g,'').includes(esc(p.original)),q.id+' original');
   if(p.translation)assert.ok(html.includes(esc(p.translation)),q.id+' translation');
  }
  for(const k of q.learning?.knowledge||[])assert.ok(html.includes(esc(k.text)),q.id+' knowledge');
 }
});
test('original DSE choice labels and necessary numbered material remain unchanged, with stem first',()=>{
 for(const q of bank.questions.filter(q=>q.provenance?.kind==='dse-original')){
  const s=make(q),html=practiceView(bank,s,project([]));
  assert.ok(html.indexOf(esc(q.stem))<html.indexOf('class="options"'));
  if(q.quote)assert.ok(html.replace(/<mark>|<\/mark>/g,'').includes(esc(q.quote)),q.id);
  assert.equal((html.match(/data-action="choose"/g)||[]).length,q.choices.length);
  let cursor=0;for(const c of q.choices){const i=html.indexOf('data-choice="'+esc(c.id)+'"',cursor);assert.ok(i>=cursor);cursor=i+1;}
  assert.ok(!html.includes('全句語譯'));
 }
 const poem=bank.questions.find(q=>q.id==='dse-2019-1a-4-i');
 assert.equal(questionMaterialView(poem),'');
 for(const p of poem.learning.passages)assert.ok(learningView(poem).includes(esc(p.original)));
});
test('depleted and completed summaries keep one primary action and honest remaining counts',()=>{
 const q=bank.questions[0],state=project([]);
 const depleted={...make(q),completed:true,questions:[],skippedIds:[q.id]};
 const html=summaryView(bank,depleted,state);
 assert.match(html,/本組已練 0 題/);assert.match(html,/尚餘 1 題/);
 assert.match(html,/<div class="summary-primary"><button[^>]+data-action="adjust-scope"/);
 assert.equal((html.match(/class="btn "/g)||[]).length,1);
 const finished={...make(q),completed:true,answers:{[q.id]:'a'}};
 const done=summaryView(bank,finished,state);assert.match(done,/summary-primary[\s\S]*?返回今日訓練/);
 assert.equal((done.match(/class="btn "/g)||[]).length,1);
});

test('added reading appears only after answering, with long context collapsed',()=>{
 for(const q of bank.questions){
  const html=practiceView(bank,make(q),project([]));
  const material=questionMaterialView(q);
  assert.equal(material,q.quote?.trim()?'<div class="reading-passage"><p class="passage-label">'+(q.provenance?.kind==='authored'?'練習例句':'題目引文')+'</p><blockquote>'+quote(q)+'</blockquote></div>':'',q.id);
  assert.ok(!html.includes('source-background')&&!html.includes('answer-context')&&!html.includes('reading-passage"><p class="passage-label">《'),q.id);
 }
 const long=bank.questions.find(q=>q.id==='dse-2025-1a-2');
 const context=learningView(long);
 assert.match(context,/<details class="extended-context"><summary>查看完整句譯與上下文/);
 assert.ok(!context.includes('<details class="extended-context" open'));
 assert.ok(context.indexOf(quote(long))<context.indexOf('extended-context'));
 const noQuote={...long,quote:''};
 assert.equal(questionMaterialView(noQuote),'');
});

test('feedback uses short verified source quotations when the stem has no quote',()=>{
 const q={quote:'',explanation:'惠子說「非不呺然大也，吾為其無用而掊之」，不是「不存在的原文」。',learning:{passages:[{title:'逍遙遊',original:'前文。'.repeat(60)+'非不呺然大也，吾為其無用而掊之。',translation:''}],knowledge:[]}};
 const html=learningView(q),visible=html.slice(0,html.indexOf('<details'));
 assert.ok(visible.includes('<blockquote>非不呺然大也，吾為其無用而掊之</blockquote>'));
 assert.ok(!visible.includes('前文')&&!visible.includes('不存在的原文'));
 assert.ok(!html.includes('全句語譯'));
 assert.equal(questionMaterialView(q),'');
});
test('meaning, theme and technique show a stored passage translation after answering',()=>{
 for(const ability of ['meaning','theme','technique']){
  const q=bank.questions.find(item=>item.ability===ability&&(item.learning?.passages||[]).some(p=>p.translation));
  assert.ok(q,ability);
  assert.match(learningView(q),/全句語譯/);
  for(const p of q.learning.passages)if(p.translation)assert.ok(learningView(q).includes(esc(p.translation)),q.id);
  assert.equal(practiceView(bank,make(q),project([])).includes('全句語譯'),false,q.id);
 }
 const vocab=bank.questions.find(item=>item.ability==='vocabulary'&&item.learning.passages.some(p=>p.translation));
 assert.match(learningView(vocab),/全句語譯/);
});
