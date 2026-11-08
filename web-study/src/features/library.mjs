import {studyPaths} from './records.mjs';
import {compactQuotation} from '../domain/reading-context.mjs';
import {studyPools} from '../domain/editorial.mjs';
import {practicedIds,questionProgress} from '../domain/choice-progress.mjs';
import {available,scopePool,queue} from '../domain/queue.mjs';
import {choiceSources,choiceFamilies,choiceSource,choiceOriginLabel,classifyChoice} from '../domain/choice-classification.mjs';
import {isDue} from '../domain/review.mjs';
import {esc,button,heading,essayTitle,abilities,empty,quote} from './shared.mjs';
import {reviewTypeChecks} from './review-hall.mjs';
import {reviewEmptyMessage} from '../domain/review-types.mjs';
import {schoolSectionType} from '../domain/school-vocab.mjs';

function filterSelect(id,label,items,current){
 return '<label>'+label+'<select id="'+id+'">'+items.map(([value,name])=>
  '<option value="'+esc(value)+'"'+(current===value?' selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label>';
}

function choiceSourceTable(inventory){
 const bySource=new Map();
 const increment=(map,key)=>map.set(key,(map.get(key)||0)+1);
 for(const q of inventory){
  const source=choiceSource(q);
  if(!bySource.has(source))bySource.set(source,{origins:new Map(),families:new Map(),total:0});
  const group=bySource.get(source);
  group.total++;
  increment(group.origins,choiceOriginLabel(q,source));
  const {family,topic}=classifyChoice(q);
  if(!group.families.has(family))group.families.set(family,new Map());
  increment(group.families.get(family),topic);
 }
 const blocks=Object.entries(choiceSources).filter(([key])=>bySource.has(key)).map(([key,label])=>{
  const {origins,families,total}=bySource.get(key);
  const originsText=[...origins].sort(([a],[b])=>a.localeCompare(b,'zh-Hant')).map(([name,count])=>name+' '+count+' 題').join(' · ');
  const rows=choiceFamilies.map(family=>{
   const topics=[...(families.get(family)||[])].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-Hant'));
   const count=topics.reduce((sum,[,n])=>sum+n,0);
   const breakdown=topics.map(([topic,n])=>topic+' '+n).join(' · ');
   return '<tr><th scope="row">'+esc(family)+'</th><td>'+count+'</td><td>'+esc(breakdown||'—')+'</td></tr>';
  }).join('');
  return '<section><h3>'+esc(label)+' · '+total+' 題</h3><p class="section-note">'+esc(originsText)+'</p>'+
   '<div class="table-wrap"><table aria-label="'+esc(label)+'的主要考點"><thead><tr><th scope="col">主類</th><th scope="col">題數</th><th scope="col">細考點與題數</th></tr></thead><tbody>'+rows+'</tbody></table></div></section>';
 });
 return '<details class="queue-details"><summary>來源明細與分類表</summary>'+
  '<p class="section-note">這裡列出整個選擇題庫，含擴展字詞與手法附錄。每題按主要考點計一次。</p>'+blocks.join('')+'</details>';
}

function choiceFilters(bank,options){
 const inventory=available(bank.questions,{essayIds:bank.essays.map(e=>e.id),studyPool:'complete',appendix:true});
 const sources=new Map();
 const families=new Map();
 const topics=new Map();
 const source=options.choiceSource??(options.sourceKind==='dse-original'?'dse-original':'');
 const family=options.choiceFamily||'';
 const topic=options.choiceTopic||'';
 for(const q of inventory){
  const kind=choiceSource(q);
  sources.set(kind,(sources.get(kind)||0)+1);
  if(source&&source!==kind)continue;
  const classified=classifyChoice(q);
  families.set(classified.family,(families.get(classified.family)||0)+1);
  if(family&&family!==classified.family)continue;
  for(const name of new Set([classified.topic,...classified.related]))topics.set(name,(topics.get(name)||0)+1);
 }
 const withCount=(label,count=0)=>label+'（'+count+'）';
 const sourceItems=Object.entries(choiceSources).filter(([key])=>sources.has(key)||key===source).map(([key,label])=>[key,withCount(label,sources.get(key))]);
 const familyItems=choiceFamilies.map(name=>[name,withCount(name,families.get(name))]);
 if(topic&&!topics.has(topic))topics.set(topic,0);
 const topicItems=[...topics].sort(([a],[b])=>a.localeCompare(b,'zh-Hant')).map(([name,count])=>[name,withCount(name,count)]);
 return '<div class="filter-line">'+
  filterSelect('choiceSource','來源',[['',withCount('全部來源',inventory.length)],...sourceItems],source)+
  filterSelect('choiceFamily','主類',[['','全部主類'],...familyItems],family)+
  filterSelect('choiceTopic','考點',[['','全部考點'],...topicItems],topic)+'</div>'+
  '<p class="section-note">括號是題庫中的題數。實際可組題量按篇章、題池和今天的作答情況計算。考點也會找到相關題，例如「比喻論證」。舊字詞模板可在「題池與其他範圍」開啟。</p>'+
  choiceSourceTable(inventory);
}

export function libraryView(bank,state,options,schoolItems=[]){
 options={...options,studyPool:options.studyPool||'basic'};
 const seen=practicedIds(state);
 const schoolForTypes=schoolItems.filter(item=>(options.reviewTypes||[]).includes(schoolSectionType[item.section]));
 const schoolSheetButton=schoolForTypes.length?button('sheet-start','開打字卷（'+schoolForTypes.length+' 條校練）','data-section="'+(options.reviewTypes||[]).find(id=>['polysemy','flex','loan'].includes(id))+'" data-all="1"','secondary'):'';
 const progressText=qs=>{const p=questionProgress(qs,seen);return '共 '+p.total+' 題 · 已練 '+p.done+' 題 · 未練 '+p.remaining+' 題';};
 const chapterPool=scopePool(bank.questions,{...options,essayIds:bank.essays.map(e=>e.id)},state);
 const pool=scopePool(bank.questions,options,state),list=queue(bank.questions,options,state);
 const distribution=options.essayIds.map(id=>essayTitle(bank,id)+' '+list.filter(q=>q.essayIds[0]===id).length+' 題').concat(list.some(q=>!q.essayIds.length)?['手法附錄 '+list.filter(q=>!q.essayIds.length).length+' 題']:[]).join(' · ');
 const selectedIds=options.essayIds.filter(id=>chapterPool.some(q=>q.essayIds.includes(id)));
 const card=e=>{const qs=chapterPool.filter(q=>q.essayIds.includes(e.id));return '<article class="library-card '+(qs.length&&options.essayIds.includes(e.id)?'selected ':'')+(!qs.length?'disabled':'')+'"><label><input id="essay-'+esc(e.id)+'" type="checkbox" data-essay="'+esc(e.id)+'" '+(qs.length&&options.essayIds.includes(e.id)?'checked':'')+' '+(!qs.length?'disabled':'')+'><div><h3>'+esc(e.title)+'</h3><p class="chapter-counts">'+progressText(qs)+'</p>'+(!qs.length?'<p class="subtle">'+(options.scope==='wrong'?'此篩選下暫無錯題':'此篩選下暫無題目')+'</p>':'')+'</div></label></article>';};
 const groups=[['prose','文言文'],['poem','詩詞']].map(([kind,title])=>{const essays=bank.essays.filter(e=>kind==='poem'?e.kind==='poem':e.kind!=='poem');return essays.length?'<section class="chapter-group"><h2>'+title+'</h2><div class="library-grid">'+essays.map(card).join('')+'</div></section>':'';}).join('');
 return '<div class="library-page">'+heading(options.scope==='wrong'?'錯題複習':'選幾篇，一起練','按來源、主類和考點選選擇題，再勾選篇章。')+studyPaths(true)+
  '<div class="toolbar">'+button('written-list','DSE 真題 · 文字練習','data-origin="official-original"','secondary')+
  (bank.localIntegrationAvailable?'<a class="btn secondary" href="/content/local-private/integration-audit/index.html#choices">整合題庫 · 來源、考點與答題提醒</a>':'')+'</div>'+
  (options.questionIds?'<div class="banner">目前限於從其他入口帶入的 '+options.questionIds.length+' 道題。'+button('clear-subset','恢復全部已選篇章題目','','quiet')+'</div>':'')+
  '<section class="scope-panel library-filters" aria-labelledby="scope-title"><h2 id="scope-title">選擇題分類</h2>'+choiceFilters(bank,options)+
  '<details class="queue-details" '+(options.ability||options.scope==='wrong'||options.reviewTypes?.length||options.studyPool!=='default'?'open':'')+'><summary>題池與其他範圍</summary><div class="filter-line">'+
  filterSelect('studyPool','題池',[...Object.entries({...studyPools,basic:'基礎練習'}),['complete','完整題池（含舊模板）']],options.studyPool)+
  filterSelect('ability','能力',[['','全部能力'],...Object.entries(abilities)],options.ability||'')+
  filterSelect('scope','範圍',[['all','全部題目'],['wrong','只練錯題']],options.scope||'all')+'</div>'+
  '<fieldset class="review-type-filter"><legend>題型館篩選（可多選）</legend><div class="review-type-options">'+reviewTypeChecks(options.reviewTypes)+'</div></fieldset>'+
  '<p class="section-note">題型館篩選會和上面的分類一起生效。打字測義和短答可另開練習。</p></details>'+(options.reviewTypes?.includes('typing')?button('sheet-start','開打字測義卷（看句寫義）','data-all="1"','secondary'):'')+schoolSheetButton+'<div class="toolbar"><label for="question-count">題數</label><input id="question-count" class="count-field" type="number" inputmode="numeric" min="1" max="100" value="'+options.count+'">'+[10,20,30].map(n=>button('count',n+' 題','data-count="'+n+'"','secondary')).join('')+'</div><label class="check-row"><input type="checkbox" id="appendix" '+(options.appendix?'checked':'')+'> 開啟手法附錄專項</label><p class="section-note">待核題不會混入已審自編仿真；自編仿真有具名原型，難度未經等值試測。已練按累計不同題目計算，答錯也計入；跳過不計。同一知識點及同組辨析題每天只出現一次，跳過後當天也不再出題。</p><p class="selection-progress" role="status">'+progressText(pool)+'</p></section>'+
  '<div class="toolbar chapter-tools">'+button('select-all','全選可用篇章','','secondary')+button('select-prose','只選文言文','','secondary')+button('select-poem','只選詩詞','','secondary')+button('select-none','清空','','quiet')+'</div>'+groups+
  (!list.length?'<div class="empty"><h2>'+ (pool.length?'今天沒有尚未出現的題目':'目前範圍沒有可練題目')+'</h2><p>'+(pool.length?'所選範圍今天已練過或已跳過，明日可再練，也可改選其他篇章。':(reviewEmptyMessage(options.reviewTypes)||'請勾選有題目的篇章，或清除來源、能力、題型及錯題篩選。'))+'</p>'+(options.reviewTypes?.includes('typing')?button('sheet-start','開打字測義卷（看句寫義）','data-all="1"'):'')+schoolSheetButton+button('clear-filters','清除篩選','','secondary')+'</div>':'')+
  '<details class="queue-details"><summary>組題分布與安排規則</summary><p>'+esc(distribution||'先選擇篇章')+'</p><p>'+progressText(pool)+' · 到期 '+pool.filter(q=>isDue(state.memories[q.memoryId])).length+' 題</p><p>先到期、再薄弱與未練。跨篇題只在涉及篇章全部選中時出現；不重複同一知識點湊數。</p>'+(options.count<options.essayIds.length?'<p>本組題數少於所選篇數，未覆蓋篇章會在後續組優先輪到。</p>':'')+'</details><div class="toolbar">'+button('nav','易混詞義對照','data-page="compare"','quiet')+'</div>'+
  '<div class="library-start-bar"><p role="status">已選 '+selectedIds.length+' 篇 · 可組成 '+list.length+' 題'+(list.length<options.count?'（目標 '+options.count+' 題）':'')+'</p>'+button('start',options.scope==='wrong'?'開始錯題複習 →':'開始均衡混練 →',!list.length?'disabled':'')+'</div></div>';
}
export function compareView(bank,options,target='',expanded=false){
 const selected=new Set(options.essayIds),groups=bank.comparisons.filter(g=>g.status==='reviewed'&&(!target||g.target===target));
 const visible=groups.map(g=>({...g,items:g.items.map(item=>({...item,q:bank.questions.find(q=>q.id===item.questionId&&q.status==='reviewed'&&q.active!==false)})).filter(item=>item.q&&(expanded||item.q.essayIds.every(id=>selected.has(id))))})).filter(g=>g.items.length>=2);
 return heading('同一個字，不同的語境','只閱讀對照，不會計為答題或改變複習間隔。')+'<div class="toolbar">'+button('nav','← 返回選篇','data-page="library"','quiet')+button('compare-expand',expanded?'只看已選篇章':'明確加入其他篇章對照','','secondary')+'</div>'+(visible.length?visible.map(g=>'<section><h2>'+esc(g.title)+'</h2><div class="compare-grid">'+g.items.map(({q,meaning,clue})=>'<article class="compare-card"><span class="tag">'+esc(q.essayIds.map(id=>essayTitle(bank,id)).join('／'))+'</span><blockquote>'+quote(compactQuotation(q))+'</blockquote><p class="card-answer">'+esc(meaning)+'</p><p>'+esc(clue)+'</p>'+'</article>').join('')+'</div><div class="toolbar">'+button('compare-practice','練習這些用法','data-group="'+esc(g.id)+'"')+'</div></section>').join(''):empty('所選範圍暫無可並列的已核對用法','可明確加入其他篇章查看；原練習組的範圍和題目不變。'));
}

