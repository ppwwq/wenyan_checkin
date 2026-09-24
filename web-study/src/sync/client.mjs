export async function api(path,{token,body,method=body?'POST':'GET'}={}){
 const response=await fetch(path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(30000)});
 const data=await response.json().catch(()=>({error:'伺服器未傳回有效資料'}));
 if(!response.ok){const e=new Error(data.error?.message||data.error||'連線失敗');e.status=response.status;throw e;}
 return data;
}
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
   const count=(await this.repo.pending()).length;this.onStatus(count?'正在備份 '+count+' 筆…':'正在確認備份…');
   let data;
   // A bounded batch prevents a large offline history from exceeding request limits.
   do{
    const ordered=(await this.repo.pending()).sort((a,b)=>Number(b.type==='attempt')-Number(a.type==='attempt') || Date.parse(a.createdAt)-Date.parse(b.createdAt) || a.id.localeCompare(b.id)).slice(0,100);
    const pending=[];let bytes=0;for(const e of ordered){const size=new TextEncoder().encode(JSON.stringify(e)).length;if(pending.length&&bytes+size>2_000_000)break;pending.push(e);bytes+=size;}
    data=await api('/api/sync',{token:this.token,body:{events:pending}});
    if(this.stopped)return;
    await this.repo.merge(data.events||[],pending.map(e=>e.id));
    await this.repo.set('reports',data.reports||[]);
    await this.repo.set('corrections',data.corrections||[]);
    await this.repo.set('lastSync',data.serverTime||new Date().toISOString());
   }while((await this.repo.pending()).length);
   this.onStatus('已備份 · '+new Date().toLocaleTimeString('zh-HK',{hour:'2-digit',minute:'2-digit',hour12:false}));return data;
  }catch(e){if(!this.stopped)this.onStatus(e.status===401?'登入已過期 · 請重新登入':e.status===409?'備份衝突 · 請匯出記錄並聯絡維護者':e.status===400?'備份未完成 · 請匯出記錄並聯絡維護者':'已保存到本機 · 備份失敗，稍後重試');throw e;}
 }
}

