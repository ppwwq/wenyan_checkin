const CACHE='wenyan-study-2026.10.29.3-authored-expansion';
const SHELL=['/assets/design.css','/src/domain/editorial.mjs','/src/domain/editorial-prototypes.mjs','/src/domain/learning-card-contract.mjs','/src/domain/material-contract.mjs','/src/domain/original-presentation.mjs','/src/domain/reviewed-material-contract.mjs','/src/domain/written.mjs','/src/features/written.mjs','/content/written-practice.json','/src/domain/daily-availability.mjs','/src/domain/answer-mode.mjs','/src/domain/replacement.mjs','/src/domain/choice-progress.mjs','/src/features/learning-context.mjs','/src/domain/session.mjs','/src/features/mistakes.mjs','/src/domain/training.mjs','/src/features/training.mjs','/','/index.html','/styles.css','/manifest.webmanifest','/assets/icon.svg','/assets/icon-192.png','/assets/icon-512.png','/assets/icon-maskable.png','/assets/apple-touch-icon.png','/src/features/preferences.mjs','/src/app.mjs','/src/domain/review.mjs','/src/domain/queue.mjs','/src/domain/review-types.mjs','/src/domain/school-vocab.mjs','/src/domain/sheet-run.mjs','/src/domain/pools.mjs','/src/domain/batch-merge.mjs','/src/domain/authored-expansion.mjs','/src/features/review-hall.mjs','/content/school-vocab/manifest.json','/content/school-vocab/v1.json','/content/authored-expansion/manifest.json','/content/authored-expansion/v1.json','/src/storage/repository.mjs','/src/storage/backup.mjs','/src/storage/save-queue.mjs','/src/sync/scheduler.mjs','/src/sync/client.mjs','/src/features/shared.mjs','/src/features/practice.mjs','/src/features/library.mjs','/src/features/records.mjs','/content/bank.json'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 // PDFs support byte ranges on the server; do not cache partial responses.
 if(event.request.headers.has('range'))return;
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match('/index.html'))));return;}
 if(SHELL.includes(url.pathname)||url.pathname.startsWith('/content/')){
  event.respondWith(fetch(event.request).then(response=>{if(response.ok&&response.status===200){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;}).catch(()=>caches.open(CACHE).then(cache=>cache.match(event.request))));
 }
});
