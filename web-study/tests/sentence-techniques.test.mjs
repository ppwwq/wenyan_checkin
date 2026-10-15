import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {shuffledQuestion} from '../src/domain/queue.mjs';
import {sourceLabel} from '../src/features/learning-context.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const bank=read('../content/bank.json');
const revision='../../tools/question-bank/sentence-techniques-2026-10-15/';
const original=read(revision+'baseline-dse-originals.json');
const oldAppendix=read(revision+'baseline-appendix.json');
const manifest=read(revision+'release-manifest.json');
const examples=bank.questions.filter(q=>manifest.revisedIds.includes(q.id));

test('standalone rhetoric questions now give concrete material and assess the method instead of a definition',()=>{
 assert.equal(examples.length,30);
 for(const q of examples){
  const old=oldAppendix.find(o=>o.id===q.id);
  assert.deepEqual(q.essayIds,[]);assert.ok(q.tags.includes('sentence-technique'));
  assert.equal(q.provenance.kind,'authored');assert.ok(q.quote.length>=8);assert.match(q.quote,/[，。？！]/);assert.notEqual(q.quote,old.quote);
  assert.notEqual(q.stem,old.stem);assert.equal(q.version,old.version+1);assert.equal(q.memoryId,old.memoryId);
  assert.deepEqual(q.source,old.source);assert.deepEqual(q.learning,old.learning);
  assert.equal(q.choices.length,4);assert.equal(new Set(q.choices.map(c=>c.text)).size,4);
  assert.equal(q.choices.filter(c=>c.id===q.answerId).length,1);
  assert.ok(q.choices.every(c=>c.explanation.length>20));
  assert.doesNotMatch(sourceLabel(q),/DSE/);
 }
 const metaphor=examples.find(q=>q.id==='full-d-00-00');
 assert.match(metaphor.quote,/月亮像一隻小船/);
 assert.equal(metaphor.choices.find(c=>c.id===metaphor.answerId).text,'比喻');
});
test('all 27 DSE records retain their original wording, options, answers, provenance and fixed option order',()=>{
 const current=bank.questions.filter(q=>q.provenance?.kind==='dse-original');
 assert.equal(current.length,27);assert.deepEqual(current,original);
 for(const q of current){
  for(const random of [()=>0,()=>0.99])assert.deepEqual(shuffledQuestion(q,random),q);
  assert.match(sourceLabel(q),/DSE 原題/);
 }
});
test('all other appendix questions remain unchanged and release checksum matches the delivered bank',()=>{
 for(const old of oldAppendix.filter(q=>!manifest.revisedIds.includes(q.id)))assert.deepEqual(bank.questions.find(q=>q.id===old.id),old);
 const sha=createHash('sha256').update(readFileSync(new URL('../content/bank.json',import.meta.url))).digest('hex');
 assert.equal(sha,manifest.bankSha256);assert.equal(manifest.unchangedQuestions,2131);
});
