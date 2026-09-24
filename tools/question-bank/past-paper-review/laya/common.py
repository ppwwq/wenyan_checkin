"""Read-only bank review helpers. No code in this package edits the live bank."""
import hashlib
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BANK = ROOT / 'web-study/content/bank.json'
DEPLOYMENT = Path('C:/Users/philip/Documents/Codex/2026-09-23/jev-laya-codex-thread-01a0c99c-53c8')
SERVER = DEPLOYMENT / 'outputs/laya-deployment/server.py'
PYTHON = DEPLOYMENT / 'work/laya-venv/Scripts/python.exe'

def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))

def canonical(obj):
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(',', ':'))

def digest(obj):
    return hashlib.sha256(canonical(obj).encode()).hexdigest()

def filehash(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def write(path, obj):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(obj, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    temp.replace(path)

def resolve_source(path, data, appendix):
    ix = list(map(int, re.findall(r'\[(\d+)\]', path)))
    if path.startswith('$appendix.self_check'):
        return appendix['self_check'][ix[0]]
    if path.startswith('$appendix'):
        return appendix['sections'][ix[0]]['rows'][ix[1]]
    a,b,c,*tail = ix
    obj = data[a]['pages'][b]['blocks'][c]
    for n in tail:
        obj = obj[n]
    return obj

def validate_question(q):
    cs = q['choices']
    if len(cs) != 4 or len({c['id'] for c in cs}) != 4:
        raise ValueError('Expected four unique choices: '+q['id'])
    if sum(c['id']==q['answerId'] for c in cs) != 1:
        raise ValueError('Invalid answer ID: '+q['id'])

def student_state(q):
    # Deliberately exclude answer, rationale, ability, review and status.
    return {'material': q.get('quote',''), 'stem': q['stem'],
            'options': {c['id']: c['text'] for c in q['choices']}}

def evidence(q, data, appendix):
    sources = [q['source']] + q['source'].get('relatedSources', []) + q.get('relatedSources', []) + q.get('supportingSources', [])
    result=[]
    seen=set()
    for s in sources:
        key=(s.get('blockPath'),s.get('pdfPage'))
        if key in seen: continue
        seen.add(key)
        try:
            block=resolve_source(s['blockPath'],data,appendix)
            result.append({'locator':s,'block':block,'status':'resolved'})
        except (KeyError,IndexError,ValueError,TypeError) as exc:
            result.append({'locator':s,'status':'missing','error':str(exc)})
    return result

def rule_flags(q):
    answer=next(c for c in q['choices'] if c['id']==q['answerId'])
    wrong=[c for c in q['choices'] if c['id']!=q['answerId']]
    flags=[]
    if len({c.get('explanation','') for c in wrong})==1: flags.append('same_wrong_rationales')
    if all(len(answer['text'])>len(c['text']) for c in wrong): flags.append('correct_uniquely_longest')
    if any('此項把文意理解為' in c.get('explanation','') for c in wrong): flags.append('echo_rationale')
    if '須核對本句的行動者' in q.get('explanation',''): flags.append('generic_reason')
    absolute=r'只有|只能|一定|完全|一律|全部|任何|毫無|絕不|永遠|必然'
    if all(re.search(absolute,c['text']) for c in wrong) and not re.search(absolute,answer['text']): flags.append('all_wrong_absolute')
    if re.search(r'復習書|所附|分析句|［\s*］',q['stem']): flags.append('editor_or_cloze')
    if any(t in canonical(student_state(q)) for t in ['學則不固','又敬不違','瓠落','玉壺','無情遊','非兵不利','絖']): flags.append('known_dispute_context')
    return flags
