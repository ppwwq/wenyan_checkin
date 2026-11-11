import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

function worker(fetcher,{failWrites=false}={}){
 const handlers=new Map(),entries=new Map();
 let now=1000000,installed=[];
 const key=request=>new URL(typeof request==='string'?request:request.url,'https://study.test').href;
 const cache={
  match:async request=>entries.get(key(request))?.clone(),
  put:async(request,response)=>{if(failWrites)throw new Error('quota exceeded');entries.set(key(request),response.clone());},
  addAll:async paths=>{installed=[...paths];},
 };
 runInNewContext(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),{
  URL,Request,Response,Headers,Date:class extends Date{static now(){return now;}},
  self:{location:{origin:'https://study.test'},clients:{claim:async()=>{}},addEventListener:(name,handler)=>handlers.set(name,handler)},
  fetch:fetcher,caches:{open:async()=>cache},
 });
 return {
  advance:()=>{now+=300001;},
  async install(){let done;handlers.get('install')({waitUntil:promise=>{done=promise;}});await done;return installed;},
  request(path,options={}){
   let response;const pending=[];
   const event={request:new Request('https://study.test'+path,options),respondWith:promise=>{response=promise;},waitUntil:promise=>pending.push(promise)};
   handlers.get('fetch')(event);
   return {response,pending};
  },
 };
}

test('warm JSON opens immediately, expires in the background, and a 304 keeps the full response',async()=>{
 let requests=0,finish;
 const sw=worker(async request=>{
  requests++;
  if(requests===1)return new Response('{"version":1}',{headers:{ETag:'"one"'}});
  assert.equal(request.headers.get('If-None-Match'),'"one"');
  if(requests>2)return new Response(null,{status:304});
  return new Promise(resolve=>{finish=resolve;});
 });
 const cold=sw.request('/content/bank.json');
 assert.equal((await cold.response).status,200);await Promise.all(cold.pending);
 assert.deepEqual(await(await sw.request('/content/bank.json').response).json(),{version:1});
 assert.equal(requests,1);
 sw.advance();
 const stale=sw.request('/content/bank.json');
 assert.deepEqual(await(await stale.response).json(),{version:1});
 finish(new Response(null,{status:304}));await Promise.all(stale.pending);
 const checked=await sw.request('/content/bank.json',{cache:'no-cache'}).response;
 assert.equal(checked.status,200);
});

test('installation leaves large content to demand loading and bypasses API, private files and ranges',async()=>{
 const sw=worker(async()=>{throw new Error('Network unavailable');});
 const installed=await sw.install();
 assert.equal(installed.some(request=>new URL(request.url).pathname.startsWith('/content/')),false);
 assert.ok(installed.every(request=>request.cache==='reload'));
 for(const path of ['/api/health','/content/local-private/school-original.json'])assert.equal(sw.request(path).response,undefined);
 assert.equal(sw.request('/content/sources/revision-book.pdf',{headers:{Range:'bytes=0-5'}}).response,undefined);
});

test('a 304 without a cached body is retried and never reaches the JSON reader',async()=>{
 let count=0;
 const sw=worker(async()=>++count===1?new Response(null,{status:304}):new Response('{"version":2}'));
 const response=await sw.request('/content/bank.json').response;
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{version:2});
 assert.equal(count,2);
});

test('offline revalidation keeps the last complete JSON response',async()=>{
 let offline=false;
 const sw=worker(async()=>{
  if(offline)throw new Error('offline');
  return new Response('{"version":1}');
 });
 await sw.request('/content/bank.json').response;
 offline=true;
 const response=await sw.request('/content/bank.json',{cache:'no-cache'}).response;
 assert.deepEqual(await response.json(),{version:1});
});

test('a full offline cache does not prevent an online content response',async()=>{
 const sw=worker(async()=>new Response('{"version":1}'),{failWrites:true});
 const response=await sw.request('/content/bank.json').response;
 assert.deepEqual(await response.json(),{version:1});
});
