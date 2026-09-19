import json,pathlib,re,unicodedata,collections
BASE=pathlib.Path('tools/question-bank/full-expansion')
D=json.loads(pathlib.Path('web-study/content/sources/student-content.json').read_text(encoding='utf-8-sig'))
P=json.loads(pathlib.Path('tools/question-bank/pdf-pages.json').read_text(encoding='utf-8-sig'))
BANK=json.loads((BASE/'base-bank.json').read_text(encoding='utf-8'))['questions']
Q=[]; C=[]; V={}; SEM={}; COVER={}
def norm(s): return ''.join(c for c in re.sub('<[^>]*>','',str(s)) if not c.isspace() and not c.isdigit() and unicodedata.category(c)[0] not in 'PZS')
for line in (BASE/'group-a-vocab.txt').read_text(encoding='utf-8-sig').splitlines():
 if not line.strip() or line.startswith('#'): continue
 key,ds=line.split('=',1); V[key]=[tuple(x.split('~',1)) for x in ds.split('/')]; assert len(V[key])==3,key

def path(e,p,k): return f'$[{e-1}].pages[{p}].blocks[{k}]'
def cov(loc,ids,status,reason):
 assert loc not in COVER,('duplicate coverage',loc)
 status={'new':'covered','retained-dispute':'disputed'}.get(status,status)
 row=dict(sourcePath=loc,questionIds=ids,status=status,reason=reason); C.append(row); COVER[loc]=row

def strs(x):
 if isinstance(x,str): return [x]
 if isinstance(x,list): return [s for a in x for s in strs(a)]
 return []

def location(e,p,k,anchor,original=False,row=None):
 b=D[e-1]['pages'][p]['blocks'][k]
 if original:
  hits=[]
  for i,t in enumerate(P):
   if norm(D[e-1]['name'])!=norm(t.splitlines()[0]) or norm(anchor) not in norm(t):continue
   score=30*('原文與語譯' in t)+10*(norm(b[1][:45]) in norm(t))+5*(norm(D[e-1]['pages'][p]['title']) in norm(t))
   hits.append((score,i+1))
  hits.sort(reverse=True); assert hits and hits[0][0]>=30,(e,p,anchor,hits)
  assert len(hits)==1 or hits[0][0]>hits[1][0],('ambiguous',e,p,anchor,hits)
  pg=hits[0][1]
 else:
  parts=strs(b[1][row] if row is not None else b[1]); candidates=[''.join(parts)[:90],anchor]+[s[:min(48,len(s))] for s in parts if len(norm(s))>=4]
  for a in candidates:
   hits=[i+1 for i,t in enumerate(P) if norm(D[e-1]['name'])==norm(t.splitlines()[0]) and norm(a) in norm(t)]
   if hits:
    hits.sort(key=lambda h: (norm(D[e-1]['pages'][p]['title']) not in norm(P[h-1][:200]),h));anchor=a;pg=hits[0];break
  else: raise AssertionError(('analysis location',e,p,k,row,candidates))
 src=dict(title='文言詩詞・十六篇復習書（附修辭與寫作手法）',essayTitle=D[e-1]['name'],section=D[e-1]['pages'][p]['title'],jsonFile='student-content.json',blockPath=path(e,p,k),pdfPage=pg,printedPage=int(re.search(r'(\d+)\s*$',P[pg-1]).group(1)),anchor=anchor,version='2026-09-14',pdfUrl='/content/sources/revision-book.pdf')
 if row is not None:src['row']=row
 return src

def make(e,p,k,suffix,ability,quote,target,stem,correct,wrong,source,reason=None,related=None):
 assert len(wrong)==3 and all(len(x)==2 for x in wrong),(target,wrong)
 assert len({correct,*[x[0] for x in wrong]})==4,(target,correct,wrong)
 identifier=f'full-a-e{e:02d}-p{p:02d}-b{k:02d}-{suffix}'
 reason=reason or f'依本書此句詞解，「{target}」是「{correct}」；須連同「{quote}」的語境理解。'
 opts=[(correct,reason)]+wrong; shift=len(Q)%4;opts=opts[shift:]+opts[:shift]
 review=dict(method='source-aligned-agent-review',reviewedAt='2026-09-19',reviewer='代理依指定復習書逐項覆核；非教師審核、非官方真題',sourceEvidence={'blockPath':source['blockPath'],'text':D[e-1]['pages'][p]['blocks'][k],'meaning':correct},checks=['source-block-verified','actual-PDF-anchor-verified','four-distinct-options','single-keyed-answer','context-specific-distractor-review'])
 q=dict(id=identifier,version=1,memoryId='m-'+identifier,essayIds=[f'essay-{e:02d}'],ability=ability,quote=quote,target=target,stem=stem,choices=[dict(id=chr(97+i),text=t,explanation=r) for i,(t,r) in enumerate(opts)],answerId=next(chr(97+i) for i,(t,_) in enumerate(opts) if t==correct),explanation=reason,source=source,status='reviewed',active=True,summary=correct,misconception=wrong[0][1],review=review,tags=['full-source-expansion'],difficulty='foundation')
 if related:q['source']['relatedSources']=related
 Q.append(q);return identifier

