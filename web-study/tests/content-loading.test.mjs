import test from 'node:test';
import assert from 'node:assert/strict';
import {createContentLoader} from '../src/storage/content.mjs';

test('public JSON stays usable from memory while a conditional refresh is pending',async()=>{
 let finish;
 const requests=[];
 const load=createContentLoader(async(url,options)=>{
  requests.push({url,options});
  if(requests.length===1)return new Response('{"version":1}',{headers:{ETag:'"v1"'}});
  return new Promise(resolve=>{finish=resolve;});
 });
 const initial=await load('/content/bank.json');
 const refresh=load('/content/bank.json',{refresh:true});
 assert.equal(await load('/content/bank.json'),initial);
 assert.equal(requests.length,2);
 assert.equal(requests[1].options.headers['If-None-Match'],'"v1"');
 finish(new Response(null,{status:304}));
 assert.equal(await refresh,initial);
});

test('an initial 304 retries without conditions and overlapping initial loads share the result',async()=>{
 let count=0;
 const load=createContentLoader(async()=>++count===1?new Response(null,{status:304}):new Response('{"version":2}'));
 const [a,b]=await Promise.all([load('/content/bank.json'),load('/content/bank.json')]);
 assert.equal(a.version,2);
 assert.equal(a,b);
 assert.equal(count,2);
});

test('failed refreshes preserve the last good content and changed ETags publish new content',async()=>{
 let response=new Response('{"version":1}',{headers:{ETag:'"one"'}});
 const load=createContentLoader(async()=>response);
 const initial=await load('/content/bank.json');
 response=new Response(null,{status:503});
 await assert.rejects(load('/content/bank.json',{refresh:true}));
 assert.equal(await load('/content/bank.json'),initial);
 response=new Response('{"version":2}',{headers:{ETag:'"two"'}});
 assert.deepEqual(await load('/content/bank.json',{refresh:true}),{version:2});
 await assert.rejects(load('/content/local-private/school-original.json'));
});
