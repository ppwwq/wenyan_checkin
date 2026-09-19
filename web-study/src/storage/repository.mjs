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
 close(){this.db.close();}
}
export const event=(type,payload,id=crypto.randomUUID())=>({id,type,payload,createdAt:new Date().toISOString()});
export function validateBackup(data,userId){
 if(data?.format!=='wenyan-backup-v1'||data.userId!==userId||!Array.isArray(data.events))throw new Error('備份格式不符或屬於另一個帳號');
 const types=new Set(['attempt','assessment','favorite','report','browse','session','settings']);
 if(data.events.some(e=>!e.id||!types.has(e.type)||!e.payload||!Number.isFinite(Date.parse(e.createdAt))))throw new Error('備份包含無效記錄');
 return [...new Map(data.events.map(e=>[e.id,e])).values()];
}

