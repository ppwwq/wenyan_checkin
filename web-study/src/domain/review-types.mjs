// 題型館、練習頁、學習設定共用同一份題型。
// school-* 標籤要等校練詞義核完才會出現。沒有標籤就篩不到，不拿別的題冒充。

export const reviewTypes=[
 {id:'context',label:'語境辨義',note:'看句子，四選一選詞義',track:'mcq'},
 {id:'typing',label:'打字測義',note:'看句寫義，一卷連續寫',track:'sheet'},
 {id:'polysemy',label:'一詞多義',note:'同一個字，不同句子可以不同意思。校練題用打字。',track:'mcq'},
 {id:'flex',label:'詞類活用',note:'校練標籤 school-flex。有條目就用打字練。',track:'mcq'},
 {id:'loan',label:'通假',note:'校練標籤 school-loan。有條目就用打字練。',track:'mcq'},
 {id:'function',label:'虛詞',note:'之、乎、者、也一類',track:'mcq'},
 {id:'cross',label:'詞義跨篇',note:'同一個字，跨篇對照',track:'mcq'},
 {id:'meaning',label:'句意',note:'這句在說甚麼',track:'mcq'},
 {id:'theme',label:'主旨',note:'篇章想表達甚麼',track:'mcq'},
 {id:'technique',label:'手法',note:'修辭與寫作手法',track:'mcq'}
];
export const reviewTypeIds=reviewTypes.map(t=>t.id);

const typeText=q=>String(q.assessmentType||'');
const tagged=(q,tag)=>Array.isArray(q.tags)&&q.tags.includes(tag);

export const isPolysemy=q=>tagged(q,'school-polysemy')||q.assessmentType==='polysemy'||/多義/.test(typeText(q));
export const isFlex=q=>tagged(q,'school-flex')||/活用/.test(typeText(q));
export const isLoan=q=>tagged(q,'school-loan')||/通假/.test(typeText(q));
export const isFunctionWord=q=>tagged(q,'school-function')||/虛詞/.test(typeText(q));
export const isCrossSense=q=>tagged(q,'confusable')||q.crossEssay===true||(q.ability==='vocabulary'&&(q.essayIds?.length||0)>1);
export const isSpecialVocab=q=>isPolysemy(q)||isFlex(q)||isLoan(q)||isFunctionWord(q)||isCrossSense(q);

export function matchesReviewType(q,id){
 if(id==='context')return q.ability==='vocabulary'&&!isSpecialVocab(q);
 if(id==='typing')return false;
 if(id==='polysemy')return isPolysemy(q);
 if(id==='flex')return isFlex(q);
 if(id==='loan')return isLoan(q);
 if(id==='function')return isFunctionWord(q);
 if(id==='cross')return isCrossSense(q);
 if(id==='meaning'||id==='theme'||id==='technique')return q.ability===id;
 return false;
}

// 選題器傳進來的 tags、assessmentType、crossEssay、reviewTypes。缺了就不額外篩。
export function matchesReviewSelection(q,options={}){
 const tags=options.tags;
 if(Array.isArray(tags)&&tags.length&&!tags.some(tag=>q.tags?.includes(tag)))return false;
 if(options.assessmentType){
  const list=Array.isArray(options.assessmentType)?options.assessmentType:[options.assessmentType];
  if(list.length&&!list.includes(q.assessmentType))return false;
 }
 if(options.crossEssay===true&&!(q.essayIds?.length>1))return false;
 if(options.crossEssay===false&&q.essayIds?.length>1)return false;
 const selected=options.reviewTypes;
 if(Array.isArray(selected)&&selected.length){
  const mcq=selected.filter(id=>id!=='typing');
  if(!mcq.length||!mcq.some(id=>matchesReviewType(q,id)))return false;
 }
 return true;
}

export function reviewEmptyMessage(ids=[]){
 if(!ids.length)return '';
 if(ids.every(id=>id==='typing'))return '打字測義不在選擇題裡。請開一卷連續寫：看原句，寫這個語境的意思。';
 const waiting=ids.filter(id=>id!=='typing');
 if(waiting.length&&waiting.every(id=>id==='flex'||id==='loan'))return '選擇題裡可能還沒有這類。校練的活用和通假在打字測義，請開對應的打字卷。沒有條目時就是空的，不會用其他題冒充。';
 return '這個題型篩選下沒有題目。可以清除篩選，或改選篇章。';
}
