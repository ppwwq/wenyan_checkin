"""Verify each project config using an actual MCP session. Never writes deployment files."""
import asyncio
import json
import os
import tomllib
from datetime import timedelta
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from common import HERE, write

async def verify(project):
    path=project / '.codex/config.toml'
    cfg=tomllib.loads(path.read_text(encoding='utf-8'))['mcp_servers']['laya_local']
    params=StdioServerParameters(command=cfg['command'],args=cfg['args'],cwd=cfg['cwd'],env={**os.environ,**cfg.get('env',{}),'PYTHONDONTWRITEBYTECODE':'1'})
    report={'project':str(project),'configuration':str(path),'checks':[],
            'codexCurrentTaskToolDiscovery':'requires-session-reload; not verified by this MCP client'}
    async with stdio_client(params) as (r,w):
        async with ClientSession(r,w,read_timeout_seconds=timedelta(seconds=180)) as session:
            await session.initialize()
            report['tools']=[t.name for t in (await session.list_tools()).tools]
            assert set(report['tools'])=={'laya_status','laya_decide'}
            def unpack(result):
                if result.isError: raise RuntimeError(str(result))
                return result.structuredContent or json.loads(result.content[0].text)
            report['before']=unpack(await session.call_tool('laya_status',{}))
            test={'state':{'原文':'不以物喜，不以己悲。','題幹':'「以」在這句的意思是甚麼？'},
                  'questions':{'skill':{'type':'choice','instructions':'What does the task primarily assess?',
                    'criteria':{'word_meaning':'語境詞義','literary_effect':'手法效果','unknown':'無法判斷'}}}}
            report['inference']=unpack(await session.call_tool('laya_decide',test))
            for name,bad in [('empty',{'state':'x','questions':{}}),('overlong',{**test,'state':'證據'*9000})]:
                assert (await session.call_tool('laya_decide',bad)).isError
                report['checks'].append('reject_'+name)
            report['after']=unpack(await session.call_tool('laya_status',{}))
            assert report['after']['loaded']
            report['checks']+=['initialize','tools_list','real_chinese_inference','responsive_after_errors']
    return report

async def main():
    from pathlib import Path
    results=[]
    for project in [Path('D:/DSE中文甲部知识库'),Path('D:/wenyan_checkin')]:
        r=await verify(project)
        results.append(r)
        write(HERE/'connection-verification.json',results)
        print(json.dumps({'project':str(project),'device':r['after']['device'],'checks':r['checks']},ensure_ascii=False),flush=True)

if __name__=='__main__': asyncio.run(main())
