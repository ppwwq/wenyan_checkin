"""Resumable single-process MCP batch. Advisory results only; abstain on missing/long evidence."""
import argparse
import asyncio
import json
import os
import time
from datetime import timedelta
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from common import *

def previous_results(path):
    out={}
    if path.exists():
        for line in path.read_text(encoding='utf-8').splitlines():
            if line.strip():
                result=json.loads(line);out[result['id']]=result
    return out

def validate_result(task,result):
    answers=result.get('answers',{})
    if set(answers)!=set(task['questions']):raise ValueError('Wrong answer keys')
    for key,rubric in task['questions'].items():
        selected=answers[key].get('choice')
        if selected not in rubric['criteria']:raise ValueError('Invalid label '+str(selected))
    return result

def cached(task,old):
    return old and old.get('inputHash')==task['inputHash'] and old.get('status') in {'completed','abstained'}

async def main():
    ap=argparse.ArgumentParser();ap.add_argument('--run',default='runs/2026-09-23-v2')
    ap.add_argument('--scope',choices=['tune','holdout','sample','all'],default='tune');ap.add_argument('--limit',type=int)
    ap.add_argument('--task-file',help='Run a saved stability probe task file within the run directory')
    args=ap.parse_args();out=HERE/args.run;manifest=read(out/'manifest.json')
    if args.scope=='all':
        gate=out/'adoption.json'
        if not gate.exists() or not read(gate).get('fullBankEnabled') or read(gate).get('rubricHash')!=manifest['rubricHash']:
            raise ValueError('Full-bank semantic screening is not approved by pilot evidence. Use the fixed sample; never auto-release model labels.')
    assert filehash(SERVER)==manifest['serverSha256'],'Server changed: freeze new run'
    assert read(DEPLOYMENT/'outputs/laya-deployment/model-manifest.json')['revision']==manifest['modelRevision']
    if args.scope=='sample':ids=set(manifest['sample']['tune']+manifest['sample']['holdout'])
    elif args.scope=='all':ids=None
    else:ids=set(manifest['sample'][args.scope])
    tasks=[t for t in read(out/(args.task_file or 'tasks.json')) if ids is None or t['questionId'] in ids]
    if args.limit:tasks=tasks[:args.limit]
    destination=out/'raw-results.jsonl';old=previous_results(destination)
    params=StdioServerParameters(command=str(PYTHON),args=['-B',str(SERVER)],cwd=str(DEPLOYMENT),
        env={**os.environ,'PYTHONUTF8':'1','PYTHONDONTWRITEBYTECODE':'1','HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1'})
    start=time.monotonic();done=0;errors=0
    with (out/'server-stderr.log').open('a',encoding='utf-8') as log:
      async with stdio_client(params,errlog=log) as (r,w):
       async with ClientSession(r,w,read_timeout_seconds=timedelta(seconds=180)) as session:
        await session.initialize()
        for task in tasks:
            if cached(task,old.get(task['id'])):done+=1;continue
            entry={k:task[k] for k in ['id','questionId','questionVersion','stage','inputHash']}
            entry.update({'modelRevision':manifest['modelRevision'],'rubricHash':manifest['rubricHash'],'advisoryOnly':True})
            try:
                result=await session.call_tool('laya_decide',{'state':task['state'],'questions':task['questions']})
                if result.isError:
                    msg=' '.join(x.text for x in result.content if hasattr(x,'text'))
                    entry.update(status='abstained' if any(s in msg for s in ['token budget','evidence needs','State too long']) else 'failed',error=msg)
                else:
                    raw=result.structuredContent or json.loads(result.content[0].text)
                    entry.update(status='completed',result=validate_result(task,raw))
            except Exception as exc:
                entry.update(status='failed',error=repr(exc))
            with destination.open('a',encoding='utf-8') as f:f.write(json.dumps(entry,ensure_ascii=False)+'\n')
            done+=1;errors+=entry['status']!='completed'
            if done%30==0:print(json.dumps({'done':done,'total':len(tasks),'nonCompletedThisRun':errors,'seconds':round(time.monotonic()-start,1)}),flush=True)
        status=await session.call_tool('laya_status',{})
        write(out/'last-runtime.json',status.structuredContent or json.loads(status.content[0].text))
    print(json.dumps({'scope':args.scope,'done':done,'seconds':round(time.monotonic()-start,1),'rawResults':str(destination)}),flush=True)

if __name__=='__main__':asyncio.run(main())
