import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {writtenView} from '../src/features/written.mjs';
import {schoolVocabForSheet,mergeSchoolBatches} from '../src/domain/school-vocab.mjs';
import * as hall from '../src/features/review-hall.mjs';
import {filterWritten,writtenResult} from '../src/domain/written.mjs';
import {compactQuotation,readingContext} from '../src/domain/reading-context.mjs';
import {quote} from '../src/features/shared.mjs';
import {translationExcerpts} from '../src/domain/translation-excerpts.mjs';

const read=name=>JSON.parse(readFileSync(new URL('../content/'+name,import.meta.url)));
const bank=read('bank.json'),sources=read('sources/student-content.json');
const rawSchool=mergeSchoolBatches([read('school-vocab/v1.json'),read('school-vocab/v1.1.json')]);
const school=schoolVocabForSheet(rawSchool);

test('school vocabulary shows its essay and marks repeated target glyphs in a short context',()=>{
 const item=school.find(i=>i.id==='school-vocab:essay-01:explain:042');
 const html=writtenView(school,bank,[],{itemId:item.id,sourceContent:sources});
 assert.match(html,/《論仁、論孝、論君子》/);
 assert.equal((html.match(/<mark>以<\/mark>/g)||[]).length,3);
 assert.doesNotMatch(html,/孟懿子問孝/);
 assert.match(html,/生，事之<mark>以<\/mark>禮/);
});

test('type hall opens a reading page with answers and translations, without answer forms',()=>{
 const entry=hall.reviewHallView(bank,rawSchool,[],[]);
 assert.match(entry,/data-action="review-read"/);
 const item=rawSchool.find(i=>i.id==='school-vocab:essay-05:moshu:021');
 const html=hall.reviewReadingView(bank,[item],[],[],{type:'flex',sourceContent:sources});
 assert.match(html,/《廉頗藺相如列傳》/);
 assert.match(html,/<mark>刃<\/mark>/);
 assert.match(html,/參考答案/);
 assert.match(html,/秦王左右侍衞想殺相如/);
 assert.doesNotMatch(html,/<textarea|written-submit|written-checked|開始短答/);
});

test('revealing an answer needs no attempt or checkbox and includes the source translation',()=>{
 const item=school.find(i=>i.id==='school-vocab:essay-05:moshu:021');
 const events=[];
 const html=writtenView(school,bank,events,{itemId:item.id,revealed:true,sourceContent:sources,sheet:{ids:[item.id,school[0].id],index:0}});
 assert.match(html,/《廉頗藺相如列傳》/);
 assert.match(html,/參考答案/);
 assert.match(html,/秦王左右侍衞想殺相如/);
 assert.match(html,/不會，下一題/);
 assert.match(html,/跳過，下一題/);
 assert.doesNotMatch(html,/written-checked|written-self|written-again|type="checkbox"|id="written-answer"/);
 assert.deepEqual(events,[]);
});

test('explicitly marking a previously matched answer as unknown keeps it in revisit',()=>{
 const item=school.find(i=>i.id==='school-vocab:essay-05:moshu:021'),answer=item.reference;
 const events=[{id:'try',type:'written',createdAt:'2026-10-29T12:00:00Z',payload:{action:'submit',itemId:item.id,item,answer,result:writtenResult(item,answer)}},
  {id:'self',type:'written',createdAt:'2026-10-29T12:01:00Z',payload:{action:'self',attemptId:'try',outcome:'revisit',checked:true}}];
 assert.deepEqual(filterWritten([item],{progress:'revisit'},events).map(i=>i.id),[item.id]);
});

test('shortening a quotation preserves reviewed positions and rejects stale locator context',()=>{
 const text='不以其道得之，不處也。生，事之以禮。';
 const valid={quote:text,target:'以',targetStart:text.lastIndexOf('以'),targetContext:'事之以禮'};
 assert.equal(quote(compactQuotation(valid)),'生，事之<mark>以</mark>禮。');
 assert.doesNotMatch(quote(compactQuotation({...valid,targetContext:'已不存在的句子'})),/<mark>/);
});

test('translation is limited to the displayed clause rather than its entire source paragraph',()=>{
 const shame=school.find(i=>i.id==='school-vocab:essay-05:moshu:024');
 const p=readingContext(shame,bank,sources).passage;
 assert.equal(p.translation,'況且相如本來是出身卑賤的人，我感到（被）羞辱');
 const exile=school.find(i=>i.context==='自余為僇人');
 assert.equal(readingContext(exile,bank,sources).passage.translation,'自從我受罰被貶');
});

test('direct reading accepts multiple essays and an explicitly empty chapter scope',()=>{
 const html=hall.reviewReadingView(bank,rawSchool,[],[],{type:'flex',essayIds:['essay-01','essay-05'],sourceContent:sources});
 assert.match(html,/type="checkbox"[^>]*data-reading-essay="essay-01"[^>]*checked/);
 assert.match(html,/type="checkbox"[^>]*data-reading-essay="essay-05"[^>]*checked/);
 assert.doesNotMatch(html,/《出師表》/);
 const empty=hall.reviewReadingView(bank,rawSchool,[],[],{type:'flex',essayIds:[],sourceContent:sources});
 assert.doesNotMatch(empty,/class="review-reading-item"/);
 assert.match(empty,/請先選擇篇章/);
});

test('every punctuation exception keeps both sides traceable to the same existing source paragraph',()=>{
 const norm=text=>text.replace(/[\s\p{P}\p{S}]/gu,'');
 const paragraphs=sources.flatMap(unit=>unit.pages.flatMap(page=>{
  const original=page.blocks.find(b=>b[0]==='annot')?.[1],at=page.blocks.findIndex(b=>b[0]==='head'&&b[1]==='語譯');
  return original&&at>=0&&page.blocks[at+1]?.[0]==='text'?[{original,translation:page.blocks[at+1][1]}]:[];
 }));
 for(const [original,translation] of translationExcerpts)assert.ok(paragraphs.some(p=>norm(p.original).includes(norm(original))&&p.translation.includes(translation)),original+' must use its actual source translation');
});

test('a short displayed clause never falls back to an unrelated whole-paragraph translation',()=>{
 const fixture={id:'x',essayId:'x',target:'甲',context:'甲句'};
 const b={essays:[{id:'x',title:'篇'}],questions:[]};
 const source=[{name:'篇',pages:[{title:'段',blocks:[['annot','甲句，乙句。丙句。'],['head','語譯'],['text','甲的意思。乙的意思，丙的意思，額外說明。結語。']]}]}];
 assert.equal(readingContext(fixture,b,source).passage,null);
});

test('a clipped quotation keeps its closing quote when the speaker and opening quote remain',()=>{
 const item=school.find(i=>i.id==='school-vocab:essay-01:explain:042');
 const translation=readingContext(item,bank,sources).passage.translation;
 assert.match(translation,/孔子說：「/);
 assert.match(translation,/。」$/);
});
