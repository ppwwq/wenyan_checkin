"""Build a topic-first knowledge layer without changing released app data.

Run from any directory: python tools/knowledge-base/build.py
Stable IDs use content + context; provenance paths never determine navigation.
"""
import collections
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'knowledge-base'
SRC = ROOT / 'web-study/content'
CATEGORIES = {
    'text': '原文與語譯', 'vocabulary': '字詞與句式', 'theme': '主旨與思想',
    'structure': '結構與脈絡', 'character': '人物與情感', 'technique': '手法與賞析',
    'comparison': '比較與應用', 'background': '背景與文體', 'exam': '考查紀錄',
}

def read(p):
    return json.loads(p.read_text(encoding='utf-8-sig'))

def write(p, s):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text('\n'.join(line.rstrip() for line in s.rstrip().splitlines()) + '\n', encoding='utf-8')

def dump(p, obj):
    write(p, json.dumps(obj, ensure_ascii=False, indent=2))

def norm(s):
    return re.sub(r'\s+', '', str(s))

def clean_title(s):
    return re.sub(r'[（(]\d+[）)]$', '', s).strip()

def md(s):
    return str(s).replace('|', '\\|').replace('\n', '<br>')

def category(title, heading='', first=''):
    # Specific concepts win over a broad mixed-page heading.
    local = heading + ' ' + first
    if re.search(r'題解|背景|文體|身分|朝代', local): return 'background'
    if re.search(r'內容線索|全文關係', local): return 'structure'
    if re.search(r'跨篇|生活|應用|表達示範', local): return 'comparison'
    if re.search(r'通假|古今|一字多義|倒裝|省略|活用|句式|句法|指代|虛詞|字詞|訓詁', local): return 'vocabulary'
    if re.search(r'比喻|借代|擬人|擬物|象徵|對偶|排比|設問|反問|疊字|頂真|互文|用典|誇張|層遞|反襯|正襯|修辭|煉字|描寫|論證|抒情', local): return 'technique'
    if re.search(r'歷年|考查|考前', title + local): return 'exam'
    if re.search(r'跨篇|比較及應用|生活例子', title): return 'comparison'
    if re.search(r'字詞|多義|虛詞|句式|句法|指代|語法|通假', title): return 'vocabulary'
    if re.search(r'章末|結構|串連|推進|四聯|三件大事', title): return 'structure'
    if re.search(r'手法|修辭|喻例|論證|襯托|描寫|語言表達|語錄體|感官|景情', title): return 'technique'
    if re.search(r'人物|情感|心境|感慨|感悟|鴻雁|梧桐|周瑜', title): return 'character'
    if re.search(r'題解|背景|文體', title): return 'background'
    return 'theme'

source = read(SRC / 'sources/student-content.json')
appendix = read(SRC / 'sources/appendix-content.json')
bank = read(SRC / 'bank.json')
coverage = read(SRC / 'source-coverage.json')
guide = read(OUT / 'editorial/guide.json')
records = {}
text_index = collections.defaultdict(set)
path_to_id = {}
occurrences = 0


def add(chapter, cat, title, fields, evidence, context=''):
    global occurrences
    occurrences += 1
    # Never merge different contextual meanings just because the headword matches.
    key = json.dumps([chapter, cat, norm(title), {k: norm(v) for k, v in fields.items()}, norm(context)], ensure_ascii=False, sort_keys=True)
    rid = 'k-' + hashlib.sha256(key.encode()).hexdigest()[:16]
    r = records.setdefault(rid, {'id': rid, 'chapterId': chapter, 'category': cat,
        'title': title, 'fields': fields, 'context': context, 'evidence': [],
        'questionIds': [], 'review': {'status': 'organized', 'notes': []}})
    if evidence not in r['evidence']: r['evidence'].append(evidence)
    path_to_id[(evidence['file'], evidence['path'])] = rid
    for val in fields.values(): text_index[norm(val)].add(rid)
    return r

