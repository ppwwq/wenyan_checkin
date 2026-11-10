import {publicQuestions} from './access.mjs';
const abilities={vocabulary:'字詞',meaning:'句意',theme:'主旨',technique:'手法'};

const generic=new Set(['本句的理解要點','讀法與自查','本題的理解要點']);
export const masteryMarks=['learning','known'];
export const masteryLabel={learning:'複習中',known:'已掌握'};
export function masteryMap(state){
 const value=state?.settings?.mastery;
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 return Object.fromEntries(Object.entries(value).filter(([id,mark])=>typeof id==='string'&&id.length>0&&id.length<=160&&masteryMarks.includes(mark)));
}
export function cycleMastery(current){
 if(current==='learning')return 'known';
 if(current==='known')return '';
 return 'learning';
}
export function validMastery(value){
 if(value===undefined)return true;
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const keys=Object.keys(value);
 if(keys.length>500)return false;
 return keys.every(id=>typeof id==='string'&&id.length>0&&id.length<=160&&!['__proto__','constructor','prototype'].includes(id)&&(value[id]==='learning'||value[id]==='known'));
}
export function knowledgeMap(bank){
 const questions=publicQuestions(bank?.questions||[]).filter(q=>q.active!==false&&q.status==='reviewed');
 return (bank?.essays||[]).map(essay=>{
  const own=questions.filter(q=>q.essayIds?.includes(essay.id));
  const abilityRows=Object.entries(abilities).map(([id,label])=>({id,label,count:own.filter(q=>q.ability===id).length,markId:essay.id+'/'+id}));
  const seen=new Set(),points=[];
  for(const q of own)for(const item of q.learning?.knowledge||[]){
   const title=String(item?.title||'').trim();
   if(!title||generic.has(title)||seen.has(title))continue;
   seen.add(title);
   const markId=essay.id+'/note/'+encodeURIComponent(title);
   if(markId.length>160)continue;
   points.push({id:markId,title,text:String(item.text||'').trim()});
  }
  return {essay,count:own.length,abilities:abilityRows,points,markId:essay.id};
 });
}
