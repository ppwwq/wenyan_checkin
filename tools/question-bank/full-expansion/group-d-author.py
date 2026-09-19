"""Appendix concept practice from every supplied appendix row; authored distractors."""
import json,re,hashlib,sys,unicodedata
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[3]
DIR=Path(__file__).parent
source=json.loads((ROOT/'web-study/content/sources/appendix-content.json').read_text(encoding='utf-8-sig'))
pages=json.loads((ROOT/'tools/question-bank/pdf-pages.json').read_text(encoding='utf-8'))
def norm(s):return ''.join(c for c in re.sub('<[^>]*>','',s) if not c.isspace() and unicodedata.category(c)[0] not in 'PZS')
normalized=[norm(p) for p in pages]
specs={}
for line in (DIR/'appendix-distractors.tsv').read_text(encoding='utf-8').splitlines():
 key,*items=line.split('|');assert len(items)==3
 assert key not in specs
 specs[key]=[item.split('^') for item in items]
questions=[];coverage=[]
for si,section in enumerate(source['sections']):
 for ri,row in enumerate(section['rows']):
  key=f'{si}.{ri}';wrong=specs.pop(key)
  correct=row[1].split('\n')[0]
  anchor=correct
  candidates=[i for i,p in enumerate(normalized) if i>=241 and norm(anchor) in p]
  if len(candidates)>1:candidates=[i for i in candidates if norm(section['title']) in normalized[i]]
  assert len(candidates)==1,(key,anchor,candidates)
  page=candidates[0]+1
  footer=re.findall(r'附錄\s*(\d+)',pages[page-1]);assert footer,(key,page)
  ident=f'full-d-{si:02d}-{ri:02d}'
  answer_index=int(hashlib.sha256(ident.encode()).hexdigest()[:8],16)%4
  choices=[{'text':a,'explanation':b} for a,b in wrong]
  choices.insert(answer_index,{'text':correct,'explanation':row[1]+' '+row[2]})
  choices=[dict(c,id='abcd'[i]) for i,c in enumerate(choices)]
  path=f'$appendix.sections[{si}].rows[{ri}]'
  questions.append({'id':ident,'version':1,'memoryId':'m-'+ident,'essayIds':[], 'ability':'technique', 'quote':row[0], 'target':'', 'stem':f'關於「{row[0]}」，哪項理解最準確？', 'choices':choices,'answerId':'abcd'[answer_index], 'explanation':row[1]+'\n例子或作用：'+row[2], 'source':{'title':'文言詩詞・十六篇復習書｜手法附錄','section':section['title'],'jsonFile':'appendix-content.json','blockPath':path,'anchor':anchor,'pdfPage':page,'printedPage':'附錄'+footer[-1],'pdfUrl':'/content/sources/revision-book.pdf','version':'2026-09-14'},'status':'reviewed','active':True,'summary':correct,'misconception':wrong[0][1],'difficulty':'foundation','tags':['appendix','concept-definition'],'review':{'method':'source-aligned-agent-review','date':'2026-09-19','officialExamQuestion':False,'scope':'依所供附錄逐列核對概念與物理頁；干擾項針對易混條件。定義辨析，不冒稱原文應用題或教師審核。','evidence':row}})
  coverage.append({'sourcePath':path,'questionIds':[ident],'status':'covered','reason':'完整概念定義及其條件辨析；原有篇章應用題另保留。'})
assert not specs,specs.keys()
# The final six checks summarize concepts already tested; keep exact mappings.
for i,(label,_) in enumerate(source['self_check']):
 refs=[[('15','5'),('17','4')],[('15','0'),('15','1')],[('8','4'),('7','0')],[('12','1'),('12','2')],[('11','0'),('11','3'),('17','2'),('17','4')],[('13','6'),('13','3'),('16','5')]][i]
 coverage.append({'sourcePath':f'$appendix.self_check[{i}]','questionIds':[f'full-d-{int(a):02d}-{int(b):02d}' for a,b in refs],'status':'covered','reason':'末頁自查重述已出題的具體條件，對應原題而不另造重複記憶單元。'})
(DIR/'group-d.json').write_text(json.dumps({'questions':questions,'coverage':coverage},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'appendixQuestions':len(questions),'sourceRows':len(coverage),'allMapped':True},ensure_ascii=False))
