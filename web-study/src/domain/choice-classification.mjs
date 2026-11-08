import {isAuthoredPractice} from './pools.mjs';
import {isCrossSense} from './review-types.mjs';

export const choiceSources={
 'dse-original':'DSE 真題',
 authored:'自擬選擇題',
 'school-original':'其他本機原題',
 existing:'既有篇章與手法練習',
};
export const choiceFamilies=['字詞','句子與語譯','篇章理解','修辭與寫作','比較與評議'];

export function choiceSource(q){
 const kind=q.provenance?.kind;
 if(kind==='dse-original'||kind==='school-original')return kind;
 return isAuthoredPractice(q)?'authored':'existing';
}

export function choiceOriginLabel(q,source=choiceSource(q)){
 if(source==='dse-original')return q.provenance.year+' 年卷一甲部原卷';
 if(source==='school-original'){
  const sitting=q.provenance.exam?.match(/^\d{4}[–/-]\d{2}\s+中[四五]/)?.[0];
  return sitting?sitting+'校本卷一':'校本卷一';
 }
 if(source==='authored'&&q.id.startsWith('authored-exp-v1-'))return '自擬增補 v1';
 if(q.source?.title?.includes('手法附錄'))return '《文言詩詞・十六篇復習書》手法附錄';
 if(q.source?.title?.includes('十六篇復習書'))return '《文言詩詞・十六篇復習書》篇章題';
 return q.source?.title||'既有題庫資料';
}

const rhetoric=[
 ['比喻',/比喻|喻體|本體與喻體|明喻|暗喻|借喻/],
 ['襯托',/襯托|反襯|正襯|烘托|以[聲動]襯靜/],
 ['擬人',/擬人|比擬/],['借代',/借代/],['象徵',/象徵/],['對比',/對比|對照/],
 ['誇張',/誇張|誇飾|誇寫/],['用典',/用典|allusion/],['引用',/引用/],
 ['排比',/排比/],['層遞',/層[層层]?遞|層層遞進/],['對偶與對仗',/對偶|對仗/],
 ['設問與反問',/設問|反問|反詰/],['反復與疊字',/反[復覆]|疊字|疊詞/],
 ['其他修辭',/互文|通感|移覺|反語|雙關|呼告|頂真|雙聲|疊韻/],
];
const techniqueTopics=[
 ['結構與詳略',/結構|详略|詳略|照應|呼應|起首|作結|過渡|鋪墊|伏筆|懸念|敍事|敘事|承上啟下|sequence|structure|transition/],
 ['論證與說明',/論證|說理|论证|論點|論據|說明手法|說明方式|argument/],
 ['描寫與寫景',/描寫|寫景|動靜|感官|白描|sensory|scene-description/],
 ['抒情與寄託',/抒情|寄意|寄託|借景|融情入景/],
 ['體裁與聲律',/文體|體裁|韻腳|音律|押韻|genre/],
];
const simplifiedTerms={'一词多义':'一詞多義','虚词':'虛詞','层层递进':'層層遞進','说理':'說理','论证':'論證'};
const result=(family,topic,related=[])=>({family,topic,related});

// These originals have a broader ability label or a numbered answer combination.
// The keys refer to the retained original items and their checked assessed content.
const officialTopics=new Map([
 ['dse-2018-1a-4',result('修辭與寫作','論證與說明',['對比','比喻'])],
 ['dse-2018-1a-6',result('篇章理解','人物形象與動機')],
 ['dse-2019-1a-3-i',result('字詞','語境詞義')],
 ['dse-2019-1a-5',result('修辭與寫作','句式與語言特色')],
 ['dse-2020-1a-5-i',result('修辭與寫作','論證與說明',['比喻','引用'])],
 ['dse-2020-1a-6-i',result('篇章理解','主旨、情感與態度')],
 ['dse-2021-1a-3',result('修辭與寫作','論證與說明',['比喻'])],
 ['dse-2021-1a-5',result('修辭與寫作','論證與說明',['比喻'])],
 ['dse-2022-1a-6-ii',result('修辭與寫作','層遞',['反復與疊字','體裁與聲律'])],
 ['dse-2024-1a-3-ii',result('修辭與寫作','論證與說明')],
 ['dse-2024-1a-6-ii',result('修辭與寫作','描寫與寫景',['比喻'])],
 ['dse-2025-1a-5',result('修辭與寫作','體裁與聲律')],
]);

