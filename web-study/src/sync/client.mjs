export async function api(path,{token,body,method=body?'POST':'GET'}={}){
 const response=await fetch(path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
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
  if(typeof navigator!=='undefined'&&!navigator.onLine){this.onStatus('已保存到此 iPad · 離線');return;}
  try{
   this.onStatus('正在備份…');
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
   this.onStatus('已備份');return data;
  }catch(e){if(!this.stopped)this.onStatus(e.status===401?'登入已過期 · 本機記錄仍保留':'已保存到此 iPad · 待備份');throw e;}
 }
}

