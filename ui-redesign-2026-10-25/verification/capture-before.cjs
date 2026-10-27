const {createRequire}=require('node:module');
const req=createRequire('C:/Users/philip/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=req('playwright');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/philip/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});
await page.goto('http://127.0.0.1:43135');
await page.screenshot({path:__dirname+'/before-login.png',fullPage:true});
await page.evaluate(async()=>{
 const result=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'design-before',password:'local-preview-password',inviteCode:'local-design-preview'})}).then(r=>r.json());
 const login=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'design-before',password:'local-preview-password'})}).then(r=>r.json());
 localStorage.setItem('wenyan-auth-v1',JSON.stringify({token:login.token,user:login.user}));
});
await page.reload();await page.locator('#training-form').waitFor();
await page.locator('[data-action="nav"][data-page="home"]').first().click();
await page.screenshot({path:__dirname+'/before-home.png',fullPage:true});
await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
