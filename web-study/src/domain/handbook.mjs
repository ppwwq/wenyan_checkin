import {publicQuestions} from './access.mjs';
import {classifyChoice} from './choice-classification.mjs';

const patternNames=/被動句|倒裝句|省略句|賓語前置|判斷句|介詞結構後置|定語後置|狀語後置/;
const released=q=>q&&q.active!==false&&q.status==='reviewed';
export function headword(q){
 if(q.target)return q.target;
 const match=String(q.stem||'').match(/[「『]([^」』]{1,12})[」』]/);
 return match?match[1]:'虛詞';
}
export function choiceGloss(q){
 return q?.choices?.find(c=>c.id===q.answerId)?.text||'';
}
function card(q){
 return {id:q.id,word:headword(q),stem:q.stem||'',gloss:choiceGloss(q),explanation:q.explanation||'',essayIds:q.essayIds||[],quote:q.quote||''};
}
export function buildHandbook({questions=[],comparisons=[],appendix=null}={}){
 const pool=publicQuestions(questions).filter(released);
 const functions=pool.filter(q=>classifyChoice(q).topic==='虛詞').map(card);
 const patterns=pool.filter(q=>patternNames.test([q.stem,q.explanation,q.summary,(q.choices||[]).map(c=>c.text).join(' ')].join('\n'))).map(card);
 const senses=(comparisons||[]).filter(g=>g?.status==='reviewed'&&Array.isArray(g.items)&&g.items.length).map(g=>({id:g.id,target:g.target||'',title:g.title||'',items:g.items.map(item=>({questionId:item.questionId,meaning:item.meaning||'',clue:item.clue||''}))}));
 const rhetoric=Array.isArray(appendix?.sections)?appendix.sections.map(section=>({title:section.title||'',source:section.source||'',note:section.note||'',rows:(section.rows||[]).filter(row=>Array.isArray(row)&&row[0])})):[];
 const todos=['獨立的文言虛詞詞典和句式總表尚未收入。下面只整理題庫、詞義對照和手法附錄裡已經有的材料，不補寫未出現的詞條。'];
 if(!functions.length)todos.push('虛詞：題庫裡沒有標成虛詞的已核對題。');
 if(!patterns.length)todos.push('句式：題幹或解析裡沒有寫明被動句、倒裝句、賓語前置等的題目。');
 if(!senses.length)todos.push('易混詞：沒有已核對的詞義對照。');
 if(!rhetoric.length)todos.push('手法：手法附錄這次沒有載入。');
 return {functions,patterns,senses,rhetoric,todos};
}
