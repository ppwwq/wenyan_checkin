from author import *
assert set(SPECS)==set(range(1,85))
def opt(n,changes):
 for c in SPECS[n]['choices']:
  if c['id'] in changes:c['text'],c['explanation']=changes[c['id']]
opt(14,{'a':('周瑜麾下的一名將領','周郎是周瑜本人，非其部將。')})
opt(16,{'a':('被江水沖出孔洞','穿空寫向天高峻，非水蝕成洞。'),'c':('橫跨江面的石壁','穿空強調垂直高峻，非橫跨江面的寬度。'),'d':('在霧中時隱時現','句中沒有霧遮景象，重石高插天際。')})
opt(17,{'a':('使人心驚的浪聲','驚濤指波浪本身，可含聲勢但非僅聲音。'),'c':('連綿不斷的細浪','細浪難切拍岸及千堆的強勁氣勢。'),'d':('風平後留下的餘波','驚濤正在洶湧拍岸，非風平後微波。')})
opt(24,{'a':('一位尊貴的客人','此處一尊是酒，並無真人受邀。'),'b':('一次敬酒的禮節','尊指酒器或酒，具體動作由酹表達。'),'c':('一聲恭敬的祝禱','原句有灑酒動作，不是數祝禱聲。')})
fix={'动作':'動作','承载':'承載','从':'從','继续':'繼續','却':'卻','将':'將','横':'橫','击':'擊','颜色':'顏色','贯':'貫','战':'戰','启':'啟','功业':'功業','服务':'服務','承担':'承擔','细':'細','主体':'主體','触':'觸','写':'寫'}
for s in SPECS.values():
 for k in ['explanation','summary','stem']:
  if k in s:
   for a,b in fix.items():s[k]=s[k].replace(a,b)
 for c in s['choices']:
  for k in ['text','explanation']:
   for a,b in fix.items():c[k]=c[k].replace(a,b)
