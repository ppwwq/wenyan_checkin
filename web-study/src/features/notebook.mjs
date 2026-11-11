import {filterNotebook,notebookItems,notebookTypes,retryableIds} from '../domain/notebook.mjs';
import {hkDay} from '../domain/review.mjs';
import {esc,button,heading,empty,essayTitle} from './shared.mjs';
import {paginate,pageButtons} from './pagination.mjs';

function chapters(item,bank){
 if(!item.essayIds.length)return '手法附錄／未分篇';
 return item.essayIds.map(id=>essayTitle(bank,id)).join('、');
}
export function notebookView(bank,state,writtenItems=[],filters={},today=hkDay()){
 const all=notebookItems(bank,state,writtenItems,today);
 const shown=filterNotebook(all,filters);
 const current=paginate(shown,filters.listPage),controls=pageButtons('notebook-page',current);
 const ready=retryableIds(shown);
 const essayOptions=[['', '全部篇章'],...((bank?.essays)||[]).map(e=>[e.id,e.title]),['@appendix','未分篇／附錄']];
 const typeOptions=[['', '全部題型'],...notebookTypes];
 const select=(id,options,current)=>'<label>'+(id==='notebook-essay'?'篇章':'題型')+'<select id="'+id+'">'+options.map(([value,label])=>'<option value="'+esc(value)+'"'+(current===value?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label>';
 const intro=heading('錯題本','先看自己的答案和參考答案，再決定要不要重練。選擇題和打字／文字題在一起。')+
  '<p class="section-note">今天答錯或今天練過的題仍留在這裡。重練要到下一個香港日；同一題今天不會再排進練習。</p>'+
  '<div class="filter-line">'+select('notebook-essay',essayOptions,filters.essay||'')+select('notebook-type',typeOptions,filters.type||'')+'</div>'+
  '<p class="section-note">共 '+all.length+' 題 · 目前顯示 '+shown.length+' 題 · 今日可重練的選擇題 '+ready.length+' 題</p>'+
  (ready.length?button('notebook-retry','開始重練可再出的 '+ready.length+' 題'):'<p class="section-note">今天沒有可再出的選擇題。可以先對答案，明日再練。</p>');
 if(!shown.length)return intro+empty(all.length?'這個篩選下沒有錯題':'還沒有留在錯題本的題','答錯的選擇題，以及打字後標成「不會」的題，會出現在這裡。暫停使用的題仍可在「記錄」查看。');
 return intro+controls+current.items.map(item=>{
  const retry=item.retryable?(item.kind==='mcq'?button('mistake-start','重練此題','data-id="'+esc(item.id)+'"','secondary'):button('notebook-written-retry','重練此題','data-id="'+esc(item.id)+'"','secondary')):'<p class="section-note">今天已練過。可以先對答案，香港時間明日零點後再練。</p>';
  return '<article class="saved-row"><p class="record-meta"><span>'+esc(chapters(item,bank))+'</span><span>'+esc(item.typeLabel)+'</span><span>'+esc(item.day||'')+'</span></p><h3>'+esc(item.stem)+'</h3>'+(item.quote?'<blockquote>'+esc(item.quote)+'</blockquote>':'')+'<div class="notebook-block"><h3>你的答案</h3><p>'+esc(item.student||'（沒有記錄）')+'</p></div><div class="notebook-block"><h3>參考答案</h3><p>'+esc(item.correct)+'</p></div><div class="notebook-block"><h3>解析</h3><p class="preserve-lines">'+(item.explanation?esc(item.explanation):'這題沒有附上解析。')+'</p></div>'+retry+'</article>';
 }).join('')+controls;
}
