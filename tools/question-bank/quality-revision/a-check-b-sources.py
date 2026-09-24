import json,re
from pathlib import Path
root=Path(__file__).parent
s=json.loads((root.parents[2]/'web-study/content/sources/student-content.json').read_text('utf-8'))
d=json.loads((root/'drafts/b-batch01.json').read_text('utf-8'))
def get(path):
    o=s
    for key,num in re.findall(r'\.([\w]+)|\[(\d+)\]',path):o=o[key] if key else o[int(num)]
    return o
def flat(x):
    if isinstance(x,list):return '；'.join(flat(v) for v in x)
    if isinstance(x,dict):return '；'.join(flat(v) for v in x.values())
    return str(x)
def norm(x):return re.sub(r'[^\u4e00-\u9fffA-Za-z0-9]','',x)
for n,r in enumerate(d['records']):
    print(n,r['id'])
    for e in r['evidence']:
        actual=flat(get(e['blockPath']))
        if norm(e['quote']) not in norm(actual):print('MISMATCH',e['blockPath'],e['quote'],'ACTUAL',actual)
    print('PRIMARY',flat(get(r['evidence'][0]['blockPath'])))
