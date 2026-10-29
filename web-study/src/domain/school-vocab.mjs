// 校練詞義（school-vocab）尚未由導師核完。這裡只留讀檔和抽題優先權。
// 預期檔案：content/school-vocab.json。本輪不提交題目，也不編答案。
// 與 content/local-private/school-original.json 的 36 道校內題分開，不讀那個檔。
//
// 預期項目：
// { id, essayId, section:'gloss'|'polysemy'|'flex'|'loan', quote, target,
//   accepted:[], sourcePage, provenance:{kind:'school-sheet'}, confidence }
// 若已是文字練習的形狀（id 以 written: 開頭，並通過 validWrittenItem），
// 才會排進打字測義卷的卷首。缺欄位就不顯示。

import {validWrittenItem} from './written.mjs';

const sections=new Set(['gloss','polysemy','flex','loan']);

export function loadSchoolVocab(raw){
 const items=Array.isArray(raw)?raw:raw?.items;
 if(!Array.isArray(items))return [];
 return items.filter(item=>item&&item.provenance?.kind==='school-sheet'&&sections.has(item.section)&&typeof item.quote==='string'&&item.quote&&typeof item.target==='string'&&item.target&&Array.isArray(item.accepted));
}

// 空清單時回傳 0，抽題順序與現在一樣。
// 有校練清單後，school-sheet 維持較前；模板 full-* 字詞題往後一檔。
export function schoolVocabPriority(q,schoolItems){
 if(!schoolItems?.length)return 0;
 const ids=new Set(schoolItems.flatMap(item=>[item.id,item.bankQuestionId].filter(Boolean)));
 if(q?.provenance?.kind==='school-sheet'||ids.has(q?.id))return 0;
 if(q?.ability==='vocabulary'&&(q.tags?.includes('full-book-expansion')||q.tags?.includes('full-source-expansion')))return 1;
 return 0;
}

export function schoolVocabForSheet(items){
 return (items||[]).filter(item=>item?.provenance?.kind==='school-sheet'&&item.kind==='vocabulary'&&validWrittenItem(item));
}