for ci, ch in enumerate(source):
    chapter = bank['essays'][ci]['id']
    add(chapter, 'background', '作者與題旨', {'作者':ch['author']}, {'file':'web-study/content/sources/student-content.json','path':f'$[{ci}].author','section':ch['name']})
    add(chapter, 'theme', '一句話題旨', {'題旨':ch['desc']}, {'file':'web-study/content/sources/student-content.json','path':f'$[{ci}].desc','section':ch['name']})
    for pi, page in enumerate(ch['pages']):
        base = f'$[{ci}].pages[{pi}]'
        ev = lambda path: {'file': 'web-study/content/sources/student-content.json', 'path': path, 'section': page['title']}
        original = next((b[1] for b in page['blocks'] if b[0] == 'annot'), '')
        if page.get('core'):
            add(chapter, 'theme', '句段核心：' + page['title'], {'重點': page['core']}, ev(base + '.core'))
        head = ''
        for bi, block in enumerate(page['blocks']):
            typ = block[0]; bp = base + f'.blocks[{bi}]'
            if typ == 'head':
                head = block[1]
                if pi == 0 and bi == 0 and '｜' in head:
                    add(chapter, 'background', '作者、時代與文體', {'資料':head}, ev(bp))
                continue
            if typ == 'annot':
                add(chapter, 'text', page['title'], {'原文': block[1]}, ev(bp), original)
            elif typ == 'vocab':
                for ri, row in enumerate(block[1]):
                    add(chapter, 'vocabulary', row[0], {'詞義': row[1]}, ev(bp + f'[1][{ri}]'), original)
            elif typ in ('table', 'polytable'):
                headers = block[1][0]
                for ri, row in enumerate(block[1][1:], 1):
                    fields = {f'{h}': str(v) for h, v in zip(headers[1:], row[1:])}
                    if len(row) != len(headers):
                        raise ValueError(f'Unequal table width {bp}/{ri}')
                    add(chapter, category(page['title'], head, str(row[0])), str(row[0]), fields,
                        ev(bp + f'[1][{ri}]'))
            elif typ in ('text', 'note', 'band', 'pp'):
                if head == '語譯' and typ == 'text':
                    cat = 'text'; title = page['title']; fields = {'語譯': block[1]}
                else:
                    cat = 'exam' if typ == 'pp' else category(page['title'], head, block[1][:35])
                    title = head or ('理解提醒' if typ == 'note' else clean_title(page['title']))
                    fields = {'內容': block[1]}
                add(chapter, cat, title, fields, ev(bp), original if cat == 'text' else '')
            else:
                raise ValueError(f'Unknown block type {typ}')

for si, section in enumerate(appendix['sections']):
    for ri, row in enumerate(section['rows']):
        r = add('general', 'technique', row[0], {'定義與辨識': row[1], '例子與作用': row[2]},
            {'file': 'web-study/content/sources/appendix-content.json', 'path': f'$appendix.sections[{si}].rows[{ri}]', 'section': section['title']})
        r['topic'] = section['title'].split('｜')[0]
for ri, row in enumerate(appendix['self_check']):
    add('general', 'comparison', row[0] + '自查', {'提問': row[1]},
        {'file': 'web-study/content/sources/appendix-content.json', 'path': f'$appendix.self_check[{ri}]', 'section': '答題自查'})

