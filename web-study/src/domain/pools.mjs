// 默认抽题用哪些题，和「自拟」怎么认出来。
import {isTypingVocabulary} from './answer-mode.mjs';

export function isAuthoredPractice(q){
 if(!q||q.provenance?.kind==='school-original')return false;
 if(q.tags?.includes('revision-book-authored'))return true;
 if(String(q.id||'').startsWith('authored-'))return true;
 if(q.provenance?.kind==='authored')return true;
 if(q.editorial?.purpose==='simulation')return true;
 return false;
}

// 「应解作甚么」一类 full-* 模板词义。句意／主旨／手法里的 full-* 不动。
export function isTemplateVocab(q){
 if(q?.ability!=='vocabulary')return false;
 if(q.provenance?.kind==='school-sheet'||q.provenance?.kind==='school-original')return false;
 if(isAuthoredPractice(q))return false;
 if(String(q.id||'').startsWith('full-'))return true;
 return !!q.tags?.includes('full-book-expansion')||!!q.tags?.includes('full-source-expansion');
}

// 旧打字开关那套残缺选择题。自拟题即使缺 responseFormat 也留在自拟池。
export function isRetiredTypingMcq(q){
 return isTypingVocabulary(q)&&Array.isArray(q?.choices)&&q.choices.length>=2&&q?.provenance?.kind!=='school-sheet'&&q?.origin!=='school-sheet'&&!isAuthoredPractice(q);
}

export function isExtensionQuestion(q){
 return isTemplateVocab(q)||isRetiredTypingMcq(q);
}

// 数字小的先抽：校练词义，自拟，官方，其余。
export function sourceRank(q){
 if(q?.provenance?.kind==='school-sheet'||q?.origin==='school-sheet')return 0;
 if(isAuthoredPractice(q))return 1;
 if(q?.provenance?.kind==='dse-original')return 2;
 return 3;
}
