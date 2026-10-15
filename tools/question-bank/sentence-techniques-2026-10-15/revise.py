"""Apply only the standalone rhetoric revision, retaining every other question verbatim.

Run from any directory with Python 3. No network or external models are used.
"""
import copy
import hashlib
import json
from pathlib import Path

from examples import SECTIONS

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
BANK = ROOT / 'web-study/content/bank.json'
VERSION = '2026.10.15.1'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def write(path, data):
    text = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    # Preserve the release bank's original CRLF formatting for a reviewable diff.
    path.write_bytes(text.replace('\n', '\r\n').encode() if path == BANK else text.encode())


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


# Short diagnostic criteria are shown only after submission. They explain why
# each distractor differs from the concrete evidence, rather than just saying "wrong".
CRITERIA = {
    '比喻': '以不同事物的相似點設喻',
    '借代': '依部分與整體、服飾與人物等關聯，以一個名稱代指另一對象',
    '反問': '以問句表達已確定的判斷，不等待作答',
    '反語': '表面說法與實際意思相反',
    '設問': '先提出問題，再自行回答或引出下文',
    '引用': '直接援用已有語句或材料',
    '通感': '把一種感官的感覺轉寫成另一種感官的感覺',
    '用典': '借古代故事、人物或典故寄意',
    '呼告': '向人、物或抽象對象直接呼喚說話',
    '誇張': '有意放大或縮小事物特徵，超出正常實況',
    '排比': '至少三個結構相似、語氣一致的單位並列',
    '層遞': '按程度、範圍或層次逐級推進',
    '頂真': '上句末尾的詞語接到下句開頭',
    '對偶': '兩個字數相等、結構相應的語句對稱排列',
    '疊字': '同一個字緊接重疊成詞',
    '疊韻': '兩字韻母相同；須按題目指定讀音判斷',
    '雙聲': '兩字聲母相同；須按題目指定讀音判斷',
}


def rationale(label, evidence, correct):
    if correct:
        return evidence
    criterion = next((v for k, v in CRITERIA.items() if label.startswith(k)), None)
    if '、' in label:
        return f'此項把兩句判作「{label}」，與例句的對應關係不符。{evidence}'
    return (f'「{label}」的判斷依據是{criterion}。' if criterion else f'本例不符合「{label}」的判斷。') + f'本題須看指定部分：{evidence}'


def main():
    bank = read(BANK)
    baseline = read(HERE / 'baseline.json')
    old_appendix = {q['id']: q for q in read(HERE / 'baseline-appendix.json')}
    originals = read(HERE / 'baseline-dse-originals.json')
    source = read(ROOT / 'web-study/content/sources/appendix-content.json')
    revised = {}
    for section_index, text in enumerate(SECTIONS):
        for row_index, line in enumerate(text.strip().splitlines()):
            quote, stem, labels, explanation = line.split('|')
            labels = labels.split('~')
            assert len(labels) == len(set(labels)) == 4
            qid = f'full-d-{section_index:02d}-{row_index:02d}'
            old = old_appendix[qid]
            assert not old['essayIds'] and 'appendix' in old['tags']
            q = copy.deepcopy(old)
            q.update(version=old['version'] + 1, quote=quote, stem=stem,
                     explanation=explanation, summary=explanation,
                     assessmentType='修辭例句辨識', tags=['appendix', 'sentence-technique'],
                     misconception='須根據題目指定的句子及表達關係判斷，不能只憑單一字眼。',
                     provenance={'kind': 'authored', 'material': '自編修辭辨識練習；引句已在材料內註明出處'},
                     revisionReason='依使用者要求，以具體例句辨識修辭，取代定義辨識；保留原知識點及來源。')
            wrong = iter(labels[1:])
            for choice in q['choices']:
                correct = choice['id'] == q['answerId']
                choice['text'] = labels[0] if correct else next(wrong)
                choice['explanation'] = rationale(choice['text'], explanation, correct)
            # Prior agent review applies to the baseline, not these new examples.
            q['review'] = {'method': 'source-review-and-author-self-check', 'date': '2026-10-15',
                          'author': 'Codex', 'disposition': 'revise',
                          'scope': '逐題對照原附錄概念並自檢例句、答案及干擾項；未經教師或學生驗收。',
                          'evidence': source['sections'][section_index]['rows'][row_index][1]}
            revised[qid] = q
    assert len(revised) == 30
    assert {q['id'] for q in bank['questions']} == set(baseline['questionHashes'])
    for q in bank['questions']:
        if q['id'] not in revised:
            assert digest(q) == baseline['questionHashes'][q['id']], f'Unrelated item changed: {q["id"]}'
    bank['questions'] = [revised.get(q['id'], q) for q in bank['questions']]
    assert [q for q in bank['questions'] if q.get('provenance', {}).get('kind') == 'dse-original'] == originals
    bank['version'] = VERSION
    bank['sentenceTechniqueRevision'] = {'version': VERSION, 'revised': 30,
        'scope': '只改獨立附錄的24道修辭題及6道易混修辭題；保留文言文、古詩、其他寫作題與27道DSE原題。',
        'baselineVersion': baseline['version'], 'independentReview': 'not-run', 'studentTrial': 'not-run'}
    write(BANK, bank)
    write(HERE / 'release-manifest.json', {'version': VERSION, 'questions': len(bank['questions']),
        'revisedIds': list(revised), 'unchangedQuestions': len(bank['questions']) - len(revised),
        'originalsPreserved': len(originals), 'bankSha256': hashlib.sha256(BANK.read_bytes()).hexdigest(),
        'sourceSha256': hashlib.sha256((ROOT / 'web-study/content/sources/appendix-content.json').read_bytes()).hexdigest(),
        'review': 'author-self-check; independent teacher/student review not run'})
    print(f'Revised {len(revised)} standalone rhetoric questions; preserved {len(originals)} DSE originals and all chapter questions.')


if __name__ == '__main__':
    main()
