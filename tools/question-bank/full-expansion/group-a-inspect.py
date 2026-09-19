import pathlib,json
D=json.loads(pathlib.Path('web-study/content/sources/student-content.json').read_text(encoding='utf-8-sig'))
out=[]
for i in [1,2,3,4]:
 e=D[i]; out.append(f'ESSAY {i+1} {e["name"]}')
 for j,p in enumerate(e['pages']):
  if any(b[0]=='annot' for b in p['blocks']): continue
  out.append(f'PAGE {j} {p["title"]}')
  for k,b in enumerate(p['blocks']):
   if b[0] not in ['annot','vocab','head']: out.append(f'BLOCK{k} '+json.dumps(b,ensure_ascii=False))
pathlib.Path('tools/question-bank/full-expansion/group-a-source.md').write_text('\n'.join(out),encoding='utf-8')
