import {listPapers,paperPassageBlocks,paperQuestionLabel,paperTitle} from '../domain/papers.mjs';
import {answerPanel} from './practice.mjs';
import {esc,button,heading,empty,essayTitle,quote} from './shared.mjs';

function passageHtml(q,block){
 return block.text===q.quote?quote(q):esc(block.text);
}
export function paperListView(bank){
 const papers=listPapers(bank);
 const intro=heading('原卷對照作答','左邊看這題已有的引文，右邊作答。只收錄題庫裡標成 DSE 原題、而且已經核對的選擇／圈選分題，不是完整試卷。')+'<p class="section-note">校本題不會出現在這裡。沒有收進題庫的卷面和評分點不會補寫。</p>';
 if(!papers.length)return intro+empty('題庫裡還沒有可對照的 DSE 原題');
 return intro+'<div class="library-grid">'+papers.map(paper=>{
  const essays=[...new Set(paper.questions.flatMap(q=>q.essayIds))].map(id=>essayTitle(bank,id)).join('、');
  const marks=paper.questions.reduce((n,q)=>n+(Number(q.provenance?.marks)||0),0);
  return '<article class="library-card"><span class="eyebrow">'+esc(paperTitle(paper))+'</span><h2>'+paper.questions.length+' 題'+(marks?' · '+marks+' 分':'')+'</h2><p>'+esc(essays||'跨篇或未分篇')+'</p><p class="subtle">'+paper.questions.map(q=>paperQuestionLabel(q)).join('、')+'</p>'+button('paper-open','開始對照','data-id="'+esc(paper.id)+'"')+'</article>';
 }).join('')+'</div>';
}
export function paperPracticeView(bank,session,state){
 const q=session.questions[session.index]||session.questions[0];
 if(!q)return empty('這卷沒有題目');
 const blocks=paperPassageBlocks(q);
 const source=q.source?.title?(esc(q.source.title)+(q.source.pdfPage?' · 第 '+esc(q.source.pdfPage)+' 頁':'')):'';
 const sheet=blocks.length?blocks.map(block=>'<div class="reading-passage"><p class="passage-label">'+esc(block.title)+'</p><blockquote>'+passageHtml(q,block)+'</blockquote></div>').join(''):'<p>這題在題庫裡沒有另附原文，只保留題幹。</p>';
 const nav=session.questions.map((item,index)=>'<button type="button" class="chip'+(item.id===q.id?' active':'')+'" data-action="paper-go" data-index="'+index+'">'+esc(paperQuestionLabel(item))+'</button>').join('');
 return '<div class="practice-head">'+button('nav','← 原卷列表','data-page="papers"','quiet')+'<span class="session-meta">'+esc(session.paperTitle||paperTitle({year:q.provenance?.year,section:q.provenance?.section}))+' · '+(session.index+1)+' / '+session.questions.length+'</span></div>'+(session.completed?'<p class="banner">這卷已收錄的分題都提交了。可以翻回去看答案；今天練過的題，要到下一個香港日才會再出現在其他練習。</p>':'')+'<div class="paper-layout"><section class="paper-sheet source-panel" aria-label="原卷引文"><h2>引文</h2>'+sheet+(source?'<p class="subtle">'+source+'</p>':'')+'</section><section class="paper-questions"><div class="paper-nav">'+nav+'</div><div id="answer-panel">'+answerPanel(q,session,state,{hideSource:true})+'</div></section></div>';
}