export function classifyChoice(q){
 if(q.provenance?.kind==='dse-original'&&officialTopics.has(q.id))return officialTopics.get(q.id);
 const stem=q.stem||'';
 const type=q.assessmentType||'';
 const tags=q.tags||[];
 let metadata=[type,...tags].join(' ');
 for(const [from,to] of Object.entries(simplifiedTerms))metadata=metadata.replaceAll(from,to);
 const match=pattern=>pattern.test(metadata);
 if(match(/字形|異體字/))return result('字詞','字形辨識');
 if(match(/字音|讀音/))return result('字詞','字音辨識');
 if(match(/字理|字源/))return result('字詞','字理與字源');
 if(match(/polysemy|多義/))return result('字詞','一詞多義');
 if(match(/活用|school-flex/))return result('字詞','詞類活用');
 if(match(/通假|school-loan/))return result('字詞','通假');
 if(match(/虛詞|school-function/)||q.ability==='vocabulary'&&/(虛詞|[「『][以之者於而其][」』]字.*用法)/.test(stem))return result('字詞','虛詞');
 if(match(/句式|句法|語法|grammar|syntax|賓語前置/)||/(被動句|倒裝句|省略句|賓語前置|介詞結構後置)/.test(stem))return result('句子與語譯','句式與語法');
 if(match(/指代|指涉|指稱|reference/))return result('句子與語譯','指代與指涉');
 if(q.ability==='vocabulary')return result('字詞',isCrossSense(q)?'跨篇詞義':'語境詞義');
 if(match(/跨篇比較|跨篇雙證據/)||q.essayIds?.length>1)return result('比較與評議','跨篇比較');
 if(match(/作答評議|解讀評議|證據界限|多解一致|evaluation|評價|評議/)){
  return result('比較與評議','評議與應用',rhetoric.filter(([,pattern])=>pattern.test(type)).map(([label])=>label));
 }
 if(q.ability==='technique'){
  const directIdentification=tags.includes('sentence-technique')||
   /運用了甚麼修辭手法|運用了什麼修辭手法|以什麼手法抒述心志/.test(stem);
  const namedAnswer=directIdentification?q.choices.find(c=>c.id===q.answerId)?.text||'':'';
  const assessed=[metadata,namedAnswer,stem].join(' ');
  const named=rhetoric.filter(([,pattern])=>pattern.test(assessed)).map(([label])=>label);
  const writing=techniqueTopics.find(([,pattern])=>pattern.test(assessed));
  if(writing)return result('修辭與寫作',writing[0],named);
  if(named.length)return result('修辭與寫作',named[0],named.slice(1));
  return result('修辭與寫作','綜合手法與效果');
 }
 if(match(/人物|character|動機|言行/))return result('篇章理解','人物形象與動機');
 if(match(/句意|語譯|sentence-meaning|sentence-relation/))return result('句子與語譯','句意與整句理解');
 if(match(/推論|推理|證據|因果|inference|evidence|causality/))return result('篇章理解','推論與文本證據');
 if(match(/概括|段意|summary/))return result('篇章理解','概括與段意');
 if(match(/比較|comparison/))return result('比較與評議','同篇比較');
 if(q.ability==='theme'||match(/主旨|情感|scene-feeling|tone/))return result('篇章理解','主旨、情感與態度');
 return result('篇章理解','文意與情節');
}

export function matchesChoiceClassification(q,{choiceSource:source,choiceFamily:family,choiceTopic:topic}={}){
 if(source&&choiceSource(q)!==source)return false;
 if(!family&&!topic)return true;
 const classification=classifyChoice(q);
 return (!family||classification.family===family)&&(!topic||classification.topic===topic||classification.related.includes(topic));
}

