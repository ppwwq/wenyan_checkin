// 自拟加量。只读 manifest 列出的 questions／items。
// daoduHeShuIndex 只是索引，不展开成题。
// 源文件 active=false 表示还没当正式审定；接入后打开自拟池，方便筛选和默认抽题。
// skip-if-duplicate：备注里点名的 authored 题已在库里，就跳过，不存两份。

import {mergeById} from './batch-merge.mjs';
import {validWrittenItem} from './written.mjs';

function readItems(raw){
 if(Array.isArray(raw))return raw;
 if(Array.isArray(raw?.questions))return raw.questions;
 if(Array.isArray(raw?.items))return raw.items;
 return [];
}

function linkedAuthoredExists(note,existingIds){
 const tokens=String(note||'').match(/authored-[\w-]+/g)||[];
 return tokens.some(token=>[...existingIds].some(id=>{
  if(id===token||id.startsWith(token))return true;
  const parts=token.match(/^(.*)-(\d+)$/);
  return !!parts&&id.startsWith(parts[1])&&id.endsWith('-'+String(Number(parts[2])).padStart(2,'0'));
 }));
}

export function shouldSkipDuplicate(item,existingIds){
 if(!item?.id||existingIds.has(item.id))return !!item?.id;
 const hint=String(item.editorial?.mergeHint||'');
 if(!hint.startsWith('skip-if-duplicate'))return false;
 return linkedAuthoredExists(item.dedupeNote,existingIds);
}

function stampAuthored(item){
 const tags=[...new Set([...(item.tags||[]),'authored','自拟','simulation'])];
 return {...item,tags,active:true,status:item.status||'draft',provenance:{...(item.provenance||{}),kind:'authored',label:'自拟'},editorial:{...(item.editorial||{}),purpose:'simulation',practiceEnabled:true}};
}

function asShortAnswer(item){
 const points=Array.isArray(item.rubric)?item.rubric:(item.shortAnswer?.rubricPoints||[]);
 const written={
  id:item.id,version:item.version||1,kind:'short-answer',origin:'authored-expansion',
  essayId:item.essayIds?.[0],essayIds:item.essayIds||[],title:item.essayTitle||'自擬短答',
  prompt:item.stem,context:item.quote||'',reference:item.modelAnswer||item.explanation||'自擬參考，不是官方答案。',
  accepted:[],points:points.length?points:['按題目寫完，再對照要點自查。'],
  rubric:(points.length?points.join('\n'):'')+'\n自擬評分，不是官方配分。'+(item.shortAnswer?.scoringNote?'\n'+item.shortAnswer.scoringNote:''),
  sourceLabel:'自擬短答 · 非官方 · '+(item.provenance?.practiceLabel||'自拟')+' · '+item.id,
  commonErrors:typeof item.limitation==='string'?item.limitation:'',
  ability:item.ability,assessmentType:item.assessmentType,section:'short-answer',
  tags:[...new Set([...(item.tags||[]),'authored','自拟','simulation','short-answer'])],
  provenance:{kind:'authored',label:'自拟'},confidence:'自拟'
 };
 return validWrittenItem(written)?written:null;
}

export function mergeAuthoredBatches(batches,existingIds=new Set()){
 const skipped=[],mcqRaw=[],shortRaw=[];
 for(const batch of batches){
  for(const item of readItems(batch)){
   if(!item||item.provenance?.kind==='school-original'||String(item.id||'').includes('school-original'))continue;
   if(shouldSkipDuplicate(item,existingIds)){skipped.push(item.id);continue;}
   if(item.responseFormat==='short-answer')shortRaw.push(item);
   else if(item.responseFormat==='single-choice'||Array.isArray(item.choices)&&item.choices.length)mcqRaw.push(item);
  }
 }
 const questions=mergeById([mcqRaw],list=>list,item=>item.stem&&Array.isArray(item.choices)&&item.choices.length?stampAuthored(item):null);
 const written=mergeById([shortRaw],list=>list,item=>item.stem?asShortAnswer(stampAuthored(item)):null).filter(Boolean);
 return {questions,written,skipped};
}
