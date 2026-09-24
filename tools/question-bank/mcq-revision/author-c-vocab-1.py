import json,copy
from pathlib import Path
D=Path(__file__).parent
qs=json.loads((D/'c-vocab-input.json').read_text(encoding='utf-8'))[:140]
specs={}
for line in (D/'part-c-vocab-1-specs.txt').read_text(encoding='utf-8').splitlines():
 if not line or line.startswith('#'):continue
 index,reason,*wrong=line.split('|')
 assert len(wrong)==3,index
 specs[int(index)]=(reason,wrong)
out=[];unchanged=[]
for i,old in enumerate(qs):
 if i not in specs:
  unchanged.append(old['id']);continue
 reason,wrong=specs.pop(i);q=copy.deepcopy(old)
 q.update(version=old['version']+1,assessmentType='語境詞義辨析',responseFormat='single-choice',
  revisionReason='以語境相近義項及指涉誤讀替代無關或荒謬錯項；保留來源所載正解。',
  explanation=reason,summary=reason)
 it=iter(wrong)
 for c in q['choices']:
  if c['id']==q['answerId']:c['explanation']=reason
  else:c['text'],c['explanation']=next(it).split('~')
 q['misconception']='；'.join(c['explanation'] for c in q['choices'] if c['id']!=q['answerId'])
 q['review']={**q.get('review',{}),'date':'2026-09-20','method':'context-vocabulary-distractor-review',
   'officialExamQuestion':False,'scope':'依保存原文語境與原詞解審改干擾及辨析，非教師獨立終審或學生難度校準。'}
 assert len({c['text'] for c in q['choices']})==4,q['id']
 out.append(q)
assert not specs,specs.keys()
(D/'part-c-vocab-1.json').write_text(json.dumps({'questions':out,'reviewedIds':[q['id'] for q in qs],
 'unchangedIds':unchanged,'notes':{'status':'complete','scope':'c-vocab-input.json indices 0–139; reviewed vocabulary only',
 'reviewed':len(qs),'revised':len(out),'retained':len(unchanged)}},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print({'reviewed':len(qs),'revised':len(out),'retained':len(unchanged)})
