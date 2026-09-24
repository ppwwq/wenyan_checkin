"""Freeze author inputs without touching the release bank."""
import json, hashlib, re
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,v):
 p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def digest(v): return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def resolve(path,data,appendix):
 ix=list(map(int,re.findall(r'\[(\d+)\]',path)))
 if path.startswith('$appendix.self_check'):return appendix['self_check'][ix[0]]
 if path.startswith('$appendix'):return appendix['sections'][ix[0]]['rows'][ix[1]]
 a,b,c,*rest=ix;o=data[a]['pages'][b]['blocks'][c]
 for i in rest:o=o[i]
 return o
def main():
 bankpath=ROOT/'web-study/content/bank.json';bank=read(bankpath)
 baseline=HERE/'baseline-bank.json'
 if baseline.exists():
  assert read(baseline)==bank,'Baseline already frozen; do not overwrite'
 else:baseline.write_bytes(bankpath.read_bytes())
 ref=read(ROOT/'tools/question-bank/past-paper-review/laya/runs/2026-09-23-v2/reference-set.json')['records']
 refs={r['id']:r for r in ref}
 old=read(ROOT/'docs/planning-evidence/2026-09-22/explanation-audit.json')['samples']
 pilot=set(refs)|{s['question']['id'] for s in old};assert len(pilot)==64
 data=read(ROOT/'web-study/content/sources/student-content.json');app=read(ROOT/'web-study/content/sources/appendix-content.json')
 groups={k:[] for k in ['a','b','c']}
 for q in bank['questions']:
  n=int(q['essayIds'][0][-2:]) if q['essayIds'] else 99
  group='a' if n<=5 else 'b' if n<=11 else 'c'
  sources=[q['source']]+q['source'].get('relatedSources',[])+q.get('supportingSources',[])
  evidence=[{'source':s,'block':resolve(s['blockPath'],data,app)} for s in sources]
  groups[group].append({'question':q,'baseQuestionHash':digest(q),'pilot':q['id'] in pilot,'evidence':evidence,'priorAuthorReview':refs.get(q['id'])})
 for k,items in groups.items():
  write(HERE/f'inputs/{k}-all.json',items)
  write(HERE/f'inputs/{k}-pilot.json',[x for x in items if x['pilot']])
 write(HERE/'manifest.json',{'baselineSha256':hashlib.sha256(baseline.read_bytes()).hexdigest(),'pilotIds':sorted(pilot),'groups':{k:{'all':len(v),'pilot':sum(x['pilot'] for x in v)} for k,v in groups.items()},'bankVersion':bank['version']})
 print(json.dumps(read(HERE/'manifest.json')['groups']))
if __name__=='__main__':main()
