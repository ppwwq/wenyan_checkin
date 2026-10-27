import {esc,button,heading,abilities,essayTitle} from './shared.mjs';
import {dailyProgress,retryQuestions,questionMistakes,validTraining,trainingAbilities} from '../domain/training.mjs';

export function trainingView(bank,state,options){
 const saved=state.settings.training,legacy=!saved&&options.hasPreviousSelection;
 const plan=validTraining(saved)?saved:{version:1,chapters:Object.fromEntries((legacy?options.essayIds||[]:[]).map(id=>[id,options.ability?[options.ability]:trainingAbilities])),dailyCount:options.count||20,retry:true,appendix:!!options.appendix};
 const wrong=questionMistakes(state),attempted=new Set(state.attempts.map(e=>e.payload.questionId));
 const cards=bank.essays.map(e=>{
  const qs=bank.questions.filter(q=>q.essayIds.includes(e.id)&&q.status==='reviewed'&&q.active!==false),selected=Object.hasOwn(plan.chapters,e.id);
  const types=Object.entries(abilities).map(([type,label])=>{
   const count=qs.filter(q=>q.ability===type).length,checked=count>0&&(!selected||plan.chapters[e.id].includes(type));
   return '<label><input type="checkbox" data-training-type="'+type+'" data-chapter="'+esc(e.id)+'" '+(checked?'checked':'')+' '+(!count?'disabled':'')+'> '+label+' <small>'+count+' 題</small></label>';
  }).join('');
  const count=Object.keys(abilities).filter(type=>qs.some(q=>q.ability===type)&&(!selected||plan.chapters[e.id].includes(type))).length;
  return '<article class="library-card"><label><input type="checkbox" data-training-essay="'+esc(e.id)+'" '+(selected?'checked':'')+' '+(!qs.length?'disabled':'')+'><div><h3>'+esc(e.title)+'</h3><p>'+qs.length+' 題'+(attempted.size?' · 已練 '+qs.filter(q=>attempted.has(q.id)).length+' · 曾答錯 '+qs.filter(q=>wrong.has(q.id)).length:'')+'</p></div></label><details class="training-type-details" data-types-for="'+esc(e.id)+'" '+(!selected?'hidden':'')+'><summary>題目類型 · <span data-type-summary>'+count+' 類</span> · 調整</summary><div class="training-types">'+types+'</div></details></article>';
 }).join('');
 return heading(saved?'學習設定':'設定我的訓練','先選正在學的篇章，再定每日題量。題目類型可按需要展開調整。')+
 (legacy?'<p class="banner">沿用原有選擇作為建議；請確認一次。已有作答與草稿全部保留。</p>':'')+
 '<form id="training-form" data-first="'+(!saved&&!legacy)+'"><h2>1. 選擇篇章</h2><p class="section-note">可先選 1–2 篇；每篇預選全部可用題型，之後隨時調整。</p><div class="toolbar">'+button('training-all','全選','','quiet')+button('training-none','清除選擇','','quiet')+'</div><div class="library-grid training-grid">'+cards+'</div>'+
 '<section class="scope-panel"><label class="check-row"><input name="appendix" type="checkbox" '+(plan.appendix?'checked':'')+'> 加入獨立手法附錄</label></section>'+
 '<section class="scope-panel"><h2>2. 安排每日題量</h2><label for="daily-count">每日題量</label> <input id="daily-count" name="dailyCount" class="count-field" type="number" min="1" max="100" required value="'+plan.dailyCount+'"><div class="toolbar">'+[10,20,30].map(n=>button('daily-count',n+' 題','data-count="'+n+'"','secondary')).join('')+'</div><p class="subtle">同一天同一知識點只計一次，答錯也計入已練；錯題回練另計。修改目標不會清除今日進度。</p><label class="check-row"><input name="retry" type="checkbox" '+(plan.retry?'checked':'')+'> 當日錯題回練（每個知識點最多自動安排一次）</label></section>'+
 '<p class="section-note">保存後立即更新未答題；已提交答案及仍在範圍內的草稿保留。</p><p id="training-error" class="error" role="alert"></p><div class="training-save-bar"><p id="training-selection" role="status">已選 '+Object.keys(plan.chapters).length+' 篇'+(plan.appendix?' + 手法附錄':'')+' · 每日 '+plan.dailyCount+' 題</p><div class="toolbar"><button class="btn" type="submit">保存學習設定</button>'+button('nav','返回首頁','data-page="home"','quiet')+'</div></div></form>';
}
export function dailyHomeView(bank,state){
 const p=dailyProgress(state),days=Math.round((Date.parse('2027-04-08')-Date.parse(p.today))/86400000),plan=state.settings.training,configured=validTraining(plan),retry=retryQuestions(bank.questions,state);
 const sessions=Object.values(state.sessions).filter(s=>!s.completed&&s.questions?.length).sort((a,b)=>b.startedAt.localeCompare(a.startedAt));
 const daily=sessions.find(s=>s.kind==='daily'),retrySession=sessions.find(s=>s.kind==='retry');
 const others=sessions.filter(s=>s!==daily&&s!==retrySession);
 const remaining=s=>s.questions.filter(q=>!state.attempts.some(a=>a.payload.sessionId===s.id&&a.payload.questionId===q.id)).length;
 const scope=configured?'<details class="training-scope section-note"><summary>目前範圍：'+Object.keys(plan.chapters).length+' 篇'+(plan.appendix?' + 手法附錄':'')+' · 展開篇章與題型</summary><ul>'+Object.entries(plan.chapters).map(([id,types])=>'<li>'+esc(essayTitle(bank,id))+'：'+esc(types.map(t=>abilities[t]).join('、'))+'</li>').join('')+(plan.appendix?'<li>獨立手法附錄</li>':'')+'</ul></details>':'<p class="section-note">首次選好篇章與類型，之後不必每天重選。</p>';
 return '<section class="home-primary" aria-label="開始與繼續練習"><div class="start-card"><div class="start-copy"><p class="eyebrow">'+(days<0?'距設定考試日已過':'DSE 中文倒數')+'</p><h1 class="start-countdown" aria-label="'+(days<0?'距設定考試日已過 ':'距設定考試日還有 ')+Math.abs(days)+' 天"><span class="countdown-value">'+Math.abs(days)+'</span><span class="countdown-unit">天</span></h1><p>'+(configured?(p.remaining?'今天，繼續積累。':'今日目標已完成'):'選擇篇章，開始今天的練習。')+'</p></div>'+(!configured?button('training-settings','設定我的訓練'):daily?button('resume','繼續訓練','data-session="'+esc(daily.id)+'"'):p.remaining?button('daily-start','開始今日訓練 →'):button('extra','自選加練','','secondary'))+'</div></section>'+
 '<section class="home-details"><div class="section-title"><h2>今天的進度</h2><span class="subtle">'+p.today+'</span></div><div class="metric-grid"><div class="metric"><strong>'+p.done+'／'+p.goal+'</strong>今日已練知識點</div><div class="metric"><strong>'+p.total+'</strong>累計已練知識點</div><div class="metric"><strong>'+p.retries+'</strong>今日錯題回練作答</div></div><p class="section-note">今日已練包含答對、答錯與待自查；同一知識點不重複計數。</p>'+scope+(daily?'<p class="section-note">上次的題組尚可繼續 · 剩餘 '+remaining(daily)+' 題，已提交的答案仍保留。</p>':'')+'<div class="toolbar">'+button('training-settings','調整篇章與每日題量','','quiet')+button('extra','自選加練','','quiet')+'</div><p class="subtle">考試日：2027-04-08</p>'+(retry.length||retrySession?'<div class="resume-card"><div><h2>錯題回練</h2><p>'+retry.length+' 個知識點可回練，不用等待，不重複計入今日目標。</p></div>'+button('retry-today',retrySession?'繼續錯題回練':'開始錯題回練','','secondary')+'</div>':'')+'</section>'+(others.length?'<details class="older-sessions"><summary>其他未完成練習（'+others.length+'）</summary>'+others.map(s=>'<div class="resume-card"><p>'+s.questions.length+' 題 · '+esc(s.startedAt.slice(0,10))+'</p>'+button('resume','繼續上次','data-session="'+esc(s.id)+'"','secondary')+'</div>').join('')+'</details>':'');
}
