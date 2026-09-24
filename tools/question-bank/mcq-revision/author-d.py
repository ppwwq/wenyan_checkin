"""Apply individually authored appendix MC tasks; source definitions remain unchanged."""
import json,copy
from pathlib import Path
D=Path(__file__).parent
base=json.loads((D/'baseline-bank.json').read_text(encoding='utf-8-sig'))
specs={}
for line in (D/'part-d-specs.txt').read_text(encoding='utf-8').splitlines():
    if not line or line.startswith('#'):continue
    key,material,stem,correct,*tail=line.split('|')
    assert len(tail)==4,(key,len(tail))
    reason,*wrong=tail
    specs['full-d-'+ '-'.join(f'{int(n):02d}' for n in key.split('.'))]=(material,stem,correct,reason,wrong)
out=[]
for old in base['questions']:
    if old['essayIds']:continue
    q=copy.deepcopy(old)
    material,stem,correct,reason,wrong=specs.pop(q['id'])
    q.update(quote=material,stem=stem,target='',version=old['version']+1,
        summary=reason,explanation=reason,
        assessmentType='情境與證據辨識',responseFormat='single-choice',
        revisionReason='以具體材料或概念邊界作四選一判斷；相鄰概念作干擾，移除長度及絕對化提示。',
        tags=['appendix','mcq-context-application'],difficulty='contextual')
    q.pop('targetStart',None)
    choices=[]
    it=iter(wrong)
    for c in old['choices']:
        if c['id']==q['answerId']:text,explanation=correct,reason
        else:text,explanation=next(it).split('~')
        choices.append(dict(id=c['id'],text=text,explanation=explanation))
    q['choices']=choices
    q['misconception']='；'.join(c['explanation'] for c in choices if c['id']!=q['answerId'])
    q['review']={**q.get('review',{}),'date':'2026-09-20','method':'source-concept-aligned-mcq-rewrite',
      'officialExamQuestion':False,'scope':'依附錄概念重設材料辨識；自擬情境不是來源原話或官方真題；未經學生校準。'}
    assert len({c['text'] for c in choices})==4,q['id']
    out.append(q)
assert not specs,specs.keys()
(D/'part-d.json').write_text(json.dumps(dict(questions=out,reviewedIds=[q['id'] for q in out],unchangedIds=[],notes='151道附錄選擇題逐條另擬情境/邊界判斷；原概念及來源保存。'),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Authored appendix MC revisions:',len(out))
