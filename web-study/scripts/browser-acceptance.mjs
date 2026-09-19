import {chromium} from 'file:///C:/Users/philip/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const origin='http://127.0.0.1:8787',out=new URL('../verification/',import.meta.url),creds=JSON.parse(await fs.readFile(new URL('../backend/data/qa-browser.json',import.meta.url),'utf8'));
const bank=JSON.parse(await fs.readFile(new URL('../content/bank.json',import.meta.url),'utf8'));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const ctx=await browser.newContext({viewport:{width:1366,height:1024}}),page=await ctx.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
const act=a=>page.locator('[data-action="'+a+'"]').filter({visible:true}).first();
const nav=async name=>{await page.locator('.nav [data-page="'+name+'"]').click();await page.waitForTimeout(120);};
const shot=async name=>page.screenshot({path:fileURLToPath(new URL(name+'.png',out)),fullPage:true});
const records=async()=>page.evaluate(async()=>{const auth=JSON.parse(localStorage.getItem('wenyan-auth-v1'));const db=await new Promise((ok,no)=>{const r=indexedDB.open('wenyan-study-v1/'+encodeURIComponent(auth.user.id));r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});return await new Promise(ok=>{const r=db.transaction('events').objectStore('events').getAll();r.onsuccess=()=>{db.close();ok(r.result)};});});
const pause=ms=>page.waitForTimeout(ms);
try{
await page.goto(origin);await page.locator('[name=username]').fill(creds.username);await page.locator('[name=password]').fill(creds.password);await page.locator('#auth-form button[type=submit]').click();await page.locator('.hero').waitFor();
await act('settings').click();await page.locator('#typing').check();await page.locator('#settings-form button[type=submit]').click();await page.locator('#dialog').waitFor({state:'hidden'});
await nav('library');await act('select-none').click();await pause(100);
for(const id of ['essay-01','essay-09','essay-11']){await page.locator('[data-essay="'+id+'"]').check();await pause(100);}
await page.locator('#question-count').fill('3');await page.locator('#question-count').press('Tab');await pause(150);
const colors=await act('start').evaluate(el=>({foreground:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor}));assert.notEqual(colors.foreground,colors.background);checks.push('primary action has visible foreground/background contrast');await shot('library');await act('start').click();await page.locator('.options').waitFor();
assert.equal(await page.locator('a[href*="revision-book"]').count(),0);checks.push('submission hides answer source');
const stem=await page.locator('.answer-panel h2').innerText(),q=bank.questions.find(q=>q.stem===stem),wrong=q.choices.find(c=>c.id!==q.answerId).id;
await page.locator('[data-choice="'+wrong+'"]').click();await pause(100);await act('favorite').click();await pause(100);
assert.equal(await page.locator('[data-choice="'+wrong+'"]').getAttribute('aria-pressed'),'true');
await act('pause').click();await act('resume').click();await page.locator('[data-choice="'+wrong+'"][aria-pressed=true]').waitFor();checks.push('favorite and pause preserve selected draft');
await page.reload();await page.locator('.hero').waitFor();await act('resume').click();await page.locator('[data-choice="'+wrong+'"][aria-pressed=true]').waitFor();checks.push('refresh restores fixed question and answer draft');
await act('submit').click();await page.locator('.feedback').waitFor();await shot('feedback');assert.equal((await records()).filter(e=>e.type==='attempt').length,1);checks.push('choice submit saved once');
await act('report').click();await page.locator('#report-form textarea').fill('自動驗收：請核對此題來源頁碼。');await page.locator('#report-form button[type=submit]').click();await pause(300);
await act('next').click();await page.locator('.options').waitFor();await page.locator('[data-choice]').first().click();await pause(80);await act('submit').click();await page.locator('.feedback').waitFor();await act('next').click();await page.locator('#answer-input').waitFor();
await page.evaluate(()=>navigator.serviceWorker.ready);await ctx.setOffline(true);
await page.locator('#answer-input').fill('這是離線保存的完整自查答案。');await pause(150);await page.reload();await page.locator('.hero').waitFor();await act('resume').click();await page.locator('#answer-input').waitFor();assert.equal(await page.locator('#answer-input').inputValue(),'這是離線保存的完整自查答案。');checks.push('offline reload preserves latest per-keystroke typing draft');await act('submit').click();await page.locator('.self-check').waitFor();await act('assess-good').click();assert.equal((await records()).filter(e=>e.type==='assessment').length,0);checks.push('typing requires both self-checks');
await page.locator('#check-meaning').check();await page.locator('#check-context').check();await act('assess-bad').click();await act('next').waitFor();await shot('typing');
await act('next').click();await page.locator('.metric-grid').waitFor();checks.push('offline typing and self assessment complete');
await page.reload();await page.locator('.hero').waitFor();checks.push('offline refresh opens cached app');await ctx.setOffline(false);
await nav('account');await act('sync').click();await page.waitForFunction(()=>document.querySelector('#sync-status')?.textContent==='已備份');
assert.equal((await records()).filter(e=>e.pending).length,0);checks.push('offline IndexedDB records backed up with acknowledgments');
await nav('weakness');await shot('weakness');assert.ok((await page.locator('main').innerText()).includes('待鞏固'));checks.push('weakness displays first-result evidence');
await nav('saved');assert.ok(await act('favorite').count());checks.push('favorite list is real');
const before=(await records()).filter(e=>e.type==='attempt').length;
await act('saved-quick').click();await page.locator('.quick-card').waitFor();await act('quick-seen').click();assert.equal((await records()).filter(e=>e.type==='attempt').length,before);checks.push('quick review never creates answer');
await nav('account');await page.locator('[data-page=reports]').filter({visible:true}).click();await pause(100);assert.equal(await page.locator('.saved-row').count(),1);checks.push('report local/server deduplication');
await pause(4600);await page.setViewportSize({width:768,height:1024});await page.locator('.mobile-nav [data-page=library]').click();await pause(100);await shot('ipad-portrait');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks.push('portrait has no horizontal page overflow');
await page.setViewportSize({width:430,height:932});await shot('narrow');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks.push('split-screen/narrow has no horizontal page overflow');
assert.deepEqual(errors,[]);checks.push('no browser page errors');
console.log(JSON.stringify({status:'PASS',checks,errors}));
await fs.writeFile(new URL('browser-result.json',out),JSON.stringify({status:'PASS',checks,errors},null,2));
}catch(e){console.error(e);console.log(JSON.stringify({status:'FAIL',checks,errors}));await shot('failure');process.exitCode=1;}finally{await browser.close();}

