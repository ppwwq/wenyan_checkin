import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {validateReleaseQuestion,questionPool,canonical} from './web-study/dist/src/domain/editorial.mjs';
import {available,queue} from './web-study/dist/src/domain/queue.mjs';
const H=new URL('./',import.meta.url),read=async p=>JSON.parse(await readFile(new URL(p,H),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const bank=await read('web-study/dist/content/bank.json'),manifest=await read('release-manifest.json');
for(const [path,e] of Object.entries(manifest.files))assert.equal(hash(await readFile(new URL(path,H))),e.sha256,path);
const old=JSON.parse(gunzipSync(await readFile(new URL('production-baseline.json.gz',H))));
const by=new Map(old.questions.map(q=>[q.id,q]));
const delta=await read('review-delta.json'),edits=new Map(delta.records.map(r=>[r.id,r]));
assert.equal(bank.questions.length,2253);assert.equal(bank.version,'2026.10.24.2');
let changed=0;const pools={};
for(const q of bank.questions){
 const before=by.get(q.id);assert.ok(before,q.id);
 assert.deepEqual(await validateReleaseQuestion(q),[],q.id);
 assert.equal(questionPool(q),questionPool(before),q.id+' pool');
 pools[questionPool(q)]=(pools[questionPool(q)]||0)+1;
 if(canonical(q)!==canonical(before)){
  changed++;assert.equal(q.version,before.version+1);
  const edit=edits.get(q.id);assert.ok(edit&&Object.keys(edit.patch).length);
  assert.equal(hash(canonical(before)),edit.beforeSha256);
  for(const [key,value] of Object.entries(edit.patch))assert.deepEqual(q[key],value);
  if(before.editorial)assert.deepEqual(q.editorial.sourceEvidence,before.editorial.sourceEvidence);
 }
 for(const key of ['id','memoryId','answerId','essayIds','status','active','source','provenance','questionMaterial','target','targetStart','targetEnd','targetSpans','targetContext'])assert.deepEqual(q[key],before[key],q.id+' '+key);
 if(!q.essayIds?.length||!edits.has(q.id))assert.deepEqual(q,before,q.id+' protected record');
 if(q.provenance?.kind==='dse-original'){
  assert.equal(q.stem,before.stem);assert.equal(q.quote,before.quote);
  assert.deepEqual(q.choices.map(c=>[c.id,c.text]),before.choices.map(c=>[c.id,c.text]));
 }
}
assert.equal(changed,639);
const opts={essayIds:bank.essays.map(e=>e.id),count:10,appendix:true,scope:'all'};
assert.deepEqual(available(bank.questions,opts).map(q=>q.id),available(old.questions,opts).map(q=>q.id));
for(const studyPool of ['basic','simulation','official']){
 const qs=queue(bank.questions,{...opts,studyPool},{events:[],attempts:[],memories:{},favorites:{}});
 assert.ok(qs.length>0&&qs.every(q=>questionPool(q)===studyPool));
}
const q=structuredClone(bank.questions.find(q=>q.id==='pilot-09-05-06'));
q.learning.passages[0].translation+='未經審查的變動';
assert.ok((await validateReleaseQuestion(q)).length>0,'Tampered material must fail');
const version=structuredClone(bank.questions.find(q=>q.id==='full-c-16-03-00-11'));
version.version++;assert.ok((await validateReleaseQuestion(version)).length>0,'Unreviewed question version must fail');
console.log(JSON.stringify({result:'PASS',version:bank.version,filesVerified:Object.keys(manifest.files).length,questions:2253,changed,
 editorialPools:pools,eligibilityPreserved:true,negativeMutationChecks:2,scope:'Frozen release integrity and current production content/queue contracts; not the original development test suite.'}));
