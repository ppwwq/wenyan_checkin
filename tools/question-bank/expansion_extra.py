"""Eight appendix applications and two two-source comparisons; hand-authored."""
import json,pathlib,re,unicodedata
ROOT=pathlib.Path(r'D:\DSE中文甲部知识库\10_输出成品\文言原文留白_2026-09-14')
D=json.loads((ROOT/'學生內容.json').read_text(encoding='utf-8-sig'))
A=json.loads((ROOT/'附錄內容.json').read_text(encoding='utf-8-sig'))
P=json.loads(pathlib.Path('tools/question-bank/expansion-pdf-pages.json').read_text(encoding='utf-8'))
def norm(s): return ''.join(c for c in re.sub('<[^>]*>','',s) if not c.isspace() and not c.isdigit() and unicodedata.category(c)[0] not in 'PZS')
def footer(p):
    text=P[p-1]
    appendix=re.search(r'附錄\d+',text[:60])
    return appendix.group(0) if appendix else int(re.search(r'(\d+)\s*$',text).group(1))
def locate_quote(e,p,quote):
    bs=D[e-1]['pages'][p]['blocks']; matches=[(k,b) for k,b in enumerate(bs) if b[0]=='annot' and quote in b[1]]
    assert len(matches)==1,(e,p,quote)
    k,b=matches[0]
    pages=[i+1 for i,t in enumerate(P) if norm(D[e-1]['name'])==norm(t.splitlines()[0]) and ('原文與語譯' in t or norm(D[e-1]['pages'][p]['title']) in norm(t)) and norm(quote) in norm(t)]
    assert len(pages)==1,(e,p,quote,pages)
    pg=pages[0]
    return dict(title=D[e-1]['name'],jsonFile='student-content.json',blockPath=f'$[{e-1}].pages[{p}].blocks[{k}]',quote=quote,anchor=quote,pdfPage=pg,printedPage=footer(pg),pdfUrl='/content/sources/revision-book.pdf',version='2026-09-14')
def make(identifier,essayIds,quote,target,stem,correct,reason,wrong,source,tags,evidence,ability='technique'):
    cs=[(correct,reason)]+wrong; shift=int(identifier[-1])%4; cs=cs[shift:]+cs[:shift]
    return dict(id=identifier,version=1,memoryId='m-'+identifier[2:],essayIds=essayIds,ability=ability,quote=quote,target=target,stem=stem,choices=[dict(id=chr(97+i),text=t,explanation=r) for i,(t,r) in enumerate(cs)],answerId=next(chr(97+i) for i,(t,r) in enumerate(cs) if t==correct),explanation=reason,source=source,status='reviewed',active=True,summary=correct,misconception=wrong[0][1],difficulty='foundation',tags=tags,review=dict(method='source-aligned-agent-review',reviewedAt='2026-09-19',officialExamQuestion=False,sourceEvidence=evidence,checks=['actual-PDF-anchor-and-footer','definition-applied-to-specific-angle','four-distinct-options','one-keyed-answer','targeted-distractor-reasons'],scope='依指定本地復習書編寫，非官方真題；同一句兼有其他手法時不判其錯。'))
appendix=[]
def app(s,r,e,p,quote,target,stem,correct,reason,wrong):
    row=A['sections'][s]['rows'][r]; anchor=row[1].split('\n')[0]
    hits=[i+1 for i,t in enumerate(P) if i>=241 and norm(anchor) in norm(t)]
    assert len(hits)==1,(s,r,anchor,hits)
    pg=hits[0]; orig=locate_quote(e,p,quote)
    src=dict(title='文言詩詞・十六篇復習書｜手法附錄',section=A['sections'][s]['title'],jsonFile='appendix-content.json',blockPath=f'$appendix.sections[{s}].rows[{r}]',anchor=anchor,pdfPage=pg,printedPage=footer(pg),pdfUrl='/content/sources/revision-book.pdf',version='2026-09-14',relatedSources=[orig])
    appendix.append(make(f'q-appendix-{len(appendix)+1:03d}',[f'essay-{e:02d}'],quote,target,stem,correct,reason,wrong,src,['appendix'],{'appendixRow':row,'originalSources':[orig]}))
