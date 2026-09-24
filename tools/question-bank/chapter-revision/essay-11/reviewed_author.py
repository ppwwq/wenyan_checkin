from author import *
assert set(SPECS)==set(range(1,63))
def opt(n,changes):
 for c in SPECS[n]['choices']:
  if c['id'] in changes:c['text'],c['explanation']=changes[c['id']]
opt(1,{'c':('暫時沒有任何聲音','空寫清幽空曠，不能界定為此時絕無聲音。')})
opt(3,{'a':('雨來得太遲','晚來秋交代秋晚涼感，不評下雨遲早。')})
opt(5,{'c':('竹葉被風吹響','歸浣女揭示人聲來源，非僅竹葉風聲。')})
opt(11,{'c':('等待開放','歇是花謝，與待開相反。')})
opt(35,{'a':('嗅覺的雨後泥土氣味','雨後可令人聯想氣味，但本句秋意直接落在涼感。')})
for s in SPECS.values():
 for k in ['explanation','summary','stem']:
  if k in s:
   for a,b in {'写':'寫','处':'處','独':'獨','人数':'人數','须':'須','没有':'沒有'}.items():s[k]=s[k].replace(a,b)
 for c in s['choices']:
  for k in ['text','explanation']:
   for a,b in {'写':'寫','处':'處','独':'獨','人数':'人數','须':'須','没有':'沒有'}.items():c[k]=c[k].replace(a,b)
