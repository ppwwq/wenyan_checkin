import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isExtensionQuestion} from '../src/domain/pools.mjs';
import {classifyChoice,choiceFamilies,choiceSource,choiceSources} from '../src/domain/choice-classification.mjs';

export function choiceCatalogue(questions,essays){
 const titles=new Map(essays.map(e=>[e.id,e.title]));
 return questions.filter(q=>Array.isArray(q?.choices)&&q.choices.length>=2&&q.responseFormat!=='short-answer').map(q=>{
  const provenance=q.provenance?.kind;
  const source=choiceSources[choiceSource(q)];
  const status=q.active===false?'已停用':q.status!=='reviewed'&&q.editorial?.practiceEnabled!==true?'待核未啟用':
   isExtensionQuestion(q)?'擴展字詞':q.tags?.includes('appendix')?'手法附錄':provenance==='school-original'?'本機練習':'一般練習';
  return {id:q.id,...classifyChoice(q),source,status,chapters:q.essayIds.map(id=>titles.get(id)||id),stem:q.stem,
   assessment:q.assessmentType||'',...(provenance==='dse-original'?{year:q.provenance.year,number:q.provenance.question}:{})};
 });
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=new URL('../content/',import.meta.url);
 const read=async file=>JSON.parse((await readFile(new URL(file,root),'utf8')).replace(/^\uFEFF/,''));
 const {mergeAuthoredBatches}=await import('../src/domain/authored-expansion.mjs');
 const bank=await read('bank.json');
 const authored=await read('authored-expansion/manifest.json');
 const batches=await Promise.all(authored.batches.map(name=>read('authored-expansion/'+name)));
 const local=await read('local-private/school-original.json').catch(e=>{if(e.code==='ENOENT')return {questions:[]};throw e;});
 const questions=[...new Map([...bank.questions,...local.questions].map(q=>[q.id,q])).values()];
 const extra=mergeAuthoredBatches(batches,new Set(questions.map(q=>q.id)));
 const rows=choiceCatalogue([...questions,...extra.questions],bank.essays);
 const schoolManifest=await read('school-vocab/manifest.json');
 const school=await Promise.all(schoolManifest.batches.map(name=>read('school-vocab/'+name)));
 const written=await read('written-practice.json');
 const supplementalVocabulary=written.items.filter(q=>q.kind==='vocabulary'&&q.origin==='official-original'&&q.source?.file?.endsWith('DSE--.pdf'));
 const context={school:school.map((file,i)=>({file:schoolManifest.batches[i],count:file.items.length,bySection:file.stats.bySection})),
  supplementalVocabulary:supplementalVocabulary.length};
 await writeFile(new URL('local-private/integration-audit/choice-data.js',root),
  'const choiceInventory = '+JSON.stringify({rows,context,families:choiceFamilies,sources:Object.values(choiceSources)})+';\n');
 console.log(rows.length+' choice records; '+rows.filter(q=>q.status==='已停用').length+' suspended');
}
