import {chromium} from 'file:///C:/Users/philip/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const origin='http://127.0.0.1:8787',out=new URL('../verification/',import.meta.url),creds=JSON.parse(await fs.readFile(new URL('../backend/data/qa-browser.json',import.meta.url),'utf8'));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const ctx=await browser.newContext({viewport:{width:1366,height:1024}}),page=await ctx.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
const act=a=>page.locator('[data-action="'+a+'"]').filter({visible:true}).first();
const nav=async name=>{await page.locator('.nav [data-page="'+name+'"]').click();await page.waitForTimeout(100);};
const login=async(u,p)=>{await page.locator('[name=username]').fill(u);await page.locator('[name=password]').fill(p);await page.locator('#auth-form button[type=submit]').click();await page.locator('.hero').waitFor();};
const raw=async()=>{const auth=JSON.parse(await page.evaluate(()=>localStorage.getItem('wenyan-auth-v1')));return (await ctx.request.post(origin+'/api/sync',{headers:{Authorization:'Bearer '+auth.token},data:{events:[]}})).json();};
try{
await page.goto(origin);await login(creds.username,creds.password);const before=await raw();assert.equal(before.events.filter(e=>e.type==='attempt').length,3);
await nav('account');await act('logout').click();await page.locator('[data-mode=register]').click();
const u='測試同學'+Date.now();await page.locator('[name=username]').fill(u);await page.locator('[name=inviteCode]').fill('qa-local-study-20260919');await page.locator('[name=password]').fill('Second-Local-Password');await page.locator('#auth-form button[type=submit]').click();await page.locator('#dialog[open]').waitFor();
const recovery=await page.locator('#dialog .answer-saved').innerText();await act('close-dialog').click();assert.equal((await raw()).events.length,0);
await nav('saved');assert.ok((await page.locator('main').innerText()).includes('還沒有收藏'));await nav('history');assert.ok((await page.locator('main').innerText()).includes('還沒有作答記錄'));checks.push('real browser account switch isolates records, favorites and drafts');
await nav('account');await act('logout').click();await page.locator('[data-mode=recover]').click();await page.locator('[name=username]').fill(u);await page.locator('[name=recoveryCode]').fill(recovery);await page.locator('[name=password]').fill('Recovered-Local-Password');await page.locator('#auth-form button[type=submit]').click();await page.locator('#dialog[open]').waitFor();assert.notEqual(await page.locator('#dialog .answer-saved').innerText(),recovery);await act('close-dialog').click();checks.push('recovery UI issues replacement one-time code');
await nav('account');await act('logout').click();await page.locator('[data-mode=login]').click();await login(creds.username,creds.password);await nav('history');assert.equal(await page.locator('.saved-row').count(),3);checks.push('original account restores historical answers from server');
const auth=JSON.parse(await page.evaluate(()=>localStorage.getItem('wenyan-auth-v1')));
let admin=await (await ctx.request.post(origin+'/api/auth/register',{data:{username:'teacher',password:'Teacher-QA-Password',inviteCode:'qa-local-teacher-20260919'}})).json();
if(!admin.token)admin=await (await ctx.request.post(origin+'/api/auth/login',{data:{username:'teacher',password:'Teacher-QA-Password'}})).json();
assert.ok(admin.token);const ah={Authorization:'Bearer '+admin.token};
const reports=await (await ctx.request.get(origin+'/api/admin/reports',{headers:ah})).json();
const report=reports.reports.find(r=>r.username===creds.username),attempt=before.events.find(e=>e.type==='attempt'&&e.payload.questionId===report.questionId);assert.equal(attempt.payload.correct,false);
const corr=await ctx.request.post(origin+'/api/admin/corrections',{headers:ah,data:{reportId:report.id,attemptId:attempt.id,correct:true,reason:'自動驗收更正：保留原答案快照。'}});assert.ok([200,201].includes(corr.status()));
await nav('account');await act('sync').click();await page.getByText('評分更正通知',{exact:true}).waitFor();assert.equal((await raw()).events.find(e=>e.id===attempt.id).payload.correct,false);checks.push('correction notice arrives without rewriting original answer');
await nav('library');await act('select-none').click();await page.waitForTimeout(80);await page.locator('[data-essay=essay-02]').check();await page.waitForTimeout(80);await page.locator('#question-count').fill('1');await page.locator('#question-count').press('Tab');await page.waitForTimeout(80);await act('start').click();await page.locator('.options').waitFor();const stem=await page.locator('.answer-panel h2').innerText();
await act('pause').click();await nav('account');await act('sync').click();const all=await raw(),draft=all.events.filter(e=>e.type==='session'&&!e.payload.session.completed).map(e=>e.payload.session).sort((a,b)=>b.startedAt.localeCompare(a.startedAt))[0],q=draft.questions[0];
assert.equal((await ctx.request.post(origin+'/api/admin/questions/'+encodeURIComponent(q.id),{headers:ah,data:{status:'withdrawn',reason:'自動驗收：暫下架後恢復'}})).status(),200);
await page.reload();await page.locator('.hero').waitFor();await act('resume').click();assert.equal(await page.locator('.answer-panel h2').innerText(),stem);checks.push('in-progress snapshot survives withdrawal');
await act('pause').click();await nav('library');await act('start').click();await page.locator('.options').waitFor();assert.notEqual(await page.locator('.answer-panel h2').innerText(),stem);checks.push('withdrawn content excluded from new queue after authenticated refresh');
await ctx.request.post(origin+'/api/admin/questions/'+encodeURIComponent(q.id),{headers:ah,data:{status:'reviewed',reason:'自動驗收完成，恢復題目'}});
await page.screenshot({path:fileURLToPath(new URL('account-isolation.png',out)),fullPage:true});
assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'PASS',checks,errors}));await fs.writeFile(new URL('browser-account-result.json',out),JSON.stringify({status:'PASS',checks,errors},null,2));
}catch(e){console.error(e);console.log(JSON.stringify({status:'FAIL',checks,errors}));await page.screenshot({path:fileURLToPath(new URL('account-failure.png',out)),fullPage:true});process.exitCode=1;}finally{await browser.close();}

