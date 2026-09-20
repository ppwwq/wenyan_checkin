import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createApp} from '../backend/server.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'file:///C:/Users/philip/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const bank=JSON.parse(await readFile(new URL('../content/bank.json',import.meta.url),'utf8'));
const baseline=JSON.parse(await readFile(new URL('../../tools/question-bank/mcq-revision/baseline-bank.json',import.meta.url),'utf8'));
const out=new URL('../verification/ui-2026.09.20.2/',import.meta.url);await mkdir(out,{recursive:true});
const app=createApp({databasePath:':memory:',bootstrapInvite:'ui-refresh-local-only'});
await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+app.server.address().port;
let browser,page;const checks=[],errors=[];
const act=a=>page.locator('[data-action="'+a+'"]:visible').first();
const shot=name=>page.screenshot({path:fileURLToPath(new URL(name+'.png',out)),fullPage:true});
const nav=async id=>{await page.locator('nav [data-page="'+id+'"]:visible').first().click();};
const noOverflow=async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label);
async function records(){return page.evaluate(async()=>{
 const auth=JSON.parse(localStorage.getItem('wenyan-auth-v1'));
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('wenyan-study-v1/'+encodeURIComponent(auth.user.id));r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 return new Promise(resolve=>{const r=db.transaction('events').objectStore('events').getAll();r.onsuccess=()=>{db.close();resolve(r.result);};});
});}
async function font(size){
 await act('settings').click();await page.locator('#font-size').selectOption(String(size));
 await page.waitForFunction(value=>Math.abs(parseFloat(getComputedStyle(document.documentElement).fontSize)-16*value/24)<.1,size);
 await page.locator('#settings-form button[type=submit]').click();await page.locator('#dialog').waitFor({state:'hidden'});
 await page.waitForFunction(()=>!navigator.onLine||document.querySelector('#sync-status')?.textContent==='已備份');
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
try{
 const register=async username=>{
  const response=await fetch(origin+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password:'Local-UI-check-only-2026',inviteCode:'ui-refresh-local-only'})});assert.ok(response.ok);return response.json();
 };
 const auth=await register('ui-refresh-fixture');const other=await register('ui-other-fixture');
 const quoted=bank.questions.find(q=>q.responseFormat==='single-choice'&&q.essayIds.length&&q.quote.length>20&&q.quote.length<160);
 const inStem=bank.questions.find(q=>q.responseFormat==='single-choice'&&!q.quote&&q.essayIds.length);
 const old=baseline.questions.find(q=>q.essayIds.length&&q.quote);
 const now=new Date().toISOString();
 const sessions=[{id:'current-choice',questions:[quoted,inStem],index:0,mode:'choice',startedAt:now},{id:'legacy-typing',questions:[old,old,old],index:2,mode:'mixed',startedAt:'2026-09-01T12:00:00Z'}].map(s=>({...s,answers:{},drafts:{},essayIds:[...new Set(s.questions.flatMap(q=>q.essayIds))],completed:false,paused:true,revision:1}));
 const seeded=await fetch(origin+'/api/sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth.token},body:JSON.stringify({events:sessions.map(s=>({id:'fixture/'+s.id,type:'session',createdAt:now,payload:{session:s}}))})});assert.ok(seeded.ok);
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:1024,height:768}});
 await context.addInitScript(auth=>localStorage.setItem('wenyan-auth-v1',JSON.stringify({token:auth.token,user:auth.user})),auth);
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.locator('[data-action=resume][data-session=current-choice]').waitFor();
 assert.equal(await page.title(),'DSE文言练习');
 assert.deepEqual(await page.locator('.nav button').allTextContents(),['首页','练习','记录','我的']);
 assert.deepEqual(await page.locator('.mobile-nav button').allTextContents(),['首页','练习','记录','我的']);
 assert.ok(await page.locator('.home-primary').evaluate(el=>el.getBoundingClientRect().bottom<document.querySelector('.review-group').getBoundingClientRect().top));
 assert.equal(await page.locator('.review-group .home-shortcut').count(),3);
 await shot('home-landscape');await noOverflow('landscape home');
 checks.push('Four navigation destinations, primary start/resume above grouped review tools');
 const originalSize=await page.locator('.start-card h1').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
 await font(32);
 const changedSize=await page.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('.start-card h1')).fontSize));assert.ok(changedSize>originalSize,JSON.stringify({originalSize,changedSize}));
 for(const [width,height] of [[1366,1024],[1024,768],[768,1024],[430,932],[375,667],[844,390]]){
  await page.setViewportSize({width,height});await noOverflow('large text home '+width);
  await nav('library');await page.locator('.library-grid').waitFor();await noOverflow('large text library '+width);
  await nav('account');await noOverflow('large text account '+width);
  await nav('home');await page.locator('.home-primary').waitFor();
 }
 await page.setViewportSize({width:768,height:1024});await shot('home-portrait-large');
 checks.push('Global large text across home, practice setup and account at six landscape/portrait widths');
 await page.locator('[data-action=resume][data-session=current-choice]').click();await page.locator('.options').waitFor();
 assert.equal(await page.locator('.steps,.source-link').count(),0);assert.equal(await page.locator('.source-panel blockquote').textContent(),quoted.quote);
 const wrong=quoted.choices.find(c=>c.id!==quoted.answerId).id;
 await page.locator('[data-choice="'+wrong+'"]').click();await act('favorite').click();
 const stem=await page.locator('.answer-panel h2').textContent();const optionSize=await page.locator('.option>span').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
 await font(20);assert.equal(await page.locator('.answer-panel h2').textContent(),stem);assert.equal(await page.locator('[data-choice="'+wrong+'"]').getAttribute('aria-pressed'),'true');
 assert.ok(await page.locator('.option>span').first().evaluate((el,size)=>parseFloat(getComputedStyle(el).fontSize)<size,optionSize));
 await font(32);
 for(const [width,height] of [[1024,768],[768,1024],[375,667],[844,390]]){await page.setViewportSize({width,height});await noOverflow('large text question '+width);}
 await page.setViewportSize({width:1024,height:768});await shot('practice-landscape-large');
 await act('submit').click();await page.locator('.feedback').waitFor();
 assert.equal(await page.locator('.source-link,a[href*="revision-book"]').count(),0);
 assert.ok(!(await page.locator('main').innerText()).includes('來源定位'));
 await page.getByText('逐項辨析',{exact:true}).click();assert.equal(await page.locator('.choices-explained:visible').count(),4);
 assert.equal((await records()).filter(e=>e.type==='attempt').length,1);
 await shot('answer-landscape-large');
 checks.push('Necessary original text, four options, favorite and answer explanations retained; metadata/steps removed; font changes preserve selected draft');
 await act('next').click();await page.locator('.answer-panel h2').filter({hasText:inStem.stem}).waitFor();assert.equal(await page.locator('.source-panel').count(),0);await noOverflow('in-stem single column');
 await act('pause').click();
 await page.locator('.older-sessions summary').click();await page.locator('[data-action=resume][data-session=legacy-typing]').click();await page.locator('#answer-input').waitFor();
 await page.locator('#answer-input').fill('調整全站字號後，這段原有文字草稿應保留。');await font(28);
 assert.equal(await page.locator('#answer-input').inputValue(),'調整全站字號後，這段原有文字草稿應保留。');
 await page.evaluate(()=>navigator.serviceWorker.ready);await context.setOffline(true);await font(32);
 await page.reload();await page.locator('.home-primary').waitFor();
 assert.equal(await page.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).fontSize).toFixed(2)),'21.33');
 await page.locator('.older-sessions summary').click();await page.locator('[data-action=resume][data-session=legacy-typing]').click();
 assert.equal(await page.locator('#answer-input').inputValue(),'調整全站字號後，這段原有文字草稿應保留。');
 checks.push('Legacy typing draft and global font preference survive offline reload');
 await context.setOffline(false);await act('pause').click();await nav('account');await act('sync').click();
 await page.waitForFunction(()=>document.querySelector('#sync-status')?.textContent==='已備份');
 const device=await browser.newContext({viewport:{width:768,height:1024}});
 await device.addInitScript(auth=>localStorage.setItem('wenyan-auth-v1',JSON.stringify({token:auth.token,user:auth.user})),auth);
 const devicePage=await device.newPage();await devicePage.goto(origin);
 await devicePage.waitForFunction(()=>parseFloat(getComputedStyle(document.documentElement).fontSize)>21);
 await device.close();checks.push('Global font setting synchronizes to a separate browser context');
 await nav('home');await page.locator('[data-action=wrong-practice]').click();assert.equal(await page.locator('#scope').inputValue(),'wrong');
 await nav('home');await page.locator('.home-shortcut[data-page=saved]').click();await page.getByText(quoted.stem,{exact:true}).waitFor();
 await act('saved-quick').click();await page.locator('.quick-card').waitFor();assert.equal(await page.locator('.source-link').count(),0);
 await nav('history');assert.equal(await page.locator('.source-link').count(),0);
 checks.push('Grouped wrong-answer, favorite, quick-review and history flows remain usable without source display');
 await nav('account');await act('logout').click();await page.locator('#auth-form').waitFor();
 await page.locator('[name=username]').fill('ui-other-fixture');await page.locator('[name=password]').fill('Local-UI-check-only-2026');await page.locator('#auth-form button[type=submit]').click();await page.locator('.home-primary').waitFor();
 assert.equal(await page.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).fontSize)),16);
 assert.equal(await page.locator('[data-action=resume]').count(),0);checks.push('A different account retains its own default font and no prior sessions');
 const manifest=await (await context.request.get(origin+'/manifest.webmanifest')).json();assert.equal(manifest.name,'DSE文言练习');
 for(const icon of manifest.icons){assert.equal((await context.request.get(origin+icon.src)).status(),200);}
 assert.equal((await context.request.get(origin+'/assets/apple-touch-icon.png')).status(),200);
 checks.push('New application name, SVG/PNG/maskable and Apple touch icons resolve');
 assert.deepEqual(errors,[]);
 await writeFile(new URL('browser-result.json',out),JSON.stringify({result:'PASS',checks,pageErrors:errors,scope:'Isolated in-memory accounts and Chromium viewports; no production account writes or physical iPad Safari acceptance.'},null,2)+'\n');
 console.log(JSON.stringify({result:'PASS',checks,pageErrors:errors},null,2));await context.close();
}catch(error){if(page)await shot('failure');throw error;}
finally{await browser?.close();await new Promise(resolve=>app.server.close(resolve));app.close();}