def wrong_for(w,m):
 specific=[v for key,v in V.items() if key.startswith(w+'[') and key[len(w)+1:-1] in m]
 if specific:return specific[0]
 assert w in V,('missing distractors',w,m)
 return V[w]

def original(e,p):return next((k,b) for k,b in enumerate(D[e-1]['pages'][p]['blocks']) if b[0]=='annot')
def snippet(b,w,m):
 rows=b[3] if len(b)>3 else []
 hits=[r for r in rows if r.get('word')==w and (r.get('meaning')==m or not r.get('meaning'))]
 pos=hits[0]['spans'][0][0] if hits else b[1].index(w)
 start=max(0,pos-12);end=min(len(b[1]),pos+len(w)+12)
 return b[1][start:end]

for e in [2,3,4,5]:
 for p,pg in enumerate(D[e-1]['pages']):
  for k,b in enumerate(pg['blocks']):
   if b[0]!='vocab':continue
   ak,ab=original(e,p)
   for r,v in enumerate(b[1]):
    w,m=v[:2];loc=path(e,p,k)+f'[1][{r}]';key=(e,w,m)
    if '另有' in m or '另' in m and '解' in m:
     cov(loc,[],'retained-dispute',f'詞解本身明列異解：{m}；保留閱讀，不設唯一判分。');continue
    if key in SEM:
     cov(loc,SEM[key],'covered',f'核對同篇此處「{w}」仍為「{m}」，與已列同義用例共用記憶單元；不是僅按字形合併。');continue
    existing=[q for q in BANK if q['essayIds']==[f'essay-{e:02d}'] and q['ability']=='vocabulary' and q['target']==w and any(c['id']==q['answerId'] and c['text']==m for c in q['choices'])]
    if existing:
     ids=[existing[0]['id']]; SEM[key]=ids;cov(loc,ids,'covered','已有相同篇章、相同語境義項的審核題；保留既有ID與memoryId。');continue
    quote=snippet(ab,w,m);src=location(e,p,ak,quote,True)
    identifier=make(e,p,ak,f'v{r:02d}','vocabulary',quote,w,f'此句「{w}」的意思是甚麼？',m,wrong_for(w,m),src)
    SEM[key]=[identifier];cov(loc,[identifier],'new','逐義手擬同類干擾項並核對原句；PDF原句位置已驗。')
print('vocab',len(Q),'coverage',len(C))
# Further authored grammar/translation/concept definitions are appended below.
for line in (BASE/'group-a-translations.txt').read_text(encoding='utf-8-sig').splitlines():
 if not line.strip() or line.startswith('#'):continue
 es,ps,correct,ds=line.split('|');e,p=int(es),int(ps); k,b=original(e,p);wrong=[tuple(x.split('~',1)) for x in ds.split('/')]
 src=location(e,p,k,b[1][:45],True)
 ident=make(e,p,k,'translation','meaning',b[1],'段意','哪項最準確理解這段原文？',correct,wrong,src,reason=correct+' 三個干擾項分別改錯條件、人物或文意；對照原文關鍵語核實。')
 cov(path(e,p,k),[ident],'new','逐原文塊補段譯理解題；原句與答案分離，三項均為本段具體誤讀。')
 # The source translation is covered by the paragraph question; notes are audited below separately.
 for tk,tb in enumerate(D[e-1]['pages'][p]['blocks']):
  if tb[0]=='text': cov(path(e,p,tk),[ident],'covered','本塊為上述原文的語譯，已由對應段譯理解題覆蓋。')
