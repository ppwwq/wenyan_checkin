from author import *
assert set(SPECS)==set(range(1,87))
def opt(n,changes):
 for c in SPECS[n]['choices']:
  if c['id'] in changes:c['text'],c['explanation']=changes[c['id']]
opt(12,{'a':('供遊人觀燈的彩樓','雕車是交通工具，非固定觀燈建築。'),'b':('懸燈遊河的畫船','車與寶馬相配，非水上畫船。'),'d':('供燈舞巡行的彩臺','原句寫富貴遊人的車馬，非表演舞臺。')})
opt(20,{'a':('不見來源的燈煙','暗香是女子幽香，不是燈火煙氣。'),'b':('隱在燈下的香粉','詞寫可聞香氣，非具體香粉物件。'),'d':('已漸消失的香氣','幽香可隨人遠去，暗本身不等於香已消失。')})
opt(21,{'b':('回到先前找過的地方','回頭是轉頭望，未說重走路線。'),'c':('回憶昔日相遇的情形','詞正寫當下得見，未標昔日回憶。'),'d':('重新開始一次尋找','此處轉頭得見，非另起一輪尋覓。')})
fix={'盛装':'盛裝','热闹':'熱鬧','多种':'多種','预':'預','圆':'圓','灯':'燈','饰':'飾','關系':'關係','寻觅':'尋覓','寻':'尋','热':'熱','树':'樹','夸':'誇','対象':'對象','驻':'駐','内部':'內部','构':'構','词':'詞','楼':'樓','给':'給','重復':'重複'}
for s in SPECS.values():
 for k in ['explanation','summary','stem']:
  if k in s:
   for a,b in fix.items():s[k]=s[k].replace(a,b)
 for c in s['choices']:
  for k in ['text','explanation']:
   for a,b in fix.items():c[k]=c[k].replace(a,b)
