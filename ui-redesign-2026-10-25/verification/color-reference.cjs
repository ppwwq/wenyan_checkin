const {createRequire}=require('node:module');
const req=createRequire('C:/Users/philip/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=req('playwright');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/philip/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block',reducedMotion:'reduce'});
await page.goto('http://127.0.0.1:43135');
await page.evaluate(async()=>{
const username='palette-'+Date.now(),password='local-preview-password';
await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password,inviteCode:'local-design-preview'})});
const login=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})}).then(r=>r.json());
localStorage.setItem('wenyan-auth-v1',JSON.stringify(login));
});
await page.reload();await page.locator('#training-form').waitFor();
await page.locator('[data-training-essay]').first().check();await page.locator('#daily-count').fill('10');await page.locator('#training-form [type=submit]').click();
await page.locator('.home-heading').waitFor();await page.waitForTimeout(4800);await page.evaluate(()=>window.scrollTo(0,0));
await page.screenshot({path:__dirname+'/palette-reference.png',fullPage:true});
await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
