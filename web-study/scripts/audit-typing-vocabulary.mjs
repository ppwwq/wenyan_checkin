import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isTypingVocabulary} from '../src/domain/answer-mode.mjs';

const raw=await readFile(new URL('../content/bank.json',import.meta.url));
const bank=JSON.parse(raw),active=bank.questions.filter(q=>q.status==='reviewed'&&q.active!==false);
const vocabulary=active.filter(q=>q.ability==='vocabulary'),typing=vocabulary.filter(isTypingVocabulary);
const choice=active.filter(q=>q.choices?.some(c=>c.id===q.answerId));
const rows=typing.map(q=>({id:q.id,memoryId:q.memoryId,essayIds:q.essayIds,target:q.target,stem:q.stem,
 choiceIds:choice.filter(c=>c.id===q.id).map(c=>c.id),
 otherSameMemory:choice.filter(c=>c.id!==q.id&&c.memoryId===q.memoryId).map(c=>c.id),
 // Candidate semantic duplicates only; same word without the same context is not a duplicate.
 otherSameContext:choice.filter(c=>c.id!==q.id&&c.target===q.target&&c.quote===q.quote&&JSON.stringify(c.essayIds)===JSON.stringify(q.essayIds)).map(c=>c.id)
}));
const result={bankVersion:bank.version,bankSha256:createHash('sha256').update(raw).digest('hex'),
 totalQuestions:bank.questions.length,activeVocabulary:vocabulary.length,legacyTypingVocabulary:typing.length,
 sharedWithChoice:rows.filter(r=>r.choiceIds.length).length,
 standaloneTyping:rows.filter(r=>!r.choiceIds.length).length,
 otherSameMemory:rows.filter(r=>r.otherSameMemory.length).length,
 otherSameContextCandidates:rows.filter(r=>r.otherSameContext.length).length,
 definition:'Existing mixed-mode vocabulary compatibility (not single-choice, not original DSE). Compare IDs, memory IDs, and exact word/context/chapters; semantic review is separate.',
 rows};
const out=new URL('../verification/typing-daily-2026-10-23/',import.meta.url);await mkdir(out,{recursive:true});
await writeFile(new URL('overlap-audit.json',out),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,rows:undefined},null,2));
