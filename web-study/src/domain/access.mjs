// School papers stay off public pages. Guests never receive them.
export function isSchoolPrivate(item){
 if(!item||typeof item!=='object')return false;
 const id=String(item.id||'');
 return item.provenance?.kind==='school-original'||item.origin==='school-original'||id.includes('school-original');
}
export function publicQuestions(questions=[]){
 return questions.filter(q=>q&&!isSchoolPrivate(q));
}
export const personalPages=new Set(['history','mistakes','written-mistakes','account','training','weakness','saved','quick','reports','admin']);
