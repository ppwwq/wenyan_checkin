// 多份 JSON 按 id 合并。较后的批次是较新的。
// 同 id 时：红笔（teacherCorrection）优先；否则已核（不是「待核」）优先于待核；否则用较新的。

export function reviewRank(item){
 const red=item?.teacherCorrection===true?2:0;
 const reviewed=item?.confidence==='待核'?0:1;
 return red+reviewed;
}

export function preferIncoming(incoming,current){
 return reviewRank(incoming)>=reviewRank(current);
}

export function mergeById(batches,readItems,accept){
 const map=new Map();
 for(const batch of batches){
  for(const raw of readItems(batch)){
   const item=accept(raw);
   if(!item?.id)continue;
   const prev=map.get(item.id);
   if(!prev||preferIncoming(item,prev))map.set(item.id,item);
  }
 }
 return [...map.values()];
}
