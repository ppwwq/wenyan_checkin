// Narrow, source-verified regression contract for 2024 Paper 1A Q2.
// The source record keeps the shared stem; the app displays one subquestion.
// This does not claim to validate the semantics of all official questions.
const contracts={'dse-2024-1a-2-i':{part:'i',character:'心',line:1},'dse-2024-1a-2-ii':{part:'ii',character:'今',line:4}};
export const hasOriginalPresentationContract=q=>Object.hasOwn(contracts,q.id);
export function originalPresentationErrors(q){
 const part=contracts[q.id];
 if(!part)return [];
 const errors=[],check=(ok,message)=>{if(!ok)errors.push(message);};
 const shared='以下兩字是否《登樓》一詩的韻腳？',p=q.sourcePresentation,r=q.rhymeEvidence;
 check(q.provenance?.kind==='dse-original'&&q.source?.pdfPage===2&&q.provenance?.markingPdfPage===1,'登樓原卷／評分來源關係不符');
 check(p?.sharedStem===shared&&p.selectedPart===part.part&&JSON.stringify(p.items)===JSON.stringify([{part:'i',text:'心'},{part:'ii',text:'今'}])&&p.displayNote?.trim(),'登樓共同題幹與獨立分題不符');
 check(q.stem===`「${part.character}」是否《登樓》一詩的韻腳？`,'登樓獨立題面須只問所選一字');
 check(q.source?.anchor===shared+'\n'+part.character,'登樓原來源題幹須保留');
 check(q.answerId==='a'&&JSON.stringify(q.choices?.map(c=>[c.id,c.text]))===JSON.stringify([['a','是'],['b','否']]),'登樓原圈選選項及答案不符');
 const lines=(q.learning?.passages||[]).map(p=>p.original||'').join('').split(/[，。！？；]/).map(s=>s.trim()).filter(Boolean);
 const numbers=[1,2,4,6,8],characters=numbers.map(n=>lines[n-1]?.slice(-1));
 check(lines.length===8&&JSON.stringify(characters)===JSON.stringify(['心','臨','今','侵','吟']),'登樓導讀原詩與韻腳不符');
 check(JSON.stringify(r?.lineNumbers)===JSON.stringify(numbers)&&JSON.stringify(r?.characters)===JSON.stringify(characters)&&r?.selectedLine===part.line&&r?.selectedCharacter===part.character,'登樓韻腳證據與所選詩行不符');
 check(q.explanation?.includes(`第${part.line}句`)&&q.explanation.includes('心、臨、今、侵、吟'),'登樓解析缺正確詩行／韻腳');
 return errors;
}
