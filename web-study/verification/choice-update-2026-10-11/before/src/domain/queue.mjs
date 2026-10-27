import {isDue,isWeak,hkDay,questionMistakes} from './review.mjs';
export function available(questions,options={}) {
 const {essayIds=[],ability,questionIds,appendix=false,essayTypes}=options;
 return questions.filter(q=>q.status==='reviewed'&&q.active!==false&&q.essayIds.every(id=>essayIds.includes(id)&&(!essayTypes||essayTypes[id]?.includes(q.ability)))&&(!ability||q.ability===ability)&&(!questionIds||questionIds.includes(q.id))&&(!q.tags?.includes('appendix')||appendix));
}
const unique=list=>[...new Map(list.map(q=>[q.memoryId,q])).values()];
export function practicePool(questions,options,state){
 const excluded=new Set(options.excludeMemoryIds||[]);
 const wrong=options.scope==='wrong'?questionMistakes(state):null;
 return available(questions,options).filter(q=>!excluded.has(q.memoryId)&&(!wrong||wrong.has(q.id)));
}
export function shuffledQuestion(q,random=Math.random){
 if(q.choices?.length!==4)return q;
 // Logical option IDs stay stable; only their displayed positions change.
 const text=[q.stem,q.explanation,...q.choices.flatMap(c=>[c.text,c.explanation])].join(' ');
 if(/[ABCDＡＢＣＤ]\s*[項项]|[選选][項项]\s*[ABCDＡＢＣＤ]|以上皆|以上都|上述各/.test(text))return q;
 const choices=q.choices.map(c=>({...c}));
 for(let i=choices.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
 return {...q,choices:choices.map((c,i)=>({...c,displayLabel:String.fromCharCode(65+i)}))};
}
export function queue(questions,options,state,today=hkDay(),random=Math.random) {
 const {essayIds=[],count=10,rotation=0,strategy='balanced'}=options;
 if(!Number.isInteger(Number(count))||count<1||count>100) throw new Error('請輸入 1–100 的整數');
 const list=practicePool(questions,options,state);
 const priority=q=>isDue(state.memories[q.memoryId],today)?0:options.priorityMode!=='daily'&&isWeak(state.memories[q.memoryId])?1:!state.memories[q.memoryId]?2:3;
 let order=[...essayIds.slice(rotation%Math.max(1,essayIds.length)),...essayIds.slice(0,rotation%Math.max(1,essayIds.length))];
 if(strategy==='weak') order.sort((a,b)=>list.filter(q=>q.essayIds.includes(b)&&isWeak(state.memories[q.memoryId])).length-list.filter(q=>q.essayIds.includes(a)&&isWeak(state.memories[q.memoryId])).length);
 if(list.some(q=>!q.essayIds.length&&q.tags?.includes('appendix')))order.push('@appendix');
 const buckets=new Map(order.map(id=>[id,list.filter(q=>id==='@appendix'?!q.essayIds.length&&q.tags?.includes('appendix'):q.essayIds[0]===id).sort((a,b)=>priority(a)-priority(b)||a.id.localeCompare(b.id))]));
 const result=[],used=new Set(),usedGroups=new Set(); let changed=true;
 while(result.length<count&&changed){changed=false;for(const id of order){const bucket=buckets.get(id);let q;while(bucket?.length){q=bucket.shift();if(!used.has(q.memoryId)&&(!q.practiceGroup||!usedGroups.has(q.practiceGroup)))break;q=null;}if(q){result.push(q);used.add(q.memoryId);if(q.practiceGroup)usedGroups.add(q.practiceGroup);changed=true;}if(result.length>=count)break;}}
 return result.map(q=>shuffledQuestion(q,random));
}
export function quickCards(questions,options,state){
 return unique(available(questions,options).filter(q=>options.scope==='saved'?state.favorites[q.id]?.saved:options.scope==='weak'?isWeak(state.memories[q.memoryId])||isDue(state.memories[q.memoryId]):isWeak(state.memories[q.memoryId])||isDue(state.memories[q.memoryId])||state.favorites[q.id]?.saved).sort((a,b)=>Number(isDue(state.memories[b.memoryId]))-Number(isDue(state.memories[a.memoryId]))||Number(isWeak(state.memories[b.memoryId]))-Number(isWeak(state.memories[a.memoryId]))));
}
export function weakness(questions,state,essayId,ability){
 const units=unique(questions.filter(q=>q.status==='reviewed'&&q.active!==false&&q.essayIds.includes(essayId)&&q.ability===ability));
 const studied=units.filter(q=>typeof state.memories[q.memoryId]?.correct==='boolean');
 return {total:units.length,studied:studied.length,weak:studied.filter(q=>isWeak(state.memories[q.memoryId])).length,due:studied.filter(q=>isDue(state.memories[q.memoryId])).length,choice:studied.filter(q=>state.memories[q.memoryId].mode==='choice').length,pending:units.filter(q=>state.memories[q.memoryId]?.pending).length,typing:studied.filter(q=>state.memories[q.memoryId].mode==='typing').length,latest:studied.map(q=>state.memories[q.memoryId].day).sort().at(-1),status:!units.length?'unavailable':!studied.length?'unassessed':'assessed'};
}

export function quickScopeKey(options){return JSON.stringify({essays:[...options.essayIds].sort(),ability:options.ability||'',appendix:!!options.appendix,scope:options.quickScope||'both'});}
