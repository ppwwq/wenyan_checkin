// Display excerpts only. The stored quotation and historical answer snapshots stay intact.
import {translationExcerpts} from './translation-excerpts.mjs';
const normalized=value=>String(value||'').replace(/[\s\p{P}\p{S}]/gu,'');
const locations=(text,target)=>{
 const spans=[];
 if(target)for(let at=text.indexOf(target);at>=0;at=text.indexOf(target,at+target.length))spans.push({start:at,end:at+target.length});
 return spans;
};
function chunks(text,stops='。！？；'){
 const parts=[];let start=0;
 for(let i=0;i<text.length;i++)if(stops.includes(text[i])){
  let end=i+1;while('」』”'.includes(text[end])&&end<text.length)end++;
  parts.push({text:text.slice(start,end),start,end});start=end;i=end-1;
 }
 if(start<text.length)parts.push({text:text.slice(start),start,end:text.length});
 return parts;
}
function cleanEdges(text){
 let result=text.trim().replace(/^[，。；！？：]+/u,'');
 const count=char=>result.split(char).length-1;
 for(const [open,close] of [['「','」'],['『','』'],['“','”']]){
  while(result.startsWith(open)&&count(open)>count(close))result=result.slice(1);
  while(result.endsWith(close)&&count(close)>count(open))result=result.slice(0,-1);
 }
 return result.replace(/[，。；！？：]+$/u,'');
}
function clipTranslation(original,translation,needle){
 const text=normalized(original),at=text.indexOf(needle);
 if(!needle||at<0)return null;
 const exact=translationExcerpts.filter(([from,to])=>normalized(from).includes(needle)&&normalized(original).includes(normalized(from))&&translation.includes(to)).sort((a,b)=>normalized(a[0]).length-normalized(b[0]).length)[0];
 if(exact)return {original:exact[0],translation:exact[1]};
 if(text.indexOf(needle,at+1)>=0)return null;
 if(text===needle)return {original:cleanEdges(original),translation:cleanEdges(translation)};
 for(const stops of ['，。；！？：\n','。！？','；']){
  const left=chunks(original,stops).filter(p=>normalized(p.text)),right=chunks(translation,stops).filter(p=>normalized(p.text));
  if(left.length!==right.length||left.length<=1)continue;
  let cursor=0;const selected=[];
  for(let index=0;index<left.length;index++){
   const length=normalized(left[index].text).length,start=Math.max(at,cursor),end=Math.min(at+needle.length,cursor+length);
   if(start<end){
    const from=left[index].text,to=right[index].text;
    if(stops==='，。；！？：\n')selected.push({original:from,translation:to});
    else{
     const part=clipTranslation(from,to,needle.slice(start-at,end-at));
     if(!part)return null;selected.push(part);
    }
   }
   cursor+=length;
  }
  const separator=stops==='，。；！？：\n'?'':'；';
  if(selected.length)return {original:cleanEdges(selected.map(p=>p.original).join(separator)),translation:cleanEdges(selected.map(p=>p.translation).join(separator))};
 }
 // A source clause with no internal punctuation has no neighbouring meaning to cut away.
 if(chunks(original,'，。；！？：\n').filter(p=>normalized(p.text)).length===1)return {original:cleanEdges(original),translation:cleanEdges(translation)};
 return null;
}
export function compactQuotation(item){
 const full=String(item.context??item.quote??''),target=item.target||'';
 const empty={quote:full,target,targetSpans:[],multiple:false};
 const inContext=(context,start,end)=>{
  const at=typeof context==='string'&&context?full.indexOf(context):-1;
  return at>=0&&full.indexOf(context,at+1)<0&&start>=at&&end<=at+context.length;
 };
 const explicit=item.targetStart!==undefined;
 let spans;
 if(item.targetSpans!==undefined){
  if(explicit||!Array.isArray(item.targetSpans))return empty;
  let previous=-1;
  for(const s of item.targetSpans){
   if(!s||!Number.isInteger(s.start)||!Number.isInteger(s.end)||s.start<previous||s.end!==s.start+target.length||full.slice(s.start,s.end)!==target||!inContext(s.context,s.start,s.end))return empty;
   previous=s.end;
  }
  spans=item.targetSpans;
 }else if(explicit){
  const start=item.targetStart,end=start+target.length;
  if(!Number.isInteger(start)||start<0||full.slice(start,end)!==target||item.targetEnd!==undefined&&item.targetEnd!==end||item.targetContext&&!inContext(item.targetContext,start,end))return empty;
  spans=[{start,end}];
 }else spans=locations(full,target);
 if(!target||!spans.length)return {quote:full,target,targetSpans:[],multiple:false};
 const parts=chunks(full).filter(p=>spans.some(s=>s.start>=p.start&&s.end<=p.end));
 let quote='',marks=[];
 for(const part of parts){
  // Very long sentences can use the local comma clause; never truncate through the target.
  let start=part.start,end=part.end;
  const inside=spans.filter(s=>s.start>=start&&s.end<=end);
  if(end-start>72&&inside.length===1){
   start=Math.max(start,full.lastIndexOf('，',inside[0].start)+1);
   const comma=full.indexOf('，',inside[0].end);if(comma>=0&&comma<end)end=comma+1;
  }
  const join=quote?(start===parts[parts.indexOf(part)-1]?.end?'':' … '):'';
  const offset=quote.length+join.length-start;quote+=join+full.slice(start,end);
  marks.push(...inside.map(s=>({start:s.start+offset,end:s.end+offset})));
 }
 return {quote,target,targetSpans:marks.map(s=>({...s,context:quote})),multiple:!explicit&&!item.targetSpans?.length&&marks.length>1};
}

export function readingContext(item,bank,sourceContent=[]){
 const ids=item.essayIds||[item.essayId];
 const titles=ids.map(id=>bank.essays.find(e=>e.id===id)?.title||id).filter(Boolean);
 const excerpt=compactQuotation(item),needle=normalized(item.context??item.quote);
 const candidates=[];
 for(const unit of sourceContent.filter(u=>titles.some(t=>normalized(t)===normalized(u.name)))){
  for(const page of unit.pages||[]){
   const originals=(page.blocks||[]).filter(b=>b[0]==='annot');
   const at=(page.blocks||[]).findIndex(b=>b[0]==='head'&&b[1]==='語譯');
   const next=page.blocks?.[at+1];
   if(originals.length!==1||at<0||next?.[0]!=='text')continue;
   const original=originals[0][1],translation=next[1];
   if(needle.length>=2&&normalized(original).includes(needle))candidates.push({original,translation,sourceLabel:unit.name+' · '+page.title});
  }
 }
 // Some existing written items already carry reviewed, source-linked passages.
 if(!candidates.length){
  const question=bank.questions?.find(q=>q.id===item.bankQuestionId);
  for(const p of question?.learning?.passages||item.learning?.passages||[]){
   if(p.translation&&normalized(p.original).includes(needle))candidates.push({original:p.original,translation:p.translation,sourceLabel:p.title});
  }
 }
 const unique=[...new Map(candidates.map(p=>[normalized(p.original)+'|'+p.translation,p])).values()];
 let passage=unique.length===1?unique[0]:null;
 if(passage){
  const parts=excerpt.quote.split(' … ').map(part=>clipTranslation(passage.original,passage.translation,normalized(part)));
  passage=parts.length&&parts.every(Boolean)?{...passage,original:parts.map(p=>p.original).join(' … '),translation:parts.map(p=>p.translation).join('；'),label:'對應語譯'}:null;
 }
 return {excerpt,titles,passage};
}
