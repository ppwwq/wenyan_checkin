import {mkdir,cp,readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const files=['index.html','styles.css','manifest.webmanifest','sw.js','src','assets','content'];
const bank=JSON.parse(await readFile(resolve(root,'content/bank.json'),'utf8'));
if(!bank.questions?.length)throw new Error('Question bank is empty');
for(const q of bank.questions){if(q.status==='reviewed'&&(!q.source?.pdfPage||q.choices.filter(c=>c.id===q.answerId).length!==1))throw new Error('Invalid released question '+q.id);}
for(const path of ['src/domain/daily-availability.mjs','src/domain/answer-mode.mjs','src/domain/replacement.mjs','src/domain/choice-progress.mjs','src/features/learning-context.mjs','src/app.mjs','src/features/mistakes.mjs','src/features/notebook.mjs','src/features/papers.mjs','src/features/knowledge-map.mjs','src/features/handbook.mjs','src/domain/access.mjs','src/domain/papers.mjs','src/domain/knowledge-map.mjs','src/domain/handbook.mjs','src/domain/notebook.mjs','src/domain/training.mjs','src/domain/session.mjs','src/features/training.mjs','src/domain/review.mjs','src/domain/queue.mjs','src/domain/choice-classification.mjs','src/domain/review-types.mjs','src/domain/school-vocab.mjs','src/domain/sheet-run.mjs','src/domain/reading-context.mjs','src/domain/translation-excerpts.mjs','src/features/reading-context.mjs','src/domain/pools.mjs','src/domain/batch-merge.mjs','src/domain/authored-expansion.mjs','src/features/review-hall.mjs','src/features/shared.mjs','src/features/preferences.mjs','src/features/practice.mjs','src/features/library.mjs','src/features/pagination.mjs','src/features/records.mjs','src/features/written-records.mjs','src/features/written.mjs','src/sync/client.mjs','src/storage/repository.mjs','src/storage/backup.mjs','src/storage/save-queue.mjs','src/sync/scheduler.mjs','sw.js'])execFileSync(process.execPath,['--check',resolve(root,path)]);
await mkdir(resolve(root,'dist'),{recursive:true});
// 本機私有題目（content/local-private）不打包、不部署。
for(const file of files)await cp(resolve(root,file),resolve(root,'dist',file),{recursive:true,filter:src=>!/[\\/]local-private([\\/]|$)/.test(src)});
// Preload the existing module graph without introducing a bundler or changing URLs.
const modules=new Set();
async function collectModules(file){
 if(modules.has(file))return;
 modules.add(file);
 const source=await readFile(resolve(root,file),'utf8');
 const imports=source.matchAll(/\b(?:import|export)\s+[^;]*?\bfrom\s*['"](\.[^'"]+\.mjs)['"]/g);
 for(const [,dependency] of imports){
  const target=relative(root,resolve(root,dirname(file),dependency)).replaceAll('\\','/');
  await collectModules(target);
 }
}
await collectModules('src/app.mjs');
execFileSync(process.execPath,['--check',resolve(root,'src/storage/content.mjs')]);
const preloads=[...modules].sort().map(file=>'<link rel="modulepreload" href="/'+file+'">').join('\n');
const html=(await readFile(resolve(root,'index.html'),'utf8')).replace('</head>',preloads+'\n</head>');
await writeFile(resolve(root,'dist/index.html'),html);
// Content or module changes create a new offline cache on every affected build.
const digest=createHash('sha256').update(html).update(await readFile(resolve(root,'sw.js')));
for(const dir of ['src','assets','content']){
 const paths=(await readdir(resolve(root,dir),{recursive:true})).sort();
 for(const path of paths){
  if(/(^|[\\/])local-private([\\/]|$)/.test(path)||!/\.(mjs|css|json|svg|png|webmanifest)$/.test(path))continue;
  digest.update(dir+'/'+path).update(await readFile(resolve(root,dir,path)));
 }
}
digest.update(await readFile(resolve(root,'styles.css')));
const cacheName='wenyan-study-'+digest.digest('hex').slice(0,16)+'-click-latency';
const worker=(await readFile(resolve(root,'sw.js'),'utf8')).replace(/const CACHE='[^']+';/,"const CACHE='"+cacheName+"';");
await writeFile(resolve(root,'dist/sw.js'),worker);
await writeFile(resolve(root,'dist/build-info.json'),JSON.stringify({uiVersion:'2026.11.10.1',palette:'02-warm-gray-amber',syncProtocol:2,version:bank.version,questions:bank.questions.length,builtAt:new Date().toISOString()},null,2));
console.log('Build complete: '+bank.questions.length+' source-linked questions; static assets in web-study/dist.');


await writeFile(resolve(root,'dist/_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: same-origin\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'\n`);
await writeFile(resolve(root,'dist/_headers'),`/
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/sw.js
  Cache-Control: no-cache
/build-info.json
  Cache-Control: no-cache
/manifest.webmanifest
  Cache-Control: no-cache
/src/*
  Cache-Control: public, max-age=300, must-revalidate
/assets/*
  Cache-Control: public, max-age=300, must-revalidate
/styles.css
  Cache-Control: public, max-age=300, must-revalidate
/content/*
  Cache-Control: public, max-age=300, must-revalidate
/content/local-private/*
  Cache-Control: no-store
`,{flag:'a'});
