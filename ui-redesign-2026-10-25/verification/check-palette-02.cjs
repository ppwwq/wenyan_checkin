const {createRequire}=require('node:module');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const req=createRequire('C:/Users/philip/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=req('playwright');const out=path.join(__dirname,'palette-02');fs.mkdirSync(out,{recursive:true});
const app=path.resolve(__dirname,'../app'),results=[];
const bank=JSON.parse(fs.readFileSync(path.join(app,'content/bank.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'baseline-manifest.json'),'utf8').replace(/^\uFEFF/,''));
for(const f of manifest.filter(f=>/^(content|src[\\/](domain|storage|sync))[\\/]/.test(f.path)))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(app,f.path))).digest('hex'),f.sha256);
function luminance(hex){return hex.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0)}
for(const [role,a,b] of [['body','#433e36','#f6f3ed'],['muted','#70675b','#f6f3ed'],['primary','#fffefa','#986316'],['hero copy','#71634f','#f5e8cb'],['sidebar','#e6e0d4','#393632'],['selected nav','#815411','#f5e8cb']]){const x=luminance(a),y=luminance(b),ratio=(Math.max(x,y)+.05)/(Math.min(x,y)+.05);assert(ratio>=4.5,role);results.push({role,contrast:Number(ratio.toFixed(2))});}
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/philip/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'});
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const click=async(a)=>page.locator(`[data-action="${a}"]:visible`).first().click();const nav=async(p)=>page.locator(`[data-action="nav"][data-page="${p}"]:visible`).first().click();
 const shot=async(name)=>{await page.waitForTimeout(500);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,`${width}-${name}.png`),animations:'disabled'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,name);results.push({width,page:name,overflow:false});};
 await page.goto('http://127.0.0.1:43135');await page.locator('#auth-form').waitFor();await shot('login');
 await page.evaluate(async()=>{const username='palette02-'+Date.now(),password='local-preview-password';await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password,inviteCode:'local-design-preview'})});const login=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})}).then(r=>r.json());localStorage.setItem('wenyan-auth-v1',JSON.stringify(login));});
 await page.reload();await page.locator('#training-form').waitFor();await page.locator('[data-training-essay]').first().check();await page.locator('#daily-count').fill('10');await page.locator('#training-form [type=submit]').click();await page.locator('.home-heading').waitFor();await page.waitForTimeout(4700);await shot('home');
 const colors=await page.evaluate(()=>({paper:getComputedStyle(document.body).backgroundColor,primary:getComputedStyle(document.querySelector('.start-card>.btn')).backgroundColor,sidebar:getComputedStyle(document.querySelector('.sidebar')).backgroundColor}));assert.equal(colors.paper,'rgb(246, 243, 237)');assert.equal(colors.primary,'rgb(152, 99, 22)');assert.equal(colors.sidebar,'rgb(57, 54, 50)');
 await nav('library');await shot('library');await nav('home');await click('written-list');await shot('written');await nav('history');await shot('history');await nav('account');await shot('account');await nav('home');await click('daily-start');await page.locator('.option').first().waitFor();await shot('practice');
 for(const correct of [true,false]){await page.locator('.option:not(:disabled)').first().waitFor();const qid=await page.locator('.question-top [data-action=favorite]').getAttribute('data-id'),q=bank.questions.find(q=>q.id===qid);assert(q);await page.locator(`[data-choice="${correct?q.answerId:q.choices.find(c=>c.id!==q.answerId).id}"]`).click();await click('submit');await page.locator('.feedback').waitFor();const selector=correct?'.option.correct':'.option.wrong';assert.equal(await page.locator(selector).evaluate(e=>getComputedStyle(e).borderColor),correct?'rgb(34, 134, 58)':'rgb(197, 48, 48)');if(correct)assert.equal(await page.locator('.correct-explanation:not([open])').count(),1);await shot(correct?'correct':'wrong');if(correct)await click('next');}
 await click('pause');await page.waitForTimeout(4700);if(width===390){await page.setViewportSize({width:320,height:900});await click('settings');await page.selectOption('#font-size','32');await page.locator('#settings-form [type=submit]').click();await shot('320-large-home');await nav('library');await shot('320-large-library');}
 assert.deepEqual(errors,[]);results.push({width,semanticCorrectWrong:true,correctCollapsed:true,pageErrors:0,colors});await context.close();
}fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({contentDomainStorageSyncUnchanged:31,results},null,2));console.log(JSON.stringify({checks:results.length,results},null,2));}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

