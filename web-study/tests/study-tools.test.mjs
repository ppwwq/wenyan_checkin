import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {project} from '../src/domain/review.mjs';
import {listPapers,paperPassageBlocks} from '../src/domain/papers.mjs';
import {knowledgeMap,cycleMastery,masteryMap,validMastery} from '../src/domain/knowledge-map.mjs';
import {buildHandbook} from '../src/domain/handbook.mjs';
import {isSchoolPrivate,publicQuestions,personalPages} from '../src/domain/access.mjs';
import {notebookItems,filterNotebook,retryableIds} from '../src/domain/notebook.mjs';
import {refreshTrainingSession} from '../src/domain/training.mjs';
import {advanceWithReplacement} from '../src/domain/replacement.mjs';
import {writtenResult} from '../src/domain/written.mjs';
import {validateBackup} from '../src/storage/backup.mjs';
import {homeView} from '../src/features/records.mjs';
import {paperPracticeView} from '../src/features/papers.mjs';
import {notebookView} from '../src/features/notebook.mjs';

const bank=JSON.parse(readFileSync(new URL('../content/bank.json',import.meta.url),'utf8'));
const appendix=JSON.parse(readFileSync(new URL('../content/sources/appendix-content.json',import.meta.url),'utf8'));
const school={id:'school-original-secret',provenance:{kind:'school-original'},origin:'school-original',status:'reviewed',active:true,essayIds:['essay-01'],ability:'vocabulary',stem:'校本秘密題',choices:[{id:'a',text:'不該公開'}],answerId:'a'};

test('original papers use stored DSE questions and leave translations off the sheet',()=>{
 const papers=listPapers(bank);
 assert.ok(papers.length>=1);
 assert.equal(papers.reduce((n,paper)=>n+paper.questions.length,0),papers.flatMap(paper=>paper.questions).filter(q=>q.provenance.kind==='dse-original').length);
 assert.ok(papers.every(paper=>paper.questions.every(q=>q.status==='reviewed'&&q.active!==false)));
 assert.equal(listPapers({...bank,questions:[...bank.questions,school]}).some(paper=>paper.questions.some(q=>q.id===school.id)),false);
 for(const q of papers.flatMap(paper=>paper.questions)){
  const blocks=paperPassageBlocks(q);
  for(const passage of q.learning?.passages||[])if(passage.translation&&passage.translation!==passage.original)assert.equal(blocks.some(block=>block.text===passage.translation),false);
 }
 const session={kind:'paper',paperTitle:papers[0].id,questions:papers[0].questions,index:0,answers:{},drafts:{},completed:false};
 const html=paperPracticeView(bank,session,project([]));
 assert.match(html,/paper-layout/);
 assert.match(html,/data-action="paper-go"/);
 assert.doesNotMatch(html,/全句語譯|校本秘密題/);
});

test('knowledge map stays on existing chapters and mastery marks cycle without changing review data',()=>{
 const map=knowledgeMap(bank);
 assert.equal(map.length,bank.essays.length);
 assert.equal(map.some(row=>row.points.some(point=>['本句的理解要點','讀法與自查','本題的理解要點'].includes(point.title))),false);
 const withSchool=knowledgeMap({...bank,questions:[...bank.questions,school]});
 assert.deepEqual(withSchool.map(row=>row.count),map.map(row=>row.count));
 assert.equal(cycleMastery(''),'learning');
 assert.equal(cycleMastery('learning'),'known');
 assert.equal(cycleMastery('known'),'');
 const state=project([{id:'mark',type:'settings',createdAt:'2026-11-10T00:00:00Z',payload:{mastery:{'essay-01':'known','bad':'yes'}}}]);
 assert.deepEqual(masteryMap(state),{'essay-01':'known'});
 assert.equal(validMastery({'essay-01':'learning'}),true);
 assert.equal(validMastery(JSON.parse('{"__proto__":"known"}')),false);
 const backup={format:'wenyan-backup-v1',userId:'u',events:[{id:'s1',type:'settings',createdAt:'2026-11-10T00:00:00Z',payload:{mastery:{'essay-01':'known'}}}]};
 assert.equal(validateBackup(backup,'u')[0].payload.mastery['essay-01'],'known');
 assert.throws(()=>validateBackup({...backup,events:[{...backup.events[0],id:'s2',payload:{mastery:{bad:true}}}]},'u'),/掌握標記/);
});

test('handbook organises existing material and does not invent a dictionary',()=>{
 const book=buildHandbook({questions:[...bank.questions,school],comparisons:bank.comparisons,appendix});
 assert.ok(book.todos.some(item=>item.includes('尚未收入')));
 assert.equal(book.functions.some(item=>item.id===school.id),false);
 assert.equal(book.functions.every(item=>{
  const q=bank.questions.find(question=>question.id===item.id);
  const gloss=q?.choices?.find(choice=>choice.id===q.answerId)?.text||'';
  return item.gloss===gloss;
 }),true);
 assert.equal(JSON.stringify(book).includes('盍'),false);
 assert.ok(book.rhetoric.some(section=>section.title.includes('修辭')));
 assert.ok(book.senses.length>=1);
});