# Question IDs are backlinks only, never a second copy of the knowledge catalogue.
source_file = 'web-study/content/sources/student-content.json'
appendix_file = 'web-study/content/sources/appendix-content.json'
question_index = []
for qi, q in enumerate(bank['questions']):
    p = q['source']['blockPath']
    f = appendix_file if p.startswith('$appendix') else source_file
    targets = set()
    # A vocabulary question may point to an annotation, while the word sense lives beside it.
    if (f, p) in path_to_id:
        targets.add(path_to_id[(f, p)])
    else:
        # Source locators can reference a table container or a scalar within a fact.
        descendants = [rid for (file, path), rid in path_to_id.items() if file == f and (path.startswith(p + '[') or path.startswith(p + '.'))]
        targets.update(descendants)
        if not descendants:
            parents = [(path, rid) for (file, path), rid in path_to_id.items() if file == f and (p.startswith(path + '[') or p.startswith(path + '.'))]
            if parents: targets.add(max(parents, key=lambda pair:len(pair[0]))[1])
    for passage in q.get('learning', {}).get('passages', []):
        pp = passage.get('sourcePath')
        if pp:
            targets.update(rid for (file, path), rid in path_to_id.items()
                if file == source_file and path.startswith(pp + '.') and records[rid]['category'] == 'text')
    # Keep additional authored definitions. Exact repeated supplements link to the existing fact.
    for ki, item in enumerate(q.get('learning', {}).get('knowledge', [])):
        text = item.get('text', '')
        exact = [records[rid] for rid in text_index.get(norm(text),set()) if records[rid]['chapterId'] in q['essayIds'] or records[rid]['chapterId']=='general']
        if exact:
            targets.update(r['id'] for r in exact)
            for r in exact:
                ev={'file':'web-study/content/bank.json', 'path':f'$.questions[{qi}].learning.knowledge[{ki}]', 'section':'題庫補充知識'}
                if ev not in r['evidence']:r['evidence'].append(ev)
                path_to_id[(ev['file'], ev['path'])]=r['id']
        else:
            ch = q['essayIds'][0] if len(q['essayIds']) == 1 else 'general'
            # These are editorial supplements, not newly verified official marking schemes.
            r = add(ch, category(item['title'], '', item['title']), item['title'], {'內容': text},
                {'file': 'web-study/content/bank.json', 'path': f'$.questions[{qi}].learning.knowledge[{ki}]', 'section': '題庫補充知識'})
            targets.add(r['id'])
    for rid in targets:
        if q['id'] not in records[rid]['questionIds']: records[rid]['questionIds'].append(q['id'])
    question_index.append({'id': q['id'], 'active': q.get('active', True),
        'kind': q.get('provenance', {}).get('kind', 'authored'), 'chapterIds': q['essayIds'],
        'knowledgeIds': sorted(targets), 'bankPath': f'$.questions[{qi}]'})

# Preserve disputes, including different wording across annotations and summary tables.
issues = []
for item in coverage:
    if item['status'] != 'disputed': continue
    f = appendix_file if item['sourcePath'].startswith('$appendix') else source_file
    rid = path_to_id.get((f, item['sourcePath']))
    if not rid: raise ValueError('Unmapped disputed source: ' + item['sourcePath'])
    records[rid]['review']['status'] = 'multiple-interpretations'
    records[rid]['review']['notes'].append(item['reason'])
    issues.append({'kind': 'existing-dispute', 'knowledgeIds': [rid], **item})
for q in bank['questions']:
    if q.get('active') is not False: continue
    f = appendix_file if q['source']['blockPath'].startswith('$appendix') else source_file
    rid = path_to_id.get((f, q['source']['blockPath']))
    if rid:
        records[rid]['review'] = {'status': 'hold', 'notes': [q.get('revisionReason', '原題停用')]}
        issues.append({'kind': 'held-definition', 'knowledgeIds': [rid], 'questionId': q['id'], 'reason': q.get('revisionReason')})
# Explicitly labelled alternative readings are review cues, not proof of a contradiction.
for r in records.values():
    content = ' '.join(r['fields'].values())
    if r['review']['status'] == 'organized' and re.search(r'另有|另說|亦說|兩說|兩解|異解|異讀|另一解|不同解釋', content):
        r['review']['status'] = 'interpretation-note'
        r['review']['notes'].append('原資料明示另一解讀；須連同語境閱讀。此為文字提示，未判定所有解釋同等成立。')

# Drop stale generated outputs only inside this tool's own output directories.
for folder in ['chapters', 'topics', 'data', 'reference']:
    (OUT/folder).mkdir(exist_ok=True)
    for file in (OUT / folder).glob('*'):
        if file.suffix in {'.json', '.md'}: file.unlink()

record_list = list(records.values())
concept_groups = collections.defaultdict(list)
for r in record_list:
    concept_groups[(r['chapterId'], r['category'], clean_title(r['title']))].append(r)
concepts = [{'id':'concept-'+hashlib.sha256(json.dumps(key,ensure_ascii=False).encode()).hexdigest()[:16],
             'chapterId':key[0], 'category':key[1], 'title':key[2], 'knowledgeIds':[r['id'] for r in items]}
            for key, items in concept_groups.items()]

