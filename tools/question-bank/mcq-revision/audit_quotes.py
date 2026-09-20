import html,json,re,sys
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
D=Path(__file__).parent;ROOT=D.parents[2]
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
def norm(s):return re.sub(r'[^\u3400-\u9fff]','',html.unescape(re.sub(r'<[^>]*>','',str(s))))
assert norm('中國 ABC，123')=='中國'
data=read(ROOT/'web-study/content/sources/student-content.json')
texts={f'essay-{i+1:02d}':norm(''.join(str(b[1]) for p in e['pages'] for b in p['blocks'] if b[0]=='annot')) for i,e in enumerate(data)}
assert all(len(t)>20 for t in texts.values())
misses=[];checked=0
names=[entry['file'] for entry in read(D/'release-manifest.json')['packs']] if (D/'release-manifest.json').exists() else ['part-a.json','part-b.json','part-c.json','part-c-lunyu.json','part-c-vocab-1.json','part-c-vocab-tail.json']
for name in names:
 path=D/name
 if not path.exists():continue
 for q in read(path)['questions']:
  if not q['quote'].strip():continue
  text=''.join(texts[e] for e in q['essayIds'])
  # Cross-text excerpts label their source title; labels are not quoted prose.
  visible=re.sub(r'(?m)^《[^》]+》[：:]?','',q['quote'])
  parts=[norm(s) for s in re.split(r'[。；！？\n…]+',visible) if len(norm(s))>3]
  checked+=len(parts)
  missing=[p for p in parts if p not in text]
  if missing:misses.append({'pack':name,'id':q['id'],'unmatched':missing})
report={'checkedQuotedSegments':checked,'unmatched':misses,
 'scope':'只查独立quote内可见引文在指定篇原文的字序；题干引语、意义和来源指涉另由内容審核。'}
(D/'quote-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
