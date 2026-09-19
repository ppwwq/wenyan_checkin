"""Build a fixed, source-aligned bank; no runtime AI or random distractors."""
import hashlib, json, re, shutil
from pathlib import Path
from inspect_sources import SOURCE, ROOT, data, pages

OUT = ROOT / 'web-study/content'
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'sources').mkdir(exist_ok=True)
pdf_name = '文言詩詞_十六篇復習書_附修辭與寫作手法.pdf'
sha = hashlib.sha256((SOURCE / pdf_name).read_bytes()).hexdigest()
clean = lambda s: re.sub(r'[^\u3400-\u9fffA-Za-z]', '', s)
clean_pages = [clean(p) for p in pages]

def locate(chapter, quote, meaning):
    anchor = clean(quote)
    candidates = [i+1 for i,p in enumerate(clean_pages) if anchor in p and clean(meaning) in p and clean(data[chapter]['name']) in p]
    if len(candidates) != 1:
        raise ValueError(('Ambiguous source', chapter, quote, meaning, candidates))
    return candidates[0]

questions = []
for line in (ROOT / 'tools/question-bank/pilot-items.txt').read_text(encoding='utf-8').splitlines():
    if not line or line.startswith('#'): continue
    ci, pi, word, wrong = line.split('|')
    ci, pi = int(ci), int(pi)
    pg = data[ci]['pages'][pi]
    vb = next(k for k,b in enumerate(pg['blocks']) if b[0] == 'vocab')
    entries = pg['blocks'][vb][1]
    vi = next(k for k,e in enumerate(entries) if e[0] == word)
    meaning = entries[vi][1]
    quote = next(b[1] for b in pg['blocks'] if b[0]=='annot')
    pdf_page = locate(ci, quote, meaning)
    qid = f'pilot-{ci+1:02}-{pi:02}-{vi+1:02}'
    options = wrong.split('/')
    assert len(options)==3
    slot = int(hashlib.sha256(qid.encode()).hexdigest()[:8],16)%4
    options.insert(slot, meaning)
    note = next((b[1] for b in pg['blocks'] if b[0]=='note'), '')
    choices = [{'id':chr(97+n),'text':t,'explanation':f'本句「{word}」指「{meaning}」。'+('符合原句語境與書中詞解。' if n==slot else f'「{t}」不符合此處詞義；須連同原句理解，不能套用其他語境。')} for n,t in enumerate(options)]
    source = {'title':pdf_name,'version':'2026-09-14','sha256':sha,'pdfPage':pdf_page,'printedPage':pdf_page-4,'blockPath':f'$[{ci}].pages[{pi}].blocks[{vb}][1][{vi}]','anchor':quote,'excerpt':f'{word}：{meaning}','pdfUrl':'/content/sources/revision-book.pdf'}
    questions.append({'id':qid,'version':1,'memoryId':qid,'essayIds':[f'essay-{ci+1:02}'],'ability':'vocabulary','quote':quote,'target':word,'targetStart':quote.find(word),'stem':f'原句中「{word}」在這裏最準確的意思是甚麼？','choices':choices,'answerId':chr(97+slot),'explanation':f'復習書詞解：「{word}」是「{meaning}」。'+note,'source':source,'status':'reviewed','active':True,'summary':f'{word}：{meaning}','misconception':f'不能把此處「{word}」解成「{wrong.split("/")[0]}」。','review':{'method':'source-aligned-agent-review','date':'2026-09-19','scope':'原句與正解逐題對照提供的復習書；三個干擾項按本句語境編寫並檢查互斥，非官方真題；不代表全書學術終核。','quoteAndMeaningOnPdfPage':True}})

