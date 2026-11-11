const CACHE='wenyan-study-2026.11.10.1-click-latency';
const SHELL=['/assets/unslop.css','/assets/design.css','/src/domain/editorial.mjs','/src/domain/editorial-prototypes.mjs','/src/domain/learning-card-contract.mjs','/src/domain/material-contract.mjs','/src/domain/original-presentation.mjs','/src/domain/reviewed-material-contract.mjs','/src/domain/written.mjs','/src/features/written.mjs','/src/domain/daily-availability.mjs','/src/domain/answer-mode.mjs','/src/domain/replacement.mjs','/src/domain/choice-progress.mjs','/src/features/learning-context.mjs','/src/domain/session.mjs','/src/features/mistakes.mjs','/src/features/notebook.mjs','/src/features/papers.mjs','/src/features/knowledge-map.mjs','/src/features/handbook.mjs','/src/domain/access.mjs','/src/domain/papers.mjs','/src/domain/knowledge-map.mjs','/src/domain/handbook.mjs','/src/domain/notebook.mjs','/src/domain/training.mjs','/src/features/training.mjs','/','/styles.css','/manifest.webmanifest','/assets/icon.svg','/assets/icon-192.png','/assets/icon-512.png','/assets/icon-maskable.png','/assets/apple-touch-icon.png','/src/features/preferences.mjs','/src/app.mjs','/src/domain/review.mjs','/src/domain/queue.mjs','/src/domain/choice-classification.mjs','/src/domain/review-types.mjs','/src/domain/school-vocab.mjs','/src/domain/sheet-run.mjs','/src/domain/pools.mjs','/src/domain/batch-merge.mjs','/src/domain/authored-expansion.mjs','/src/features/review-hall.mjs','/src/domain/reading-context.mjs','/src/domain/translation-excerpts.mjs','/src/features/reading-context.mjs','/src/storage/content.mjs','/src/storage/repository.mjs','/src/storage/backup.mjs','/src/storage/save-queue.mjs','/src/sync/scheduler.mjs','/src/sync/client.mjs','/src/features/shared.mjs','/src/features/practice.mjs','/src/features/library.mjs','/src/features/records.mjs','/src/features/written-records.mjs'];
const CONTENT_AGE=300000;
// Shared with the page loader so the first uncontrolled page is available offline.
const CONTENT_CACHE='wenyan-study-public-content-v1';
const updates=new Map();
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>
 cache.addAll(SHELL.map(path=>new Request(new URL(path,self.location.origin),{cache:'reload'})))
)));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

async function updateContent(request,cache,cached){
 if(updates.has(request.url))return (await updates.get(request.url)).clone();
 const task=(async()=>{
  const headers=new Headers(request.headers);
  const etag=cached?.headers.get('ETag');
  if(etag)headers.set('If-None-Match',etag);
  let response=await fetch(new Request(request,{headers,cache:'no-cache'}));
  if(response.status===304){
   if(cached)response=cached;
   else{
    headers.delete('If-None-Match');headers.delete('If-Modified-Since');
    response=await fetch(new Request(request,{headers,cache:'reload'}));
   }
  }
  if(response.status===200){
   const storedHeaders=new Headers(response.headers);
   storedHeaders.delete('Content-Encoding');storedHeaders.delete('Content-Length');
   storedHeaders.set('X-Wenyan-Cached-At',String(Date.now()));
   const stored=new Response(response.body,{status:200,headers:storedHeaders});
   try{await cache.put(request,stored.clone());}catch{/* A full cache must not block online content. */}
   return stored;
  }
  if(cached)return cached;
  if(response.status===304)return new Response('Content unavailable',{status:503});
  return response;
 })();
 updates.set(request.url,task);
 try{return (await task).clone();}finally{updates.delete(request.url);}
}
async function contentResponse(request,event){
 const cache=await caches.open(CONTENT_CACHE),cached=await cache.match(request);
 const forced=['no-cache','reload'].includes(request.cache);
 if(cached&&!forced){
  const savedAt=Number(cached.headers.get('X-Wenyan-Cached-At')||0);
  if(Date.now()-savedAt>=CONTENT_AGE)event.waitUntil(updateContent(request,cache,cached.clone()).catch(()=>{}));
  return cached;
 }
 try{return await updateContent(request,cache,cached);}
 catch(error){if(cached)return cached;throw error;}
}
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/content/local-private/'))return;
 if(request.headers.has('range'))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(()=>caches.open(CACHE).then(cache=>cache.match('/'))));return;
 }
 if(url.pathname.startsWith('/content/')&&url.pathname.endsWith('.json')){
  event.respondWith(contentResponse(request,event));return;
 }
 if(SHELL.includes(url.pathname)){
  event.respondWith(caches.open(CACHE).then(async cache=>{
   const cached=await cache.match(request);if(cached)return cached;
   const response=await fetch(request);
   if(response.status===200)try{await cache.put(request,response.clone());}catch{}
   return response;
  }));
 }
});