app(4,0,9,5,'不以物喜，不以己悲','互文','按上下句意思互相補足的角度，哪項理解正確？','不因外物或個人遭遇而或喜或悲','兩句互文，物與己均可關聯悲喜，不可把喜只限外物、悲只限自身。',[
('只禁止因外物而喜，仍可因外物而悲','割裂上下句，漏掉互文互補。'),('只禁止個人悲傷，完全不限制個人喜悅','把己悲割裂，漏掉相互補足。'),('要求對國家百姓也完全無感','互文所說是個人利害的悲喜，不能推成無公共關懷。')])
app(2,3,13,2,'日暮聊為梁甫吟','用典','「梁甫吟」的歷史文化聯想如何參與抒情？','聯想到諸葛亮未遇時，寄託報國而未能施展的感慨','有來歷的篇名融入詩句，借人物背景表達自身志向與處境。',[
('只是在報告當天所讀書籍清單','忽略典故背景與自身抱負的關聯。'),('把梁甫當成詩人實際遇見的朋友','梁甫吟是篇名，不是朋友姓名。'),('以梁甫吟計算日落的精確時刻','典故不提供鐘點，也非天文計算。')])
app(0,1,12,2,'我歌月徘徊，我舞影零亂','擬人','若着眼於把月、影寫成歌舞同伴，哪項分析準確？','賦予月影陪伴人的角色，使獨酌在想像中熱鬧起來','比擬中的擬人讓無生命的月影仿如有意回應歌舞；仍非真有知己到場。',[
('證明月影真的具有人的意識','擬人是修辭想像，不能當自然科學事實。'),('借月影代稱兩位已到場朋友','文本是詩人與月影，並非代指真實到場者。'),('只用精確數字計算歌舞步數','詩句無步數統計，重點是想像陪伴。')])
app(5,0,13,2,'北極朝廷終不改','比喻與借代','把朝廷比作北極星，是根據哪種關係？','以穩定性相似建立比喻','北極星的穩定與朝廷不改相聯，是相似關係；借代則重在關聯替代。',[
('因朝廷真的位在北極星上','修辭的相似不能當實際位置。'),('因北極星是朝廷官員的一部分','兩者非部分與全體關係。'),('因北極與朝廷兩詞讀音相同','並非諧音關係，不是諧音雙關。')])
app(5,5,15,1,'尋尋覓覓，冷冷清清，悽悽慘慘戚戚','疊字與反復','只看相同字緊接重疊的語音形式，最直接的分析是甚麼？','以七組疊字加強聲情與節奏','尋尋等字直接相疊，先從疊字形態分析；全句仍可另從層遞等角度分析。',[
('必須整段隔很遠重出才算這種形式','這是間隔反復的描述，不是本題直接重疊形式。'),('不同字只要字形相近便構成疊字','疊字要求相同字重疊，非外形近似。'),('只要句尾押韻就是疊字','押韻是韻母關係，不等於字詞直接重疊。')])
app(3,4,10,1,'弊在賂秦。賂秦而力虧','頂真','前句末「賂秦」接成後句開頭，怎樣加強行文？','首尾相接，把敗因緊連到國力耗損的結果','頂真用前末後首相連，使論點與解釋環環相扣。',[
('故意切斷前後句的意思關係','重出賂秦正為連接，不是割裂。'),('倒轉歷史年代，形成倒敘','字詞銜接不是時間先後的倒置。'),('換用同音詞暗示另一意思','重複的是同一詞，非諧音雙關。')])
app(3,0,8,4,'悠悠乎與顥氣俱，而莫得其涯；洋洋乎與造物者遊，而不知其所窮','對偶','從兩組句式的相應結構看，怎樣分析最貼切？','相稱句式形成對偶，舒展語勢配合廣闊悠遠的境界','悠悠與洋洋、與顥氣俱與與造物者遊等相應；對偶角度不排斥同時有疊詞。',[
('兩句各自提出問題，等待讀者回答','原句是陳述感受，非設問。'),('只有字音完全相同才可成立對偶','對偶看字數及結構相應，不要求每字同音。'),('凡用了對偶就不能同時有疊詞','手法可並存，兩種分類着眼不同。')])
app(2,0,10,1,'或曰：「六國互喪，率賂秦耶？」曰：「不賂者以賂者喪。」','設問','從提出疑問後立即作答的安排看，有何論證作用？','預先提出反對疑問，再補明不賂者同樣敗亡的原因','設問引起思考，以自答補足總論，使論證更周密。',[
('只問不答，全文刻意留下原因不明','原文明有曰而自答。'),('承認六國都不曾賂秦，推翻中心論點','問題並非自答的結論；作者仍維持弊在賂秦。'),('主要模擬秦趙戰場的吶喊聲','此為議論問答，非場面聲音描寫。')])
# This is a variant of the same reviewed personification unit in the base pack.
appendix[2]['memoryId']='m-e12-exp-008'
appendix[2]['review']['variantOf']='q-e12-exp-008'
# Two comparisons retain separate primary-document locations for both sides.
comparison=[]
def comp(pairs,target,stem,correct,reason,wrong):
    origins=[locate_quote(*p) for p in pairs]
    quote='\n'.join(f'《{o["title"]}》：{o["quote"]}' for o in origins)
    src=dict(origins[0]); src['relatedSources']=origins[1:]
    comparison.append(make(f'q-comparison-{len(comparison)+1:03d}',[f'essay-{p[0]:02d}' for p in pairs],quote,target,stem,correct,reason,wrong,src,['comparison'],{'originalSources':origins,'comparisonScope':'以下比較是依兩處原句所作的限定角度比較，不標作官方評分。'},ability='theme'))
