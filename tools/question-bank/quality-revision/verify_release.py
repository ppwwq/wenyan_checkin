"""Verify released identities, unchanged pending records and local report structure."""
import hashlib, json, sys
from html.parser import HTMLParser
from pathlib import Path
from apply_quality import read,apply_quality
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
class ReportCheck(HTMLParser):
 def __init__(self):super().__init__();self.articles=0;self.remote=[]
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  if tag=='article':self.articles+=1
  if tag in {'script','link','iframe','img'}:
   for key in ['src','href']:
    if attrs.get(key):self.remote.append(attrs[key])
def main():
 base=read(HERE/'baseline-bank.json');live=read(ROOT/'web-study/content/bank.json');m=read(HERE/'release-manifest.json')
 expected,summary=apply_quality(base['questions'])
 sys.path.insert(0,str(HERE.parent/'chapter-revision'))
 from apply_chapter import apply_sequence
 current,chapter=apply_sequence(expected)
 assert current==live['questions'];assert live['version']==(chapter['version'] if chapter else m['version'])
 # Historical quality-review assertions apply to that phase's output; chapter edits
 # have their own author-review status and must not inherit an old approval.
 before={q['id']:q for q in base['questions']};after={q['id']:q for q in expected}
 assert set(before)==set(after);ids=set(m['reviewedIds']);author_ids=set(m.get('authorReviewedIds',[]))
 reuse=[r for entry in m.get('reusePacks',[]) for r in read(HERE/entry['file'])['records']]
 reused_ids={r['id'] for r in reuse}
 assert len(reused_ids)==len(reuse) and not reused_ids.intersection(ids|author_ids) and not ids.intersection(author_ids)
 assert summary['reviewed']==len(ids)
 if reuse:assert summary['reusedPriorReview']==len(reuse)
 if author_ids:assert summary['revisedAuthorReviewed']==len(author_ids)
 assert summary['pending']==len(after)-len(ids)-len(author_ids)-len(reused_ids)
 for ident,q in after.items():
  old=before[ident];assert q['memoryId']==old['memoryId'] and q['essayIds']==old['essayIds']
  if ident not in ids|author_ids:assert q==old
  elif q!=old:assert q['version']==old['version']+1
 assert base['comparisons']==live['comparisons']
 parser=ReportCheck();parser.feed((HERE/'report.html').read_text(encoding='utf-8'))
 assert parser.articles==len(ids)+len(author_ids);assert not parser.remote
 bank_sha=hashlib.sha256((ROOT/'web-study/content/bank.json').read_bytes()).hexdigest()
 proof_path=ROOT/'web-study/verification'/('release-'+live['version'])/'public-result.json'
 published=False
 if proof_path.exists():
  proof=read(proof_path)
  bank_asset=next((a for a in proof.get('assets',[]) if a.get('path')=='/content/bank.json'),None)
  published=(proof.get('result')=='PASS' and proof.get('bankVersion')==live['version'] and
             proof.get('questions')==len(after) and bank_asset is not None and
             bank_asset.get('sha256')==bank_sha and len(proof.get('assets',[]))>0 and
             any(c.get('check')=='Production Chromium login, no horizontal overflow, current bank via browser' and c.get('version')==live['version'] and c.get('pageErrors')==[] for c in proof.get('checks',[])))
 result={'bankVersion':live['version'],'bankSha256':bank_sha,'questions':len(after),'activeQuestions':sum(q['active'] is True for q in after.values()),'reviewed':len(ids),'crossReviewed':len(ids),'authorReviewed':len(author_ids),'reusedPriorReview':len(reused_ids),'unchangedPending':len(after)-len(ids)-len(author_ids)-len(reused_ids),'identitiesMemoryUnitsAndComparisons':'preserved','versionIncrement':'exactly once from frozen baseline','reportCards':parser.articles,'externalReportResources':parser.remote,'sourceChecks':read(HERE/'release-checks.json')['reviewedSourceLocators'],'browserVisualValidation':'production-login-only' if published else 'not-run','teacherValidation':'not-run','studentTrial':'not-run','deployment':'verified-read-only' if published else 'not-run'}
 if chapter:
  result.update(qualityPhaseVersion=m['version'],historicalQualityPhaseOnly=True,chapterRevision=chapter,currentCrossReviewed=sum(q.get('review',{}).get('method')=='source-review-and-agent-cross-review' for q in current),scope='reviewed/crossReviewed/unchangedPending describe the historical quality phase; chapterRevision describes current chapter author edits.')
  result['versionIncrement']='once per applicable revision phase; stable IDs and memory units preserved'
 destination=HERE.parent/'chapter-revision'/'quality-phase-verification.json' if chapter else HERE/'verification.json'
 destination.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(result,ensure_ascii=False))
if __name__=='__main__':main()
