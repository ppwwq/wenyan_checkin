import {mkdir,cp,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const files=['index.html','styles.css','manifest.webmanifest','sw.js','src','assets','content'];
const bank=JSON.parse(await readFile(resolve(root,'content/bank.json'),'utf8'));
if(!bank.questions?.length)throw new Error('Question bank is empty');
for(const q of bank.questions){if(q.status==='reviewed'&&(!q.source?.pdfPage||q.choices.filter(c=>c.id===q.answerId).length!==1))throw new Error('Invalid released question '+q.id);}
for(const path of ['src/app.mjs','src/domain/training.mjs','src/features/training.mjs','src/domain/review.mjs','src/domain/queue.mjs','src/features/shared.mjs','src/features/preferences.mjs','src/features/practice.mjs','src/features/library.mjs','src/features/records.mjs','src/sync/client.mjs','src/storage/repository.mjs','sw.js'])execFileSync(process.execPath,['--check',resolve(root,path)]);
await mkdir(resolve(root,'dist'),{recursive:true});
for(const file of files)await cp(resolve(root,file),resolve(root,'dist',file),{recursive:true});
await writeFile(resolve(root,'dist/build-info.json'),JSON.stringify({uiVersion:'2026.09.24.3',version:bank.version,questions:bank.questions.length,builtAt:new Date().toISOString()},null,2));
console.log('Build complete: '+bank.questions.length+' source-linked questions; static assets in web-study/dist.');


await writeFile(resolve(root,'dist/_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: same-origin\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'\n  Cache-Control: no-cache\n`);
