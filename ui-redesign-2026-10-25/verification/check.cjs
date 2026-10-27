const {createRequire}=require('node:module');
const {readFileSync,writeFileSync}=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const req=createRequire('C:/Users/philip/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=req('playwright');
const app=path.resolve(__dirname,'../app'),results=[];
const manifest=JSON.parse(readFileSync(path.join(__dirname,'baseline-manifest.json'),'utf8').replace(/^\uFEFF/,''));
for(const f of manifest.filter(f=>/^(content|src[\\/](domain|storage|sync))[\\/]/.test(f.path))){assert.equal(createHash('sha256').update(readFileSync(path.join(app,f.path))).digest('hex'),f.sha256,`Protected content changed: ${f.path}`);}
results.push({check:'content, domain, storage and sync byte-identical',files:manifest.filter(f=>/^(content|src[\\/](domain|storage|sync))[\\/]/.test(f.path)).length});
const bank=JSON.parse(readFileSync(path.join(app,'content/bank.json'),'utf8'));
const base='http://127.0.0.1:43135';
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/philip/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'});
try{
 for(const width of [1440,390,768]){
  const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block',acceptDownloads:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const click=async(action)=>page.locator(`[data-action="${action}"]:visible`).first().click();
  const nav=async(name)=>page.locator(`[data-action="nav"][data-page="${name}"]:visible`).first().click();
  const shot=async(name,fullPage=true)=>{await page.screenshot({path:path.join(__dirname,`${width}-${name}.png`),fullPage});};
  const overflow=async(name)=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${width} ${name} overflow`);results.push({width,check:name});};
  await page.goto(base);await page.locator('#auth-form').waitFor();await shot('login');await overflow('login');
  await page.locator('[data-mode="recover"]').click();assert.equal(await page.locator('[name=recoveryCode]').count(),1);
  await page.locator('[data-mode="register"]').click();
  await page.locator('[name=username]').fill('ui-'+width+'-'+Date.now());await page.locator('[name=password]').fill('local-test-password');await page.locator('[name=inviteCode]').fill('local-design-preview');
  await page.locator('#auth-form [type=submit]').click();await page.locator('#training-form').waitFor();await click('close-dialog');
  await page.locator('[data-training-essay]').first().check();await page.locator('#daily-count').fill('10');await page.locator('#training-form [type=submit]').click();
  await page.locator('.home-heading').waitFor();await shot('home');await overflow('home');
  await click('settings');await page.selectOption('#font-size','32');await page.locator('#settings-form [type=submit]').click();await overflow('home large text');
  await click('settings');await page.selectOption('#font-size','24');await page.locator('#settings-form [type=submit]').click();
  await click('daily-start');await page.locator('.option').first().waitFor();await shot('practice');await overflow('practice');
  await click('favorite');await click('report');await page.locator('#report-form [name=detail]').fill('隔離本地界面測試，非正式題目回報。');await page.locator('#report-form [type=submit]').click();
  const stem=await page.locator('#question-title').innerText();const q=bank.questions.find(q=>q.stem===stem&&q.choices?.length);assert(q,'question found');
  await page.locator(`[data-choice="${q.answerId}"]`).click();
  const submit=page.locator('[data-action="submit"]');await submit.click();await page.locator('.feedback').waitFor();
  assert.equal(await page.locator('.correct-explanation:not([open])').count(),1,'correct answer remains collapsed');await page.locator('.correct-explanation>summary').click();await shot('feedback');await overflow('feedback');
  await click('next');await page.locator('.option').first().waitFor();await click('pause');await page.locator('.home-heading').waitFor();
  await nav('library');await page.locator('.library-page').waitFor();await shot('library',false);await overflow('library');
  await page.selectOption('#studyPool','official');
  await overflow('official pool');await nav('home');await click('written-list');await page.locator('#written-filters').waitFor();
  await page.selectOption('#written-filters [name=kind]','translation');await page.locator('#written-filters [type=submit]').click();await shot('written-list',false);await overflow('written list');
  await click('written-open');await page.locator('#written-answer').fill('這是隔離測試的完整譯文草稿。');await click('written-submit');await page.locator('#written-feedback').waitFor();
  await page.locator('#written-checked').check();await page.locator('[data-action="written-self"][data-outcome="revisit"]').click();await page.locator('#written-correction').fill('保存訂正稿，保留原答案。');await click('written-correction-save');await shot('written-answer');await overflow('written answer');
  await nav('history');await shot('history');await overflow('history');
  await nav('home');await nav('saved');await overflow('favorites');assert(await page.locator('[data-action=favorite]').count());
  await nav('home');await click('wrong-practice');await overflow('mistakes');
  await nav('home');await nav('weakness');await overflow('weakness');
  await nav('home');await nav('quick');await click('quick-all');await overflow('quick review');
  await nav('home');await nav('compare');await overflow('comparison');
  await nav('account');await shot('account');await overflow('account');
  const download=page.waitForEvent('download');await click('export');const file=await download;const backup=await file.path();assert(backup);await page.locator('#import-file').setInputFiles(backup);await page.waitForTimeout(350);
  await nav('reports');assert((await page.locator('#main').innerText()).includes('隔離本地界面測試'));await overflow('reports');
  await nav('home');await page.reload();await page.locator('.home-heading').waitFor();assert((await page.locator('.home-details').innerText()).includes('1／10'));
  if(width===390){await page.setViewportSize({width:320,height:800});await click('settings');await page.selectOption('#font-size','32');await page.locator('#settings-form [type=submit]').click();await overflow('320 large home');await nav('library');await overflow('320 large library');await shot('320-large-library',false);}
  assert.deepEqual(errors,[],'browser errors');results.push({width,check:'real local registration, settings, correct answer, pause, written self-review/correction, favorite, report, export/import, reload',pageErrors:errors.length});
  await context.close();
 }
 writeFileSync(path.join(__dirname,'result.json'),JSON.stringify({scope:'isolated local browser and temporary backend; no production writes',results},null,2));console.log(JSON.stringify({passed:results.length,results},null,2));
}finally{await browser.close();}
})().catch(e=>{writeFileSync(path.join(__dirname,'partial-result.json'),JSON.stringify(results,null,2));console.error(e);process.exitCode=1;});
