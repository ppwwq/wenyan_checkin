import {button,esc} from './shared.mjs';

export function paginate(items,index=0){
 const size=40,pages=Math.max(1,Math.ceil(items.length/size));
 const page=Math.min(pages-1,Math.max(0,Math.trunc(Number(index))||0));
 return {items:items.slice(page*size,(page+1)*size),page,pages,total:items.length,start:page*size,end:Math.min(items.length,(page+1)*size)};
}
export function pageButtons(action,current,attributes=''){
 if(current.pages===1)return '';
 const previous=button(action,'上一頁','data-index="'+(current.page-1)+'" '+attributes+(current.page===0?' disabled':''),'secondary');
 const next=button(action,'下一頁','data-index="'+(current.page+1)+'" '+attributes+(current.page===current.pages-1?' disabled':''),'secondary');
 return '<nav class="toolbar" aria-label="列表分頁">'+previous+'<span role="status">第 '+esc(current.start+1)+'–'+esc(current.end)+' 筆，共 '+esc(current.total)+' 筆 · '+(current.page+1)+' / '+current.pages+' 頁</span>'+next+'</nav>';
}
