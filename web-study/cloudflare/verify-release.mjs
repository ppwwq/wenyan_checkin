import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

// Read-only production verification: no accounts, sessions or records are created.
const origin='https://chinese-a-study.philipwwq.workers.dev';
const dist=new URL('../dist/',import.meta.url);
const output=new URL('../verification/ui-2026.09.20.2/',import.meta.url);
const sha=data=>createHash('sha256').update(data).digest('hex');
async function files(directory,prefix=''){
 const result=[];
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const path=prefix+entry.name;
  if(entry.isDirectory())result.push(...await files(new URL(entry.name+'/',directory),path+'/'));
  else if(entry.name!=='_headers')result.push(path);
 }
 return result;
}
const assets=[];
for(const path of await files(dist)){
 const url=path==='index.html'?'/':'/'+path;
 const response=await fetch(origin+url,{cache:'no-store',signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,200,url);
 const actual=Buffer.from(await response.arrayBuffer());
 const expected=await readFile(new URL(path,dist));
 assert.equal(sha(actual),sha(expected),'Published bytes differ: '+url);
 assets.push({path:url,status:response.status,sha256:sha(actual),bytes:actual.length});
}
const checks=[];
for(const [path,status] of [['/api/health',200],['/api/me',401],['/backend/data/study.sqlite',404],['/.dev.vars',404],['/api/internal/import',404]]){
 const response=await fetch(origin+path,{signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,status,path);checks.push({path,status});await response.arrayBuffer();
}
const range=await fetch(origin+'/content/sources/revision-book.pdf',{headers:{Range:'bytes=0-31'},signal:AbortSignal.timeout(30000)});
assert.equal(range.status,206);
const pdf=await readFile(new URL('content/sources/revision-book.pdf',dist));
assert.deepEqual(Buffer.from(await range.arrayBuffer()),pdf.subarray(0,32));
checks.push({path:'source PDF Range',status:206});
await mkdir(output,{recursive:true});
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'file:///C:/Users/philip/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const pageErrors=[];
try{
 const context=await browser.newContext({viewport:{width:768,height:1024}});
 const page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));
 await page.goto(origin);await page.locator('#auth-form').waitFor();
 assert.equal(await page.locator('h1').textContent(),'DSE文言练习');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const version=await page.evaluate(async()=>{await navigator.serviceWorker.ready;return (await (await fetch('/content/bank.json',{cache:'no-cache'})).json()).version;});
 assert.equal(version,'2026.09.20.1');assert.deepEqual(pageErrors,[]);
 await page.screenshot({path:fileURLToPath(new URL('public-login.png',output)),fullPage:true});
 checks.push({check:'Production Chromium login, no horizontal overflow, current bank via browser',version,pageErrors});
 await context.close();
}finally{await browser.close();}
const bank=JSON.parse(await readFile(new URL('content/bank.json',dist),'utf8'));
const report={result:'PASS',verifiedAt:new Date().toISOString(),origin,bankVersion:bank.version,questions:bank.questions.length,assets,checks,scope:'Read-only public asset/API checks and Chromium login screen. No production account login/write or physical iPad acceptance.'};
await writeFile(new URL('public-result.json',output),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({result:report.result,bankVersion:report.bankVersion,questions:report.questions,matchingAssets:assets.length,checks:checks.length,bankSha256:assets.find(a=>a.path==='/content/bank.json').sha256}));