test('notebook keeps same-day mistakes visible and waits until the next Hong Kong day to retry',()=>{
 const q={id:'q1',memoryId:'m1',essayIds:['essay-01'],ability:'meaning',status:'reviewed',active:true,stem:'這句怎麼理解',quote:'學而時習之',answerId:'a',explanation:'習是溫習。',choices:[{id:'a',text:'溫習'},{id:'b',text:'學習'}]};
 const other={...q,id:'q2',ability:'vocabulary',stem:'另一題',essayIds:['essay-02']};
 const time='2026-11-10T02:00:00Z';
 const attempt={id:'a1',type:'attempt',createdAt:time,payload:{questionId:'q1',memoryId:'m1',question:q,submittedAt:time,mode:'choice',answer:'b',correct:false,trainingPolicy:2,practiceKind:'extra'}};
 const bankette={questions:[q,other],essays:[{id:'essay-01',title:'論仁'},{id:'essay-02',title:'魚'}]};
 const state=project([attempt]);
 const today=notebookItems(bankette,state,[], '2026-11-10');
 assert.equal(today.length,1);
 assert.equal(today[0].retryable,false);
 assert.match(today[0].student,/學習/);
 assert.match(today[0].correct,/溫習/);
 assert.match(today[0].explanation,/溫習/);
 assert.deepEqual(retryableIds(today),[]);
 const tomorrow=notebookItems(bankette,state,[], '2026-11-11');
 assert.equal(tomorrow[0].retryable,true);
 assert.deepEqual(retryableIds(tomorrow),['q1']);
 const item={id:'written:a',version:1,kind:'vocabulary',origin:'authored-basic',essayId:'essay-01',prompt:'解釋習',target:'習',context:'學而時習之',reference:'溫習',accepted:['溫習'],points:['語境'],rubric:'按語境',sourceLabel:'測試'};
 const written=[
  {id:'w1',type:'written',createdAt:time,payload:{action:'submit',itemId:item.id,item,answer:'不知道',result:writtenResult(item,'不知道')}},
  {id:'w2',type:'written',createdAt:time,payload:{action:'self',attemptId:'w1',outcome:'revisit',checked:true}},
 ];
 const combined=notebookItems(bankette,project([...written,attempt]),[item],'2026-11-10');
 assert.equal(combined.length,2);
 assert.equal(combined.find(row=>row.kind==='written').retryable,false);
 assert.equal(notebookItems(bankette,project(written),[item],'2026-11-11').find(row=>row.kind==='written').retryable,true);
 const drafted=project([...written,{id:'w3',type:'written',createdAt:'2026-11-11T01:00:00Z',payload:{action:'draft',itemId:item.id,answer:'再寫一次',revision:2}}]);
 const afterDraft=notebookItems(bankette,drafted,[item],'2026-11-11');
 assert.equal(afterDraft.find(row=>row.kind==='written').retryable,false);
 assert.equal(afterDraft.some(row=>row.kind==='written'),true);
 assert.deepEqual(filterNotebook(combined,{essay:'essay-01'}).map(row=>row.kind).sort(),['mcq','written']);
 assert.deepEqual(filterNotebook(combined,{type:'written'}).map(row=>row.id),['written:a']);
 const html=notebookView(bankette,project([...written,attempt]),[item],{},'2026-11-10');
 assert.match(html,/這句怎麼理解/);
 assert.match(html,/不知道/);
 assert.match(html,/今天已練過/);
 assert.doesNotMatch(html,/data-action="mistake-start"|data-action="notebook-written-retry"/);
 const later=notebookView(bankette,project([attempt]),[],{essay:'essay-02'},'2026-11-11');
 assert.match(later,/這個篩選下沒有錯題/);
 const held={...q,id:'held',active:false,stem:'題目 held'};
 const hidden=notebookItems({questions:[held],essays:[]},project([{...attempt,id:'held-a',payload:{...attempt.payload,questionId:'held',question:held}}]),[],'2026-11-11');
 assert.equal(hidden.length,0);
 const session={id:'paper',kind:'paper',questions:[q],index:0,answers:{},drafts:{},essayIds:['essay-01'],completed:false,mode:'choice',startedAt:time,targetCount:1,paused:false};
 const kept=refreshTrainingSession([q],state,session,'2026-11-10');
 assert.deepEqual(kept.questions.map(item=>item.id),['q1']);
 const paper={...session,questions:[q,other],targetCount:2};
 assert.equal(advanceWithReplacement(paper,project([]),[q,other],true),true);
 assert.deepEqual(paper.questions.map(item=>item.id),['q1','q2']);
});

test('guests can open public study tools and personal pages stay behind login',()=>{
 assert.equal(isSchoolPrivate(school),true);
 assert.equal(publicQuestions([school,{id:'public'}]).map(q=>q.id).join(),'public');
 assert.equal(personalPages.has('mistakes'),true);
 assert.equal(personalPages.has('papers'),false);
 const guest=homeView({essays:[],questions:[]},project([]),{guest:true});
 for(const label of ['原卷對照','知識地圖','文言速查','錯題本','登入以保存進度','打字測義（看句寫義）'])assert.ok(guest.includes(label),label);
 assert.doesNotMatch(guest,/school-original|校本秘密題/);
});
