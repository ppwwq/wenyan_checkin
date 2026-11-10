import {buildHandbook} from '../domain/handbook.mjs';
import {esc,heading,essayTitle} from './shared.mjs';

function card(title,body,plain='',needle=''){
 const blob=(title+' '+plain).toLowerCase();
 const hidden=needle&&!blob.includes(needle);
 return '<article class="saved-row" data-handbook="'+esc(blob)+'"'+(hidden?' hidden':'')+'><h3>'+esc(title)+'</h3>'+body+'</article>';
}
export function handbookView(bank,appendix,query=''){
 const book=buildHandbook({questions:bank?.questions||[],comparisons:bank?.comparisons||[],appendix});
 const needle=query.trim().toLowerCase();
 const linked=id=>bank.questions?.find(q=>q.id===id);
 const functions=book.functions.map(item=>card(item.word, '<p>'+esc(item.stem)+'</p><p class="card-answer">參考：'+esc(item.gloss||'這題沒有記下選項答案')+'</p>'+(item.quote?'<blockquote>'+esc(item.quote)+'</blockquote>':'')+'<p class="subtle">'+esc((item.essayIds||[]).map(id=>essayTitle(bank,id)).join('、')||'未分篇')+'</p>'+(item.explanation?'<details><summary>解析</summary><p class="preserve-lines">'+esc(item.explanation)+'</p></details>':''), item.stem+item.gloss+item.explanation+item.quote, needle));
 const patterns=book.patterns.map(item=>card(item.word, '<p>'+esc(item.stem)+'</p><p class="card-answer">參考：'+esc(item.gloss||'這題沒有記下選項答案')+'</p>'+(item.explanation?'<p class="preserve-lines">'+esc(item.explanation)+'</p>':''), item.stem+item.gloss+item.explanation, needle));
 const senses=book.senses.map(group=>{
  const body=group.items.map(item=>{
   const q=linked(item.questionId);
   return '<div class="notebook-block"><p class="card-answer">'+esc(item.meaning)+'</p>'+(q?.quote?'<blockquote>'+esc(q.quote)+'</blockquote>':'')+(item.clue?'<p>'+esc(item.clue)+'</p>':'')+'</div>';
  }).join('');
  return card(group.title||group.target, body, group.target+group.items.map(item=>item.meaning+item.clue).join(''), needle);
 });
 const rhetoric=book.rhetoric.map(section=>'<section><h3>'+esc(section.title)+'</h3>'+(section.source?'<p class="subtle">附錄來源：'+esc(section.source)+'</p>':'')+section.rows.map(row=>card(row[0], '<p class="preserve-lines">'+esc(row[1]||'')+'</p>'+(row[2]?'<p class="preserve-lines">'+esc(row[2])+'</p>':''), (row[0]||'')+(row[1]||'')+(row[2]||''), needle)).join('')+'</section>').join('');
 return heading('文言速查','查虛詞、句式、易混詞和手法。條目都來自這個倉庫已有的題庫、對照和附錄。')+
  '<p class="section-note">不是考評局用語表，也不補寫沒有來源的詞條。</p>'+
  '<label class="field" for="handbook-query">搜尋<input id="handbook-query" class="search" value="'+esc(query)+'" placeholder="輸入字、篇名或手法"></label>'+
  '<nav class="handbook-jump" aria-label="手冊分節"><a href="#hb-todo">尚未收入</a><a href="#hb-function">虛詞</a><a href="#hb-pattern">句式</a><a href="#hb-sense">易混詞</a><a href="#hb-rhetoric">手法</a></nav>'+
  '<section id="hb-todo"><h2>尚未收入</h2><ul>'+book.todos.map(item=>'<li>'+esc(item)+'</li>').join('')+'</ul></section>'+
  '<section id="hb-function"><h2>虛詞</h2><p class="section-note">'+book.functions.length+' 題。參考文字是該題已核對的選項，不是另編的詞典義。</p>'+(functions.join('')||'<p>這裡暫時沒有可列出的虛詞題。</p>')+'</section>'+
  '<section id="hb-pattern"><h2>句式</h2><p class="section-note">只列出題幹或解析寫明了被動、倒裝、賓語前置等名稱的題。'+book.patterns.length+' 題。</p>'+(patterns.join('')||'<p>這裡暫時沒有可列出的句式題。</p>')+'</section>'+
  '<section id="hb-sense"><h2>易混詞</h2><p class="section-note">來自題庫裡已核對的詞義對照。</p>'+(senses.join('')||'<p>這裡暫時沒有詞義對照。</p>')+'</section>'+
  '<section id="hb-rhetoric"><h2>手法</h2><p class="section-note">以下保留手法附錄原文。</p>'+(rhetoric||'<p>手法附錄還沒有載入。</p>')+'</section>';
}
