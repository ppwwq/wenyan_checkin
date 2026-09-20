const CACHE='wenyan-study-v1';
const SHELL=['/','/index.html','/styles.css','/manifest.webmanifest','/assets/icon.svg','/assets/icon-192.png','/assets/icon-512.png','/assets/icon-maskable.png','/assets/apple-touch-icon.png','/src/features/preferences.mjs','/src/app.mjs','/src/domain/review.mjs','/src/domain/queue.mjs','/src/storage/repository.mjs','/src/sync/client.mjs','/src/features/shared.mjs','/src/features/practice.mjs','/src/features/library.mjs','/src/features/records.mjs','/content/bank.json'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 // PDFs support byte ranges on the server; do not cache partial responses.
 if(event.request.headers.has('range'))return;
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('/index.html')));return;}
 if(SHELL.includes(url.pathname)||url.pathname.startsWith('/content/')){
  event.respondWith(fetch(event.request).then(response=>{if(response.ok&&response.status===200){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;}).catch(()=>caches.match(event.request)));
 }
});