print('with translations',len(Q),len(C))
CONCEPT_IDS={}
for line in (BASE/'group-a-concepts.txt').read_text(encoding='utf-8-sig').splitlines():
 if not line.strip() or line.startswith('#'):continue
 es,ps,ks,rs,ops,quote,target,stem,correct,ds=line.split('|');e,p,k,r,op=map(int,[es,ps,ks,rs,ops]);ak,ab=original(e,op)
 assert quote in ab[1],(e,op,quote)
 src=location(e,p,k,correct[:35],row=None if r<0 else r)
 orig=location(e,op,ak,quote,True)
 ident=make(e,p,k,f'c{r:02d}' if r>=0 else 'concept','technique' if any(s in D[e-1]['pages'][p]['title'] for s in ['手法','修辭','語言','論證','喻例']) else 'theme',quote,target,stem,correct,[tuple(x.split('~',1)) for x in ds.split('/')],src,reason=correct+' 具體證據見原句及本書對應分析，不能把另一成立的分析角度一概判錯。',related=[orig])
 loc=path(e,p,k)+(f'[1][{r}]' if r>=0 else '');cov(loc,[ident],'new','逐分析行編寫限定角度理解題，原文quote與含答案分析anchor分開。');CONCEPT_IDS[(e,p,k,r)]=ident
print('with concepts',len(Q),len(C))
# Explicit semantic aliases: each cell refers to a word/sense checked against this row.
ALIASES={
(2,9,1):{5:'與@給予',6:'與@通歟'},
(2,9,2):{2:'兼',3:'舍',5:'苟得',6:'惡',7:'患',8:'辟',9:'如使',10:'莫',14:'由是',16:'是心',18:'非獨',19:'勿喪',20:'耳',21:'簞',23:'豆',24:'羹',25:'弗',26:'嘑',27:'爾',28:'與@給予',30:'蹴',32:'不屑'},
(2,10,0):{1:'萬鍾',2:'辯',5:'加',8:'得',9:'與@通歟',10:'鄉',11:'已'},
(3,9,1):{3:'生',5:'焉@於此',6:'焉@於此',7:'焉@句末',9:'利足'},
(3,9,2):{2:'已',3:'藍',5:'中',6:'中',8:'輮',9:'挺',10:'然',12:'雖+有+槁+暴',14:'金@刀劍',15:'就',16:'礪',18:'博學',20:'參省',23:'知',26:'過',27:'嘗',28:'須臾',29:'跂',31:'招',32:'疾',33:'彰',34:'假',35:'輿',36:'舟楫'},
(3,10,0):{1:'利足',2:'致',3:'水',4:'絕',5:'生',8:'淵',11:'神明',13:'跬步',14:'無以',15:'騏驥',16:'駑馬',17:'十駕',19:'舍',20:'鍥',21:'鏤',23:'螾',24:'爪牙',28:'埃土',29:'黃泉',30:'跪',31:'螯',32:'蛇蟺',33:'寄託',34:'一@專一',35:'躁'},
(4,9,1):{1:'樹',3:'辟'},
(4,9,2):{1:'貽',4:'實+五石',6:'自舉',10:'呺然',11:'掊',13:'固',14:'拙',17:'龜',24:'鬻',26:'說',27:'難',29:'將',30:'將',31:'裂地',33:'一',37:'大樽'},
(4,10,0):{1:'本',2:'擁腫',3:'中',5:'規矩',6:'塗',8:'顧',9:'去',11:'卑',14:'敖',16:'跳梁',17:'辟',18:'機辟',19:'罔罟',20:'斄牛',21:'執',24:'無何有之鄉',25:'廣莫',26:'彷徨',29:'夭',30:'斤斧',31:'安'},
(5,28,0):{1:'負@使承擔',2:'負@依仗',3:'負@違背',4:'負@辜負',6:'徒',14:'幸@受寵愛',15:'幸@僥倖',16:'奏',20:'因',21:'固',22:'固',29:'顧@回頭',30:'顧@只是',45:'見'},
}
# Remove a mistaken alias that would confuse winning a battle with leading it.
ALIASES[(4,9,2)].pop(30)
LEXICAL_TABLES=list(ALIASES)+[(5,29,0)]
def resolve_sem(e,descriptor):
 result=[]
 for bit in descriptor.split('+'):
  w,_,m=bit.partition('@'); hits=[ids for (ee,ww,mm),ids in SEM.items() if ee==e and ww==w and (not m or m in mm)]
  assert len(hits)==1,(e,descriptor,hits);result+=hits[0]
 return list(dict.fromkeys(result))
