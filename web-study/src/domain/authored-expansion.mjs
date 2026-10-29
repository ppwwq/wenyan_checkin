// 自拟加量。content/authored-expansion/manifest.json 的 batches 为空时，这里什么都不加。
// 题库里已经有的 id 不覆盖。school-original 丢掉。

import {mergeById} from './batch-merge.mjs';

function readItems(raw){
 const items=Array.isArray(raw)?raw:raw?.items;
 return Array.isArray(items)?items:[];
}

export function acceptAuthoredItem(item,existingIds){
 if(!item||typeof item.id!=='string'||!item.id)return null;
 if(existingIds?.has(item.id))return null;
 if(item.id.includes('school-original')||item.provenance?.kind==='school-original')return null;
 if(!item.stem||!Array.isArray(item.choices)||!item.choices.length)return null;
 const tags=[...new Set([...(item.tags||[]),'revision-book-authored'])];
 return {...item,tags,status:item.status||'reviewed',active:item.active!==false,provenance:{...(item.provenance||{}),kind:'authored'}};
}

export function mergeAuthoredBatches(batches,existingIds=new Set()){
 return mergeById(batches,readItems,item=>acceptAuthoredItem(item,existingIds));
}
