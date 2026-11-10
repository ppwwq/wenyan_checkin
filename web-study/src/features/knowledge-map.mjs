import {knowledgeMap,masteryLabel,masteryMap} from '../domain/knowledge-map.mjs';
import {esc,button,heading} from './shared.mjs';

function markButton(id,marks,guest){
 if(guest)return '<span class="tag">登入後可標記</span>';
 const current=marks[id]||'';
 const label=masteryLabel[current]||'未標記';
 return button('mastery',label,'data-id="'+esc(id)+'"','secondary');
}
export function knowledgeMapView(bank,state,{guest=false}={}){
 const marks=guest?{}:masteryMap(state);
 const chapters=knowledgeMap(bank);
 const prose=chapters.filter(row=>row.essay.kind!=='poem'),poems=chapters.filter(row=>row.essay.kind==='poem');
 const card=row=>'<article class="knowledge-card"><header class="chapter-heading"><h2>'+esc(row.essay.title)+'</h2>'+markButton(row.markId,marks,guest)+'</header><p class="subtle">'+row.count+' 道已核對題 · '+esc(row.essay.kind==='poem'?'詩詞':'文言文')+'</p><ul class="knowledge-abilities">'+row.abilities.map(item=>'<li><span>'+esc(item.label)+' · '+item.count+' 題</span>'+markButton(item.markId,marks,guest)+'</li>').join('')+'</ul>'+(row.points.length?'<details><summary>知識點 '+row.points.length+'</summary>'+row.points.map(point=>'<div class="notebook-block"><h3>'+esc(point.title)+'</h3>'+(point.text?'<p>'+esc(point.text)+'</p>':'')+markButton(point.id,marks,guest)+'</div>').join('')+'</details>':'<p class="subtle">這篇的題目還沒有附上可瀏覽的知識點標題。</p>')+'</article>';
 const group=(title,rows)=>rows.length?'<section><h2>'+title+'</h2><div class="knowledge-grid">'+rows.map(card).join('')+'</div></section>':'';
 return heading('知識地圖','按十六篇查看題庫裡已有的知識點。掌握標記只存在你的帳號，不改變複習間隔。')+'<p class="section-note">'+ (guest?'未登入可以瀏覽。標記要登入後才會保存。':'點「未標記」可改成複習中、已掌握，再點一次會清除。')+'標題和說明來自題目已附的知識點，不另補教材。</p>'+group('文言文',prose)+group('詩詞',poems);
}
