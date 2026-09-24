"""Select a bounded next authoring batch; selection is not semantic approval."""
import argparse, json, re
from pathlib import Path
from apply_quality import read
HERE=Path(__file__).resolve().parent
def priority(q):
 wrong=[c for c in q['choices'] if c['id']!=q['answerId']]
 key=next(c for c in q['choices'] if c['id']==q['answerId'])
 flags=[]
 if len({c.get('explanation','') for c in wrong})==1:flags.append('same-wrong-rationale')
 if all(re.search('只有|只能|完全|一定|任何|毫無',c['text']) for c in wrong):flags.append('all-wrong-absolute')
 if any('此項把文意理解為' in c.get('explanation','') for c in wrong):flags.append('echo-rationale')
 if '須核對本句的行動者' in q.get('explanation',''):flags.append('generic-reason')
 if len(key['text'])>max(len(c['text']) for c in wrong):flags.append('key-longest')
 return flags
def main():
 ap=argparse.ArgumentParser();ap.add_argument('group',choices=['a','b','c']);ap.add_argument('batch');ap.add_argument('--size',type=int,default=40);args=ap.parse_args()
 out=HERE/f'inputs/{args.group}-{args.batch}.json'
 if out.exists():raise ValueError('Batch already frozen')
 used=set(read(HERE/'manifest.json')['pilotIds'])
 for p in (HERE/'inputs').glob(f'{args.group}-batch*.json'):
  used.update(r['question']['id'] for r in read(p))
 candidates=[r for r in read(HERE/f'inputs/{args.group}-all.json') if r['question']['id'] not in used]
 for r in candidates:r['ruleSignals']=priority(r['question'])
 candidates.sort(key=lambda r:(-len(r['ruleSignals']),r['question']['essayIds'],r['question']['id']))
 selected=candidates[:args.size]
 out.write_text(json.dumps(selected,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'group':args.group,'batch':args.batch,'selected':len(selected),'remainingUnassigned':len(candidates)-len(selected)}))
if __name__=='__main__':main()