for n, spec in enumerate(json.loads((ROOT/'tools/question-bank/concept-items.json').read_text(encoding='utf-8-sig'))):
    ci,pi,bi=spec['chapter'],spec['page'],spec['block']
    block=data[ci]['pages'][pi]['blocks'][bi]
    assert clean(spec['anchor']) in clean(json.dumps(block,ensure_ascii=False))
    candidates=[i+1 for i,p in enumerate(clean_pages) if clean(spec['anchor']) in p and clean(data[ci]['name']) in p]
    assert len(candidates)==1, (spec['stem'],candidates)
    pdf_page=candidates[0]
    qid=f'concept-{ci+1:02}-{n+1:02}'
    options=spec['wrong'].copy()
    slot=n%4
    options.insert(slot,spec['answer'])
    source={'title':pdf_name,'version':'2026-09-14','sha256':sha,'pdfPage':pdf_page,'printedPage':pdf_page-4,'blockPath':f'$[{ci}].pages[{pi}].blocks[{bi}]','anchor':spec['anchor'],'excerpt':spec['anchor'],'pdfUrl':'/content/sources/revision-book.pdf'}
    questions.append({'id':qid,'version':1,'memoryId':qid,'essayIds':[f'essay-{ci+1:02}'],'ability':spec['ability'],'quote':spec['quote'],'target':'','stem':spec['stem'],'choices':[{'id':chr(97+i),'text':t,'explanation':('正確。' if i==slot else '此說法誤讀了原句。')+spec['answer']} for i,t in enumerate(options)],'answerId':chr(97+slot),'explanation':spec['answer']+' 書中依據：'+spec['anchor'],'source':source,'status':'reviewed','active':True,'summary':spec['answer'],'misconception':spec['wrong'][0],'review':{'method':'source-aligned-agent-review','date':'2026-09-19','scope':'對照書中指定區塊與PDF頁；限制提問角度以免把同時成立的其他手法判錯。','evidence':spec['anchor']}})

# Curated relationships: semantic identity is explicit; same glyph alone never groups items.
def qfind(ci, pi, target):
    return next(q for q in questions if q['essayIds']==[f'essay-{ci+1:02}'] and q['source']['blockPath'].startswith(f'$[{ci}].pages[{pi}].') and q['target']==target)
comparisons=[]
for target, refs, clue in [
    ('歸',[(0,3),(8,5),(10,2)],'分清評價認同、精神歸依與人物移動。'),
    ('事',[(0,3),(0,5)],'看賓語：「斯語」是要實踐的教導，「之」指要侍奉的父母。'),
    ('或',[(8,4),(8,5)],'「而或」說某些時候；「或異」對不同的心態作推測。'),
    ('極',[(8,2),(8,4)],'「南極瀟湘」接地點；「此樂何極」問快樂何有窮盡。'),
]:
    items=[]
    for ci,pi in refs:
        q=qfind(ci,pi,target)
        items.append({'questionId':q['id'],'meaning':next(c['text'] for c in q['choices'] if c['id']==q['answerId']),'clue':clue})
    comparisons.append({'id':f'compare-{len(comparisons)+1}','target':target,'title':f'「{target}」在不同語境中的用法','status':'reviewed','items':items})

for filename in ['expansion-draft.json','expansion-appendix.json','expansion-comparison.json']:
    extra_path=OUT/filename
    if extra_path.exists():
        extra=json.loads(extra_path.read_text(encoding='utf-8-sig'))
        questions.extend(extra if isinstance(extra,list) else extra['questions'])
bank={'version':'2026.09.19.1','title':'中文甲 · 有據練習','notice':'按所附復習書核對的自編練習，非官方真題。已開放題目不等於全書知識點全覆蓋。','essays':[{'id':f'essay-{i+1:02}','title':c['name'],'kind':'prose' if i<10 else 'poem'} for i,c in enumerate(data)],'questions':questions,'comparisons':comparisons}
(OUT/'bank.json').write_text(json.dumps(bank,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
shutil.copyfile(SOURCE/pdf_name,OUT/'sources/revision-book.pdf')
shutil.copyfile(SOURCE/'學生內容.json',OUT/'sources/student-content.json')
shutil.copyfile(SOURCE/'附錄內容.json',OUT/'sources/appendix-content.json')
(OUT/'sources/manifest.json').write_text(json.dumps({'pdf':{'path':'revision-book.pdf','sha256':sha,'pages':260},'json':{'path':'student-content.json','sha256':hashlib.sha256((SOURCE/'學生內容.json').read_bytes()).hexdigest()},'sourceVersion':'2026-09-14','imported':'2026-09-19'},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'questions':len(questions),'essays':len(bank['essays']),'comparisons':len(comparisons)},ensure_ascii=False))
