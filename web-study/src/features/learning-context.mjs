import {esc,quote} from './shared.mjs';

export function sourceLabel(q){
 const p=q.provenance;
 if(p?.kind==='school-original')return '校本原題 · '+p.school+' · '+p.exam+' · 甲部第 '+p.question+' 題 · '+p.marks+' 分';
 return p?.kind==='dse-original'?'DSE 原題 · '+p.year+' · 卷一甲部 · 第 '+p.question+' 題 · '+p.marks+' 分':p?.kind==='authored'?'修辭練習 · 自編題目':'';
}
function original(p,q){
 const at=p.original.indexOf(q.quote),target=at>=0&&Number.isInteger(q.targetStart)?at+q.targetStart:-1;
 return quote({...q,quote:p.original,targetStart:target});
}
function passageView(p,q){return '<div class="reading-passage"><p class="passage-label">'+esc(p.title)+'</p><blockquote>'+original(p,q)+'</blockquote></div>';}
export function originalView(q){
 const passages=q.learning?.passages||[];
 const primary=q.quote?.trim()&&!passages.some(p=>p.original===q.quote)?'<div class="reading-passage"><p class="passage-label">題目引文</p><blockquote>'+quote(q)+'</blockquote></div>':'';
 return primary+passages.map(p=>passageView(p,q)).join('');
}
// The question keeps only its own assessed quotation. Added reading belongs in feedback.
export function questionMaterialView(q){
 return q.quote?.trim()?'<div class="reading-passage"><p class="passage-label">'+(q.provenance?.kind==='authored'?'練習例句':'題目引文')+'</p><blockquote>'+quote(q)+'</blockquote></div>':'';
}
export function learningView(q){
 const passages=q.learning?.passages||[],knowledge=q.learning?.knowledge||[];
 const translated=q.ability==='vocabulary'&&passages.some(p=>p.translation);
 const context=translated?passages.map(p=>'<div class="passage-pair">'+passageView(p,q)+(p.translation?'<div class="sentence-translation"><h4>全句語譯</h4><p>'+esc(p.translation)+'</p></div>':'')+'</div>').join(''):originalView(q);
 const longContext=passages.reduce((n,p)=>n+p.original.length,0)>160||(passages.length>1&&q.quote?.trim());
 const cited=[...String(q.explanation||'').matchAll(/「([^「」]{4,80})」/g)].map(m=>m[1]).filter((text,i,all)=>all.indexOf(text)===i&&passages.some(p=>p.original.includes(text))).slice(0,2);
 const brief=q.quote?.trim()?'<blockquote>'+quote(q)+'</blockquote>':cited.map(text=>'<blockquote>'+esc(text)+'</blockquote>').join('');
 const shownContext=longContext?brief+'<details class="extended-context"><summary>'+(translated?'查看完整句譯與上下文':'查看原文上下文')+'</summary>'+context+'</details>':context;
 const core=knowledge.filter(k=>k.title!=='本句的理解要點');
 const more=knowledge.filter(k=>!core.includes(k));
 const explain=k=>'<h4>'+esc(k.title)+'</h4><p>'+esc(k.text)+'</p>';
 return (context?'<section class="answer-context"><h3>'+(q.provenance?.kind==='authored'?'對應例句':'對應原文')+(translated?'與全句語譯':'')+'</h3>'+shownContext+'</section>':'')+
  (core.length?'<section class="related-knowledge"><h3>相關知識點</h3>'+core.map(explain).join('')+'</section>':'')+
  (more.length?'<details class="extended-knowledge"><summary>延伸理解</summary>'+more.map(explain).join('')+'</details>':'')+
  (q.provenance?.kind==='dse-original'?'<details class="source-details"><summary>真題出處與編者說明</summary><p class="section-note">'+esc(sourceLabel(q))+'。原卷 PDF 第 '+esc(q.source.pdfPage)+' 頁；'+esc(q.provenance.markingTitle)+' PDF 第 '+esc(q.provenance.markingPdfPage)+' 頁。題目及答案按原卷與所附評分資料核對；解析及相關知識為編者補充。</p></details>':'');
}
