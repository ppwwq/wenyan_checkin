// Public content only. Account data and local school papers use their existing loaders.
export function createContentLoader(fetcher=fetch){
 const saved=new Map(),pending=new Map();
 return async function load(path,{refresh=false}={}){
  if(!path.startsWith('/content/')||path.startsWith('/content/local-private/'))throw new Error('只可快取公開內容');
  const previous=saved.get(path);
  if(previous&&!refresh)return previous.data;
  if(pending.has(path))return pending.get(path);
  const task=(async()=>{
   const headers=previous?.etag?{'If-None-Match':previous.etag}:{};
   let response=await fetcher(path,{cache:refresh?'no-cache':'default',headers});
   if(response.status===304){
    if(previous)return previous.data;
    response=await fetcher(path,{cache:'reload'});
   }
   if(!response.ok)throw new Error('公開內容暫時未能下載');
   const etag=response.headers.get('ETag');
   if(previous&&etag&&etag===previous.etag){
    await response.body?.cancel();
    return previous.data;
   }
   const offlineCopy=globalThis.caches?response.clone():null;
   const data=await response.json();
   // The first page may finish loading before its Service Worker takes control.
   // Save that same response so offline reopening needs no second download.
   if(globalThis.caches){
    try{
     const cache=await caches.open('wenyan-study-public-content-v1');
     const storedHeaders=new Headers(response.headers);
     storedHeaders.delete('Content-Encoding');storedHeaders.delete('Content-Length');
     storedHeaders.set('X-Wenyan-Cached-At',String(Date.now()));
     await cache.put(path,new Response(offlineCopy.body,{headers:storedHeaders}));
    }catch{/* Storage quota must not prevent practice. */}
   }
   saved.set(path,{data,etag});
   return data;
  })();
  pending.set(path,task);
  try{return await task;}finally{pending.delete(path);}
 };
}
