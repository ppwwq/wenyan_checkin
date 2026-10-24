// Required assessed passages for verified assessed-material mismatches.
const requirements={
 'full-c-01-22-02-03':['事父母幾諫','見志不從','指從此以往'],
 'full-c-01-28-03-80':['君子恥其言而過其行','臣請完璧歸趙','歸璧於趙'],
 'full-a-e02-p09-b01-g07':['所欲有甚於生者','非獨賢者有是心也','人皆有之'],
};
export const hasMaterialContract=q=>Object.hasOwn(requirements,q.id);
export function materialErrors(q){
 const needles=requirements[q.id];if(!needles)return [];
 const learned=(q.learning?.passages||[]).map(p=>p.original).join('\n');
 return needles.filter(s=>!q.quote?.includes(s)||!learned.includes(s)).map(s=>'受考材料及導讀必須含已核原句：'+s);
}
