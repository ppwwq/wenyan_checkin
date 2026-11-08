import {esc} from './shared.mjs';
export function readingTranslation(reading){
 const passages=reading.passages||[reading.passage].filter(Boolean);
 if(!passages.length)return '<p class="subtle">這條原資料缺少可核對的完整句子，句譯待核；字詞提示請參照上方答案。</p>';
 return (passages.length>1?'<p class="subtle">這句在文中有多處，分別列出對應短譯。</p>':'')+passages.map(p=>'<section class="reading-translation"><h3>'+esc(p.label)+'</h3><p>'+esc(p.translation)+'</p><details><summary>查看語譯來源與原句</summary><p class="subtle">'+esc(p.sourceLabel)+'</p><p>'+esc(p.original)+'</p>'+(p.note?'<p class="subtle">'+esc(p.note)+'</p>':'')+'</details></section>').join('');
}
