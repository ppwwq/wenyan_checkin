import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'file:///C:/Users/philip/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const svg=await readFile(new URL('../assets/icon.svg',import.meta.url),'utf8');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 for(const [name,size,maskable] of [['icon-192',192],['icon-512',512],['apple-touch-icon',180],['icon-maskable',512,true]]){
  const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});
  await page.setContent('<style>html,body{margin:0;width:100%;height:100%;background:#faf5e5}body{display:grid;place-items:center}svg{width:'+(maskable?'80%':'100%')+';height:auto;display:block}</style>'+svg);
  await page.screenshot({path:fileURLToPath(new URL('../assets/'+name+'.png',import.meta.url))});await page.close();
 }
}finally{await browser.close();}
console.log('Rendered SVG into four application icon sizes.');
