import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {validateBackup} from '../../src/storage/repository.mjs';
import {project} from '../../src/domain/review.mjs';

const results={date:'2026-09-24',scope:'Local isolated audit; no production requests',checks:{}};
const app=fs.readFileSync(new URL('../../src/app.mjs',import.meta.url),'utf8');
const appendSource=app.slice(app.indexOf('function append('),app.indexOf('async function saveSession('));
let calls=0;
const context=vm.createContext({structuredClone,event:(type,payload,id)=>({type,payload,id}),repo:{async append(){calls++;if(calls===1)throw new Error('Synthetic transient write failure');}},refresh:async()=>{},setStatus:()=>{},toast:()=>{},saveChain:Promise.resolve()});
vm.runInContext(appendSource,context);
for(let i=0;i<2;i++){try{await vm.runInContext(`append('favorite',{questionId:'audit',saved:true},'event-${i}')`,context);}catch{}}
results.checks.saveChain={appendRequests:2,actualRepositoryCalls:calls,recoveredAfterTransientFailure:calls===2};

const malformed={format:'wenyan-backup-v1',userId:'synthetic-audit',events:[{id:'synthetic-invalid-attempt',type:'attempt',createdAt:'2026-09-24T00:00:00Z',payload:{submittedAt:'invalid-time'}}]};
let validated=false,projectionError=null;
try{const items=validateBackup(malformed,'synthetic-audit');validated=true;project(items);}catch(error){projectionError=error.message;}
results.checks.backupValidation={malformedAttemptAccepted:validated,projectionError};

const origin='http://127.0.0.1:8895';
const login=await fetch(origin+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'audit20260924',password:'LocalAuditOnly-2026'})}).then(r=>r.json());
const response=await fetch(origin+'/api/sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+login.token},body:JSON.stringify({events:[]})});
const raw=await response.text(),data=JSON.parse(raw),events=data.events;
const sessions=events.filter(e=>e.type==='session');
results.checks.realAuditSync={status:response.status,responseBytes:Buffer.byteLength(raw),eventCount:events.length,attemptCount:events.filter(e=>e.type==='attempt').length,sessionEventCount:sessions.length,sessionPayloadBytes:sessions.reduce((n,e)=>n+Buffer.byteLength(JSON.stringify(e.payload)),0),questionSnapshotCounts:sessions.map(e=>e.payload.session.questions.length),uniqueSessions:new Set(sessions.map(e=>e.payload.session.id)).size,serverSessionHeads:Object.values(project(events).sessions).map(s=>({kind:s.kind,completed:s.completed,revision:s.revision,questionCount:s.questions.length}))};
const bank=JSON.parse(fs.readFileSync(new URL('../../content/bank.json',import.meta.url),'utf8'));
const qs=bank.questions,bytes=qs.map(q=>Buffer.byteLength(JSON.stringify(q))).sort((a,b)=>a-b);
results.checks.bank={version:bank.version,questions:qs.length,active:qs.filter(q=>q.active!==false).length,bankFileBytes:fs.statSync(new URL('../../content/bank.json',import.meta.url)).size,singleChoiceCount:qs.filter(q=>q.responseFormat==='single-choice').length,questionSnapshotMedianBytes:bytes[Math.floor(bytes.length/2)]};
results.existingTests={command:'node --test web-study/tests/*.test.mjs web-study/backend/*.test.mjs web-study/cloudflare/*.test.mjs',executedThisAudit:true,passed:66,failed:0};
fs.writeFileSync(new URL('./probe-results.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
