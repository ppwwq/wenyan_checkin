import {publicQuestions} from './access.mjs';

const parts={i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10};
function splitQuestion(value){
 const match=String(value??'').match(/^(\d+)(?:\(([ivx]+)\))?/i);
 return {n:match?Number(match[1]):999,part:parts[String(match?.[2]||'').toLowerCase()]||0};
}
export function comparePaperQuestions(a,b){
 const left=splitQuestion(a.provenance?.question),right=splitQuestion(b.provenance?.question);
 return left.n-right.n||left.part-right.part||String(a.id).localeCompare(String(b.id));
}
export function paperQuestionLabel(q){
 const n=q.provenance?.question;
 return n?'第 '+n+' 題':q.id;
}
export function isOriginalPaperQuestion(q){
 return q?.provenance?.kind==='dse-original'&&q.active!==false&&q.status==='reviewed'&&!q.provenance?.kind?.includes('school');
}
export function listPapers(bank){
 const groups=new Map();
 for(const q of publicQuestions(bank?.questions||[]).filter(isOriginalPaperQuestion)){
  const p=q.provenance,id=p.year+'-'+p.paper+String(p.section||'');
  if(!groups.has(id))groups.set(id,{id,year:p.year,paper:p.paper,section:p.section||'',questions:[]});
  groups.get(id).questions.push(q);
 }
 return [...groups.values()].map(paper=>({...paper,questions:paper.questions.sort(comparePaperQuestions)})).sort((a,b)=>b.year-a.year||String(a.section).localeCompare(String(b.section)));
}
export function paperById(bank,id){
 return listPapers(bank).find(paper=>paper.id===id)||null;
}
export function paperTitle(paper){
 if(!paper)return '原卷';
 const section=paper.section?paper.section+'部':'';
 return paper.year+' 年卷一'+section;
}
// Only text already stored on the question. No reconstructed paper and no translation.
export function paperPassageBlocks(q){
 const blocks=[],seen=new Set();
 const add=(title,text)=>{
  const value=String(text||'').trim();
  if(!value||seen.has(value))return;
  seen.add(value);blocks.push({title,text:value});
 };
 const passages=(q.learning?.passages||[]).filter(p=>p?.original?.trim());
 if(q.quote?.trim()&&!passages.some(p=>p.original.includes(q.quote)))add('題目引文',q.quote);
 for(const p of passages)add(p.title||'原文',p.original);
 return blocks;
}
