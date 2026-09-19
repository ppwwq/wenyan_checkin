import json, re, sys
from pathlib import Path
from pypdf import PdfReader

sys.stdout.reconfigure(encoding='utf-8')
SOURCE = Path(r'D:\DSE中文甲部知识库\10_输出成品\文言原文留白_2026-09-14')
ROOT = Path(__file__).resolve().parents[2]
data = json.loads((SOURCE / '學生內容.json').read_text(encoding='utf-8-sig'))
cache = ROOT / 'tools/question-bank/pdf-pages.json'
if not cache.exists():
    pages = [p.extract_text() for p in PdfReader(SOURCE / '文言詩詞_十六篇復習書_附修辭與寫作手法.pdf').pages]
    cache.write_text(json.dumps(pages, ensure_ascii=False), encoding='utf-8')
else:
    pages = json.loads(cache.read_text(encoding='utf-8'))

if __name__ == '__main__':
    for i in [0, 8, 10]:
        print('\n', i, data[i]['name'])
        for j, p in enumerate(data[i]['pages']):
            if i == 10 or (i == 8 and j > 5) or (i == 0 and j > 16):
                print(j, p['title'])
                for k, b in enumerate(p['blocks']):
                    if b[0] in ['text', 'table', 'head']: print(k, str(b)[:1400])