for (e,p,k),mapping in ALIASES.items():
 for r,desc in mapping.items():
  cov(path(e,p,k)+f'[1][{r}]',resolve_sem(e,desc),'covered',f'已逐句比對此表列義項與「{desc}」的詞解題；相同語義或所列詞組分項復用，不另造重複題。')
GRAMMAR_IDS={}
for line in (BASE/'group-a-grammar.txt').read_text(encoding='utf-8-sig').splitlines():
 if not line.strip() or line.startswith('#'):continue
 es,ps,ks,rs,ops,quote,target,correct,ds=line.split('|');e,p,k,r,op=map(int,[es,ps,ks,rs,ops]);ak,ab=original(e,op)
 assert quote in ab[1],(e,op,quote)
 src=location(e,p,k,correct,row=r);related=[location(e,op,ak,quote,True)]
 ident=make(e,p,k,f'g{r:02d}','vocabulary',quote,target,f'「{quote}」中，{target}的意思或用法是甚麼？',correct,[tuple(x.split('~',1)) for x in ds.split('/')],src,related=related)
 loc=path(e,p,k)+f'[1][{r}]';cov(loc,[ident],'new','此為annot詞表以外的義項或句法，單獨核對詞性、指代或關係；未借其他條目隨機填選項。');GRAMMAR_IDS[(e,p,k,r)]=ident
# Explicit duplicate references and interpretation boundaries.
for e,p,k,r,other in [(2,9,2,4,(2,9,1,9)),(2,9,2,13,(2,9,1,1)),(2,9,2,17,(2,9,1,7)),(2,10,0,4,(2,9,1,10)),(2,10,0,12,(2,9,1,8)),(3,9,2,17,(3,9,1,8)),(4,9,2,3,(4,9,1,2)),(5,28,0,37,(5,28,0,36)),(5,28,0,38,(5,28,0,36))]:
 ids=[GRAMMAR_IDS[other]]
 if (e,p,k,r)==(2,9,2,4):ids+=resolve_sem(2,'甚')+[GRAMMAR_IDS[(2,9,2,1)]]
 if (e,p,k,r)==(4,9,2,3):ids+=resolve_sem(4,'樹')
 cov(path(e,p,k)+f'[1][{r}]',ids,'covered','本行相同用法已由明確語法題覆蓋；相異義项保留分別題號。')
for e,p,k,r,reason in [(2,9,1,2,'「鄉為身死而不受」所連對象在pages[12]明列食物／萬鍾異讀，整句保留兩解，不強判唯一語譯。'),(2,10,0,7,'同篇pages[12]明列妻妾侍奉自己／供養妻妾兩解。'),(4,9,2,9,'本行明列平淺不容物／太大無處安置兩解。'),(4,9,2,18,'annot詞解另列絖為絲絮／棉絮，本表只列絲絮，不以省略另一說強判。'),(4,9,2,36,'annot釋慮為綴結繫結，本表又寫考慮繫着，保留表述差異；已審字面題不被默改。')]:
 cov(path(e,p,k)+f'[1][{r}]',[],'retained-dispute',reason)
cov(path(4,9,2)+'[1][38]',resolve_sem(4,'蓬之心')+[CONCEPT_IDS[(4,11,0,5)]],'covered','蓬心兩種形象聯想共同指閉塞；只判共同語義及引申界線，不強判單一物象解釋。')
print('with grammar',len(Q),len(C))

for r,desc in {4:'患+竊',6:'束+肉袒',11:'奉+完',16:'倨+急+睨',17:'辭謝+案',20:'舍+衣+懷',21:'徑道+間',35:'殊甚+不肖',37:'駑+獨',38:'先+後+私讎',39:'寬'}.items():
 ids=resolve_sem(5,desc)
 if r in [20,21]:ids+=[COVER[path(5,10,0)]['questionIds'][0]]
 cov(path(5,29,0)+f'[1][{r}]',ids,'covered','本行各詞有分別的同義語境詞解題；組合列出各題ID，不以一題籠統代替整行。')
