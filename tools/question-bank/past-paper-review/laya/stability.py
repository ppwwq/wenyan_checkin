"""Freeze order-only probes; no bank text or answer key changes."""
import copy
import sys
from common import *
from run_batch import previous_results

out=HERE/'runs/2026-09-23-v2'
if '--prepare' in sys.argv:
    manifest=read(out/'manifest.json');ids=set(manifest['sample']['holdout'][:8]);probes=[]
    for task in read(out/'tasks.json'):
        if task['questionId'] not in ids or task['stage'] not in ['student','review']:continue
        for mode in ['option-order','label-order']:
            probe=copy.deepcopy(task);probe['id']=task['id']+'/probe-'+mode
            if mode=='option-order':probe['state']['options']=dict(reversed(list(probe['state']['options'].items())))
            else:
                for q in probe['questions'].values():q['criteria']=dict(reversed(list(q['criteria'].items())))
            probe['inputHash']=digest({k:v for k,v in probe.items() if k!='inputHash'})
            probes.append(probe)
    write(out/'stability-tasks.json',probes);print('Probes:',len(probes))
else:
    raw=previous_results(out/'raw-results.jsonl');records=[]
    for probe in read(out/'stability-tasks.json'):
        original_id=probe['id'].split('/probe-')[0];a=raw.get(original_id,{});b=raw.get(probe['id'],{})
        for key in probe['questions']:
            before=a.get('result',{}).get('answers',{}).get(key,{}).get('choice')
            after=b.get('result',{}).get('answers',{}).get(key,{}).get('choice')
            records.append({'questionId':probe['questionId'],'mode':probe['id'].split('/probe-')[1],'dimension':probe['stage']+'/'+key,
              'before':before,'after':after,'comparable':a.get('status')==b.get('status')=='completed','changed':before!=after})
    valid=[r for r in records if r['comparable']]
    report={'questions':8,'probes':32,'comparisons':len(valid),'changed':sum(r['changed'] for r in valid),'records':records,
      'meaning':'Order consistency probe, not accuracy or student performance'}
    write(out/'stability.json',report);print({k:v for k,v in report.items() if k!='records'})
