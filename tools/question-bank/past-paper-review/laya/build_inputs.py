"""Freeze bank/evidence, group sample families and build auditable advisory requests."""
import argparse
from collections import Counter,defaultdict
from common import *

def choice(ins, options):
    return {'type':'choice','instructions':ins,'criteria':options}

FIT={'yes':'適用','conditional':'有條件適用','no':'不適用','unknown':'證據不足'}
RUBRICS={
 'student':{
  'foundation':choice('Is this useful for basic word meaning or literal understanding?',FIT),
  'diagnostic':choice('Does this distinguish a specific plausible misunderstanding?',FIT),
  'integration':choice('Must the student connect multiple pieces of textual evidence?',FIT),
  'exam_reasoning':choice('Does this train identifying evidence and sufficient answer points?',FIT),
  'extension':choice('Does this require knowledge beyond the supplied literary text?',FIT),
  'operation':choice('What is the main required operation?',{'word':'解詞','meaning':'理解句意','inference':'連接因果或條件','effect':'分析手法作用','comparison':'比較','recall':'回憶知識','unknown':'無法判斷'}),
  'shortcut':choice('Can option form or irrelevant alternatives reveal the answer without target reasoning?',{'yes':'有明顯猜題捷徑','no':'需要目標判斷','unknown':'證據不足'}),
  'parallel':choice('Do all options answer the same question on the same dimension?',{'yes':'同一維度','no':'混合維度或離題','unknown':'證據不足'})},
 'review':{
  'answer_support':choice('Does the evidence support the keyed answer?',{'supported':'有證據支持','contradicted':'與證據矛盾','unknown':'證據不足'}),
  'uniqueness':choice('Can a second option also be defended under the question wording?',{'unique':'單一成立答案','multiple':'另一項也可成立','unknown':'不能確認'}),
  'set_strength':choice('Are ALL three wrong options plausible but textually distinguishable?',{'all':'三項有實質吸引點','some':'只有部分有效','none':'錯項明顯無效','unknown':'證據不足'}),
  'set_redundancy':choice('Are the wrong options essentially the same error with different wording?',{'yes':'錯因重複','no':'有實質區別','unknown':'證據不足'}),
  'answer_form':choice('Is the keyed answer conspicuous mainly by length, wording or completeness?',{'yes':'形式突出','no':'無明顯提示','unknown':'不能判斷'}),
  'main_explanation':choice('Does the explanation connect concrete evidence to the answer?',{'worked':'具體證據與推理','generic':'只給結論或泛泛理由','off_topic':'離題或矛盾','unknown':'證據不足'})},
 'option':{
  'relevance':choice('Does the selected option address the same question?',{'related':'直接相關','partial':'部分相關','unrelated':'離題','unknown':'無法判斷'}),
  'attraction':choice('Could a partially informed student plausibly select this option?',{'plausible':'有具體吸引點','weak':'吸引點薄弱','absurd':'明顯荒謬','unknown':'不能判斷'}),
  'support':choice('Does the provided evidence support the selected option?',{'supported':'有據成立','refuted':'可據文排除','unknown':'證據不足'}),
  'shortcut':choice('Can this option be ruled out by form or absurdity without target understanding?',{'yes':'容易直接排除','no':'需文本辨別','unknown':'不能判斷'}),
             'rationale':choice('Does its rationale explain the specific difference from the correct interpretation?',{'specific':'有具體區別','generic':'只重說答案或空泛','wrong':'理由不符','unknown':'證據不足'}),
  'misreading':choice('Which error does this option suggest? Do not diagnose an actual student.',{'word':'套錯詞義','scope':'漏條件或誇大範圍','role':'混淆對象或立場','relation':'倒因果或錯接關係','technique':'混淆手法或效果','irrelevant':'無關內容','other':'其他誤讀','unknown':'不能判斷'})}}

RUBRICS['student']['operation']=choice('判斷學生必須完成的主要操作；看題目所問，不按題材分類。',{
 'word':'解釋某字或詞的語境義','meaning':'理解或轉述整句內容','inference':'推導條件因果或論據關係',
 'effect':'說明手法的具體作用','comparison':'比較兩處內容或結構','recall':'記憶文學常識定義','unknown':'資料不足'})
RUBRICS['review']['set_strength']=choice('評三個錯項的吸引點，不評難度。常見錯詞義也可有效。需有局部依據且能排除。',{
 'all':'三錯項均有合理吸引點','some':'部分錯項有用其餘薄弱','none':'三錯項都明顯無效','unknown':'無法判斷'})
RUBRICS['option']['attraction']=choice('半懂學生可能因局部依據或常見詞義誤選此項嗎？簡單不等於無效。',{
 'plausible':'有具體吸引點','weak':'有關但吸引點薄弱','absurd':'離題荒謬可直接排除','unknown':'無法判斷'})

def evidence_excerpt(q, ev):
    # Remove only exact repetitions; never truncate or paraphrase source evidence.
    texts=[];material=q.get('quote','')
    for e in ev:
        for key in ['anchor','excerpt']:
            value=e['locator'].get(key) or ''
            if value and value not in material and not any(value in t for t in texts):
                texts=[t for t in texts if t not in value]
                texts.append(value)
    return texts