for chapter in [e['id'] for e in bank['essays']] + ['general']:
    dump(OUT / f'data/{chapter}.json', [r for r in record_list if r['chapterId'] == chapter])
dump(OUT / 'data/concepts.json', concepts)
dump(OUT / 'data/questions.json', question_index)
dump(OUT / 'data/issues.json', issues)


def record_block(r):
    flag = {'multiple-interpretations':'【保留異解】', 'hold':'【待核，不作唯一判斷】', 'interpretation-note':'【含不同解讀】'}.get(r['review']['status'], '')
    lines = [f'<a id="{r["id"]}"></a>', f'**{r["title"]}** {flag}', '']
    for key, val in r['fields'].items(): lines.append(f'- **{key}：** {val.replace(chr(10), chr(10)+"  ")}')
    if r['category'] == 'vocabulary' and r['context']:
        lines += ['', '> 語境：' + r['context']]
    if r['review']['notes']:
        lines += ['', *['> 核對提醒：' + n for n in r['review']['notes']]]
    return '\n'.join(lines) + '\n'

chapter_lookup = {e['id']: e['title'] for e in bank['essays']}
for g in guide['chapters']:
    cid = g['id']; rs = [r for r in record_list if r['chapterId'] == cid]
    lines = [f'# {chapter_lookup[cid]}', '', '[知識庫首頁](../README.md) · [跨篇比較](../topics/comparisons.md) · [異解與待核](../audit/REVIEW.md)', '',
        '## 先回答這個問題', '', '**' + g['question'] + '**', '', g['summary'], '',
        '## 全篇思路', '', *[f'{i}. {s}' for i, s in enumerate(g['chain'], 1)], '',
        '## 最容易混淆', '', *['- ' + s for s in g['pitfalls']], '',
        '## 按知識查閱', '', *[f'- [{label}](#{cat})' for cat, label in CATEGORIES.items() if cat != 'exam' and any(r['category'] == cat for r in rs)], '']
    for cat, label in CATEGORIES.items():
        if cat == 'exam': continue
        selected = [r for r in rs if r['category'] == cat]
        if not selected: continue
        lines += [f'<a id="{cat}"></a>', f'## {label}', '']
        # Preserve narrative order for passages, group vocabulary by headword for lookup.
        if cat == 'vocabulary': selected.sort(key=lambda r: r['title'])
        grouped = collections.defaultdict(list)
        for r in selected: grouped[clean_title(r['title'])].append(r)
        for title, group in grouped.items():
            lines += [f'### {title}', '']
            seen_statements = set()
            seen_contexts = set()
            for r in group:
                lines += [f'<a id="{r["id"]}"></a>']
                for key, val in r['fields'].items():
                    signature = (key, norm(val))
                    if signature in seen_statements: continue
                    seen_statements.add(signature)
                    lines += [f'**{key}：** '+val, '']
                if cat == 'vocabulary' and r['context'] and r['context'] not in seen_contexts:
                    seen_contexts.add(r['context']); lines += ['> 語境：'+r['context'], '']
                for note in r['review']['notes']:
                    lines += ['> **異解／待核：** '+note, '']
            lines.append('')
    lines += ['## 核對範圍', '', '篇首提要為本次整合；細項保留現有資料的語境與不同說法。來源定位及關聯題號保存在對應資料檔；「已整理」不代表逐條獨立語義審定。', '', f'[本篇可追溯資料](../data/{cid}.json)']
    write(OUT / f'chapters/{cid}.md', '\n'.join(lines))

# Knowledge-centred topics have their own entry points; source books are not navigation categories.
lines = ['# 修辭、寫作與答題方法', '', '[知識庫首頁](../README.md)', '',
    '讀手法時依次回答：**怎樣構成 → 原文何處 → 表達甚麼 → 怎樣支持主旨**。同一句可有多種手法，須按題目層次作答。', '']
for topic in dict.fromkeys(r.get('topic') for r in record_list if r.get('topic')):
    lines += [f'## {topic}', '']
    for r in record_list:
        if r.get('topic') == topic: lines += [record_block(r)]
