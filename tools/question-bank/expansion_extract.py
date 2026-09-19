import json,pathlib
from pypdf import PdfReader
root=pathlib.Path(r'D:\DSE中文甲部知识库\10_输出成品\文言原文留白_2026-09-14')
pages=[p.extract_text() for p in PdfReader(root/'文言詩詞_十六篇復習書_附修辭與寫作手法.pdf').pages]
pathlib.Path('tools/question-bank/expansion-pdf-pages.json').write_text(json.dumps(pages,ensure_ascii=False),encoding='utf-8')
print(f'Extracted {len(pages)} actual PDF pages without changing source files.')
