// A verified relevance error, not a classifier of every card's semantic value.
export const hasLearningCardContract=q=>q.id==='full-c-01-19-00-03';
export function learningCardErrors(q){
 const hasPassiveCard=q.learning?.knowledge?.some(c=>c.title==='被動句');
 const questionText=[q.stem,q.explanation,...(q.choices||[]).flatMap(c=>[c.text,c.explanation])].join('\n');
 const ordinaryPassive=/被動順從/.test(q.stem||'')&&!/被動句|語法|句法|施事者|施動者|主語|賓語/.test(questionText);
 return hasPassiveCard&&(hasLearningCardContract(q)||ordinaryPassive)?['孝道的被動順從不能作為配入文言被動句知識卡的依據']:[];
}