write(OUT / 'topics/techniques.md', '\n'.join(lines))
lines=['# 補充理解與答題自查','','[知識庫首頁](../README.md)','','以下匯集既有題庫中的補充說明；配合相關篇章閱讀，勿把跨篇例子當成某一篇的原文。','']
for r in record_list:
    if r['chapterId']=='general' and not r.get('topic'):
        related=sorted({e for qid in r['questionIds'] for e in next(q for q in bank['questions'] if q['id']==qid)['essayIds']})
        if related: lines += ['相關篇章：'+'、'.join(chapter_lookup[e] for e in related),'']
        lines += [record_block(r)]
write(OUT / 'topics/supplements.md', '\n'.join(lines))


vocab = collections.defaultdict(list)
for r in record_list:
    if r['category'] == 'vocabulary': vocab[r['title']].append(r)
lines = ['# 字詞與句式總索引', '', '[知識庫首頁](../README.md)', '',
    '同字不同語境可以有不同意思。下列按詞條聚合，保留各篇義項與語法說明；不把不同義項硬合併。可用頁面搜尋找字。', '']
for term, rs in sorted(vocab.items()):
    lines += [f'## {term}', '', '| 篇章 | 詞義／語法／辨析 | 詳細語境 |', '|---|---|---|']
    seen = set()
    for r in rs:
        text = '；'.join(f'{k}：{v}' for k,v in r['fields'].items()); key=(r['chapterId'],norm(text))
        if key in seen: continue
        seen.add(key)
        flag = '【異解／待核】' if r['review']['status'] != 'organized' else ''
        lines.append(f'| {chapter_lookup.get(r["chapterId"],"通用")} | {md(text)} {flag} | [查看](../chapters/{r["chapterId"]}.md#{r["id"]}) |')
    lines.append('')
write(OUT / 'topics/vocabulary.md', '\n'.join(lines))

lines = ['# 跨篇比較', '', '[知識庫首頁](../README.md)', '',
    '比較答案依次寫：**共同角度 → 各篇原文或情節 → 具體異同 → 原因或主旨**。下面六組是本次整合的複習框架，不冒充官方答案。', '']
for c in guide['comparisons']:
    lines += [f'## {c["title"]}', '', '**比較角度：** '+c['axis'], '', '**共同點：** '+c['shared'], '',
        *['- '+d for d in c['differences']], '', '**答題提醒：** '+c['method'], '',
        '篇章：'+' · '.join(f'[{chapter_lookup[e]}](../chapters/{e}.md)' for e in c['essays']), '']
lines += ['## 一字多義：11組既有對照', '', '以下保留題庫已有的語境義項；題號只是核對連結，不是知識庫的目錄。', '']
q_lookup = {q['id']:q for q in bank['questions']}
for c in bank['comparisons']:
    lines += [f'### {c["title"]}', '', '| 篇章 | 原句 | 本句意思 |', '|---|---|---|']
    for item in c['items']:
        q=q_lookup[item['questionId']]
        lines.append('| '+'、'.join(chapter_lookup[e] for e in q['essayIds'])+' | '+md(q['quote'])+' | '+md(item['meaning'])+' |')
    lines.append('')
write(OUT / 'topics/comparisons.md', '\n'.join(lines))

for cat in ['theme','structure','character','technique','comparison','background']:
    lines = [f'# {CATEGORIES[cat]}：跨篇索引', '', '[知識庫首頁](../README.md)', '', '按篇章定位具體知識。相近標題的不同分析保留語境，不自動判成重複或互相矛盾。', '']
    for cid,title in chapter_lookup.items():
        rs=[r for r in record_list if r['chapterId']==cid and r['category']==cat]
        lines += [f'## {title}', '']
        by_title=collections.defaultdict(list)
        for r in rs:by_title[r['title']].append(r)
        for t,items in by_title.items():
            lines.append('- '+t+'：'+' · '.join(f'[細項{n}](../chapters/{cid}.md#{r["id"]})' for n,r in enumerate(items,1)))
        if not rs:lines.append('本次資料未單列此類；請參看本篇提要及相鄰類別。')
        lines.append('')
    write(OUT / f'topics/index-{cat}.md', '\n'.join(lines))

