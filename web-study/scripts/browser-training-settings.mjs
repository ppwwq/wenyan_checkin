import {chromium} from 'file:///C:/Users/philip/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {createApp} from '../backend/server.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const out=new URL('../verification/training-settings-2026-09-24/',import.meta.url);
await mkdir(out,{recursive:true});
const app=createApp({databasePath:':memory:',bootstrapInvite:'local-settings-test'});
await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+app.server.address().port;
const bank=JSON.parse(await readFile(new URL('../content/bank.json',import.meta.url),'utf8'));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:768,height:1024}}),page=await context.newPage();
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const act=(a)=>page.locator('[data-action="'+a+'"]').filter({visible:true}).first();
const settings=async(chapter,type,count,appendix=false)=>{
 await page.locator('#training-form').waitFor();
 for(const checkbox of await page.locator('[data-training-essay]').all())await checkbox.uncheck();
 if(chapter){await page.locator('[data-training-essay="'+chapter+'"]').check();
 for(const checkbox of await page.locator('[data-training-type][data-chapter="'+chapter+'"]').all())await checkbox.uncheck();
 await page.locator('[data-chapter="'+chapter+'"][data-training-type="'+type+'"]').check();}
 await page.locator('[name="appendix"]').setChecked(appendix);
 await page.locator('#daily-count').fill(String(count));
 await page.locator('#training-form button[type=submit]').click();
 await page.locator('.start-countdown').waitFor();
};
const current=async()=>{await page.locator('.answer-panel h2').waitFor();const stem=await page.locator('.answer-panel h2').innerText();const q=bank.questions.find(q=>q.stem===stem);assert.ok(q);return q;};
try{
 const register=await fetch(origin+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'settings-student',password:'local-password-123',inviteCode:'local-settings-test'})});assert.equal(register.status,201);
 await page.goto(origin);await page.locator('[name=username]').fill('settings-student');await page.locator('[name=password]').fill('local-password-123');await page.locator('#auth-form button[type=submit]').click();
 await settings('essay-01','vocabulary',3);await act('daily-start').click();
 const answered=await current();await page.locator('[data-choice="'+answered.answerId+'"]').click();await act('submit').click();await page.locator('.feedback').waitFor();await act('next').click();
 const oldPending=await current();await page.locator('[data-choice]').first().click();await act('pause').click();await act('training-settings').click();
 await settings('essay-09','theme',5);await act('resume').click();
 const updated=await current();assert.deepEqual(updated.essayIds,['essay-09'],'Removed chapter must not remain in the active question');assert.equal(updated.ability,'theme');assert.notEqual(updated.id,oldPending.id);
 assert.match(await page.locator('.session-meta').innerText(),/2\s*\/\s*5/);checks.push('Saved chapter, question type and daily count apply to the unfinished session immediately');
 await act('pause').click();assert.match(await page.locator('.home-details').innerText(),/1／5/);await act('resume').click();
 const selected=await page.locator('[data-choice]').first().getAttribute('data-choice');await page.locator('[data-choice]').first().click();await act('pause').click();await act('training-settings').click();
 await settings('essay-09','theme',6);await act('resume').click();assert.equal((await current()).id,updated.id);assert.equal(await page.locator('.option.selected').getAttribute('data-choice'),selected);checks.push('Increasing the target preserves the eligible current question and draft');
 await act('pause').click();await act('training-settings').click();await settings('essay-09','theme',1);assert.match(await page.locator('.home-details').innerText(),/1／1/);assert.equal(await act('resume').count(),0);await page.getByText('今日目標已完成',{exact:true}).waitFor();checks.push('Lowering the goal to completed progress removes stale pending questions');
 await act('training-settings').click();await settings('essay-09','theme',4);await act('daily-start').click();assert.deepEqual((await current()).essayIds,['essay-09']);await act('pause').click();
 await page.locator('[data-action="nav"][data-page="account"]').filter({visible:true}).first().click();await act('sync').click();await page.waitForFunction(()=>document.querySelector('#sync-status')?.textContent==='已備份');
 await page.locator('[data-action="nav"][data-page="history"]').filter({visible:true}).first().click();assert.equal(await page.locator('.saved-row').count(),1);assert.equal(await page.locator('.saved-row h3').innerText(),answered.stem);checks.push('Submitted answer and history survive scope and target changes');
 const second=await browser.newContext({viewport:{width:390,height:844}});
 try{
  const phone=await second.newPage();phone.on('pageerror',e=>errors.push(e.message));await phone.goto(origin);await phone.locator('[name=username]').fill('settings-student');await phone.locator('[name=password]').fill('local-password-123');await phone.locator('#auth-form button[type=submit]').click();await phone.locator('.start-countdown').waitFor();
  await phone.locator('[data-action="resume"]').filter({visible:true}).first().click();await phone.locator('.answer-panel h2').waitFor();const syncedStem=await phone.locator('.answer-panel h2').innerText(),synced=bank.questions.find(q=>q.stem===syncedStem);assert.deepEqual(synced.essayIds,['essay-09']);assert.equal(synced.ability,'theme');checks.push('Second browser receives updated settings and unfinished session');
  await phone.locator('[data-action="pause"]').click();await phone.evaluate(()=>navigator.serviceWorker.ready);await second.setOffline(true);await phone.reload();await phone.locator('.start-countdown').waitFor();assert.match(await phone.locator('.home-details').innerText(),/1／4/);await phone.locator('[data-action="resume"]').filter({visible:true}).first().click();await phone.locator('.answer-panel h2').waitFor();assert.equal(await phone.locator('.answer-panel h2').innerText(),syncedStem);assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await phone.screenshot({path:fileURLToPath(new URL('updated-mobile.png',out)),fullPage:true});checks.push('Offline reload preserves the refreshed session and target');
 }finally{await second.close();}
 await page.locator('[data-action="nav"][data-page="home"]').filter({visible:true}).first().click();await act('training-settings').click();await settings(null,null,4,true);await act('resume').click();
 const technique=await current();assert.ok(technique.tags.includes('appendix'));assert.deepEqual(technique.essayIds,[]);await page.locator('[data-choice="'+technique.answerId+'"]').click();await act('submit').click();await page.locator('.feedback').waitFor();await act('next').click();assert.ok((await current()).tags.includes('appendix'));checks.push('Enabling standalone techniques immediately replaces the pending queue with appendix questions');
 await act('pause').click();await act('training-settings').click();await settings('essay-09','theme',4,false);await act('resume').click();assert.deepEqual((await current()).essayIds,['essay-09']);assert.equal((await current()).tags?.includes('appendix')||false,false);await act('pause').click();assert.match(await page.locator('.home-details').innerText(),/2／4/);
 await page.locator('[data-action="nav"][data-page="history"]').filter({visible:true}).first().click();assert.equal(await page.locator('.saved-row').count(),2);assert.ok((await page.locator('.saved-row h3').allTextContents()).includes(technique.stem));checks.push('Disabling standalone techniques removes pending appendix questions and keeps the submitted appendix answer');
 assert.deepEqual(errors,[]);
 await writeFile(new URL('result.json',out),JSON.stringify({result:'PASS',checks,errors,scope:'Isolated local in-memory account; no production records.'},null,2));console.log(JSON.stringify({result:'PASS',checks}));
}catch(error){await writeFile(new URL('failure.json',out),JSON.stringify({result:'FAIL',message:error.message,checks},null,2));throw error;}
finally{await context.close();await browser.close();await new Promise(resolve=>app.server.close(resolve));app.close();}
