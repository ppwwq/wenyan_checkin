// 一卷按文字練習原來的次序往下寫。不打亂，也不要學生回列表才進下一題。
import {filterWritten} from './written.mjs';
import {schoolVocabForSheet} from './school-vocab.mjs';

export function sheetQueue(items,{essayIds}={},schoolItems=[]){
 const selected=Array.isArray(essayIds)&&essayIds.length?new Set(essayIds):null;
 const inRange=item=>!selected||selected.has(item.essayId);
 const school=schoolVocabForSheet(schoolItems).filter(inRange);
 const seen=new Set(school.map(item=>item.id));
 const rest=filterWritten(items.filter(inRange),{kind:'vocabulary'}).filter(item=>!seen.has(item.id));
 return [...school,...rest];
}

export function sheetAt(queue,index=0){
 const total=queue.length,i=total?Math.min(Math.max(0,index),total-1):0;
 return {index:i,total,item:queue[i]||null,last:total>0&&i===total-1};
}
