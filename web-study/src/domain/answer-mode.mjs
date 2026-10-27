// Reuse the existing free-response vocabulary items; choice-dependent items stay intact.
export const isTypingVocabulary=q=>q.ability==='vocabulary'&&q.responseFormat!=='single-choice'&&q.provenance?.kind!=='dse-original';

export function answerMode(q,session,payload){
 if(payload?.mode)return payload.mode;
 if(session.vocabularyTyping!==undefined)return session.vocabularyTyping&&isTypingVocabulary(q)?'typing':'choice';
 // Old sessions keep their original mixed-mode behavior.
 return q.responseFormat==='single-choice'?'choice':session.mode==='mixed'&&session.index%3===2?'typing':'choice';
}