# Additional manually authored questions can share a source block; every one has a distinct focus.
EXTRA_IDS=collections.defaultdict(list)
for index,line in enumerate((BASE/'group-a-extra.txt').read_text(encoding='utf-8-sig').splitlines()):
 if not line.strip() or line.startswith('#'):continue
 es,ps,ks,rs,ops,quote,target,stem,correct,ds=line.split('|');e,p,k,r,op=map(int,[es,ps,ks,rs,ops]);ak,ab=original(e,op)
 assert quote in ab[1],('extra quote',e,op,quote)
 src=location(e,p,k,correct,row=None if r<0 else r)
 ident=make(e,p,k,f'x{index:03d}','vocabulary' if p in [29,30] else 'technique' if p in [26,27] else 'meaning',quote,target,stem,correct,[tuple(x.split('~',1)) for x in ds.split('/')],src,reason=correct+'；本題限定此原句及提問角度，其他選項改錯了具體關係。',related=[location(e,op,ak,quote,True)])
 loc=path(e,p,k)+(f'[1][{r}]' if r>=0 else '')
 if loc in COVER:COVER[loc]['questionIds'].append(ident)
 else:cov(loc,[ident],'new','按此塊內不同知識點逐一補題；語境、動作施受及修辭角度分開核對。')
 EXTRA_IDS[(e,p,k,r)].append(ident)
print('with extras',len(Q),len(C))
# Audited multiple-word rows: include each independent sense, not just the new term.
for r,desc in {3:'遺+易',5:'亡+走',9:'曲',10:'均',12:'指示+卻',13:'瑕',14:'驩',15:'嚴',18:'度+特',22:'約束+一介',23:'孰',24:'卒',25:'拔',26:'訣',27:'酣+鼓',28:'刃+靡+不懌',29:'竟',31:'右+素',32:'宣言',33:'已而',34:'親戚',36:'孰與'}.items():
 COVER[path(5,29,0)+f'[1][{r}]']['questionIds']+=resolve_sem(5,desc)
COVER[path(5,29,0)+'[1][30]']['questionIds']+=COVER[path(5,18,0)]['questionIds']

def ids_for(e,*targets):
 out=[]
 for t in targets:
  hits=[q['id'] for q in Q+BANK if q['essayIds']==[f'essay-{e:02d}'] and q['target']==t]
  assert hits,(e,t);out+=hits
 return list(dict.fromkeys(out))
def ci(e,p,k,*rows):return [CONCEPT_IDS[(e,p,k,r)] for r in rows]
def tr(e,*ps):return [COVER[path(e,p,0)]['questionIds'][0] for p in ps]
def cover_more(e,p,k,ids,reason,row=None):
 loc=path(e,p,k)+(f'[1][{row}]' if row is not None else '')
 if loc in COVER:
  COVER[loc]['questionIds']=list(dict.fromkeys(COVER[loc]['questionIds']+ids));COVER[loc]['reason']+=' '+reason
 else:cov(loc,list(dict.fromkeys(ids)),'covered',reason)
