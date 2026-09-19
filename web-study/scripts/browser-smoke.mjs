import {chromium} from 'file:///C:/Users/philip/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const out=new URL('../verification/',import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1366,height:1024}});
const page=await context.newPage();const errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8787');
await page.locator('[data-action="auth-mode"][data-mode="register"]').click();
const username='qa_'+Date.now();
await page.locator('[name="username"]').fill(username);
await page.locator('[name="inviteCode"]').fill('qa-local-study-20260919');
await page.locator('[name="password"]').fill('Local-Study-Test-2026');
await page.locator('#auth-form button[type="submit"]').click();
await page.locator('#dialog[open]').waitFor();
await page.locator('[data-action="close-dialog"]').click();
await page.screenshot({path:new URL('home.png',out).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
await fs.writeFile(new URL('qa-browser.json',new URL('../backend/data/',import.meta.url)),JSON.stringify({username,password:'Local-Study-Test-2026',auth:await page.evaluate(()=>localStorage.getItem('wenyan-auth-v1'))}));
console.log(JSON.stringify({url:page.url(),title:await page.title(),body:(await page.locator('body').innerText()).slice(0,3000),errors}));
await browser.close();


