// 校练词义。内容在 content/school-vocab/manifest.json 列出的多份 JSON。
// 加载时盖上 provenance.kind 和 origin = school-sheet，不改 accepted。
// 与 content/local-private 的 school-original 无关，那种题直接丢掉。

import {validWrittenItem} from './written.mjs';
import {mergeById} from './batch-merge.mjs';
import {isTemplateVocab} from './pools.mjs';

const sections=new Set(['gloss','polysemy','flex','loan']);
const sectionTag={gloss:'school-gloss',polysemy:'school-polysemy',flex:'school-flex',loan:'school-loan'};
export const schoolSectionType={polysemy:'polysemy',flex:'flex',loan:'loan'};

function readItems(raw){
 const items=Array.isArray(raw)?raw:raw?.items;
 return Array.isArray(items)?items:[];
}

export function acceptSchoolItem(item){
 if(!item||typeof item.id!=='string'||!item.id)return null;
 if(item.id.includes('school-original')||item.provenance?.kind==='school-original')return null;
 if(item.provenance?.kind&&item.provenance.kind!=='school-sheet')return null;
 if(!sections.has(item.section))return null;
 if(typeof item.quote!=='string'||!item.quote||typeof item.target!=='string'||!item.target)return null;
 if(!Array.isArray(item.accepted)||!item.accepted.every(a=>typeof a==='string'&&a.length>0))return null;
 const tags=[...new Set([...(item.tags||[]),sectionTag[item.section]].filter(Boolean))];
 return {...item,accepted:item.accepted.slice(),senseGroupId:item.senseGroupId??null,tags,origin:'school-sheet',provenance:{...(item.provenance||{}),kind:'school-sheet'}};
}

export function mergeSchoolBatches(batches){
 return mergeById(batches,readItems,acceptSchoolItem);
}

export function loadSchoolVocab(raw){
 return mergeSchoolBatches([raw]);
}

export function schoolItemAsWritten(item){
 const accepted=acceptSchoolItem(item);
 if(!accepted)return null;
 const at=accepted.quote.indexOf(accepted.target);
 const unique=at>=0&&accepted.quote.indexOf(accepted.target,at+1)<0;
 const pending=accepted.confidence==='待核';
 const written={
  id:accepted.id,version:1,kind:'vocabulary',origin:'school-sheet',essayId:accepted.essayId,
  title:accepted.target,target:accepted.target,context:accepted.quote,
  prompt:'按上下文解釋標示的「'+accepted.target+'」。',
  reference:accepted.accepted[0]||'這條仍待核，請對照原句自查。',
  accepted:accepted.accepted.slice(),
  points:[pending?'這條標了待核。對上參考也不自動算對，請自查。':'用這個語境裡的意思。'],
  rubric:pending?'待核：不自動判對，也不判錯。對照參考後自己核對。':'與已核表述完全一致才算命中；其餘自查，不自動判錯。',
  sourceLabel:'校練詞義 · '+(accepted.sheetType||'school-sheet')+' · '+accepted.id,
  senseId:accepted.senseGroupId||undefined,senseGroupId:accepted.senseGroupId,section:accepted.section,
  tags:accepted.tags,confidence:accepted.confidence,teacherCorrection:accepted.teacherCorrection===true,
  provenance:accepted.provenance,schoolId:accepted.id,
  ...(unique?{targetStart:at}:{})
 };
 return validWrittenItem(written)?written:null;
}

export function schoolVocabForSheet(items){
 return (items||[]).map(schoolItemAsWritten).filter(Boolean);
}

export function isTemplateWritten(item){
 return item?.kind==='vocabulary'&&(String(item.bankQuestionId||'').startsWith('full-')||isTemplateVocab({...item,ability:'vocabulary',id:item.bankQuestionId||item.id,tags:item.tags}));
}

// 模板词义已经退出默认池时，这里仍然把它们排后，留给扩展池。
export function schoolVocabPriority(q,schoolItems){
 if(!schoolItems?.length)return 0;
 if(q?.provenance?.kind==='school-sheet')return 0;
 if(isTemplateVocab(q))return 1;
 return 0;
}
