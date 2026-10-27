import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createApp} from '../backend/server.mjs';
import {hkDay,project} from '../src/domain/review.mjs';
import {dailyProgress,trainingOptions} from '../src/domain/training.mjs';
import {isTypingVocabulary} from '../src/domain/answer-mode.mjs';
import {validateBackup} from '../src/storage/backup.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'file:///C:/Users/philip/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const bank=JSON.parse(await readFile(new URL('../content/bank.json',import.meta.url),'utf8'));
const vocab=bank.questions.filter(q=>isTypingVocabulary(q)&&q.essayIds.length===1&&q.essayIds[0]==='essay-01');
const q=vocab[0],other=vocab[1],now=new Date().toISOString(),day=hkDay();
const plan={version:1,chapters:{'essay-01':['vocabulary']},dailyCount:1,appendix:false,retry:true,vocabularyTyping:false};
const out=new URL('../verification/typing-daily-2026-10-23/',import.meta.url);await mkdir(out,{recursive:true});
const app=createApp({databasePath:':memory:',bootstrapInvite:'typing-local-only'});
await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+app.server.address().port,checks=[],errors=[],contexts=[];
let browser;
const session=(id,p=plan)=>({id,kind:'daily',selection:trainingOptions(p),targetCount:1,skippedIds:[],questions:[q],index:0,answers:{},drafts:{},mode:'choice',vocabularyTyping:p.vocabularyTyping,essayIds:['essay-01'],completed:false,paused:true,startedAt:now,revision:1,trainingSnapshot:p,goalDay:day,goalSnapshot:1});
async function open(auth,width=390){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});contexts.push(context);
 await context.addInitScript(auth=>localStorage.setItem('wenyan-auth-v1',JSON.stringify({token:auth.token,user:auth.user})),auth);
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.locator('.home-primary').waitFor();return {page,context,auth};
}
async function fixture(name,p=plan,s=session(name,p)){
 const response=await fetch(origin+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:name,password:'Local-Typing-Check-2026',inviteCode:'typing-local-only'})});assert.ok(response.ok);const auth=await response.json();
 const events=[{id:'settings',type:'settings',createdAt:now,payload:{training:p,dailyGoal:{day,count:p.dailyCount}}},{id:'fixture',type:'session',createdAt:now,payload:{session:s}}];
 const seeded=await fetch(origin+'/api/sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth.token},body:JSON.stringify({events})});assert.ok(seeded.ok,await seeded.text());return open(auth);
}
const act=(page,a)=>page.locator('[data-action="'+a+'"]:visible').first();
async function events(page){return page.evaluate(async()=>{
 const auth=JSON.parse(localStorage.getItem('wenyan-auth-v1'));
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('wenyan-study-v1/'+encodeURIComponent(auth.user.id));r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 return new Promise((resolve,reject)=>{const r=db.transaction('events').objectStore('events').getAll();r.onsuccess=()=>{db.close();resolve(r.result);};r.onerror=()=>reject(r.error);});
});}
async function eventually(fn,label){const until=Date.now()+12000;while(Date.now()<until){if(await fn())return;await new Promise(r=>setTimeout(r,40));}throw new Error(label);}
async function resume(page){await act(page,'resume').click();await page.locator('#answer-panel').waitFor();}
async function setTyping(page,enabled){
 if(await act(page,'pause').count()){await act(page,'pause').click();await page.locator('.home-primary').waitFor();}
 await act(page,'training-settings').click();await page.locator('#training-form').waitFor();await page.locator('[name=vocabularyTyping]').setChecked(enabled);
 await page.locator('#training-form button[type=submit]').click();await page.locator('.home-primary').waitFor();
}
async function choose(page,id){const n=(await events(page)).length;await page.locator('[data-choice="'+id+'"]').click();await eventually(async()=>(await events(page)).length>n,'choice draft saved');}
async function assess(page,correct){await page.locator('#check-meaning').check();await page.locator('#check-context').check();await act(page,correct?'assess-good':'assess-bad').click();await act(page,'next').waitFor();}
async function sync(page){await page.locator('[data-action=nav][data-page=account]:visible').first().click();await act(page,'sync').click();await eventually(async()=>!(await page.locator('#sync-status').innerText()).includes('正在'),'sync finished');}
async function shot(page,name){await page.screenshot({path:new URL(name+'.png',out).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});}
async function noOverflow(page,label){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label);}
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const first=await fixture('typing-main'),page=first.page;
 assert.equal(await page.locator('[data-action=typing-start]').count(),0);
 await resume(page);assert.equal(await page.locator('#answer-input').count(),0);await choose(page,'b');
 await setTyping(page,true);await resume(page);assert.equal(await page.locator('#answer-input').inputValue(),'');assert.equal(await page.locator('.option').count(),0);
 await page.locator('#answer-input').fill('一旦');await setTyping(page,false);await resume(page);assert.equal(await page.locator('[data-choice=b]').getAttribute('aria-pressed'),'true');
 await setTyping(page,true);await resume(page);assert.equal(await page.locator('#answer-input').inputValue(),'一旦');
 await act(page,'pause').click();await page.reload();await page.locator('.home-primary').waitFor();await resume(page);assert.equal(await page.locator('#answer-input').inputValue(),'一旦');
 await noOverflow(page,'390 typing');await shot(page,'typing-390');
 checks.push('日常設定可開關；預設選擇題；雙向切換及重載恢復各自草稿；無獨立入口');
 await act(page,'submit').click();await page.locator('.self-check').waitFor();assert.equal(await act(page,'next').count(),0);await noOverflow(page,'390 self-check');await shot(page,'self-check-390');
 await act(page,'pause').click();await sync(page);
 const second=await open(first.auth,768),page2=second.page;await resume(page2);await page2.locator('.self-check').waitFor();assert.equal(await page2.locator('.answer-saved').innerText(),'一旦');
 await setTyping(page2,false);await resume(page2);await page2.locator('.self-check').waitFor();await assess(page2,false);await act(page2,'next').click();await page2.getByRole('heading',{name:'這組練習已完成',exact:true}).waitFor();
 assert.equal(dailyProgress(project(await events(page2))).done,1);
 await act(page2,'nav').click();await page2.locator('.home-primary').waitFor();await setTyping(page2,true);
 await act(page2,'retry-today').click();await page2.locator('#answer-input').waitFor();await act(page2,'unknown').click();await act(page2,'next').waitFor();assert.equal(await page2.locator('.self-check').count(),0);
 await act(page2,'next').click();await page2.getByRole('heading',{name:'這組練習已完成',exact:true}).waitFor();
 const saved=await events(page2),projected=project(saved);assert.equal(dailyProgress(projected).done,1);assert.equal(dailyProgress(projected).retries,1);
 assert.equal(saved.filter(e=>e.type==='attempt').length,2);assert.equal(saved.filter(e=>e.type==='assessment').length,2);
 validateBackup({format:'wenyan-backup-v1',userId:first.auth.user.id,events:saved},first.auth.user.id);
 checks.push('提交後自查、跨瀏覽器同步、關閉打字後仍保留待自查答案；錯題回練及暫時不會；不重複計進度；備份通過');
 await act(page2,'nav').click();await setTyping(page2,true);await act(page2,'training-settings').click();await noOverflow(page2,'768 settings');await shot(page2,'settings-768');
 await page2.setViewportSize({width:390,height:844});await noOverflow(page2,'390 settings');await page2.locator('[name=vocabularyTyping]').scrollIntoViewIfNeeded();await shot(page2,'settings-390');
 const on={...plan,vocabularyTyping:true},skipSession=session('typing-skip',on);skipSession.selection.questionIds=[q.id,other.id];skipSession.drafts[q.id]='跳過前的詞義';
 const skip=await fixture('typing-skip',on,skipSession);await resume(skip.page);await act(skip.page,'skip').click();await eventually(async()=>(await skip.page.locator('#question-title').innerText())===other.stem,'replacement');
 assert.equal((await events(skip.page)).filter(e=>e.type==='attempt').length,0);await skip.page.locator('#answer-input').fill('歸向仁德');await act(skip.page,'pause').click();await skip.page.reload();await skip.page.locator('.home-primary').waitFor();await resume(skip.page);assert.equal(await skip.page.locator('#answer-input').inputValue(),'歸向仁德');
 await act(skip.page,'submit').click();await skip.page.locator('.self-check').waitFor();await assess(skip.page,true);await act(skip.page,'next').click();await skip.page.getByRole('heading',{name:'這組練習已完成',exact:true}).waitFor();
 await act(skip.page,'retry-skipped').click();assert.equal(await skip.page.locator('#answer-input').inputValue(),'跳過前的詞義');
 checks.push('打字跳過不計作答；補新題；暫停重載保留草稿；補答跳過題沿用打字和原草稿');
 // The regular daily start path also adopts the setting, not just resumed sessions.
 const freshPlan={...on,chapters:{'essay-11':['vocabulary']}};
 const fresh=await fixture('typing-fresh',freshPlan,{...session('done',freshPlan),completed:true});await act(fresh.page,'daily-start').click();
 await fresh.page.locator('#answer-input').waitFor();await act(fresh.page,'pause').click();await act(fresh.page,'extra').click();await act(fresh.page,'start').click();await fresh.page.locator('.option').first().waitFor();assert.equal(await fresh.page.locator('#answer-input').count(),0);
 checks.push('新開始的每日題組套用打字；普通自選選擇題及來源題格式維持；390／768px無橫向溢出');
 assert.deepEqual(errors,[]);await writeFile(new URL('browser-result.json',out),JSON.stringify({result:'PASS',checks,errors,scope:'Local in-memory SQLite and isolated Chromium accounts; no production changes or real-device acceptance.'},null,2));console.log(JSON.stringify({result:'PASS',checks}));
}catch(error){await writeFile(new URL('browser-error.json',out),JSON.stringify({message:error.message,stack:error.stack,errors},null,2));throw error;}
finally{for(const context of contexts)await context.close();await browser?.close();await new Promise(resolve=>app.server.close(resolve));app.close();}
