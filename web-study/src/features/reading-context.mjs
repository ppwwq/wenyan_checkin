import {esc} from './shared.mjs';
export function readingTranslation(reading){
 const p=reading.passage;
 if(!p)return '<p class="subtle">這句的語譯尚待核對。</p>';
 return '<section class="reading-translation"><h3>'+esc(p.label)+'</h3><p>'+esc(p.translation)+'</p><details><summary>查看語譯來源與原句</summary><p class="subtle">'+esc(p.sourceLabel)+'</p><p>'+esc(p.original)+'</p></details></section>';
}
