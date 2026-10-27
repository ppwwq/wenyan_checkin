import {writtenView} from './features/written.mjs';
import {writtenItems,writtenState,writtenResult} from './domain/written.mjs';
import {SaveQueue} from './storage/save-queue.mjs';
import {Repository,event} from './storage/repository.mjs';
import {SyncScheduler} from './sync/scheduler.mjs';
import {api,SyncClient} from './sync/client.mjs';
import {project,hkDay,isDue} from './domain/review.mjs';
import {queue,available,quickCards,quickScopeKey} from './domain/queue.mjs';
import {esc,button,heading,empty,essayTitle,abilities,navigationIcon,attemptAnswerText} from './features/shared.mjs';
import {applyTextSize,textSizes} from './features/preferences.mjs';
import {practiceView,answerPanel,answerMode} from './features/practice.mjs';
import {libraryView,compareView} from './features/library.mjs';
import {homeView,weaknessView,historyView,savedView,quickView,reportsView} from './features/records.mjs';
import {trainingView} from './features/training.mjs';
import {mistakesView,mistakeOptions} from './features/mistakes.mjs';
import {validTraining,trainingOptions,dailyProgress,dailyQuestions,retryQuestions,refreshTrainingSession} from './domain/training.mjs';
import {resumeSkipped} from './domain/session.mjs';
import {advanceWithReplacement,sessionProgress} from './domain/replacement.mjs';
import {seenInPractice,wasSeen} from './domain/daily-availability.mjs';
const root=document.querySelector('#root'),dialog=document.querySelector('#dialog');
let auth=null,repo=null,syncer=null,scheduler=null,localDraftPending=false,bank=null,state=project([]),page='home',session=null,quick={cards:[],index:0},compareTarget='',compareExpanded=false,authMode='login',busy=false,writes=new SaveQueue(),saveError='',status='已保存到本機',serverReports=[],corrections=[],adminReports=[];
let trainingDraft=null,writtenContent={items:[]},writtenOptions={},writtenDraftTimer=null,writtenPending=null;
const currentWritten=()=>writtenItems(writtenContent,bank);
async function saveWrittenDraft(){
 clearTimeout(writtenDraftTimer);const pending=writtenPending;if(!pending){await writes.flush();return;}writtenPending=null;
 await append('written',{action:'draft',...pending});
}
function queueWrittenDraft(answer){
 const previous=writtenState(state.events).drafts.get(writtenOptions.itemId);
 writtenPending={itemId:writtenOptions.itemId,answer,revision:Math.max(Date.now(),(writtenPending?.revision||previous?.revision||0)+1)};
 clearTimeout(writtenDraftTimer);writtenDraftTimer=setTimeout(()=>void saveWrittenDraft().catch(()=>{}),300);
}

function queueWrittenCorrection(answer,attemptId){
 const previous=writtenState(state.events).corrections.get(attemptId);
 writtenPending={action:'correction',attemptId,answer,revision:Math.max(Date.now(),(writtenPending?.revision||previous?.revision||0)+1)};
 clearTimeout(writtenDraftTimer);writtenDraftTimer=setTimeout(()=>void saveWrittenDraft().catch(()=>{}),300);
}

