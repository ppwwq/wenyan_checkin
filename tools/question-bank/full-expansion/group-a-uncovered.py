import runpy,contextlib,io,json
with contextlib.redirect_stdout(io.StringIO()):a=runpy.run_path('tools/question-bank/full-expansion/group-a-author.py')
D=a['D'];C=a['COVER'];path=a['path']
for e in [2,3,4,5]:
 print('ESSAY',e)
 for p,pg in enumerate(D[e-1]['pages']):
  for k,b in enumerate(pg['blocks']):
   typ=b[0];base=path(e,p,k)
   if typ in ['annot','text','note','band','pp'] and base not in C:print(p,k,json.dumps(b,ensure_ascii=False))
   if typ in ['table','polytable']:
    for r,row in enumerate(b[1][1:],1):
     if base+f'[1][{r}]' not in C:print(p,k,r,json.dumps(row,ensure_ascii=False))
print('TAGS',set(b[0] for e in range(1,5) for p in D[e]['pages'] for b in p['blocks']))
