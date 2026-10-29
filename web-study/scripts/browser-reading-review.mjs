import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createApp} from '../backend/server.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'file:///C:/Users/philip/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out=new URL('../verification/reading-review-2026-10-29/',import.meta.url);
await mkdir(out,{recursive:true});
const app=createApp({databasePath:':memory:',bootstrapInvite:'reading-local-only'});
await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+app.server.address().port,errors=[],checks=[];
let browser;
const action=(page,name)=>page.locator('[data-action="'+name+'"]:visible').first();
const navigation=(page,to)=>page.locator('[data-action="nav"][data-page="'+to+'"]:visible').first();
async function stored(page){return page.evaluate(async()=>{
 const auth=JSON.parse(localStorage.getItem('wenyan-auth-v1'));
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('wenyan-study-v1/'+encodeURIComponent(auth.user.id));r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 return new Promise((resolve,reject)=>{const r=db.transaction('events').objectStore('events').getAll();r.onsuccess=()=>{db.close();resolve(r.result);};r.onerror=()=>reject(r.error);});
});}
async function screenshot(page,name){
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow: '+name);
 await page.screenshot({path:fileURLToPath(new URL(name+'.png',out)),fullPage:true});
}
async function selectReading(page,ids){
 const scope=page.locator('.review-reading-scope');
 if(!await scope.evaluate(el=>el.open))await scope.locator('summary').click();
 await action(page,'reading-scope-none').click();
 await page.getByText('請先選擇篇章。',{exact:true}).waitFor();
 assert.equal(await page.locator('.review-reading-item').count(),0);
 for(let index=0;index<ids.length;index++){
  await page.locator('[data-reading-essay="'+ids[index]+'"]').check();
  await page.waitForFunction(count=>document.querySelector('.review-reading-scope summary')?.textContent.includes('已選 '+count+' 篇'),index+1);
 }
 await scope.locator('summary').click();
}
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000},serviceWorkers:'block'});
  const response=await fetch(origin+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'reading-'+width,password:'Local-Reading-Check-2026',inviteCode:'reading-local-only'})});
  assert.ok(response.ok);const auth=await response.json();
  const settings={id:'settings',type:'settings',createdAt:new Date().toISOString(),payload:{training:{version:1,chapters:{'essay-01':['vocabulary']},dailyCount:5,appendix:false,retry:true,studyPool:'default'}}};
  assert.ok((await fetch(origin+'/api/sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth.token},body:JSON.stringify({events:[settings]})})).ok);
  await context.addInitScript(auth=>localStorage.setItem('wenyan-auth-v1',JSON.stringify(auth)),auth);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.locator('.home-primary').waitFor();
  await navigation(page,'review').click();await page.locator('.review-hall-grid').waitFor();await screenshot(page,width+'-hall');
  await page.locator('[data-action="review-read"][data-type="meaning"]').click();
  await selectReading(page,['essay-01']);
  assert.equal(await page.locator('.review-reading-item').first().locator('.review-choices li').count(),4);
  assert.ok(await page.locator('.review-reading-item .card-answer').first().innerText());
  await action(page,'review-reading-page').click();
  assert.match(await page.locator('.review-reading-pages').first().innerText(),/第 2/);
  await navigation(page,'review').click();
  await page.locator('[data-action="review-read"][data-type="flex"]').click();
  await selectReading(page,['essay-01','essay-05']);
  await page.getByText('《廉頗藺相如列傳》',{exact:true}).first().waitFor();
  assert.ok(await page.locator('.review-reading-item .card-answer').count());
  assert.equal(await page.locator('textarea').count(),0);
  const shame=page.locator('.review-reading-item').filter({has:page.getByRole('heading',{name:'按上下文解釋標示的「羞」。',exact:true})});
  assert.equal(await shame.locator('.reading-translation>p').innerText(),'況且相如本來是出身卑賤的人，我感到（被）羞辱');
  await screenshot(page,width+'-direct-reading');
  await page.locator('.review-reading-scope summary').click();await screenshot(page,width+'-chapter-scope');
  await navigation(page,'review').click();
  await page.locator('[data-action="review-read"][data-type="meaning"]').click();
  assert.deepEqual(await page.locator('[data-reading-essay]:checked').evaluateAll(inputs=>inputs.map(i=>i.dataset.readingEssay)),['essay-01','essay-05']);
  await page.reload();await page.locator('.home-primary').waitFor();
  await navigation(page,'review').click();await page.locator('[data-action="review-read"][data-type="flex"]').click();
  assert.deepEqual(await page.locator('[data-reading-essay]:checked').evaluateAll(inputs=>inputs.map(i=>i.dataset.readingEssay)),['essay-01','essay-05']);
  const before=await stored(page);assert.equal(before.filter(e=>['attempt','written'].includes(e.type)).length,0);
  await navigation(page,'review').click();
  await page.locator('.review-type-card').filter({has:page.getByRole('heading',{name:'詞類活用',exact:true})}).locator('[data-action="sheet-start"]').click();
  await page.locator('#written-answer').waitFor();
  assert.match(await page.locator('.written-panel .question-tag').innerText(),/論仁、論孝、論君子/);
  assert.equal(await page.locator('.written-panel>blockquote mark').count(),3);
  assert.ok((await page.locator('.written-panel>blockquote').innerText()).length<45);
  assert.match(await page.locator('.written-panel>blockquote').innerText(),/事之以禮/);
  await screenshot(page,width+'-typing-before');
  await action(page,'written-reveal').click();await page.locator('#written-feedback').waitFor();
  assert.equal(await page.locator('#written-checked').count(),0);
  assert.equal(await page.locator('.feedback>.toolbar button').count(),2);
  assert.match(await page.locator('.reading-translation').innerText(),/依禮侍奉/);
  assert.equal((await stored(page)).filter(e=>e.type==='written'&&e.payload.action==='submit').length,0);
  await screenshot(page,width+'-answer-revealed');
  await action(page,'sheet-next').click();await page.locator('#written-answer').waitFor();
  assert.equal((await stored(page)).filter(e=>e.type==='written'&&e.payload.action==='submit').length,0);
  // The next flex item is the short 刃 example from the user's third screenshot.
  assert.match(await page.locator('.written-panel .question-tag').innerText(),/廉頗藺相如列傳/);
  assert.equal(await page.locator('.written-panel>blockquote mark').innerText(),'刃');
  await page.locator('#written-answer').fill('殺');await action(page,'written-submit').click();
  await page.locator('#written-feedback').waitFor();
  assert.match(await page.locator('.reading-translation').innerText(),/秦王左右侍衞想殺相如/);
  await screenshot(page,width+'-submitted-answer');
  await action(page,'written-unknown-next').click();await page.locator('#written-answer').waitFor();
  const after=await stored(page);assert.equal(after.filter(e=>e.type==='written'&&e.payload.action==='submit').length,1);
  assert.equal(after.filter(e=>e.type==='written'&&e.payload.action==='self'&&e.payload.outcome==='revisit').length,1);
  assert.equal(after.filter(e=>e.type==='attempt').length,0);
  // Directly revealing and marking unknown creates one explicit unknown attempt.
  await action(page,'written-reveal').click();await action(page,'written-unknown-next').click();await page.locator('#written-answer').waitFor();
  const unknown=await stored(page);assert.equal(unknown.filter(e=>e.type==='written'&&e.payload.action==='submit'&&e.payload.answer==='暫時不會').length,1);
  checks.push(width+'px: direct reading/multi-essay scope/clear/reload retention/pagination; short original and source translation including 羞; three 以 marks/essay title; reveal and skip add no attempts; submit + unknown advances and preserves revisit; no assessment checkbox or MCQ attempt');
  await context.close();
 }
 if(process.argv[2]){
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
  await page.goto(process.argv[2]);await page.locator('.home-primary').waitFor();
  await navigation(page,'review').click();await page.locator('[data-action="review-read"]').first().waitFor();
  checks.push('Built local preview: automatic isolated sign-in and direct reading entry are usable');
  await context.close();
 }
 assert.deepEqual(errors,[]);
 await writeFile(new URL('result.json',out),JSON.stringify({result:'PASS',checks,errors,scope:'Local in-memory SQLite and isolated Chromium accounts; no production accounts, deployment or real-device verification.'},null,2));
 console.log(JSON.stringify({result:'PASS',checks,errors}));
}catch(error){await writeFile(new URL('error.json',out),JSON.stringify({message:error.message,stack:error.stack,errors},null,2));throw error;}
finally{await browser?.close();await new Promise(resolve=>app.server.close(resolve));app.close();}