def requests(q, ev):
    student=student_state(q)
    yield 'student',student,RUBRICS['student']
    if any(e['status']!='resolved' for e in ev): return
    contextual={**student,'source':evidence_excerpt(q,ev)}
    review={**contextual,'key':q['answerId'],'explanation':q.get('explanation','')}
    yield 'review',review,RUBRICS['review']
    for c in q['choices']:
        # All options reviewed, not just wrong options; bank status is never evidence.
        state={**contextual,'selected':c['id'],'rationale':c.get('explanation','')}
        yield 'option:'+c['id'],state,RUBRICS['option']

def families(qs):
    parent={q['id']:q['id'] for q in qs}
    def find(x):
        while parent[x]!=x:
            parent[x]=parent[parent[x]];x=parent[x]
        return x
    buckets=defaultdict(list)
    for q in qs:
        buckets[('memory',q['memoryId'])].append(q['id'])
        buckets[('source',tuple(q['essayIds']),q['source']['blockPath'])].append(q['id'])
        norm=lambda s:re.sub(r'\W','',s)
        buckets[('face',tuple(q['essayIds']),norm(q['stem']),norm(q.get('quote','')))].append(q['id'])
    for ids in buckets.values():
        for qid in ids[1:]: parent[find(qid)]=find(ids[0])
    return {qid:find(qid) for qid in parent}

def select_sample(qs,family):
    audit=read(ROOT/'docs/planning-evidence/2026-09-22/explanation-audit.json')
    old=[s.get('id',s.get('question',{}).get('id')) for s in audit['samples']]
    byid={q['id']:q for q in qs}
    tune=[i for i in old if i in byid][:20]
    excluded={family[i] for i in old if i in byid}
    counts=Counter()
    selected=[]
    for _ in range(40):
        candidates=[q for q in qs if family[q['id']] not in excluded]
        def weight(q):
            tags=q['essayIds'] or ['appendix']
            return (sum(5/(1+counts['essay:'+e]) for e in tags)+3/(1+counts['ability:'+q['ability']])+
                    sum(2/(1+counts['flag:'+f]) for f in rule_flags(q)),digest(q['id']))
        q=max(candidates,key=weight)
        selected.append(q['id']);excluded.add(family[q['id']])
        for e in q['essayIds'] or ['appendix']:counts['essay:'+e]+=1
        counts['ability:'+q['ability']]+=1
        for f in rule_flags(q):counts['flag:'+f]+=1
    assert len(tune)==20 and len(selected)==40
    assert not {family[x] for x in tune}&{family[x] for x in selected}
    return {'method':'20 existing authoring samples + 40 deterministic coverage samples; known-source families excluded from holdout',
            'tune':tune,'holdout':selected,'familyById':{i:family[i] for i in tune+selected}}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--run',default='runs/2026-09-23-v2');args=ap.parse_args()
    out=HERE/args.run
    bank=read(BANK);qs=bank['questions']
    assert len({q['id'] for q in qs})==len(qs)
    for q in qs:validate_question(q)
    data=read(ROOT/'web-study/content/sources/student-content.json')
    appendix=read(ROOT/'web-study/content/sources/appendix-content.json')
    fam=families(qs);sample=select_sample(qs,fam)
    frozen={'bankSha256':filehash(BANK),'rubricHash':digest(RUBRICS),'modelRevision':read(DEPLOYMENT/'outputs/laya-deployment/model-manifest.json')['revision'],
            'serverSha256':filehash(SERVER),'sourceHashes':{p:filehash(ROOT/'web-study/content/sources'/p) for p in ['student-content.json','appendix-content.json']},
            'scope':'advisory screening; no automatic approval or live bank mutation', 'sample':sample}
    if (out/'manifest.json').exists() and read(out/'manifest.json')!=frozen:
        raise ValueError('Frozen run differs. Create a new run directory.')
    write(out/'manifest.json',frozen);write(out/'baseline-bank.json',bank);write(out/'rubrics.json',{'version':'2','stages':RUBRICS});write(HERE/'rubrics.json',{'version':'2','stages':RUBRICS})
    records=[];tasks=[]
    for q in qs:
        ev=evidence(q,data,appendix)
        record={'id':q['id'],'version':q['version'],'familyId':fam[q['id']],'question':q,'evidence':ev,'ruleFlags':rule_flags(q),
                'semanticReview':'pending','finalDecision':None,'choiceReviews':[{'id':c['id'],'isKey':c['id']==q['answerId'],'status':'pending'} for c in q['choices']]}
        records.append(record)
        for stage,state,questions in requests(q,ev):
            task={'id':q['id']+'/'+stage,'questionId':q['id'],'questionVersion':q['version'],'stage':stage,'state':state,'questions':questions}
            task['inputHash']=digest({**task,'context':frozen})
            tasks.append(task)
    write(out/'records.json',records);write(out/'tasks.json',tasks)
    write(out/'sample.json',[r for i in sample['tune']+sample['holdout'] for r in records if r['id']==i])
    print(json.dumps({'run':str(out),'questions':len(records),'tasks':len(tasks),'sample':len(sample['tune'])+len(sample['holdout'])},ensure_ascii=False))

if __name__=='__main__':main()
