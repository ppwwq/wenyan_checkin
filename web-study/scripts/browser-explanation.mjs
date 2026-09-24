import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {answerPanel} from '../src/features/practice.mjs';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'file:///C:/Users/philip/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const bank=JSON.parse(await readFile(new URL('../content/bank.json',import.meta.url),'utf8'));
const question=bank.questions.find(q=>q.id==='q-e05-exp-001');
assert.ok(question);
const wrong=question.choices.find(c=>c.id!==question.answerId);
const session={id:'local-preview',mode:'mixed',questions:[question],index:0,answers:{[question.id]:'preview/attempt'},drafts:{}};
const state={attempts:[{id:'preview/attempt',payload:{mode:'choice',answer:wrong.id,correct:false}}],favorites:{},firsts:[],assessments:new Map()};
const html=answerPanel(question,session,state);
const style=await readFile(new URL('../styles.css',import.meta.url),'utf8');
const output=new URL('../verification/ui-2026.09.23.3/',import.meta.url);
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const checks=[];
try{
 for(const width of [768,375]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.setContent('<!doctype html><html lang="zh-Hant"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+style+'</style><main class="workspace"><section class="answer-panel">'+html+'</section></main></html>');
  assert.equal(await page.locator('.learning-point').count(),1);
  assert.match(await page.locator('.learning-point').innerText(),/「拜」在這裏是「授予官職」/);
  assert.match(await page.locator('.key-quote').innerText(),/拜為上卿/);
  assert.equal(await page.locator('.answer-reason').evaluate(node=>node.open),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:fileURLToPath(new URL('answer-'+width+'.png',output)),fullPage:true});
  await page.locator('.answer-reason summary').click();
  assert.match(await page.locator('.answer-reason').innerText(),/須核對本句的行動者/);
  checks.push({width,shortAnswerVisible:true,originalExplanationAvailable:true,noHorizontalOverflow:true});
  await page.close();
 }
}finally{await browser.close();}
await writeFile(new URL('browser-result.json',output),JSON.stringify({result:'PASS',bankVersion:bank.version,checks,scope:'Local rendered feedback with a released question; no production account or physical iPad was used.'},null,2)+'\n');
console.log(JSON.stringify({result:'PASS',checks}));
