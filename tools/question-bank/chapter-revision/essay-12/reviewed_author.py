from author import *
assert set(SPECS)==set(range(1,81))
def opt(n,changes):
 for c in SPECS[n]['choices']:
  if c['id'] in changes:c['text'],c['explanation']=changes[c['id']]
opt(14,{'a':('一直，強調陪伴恆常','徒限制只能隨身，非表示時間恆常。'),'b':('偶爾，表示跟隨不定','徒非頻率，重只能跟隨不能相知。'),'d':('獨自，表示影也沒有同伴','徒不是說影子的孤身處境，而是其回應能力有限。')})
opt(17,{'b':('整齊迴旋','零亂重紛亂搖曳，非整齊規律。'),'d':('逐漸消失','本句寫伴舞時影的變化，非已醉散消失。')})
opt(22,{'d':('高聳','高聳只說高度形態，不如遙遠準確說雲漢距離。')})
for s in SPECS.values():
 for k in ['explanation','summary','stem']:
  if k in s:
   for a,b in {'现实':'現實','说明':'說明','欢':'歡','暂':'暫','贯':'貫'}.items():s[k]=s[k].replace(a,b)
 for c in s['choices']:
  for k in ['text','explanation']:
   for a,b in {'现实':'現實','说明':'說明','欢':'歡','暂':'暫','贯':'貫'}.items():c[k]=c[k].replace(a,b)
