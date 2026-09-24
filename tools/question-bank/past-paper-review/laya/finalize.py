"""Record the pilot gate and integrity evidence, without touching production content."""
from collections import Counter
from common import *

out=HERE/'runs/2026-09-23-v2'
manifest=read(out/'manifest.json')
write(out/'adoption.json',{
 'fullBankEnabled':False,'rubricHash':manifest['rubricHash'],
 'evaluationSha256':filehash(out/'evaluation.json'),
 'decision':'Do not adopt for semantic filtering or release decisions',
 'reasons':['held-out wrong-option attraction agreement 51/120, below training-majority baseline 60/120',
            'held-out option-set strength agreement 25/40, equal to majority baseline',
            'held-out operation agreement 14/40, insufficient for reliable routing'],
 'allowedUse':'local fixed-sample experiments and raw advisory observations only',
 'unvalidated':['correctness','uniqueness','learning suitability','whole-bank value'],
 'referenceLimit':'source-read author reference, not teacher gold; no student outcomes'})
old=HERE/'runs/2026-09-23-v1';old_tasks=read(old/'tasks.json')
stages={}
for task in old_tasks:
    kind=task['stage'].split(':')[0]
    stages.setdefault(kind,task['questions'])
write(old/'rubrics.json',{'version':'1','stages':stages})
records=read(out/'records.json');ref=read(out/'reference-set.json')['records']
assert len(records)==2134 and len(ref)==60
assert sum(len(r['choiceReviews']) for r in ref)==240
assert sum(not c['isKey'] for r in ref for c in r['choiceReviews'])==180
assert len({r['id'] for r in ref})==60
assert not set(manifest['sample']['tune'])&set(manifest['sample']['holdout'])
assert not {manifest['sample']['familyById'][i] for i in manifest['sample']['tune']}&{manifest['sample']['familyById'][i] for i in manifest['sample']['holdout']}
assert filehash(BANK)==manifest['bankSha256']
assert all(e['status']=='resolved' for r in records for e in r['evidence'])
write(out/'integrity.json',{
 'result':'PASS','bankUnchanged':True,'uniqueQuestions':len(records),'reviewedQuestions':len(ref),
 'reviewedOptions':240,'reviewedDistractors':180,'sampleFamilyOverlap':False,
 'allSourceLocatorsResolved':True,
 'meaning':'Structural integrity and author reference completeness only; not full semantic acceptance',
 'files':{name:filehash(out/name) for name in ['manifest.json','reference-set.json','evaluation.json','review-ledger.json','report.html','adoption.json']}})
print('Integrity PASS; full-bank semantic model gate DISABLED')