let options={essayIds:[],count:20,scope:'all',ability:'',appendix:false,rotation:0,quickScope:'both',studyPool:'basic'};
const nav=[['home','首頁'],['library','練習'],['history','記錄'],['account','我的']];
function toast(text){const el=document.querySelector('#toast');el.textContent=text;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.textContent='',4500);}
function setStatus(text){status=text;const el=document.querySelector('#sync-status');if(el)el.textContent=saveError?'尚有變更未保存':localDraftPending?text+' · 文字草稿在本機':text;}
function showSaveError(error){
 saveError=error?.message||'';setStatus(status);
 const html=saveError?'<strong>尚有變更未保存</strong><p>請保留此頁，重試後再離開。'+esc(saveError)+'</p>'+button('retry-save','重試保存','','secondary'):'';
 const el=document.querySelector('#save-error');if(el){el.hidden=!saveError;el.innerHTML=html;}
 let modalError=dialog.querySelector('[data-save-error]');
 if(saveError&&dialog.open){if(!modalError){modalError=document.createElement('div');modalError.dataset.saveError='';modalError.className='save-error';modalError.setAttribute('role','alert');dialog.append(modalError);}modalError.innerHTML=html;}
 else modalError?.remove();
}
async function persist(write){
 try{await writes.add(write);showSaveError(null);}
 catch(error){showSaveError(error);throw error;}
}
async function refresh(){state=project(await repo.events(),hkDay(),corrections);state.settings.rotation ||=0;applyTextSize(state.settings.fontSize);}
function append(type,payload,id){
 const target=repo,ev=event(type,structuredClone(payload),id);
 return persist(async()=>{await target.append(ev);if(repo===target){await refresh();setStatus('已保存到本機 · 待備份');scheduler?.notify();}});
}
async function saveSession(draftOnly=false,value=session){
 if(!value)return;
 value.revision=(value.revision||0)+1;
 const target=repo,snapshot=structuredClone(value),ev=event('session',{session:snapshot});
 await persist(async()=>{
  await target.set('draft-session/'+snapshot.id,snapshot);
  if(!draftOnly)await target.append(ev);
  if(repo===target){localDraftPending=draftOnly;await refresh();setStatus('已保存到本機 · 待備份');if(!draftOnly)scheduler?.notify();}
 });
}
async function saveOptions(){const target=repo,snapshot=structuredClone(options);await persist(()=>target.set('options',snapshot));}
const sync=()=>scheduler?.flush();
async function performSync(){
 const current=syncer,active=repo;if(!current)return;
 try{const result=await current.sync();if(current!==syncer||!result)return;serverReports=result.reports||[];corrections=result.corrections||[];await active.set('corrections',corrections);await refresh();if(!['practice','library','training','weakness','written'].includes(page))render();}
 catch(e){if(e.status===401)toast('登入已過期；請到帳號重新登入。本機記錄仍在。');throw e;}
}
function authView(){
 root.innerHTML='<section class="auth"><img class="brand-icon" src="/assets/icon.svg" alt="" width="44" height="44"><h1>DSE文言練習</h1><p class="muted">十六篇 · 練習與複習</p><div class="tabs">'+[['login','登入'],['register','邀請註冊'],['recover','恢復帳號']].map(([id,label])=>'<button data-action="auth-mode" data-mode="'+id+'" class="'+(authMode===id?'active':'')+'">'+label+'</button>').join('')+'</div><form id="auth-form"><label>帳號<input name="username" autocomplete="username" required minlength="2" maxlength="40"></label>'+(authMode==='register'?'<label>邀請碼<input name="inviteCode" autocomplete="off" required></label>':'')+(authMode==='recover'?'<label>恢復碼<input name="recoveryCode" autocomplete="off" required></label>':'')+'<label>'+ (authMode==='recover'?'新密碼':'密碼')+'<input name="password" type="password" minlength="10" autocomplete="'+(authMode==='login'?'current-password':'new-password')+'" required></label><p class="auth-error error" role="alert"></p><button class="btn" type="submit">'+(authMode==='login'?'登入':authMode==='register'?'建立我的帳號':'恢復並登入')+'</button></form><p class="auth-note">首次登入需要網絡。註冊後請保存恢復碼；忘記密碼時可用它找回個人記錄。密碼至少 10 字元。</p></section>';
}
async function signIn(form){
 const values=Object.fromEntries(new FormData(form)),submit=form.querySelector('button[type=submit]');submit.disabled=true;
 try{
  const body=authMode==='recover'?{username:values.username,recoveryCode:values.recoveryCode,newPassword:values.password}:values;
  const result=await api('/api/auth/'+authMode,{body});
  if(!result.token){const login=await api('/api/auth/login',{body:{username:values.username,password:values.password}});Object.assign(result,login);}
  auth={token:result.token,user:result.user};localStorage.setItem('wenyan-auth-v1',JSON.stringify(auth));await openAccount();
  if(result.recoveryCode){dialog.innerHTML='<h2>保存你的恢復碼</h2><p>只在這次顯示。請抄下或存入自己的密碼管理器。</p><p class="answer-saved">'+esc(result.recoveryCode)+'</p><div class="toolbar">'+button('close-dialog','我已妥善保存')+'</div>';dialog.showModal();}
 }catch(e){form.querySelector('.auth-error').textContent=e.message;submit.disabled=false;}
}
async function loadBank(){
 const response=await fetch('/content/bank.json',{cache:'no-cache'});if(!response.ok)throw new Error('題庫尚未下載；首次使用請連上網絡');bank=await response.json();
 try{const {overrides}=await api('/api/content/overrides',{token:auth.token});for(const override of overrides||[]){const index=bank.questions.findIndex(q=>q.id===(override.questionId||override.id));if(index<0)continue;const old=bank.questions[index];if(override.revision)bank.questions[index]=override.revision;bank.questions[index]={...bank.questions[index],status:override.status||old.status,active:override.status!=='withdrawn'};}await repo.set('overrides',overrides||[]);}
 catch{for(const override of await repo.get('overrides')||[]){const i=bank.questions.findIndex(q=>q.id===(override.questionId||override.id));if(i>=0)bank.questions[i]={...(override.revision||bank.questions[i]),status:override.status,active:override.status!=='withdrawn'};}}
}
function tagComparisons(){for(const q of bank.questions)q.comparisonAvailable=!!q.target&&bank.comparisons.some(g=>g.status==='reviewed'&&(g.id===q.comparisonGroupId||g.items.some(i=>i.questionId===q.id)));}
async function openAccount(){
 await saveWrittenDraft();writtenOptions={};scheduler?.stop();if(syncer)syncer.stop();if(repo)repo.close();repo=await Repository.open(auth.user.id);writes=new SaveQueue();saveError='';localDraftPending=false;
 corrections=await repo.get('corrections')||[];await refresh();await loadBank();tagComparisons();
 const writtenResponse=await fetch('/content/written-practice.json',{cache:'no-cache'});writtenContent=writtenResponse.ok?await writtenResponse.json():{items:[]};
 const savedOptions=await repo.get('options');options={essayIds:[],count:20,scope:'all',ability:'',appendix:false,rotation:0,quickScope:'both',studyPool:'basic',...savedOptions};if(!savedOptions)options.essayIds=bank.essays.filter(e=>bank.questions.some(q=>q.essayIds.includes(e.id)&&q.status==='reviewed'&&q.active!==false)).map(e=>e.id);
 options.hasPreviousSelection=!!savedOptions||state.attempts.length>0;options.rotation=state.settings.rotation;serverReports=await repo.get('reports')||[];quick=await repo.get('quick')||{cards:[],index:0};session=null;page='home';
 syncer=new SyncClient(repo,auth.token,setStatus);scheduler=new SyncScheduler(performSync);render();await sync();if(!validTraining(state.settings.training)){page='training';render();}
}
let actionObserver;
function measureActions(){
 actionObserver?.disconnect();
 const update=()=>{
  document.documentElement.style.setProperty('--action-space',(document.querySelector('.practice-action-bar')?.getBoundingClientRect().height||0)+'px');
  document.documentElement.style.setProperty('--library-action-space',(document.querySelector('.library-start-bar')?.getBoundingClientRect().height||0)+'px');
  document.documentElement.style.setProperty('--nav-height',(document.querySelector('.mobile-nav')?.getBoundingClientRect().height||0)+'px');
 };
 update();actionObserver=new ResizeObserver(update);
 for(const el of document.querySelectorAll('.practice-action-bar,.library-start-bar,.mobile-nav'))actionObserver.observe(el);
}
function renderKeepingFocus(){
 const el=document.activeElement,at={x:window.scrollX,y:window.scrollY};
 const id=el?.id,action=el?.dataset.action,count=el?.dataset.count;
 render();
 const next=id?document.getElementById(id):[...document.querySelectorAll('[data-action]')].find(e=>e.dataset.action===action&&e.dataset.count===count);
 next?.focus({preventScroll:true});window.scrollTo(at.x,at.y);
}
function focusPractice(selector='#question-title'){
 const el=document.querySelector(selector)||document.querySelector('#main h1');
 if(el){el.tabIndex=-1;el.focus({preventScroll:true});(el.id==='question-title'?el.closest('.question-intro'):el).scrollIntoView({block:'start'});}
}
function render(){
 if(!auth){authView();return;}
 document.body.classList.toggle('in-session',page==='practice');const activePage=['weakness','saved','quick','mistakes'].includes(page)?'home':['practice','compare','written'].includes(page)?'library':page;const navHtml=(mobile=false)=>nav.filter(([id])=>!mobile||!['weakness','saved','quick'].includes(id)).map(([id,label],i)=>'<button data-action="nav" data-page="'+id+'" class="'+(activePage===id?'active':'')+'"'+(activePage===id?' aria-current="page"':'')+'>'+(mobile?'<span class="nav-icon">'+navigationIcon(id)+'</span>':'')+label+'</button>').join('');
 root.innerHTML='<div class="shell"><aside class="sidebar"><div class="brand"><img class="brand-icon" src="/assets/icon.svg" alt="" width="44" height="44"><div><div class="brand-name">DSE文言練習</div><small class="muted">十六篇 · 練習與複習</small></div></div><nav class="nav" aria-label="主要導航">'+navHtml()+'</nav><div class="sidebar-bottom">'+button('training-settings','學習設定 ↗','','quiet')+'</div></aside><div class="workspace"><header class="topbar"><div class="mobile-brand"><img class="brand-icon" src="/assets/icon.svg" alt="" width="44" height="44">DSE文言練習</div><div class="breadcrumb"><b>'+esc(page==='mistakes'?'錯題複習':nav.find(n=>n[0]===page)?.[1]||'練習')+'</b></div><div class="top-actions"><span id="sync-status" class="status-line" role="status">'+esc(status)+'</span><button data-action="settings" aria-label="調整全站字號">字號 Aa</button></div></header><div id="save-error" class="save-error" role="alert" hidden></div><main class="page" id="main"></main></div></div><nav class="mobile-nav" aria-label="行動導航">'+navHtml(true)+'</nav>';
 showSaveError(saveError?new Error(saveError):null);
 const views={written:()=>writtenView(currentWritten(),bank,state.events,writtenOptions),home:()=>homeView(bank,state),mistakes:()=>mistakesView(bank,state),training:()=>trainingView(bank,trainingDraft?{...state,settings:{...state.settings,training:trainingDraft}}:state,options),library:()=>libraryView(bank,state,options),practice:()=>session?practiceView(bank,session,state):empty('沒有進行中的練習'),weakness:()=>weaknessView(bank,state,options),history:()=>historyView(bank,state),saved:()=>savedView(bank,state,options),quick:()=>quickView(bank,state,options,quick),compare:()=>compareView(bank,options,compareTarget,compareExpanded),reports:()=>reportsView(mergedReports()),account:accountView,admin:adminView};
 document.querySelector('#main').innerHTML=(['home','library'].includes(page)?'<div class="side-card"><h2>安排今天的復習</h2><p>按篇章選材；字詞與整句先寫再核對，選擇題可跨篇混合重溫。</p><div class="toolbar">'+button('written-list','字詞輸入','data-kind="vocabulary"')+button('written-list','整句理解／翻譯','data-kind="translation"','secondary')+button('nav','篇章與混合重溫','data-page="library"','secondary')+'</div>'+'</div>':'')+(views[page]||views.home)()+(page==='home'&&corrections.length?'<div class="banner">你有 '+corrections.length+' 項評分更正。'+button('nav','查看更正原因','data-page="account"','quiet')+'</div>':'');
 measureActions();
}
function mergedReports(){const map=new Map(state.reports.map(r=>[r.id,r]));for(const r of serverReports)map.set(r.eventId||r.id,{...map.get(r.eventId||r.id),...r,...r.payload});return [...map.values()].reverse();}
function accountView(){
 return heading('我的',auth.user.username)+'<div class="side-card"><h2>學習設定</h2><p>逐篇選擇題目類型，調整每日題量及錯題回練。</p>'+button('training-settings','調整學習設定','','secondary')+'</div>'+'<div class="side-card"><h2>學習偏好</h2><p class="section-note">選擇題及字詞／句譯練習分別記錄。字號設定即時套用到所有頁面。</p>'+button('settings','調整字體','','secondary')+'</div><div class="saved-row"><h2>備份與恢復</h2><p>'+esc(status)+'</p><div class="toolbar">'+button('sync','立即備份')+button('export','匯出我的記錄','','secondary')+button('import','恢復此帳號備份','','secondary')+'</div><input id="import-file" type="file" accept=".json,application/json" hidden><p class="subtle">備份包含你的作答、草稿和收藏；僅能恢復至同一帳號。瀏覽器清理可能刪除本機資料，請定期備份。</p></div><div class="toolbar">'+button('nav','查看我的題目回報','data-page="reports"','secondary')+(auth.user.role==='admin'?button('admin','維護題目回報','','secondary'):'')+button('logout','登出並切換帳號','','quiet')+'</div>'+(corrections.length?'<div class="saved-row"><h2>評分更正通知</h2>'+corrections.map(c=>'<p>'+esc(c.reason)+' · '+esc(c.createdAt?.slice(0,10))+'<br><small>原作答保留；這次作答的有效判斷已更正為'+(c.correct?'正確':'待鞏固')+'。</small></p>').join('')+'</div>':'');
}
function adminView(){
 return heading('題目回報維護','按來源復核後，明確回覆或更正。')+(adminReports.length?adminReports.map(r=>'<article class="saved-row"><h3>'+esc(r.questionId||r.payload?.questionId)+' · '+esc(r.category||r.payload?.category)+'</h3><p>'+esc(r.detail||r.payload?.detail)+'</p><p class="subtle">'+esc(r.status)+' · '+esc(r.username||r.userId)+'</p><form class="admin-report-form" data-id="'+esc(r.id)+'"><label>處理狀態 <select name="status"><option value="processing">處理中</option><option value="replied">說明已回覆</option><option value="corrected">已修正</option></select></label><label class="field">回覆<textarea name="reply" required>'+esc(r.reply||'')+'</textarea></label><button class="btn" type="submit">保存處理結果</button></form><div class="toolbar">'+button('withdraw','暫下架此題','data-id="'+esc(r.questionId||r.payload?.questionId)+'"','secondary')+button('revision','提交核對後新版本','data-id="'+esc(r.questionId||r.payload?.questionId)+'"','secondary')+button('correction','明確修正受影響作答','data-report="'+esc(r.id)+'"','quiet')+'</div></article>').join(''):empty('目前沒有題目回報'));
}
async function go(next){await saveWrittenDraft();if(page==='practice')await saveSession();page=next;trainingDraft=null;if(page==='quick'&&(!quick.cards.length||quick.scopeKey!==quickScopeKey(options)))await buildQuick();render();window.scrollTo(0,0);}
async function buildQuick(all=false){quick={cards:all?available(bank.questions,{...options,questionIds:undefined}):quickCards(bank.questions,{...options,questionIds:undefined,scope:options.quickScope},state),index:0,version:bank.version,scopeKey:quickScopeKey(options)};await repo.set('quick',quick);}
function currentQuestion(){return session?.questions[session.index];}
async function ensureDailyGoal(){
 const day=hkDay();if(!state.dailyGoals[day])await append('settings',{dailyGoal:{day,count:state.settings.training?.dailyCount||20}});
}
async function latestSession(id){
 let value=structuredClone(state.sessions[id]);if(!value)return;
 const draft=await repo.get('draft-session/'+id);if(draft&&(draft.revision||0)>(value.revision||0))value=draft;
 value.answers||={};for(const a of state.attempts.filter(e=>e.payload.sessionId===id))value.answers[a.payload.questionId]=a.id;
 if(value.skipped)value.skipped=value.skipped.filter(id=>!value.answers[id]);
 return value;
}
async function updateTrainingSessions(){
 for(const s of Object.values(state.sessions).filter(s=>!s.completed)){
  const previous=await latestSession(s.id),updated=refreshTrainingSession(bank.questions,state,previous);
  if(updated!==previous){await saveSession(false,updated);if(session?.id===s.id)session=updated;}
 }
}
async function resumeSession(id){
 if(page==='practice'&&session)await saveSession();
 session=await latestSession(id);if(!session)return;
 session=refreshTrainingSession(bank.questions,state,session);
 if(session.passComplete)resumeSkipped(session,state);
 if(session.completed){await saveSession();await go('home');toast('已按目前設定更新，本組沒有待答題目。');return;}
 await ensureDailyGoal();session.paused=false;await showPractice();
}
async function showPractice(){
 session=refreshTrainingSession(bank.questions,state,session);
 if(!session.completed&&!session.passComplete){
  const q=currentQuestion(),day=hkDay();
  if(q&&!session.answers[q.id])await append('browse',{questionId:q.id,memoryId:q.memoryId,practiceGroup:q.practiceGroup||'',purpose:'practice',sessionId:session.id},session.id+'/shown/'+day+'/'+q.id);
 }
 await saveSession();page='practice';render();focusPractice();
}
async function beginSession(list,opts,kind,drafts={}){
 if(!list.length){toast('這個範圍今天沒有未出現的題目；可換範圍，或明日再練。');return;}
 await ensureDailyGoal();
 session={id:crypto.randomUUID(),selection:structuredClone(opts),targetCount:kind==='daily'?dailyProgress(state).remaining:kind==='retry'?list.length:Number(opts.count||list.length),skippedIds:[],kind,goalDay:hkDay(),goalSnapshot:dailyProgress(state).goal,trainingSnapshot:kind==='extra'?undefined:structuredClone(state.settings.training),questions:structuredClone(list),index:0,answers:{},drafts:structuredClone(drafts),mode:'choice',essayIds:opts.essayIds,completed:false,paused:false,startedAt:new Date().toISOString()};
 await append('settings',{rotation:((state.settings.rotation||0)+list.length)%Math.max(1,opts.essayIds.length)});await showPractice();void sync();
}
async function startDaily(kind='daily'){
 await writes.flush();await sync();if(!validTraining(state.settings.training)){await go('training');return;}
 if(navigator.onLine){await loadBank();tagComparisons();}
 const existing=Object.values(state.sessions).filter(s=>s.kind===kind&&!s.completed).sort((a,b)=>b.startedAt.localeCompare(a.startedAt))[0];
 if(existing){await resumeSession(existing.id);return;}
 const opts=trainingOptions(state.settings.training);
 if(kind==='daily'&&!dailyProgress(state).remaining){toast('今日目標已完成，可自選尚未出現的新題。');await go('home');return;}
 const list=kind==='retry'?queue(bank.questions,{...opts,count:100,questionIds:retryQuestions(bank.questions,state).map(q=>q.id)},state):dailyQuestions(bank.questions,state);
 await beginSession(list,opts,kind);
}
async function start(questionIds=null,essayIds=null){
 await writes.flush();await sync();
 if(navigator.onLine){await loadBank();tagComparisons();}
 const opts={...options,rotation:state.settings.rotation,...(questionIds?{questionIds}:{}),...(essayIds?{essayIds}:{})};
 const list=queue(bank.questions,opts,state);if(!list.length){toast('所選範圍今天沒有未出現的題目；明日可再練。');return;}
 await beginSession(list,opts,'extra');
}
function updatePracticeProgress(){const p=sessionProgress(session,state);const meta=document.querySelector('.session-meta'),bar=document.querySelector('.progress-track span');if(meta)meta.textContent='已練 '+p.done+' / '+p.target+' 題 · 尚餘 '+p.remaining+' 題';if(bar)bar.style.width=Math.min(100,p.done/p.target*100)+'%';}
function renderAnswerKeepingPosition(q){
 const at={x:window.scrollX,y:window.scrollY};
 document.querySelector('#answer-panel').innerHTML=answerPanel(q,session,state);
 updatePracticeProgress();measureActions();
 const choices=document.querySelector('#answer-panel .options,#answer-panel .answer-saved');
 if(choices){choices.tabIndex=-1;choices.focus({preventScroll:true});}
 window.scrollTo({left:at.x,top:at.y,behavior:'instant'});
}
async function submit(unknown=false){
 const q=currentQuestion();const existing=state.attempts.find(e=>e.id===session.id+'/'+q.id);if(existing){session.answers[q.id]=existing.id;await saveSession();renderAnswerKeepingPosition(q);return;}if(session.answers[q.id])return;if(wasSeen(q,seenInPractice(state,bank.questions,hkDay(),{sessionId:session.id,questionId:q.id}))){toast('這題今天已在另一題組出現，已更新為未出現的題目。');await showPractice();return;}const mode=answerMode(q,session),answer=unknown?'暫時不會':session.drafts[q.id]||'';
 if(!answer.trim()){toast(mode==='typing'?'先寫下想法，也可以選「暫時不會」。':'先選一個答案，也可以選「暫時不會」查看解析。');return;}
 await ensureDailyGoal();const id=session.id+'/'+q.id,now=new Date().toISOString();
 await append('attempt',{memoryId:q.memoryId,questionId:q.id,questionVersion:q.version,question:structuredClone(q),submittedAt:now,day:hkDay(now),mode,answer,correct:mode==='typing'?null:answer===q.answerId,sessionId:session.id,trainingPolicy:2,practiceKind:session.kind||'extra'},id);
 session.answers[q.id]=id;await saveSession();renderAnswerKeepingPosition(q);void sync();
}
async function assess(correct){if(!document.querySelector('#check-meaning')?.checked||!document.querySelector('#check-context')?.checked){toast('請先完成兩項核對，再確定結果。');return;}const q=currentQuestion(),id=session.answers[q.id];if(state.assessments.has(id))return;await append('assessment',{attemptId:id,correct},'assessment/'+id);renderAnswerKeepingPosition(q);void sync();}
function reportDialog(id){const q=session?.questions.find(q=>q.id===id)||bank.questions.find(q=>q.id===id);dialog.innerHTML='<h2>回報題目疑點</h2><form id="report-form" class="report-form" data-id="'+esc(q.id)+'"><label>問題類別<select name="category">'+['題幹或原文錯字','答案可能有誤／存在多解','解析問題','同日重複出題','DSE真題與原卷不符','其他問題'].map(t=>'<option>'+t+'</option>').join('')+'</select></label><label>補充說明<textarea name="detail" maxlength="3000" required></textarea></label><p class="subtle">自動附上題目與版本；如已作答，也附上本次答案。未作答也能回報，離線時先保存。</p><div class="toolbar"><button class="btn" type="submit">提交回報</button>'+button('close-dialog','取消','','secondary')+'</div></form>';dialog.showModal();}
function settingsDialog(){
 const sizes=state.settings.fontSize===36?[...textSizes,{value:36,label:'原有最大字號'}]:textSizes;
 dialog.innerHTML='<h2>字號與偏好</h2><form id="settings-form"><label class="field" for="font-size">全站字號<select id="font-size" name="fontSize">'+sizes.map(({value,label})=>'<option value="'+value+'" '+(state.settings.fontSize===value?'selected':'')+'>'+label+'</option>').join('')+'</select></label><p class="subtle">即時套用到所有頁面，並保存在此帳號。</p><p class="font-preview">文言練習，讀得清楚。</p><div class="toolbar"><button class="btn" type="submit">完成</button></div></form>';dialog.showModal();
}
function updateTrainingSummary(){
 const form=document.querySelector('#training-form');if(!form)return;
 const count=form.querySelectorAll('[data-training-essay]:checked').length,appendix=form.elements.appendix.checked;
 document.querySelector('#training-selection').textContent='已選 '+count+' 篇'+(appendix?' + 手法附錄':'')+' · 每日 '+form.elements.dailyCount.value+' 題';
 for(const details of form.querySelectorAll('[data-types-for]'))details.querySelector('[data-type-summary]').textContent=details.querySelectorAll('[data-training-type]:checked:not(:disabled)').length+' 類';
}
document.addEventListener('click',async e=>{
 const el=e.target.closest('[data-action]');if(!el||el.disabled)return;const a=el.dataset.action;
 if(a==='retry'){location.reload();return;}if(a==='auth-mode'){authMode=el.dataset.mode;authView();return;}if(a==='close-dialog'){dialog.close();return;}if(busy)return;
 busy=true;root.setAttribute('aria-busy','true');try{
 if(a==='retry-save'){await writes.flush();showSaveError(null);await refresh();if(session){for(const item of state.attempts.filter(item=>item.payload.sessionId===session.id))session.answers[item.payload.questionId]=item.id;}if(page!=='training')render();toast('已重新保存；可以繼續。');return;}
 if(saveError){toast('請先按「重試保存」，確認變更已保存。');return;}
 if(a.startsWith('written-')){
  await saveWrittenDraft();
  if(a==='written-list'){writtenOptions={...writtenOptions,...(el.dataset.kind?{kind:el.dataset.kind,essay:'',origin:'',progress:''}:{}),itemId:null,fresh:false};await go('written');}
  if(a==='written-open'||a==='written-again'){
   writtenOptions={...writtenOptions,itemId:el.dataset.id,fresh:a==='written-again'};
   if(a==='written-again')await append('written',{action:'draft',itemId:el.dataset.id,answer:'',revision:Math.max(Date.now(),(writtenState(state.events).drafts.get(el.dataset.id)?.revision||0)+1)});
   await go('written');document.querySelector('#written-answer')?.focus();
  }
  if(a==='written-submit'){
   const item=currentWritten().find(i=>i.id===el.dataset.id),answer=document.querySelector('#written-answer')?.value||'';
   if(!item)throw new Error('此題版本已更新，請返回題目列表。');
   if(!answer.trim())throw new Error('請先寫下你的答案。');
   await append('written',{action:'submit',itemId:item.id,item,answer,result:writtenResult(item,answer)});writtenOptions.fresh=false;render();document.querySelector('#written-feedback')?.focus();void sync();
  }
  if(a==='written-correction-save'){await writes.flush();toast('訂正稿已保存，原作答保持不變。');void sync();}
  if(a==='written-self'){
   if(!document.querySelector('#written-checked')?.checked)throw new Error('請先逐項核對並勾選確認。');
   await append('written',{action:'self',attemptId:el.dataset.attempt,outcome:el.dataset.outcome,checked:true});render();void sync();
  }
  return;
 }
 if(a==='training-settings'){await go('training');return;}
 if(a==='daily-start'){await startDaily();return;}
 if(a==='retry-today'){await startDaily('retry');return;}
 if(a==='daily-count'){document.querySelector('#daily-count').value=el.dataset.count;updateTrainingSummary();return;}
 if(a==='training-all'||a==='training-none'){for(const input of document.querySelectorAll('[data-training-essay]:not(:disabled)')){input.checked=a==='training-all';const details=[...document.querySelectorAll('[data-types-for]')].find(d=>d.dataset.typesFor===input.dataset.trainingEssay);details.hidden=!input.checked;}updateTrainingSummary();return;}
 if(a==='clear-filters'){options={...options,scope:'all',sourceKind:'all',studyPool:'basic',ability:'',questionIds:undefined};await saveOptions();renderKeepingFocus();document.querySelector('#studyPool')?.focus();return;}
 if(a==='adjust-scope'){options={...options,...session.selection,questionIds:undefined,essayIds:[...session.essayIds]};await saveOptions();await go('library');return;}
 if(a==='extra'){options={...options,...(validTraining(state.settings.training)?trainingOptions(state.settings.training):{}),questionIds:undefined,essayTypes:undefined,scope:'all',ability:''};await go('library');return;}
 if(a==='nav'){if(el.dataset.page==='compare'){compareTarget='';compareExpanded=false;}await go(el.dataset.page);}
 else if(a==='settings')settingsDialog();
 else if(a==='select-all'||a==='select-prose'||a==='select-poem'||a==='select-none'){options.essayIds=a==='select-none'?[]:bank.essays.filter(e=>(a==='select-all'||e.kind===(a==='select-prose'?'prose':'poem'))&&available(bank.questions,{...options,essayIds:bank.essays.map(e=>e.id),questionIds:undefined}).some(q=>q.essayIds.includes(e.id))).map(e=>e.id);options.questionIds=undefined;await saveOptions();renderKeepingFocus();}
 else if(a==='count'){options.count=+el.dataset.count;await saveOptions();renderKeepingFocus();}
 else if(a==='clear-subset'){options.questionIds=undefined;await saveOptions();renderKeepingFocus();}else if(a==='start')await start();
 else if(a==='resume'){await sync();await resumeSession(el.dataset.session);}
 else if(a==='pause'){session.paused=true;await saveSession();await go('home');void sync();}
 else if(a==='choose'){const q=currentQuestion();if(session.answers[q.id])return;const submitButton=document.querySelector('[data-action=submit]');if(submitButton)submitButton.disabled=true;session.drafts[q.id]=el.dataset.choice;document.querySelectorAll('.option').forEach(b=>{const selected=b===el;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected);});try{await saveSession();}finally{if(submitButton?.isConnected)submitButton.disabled=false;}}
 else if(a==='submit'||a==='unknown')await submit(a==='unknown');
 else if(a==='assess-good'||a==='assess-bad')await assess(a==='assess-good');
 else if(a==='next'||a==='skip'){if(!advanceWithReplacement(session,state,bank.questions,a==='skip'))return;await showPractice();}
 else if(a==='retry-skipped'){const previous=el.dataset.session?await latestSession(el.dataset.session):session;if(!previous)return;const opts={...(previous.selection||{}),essayIds:previous.essayIds,questionIds:previous.skippedIds||[],count:Math.min(100,previous.skippedIds?.length||1)};await beginSession(queue(bank.questions,opts,state),opts,'extra',previous.drafts||{});}
 else if(a==='resume-skipped'){session.index=-1;session.passComplete=false;await showPractice();}
 else if(a==='favorite'){const q=bank.questions.find(q=>q.id===el.dataset.id)||currentQuestion(),saved=!state.favorites[el.dataset.id]?.saved;await append('favorite',{questionId:el.dataset.id,version:q?.version,saved});if(page==='practice')el.textContent=saved?'★ 已收藏':'☆ 收藏';else render();void sync();}
 else if(a==='report')reportDialog(el.dataset.id);
 else if(a==='compare-question'){compareTarget=currentQuestion().target;compareExpanded=false;await go('compare');}
 else if(a==='compare-expand'){compareExpanded=!compareExpanded;render();}
 else if(a==='compare-practice'){const g=bank.comparisons.find(g=>g.id===el.dataset.group),qs=g.items.map(i=>bank.questions.find(q=>q.id===i.questionId)).filter(q=>q&&(compareExpanded||q.essayIds.every(id=>options.essayIds.includes(id))));options.questionIds=qs.map(q=>q.id);options.essayIds=[...new Set(qs.flatMap(q=>q.essayIds))];options.scope='all';options.ability='';options.sourceKind='all';await saveOptions();await go('library');}
 else if(a==='weak-cell'){options.essayIds=[el.dataset.essay];options.ability=el.dataset.ability;options.sourceKind='all';options.scope='all';options.questionIds=undefined;await saveOptions();await go('library');}
 else if(a==='wrong-practice'){await go('mistakes');}
 else if(a==='mistake-start'){if(navigator.onLine){await loadBank();tagComparisons();}const opts=mistakeOptions(bank,state,el.dataset.id);const list=queue(bank.questions,opts,state);if(!list.length){await go('mistakes');toast('這道題目前已不在可重練錯題中。');return;}await beginSession(list,opts,'extra');}
 else if(a==='daily'){options.essayIds=bank.essays.map(e=>e.id);options.ability='';options.scope='all';options.questionIds=bank.questions.filter(q=>isDue(state.memories[q.memoryId])&&!state.completedToday.has(q.memoryId)).map(q=>q.id);if(!options.questionIds.length){toast('目前沒有到期提醒，選一組新題繼續積累。');options.questionIds=undefined;}await go('library');}
 else if(a==='saved-practice'){options.questionIds=Object.values(state.favorites).filter(f=>f.saved).map(f=>f.questionId);options.scope='all';await go('library');}
 else if(a==='saved-quick'){options.quickScope='saved';await buildQuick();await go('quick');}
 else if(a==='quick-scope'){options.quickScope=el.dataset.scope;await buildQuick();render();}
 else if(a==='quick-all'){await buildQuick(true);render();}
 else if(a==='quick-prev'){quick.index--;await repo.set('quick',quick);render();}
 else if(a==='quick-seen'){const q=quick.cards[quick.index];await append('browse',{questionId:q.id,version:q.version});if(quick.index<quick.cards.length-1)quick.index++;else toast('這組重點已看過；瀏覽不會改變記憶曲線。');await repo.set('quick',quick);render();}
 else if(a==='quick-practice'){options.questionIds=quick.cards.map(q=>q.id);options.essayIds=[...new Set(quick.cards.flatMap(q=>q.essayIds))];options.scope='all';await go('library');}
 else if(a==='sync')await sync();
 else if(a==='export'){await writes.flush();const data=await repo.exportBackup(),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='DSE文言練習-'+auth.user.username+'-'+hkDay()+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 else if(a==='import')document.querySelector('#import-file').click();
 else if(a==='logout'){await saveWrittenDraft();await writes.flush();writtenOptions={};scheduler.stop();syncer.stop();void api('/api/auth/logout',{token:auth.token,body:{}}).catch(()=>{});repo.close();repo=null;syncer=null;scheduler=null;auth=null;session=null;state=project([]);serverReports=[];corrections=[];quick={cards:[],index:0};options={essayIds:[],count:20,scope:'all',ability:'',rotation:0,quickScope:'both',studyPool:'basic'};localStorage.removeItem('wenyan-auth-v1');render();}
 else if(a==='encourage'){const quotes=['不急著讀完，先把一句讀懂。','今天多懂一個字，明天多一分底氣。','把難懂的地方，慢慢讀成自己的。','不是每次都答對，也是在向前走。'];document.querySelector('#encouragement').textContent=quotes[(Date.now()%quotes.length)];}
 else if(a==='admin'){adminReports=(await api('/api/admin/reports',{token:auth.token})).reports;page='admin';render();}
 else if(a==='withdraw'){const reason=prompt('請填寫按來源復核後的下架原因');if(reason){await api('/api/admin/questions/'+encodeURIComponent(el.dataset.id),{token:auth.token,body:{status:'withdrawn',reason}});await loadBank();tagComparisons();toast('已暫下架，新練習不再抽取；歷史快照保留。');}}
 else if(a==='revision'){dialog.innerHTML='<h2>發布核對後的新版本</h2><form id="revision-form" class="report-form" data-id="'+esc(el.dataset.id)+'"><p>完整 JSON 題目，version 必須增加；提交前逐項核對來源。原歷史答案保持不變。</p><label>完整新版 JSON<textarea name="revision" required rows="12">'+esc(JSON.stringify({...bank.questions.find(q=>q.id===el.dataset.id),version:Number(bank.questions.find(q=>q.id===el.dataset.id)?.version||0)+1},null,2))+'</textarea></label><label>修訂原因<input name="reason" required></label><button class="btn" type="submit">提交已核對新版本</button>'+button('close-dialog','取消','','quiet')+'</form>';dialog.showModal();}
 else if(a==='correction'){const r=adminReports.find(r=>r.id===el.dataset.report);dialog.innerHTML='<h2>修正這位同學的指定作答</h2><form id="correction-form" class="report-form" data-report="'+esc(r.id)+'"><label>受影響作答<select name="attemptId">'+(r.attempts||[]).map(a=>'<option value="'+esc(a.id)+'">'+esc(a.submittedAt)+' · v'+esc(a.questionVersion)+' · '+esc(attemptAnswerText(a))+'</option>').join('')+'</select></label><label>復核結果<select name="correct"><option value="true">正確</option><option value="false">待鞏固</option></select></label><label>明確更正原因<textarea name="reason" required></textarea></label><button class="btn" type="submit" '+(!r.attempts?.length?'disabled':'')+'>保存更正並通知同學</button>'+button('close-dialog','取消','','quiet')+'</form>';dialog.showModal();}
 }catch(err){toast(err.message);}finally{busy=false;root.setAttribute('aria-busy','false');}
});
document.addEventListener('submit',async e=>{
 e.preventDefault();const form=e.target;
 if(form.id==='auth-form'){await signIn(form);return;}if(saveError){toast('請先重試保存，再提交。');return;}if(busy)return;busy=true;
 try{
 if(form.id==='written-filters'){await saveWrittenDraft();const data=new FormData(form);writtenOptions={...Object.fromEntries(data),dedupe:data.has('dedupe')};render();}
 else if(form.id==='training-form'){
  const chapters={};for(const input of form.querySelectorAll('[data-training-essay]:checked')){const id=input.dataset.trainingEssay;const types=[...form.querySelectorAll('[data-training-type]:checked')].filter(el=>el.dataset.chapter===id&&!el.disabled).map(el=>el.dataset.trainingType);if(!types.length){document.querySelector('#training-error').textContent='請為每個已選篇章選擇至少一種有題目的類型。';return;}chapters[id]=types;}
  if(form.dataset.first==='true'&&!Object.keys(chapters).length&&!form.elements.appendix.checked){document.querySelector('#training-error').textContent='請先選擇至少一篇，或加入手法附錄。';document.querySelector('#training-error').scrollIntoView({block:'center'});return;}
  const v=new FormData(form),training={version:1,studyPool:v.get('studyPool'),chapters,dailyCount:Number(v.get('dailyCount')),retry:v.has('retry'),appendix:v.has('appendix')};if(!validTraining(training))throw new Error('請輸入 1–100 的每日題量，並檢查篇章類型。');
  await append('settings',{training,dailyGoal:{day:hkDay(),count:training.dailyCount}});await updateTrainingSessions();await go('home');void sync();toast('學習設定已立即套用；未答題已更新，已提交答案保留。');
 }
 else if(form.id==='settings-form'){const v=Object.fromEntries(new FormData(form));await append('settings',{fontSize:+v.fontSize});dialog.close();void sync();}
 else if(form.id==='report-form'){const q=session?.questions.find(q=>q.id===form.dataset.id)||bank.questions.find(q=>q.id===form.dataset.id),v=Object.fromEntries(new FormData(form)),attempt=state.attempts.find(e=>e.id===session?.answers[q.id]);await append('report',{questionId:q.id,questionVersion:q.version,essayIds:q.essayIds,source:q.source,...v,answer:attempt?.payload.answer});dialog.close();toast('已保存回報，連線後補送。');void sync();}
 else if(form.classList.contains('admin-report-form')){await api('/api/admin/reports/'+encodeURIComponent(form.dataset.id),{token:auth.token,method:'PATCH',body:Object.fromEntries(new FormData(form))});toast('處理結果已保存');}
 else if(form.id==='revision-form'){const v=Object.fromEntries(new FormData(form));await api('/api/admin/questions/'+encodeURIComponent(form.dataset.id),{token:auth.token,body:{status:'reviewed',revision:JSON.parse(v.revision),reason:v.reason}});await loadBank();tagComparisons();dialog.close();toast('新版本已保存，舊作答快照保留。');}
 else if(form.id==='correction-form'){const v=Object.fromEntries(new FormData(form));await api('/api/admin/corrections',{token:auth.token,body:{reportId:form.dataset.report,attemptId:v.attemptId,correct:v.correct==='true',reason:v.reason}});dialog.close();toast('更正已保存，學生下次備份時收到。');}
 }catch(err){toast(err.message);}finally{busy=false;}
});
document.addEventListener('change',async e=>{
 try{
 if(saveError){toast('請先重試保存，再修改設定。');return;}
 if(e.target.dataset.trainingEssay){const id=e.target.dataset.trainingEssay;const types=[...document.querySelectorAll('[data-types-for]')].find(el=>el.dataset.typesFor===id);if(types)types.hidden=!e.target.checked;updateTrainingSummary();return;}
 if(e.target.id==='training-pool'){
  const form=e.target.form,chapters={},first=form.dataset.first;
  for(const input of form.querySelectorAll('[data-training-essay]:checked')){
   const id=input.dataset.trainingEssay;chapters[id]=[...form.querySelectorAll('[data-training-type]:checked')].filter(x=>x.dataset.chapter===id&&!x.disabled).map(x=>x.dataset.trainingType);
  }
  trainingDraft={version:1,chapters,studyPool:e.target.value,dailyCount:Number(form.elements.dailyCount.value),retry:form.elements.retry.checked,appendix:form.elements.appendix.checked};
  render();document.querySelector('#training-form').dataset.first=first;document.querySelector('#training-pool').focus();return;
 }
 if(e.target.closest('#training-form')){updateTrainingSummary();return;}
 if(e.target.id==='font-size'){await append('settings',{fontSize:Number(e.target.value)});void sync();}
 if(e.target.dataset.essay){options.essayIds=e.target.checked?[...new Set([...options.essayIds,e.target.dataset.essay])]:options.essayIds.filter(id=>id!==e.target.dataset.essay);options.questionIds=undefined;await saveOptions();renderKeepingFocus();}
 if(e.target.id==='question-count'){const n=Number(e.target.value);if(!Number.isInteger(n)||n<1||n>100){toast('請輸入 1–100 的整數');e.target.value=options.count;return;}options.count=n;await saveOptions();renderKeepingFocus();}
 if(e.target.id==='scope'||e.target.id==='ability'||e.target.id==='sourceKind'||e.target.id==='studyPool'){options[e.target.id]=e.target.value;if(e.target.id==='studyPool'){options.sourceKind='all';options.questionIds=undefined;}await saveOptions();renderKeepingFocus();}
 if(e.target.id==='appendix'){options.appendix=e.target.checked;await saveOptions();renderKeepingFocus();}
 if(e.target.id==='import-file'&&e.target.files[0]){
  if(busy)return;busy=true;
  try{const target=repo,userId=auth.user.id,file=e.target.files[0];
  // Export and import use the same format without an asymmetric file-size cap.
  const data=JSON.parse(await file.text());if(repo!==target||auth.user.id!==userId)return;
  await writes.flush();await target.importBackup(data);await refresh();
  toast('備份已完整驗證並合併；既有記錄保留。');render();void sync();
  }finally{busy=false;e.target.value='';}
 }
 }catch(err){toast(err.message);}
});
document.addEventListener('input',e=>{if(e.target.id==='written-correction'&&!saveError)queueWrittenCorrection(e.target.value,e.target.dataset.attempt);if(e.target.id==='written-answer'&&!saveError)queueWrittenDraft(e.target.value);if(e.target.id==='answer-input'&&session&&!saveError){session.drafts[currentQuestion().id]=e.target.value;void saveSession(true).catch(()=>{});}});
addEventListener('beforeunload',e=>{if(writes.pending||writtenPending){e.preventDefault();e.returnValue='';}});
addEventListener('online',()=>void sync());document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&repo&&page==='written')void saveWrittenDraft().catch(()=>{});if(document.visibilityState==='hidden'&&repo&&page==='practice')void saveSession().catch(()=>{});if(document.visibilityState==='visible'&&repo){void refresh().then(()=>{if(page==='home'||page==='history')render();});void sync();}});
async function boot(){
 try{auth=JSON.parse(localStorage.getItem('wenyan-auth-v1')||'null');if(auth?.token&&auth?.user?.id)await openAccount();else{auth=null;authView();}}
 catch(e){root.innerHTML='<section class="auth"><h1>暫時未能載入</h1><p>'+esc(e.message)+'</p><p>請恢復網絡後重試；本機資料不會被清除。</p><button class="btn" data-action="retry">重試</button></section>';}
 if('serviceWorker'in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{});}
}
void boot();
