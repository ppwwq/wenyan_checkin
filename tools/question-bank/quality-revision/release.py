"""Freeze only independently reviewed packs, then check their merged source locators."""
import argparse, functools, hashlib, json, re
from pathlib import Path
from apply_quality import apply_quality, digest, read
from prepare import resolve
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
@functools.lru_cache(maxsize=1)
def source_pdf_sha():return sha(ROOT/'web-study/content/sources/revision-book.pdf')
def norm(s):return re.sub(r'[^\u3400-\u9fffA-Za-z]','',re.sub('<[^>]*>','',str(s)))
def verify_sources(q,data,appendix,pages):
 sources=[q['source']]+q['source'].get('relatedSources',[])+q.get('supportingSources',[])
 for s in sources:
  resolve(s['blockPath'],data,appendix)
  page=s['pdfPage']
  if not isinstance(page,int) or not 1<=page<=len(pages):raise ValueError('Invalid source page '+q['id'])
  if s.get('sha256') and s['sha256']!=source_pdf_sha():raise ValueError('Source PDF SHA drift: '+q['id'])
  anchor=s.get('anchor',s.get('quote',''))
  if not anchor or norm(anchor) not in norm(pages[page-1]):raise ValueError('Anchor absent from PDF: '+q['id']+' '+str(page)+' '+anchor[:35])
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--version',default='2026.09.23.1');args=ap.parse_args()
 live=ROOT/'web-study/content/bank.json'
 known={sha(HERE/'baseline-bank.json')}
 receipt=HERE/'last-build.json'
 if receipt.exists():known.add(read(receipt)['bankSha256'])
 if sha(live) not in known:raise ValueError('Live bank changed outside this revision; preserve it and reconcile before release')
 entries=[];ids=[]
 for p in sorted((HERE/'drafts').glob('*.json')):
  review=HERE/'reviews'/p.name
  if not review.exists():continue
  pack=read(p);r=read(review)
  if r.get('packSha256')!=sha(p):raise ValueError('Stale review: '+p.name)
  entries.append({'file':p.relative_to(HERE).as_posix(),'sha256':sha(p),'review':review.relative_to(HERE).as_posix(),'reviewSha256':sha(review)})
  ids.extend(x['id'] for x in pack['records'])
 if not entries:raise ValueError('No reviewed packs to release')
 pilot=set(read(HERE/'manifest.json')['pilotIds'])
 if not pilot<=set(ids):raise ValueError('Initial 64-question review is incomplete')
 manifest={'version':args.version,'baselineSha256':sha(HERE/'baseline-bank.json'),'packs':entries,'reviewedIds':ids,'method':'author -> another agent source/option review -> root merge -> deterministic verification','teacherValidation':'not-run','studentTrial':'not-run'}
 reuse_entries=[]
 for p in sorted((HERE/'reuse-packs').glob('*.json')):
  audit=HERE/'reuse-audits'/p.name
  if not audit.exists():raise ValueError('Missing reuse sample audit: '+p.name)
  reuse_entries.append({'file':p.relative_to(HERE).as_posix(),'sha256':sha(p),'audit':audit.relative_to(HERE).as_posix(),'auditSha256':sha(audit)})
 if reuse_entries:manifest['reusePacks']=reuse_entries
 author_entries=[];author_ids=[]
 for p in sorted((HERE/'author-drafts').glob('*.json')):
  audit=HERE/'author-audits'/p.name
  if not audit.exists():raise ValueError('Missing author sample audit: '+p.name)
  author_entries.append({'file':p.relative_to(HERE).as_posix(),'sha256':sha(p),'audit':audit.relative_to(HERE).as_posix(),'auditSha256':sha(audit)})
  author_ids.extend(r['id'] for r in read(p)['records'])
 if author_entries:
  manifest['authorPacks']=author_entries
  manifest['authorReviewedIds']=author_ids
 # Validate in a temporary manifest directory reference without replacing a valid release.
 import tempfile,shutil
 with tempfile.TemporaryDirectory() as d:
  stage=Path(d);shutil.copy2(HERE/'baseline-bank.json',stage/'baseline-bank.json')
  for e in entries+reuse_entries+author_entries:
   for key in (['file','review'] if 'review' in e else ['file','audit']):
    dst=stage/e[key];dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(HERE/e[key],dst)
  write(stage/'release-manifest.json',manifest)
  questions,summary=apply_quality(read(HERE/'baseline-bank.json')['questions'],stage)
 if reuse_entries:
  live_questions={q['id']:q for q in read(live)['questions']}
  for e in reuse_entries:
   for r in read(HERE/e['file'])['records']:
    ident=r['id']
    if ident not in live_questions or r['currentQuestionHash']!=digest(live_questions[ident]):
     raise ValueError('Reuse current live question hash drift: '+ident)
 sources=ROOT/'web-study/content/sources';data=read(sources/'student-content.json');app=read(sources/'appendix-content.json');pages=read(ROOT/'tools/question-bank/pdf-pages.json')
 reuse_ids={r['id'] for e in reuse_entries for r in read(HERE/e['file'])['records']}
 for q in questions:
  if q['id'] in set(ids)|reuse_ids|set(author_ids):verify_sources(q,data,app,pages)
 write(HERE/'release-manifest.json',manifest)
 write(HERE/'release-checks.json',{'summary':summary,'reviewedSourceLocators':'pass','unreviewedQuestions':summary['pending'],'history':'baseline retained; no attempt storage opened'})
 print(json.dumps(summary,ensure_ascii=False))
if __name__=='__main__':main()
