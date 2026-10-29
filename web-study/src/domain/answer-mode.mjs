// 舊資料裡仍有約 56 題缺 responseFormat。這個判斷只留給舊記錄，不再用來藏起選擇題。
export const isTypingVocabulary=q=>q.ability==='vocabulary'&&q.responseFormat!=='single-choice'&&q.provenance?.kind!=='dse-original';

export function answerMode(q,session,payload){
 if(payload?.mode)return payload.mode;
 // vocabularyTyping 已停用。設定過這個欄位的題組一律用選擇題。
 // 沒有這個欄位的舊 mixed 題組，仍按原來的規則。
 if(session.vocabularyTyping!==undefined)return 'choice';
 return q.responseFormat==='single-choice'?'choice':session.mode==='mixed'&&session.index%3===2?'typing':'choice';
}
