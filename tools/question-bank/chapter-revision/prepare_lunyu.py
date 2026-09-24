"""Freeze the manually authored whole-chapter revision and current primary-source evidence."""
import re, sys
from pypdf import PdfReader
from author_lunyu_options import BASE, QS, SPECS, HERE
from apply_chapter import digest, apply_chapter
import copy, hashlib, json
sys.stdout.reconfigure(encoding='utf-8')
ROOT=HERE.parents[2]; CONTENT=ROOT/'web-study/content'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def dump(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def norm(s):return re.sub(r'[^\u3400-\u9fffA-Za-z]','',re.sub('<[^>]*>','',s))
data=read(CONTENT/'sources/student-content.json')
appendix=read(CONTENT/'sources/appendix-content.json')
pdf=CONTENT/'sources/revision-book.pdf'; pdfsha=sha(pdf)
reader=PdfReader(pdf);pages={};errors=[];evidence={}
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
  page=source['pdfPage']; pages.setdefault(page,None)
  if pages[page] is None:pages[page]=reader.pages[page-1].extract_text()
  block=resolve(source['blockPath']);anchor=source.get('anchor',source.get('quote',q['quote']))
  found=bool(norm(anchor)) and norm(anchor) in norm(pages[page])
  matched=not source.get('sha256') or source['sha256']==pdfsha
  printed=source.get('printedPage')
  page_match=(str(printed)==pages[page].strip().splitlines()[-1].strip()) if isinstance(printed,int) else (not printed or norm(str(printed)) in norm(pages[page]))
  if not (found and matched and page_match):errors.append({'id':q['id'],'blockPath':source['blockPath'],'anchorInFreshPdf':found,'sourceHashMatches':matched,'printedPageMatches':page_match})
  checks.append({'source':source,'resolvedBlock':block,'anchorInFreshPdf':found,'sourceHashMatches':matched,'printedPageMatches':page_match})
 evidence[q['id']]=checks
assert not errors,errors
dump(HERE/'source-evidence.json',{'pdfSha256':pdfsha,'sourceJsonSha256':sha(CONTENT/'sources/student-content.json'),'freshPdfPages':sorted(pages),'errors':errors,'questions':evidence,'scope':'來源定位、原文錨點和版本核對；這些自動檢查不代替內容審題。'})
records=[]
for n,q in enumerate(QS,1):
 patch=copy.deepcopy(SPECS[n])
 # A stale misconception field could still show the old option rationale in the app.
 patch['misconception']='；'.join(c['explanation'].rstrip('。') for c in patch['choices'] if c['id']!=q['answerId'])+'。'
 records.append({'id':q['id'],'ordinal':n,'baseQuestionHash':digest(q),'patch':patch,'objective':patch.get('stem',q['stem']),'reviewDisposition':'ready-for-trial','optionDecision':'revised' if any(a['text']!=b['text'] for a,b in zip(q['choices'],patch['choices'])) else 'retained-after-author-check'})
dump(HERE/'lunyu-revisions.json',{'baselineVersion':BASE['version'],'date':'2026-09-23','author':'Codex chapter author','reviewMethod':'source-review-and-author-self-check','records':records})
dump(HERE/'manifest.json',{'version':'2026.09.23.7','essayId':'essay-01','baselineSha256':sha(HERE/'baseline-bank.json'),'pack':'lunyu-revisions.json','packSha256':sha(HERE/'lunyu-revisions.json'),'evidence':'source-evidence.json','evidenceSha256':sha(HERE/'source-evidence.json')})
questions,summary=apply_chapter(BASE['questions'])
dump(HERE/'summary.json',summary)
print(json.dumps(summary,ensure_ascii=False,indent=2))
