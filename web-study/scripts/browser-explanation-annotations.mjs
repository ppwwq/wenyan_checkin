import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {answerPanel,annotatedExplanation} from '../src/features/practice.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'file:///C:/Users/philip/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const bank=JSON.parse(await readFile(new URL('../content/bank.json',import.meta.url),'utf8'));
const baseline=process.argv.includes('--baseline');
const output=new URL('../verification/explanation-annotations-2026-09-24/'+(baseline?'before/':'after/'),import.meta.url);await mkdir(output,{recursive:true});
const style=await readFile(new URL('../styles.css',import.meta.url),'utf8');
const ids=['full-a-e03-p03-b00-v03','full-a-e03-p10-b01-x005','full-c-01-28-01-80','full-d-03-01'];
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const checks=[];
try{
 for(const width of [768,390])for(const id of ids){
  const q=bank.questions.find(q=>q.id===id);assert.ok(q);const wrong=q.choices.find(c=>c.id!==q.answerId);
  const session={id:'preview',mode:'choice',index:0,questions:[q],answers:{[q.id]:'preview/a'},drafts:{}};
  const state={attempts:[{id:'preview/a',payload:{mode:'choice',answer:wrong.id,correct:false}}],favorites:{},firsts:[],assessments:new Map()};
  const page=await browser.newPage({viewport:{width,height:960}});
  await page.setContent('<!doctype html><html lang="zh-Hant"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+style+'</style><main class="workspace"><section class="answer-panel">'+answerPanel(q,session,state)+'</section></main></html>');
  await page.locator('.answer-reason').evaluate(node=>node.open=true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(!baseline){
   assert.ok(await page.locator('.answer-reason .annotation-label').count());
   assert.ok(await page.locator('.answer-reason .explanation-highlight').count());
   const text=await page.locator('.answer-reason .annotated-copy').allTextContents();assert.equal(text.join(''),q.explanation,'Full explanation must remain unchanged');
   assert.ok(await page.locator('.selected-explanation .annotation-label').count());
  }
  await page.locator('.feedback').screenshot({path:fileURLToPath(new URL(q.ability+'-'+width+'.png',output))});
  checks.push({id,width,noOverflow:true,originalTextVerified:!baseline});await page.close();
 }
 if(!baseline){
  const entries=bank.questions.flatMap(q=>[q.explanation,...q.choices.map(c=>c.explanation)].filter(Boolean).map(text=>({text,html:annotatedExplanation(text,q)})));
  entries.push({text:'<script>unsafe & "quoted"</script>\r\n\n「不能。切開引文」；尾句。',html:annotatedExplanation('<script>unsafe & "quoted"</script>\r\n\n「不能。切開引文」；尾句。',{choices:[]})});
  const page=await browser.newPage();
  const result=await page.evaluate(entries=>{
   const parser=new DOMParser();let checked=0;
   for(const {text,html} of entries){const dom=parser.parseFromString(html,'text/html'),actual=[...dom.querySelectorAll('.annotated-copy')].map(n=>n.textContent).join('');if(actual!==text.replaceAll('\r\n','\n'))throw new Error('Explanation text changed: '+text);if(dom.querySelector('script,img,iframe'))throw new Error('Unsafe injected HTML');if([...dom.querySelectorAll('.annotated-copy')].some(n=>!n.textContent.trim()))throw new Error('Empty annotation row');checked++;}
   return {checked,originalTextPreserved:true,noInjectedMarkup:true,noEmptyRows:true};
  },entries);checks.push(result);await page.close();
 }
}finally{await browser.close();}
await writeFile(new URL('result.json',output),JSON.stringify({result:'PASS',baseline,checks,scope:'Local feedback rendering; no account or publication.'},null,2));console.log(JSON.stringify({result:'PASS',baseline,checks:checks.length}));
