import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createApp} from '../backend/server.mjs';
import {hkDay,project} from '../src/domain/review.mjs';
import {dailyProgress} from '../src/domain/training.mjs';
import {validateBackup} from '../src/storage/backup.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'file:///C:/Users/philip/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const bank=JSON.parse(await readFile(new URL('../content/bank.json',import.meta.url),'utf8'));
const questions=bank.questions.filter(q=>q.responseFormat==='single-choice'&&q.ability==='vocabulary'&&q.essayIds.length===1&&q.essayIds[0]==='essay-01').sort((a,b)=>a.id.localeCompare(b.id)).filter((q,i,a)=>a.findIndex(x=>x.memoryId===q.memoryId&&x.practiceGroup===q.practiceGroup)===i).slice(0,4);
const out=new URL('../verification/choice-update-2026-10-11/',import.meta.url);await mkdir(out,{recursive:true});
const app=createApp({databasePath:':memory:',bootstrapInvite:'skip-local-only'});
await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+app.server.address().port,now=new Date().toISOString(),day=hkDay(now);
const plan={version:1,chapters:{'essay-01':['vocabulary','meaning','theme','technique']},dailyCount:3,appendix:false,retry:true};
const session=(id,kind='extra')=>({id,kind,selection:{essayIds:['essay-01'],questionIds:questions.map(q=>q.id),count:2},targetCount:2,skippedIds:[],questions:structuredClone(questions.slice(0,2)),index:0,answers:{},drafts:{},mode:'choice',essayIds:['essay-01'],completed:false,paused:true,startedAt:now,revision:1,...(kind==='extra'?{}:{trainingSnapshot:plan,goalDay:day,goalSnapshot:3})});
const sessionEvent=s=>({id:'fixture/'+s.id,type:'session',createdAt:now,payload:{session:s}});
const settings={id:'fixture/settings',type:'settings',createdAt:now,payload:{training:plan,dailyGoal:{day,count:3}}};
const errors=[],checks=[];let browser;
async function fixture(name,events){
 const response=await fetch(origin+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:name,password:'Local-Skip-Check-2026',inviteCode:'skip-local-only'})});assert.ok(response.ok);const auth=await response.json();
 const seeded=await fetch(origin+'/api/sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth.token},body:JSON.stringify({events})});assert.ok(seeded.ok,await seeded.text());
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await context.addInitScript(auth=>localStorage.setItem('wenyan-auth-v1',JSON.stringify({token:auth.token,user:auth.user})),auth);
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);
 try{await page.locator('.home-primary').waitFor();}catch(error){await writeFile(new URL('fixture-debug.txt',out),await page.locator('body').innerText());await shot(page,'fixture-debug');throw error;}
 return {page,context,auth};
}
const act=(page,a)=>page.locator('[data-action="'+a+'"]:visible').first();
async function resume(page,id){
 const target=page.locator('[data-action=resume][data-session="'+id+'"]');
 if(!await target.isVisible())await page.locator('.older-sessions>summary').click();
 await target.click();
}
const stem=(page,q)=>page.locator('.answer-panel h2').filter({hasText:q.stem}).waitFor();
async function events(page){return page.evaluate(async()=>{
 const auth=JSON.parse(localStorage.getItem('wenyan-auth-v1'));
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('wenyan-study-v1/'+encodeURIComponent(auth.user.id));r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 return new Promise((resolve,reject)=>{const r=db.transaction('events').objectStore('events').getAll();r.onsuccess=()=>{db.close();resolve(r.result);};r.onerror=()=>reject(r.error);});
});}
async function choose(page,id){
 const before=(await events(page)).length;await page.locator('[data-choice="'+id+'"]').click();
 await assertEventually(async()=>(await events(page)).length>before,'choice draft saved');
}
async function assertEventually(predicate,label){
 const until=Date.now()+10000;while(Date.now()<until){if(await predicate())return;await new Promise(resolve=>setTimeout(resolve,25));}throw new Error(label);
}
async function noOverflow(page,label){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label);}
const shot=(page,name)=>page.screenshot({path:fileURLToPath(new URL(name+'.png',out)),fullPage:true});
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const {page,context,auth}=await fixture('choice-update-fixture',[settings,sessionEvent(session('replace'))]);
 await resume(page,'replace');await stem(page,questions[0]);await noOverflow(page,'390 original');
 assert.equal(await page.locator('.sentence-translation').count(),0);
 await choose(page,questions[0].choices.find(c=>c.id!==questions[0].answerId).id);
 await act(page,'skip').click();await stem(page,questions[2]);
 assert.match(await page.locator('.session-meta').innerText(),/已練 0 \/ 2/);
 assert.equal((await events(page)).filter(e=>e.type==='attempt').length,0);
 await act(page,'pause').click();await page.reload();await page.locator('.home-primary').waitFor();await resume(page,'replace');await stem(page,questions[2]);
 await choose(page,questions[2].choices.find(c=>c.id!==questions[2].answerId).id);await act(page,'submit').click();await page.locator('.feedback').waitFor();
 assert.match(await page.locator('.session-meta').innerText(),/已練 1 \/ 2/);await page.locator('.sentence-translation').waitFor();
 assert.ok((await page.locator('.sentence-translation').innerText()).includes(questions[2].learning.passages[0].translation));
 await noOverflow(page,'390 feedback');await shot(page,'full-translation-390');
 await page.setViewportSize({width:768,height:1024});await noOverflow(page,'768 feedback');await shot(page,'full-translation-768');
 await act(page,'next').click();await stem(page,questions[1]);await act(page,'unknown').click();await page.locator('.feedback').waitFor();await act(page,'next').click();
 await page.getByRole('heading',{name:'這組練習已完成',exact:true}).waitFor();assert.equal((await events(page)).filter(e=>e.type==='attempt').length,2);
 assert.match(await page.locator('main').innerText(),/另跳過 1 題/);await shot(page,'replacement-complete-768');
 const backup={format:'wenyan-backup-v1',userId:auth.user.id,events:await events(page)};validateBackup(backup,auth.user.id);
 await act(page,'retry-skipped').click();await stem(page,questions[0]);assert.equal(await page.locator('.option.selected').count(),1);
 checks.push('跳過即時補新題；重載保留補題及草稿；答錯也計已練；達標完成與跳過補答；備份結構通過');
 await act(page,'pause').click();await act(page,'extra').click();await act(page,'select-all').click();await page.locator('#sourceKind').selectOption('dse-original');
 await assertEventually(async()=>(await page.locator('.scope-panel').innerText()).includes('共 27 題'),'DSE count');await noOverflow(page,'768 library');await shot(page,'source-filter-768');
 await page.setViewportSize({width:390,height:844});await noOverflow(page,'390 library');
 const trueQ=bank.questions.find(q=>q.id==='dse-2025-1a-2');
 const trueSession={...session('true-paper'),questions:[trueQ],essayIds:trueQ.essayIds,selection:{essayIds:trueQ.essayIds,questionIds:[trueQ.id],count:1},targetCount:1};
 const paper=await fixture('choice-true-fixture',[settings,sessionEvent(trueSession)]);await resume(paper.page,'true-paper');await stem(paper.page,trueQ);
 assert.match(await paper.page.locator('.past-paper-tag').innerText(),/DSE 真題 · 2025/);assert.match(await paper.page.locator('.source-panel').innerText(),/\(1\)/);
 await noOverflow(paper.page,'390 true paper');await shot(paper.page,'dse-numbered-390');await act(paper.page,'unknown').click();await paper.page.locator('.sentence-translation').waitFor();
 checks.push('真題篩選27题；2025題號／分值可見；組合題(1)–(4)保留；字詞真題答後顯示全句翻譯');
 const limited={...session('exhaust'),selection:{essayIds:['essay-01'],questionIds:questions.slice(0,2).map(q=>q.id),count:2}};
 const exhausted=await fixture('choice-exhaust-fixture',[settings,sessionEvent(limited)]);await resume(exhausted.page,'exhaust');await act(exhausted.page,'skip').click();await stem(exhausted.page,questions[1]);await act(exhausted.page,'skip').click();
 await exhausted.page.getByRole('heading',{name:'本輪練習已結束'}).waitFor();assert.match(await exhausted.page.locator('main').innerText(),/本組已練 0 題/);assert.equal((await events(exhausted.page)).filter(e=>e.type==='attempt').length,0);await shot(exhausted.page,'exhausted-390');
 checks.push('範圍耗盡如實結束，跳過不製造作答或達標；390／768無橫向溢出');
 assert.deepEqual(errors,[]);await writeFile(new URL('browser-result.json',out),JSON.stringify({result:'PASS',checks,errors,scope:'本機記憶體資料庫與隔離 Chromium；未碰正式帳號'},null,2));
 console.log(JSON.stringify({result:'PASS',checks}));await context.close();await paper.context.close();await exhausted.context.close();
}catch(error){await writeFile(new URL('browser-error.json',out),JSON.stringify({message:error.message,stack:error.stack,errors},null,2));throw error;}
finally{await browser?.close();await new Promise(resolve=>app.server.close(resolve));app.close();}
