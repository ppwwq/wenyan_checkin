import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createApp} from '../backend/server.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'file:///C:/Users/philip/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const bank=JSON.parse(await readFile(new URL('../content/bank.json',import.meta.url),'utf8'));
const questions=bank.questions.filter(q=>q.tags?.includes('confusable'));
assert.equal(questions.length,3);
const app=createApp({databasePath:':memory:',bootstrapInvite:'confusable-local-check'});
await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${app.server.address().port}`;
const folder=new URL('../verification/confusable-2026.09.22.1/',import.meta.url);
await mkdir(folder,{recursive:true});
let browser;
const errors=[],checks=[];
try{
 const registered=await fetch(origin+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'confusable-local',password:'Confusable-Local-Check-2026',inviteCode:'confusable-local-check'})});
 assert.ok(registered.ok);const auth=await registered.json();
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:1366,height:1024}});
 await context.addInitScript(auth=>localStorage.setItem('wenyan-auth-v1',JSON.stringify(auth)),{token:auth.token,user:auth.user});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.locator('.home-primary').waitFor();
 for(const question of questions){
  await page.locator('.nav [data-action="nav"][data-page="library"]').click();
  await page.locator('[data-action="select-none"]').click();
  await page.locator('.section-note').filter({hasText:'已選 0 篇'}).waitFor();
  for(const [index,essay] of question.essayIds.entries()){
   await page.locator(`[data-essay="${essay}"]`).check();
   await page.locator('.section-note').filter({hasText:`已選 ${index+1} 篇`}).waitFor();
  }
  await page.locator('#ability').selectOption('vocabulary');
  await page.locator('[data-action="start"]').click();
  await page.locator('.answer-panel h2').waitFor();
  assert.equal(await page.locator('.answer-panel h2').textContent(),question.stem);
  assert.equal(await page.locator('[data-action="choose"]').count(),4);
  await page.screenshot({path:fileURLToPath(new URL(question.id+'.png',folder)),fullPage:true});
  await page.locator(`[data-action="choose"][data-choice="${question.answerId}"]`).click();
  await page.locator('[data-action="submit"]').click();
  await page.locator('.feedback').waitFor();
  assert.equal(await page.locator('.verdict').textContent(),'這次答對了');
  await page.locator('[data-action="compare-question"]').click();
  await page.locator('.compare-card').first().waitFor();
  assert.equal(await page.locator('.compare-card').count(),2);
  checks.push({questionId:question.id,essayIds:question.essayIds,normalPractice:true,answerAndFeedback:true,originalComparisonCards:true});
 }
 assert.deepEqual(errors,[]);
 const report={result:'PASS',bankVersion:bank.version,checks,pageErrors:errors,scope:'Local Chromium, isolated in-memory account; no production deployment or physical iPad acceptance.'};
 await writeFile(new URL('result.json',folder),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();await new Promise(resolve=>app.server.close(resolve));app.close();}
