import hashlib,json,re
from pathlib import Path
R=Path(__file__).parent
inputs={x['question']['id']:x for x in json.loads((R/'inputs/a-pilot.json').read_text(encoding='utf-8-sig'))}
path=R/'drafts/a-pilot.json'
pack=json.loads(path.read_text(encoding='utf-8-sig'))
pages=json.loads((R.parents[2]/'tools/question-bank/pdf-pages.json').read_text(encoding='utf-8-sig'))
def norm(s):return re.sub(r'[^\u3400-\u9fffA-Za-z]','',re.sub('<[^>]*>','',s))
comments={
'pilot-01-01-03':'G1處約、處樂的原句及困苦詞注明確；G2困苦與安樂相對，D受束縛雖可聯想到約束但非此詞解；G3訂約、節省、自由受限各有字面吸引；G4须辨處境與行為，保留基礎題。',
'pilot-01-01-05':'G1安仁利仁同句可對照；G2A成立的是利仁，C混安樂境況，D誤作使動；G3三項分別混動機、條件、受事；G4不能只找安字，需要分清安於仁與安處境。',
'q-e03-exp-007':'G1博學日省與知明行無過完整；G2B倒因果、D刪共同條件、A限縮自省，C完整成立；G3三項有不同近似關係；G4须讀而、則及知行雙成果。',
'full-a-e03-p03-b00-v03':'G1依本書詞解限定妥當，保留焉的異解空間；G2A符本來源，B誤搬山淵位置、C疑問不合陳述、D倒置因果；G3位置、疑問、連接三種功能可辨；G4屬版本詞解鞏固，不稱自由推理。',
'full-a-e04-p01-b00-v11':'G1詞注明示龜通皸；G2B凍裂成立，A疲勞、C粗紋、D僵硬均非裂傷；G3同為手部狀態有比較基礎；G4不能只猜寒冷，B和D都連寒冷仍需辨結果。',
'full-a-e04-p03-b00-v02':'G1本書慮解繫結且大樽為浮具；G2D成立，A取後文憂義、B取今義、C取形近篩選皆不合；G3A與B雖同心理類，具體擔憂／考慮有區分；G4要求特殊詞義，列基礎鞏固。',
'full-a-e05-p03-b00-v00':'G1竊詞注私下謙詞且計欲逃燕；G2D成立，A將計作被偷計策、B將謙語反為確信、C把向王陳述混成事前獲准；G3C較易但指向說話時序錯接，有具體原文反證；G4四項皆盤算方式，無正解長度優勢。',
'full-a-e05-p12-b00-v03':'G1孰通熟仔細有詞注；G2主語大王群臣已定故A誰不合，B熟悉舊例、C立即皆非周詳；G3詢問主語、熟義、情勢推速各異；G4需辨請求語氣及修飾方式。',
'full-a-e05-p22-b00-v00':'G1已明廉頗發言及相如寬待；G2B解本句，稱才、放任和安慰非容讓；G3C與D為寬字可混義，A連將軍才幹但原文排除；G4題幹主客體已消歧，未偷換目標。',
'full-a-e04-p11-b00-c04':'G1退修後已補能不龜手一也明示相同藥效；G2C相同，工作及收益明示不同，季節只明冬戰不能斷同；G3用途、環境、收益為不同維度；G4檢查對比固定條件，不能只見結果。',
'full-a-e05-p28-b00-g47':'G1誰可使、臣願提供完整自薦語境；G2A條件義成立，B確斷、C命令撤人、D推測均失語氣；G3語氣辨析不同；G4不再只給王必無人的短片段。',
'full-a-e02-p00-b05-x000':'G1新稿含生亦我所欲且主來源對齊孟子原文，支持承認生命可欲；G2D保留可欲與不能兼條件，A主動求死、B不取捨、C先保命皆不合；G3三種偏差不同；G4须同時核價值與條件。',
'full-a-e03-p05-b00-x003':'G1來源分述效用、借物、積累恆心專一；G2A能總攝，B取消學習、C切斷後段論證、D把單一方法當全部皆不合；G3局部概念真實而關係錯接；G4按全篇功能作統整，非僅術語辨認。',
'full-c-01-03-01-10':'G1非禮勿視聽言動與不要詞注有據；G2B禁令成立；G3退修後A能力、C過去未做、D不必許可已分開；G4須判禁止而非不能或不必。',
'full-c-01-04-08-80':'G1兩篇成仁取義引文齊；G2B保道德且分用語，C把代價當目的；G3退修後A誤判保命、C以代價當目的、D混同仁義，錯因分開；G4共同點與差異應雙邊核對，不能靠單邊明顯反義。',
'full-c-01-19-02-80':'G1來源保留不違異解，新稿測無爭議的禮與敬；G2B生葬祭及未納仍敬皆合，A漏生且泛化後句、C倒條件、D聲稱互相取消皆不合；G3D相對弱但可診斷把重點差異誤作排斥；G4不強逼不違一解。',
'full-c-01-22-02-02':'G1需改後quote含見志不從與惑而不從師；G2D主體對象俱對，A父子倒置、B師生倒置、C雙方行為義错；G3按兩句行動者有平行比較；G4須讀施受角色，不靠複述單字。',
'full-c-01-23-02-01':'G1需問孝於我和學於余實際語境；G2D向兩位請教者成立，A處所、B比較、C被動均不合問學的主體；G3三種介詞關係互異；G4可由句法排除，屬目標能力不是漏洞。',
'full-c-01-23-02-02':'G1已補問孝與會於此兩個實際來源；G2D向人／在地方成立，A把會改問、B把人當地、C倒問答；G3各有關係誤接；G4新短引文對齊，無需讀無關全篇。',
'full-c-01-23-02-03':'G1萬鍾何加語境支持受益關係；G2D成立，A場所、B提供者、C加數量皆不合受之及何加；G3三種角色／義項錯接不同；G4須連何加而不能只背於在向。',
'full-c-01-28-01-80':'G1兩篇引文及源文比較可據；G2A守道德仍分用詞，B以犧牲作目的、C過讀生命態度、D由本處推所有義項不成立；G3三種誤推具體；G4題幹已去掉價值排序提示，須核同異。',
'full-c-01-28-04-80':'G1肉袒負荊及過則勿憚改有對應；G2最直接要求將焦點限於知錯請罪，義以為質及忠信為泛概括，病無能偏離改過；G3各項皆修身概念需分具體行為；G4不是否定其他德目可能相關。',
'full-c-01-28-06-80':'G1內省不疚與進退憂君民並讀；G2A分道德心安及公共責任，B將公換私、C以出入政事代替道德根據、D互相取消不合；G3兩篇關係須兼核；G4保留相容而非用單一憂字判矛盾。',
'confusable-gui-lunyu-yueyang':'G1依本書解明示認同而不硬壓歸仁異解；G2B符合此詞解及古仁人同道，A地理返回、C返鄉、D君主投奔均非本處；G3含一邊成立的競爭項；G4雙邊詞義與主體必須核對。',
'confusable-gui-lunyu-shanju':'G1本書歸認同及浣女回來有據；G2B成立，A地理移動、C由全詩情意偷換浣女思想、D改浣女為詩人皆不合；G3同字多義和主體互換各異；G4限定本書而保留異解，不憑全詩主旨覆蓋本句。'
}
records=[]
for r in pack['records']:
    q={**inputs[r['id']]['question'],**r['patch']}
    issues=[]
    if r['id']=='full-c-01-03-01-10' and q['choices'][0]['text'].startswith('沒有'):
        issues.append('G3：A與C同為過去未做的否定，請分開錯因。')
    if r['id']=='full-c-01-04-08-80' and '先求生' in q['choices'][3]['text']:
        issues.append('G3：A與D近同把論語讀成先保命，請替換一項。')
    if r['id']=='full-a-e04-p11-b00-c04' and '能不龜手一也' not in q['quote']:
        issues.append('G1：題引漏明示相同藥效的能不龜手一也。')
    if r['id']=='full-a-e02-p00-b05-x000' and '生亦我所欲' not in q['quote']:
        issues.append('G1：題引未提供生命可欲的判斷依據。')
    if q.get('target') and q.get('targetStart') is not None:
        if q['quote'][q['targetStart']:q['targetStart']+len(q['target'])]!=q['target']:
            issues.append('G5：targetStart未對齊target。')
    ss=[q['source']]+q['source'].get('relatedSources',[])+q.get('supportingSources',[])
    for s in ss:
        if norm(s.get('anchor',s.get('quote',''))) not in norm(pages[s['pdfPage']-1]):
            issues.append('G1：PDF頁面不含anchor：'+s['blockPath'])
    notes=comments[r['id']]+' G5：四選項ID與原答案配對，頁面anchor及有target時的定位已程式核對；作者之外的代理交叉審讀，非教師盲審或學生實測。'
    records.append(dict(id=r['id'],verdict='revise' if issues else 'approve',notes=notes,issues=issues))
out=dict(reviewer='author_c',method='cross-agent-source-review',packSha256=hashlib.sha256(path.read_bytes()).hexdigest(),records=records)
(R/'reviews').mkdir(exist_ok=True)
(R/'reviews/a-pilot.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps([r for r in records if r['issues']],ensure_ascii=False))
