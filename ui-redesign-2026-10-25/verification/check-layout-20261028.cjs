const {createRequire}=require('node:module');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=createRequire('C:/Users/philip/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const out=process.env.LAYOUT_OUTPUT||path.join(__dirname,'layout-2026-10-28');fs.mkdirSync(out,{recursive:true});
const base=process.env.TEST_ORIGIN||'http://127.0.0.1:43135';
const which=process.env.LAYOUT_CASE||'toast',results=[];
const bank=JSON.parse(fs.readFileSync(path.join(process.env.TEST_APP||path.join(__dirname,'../app'),'content/bank.json'),'utf8'));
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/philip/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'});
 try{for(const width of (which==='preview'?[1440]:which==='flows'?[390,1440]:[390,768,1440,320,844])){
  const context=await browser.newContext({viewport:{width,height:width===844?390:900},serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const click=async(a)=>page.locator(`[data-action="${a}"]:visible`).first().click();
  const nav=async(p)=>page.locator(`[data-action="nav"][data-page="${p}"]:visible`).first().click();
  await page.goto(base);await page.locator('#auth-form').waitFor();
  await page.locator('[data-mode=register]').click();
  await page.locator('[name=username]').fill(which==='preview'?'preview-02-1028':'layout-'+width+'-'+Date.now());await page.locator('[name=password]').fill('Local-layout-preview!');await page.locator('[name=inviteCode]').fill('local-design-preview');
  await page.locator('#auth-form [type=submit]').click();await page.locator('#training-form').waitFor();await click('close-dialog');
  await page.locator('[data-training-essay]').first().check();await page.locator('#daily-count').fill('10');await page.locator('#training-form [type=submit]').click();await page.locator('.home-heading').waitFor();
  if(width===320){await click('settings');await page.selectOption('#font-size','32');await page.locator('#settings-form [type=submit]').click();}
  if(which==='flows'){
   await click('daily-start');await page.locator('.option').first().waitFor();await click('favorite');
   for(const correct of [true,false]){
    const qid=await page.locator('.question-top [data-action=favorite]').getAttribute('data-id'),q=bank.questions.find(q=>q.id===qid);assert(q);
    await page.locator(`[data-choice="${correct?q.answerId:q.choices.find(c=>c.id!==q.answerId).id}"]`).click();await click('submit');await page.locator('.feedback').waitFor();
    if(correct)assert.equal(await page.locator('.correct-explanation:not([open])').count(),1);
    else assert.equal(await page.locator('.option.wrong').count(),1);
    await page.screenshot({path:path.join(out,`flow-${correct?'correct':'wrong'}-${width}.png`),animations:'disabled'});
    if(correct){await click('next');await page.locator('.option:not(:disabled)').first().waitFor();}
   }
   await click('pause');await page.locator('.home-heading').waitFor();await click('written-list');await page.locator('#written-filters').waitFor();
   await page.selectOption('#written-filters [name=kind]','translation');await page.locator('#written-filters [type=submit]').click();await click('written-open');
   await page.locator('#written-answer').fill('本地介面核查的譯文草稿。');await click('written-submit');await page.locator('#written-feedback').waitFor();await page.locator('#written-checked').check();
   await page.locator('[data-action=written-self][data-outcome=revisit]').click();await page.locator('#written-correction').fill('本地核查訂正稿。');await click('written-correction-save');
   await nav('account');const download=page.waitForEvent('download');await click('export');const backup=await (await download).path();assert(backup);await page.locator('#import-file').setInputFiles(backup);await page.locator('#toast').filter({hasText:'備份已完整驗證並合併'}).waitFor();
   await nav('home');await page.reload();await page.locator('.home-heading').waitFor();assert((await page.locator('.home-details').innerText()).includes('2／10'));
   await page.evaluate(()=>scrollTo(0,0));results.push({width,check:'correct/wrong answers, favorite, pause, written self-review/correction, export/import, reload'});
  }else if(which==='toast'){
   await nav('library');await page.locator('#question-count').fill('0');await page.locator('#question-count').press('Tab');
   await page.locator('#toast:not(:empty)').waitFor();
   const toast=await page.locator('#toast').boundingBox();
   if(width<=650){const btn=await page.locator('.library-start-bar button').boundingBox();assert(btn.x>=16&&btn.x+btn.width<=width-16,`${width}: library controls touch viewport edge`);}
   for(const selector of ['.mobile-nav','.library-start-bar']){
    const el=page.locator(selector);if(await el.isVisible()){const box=await el.boundingBox();assert(!overlap(toast,box),`${width}: toast overlaps ${selector}: ${JSON.stringify({toast,box})}`);}
   }
   results.push({width,check:'toast clears navigation and library controls'});
  }else if(which==='actions'){
   await click('daily-start');await page.locator('.option').first().waitFor();
   const box=await page.locator('.practice-action-bar .question-actions').boundingBox();
   assert(box.x>=16&&box.x+box.width<=width-16,`${width}: answer controls touch viewport edge ${JSON.stringify(box)}`);
   await click('submit');await page.locator('#toast:not(:empty)').waitFor();const toast=await page.locator('#toast').boundingBox();
   for(const btn of await page.locator('.practice-action-bar button:visible').all())assert(!overlap(toast,await btn.boundingBox()),`${width}: practice toast covers answer controls`);
   results.push({width,check:'answer controls inset and toast clear'});
  }else if(which==='keyboard'){
   await page.reload();await page.locator('.home-heading').waitFor();
   await page.keyboard.press('Tab');assert.equal(await page.locator('.skip-link').evaluate(el=>el===document.activeElement),true);
   const box=await page.locator('.skip-link').boundingBox();assert(box.y>=0&&box.x>=0&&box.x+box.width<=width,'focused skip link inside viewport');
   await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'main');
   await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>!!document.activeElement.closest('#main')),true);
   await page.keyboard.press('Shift+Tab');await page.locator('#main').focus();
   results.push({width,check:'Tab reveals skip link, Enter focuses main, next Tab enters content'});
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${width}: horizontal overflow`);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(246, 243, 237)');
  await page.screenshot({path:path.join(out,`${which}-${width}.png`),animations:'disabled'});
  assert.deepEqual(errors,[]);await context.close();
 }
 fs.writeFileSync(path.join(out,`${which}.json`),JSON.stringify({results},null,2));console.log(JSON.stringify(results));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
