import {validateBackup,mergeBackupEvents} from './backup.mjs';
export {validateBackup} from './backup.mjs';
export class Repository {
 constructor(userId,db){this.userId=userId;this.db=db;}
 static async open(userId){
  if(!userId) throw new Error('需要登入帳號');
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('wenyan-study-v1/'+encodeURIComponent(userId),1);r.onupgradeneeded=()=>{r.result.createObjectStore('events',{keyPath:'id'});r.result.createObjectStore('meta');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  return new Repository(userId,db);
 }
 async transaction(store,mode,fn){return new Promise((resolve,reject)=>{const tx=this.db.transaction(store,mode);let value;try{value=fn(tx.objectStore(store));}catch(e){tx.abort();reject(e);return;}tx.oncomplete=()=>resolve(value?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('儲存已取消'));});}
 async events(){return (await this.transaction('events','readonly',s=>s.getAll())).map(({pending,...event})=>event);}
 async pending(){return (await this.transaction('events','readonly',s=>s.getAll())).filter(e=>e.pending).map(({pending,...event})=>event);}
 async append(event){await this.transaction('events','readwrite',s=>{const request=s.get(event.id);request.onsuccess=()=>{if(!request.result)s.add({...event,pending:true});};});return event;}
 async merge(events,ackIds=[]){const ack=new Set(ackIds);await new Promise((resolve,reject)=>{const tx=this.db.transaction('events','readwrite'),s=tx.objectStore('events'),r=s.getAll();r.onsuccess=()=>{const map=new Map(r.result.map(e=>[e.id,e]));for(const e of events)map.set(e.id,{...e,pending:false});for(const id of ack){const e=map.get(id);if(e)map.set(id,{...e,pending:false});}for(const e of map.values())s.put(e);};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
 async get(key){return this.transaction('meta','readonly',s=>s.get(key));}
 async set(key,value){return this.transaction('meta','readwrite',s=>s.put(value,key));}
 async importBackup(data){
  const incoming=validateBackup(data,this.userId);
  return new Promise((resolve,reject)=>{
   const tx=this.db.transaction('events','readwrite'),store=tx.objectStore('events'),request=store.getAll();let error,count=0;
   request.onsuccess=()=>{
    try{
     mergeBackupEvents(request.result,incoming);
     const known=new Set(request.result.map(e=>e.id));
     for(const e of incoming)if(!known.has(e.id)){store.add({...e,pending:true});count++;}
    }catch(e){error=e;tx.abort();}
   };
   tx.oncomplete=()=>resolve(count);
   tx.onerror=()=>reject(error||tx.error);
   tx.onabort=()=>reject(error||tx.error||new Error('備份未寫入，現有記錄保留'));
  });
 }
 async exportBackup(){
  const events=await this.events(),keys=await this.transaction('meta','readonly',s=>s.getAllKeys());
  for(const key of keys.filter(key=>typeof key==='string'&&key.startsWith('draft-session/'))){
   const draft=await this.get(key);if(!draft?.id)continue;
   const latest=events.filter(e=>e.type==='session'&&e.payload.session.id===draft.id).sort((a,b)=>(b.payload.session.revision||0)-(a.payload.session.revision||0))[0];
   if(!latest||(draft.revision||0)>(latest.payload.session.revision||0))events.push({id:'backup-draft/'+draft.id+'/'+(draft.revision||0),type:'session',payload:{session:draft},createdAt:latest?.createdAt||draft.startedAt});
  }
  return {format:'wenyan-backup-v1',userId:this.userId,exportedAt:new Date().toISOString(),events};
 }
 close(){this.db.close();}
}
export const event=(type,payload,id=crypto.randomUUID())=>({id,type,payload,createdAt:new Date().toISOString()});