R='本塊重述已考的具體知識；逐分句核對後映射以下題號，未另造重複題。'
# 魚我所欲也: explicit overview, notes and summary links.
for p,k,ids in [
(0,1,ids_for(2,'取捨條件','是心','本心失守')),
(0,3,ci(2,6,0,1,2,3,4,5)),
(0,7,ci(2,6,0,1)+ids_for(2,'取捨條件')),
(2,4,ids_for(2,'取捨條件','是心')+ci(2,6,0,1)),
(4,4,ci(2,7,1,1)+ids_for(2,'助人與取利')),
(5,0,ids_for(2,'取捨條件','是心','本心失守')+ci(2,6,0,2)),
(5,1,ids_for(2,'是心','本心失守')),
(13,0,ci(2,6,0,1,2,3,4,5))]:cover_more(2,p,k,ids,R+(' 出處屬背景，未設背誦篇名的小題。' if (p,k)==(0,7) else ''))
cover_more(2,7,1,ids_for(2,'鄉／今'),R,3)
for r,ids in {1:ci(2,6,0,1),2:ci(2,6,0,2,3,4),3:ci(2,6,0,5)+ids_for(2,'鄉／今')}.items():cover_more(2,13,1,ids,R,r)
cov(path(2,8,1),[],'excluded','本塊明標《公孫丑上》及韓愈的延伸聯繫，屬篇外背景而非本篇論證步驟；不在本篇四選一中冒充課文原句。')
cov(path(2,12,0),ids_for(2,'鄉／今'),'retained-dispute','明列妻妾之奉與鄉為身死而不受的兩解，不強判單一語譯；共同的今昔失義由所列題覆蓋。')
# 勸學: each example retained, reflection and moral learning distinguished.
for p,k,ids in [
(0,1,ids_for(3,'中心與結構','學習方法關係','善假於物')),
(0,3,ids_for(3,'中心與結構')),
(0,5,ci(3,7,0,2)+ids_for(3,'博學日省')),
(1,4,ci(3,6,0,1,2,3)+ids_for(3,'博學日省')),
(2,4,ci(3,6,0,4,5,6,7,8)+ids_for(3,'善假於物')),
(4,4,ci(3,6,0,9)+ci(3,7,0,1,2,3,4)),
(5,1,ci(3,6,0,4)+tr(3,2)),
(5,2,ids_for(3,'善假於物','聖心')+tr(3,2,3)),
(8,1,ids_for(3,'積土／積水／積善')+ci(3,6,0,1)+ci(3,7,0,2)),
(8,2,ci(3,6,0,1,2,3,9)+ids_for(3,'類比與比喻')),
(12,0,ids_for(3,'中心與結構','學習方法關係'))]:cover_more(3,p,k,ids,R+(' 六跪只依課文處理，非生物分類測驗。' if (p,k)==(4,4) else ''))
cov(path(3,0,7),[],'excluded','作者思想背景：偽的人為義並非此節錄原文用字；保留閱讀說明，不把篇外術語混作本篇詞義題。')
for r,ids in {1:ci(3,6,0,1,2,3)+ids_for(3,'博學日省'),2:ci(3,6,0,5,6,7,8)+ids_for(3,'善假於物'),3:ci(3,6,0,9)+ci(3,7,0,1,2,3,4)+ids_for(3,'學習方法關係')}.items():cover_more(3,12,1,ids,R,r)
# 逍遙遊: explicit two-round links, no unilateral resolution of 蓬/瓠落 variants.
for p,k,ids in [
(0,1,ids_for(4,'兩輪論辯')+ci(4,6,0,2,4)),
(0,3,tr(4,1,2,3,4,5)),
(3,4,ids_for(4,'所用之異')+ci(4,6,0,2)),
(5,4,tr(4,4,5)+ci(4,6,0,4)),
(6,1,ci(4,6,0,1,2,3,4)+ids_for(4,'兩輪論辯')),
(7,1,tr(4,4,5)+ids_for(4,'若垂天之雲','無用')),
(8,1,ci(4,11,0,5,8)+ids_for(4,'人物觀點','無用')),
(11,1,ci(4,11,0,1,2,3,4,6)+ids_for(4,'兩輪論辯')),
(14,0,ids_for(4,'兩輪論辯'))]:cover_more(4,p,k,ids,R)
cov(path(4,0,7),[],'excluded','節錄範圍及人物解讀邊界的閱讀提醒，不是可由這幾句判定惠莊全部歷史思想的知識題。')
for r,ids in {1:ci(4,6,0,2)+ids_for(4,'所用之異'),2:tr(4,4,5)+ids_for(4,'若垂天之雲'),3:ci(4,6,0,4)+ids_for(4,'無用')}.items():cover_more(4,14,1,ids,R,r)
# 廉頗藺相如: overview and every note mapped by its actual event.
for p,k,ids in [
(0,1,ids_for(5,'先國後私')+ci(5,25,4,3)+ci(5,25,1,2)),
(0,3,ci(5,23,1,1,2,3)+ids_for(5,'人物起點的伏筆')),
(0,5,ci(5,25,4,2,3)),
(0,7,ids_for(5,'動作描寫','語言描寫','整體敘事')+ci(5,26,0,7)),
(1,4,ids_for(5,'人物起點的伏筆')),
(5,4,tr(5,3,4)+ci(5,24,0,1)),
(10,4,ci(5,24,0,2,3)+tr(5,9,10)),
(13,4,tr(5,11,12)+ci(5,24,0,4)),
(14,4,tr(5,14)),
(18,4,ci(5,25,1,1,2,3)),
(22,4,ci(5,25,4,2)+ids_for(5,'先國後私')),
(23,0,ci(5,25,1,1,2)+ci(5,25,4,2,3)+ids_for(5,'先國後私')),
(24,1,tr(5,10,13)+ci(5,24,0,3)),
(25,2,tr(5,18)+ci(5,25,1,3)),
(32,0,ci(5,23,1,1,2,3)+ids_for(5,'先國後私'))]:cover_more(5,p,k,ids,R+(' 《史記》體例屬出處背景；已對人物塑造部分逐項列題。' if (p,k)==(0,7) else ''))
for r,ids in {1:ci(5,24,0,1,2,3,4),2:ci(5,25,1,1,2,3),3:ci(5,25,4,1,2,3)}.items():cover_more(5,32,1,ids,R,r)
# Enrich multi-point analysis rows with their individually supported examples.
for r,ps in {1:[3,4,5,6,9,10,12,17],2:[5,7,8,11,12,17],3:[5,8,17,21],4:[19,20,21,22],5:[1],6:[15],7:[19,21,22],8:[6,8,9,16,17],9:[13],10:[2,15],11:[4,5,13,15,19]}.items():
 cover_more(5,26,0,tr(5,*ps), '此人物行羅列多件事，追加每件事的段意题以保留各證據，不能把單一引文當作全行所有性格證據。',r)
