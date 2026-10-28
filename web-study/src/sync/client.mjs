export async function api(path,{token,body,method=body?'POST':'GET'}={}){
 const response=await fetch(path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(30000)});
 const data=await response.json().catch(()=>({error:'伺服器未傳回有效資料'}));
 if(!response.ok){const e=new Error(data.error?.message||data.error||'連線失敗');e.status=response.status;throw e;}
 return data;
}
// Send parent submissions before assessments, including across batch/byte limits.
const isSubmission=e=>e.type==='attempt'||e.type==='written'&&e.payload.action==='submit';
export class SyncClient {
 constructor(repo,token,onStatus=()=>{}){this.repo=repo;this.token=token;this.onStatus=onStatus;this.running=null;this.stopped=false;}
 stop(){this.stopped=true;}
 async sync(){
  if(this.stopped)return; if(this.running)return this.running;
  this.running=this.run();try{return await this.running;}finally{this.running=null;}
 }
 async run(){
  if(typeof navigator!=='undefined'&&!navigator.onLine){this.onStatus('已保存到本機 · 離線');return;}
  try{
   let queued=await this.repo.pending(),cursor=await this.repo.get('syncCursorV2')||0;
   this.onStatus(queued.length?'正在備份 '+queued.length+' 筆…':'正在確認備份…');
   let data;
   // A bounded batch prevents a large offline history from exceeding request limits.
   do{
    const ordered=queued.sort((a,b)=>Number(isSubmission(b))-Number(isSubmission(a)) || Date.parse(a.createdAt)-Date.parse(b.createdAt) || a.id.localeCompare(b.id)).slice(0,100);
    const pending=[];let bytes=0;for(const e of ordered){const size=new TextEncoder().encode(JSON.stringify(e)).length;if(pending.length&&bytes+size>2_000_000)break;pending.push(e);bytes+=size;}
    data=await api('/api/sync/page',{token:this.token,body:{events:pending,after:cursor,pageSize:16}});
    if(this.stopped)return;
    if(!Number.isSafeInteger(data.nextCursor)||data.nextCursor<cursor||data.hasMore&&data.nextCursor===cursor)throw new Error('伺服器分頁游標無效，記錄仍保留在本機');
    const acknowledged=new Set(data.acknowledgedIds||[]);if(pending.some(e=>!acknowledged.has(e.id)))throw new Error('伺服器未完整確認備份，記錄仍保留在本機');
    await this.repo.merge(data.events||[],pending.map(e=>e.id));
    cursor=data.nextCursor;await this.repo.set('syncCursorV2',cursor);queued=queued.filter(e=>!acknowledged.has(e.id));
    await this.repo.set('reports',data.reports||[]);
    await this.repo.set('corrections',data.corrections||[]);
    await this.repo.set('lastSync',data.serverTime||new Date().toISOString());
    if(!queued.length&&!data.hasMore)queued=await this.repo.pending();
   }while(queued.length||data.hasMore);
   this.onStatus('已備份 · '+new Date().toLocaleTimeString('zh-HK',{hour:'2-digit',minute:'2-digit',hour12:false}));return data;
  }catch(e){if(!this.stopped)this.onStatus(e.status===401?'登入已過期 · 請重新登入':e.status===409?'備份衝突 · 請匯出記錄並聯絡維護者':e.status===400?'備份未完成 · 請匯出記錄並聯絡維護者':'已保存到本機 · 備份失敗，稍後重試');throw e;}
 }
}

