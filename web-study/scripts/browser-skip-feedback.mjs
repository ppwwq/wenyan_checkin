import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createApp} from '../backend/server.mjs';
import {hkDay,project} from '../src/domain/review.mjs';
import {dailyProgress} from '../src/domain/training.mjs';
import {validateBackup} from '../src/storage/backup.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'file:///C:/Users/philip/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const bank=JSON.parse(await readFile(new URL('../content/bank.json',import.meta.url),'utf8'));
const questions=bank.questions.filter(q=>q.responseFormat==='single-choice'&&q.essayIds.length===1&&q.essayIds[0]==='essay-01').slice(0,3);
const out=new URL('../verification/skip-feedback-2026-10-03/',import.meta.url);await mkdir(out,{recursive:true});
const app=createApp({databasePath:':memory:',bootstrapInvite:'skip-local-only'});
await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+app.server.address().port,now=new Date().toISOString(),day=hkDay(now);
const plan={version:1,chapters:{'essay-01':['vocabulary','meaning','theme','technique']},dailyCount:3,appendix:false,retry:true};
const session=(id,kind='extra')=>({id,kind,questions:structuredClone(questions),index:0,answers:{},drafts:{},mode:'choice',essayIds:['essay-01'],completed:false,paused:true,startedAt:now,revision:1,...(kind==='extra'?{}:{trainingSnapshot:plan,goalDay:day,goalSnapshot:3})});
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
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const legacy={...session('legacy-typing'),mode:'mixed',index:2,drafts:{[questions[2].id]:'保留文字草稿'}};delete legacy.questions[2].responseFormat;
 const {page,context,auth}=await fixture('skip-extra-fixture',[settings,sessionEvent(session('extra')),sessionEvent(legacy)]);
 await resume(page,'extra');await stem(page,questions[0]);await noOverflow(page,'390px before answer');await shot(page,'skip-button-390');
 const wrong=questions[0].choices.find(c=>c.id!==questions[0].answerId).id;await choose(page,wrong);await act(page,'skip').click();await stem(page,questions[1]);
 assert.equal((await events(page)).filter(e=>e.type==='attempt').length,0);assert.equal(await page.locator('.feedback').count(),0);
 await act(page,'pause').click();await page.locator('.home-primary').waitFor();await page.reload();await page.locator('.home-primary').waitFor();await resume(page,'extra');await stem(page,questions[1]);
 checks.push('選項草稿跳過後保留，暫停及重載仍接續下一題；跳過沒有作答或評分');
 await act(page,'unknown').click();await page.locator('.feedback').waitFor();assert.equal(await page.locator('.option.correct').count(),1);assert.equal(await page.locator('.option.wrong').count(),0);
 await act(page,'next').click();await stem(page,questions[2]);const wrong3=questions[2].choices.find(c=>c.id!==questions[2].answerId).id;
 await choose(page,wrong3);await act(page,'submit').click();await page.locator('.feedback').waitFor();
 assert.equal(await page.locator('.option.correct').count(),1);assert.equal(await page.locator('.option.wrong').count(),1);assert.equal(await page.locator('.option .status,.feedback .verdict').count(),0);
 const colors=await page.evaluate(()=>({green:getComputedStyle(document.querySelector('.option.correct')).borderColor,red:getComputedStyle(document.querySelector('.option.wrong')).borderColor,redBadge:getComputedStyle(document.querySelector('.option.wrong b')).backgroundColor,redOutline:getComputedStyle(document.querySelector('.option.wrong')).outlineColor}));
 assert.deepEqual(colors,{green:'rgb(34, 134, 58)',red:'rgb(197, 48, 48)',redBadge:'rgb(197, 48, 48)',redOutline:'rgb(197, 48, 48)'});
 await noOverflow(page,'390px wrong answer');await shot(page,'wrong-colors-390');await page.setViewportSize({width:768,height:1024});await noOverflow(page,'768px wrong answer');await shot(page,'wrong-colors-768');
 checks.push('答錯只以綠色正確選項、紅色所選錯項提示，選項字母也同色；解析及讀屏資訊保留');
 await act(page,'next').click();await act(page,'resume-skipped').waitFor();assert.ok((await page.locator('main').innerText()).includes('跳過 1 題'));await shot(page,'skipped-summary-768');
 await act(page,'resume-skipped').click();await stem(page,questions[0]);assert.equal(await page.locator('[data-choice="'+wrong+'"]').getAttribute('aria-pressed'),'true');
 await choose(page,questions[0].answerId);await act(page,'submit').click();await page.locator('.feedback').waitFor();assert.equal(await page.locator('.option.wrong').count(),0);
 await act(page,'next').click();await page.getByRole('heading',{name:'這組練習已完成',exact:true}).waitFor();assert.equal((await events(page)).filter(e=>e.type==='attempt').length,3);
 checks.push('完成頁列出跳過題數，補答恢復原草稿，全部補答後才標完成；暫時不會仍是實際錯答');
 await act(page,'nav').click();await page.locator('.home-primary').waitFor();await resume(page,'legacy-typing');await page.locator('#answer-input').waitFor();
 assert.equal(await page.locator('#answer-input').inputValue(),'保留文字草稿');await act(page,'skip').click();await stem(page,questions[0]);
 assert.equal((await events(page)).filter(e=>e.type==='attempt'&&e.payload.sessionId==='legacy-typing').length,0);
 checks.push('舊文字自查題亦可跳過，文字草稿保留且不產生待自查或錯答');
 const daily=await fixture('skip-daily-fixture',[settings,sessionEvent(session('daily','daily'))]);
 await act(daily.page,'resume').click();await stem(daily.page,questions[0]);
 for(let i=0;i<3;i++){await act(daily.page,'skip').click();if(i<2)await stem(daily.page,questions[i+1]);else await act(daily.page,'resume-skipped').waitFor();}
 assert.equal(dailyProgress(project(await events(daily.page)),day).done,0);await noOverflow(daily.page,'390px all skipped summary');await shot(daily.page,'all-skipped-390');
 const backup={format:'wenyan-backup-v1',userId:daily.auth.user.id,events:await events(daily.page)};assert.equal(validateBackup(backup,daily.auth.user.id).length,backup.events.length);
 await act(daily.page,'nav').click();await daily.page.locator('.home-primary').waitFor();await daily.page.reload();await act(daily.page,'resume').click();await stem(daily.page,questions[0]);
 for(let i=0;i<3;i++){await choose(daily.page,questions[i].answerId);await act(daily.page,'submit').click();await daily.page.locator('.feedback').waitFor();await act(daily.page,'next').click();if(i<2)await stem(daily.page,questions[i+1]);else await daily.page.getByRole('heading',{name:'這組練習已完成',exact:true}).waitFor();}
 assert.equal(dailyProgress(project(await events(daily.page)),day).done,3);
 checks.push('每日訓練全跳過不增加今日進度、不標完成；有效備份保留，重载接續補答後才計入目標');
 const failures=questions.map(q=>({id:'wrong/'+q.id,type:'attempt',createdAt:now,payload:{memoryId:q.memoryId,questionId:q.id,questionVersion:q.version,question:q,submittedAt:now,day,mode:'choice',answer:'暫時不會',correct:false,trainingPolicy:2,practiceKind:'daily',sessionId:'previous'}}));
 const retry=await fixture('skip-retry-fixture',[settings,...failures,sessionEvent(session('retry','retry'))]);
 await act(retry.page,'retry-today').click();await stem(retry.page,questions[0]);await act(retry.page,'skip').click();await stem(retry.page,questions[1]);await act(retry.page,'pause').click();await retry.page.locator('.home-primary').waitFor();await retry.page.reload();await act(retry.page,'retry-today').click();await stem(retry.page,questions[1]);
 await act(retry.page,'skip').click();await stem(retry.page,questions[2]);await act(retry.page,'skip').click();await act(retry.page,'resume-skipped').waitFor();assert.equal(dailyProgress(project(await events(retry.page)),day).retries,0);
 await act(retry.page,'resume-skipped').click();await stem(retry.page,questions[0]);
 checks.push('錯題回練跳過及重載保留位置，全跳過可補答；不增加回練次數或消耗回練資格');
 await assertEventually(async()=>{const response=await fetch(origin+'/api/sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth.token},body:JSON.stringify({events:[]})});const data=await response.json();return data.events.some(e=>e.type==='session'&&e.payload.session.id==='extra'&&e.payload.session.completed);},'session backed up');
 const other=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await other.addInitScript(auth=>localStorage.setItem('wenyan-auth-v1',JSON.stringify({token:auth.token,user:auth.user})),daily.auth);const otherPage=await other.newPage();await otherPage.goto(origin);await otherPage.locator('.home-primary').waitFor();
 assert.equal(await otherPage.locator('[data-action=resume][data-session=daily]').count(),0);await other.close();
 checks.push('隔離帳號資料同步至本機測試服務，另一瀏覽器儲存空間讀回完成狀態');
 assert.deepEqual(errors,[]);await writeFile(new URL('browser-result.json',out),JSON.stringify({passed:true,uiVersion:'2026.10.03.1',checks,colors,browserErrors:errors,localOnly:true,syntheticAccounts:3,realDeviceAcceptance:false},null,2));console.log(JSON.stringify({passed:true,checks:checks.length,colors}));
 await context.close();await daily.context.close();await retry.context.close();
}catch(error){await writeFile(new URL('browser-error.json',out),JSON.stringify({error:error.stack,checks,errors},null,2));throw error;}
finally{await browser?.close();await new Promise(resolve=>app.server.close(resolve));app.close();}
