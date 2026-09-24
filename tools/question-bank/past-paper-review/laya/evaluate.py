"""Compare labels against author source-reading, never call agreement teaching effectiveness."""
import argparse
from collections import Counter,defaultdict
from common import *
from run_batch import previous_results

def observations(reference,raw):
    for r in reference:
        for metric,target in r['reference'].items():
            stage,key=metric.split('/')
            pred=raw.get(r['id']+'/'+stage,{})
            value=pred.get('result',{}).get('answers',{}).get(key,{}).get('choice')
            yield {'id':r['id'],'split':r['split'],'metric':metric,'expected':target,
                   'predicted':value,'status':pred.get('status','not-run')}
        for c in r['choiceReviews']:
            if c['isKey']:continue
            pred=raw.get(r['id']+'/option:'+c['id'],{})
            value=pred.get('result',{}).get('answers',{}).get('attraction',{}).get('choice')
            yield {'id':r['id'],'choiceId':c['id'],'split':r['split'],'metric':'option/attraction',
                   'expected':c['attraction'],'predicted':value,'status':pred.get('status','not-run')}

def measure(rows,baseline):
    completed=[r for r in rows if r['status']=='completed']
    classified=[r for r in completed if r['predicted']!='unknown']
    exact=sum(r['expected']==r['predicted'] for r in rows)
    labels=sorted({r['expected'] for r in rows})
    per_label={}
    for label in labels:
        tp=sum(r['expected']==label and r['predicted']==label for r in rows)
        fp=sum(r['expected']!=label and r['predicted']==label for r in rows)
        fn=sum(r['expected']==label and r['predicted']!=label for r in rows)
        per_label[label]={'tp':tp,'fp':fp,'fn':fn,'precision':tp/(tp+fp) if tp+fp else None,'recall':tp/(tp+fn) if tp+fn else None}
    return {'total':len(rows),'completedCalls':len(completed),'classified':len(classified),'agreement':exact,
        'agreementAll':exact/len(rows) if rows else None,'agreementClassified':exact/len(classified) if classified else None,
        'trainingMajorityLabel':baseline,'majorityBaselineAgreement':sum(r['expected']==baseline for r in rows),
        'statuses':dict(Counter(r['status'] for r in rows)),
        'confusion':dict(Counter(r['expected']+' -> '+str(r['predicted']) for r in rows)), 'byLabel':per_label}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--run',default='runs/2026-09-23-v2');args=ap.parse_args();out=HERE/args.run
    ref=read(out/'reference-set.json')['records'];raw=previous_results(out/'raw-results.jsonl')
    bank=read(out/'baseline-bank.json');byid={q['id']:q for q in bank['questions']}
    for r in ref:assert digest(byid[r['id']])==r['inputQuestionHash'],'Reference drift'
    rows=list(observations(ref,raw));metrics={}
    for metric in sorted({r['metric'] for r in rows}):
        tuning=[r for r in rows if r['metric']==metric and r['split']=='tune']
        baseline=Counter(r['expected'] for r in tuning).most_common(1)[0][0]
        metrics[metric]={split:measure([r for r in rows if r['metric']==metric and r['split']==split],baseline) for split in ['tune','holdout']}
    summary={'referenceMethod':'Codex source-read author judgements; not independent teacher gold; no student data',
      'referenceHash':filehash(out/'reference-set.json'),'metrics':metrics,
      'wrongOptionSampleIndependence':'Three options per question are clustered, not three independent students',
      'unvalidatedDimensions':['usefulness fit','correctness','unique answer','misreading diagnosis','explanation quality','whole-bank incremental value'],
      'records':rows}
    write(out/'evaluation.json',summary)
    for metric,groups in metrics.items():
        print(metric,json.dumps({s:{k:v[k] for k in ['total','completedCalls','agreement','agreementAll','majorityBaselineAgreement']} for s,v in groups.items()}))

if __name__=='__main__':main()
