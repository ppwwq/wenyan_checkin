from author import *
assert set(SPECS)==set(range(1,74))
def opt(n,changes):
 for c in SPECS[n]['choices']:
  if c['id'] in changes:c['text'],c['explanation']=changes[c['id']]
opt(5,{'d':('不會','不會是判斷未來，莫在此是對外敵禁戒。')})
opt(12,{'b':('登高臨近敵境','本詩由樓望景，沒有登赴敵境行動。'),'d':('登高憑弔古人','尾聯有用典，登臨本身仍是登高遠望，不能以後文局部限定詞義。')})
opt(18,{'c':('已經','終强调長存信念，非只報告此刻完成。'),'d':('偶爾','偶爾間歇不合始終不改的持續。')})
opt(21,{'b':('又新建','還重仍有，原文未交代新建。'),'c':('即將有','還說當下仍存，不是未來才有。')})
for s in SPECS.values():
 for k in ['explanation','summary','stem']:
  if k in s:
   for a,b in {'写':'寫','绝':'絕','当':'當','盗':'盜','强调':'強調','凄':'淒','没有':'沒有','壮':'壯'}.items():s[k]=s[k].replace(a,b)
 for c in s['choices']:
  for k in ['text','explanation']:
   for a,b in {'写':'寫','绝':'絕','当':'當','盗':'盜','强调':'強調','凄':'淒','没有':'沒有','壮':'壯'}.items():c[k]=c[k].replace(a,b)