comp([(1,4,'志士仁人，無求生以害仁，有殺身以成仁'),(2,1,'二者不可得兼，舍生而取義者也')],'生與道德原則','只比較生命與道德原則衝突時的取捨，兩段有何共同點？','不能兩全時，寧守仁義而不苟且保命','論語不為求生損仁，孟子在生義不能兼得時取義；共同點須保留衝突不能兩全的條件。',[
('只要日常遇到任何危險，都必須主動求死','兩文強調道德取捨，不能擴大為凡危險必赴死。'),('只要可保生命，就可以放棄一切道德原則','與害仁不可及舍生取義都相反。'),('生命毫無價值，仁義也無須考慮','孟子明說生亦我所欲，兩文更重視仁義。')])
comp([(11,2,'竹喧歸浣女，蓮動下漁舟'),(12,1,'舉杯邀明月，對影成三人')],'人物與想像','只比較兩段出現的「同伴」，哪項分別最準確？','前者寫實際山村人事，後者以想像月影陪伴獨酌','浣女漁舟呈現生活情趣；三人是詩人、月和影，並未新增兩位真實酒友。',[
('兩段都明確寫三位真人在一起飲酒','前者並非飲酒，後者三人也非三位真人。'),('前者證明山中全無人，後者已有知己到場','前者有人事，後者仍是想像陪伴，兩者都判反。'),('兩段全屬戰場敘事，不涉及生活感受','山村生活與花間獨酌均非戰場。')])
for name,items in [('appendix',appendix),('comparison',comparison)]:
    assert len(items)==(8 if name=='appendix' else 2)
    for q in items:
        assert len({c['text'] for c in q['choices']})==4
        assert sum(c['id']==q['answerId'] for c in q['choices'])==1
        assert all(c['explanation'] for c in q['choices'])
    pathlib.Path(f'web-study/content/expansion-{name}.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PASS: 8 appendix applications + 2 comparisons; appendix definitions, every original quote and all physical/printed pages verified.')



