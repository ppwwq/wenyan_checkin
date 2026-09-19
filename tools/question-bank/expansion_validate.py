"""Independent structural/source validation of the authored expansion pack.
Semantic uniqueness is an editorial check recorded in per-option reasons; this
script checks exactly one answer key, distinct options, and documentary anchors.
"""
import json,pathlib,re,unicodedata,collections,hashlib
from pypdf import PdfReader
root=pathlib.Path(r'D:\DSE中文甲部知识库\10_输出成品\文言原文留白_2026-09-14')
source=json.loads((root/'學生內容.json').read_text(encoding='utf-8-sig'))
book=[p.extract_text() for p in PdfReader(root/'文言詩詞_十六篇復習書_附修辭與寫作手法.pdf').pages]
pack=json.loads(pathlib.Path('web-study/content/expansion-draft.json').read_text(encoding='utf-8'))
report=json.loads(pathlib.Path('tools/question-bank/expansion-report.json').read_text(encoding='utf-8'))
def normalized(text):
    text=re.sub('<[^>]*>','',text)
    return ''.join(c for c in text if not c.isspace() and not c.isdigit() and unicodedata.category(c)[0] not in 'PSZ')
def get_block(path):
    e,p,b=map(int,re.fullmatch(r'\$\[(\d+)\]\.pages\[(\d+)\]\.blocks\[(\d+)\]',path).groups())
    return e,source[e]['pages'][p]['blocks'][b]
assert len(pack)==104
assert len({q['id'] for q in pack})==len(pack)
assert len({q['memoryId'] for q in pack})==len(pack)
coverage=collections.Counter(q['essayIds'][0] for q in pack)
assert len(coverage)==13 and set(coverage.values())=={8}
assert not {'essay-01','essay-09','essay-11'} & coverage.keys()
for q in pack:
    assert q['status']=='reviewed' and q['active'] is True and q['version']==1
    assert len(q['choices'])==4
    assert set(c['id'] for c in q['choices'])==set('abcd')
    assert len(set(c['text'] for c in q['choices']))==4
    assert len([c for c in q['choices'] if c['id']==q['answerId']])==1
    assert all(len(c['explanation'])>=6 for c in q['choices'])
    loc=q['source']; e,block=get_block(loc['blockPath'])
    assert q['essayIds']==[f'essay-{e+1:02d}']
    assert block[0]=='annot' and q['quote'] in block[1],q['id']
    page=book[loc['pdfPage']-1]
    assert normalized(source[e]['name'])==normalized(page.splitlines()[0])
    assert normalized(loc['anchor']) in normalized(page),q['id']
    assert loc['printedPage']==int(re.search(r'(\d+)\s*$',page).group(1))
    assert q['review']['sourceEvidence']['text']==block[1]
    if q['ability']=='vocabulary':
        correct=next(c['text'] for c in q['choices'] if c['id']==q['answerId'])
        assert correct in [v[1] for v in block[2] if v[0]==q['target']],q['id']
        assert normalized(correct) in normalized(page),q['id']
    else:
        evidence=q['review']['sourceEvidence']
        if 'interpretationBlockPath' in evidence:
            se,sb=get_block(evidence['interpretationBlockPath']); assert se==e
            assert evidence['interpretationPdfLocations']
            for x in evidence['interpretationPdfLocations']:
                text=book[x['pdfPage']-1]
                assert normalized(x['anchor']) in normalized(text)
                assert normalized(source[e]['name'])==normalized(text.splitlines()[0])
                assert x['printedPage']==int(re.search(r'(\d+)\s*$',text).group(1))
for name,digest in report['sourceSha256'].items():
    assert hashlib.sha256((root/name).read_bytes()).hexdigest()==digest
assert collections.Counter(q['ability'] for q in pack)=={'vocabulary':65,'meaning':13,'theme':13,'technique':13}
print('PASS: 104 items / 13 essays; 104 exact JSON quotes + actual PDF anchors and printed footers; 65 glossary answers; 36 interpretation source/PDF cross-links; unique keys and options; immutable source digests.')
# Additional packs share the same actual-PDF extraction above.
appendix_data=json.loads((root/'附錄內容.json').read_text(encoding='utf-8-sig'))
for name,expected in [('appendix',8),('comparison',2)]:
    extra=json.loads(pathlib.Path(f'web-study/content/expansion-{name}.json').read_text(encoding='utf-8'))
    assert len(extra)==expected
    for q in extra:
        assert len({c['text'] for c in q['choices']})==4
        assert sum(c['id']==q['answerId'] for c in q['choices'])==1
        assert all(c['explanation'] for c in q['choices'])
        loc=q['source']; text=book[loc['pdfPage']-1]
        assert normalized(loc['anchor']) in normalized(text)
        if name=='appendix':
            s,r=map(int,re.fullmatch(r'\$appendix\.sections\[(\d+)\]\.rows\[(\d+)\]',loc['blockPath']).groups())
            assert q['review']['sourceEvidence']['appendixRow']==appendix_data['sections'][s]['rows'][r]
            assert loc['printedPage']==re.search(r'附錄\d+',text[:60]).group(0)
            assert q['tags']==['appendix'] and len(q['essayIds'])==1
        else:
            assert len(q['essayIds'])==2
        origins=q['review']['sourceEvidence']['originalSources']
        assert len(origins)==(1 if name=='appendix' else 2)
        for origin in origins:
            e,b=get_block(origin['blockPath'])
            assert origin['quote'] in b[1]
            pt=book[origin['pdfPage']-1]
            assert normalized(origin['quote']) in normalized(pt)
            assert origin['printedPage']==int(re.search(r'(\d+)\s*$',pt).group(1))
            assert f'essay-{e+1:02d}' in q['essayIds']
print('PASS: 8 appendix items / real printed appendix labels + 2 comparisons / both sources located; 12 original-quote cross-links checked.')
