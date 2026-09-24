import {createApp} from '../../backend/server.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {hkDay} from '../../src/domain/review.mjs';
const app=createApp({databasePath:':memory:',bootstrapInvite:'local-test-only'});
await new Promise(resolve=>app.server.listen(8799,'127.0.0.1',resolve));
const origin='http://127.0.0.1:8799';
async function api(path,body,token){const res=await fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw new Error(JSON.stringify(data));return data;}
const bank=JSON.parse(readFileSync(new URL('../../content/bank.json',import.meta.url),'utf8'));
const active=bank.questions.filter(q=>q.active!==false&&q.status==='reviewed');
const qs=[active.find(q=>q.essayIds.length===1&&q.essayIds[0]==='essay-01'&&q.ability==='vocabulary'),active.find(q=>q.essayIds.length===1&&q.essayIds[0]==='essay-09'&&q.ability==='theme'),active.find(q=>!q.essayIds.length&&q.tags?.includes('appendix'))];
const time=new Date().toISOString(),day=hkDay(time);
for(const [username,questions] of [['wrong-entry-test',qs],['empty-entry-test',[]]]){
 const account=await api('/api/auth/register',{username,password:'local-test-1234',inviteCode:'local-test-only'});
 const events=[{id:'settings-test',type:'settings',createdAt:time,payload:{training:{version:1,chapters:{'essay-01':['vocabulary']},dailyCount:20,appendix:false,retry:true}}},...questions.map(q=>({id:'wrong/'+q.id,type:'attempt',createdAt:time,payload:{questionId:q.id,memoryId:q.memoryId,questionVersion:q.version,question:q,submittedAt:time,day,mode:'choice',answer:q.choices.find(c=>c.id!==q.answerId).id,correct:false,trainingPolicy:2,practiceKind:'daily',sessionId:'seed'}}))];
 await api('/api/sync',{events},account.token);
}
writeFileSync(new URL('fixture.json',import.meta.url),JSON.stringify({origin,questions:qs.map(q=>({id:q.id,stem:q.stem,answer:q.choices.find(c=>c.id===q.answerId).text})),scope:'Local in-memory database with synthetic accounts only.'},null,2));
console.log('Local fixture ready: '+origin);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.server.close(()=>{app.close();process.exit(0);}));