cover_more(5,23,2,ci(5,23,1,2)+tr(5,14),'並覆蓋升遷引發衝突及先後不等於報復因果。')
cover_more(5,26,1,tr(5,6,15,19,22)+ids_for(5,'三十日不還'),'補充秦王傳璧動作、趙王畏秦心理、廉頗預案與請罪語言等各分句實例。')
cover_more(5,27,2,ids_for(5,'兩虎')+ids_for(5,'獨','先國後私'),'另列兩虎借喻、獨的反問與公私對照。')
cover_more(5,30,0,resolve_sem(5,'見')+[GRAMMAR_IDS[(5,28,0,33)]],'並列見的被動及為趙王的替給義，保持分類不同。')
cover_more(5,30,1,[GRAMMAR_IDS[(5,28,0,31)]],'另列為趙將的擔任義，不能誤判為被動。')
cover_more(5,30,2,resolve_sem(5,'衣+懷+刃+負@使承擔+完')+[GRAMMAR_IDS[(5,28,0,26)],GRAMMAR_IDS[(5,28,0,27)],GRAMMAR_IDS[(5,29,0,12)]],'逐個活用例句分別映射：名詞動用、使動、意動、處所狀語均保留相應題。')
# Exam index pages are metadata, not unverified official questions.
for e,p in [(2,11),(3,11),(4,13),(5,31)]:
 for k,b in enumerate(D[e-1]['pages'][p]['blocks']):
  if b[0]=='text':cov(path(e,p,k),[],'excluded','歷年考查索引的使用說明，不屬正文可判分知識；不可把本地索引改稱官方原題。')
  if b[0]=='table':
   for r,row in enumerate(b[1][1:],1):cov(path(e,p,k)+f'[1][{r}]',[],'excluded',f'本行是{row[0]}年考查方向索引（{row[1]}），不是題目或答案本體；相應詞解、論證、句法已按本書正文逐項另有coverage。')
for c in C:c['questionIds']=list(dict.fromkeys(c['questionIds']))
# Emit only owned artifacts; the parent merges the bank after review.
required=[]
for e in [2,3,4,5]:
 for p,pg in enumerate(D[e-1]['pages']):
  for k,b in enumerate(pg['blocks']):
   if b[0] in ['annot','text','note','band','pp']:required.append(path(e,p,k))
   elif b[0] in ['table','polytable','vocab']:
    start=0 if b[0]=='vocab' else 1
    required += [path(e,p,k)+f'[1][{r}]' for r in range(start,len(b[1]))]
assert set(required)==set(COVER),('coverage mismatch',set(required)-set(COVER),set(COVER)-set(required))
known={q['id'] for q in BANK+Q}
assert len({q['id'] for q in Q})==len(Q)
for c in C:
 assert all(i in known for i in c['questionIds']),c
 assert c['questionIds'] or c['status'] in ['excluded','disputed'],c
for q in Q:
 for s in [q['source']]+q['source'].get('relatedSources',[]):
  assert norm(s['anchor']) in norm(P[s['pdfPage']-1]),q['id']
 assert len(q['choices'])==4 and len(set(c['text'] for c in q['choices']))==4,q['id']
 assert sum(c['id']==q['answerId'] for c in q['choices'])==1,q['id']
output={'questions':Q,'coverage':C}
(BASE/'group-a.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'questions':len(Q),'coverage':len(C),'status':dict(collections.Counter(c['status'] for c in C))},ensure_ascii=False))