exam = [r for r in record_list if r['category']=='exam']
lines=['# 歷年考查提示（輔助查閱）','','這些是既有資料中的考查紀錄，已從主知識目錄分離。並非完整年度考綱；本次未逐項對照全部官方原卷。','']
for r in exam:lines += [f'## {chapter_lookup.get(r["chapterId"],"通用")} · {r["title"]}', '', record_block(r)]
write(OUT / 'audit/exam-notes.md','\n'.join(lines))

lines=['# 異解與待核清單','','[知識庫首頁](../README.md)','','這份清單把「可追溯」和「已定論」分開。既有的16個異解位置全部保留；同一爭點可能涉及多個位置。','',
    '## 已記錄異解與停用定義','']
for i,issue in enumerate(issues,1):
    r=records[issue['knowledgeIds'][0]]; cid=r['chapterId']
    dest=f'../chapters/{cid}.md' if cid!='general' else '../topics/techniques.md'
    lines += [f'### {i}. {chapter_lookup.get(cid,"通用手法")}：{r["title"]}', '',issue['reason'], '',f'[閱讀條目]({dest}#{r["id"]})','']
lines += ['## 本次編輯處理', '',
    '- **「展望作結」：** 原資料把正面展望的寫作建議寫成一般定義；保留為待核條目，不推入唯一答案。可先理解為把視線由當前推向未來，具體情調須依文章；這句為本次編輯界線說明，沒有替舊題重新評分。',
    '- **「危急存亡之秋」：** 詞義與修辭分開。可確認資料採「時候」義；把它定為借喻的延伸分類仍待核。',
    '- **同詞異義：** 不以字形相同便合併。例如「歸」須連回稱讚、歸依、回來等語境。',
    '- **資料去重：** 只合併同篇、同類、相同內容與相同語境的條目；近義改寫保留可比對關係，不宣稱已完成全部語義去重。', '',
    '## 核對等級', '',
    '| 狀態 | 實際意思 |', '|---|---|',
    '| organized | 已分類、來源可定位；不是獨立學術審定 |',
    '| multiple-interpretations | 舊覆蓋表已明列異解，保留原說明 |',
    '| interpretation-note | 本文出現另一解讀的文字提示，需按語境理解 |',
    '| hold | 已有停用題指出定義問題，不當唯一標準 |', '',
    '完整數值、檔案指紋及未完成項目見 [核對報告](report.json)。']
write(OUT / 'audit/REVIEW.md','\n'.join(lines))

counts=collections.Counter(r['category'] for r in record_list)
manifest={'version':guide['version'],'bankVersion':bank['version'], 'questions':len(bank['questions']),
 'activeQuestions':sum(q.get('active') is True for q in bank['questions']),
 'authoredQuestions':sum(q.get('provenance',{}).get('kind')!='dse-original' for q in bank['questions']),
 'pastPaperQuestions':sum(q.get('provenance',{}).get('kind')=='dse-original' for q in bank['questions']),
 'chapters':bank['essays'],'knowledgeRecords':len(record_list),'categories':CATEGORIES,'categoryCounts':dict(counts),
 'extractedOccurrences':occurrences,'exactDuplicatesMerged':occurrences-len(record_list),
 'concepts':len(concepts),'repeatedHeadingsConsolidated':len(record_list)-len(concepts),
 'disputedSourceLocations':sum(x['status']=='disputed' for x in coverage),
 'reviewStatusCounts':dict(collections.Counter(r['review']['status'] for r in record_list)),
 'guideComparisons':len(guide['comparisons']),'wordComparisons':len(bank['comparisons']),
 'sourceFiles':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [SRC/'sources/student-content.json',SRC/'sources/appendix-content.json',SRC/'bank.json',SRC/'source-coverage.json',SRC/'sources/revision-book.pdf']}}
dump(OUT/'manifest.json',manifest)
lines=['# '+guide['title'],'',
    '**從知識出發：先讀懂篇章，再查字詞、手法和跨篇關係。**', '',
    '本庫把現有的16篇資料整理為統一分類；篇首提要和六組主題比較為本次重新整合。來源只保留在核對層，不作主要目錄。', '',
    '## 怎樣使用', '',
    '1. **學一篇：** 點篇名，先讀核心問題、全篇思路和常見混淆，再查完整細項。',
    '2. **查一個知識：** 用字詞總索引或手法總表；同詞不同意思會並列語境。',
    '3. **練比較：** 讀六組主題比較，再用原句支持異同。',
    '4. **有不同說法：** 看異解與待核清單，不硬背成唯一答案。', '',
    '## 篇章入口', '', '| 篇章 | 要解決的核心問題 |', '|---|---|']
