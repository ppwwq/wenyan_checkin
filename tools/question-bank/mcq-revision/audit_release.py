"""Compare released content with the baseline; metrics are risk probes, not psychometrics."""
import collections,hashlib,json,re,sys
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
D=Path(__file__).parent
ROOT=D.parents[2]
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
old=read(D/'baseline-bank.json');new=read(ROOT/'web-study/content/bank.json')
old_by={q['id']:q for q in old['questions']}
def metrics(qs):
    longest=[];cloze=[];editor=[];same=collections.defaultdict(list);judgments=collections.Counter()
    for q in qs:
        ans=next(c for c in q['choices'] if c['id']==q['answerId'])
        if '甲：' in q['stem'] and '乙：' in q['stem']:
            judgments[ans['text']]+=1
        if all(len(ans['text'])>len(c['text']) for c in q['choices'] if c['id']!=q['answerId']):longest.append(q['id'])
        if re.search(r'［\s*］|\[\s*\]|（\s*）',q['stem']):cloze.append(q['id'])
        if '復習書' in q['stem'] or '本書' in q['stem']:editor.append(q['id'])
        key=json.dumps([q['essayIds'],q['quote'],q['stem'],sorted(c['text'] for c in q['choices'])],ensure_ascii=False)
        same[key].append(q['id'])
    return {'questions':len(qs),'uniquelyLongestCorrect':len(longest),'blankInStem':len(cloze),
      'editorBookInStem':len(editor),'exactDuplicateGroups':[v for v in same.values() if len(v)>1],
      'longestAnswerIds':longest,'blankIds':cloze,'editorStemIds':editor,'pairedJudgmentAnswerCounts':dict(judgments)}
body=lambda b:[q for q in b['questions'] if q['essayIds']]
errors=[]
if set(old_by)!={q['id'] for q in new['questions']}:errors.append('Question identity set changed')
changes=[]
for q in new['questions']:
    p=old_by[q['id']]
    if not q['essayIds'] and q!=p:errors.append('Appendix changed '+q['id'])
    if q==p:continue
    changes.append(q['id'])
    for field in ('memoryId','source','answerId','essayIds'):
        if q[field]!=p[field]:errors.append('Changed identity/source '+q['id']+'/'+field)
    if q['version']!=p['version']+1:errors.append('Incorrect version '+q['id'])
    if q.get('responseFormat')!='single-choice':errors.append('Missing MC mode '+q['id'])
    if '自擬片段' in q['stem']+q['quote'] or '自擬梗概' in q['stem']+q['quote']:
        errors.append('Unseen synthetic passage '+q['id'])
result={'version':new['version'],'status':'PASS' if not errors else 'FAIL','revised':len(changes),
 'retainedDesignatedText':len(body(new))-len(changes),'unchangedAppendix':len(new['questions'])-len(body(new)),
 'before':metrics(body(old)),'after':metrics(body(new)),'changedIds':changes,'errors':errors,
 'bankSha256':hashlib.sha256((ROOT/'web-study/content/bank.json').read_bytes()).hexdigest(),
 'scope':'全量結構及版本核查，加上形式風險探針；並非逐題教師終審、真題考法全覆蓋、學生難度或鑑別度實測。'}
(D/'release-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:result[k] for k in ['version','status','revised','retainedDesignatedText','unchangedAppendix','errors']},ensure_ascii=False))
print(json.dumps({stage:{k:v for k,v in result[stage].items() if not k.endswith('Ids')} for stage in ('before','after')},ensure_ascii=False))
raise SystemExit(bool(errors))
