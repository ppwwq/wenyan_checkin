"""Add authored cross-essay word comparisons without changing reading cards."""
import copy
import hashlib
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
VERSION = '2026.09.22.1'


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def norm(text):
    return re.sub(r'[^\u3400-\u9fffA-Za-z]', '', text)


def add_confusable_questions(questions, comparisons):
    specs = read(HERE / 'items.json')
    source = read(ROOT / 'web-study/content/sources/student-content.json')
    pages = read(ROOT / 'tools/question-bank/pdf-pages.json')
    by_id = {q['id']: q for q in questions}
    groups = {g['id']: g for g in comparisons}
    additions = []
    for spec in specs:
        group = groups[spec['group']]
        if group['status'] != 'reviewed' or len(spec['items']) != 2:
            raise ValueError('Only reviewed, two-use comparisons are allowed')
        items = [group['items'][index] for index in spec['items']]
        originals = [by_id[item['questionId']] for item in items]
        essays = sorted({essay for q in originals for essay in q['essayIds']})
        if len(essays) != 2 or any(len(q['essayIds']) != 1 for q in originals):
            raise ValueError('Cross-essay word questions must involve exactly two essays')
        evidence = []
        for item, original, snippet in zip(items, originals, spec['snippets'], strict=True):
            if original['status'] != 'reviewed' or original.get('active') is False:
                raise ValueError('Inactive source question: ' + original['id'])
            if norm(snippet) not in norm(original['quote']):
                raise ValueError('Snippet absent from original context: ' + snippet)
            location = original['source']
            ci, pi, bi, *tail = map(int, re.findall(r'\[(\d+)\]', location['blockPath']))
            block = source[ci]['pages'][pi]['blocks'][bi]
            for index in tail:
                block = block[index]
            actual = pages[location['pdfPage'] - 1]
            if (norm(item['meaning']) not in norm(json.dumps(block, ensure_ascii=False))
                    or norm(item['meaning']) not in norm(actual)
                    or norm(original['quote']) not in norm(actual)):
                raise ValueError('Comparison meaning/context no longer matches source: ' + original['id'])
            evidence.append({**copy.deepcopy(location), 'essayId': original['essayIds'][0],
                             'questionId': original['id'], 'quote': original['quote'],
                             'meaning': item['meaning'], 'snippet': snippet})
        qid = 'confusable-' + spec['key']
        # Stable hash order prevents a fixed correct-answer position across items.
        ordered = sorted(enumerate(spec['choices']), key=lambda pair:
                         hashlib.sha256(f'{spec["key"]}/{pair[1][0]}'.encode()).hexdigest())
        choices = [{'id': chr(97 + i), 'text': value[0], 'explanation': value[1]}
                   for i, (_, value) in enumerate(ordered)]
        if len(choices) != 4 or len({c['text'] for c in choices}) != 4:
            raise ValueError('Four distinct choices required: ' + qid)
        answer = next(chr(97 + i) for i, (index, _) in enumerate(ordered) if index == 0)
        quote = '\n\n'.join(label + '：' + q['quote'] for label, q in zip('甲乙', originals))
        question = {
            'id': qid, 'version': 1, 'memoryId': qid, 'essayIds': essays,
            'ability': 'vocabulary', 'responseFormat': 'single-choice',
            'quote': quote, 'target': group['target'], 'targetStart': quote.index(group['target']),
            'stem': f'比較甲「{spec["snippets"][0]}」與乙「{spec["snippets"][1]}」的「{group["target"]}」，哪項辨析符合兩處語境？',
            'choices': choices, 'answerId': answer, 'explanation': spec['choices'][0][1],
            'source': copy.deepcopy(evidence[0]), 'relatedSources': evidence,
            'status': 'reviewed', 'active': True, 'tags': ['comparison', 'confusable'],
            'comparisonGroupId': group['id'],
            'comparisonItemIndices': spec['items'],
            'summary': spec['objective'], 'assessmentType': 'comparison',
            'review': {
                'method': 'author-self-check', 'date': '2026-09-22',
                'status': 'ready-for-trial', 'primaryObjective': spec['objective'],
                'cognitiveDemand': 'integration', 'empiricalValidation': 'not-run',
                'teacherReview': 'not-run',
                'gates': {
                    'G1': '兩方原文及詞義逐一與原書區塊、PDF頁文字核對；保留雙方定位。',
                    'G2': '依題示兩處語境檢查唯一答案；「天下歸仁」沿用所供原書稱讚、認同之解。',
                    'G3': '錯項分別測移動義、精神同道、評價義或動作主體的誤接；逐項附排除證據。',
                    'G4': '須同時核對甲乙語境；選項使用平行敘述，不把正解固定在同一位置。',
                    'G5': '新題號和記憶單元；檢查選項、正解及雙篇範圍；對照卡與旧題不變。'
                },
                'distractorAudit': [
                    {'optionId': c['id'], 'evidenceType': 'hypothesis',
                     'attraction': '把其他語境可成立的歸字詞義或人物關係套入本句。',
                     'misreadingAndRefutation': c['explanation'],
                     'sourceRefs': [e['blockPath'] for e in evidence],
                     'followUp': '重讀甲乙，分別找出歸的主體、對象及前文所談內容。'}
                    for c in choices if c['id'] != answer
                ]
            }
        }
        if qid in by_id and by_id[qid] != question:
            raise ValueError('Existing comparison differs; review and version it explicitly: ' + qid)
        if qid not in by_id:
            additions.append(question)
    return questions + additions, {'version': VERSION, 'questions': len(specs),
                                   'scope': '現有易混詞對照的雙篇辨義題；對照頁及原題不變。'}


if __name__ == '__main__':
    path = ROOT / 'web-study/content/bank.json'
    bank = read(path)
    bank['questions'], summary = add_confusable_questions(bank['questions'], bank['comparisons'])
    bank['version'] = summary['version']
    bank['confusableSummary'] = summary
    path.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'totalQuestions': len(bank['questions']), **summary}, ensure_ascii=False))