for g in guide['chapters']:lines.append(f'| [{chapter_lookup[g["id"]]}](chapters/{g["id"]}.md) | {g["question"]} |')
lines += ['', '## 知識入口', '',
    '- [16篇核心總覽](study-guide.md)（先讀這份）',
    '- [字詞與句式總索引](topics/vocabulary.md)',
    '- [修辭、寫作與答題方法](topics/techniques.md)',
    '- [跨篇比較：6組主題＋11組詞義](topics/comparisons.md)',
    *[f'- [{CATEGORIES[c]}索引](topics/index-{c}.md)' for c in ['theme','structure','character','technique','comparison','background']],
    '- [補充理解與答題自查](topics/supplements.md)',
    '- [異解與待核清單](audit/REVIEW.md)', '',
    '## 本版範圍', '',
    f'資料基準：題庫 `{bank["version"]}`；{manifest["questions"]:,} 題（{manifest["activeQuestions"]:,} 啟用），其中 {manifest["pastPaperQuestions"]} 題標記為 DSE 原題。', '',
    f'整合為 {len(concepts):,} 個知識主題，內含 {len(record_list):,} 個可追溯細項；收束 {len(record_list)-len(concepts):,} 次重複標題。相同詞條集中呈現，語境與不同解釋保留。', '',
    '**核對界線：** 來源定位和 PDF 文字錨點核對不等於解釋已獨立審定。16處既有異解與1項停用定義另列；27道真題本輪未重新查看外部原卷與評分文件，沿用既有標記。', '',
    '## 維護', '',
    '- [編輯與更新規則](MAINTENANCE.md)',
    '- [本次核對報告](audit/report.json)',
    '- [歷年考查提示](audit/exam-notes.md)（輔助資料）',
    '- [機器可讀資料](data/)（篇章、詞條與題目關聯）',
    '', '這個目錄是項目內的新知識入口；網站現有題庫與作答紀錄沿用原檔。']
write(OUT/'README.md','\n'.join(lines))
print(json.dumps({k:v for k,v in manifest.items() if k not in ['sourceFiles','chapters','categories']},ensure_ascii=False,indent=2))

lines=['# 我的 DSE 文言知識庫：核心總覽','','以篇章核心問題與知識關係整理。完整細項、來源追溯和異解清單請從[知識庫首頁](README.md)進入。','']
for g in guide['chapters']:
    lines += ['## '+chapter_lookup[g['id']],'','**'+g['question']+'**','',g['summary'],'','### 全篇思路','',*[str(i)+'. '+s for i,s in enumerate(g['chain'],1)],'','### 常見混淆','',*['- '+s for s in g['pitfalls']],'']
lines += ['## 六組跨篇比較','']
for c in guide['comparisons']:
    lines += ['### '+c['title'],'','**角度：** '+c['axis'],'','**共同點：** '+c['shared'],'',*['- '+s for s in c['differences']],'','**答題提醒：** '+c['method'],'']
lines += ['## 如何核對','', '本次按既有資料重整篇章概要、比較關係與異解界線，並完成結構和來源文字定位檢查；未把全庫標為教師審定。27道真題沿用既有標記，本輪未重新核對外部原卷和評分文件。']
write(OUT/'study-guide.md','\n'.join(lines))

