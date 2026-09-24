"""Freeze a manually authored next chapter; does not generate teaching prose."""
import argparse,copy,hashlib,json,re,sys
from pathlib import Path
from pypdf import PdfReader
from apply_chapter import HERE,read,digest,apply_chapter
p=argparse.ArgumentParser();p.add_argument('chapter');p.add_argument('version');args=p.parse_args()
directory=(HERE/args.chapter).resolve();assert directory.is_relative_to(HERE) and directory!=HERE
sys.path.insert(0,str(directory))
from reviewed_author import BASE,QS,SPECS
sys.stdout.reconfigure(encoding='utf-8')
ROOT=HERE.parents[2];CONTENT=ROOT/'web-study/content'
def dump(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def norm(s):return re.sub(r'[^\u3400-\u9fffA-Za-z]','',re.sub('<[^>]*>','',s))
data=read(CONTENT/'sources/student-content.json');appendix=read(CONTENT/'sources/appendix-content.json')
pdf=CONTENT/'sources/revision-book.pdf';pdfsha=sha(pdf);reader=PdfReader(pdf);pages={};errors=[];evidence={}
def resolve(path):
 ix=list(map(int,re.findall(r'\[(\d+)\]',path)))
 if path.startswith('$appendix.self_check'):return appendix['self_check'][ix[0]]
 if path.startswith('$appendix'):return appendix['sections'][ix[0]]['rows'][ix[1]]
 ci,pi,bi,*tail=ix;block=data[ci]['pages'][pi]['blocks'][bi]
 for index in tail:block=block[index]
 return block
for q in QS:
 checks=[]
 for source in [q['source']]+q['source'].get('relatedSources',[])+q.get('supportingSources',[]):
  page=source['pdfPage']
  if page not in pages:pages[page]=reader.pages[page-1].extract_text()
  block=resolve(source['blockPath']);anchor=source.get('anchor',source.get('quote',q['quote']))
  found=bool(norm(anchor)) and norm(anchor) in norm(pages[page]);matched=not source.get('sha256') or source['sha256']==pdfsha
  printed=source.get('printedPage');page_match=str(printed)==pages[page].strip().splitlines()[-1].strip() if isinstance(printed,int) else not printed or norm(str(printed)) in norm(pages[page])
  if not(found and matched and page_match):errors.append({'id':q['id'],'source':source})
  checks.append({'source':source,'resolvedBlock':block,'anchorInFreshPdf':found,'sourceHashMatches':matched,'printedPageMatches':page_match})
 evidence[q['id']]=checks
assert not errors,errors
dump(directory/'source-evidence.json',{'pdfSha256':pdfsha,'sourceJsonSha256':sha(CONTENT/'sources/student-content.json'),'freshPdfPages':sorted(pages),'errors':errors,'questions':evidence,'scope':'來源定位、原文錨點和版本核對；自動檢查不代替內容審題。'})
records=[]
for n,q in enumerate(QS,1):
 patch=copy.deepcopy(SPECS[n]);patch['misconception']='；'.join(c['explanation'].rstrip('。') for c in patch['choices'] if c['id']!=q['answerId'])+'。'
 records.append({'id':q['id'],'ordinal':n,'baseQuestionHash':digest(q),'patch':patch,'objective':patch.get('stem',q['stem']),'reviewDisposition':'ready-for-trial','optionDecision':'revised' if any(a['text']!=b['text'] for a,b in zip(q['choices'],patch['choices'])) else 'retained-after-author-check'})
dump(directory/'revisions.json',{'baselineVersion':BASE['version'],'date':'2026-09-23','author':'Codex chapter author','reviewMethod':'source-review-and-author-self-check','records':records})
dump(directory/'manifest.json',{'version':args.version,'essayId':args.chapter,'baselineSha256':sha(directory/'baseline-bank.json'),'pack':'revisions.json','packSha256':sha(directory/'revisions.json'),'evidence':'source-evidence.json','evidenceSha256':sha(directory/'source-evidence.json'),'evidenceReferenceBase':'chapter-revision/'+args.chapter})
questions,summary=apply_chapter(BASE['questions'],directory);dump(directory/'summary.json',summary)
print(json.dumps(summary,ensure_ascii=False,indent=2))