# The learning layer contains authored synthesis; detailed evidence stays a level deeper.
for g in guide['chapters']:
    cid=g['id']; old=OUT/f'chapters/{cid}.md'; reference=OUT/f'reference/{cid}.md'
    old.rename(reference)
    write(reference,reference.read_text().replace('[知識庫首頁](../README.md)',f'[本篇核心](../chapters/{cid}.md) · [知識庫首頁](../README.md)',1))
    lines=['# '+chapter_lookup[cid],'','[知識庫首頁](../README.md) · [完整細項](../reference/'+cid+'.md) · [異解與待核](../audit/REVIEW.md)','',
           '**核心問題：'+g['question']+'**','',g['summary'],'','## 全篇思路','',*[str(i)+'. '+v for i,v in enumerate(g['chain'],1)],'','## 三張核心知識卡','']
    for card in g['cards']:
        lines += ['### '+card['title'],'','**要懂：** '+card['conclusion'],'','> 原文：'+card['quote'],'','**怎樣理解：** '+card['reason'],'','**避免誤解：** '+card['mistake'],'']
    lines += ['## 常見混淆','',*['- '+v for v in g['pitfalls']],'','## 查完整知識','']
    for cat,label in CATEGORIES.items():
        if cat!='exam' and any(r['chapterId']==cid and r['category']==cat for r in record_list):
            lines += [f'- [{label}](../reference/{cid}.md#{cat})']
    lines += ['', '核心卡為本次整合，原句位置可追溯；不同解讀須參看異解清單，不把一種解釋當成全部。']
    write(old,'\n'.join(lines))
for file in (OUT/'topics').glob('*.md'):
    text=file.read_text();text=re.sub(r'\.\./chapters/(essay-\d+\.md#[^)]+)',r'../reference/\1',text);write(file,text)
file=OUT/'audit/REVIEW.md';write(file,re.sub(r'\.\./chapters/(essay-\d+\.md#[^)]+)',r'../reference/\1',file.read_text()))
# Rebuild the portable study guide from the short chapter pages.
lines=['# 我的 DSE 文言知識庫：16篇核心總覽','','**16篇、48張核心知識卡、6組主題比較。** 每張卡先說結論，再連原句、推理和易錯點。完整詞義和細項見[知識庫首頁](README.md)。','']
for g in guide['chapters']:
    lines += ['## '+chapter_lookup[g['id']],'','**'+g['question']+'**','',g['summary'],'','### 全篇思路','',*[str(i)+'. '+v for i,v in enumerate(g['chain'],1)],'']
    for c in g['cards']:
        lines += ['### '+c['title'],'','**要懂：** '+c['conclusion'],'','> 原文：'+c['quote'],'','**怎樣理解：** '+c['reason'],'','**避免誤解：** '+c['mistake'],'']
for c in guide['comparisons']:
    lines += ['## 比較：'+c['title'],'','**角度：** '+c['axis'],'','**共同點：** '+c['shared'],'',*['- '+v for v in c['differences']],'','**作答提醒：** '+c['method'],'']
lines += ['## 核對界線','','核心卡及比較為本次編輯整合，原文可定位；既有異解另列，未把全庫說成教師審定。自編題已核對PDF文字錨點；27道真題本輪沒有重新核對外部原卷和評分文件。']
write(OUT/'study-guide.md','\n'.join(lines))
file=OUT/'README.md';write(file,file.read_text().replace('本庫把現有的16篇資料整理為統一分類；篇首提要和六組主題比較為本次重新整合。','第一層是16篇概要、48張重新整合的核心知識卡及六組主題比較；第二層才是完整字詞、解釋與例證。'))

# Source anchors for the authored synthesis are independent of question backlinks.
clean_quote=lambda text:re.sub(r'[^\u3400-\u9fff]','',text)
card_review=[]
for ci,g in enumerate(guide['chapters']):
    for card in g['cards']:
        matches=[f'$[{ci}].pages[{pi}].blocks[{bi}]' for pi,page in enumerate(source[ci]['pages'])
                 for bi,block in enumerate(page['blocks']) if block[0]=='annot' and clean_quote(card['quote']) in clean_quote(block[1])]
        if not matches:raise ValueError('Core-card quote missing from original text: '+card['quote'])
        card_review.append({'chapterId':g['id'],'title':card['title'],'quote':card['quote'],'sourcePaths':matches,
                            'review':'編輯對照現有原文、篇章總覽及串連，核對概括條件、解釋界線與易錯點；非教師獨立審定。'})
dump(OUT/'editorial/review.json',{'cards':card_review,'comparisonReview':'六組比較按共同角度與篇章不同目的整合，屬編輯複習框架，不冒充官方答案。'})
