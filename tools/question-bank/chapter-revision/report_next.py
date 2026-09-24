"""Export a full chapter from its frozen patch, including answer-free student copy."""
import html,json,sys,statistics
from apply_chapter import HERE,read,apply_chapter,apply_sequence
d=(HERE/sys.argv[1]).resolve();assert d.is_relative_to(HERE) and d!=HERE
base=read(d/'baseline-bank.json');after,s=apply_chapter(base['questions'],d)
live=read(HERE.parents[2]/'web-study/content/bank.json');current,total=apply_sequence(read(HERE/'baseline-bank.json')['questions'])
assert current==live['questions'] and total==live['chapterRevisionSummary']
title=next(e['title'] for e in base['essays'] if e['id']==s['essayId'])
qs=[q for q in after if s['essayId'] in q['essayIds']];old={q['id']:q for q in base['questions']};esc=html.escape
student=[f'# 《{title}》全篇練習\n\n自編練習；依所附復習書編寫。\n'];teacher=[f'# 《{title}》答案與解析\n\n{len(qs)}題逐題作者自檢；非獨立盲審、教師審定或學生實測。\n'];cards=[]
for n,q in enumerate(qs,1):
 student.append(f"## {n}. {q['stem']}\n\n{q['quote']}\n\n"+'\n'.join(f"- {c['id'].upper()}. {c['text']}" for c in q['choices'])+'\n')
 teacher.append(f"## {n}. {q['stem']}\n\n題號：{q['id']}；答案：{q['answerId'].upper()}\n\n{q['explanation']}\n\n"+'\n'.join(f"- {c['id'].upper()}. {c['text']}：{c['explanation']}" for c in q['choices'])+f"\n\n來源：PDF物理頁{q['source']['pdfPage']}／印頁{q['source']['printedPage']}；`{q['source']['blockPath']}`\n")
 rows=''.join(f"<tr><th>{c['id'].upper()}{' ✓' if c['id']==q['answerId'] else ''}</th><td>{esc(a['text'])}</td><td>{esc(c['text'])}</td><td>{esc(c['explanation'])}</td></tr>" for a,c in zip(old[q['id']]['choices'],q['choices']))
 cards.append(f"<article id='{esc(q['id'])}'><h2>{n}. {esc(q['stem'])}</h2><small>{esc(q['id'])} · PDF物理頁{q['source']['pdfPage']}</small><blockquote>{esc(q['quote'])}</blockquote><details><summary>原解析</summary><p>{esc(old[q['id']]['explanation'])}</p></details><p><b>現解析：</b>{esc(q['explanation'])}</p><table><tr><th>項</th><th>原選項</th><th>現選項</th><th>逐項理由</th></tr>{rows}</table></article>")
(d/'student-questions.md').write_text('\n'.join(student),encoding='utf-8');(d/'teacher-explanations.md').write_text('\n'.join(teacher),encoding='utf-8')
css='body{max-width:1100px;margin:30px auto;padding:0 18px;font:17px/1.8 system-ui;color:#202a36;background:#f7f8fa}article{background:white;border:1px solid #d5dce3;border-radius:12px;padding:20px;margin:24px 0}h2{font-size:21px}blockquote{white-space:pre-wrap;border-left:4px solid #7993a9;padding:10px}table{border-collapse:collapse;table-layout:fixed;width:100%}td,th{border:1px solid #d5dce3;padding:8px;vertical-align:top;overflow-wrap:anywhere}th:first-child{width:28px}summary{cursor:pointer}small{color:#5b697a}'
intro=f"<h1>《{esc(title)}》全篇逐題修訂</h1><p>{len(qs)}題重寫解析與逐項理由；{s['optionTextChangedQuestions']}題修改{s['changedOptionTexts']}個選項文字；{s['stemChanged']}題補題幹。版本{s['version']}，本地未部署。</p><p>審核方式：作者逐題來源核對與自檢。未作獨立盲審、教師審定或學生試做。題目ID、答案ID和記憶單元保留，歷史作答未改。</p>"
(d/'report.html').write_text("<!doctype html><html lang='zh-Hant'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>"+esc(title)+"逐題修訂</title><style>"+css+'</style>'+intro+''.join(cards)+'</html>',encoding='utf-8')
metrics={'questions':len(qs),'explanationsChanged':sum(q['explanation']!=old[q['id']]['explanation'] for q in qs),'choiceReasonsChanged':sum(a['explanation']!=b['explanation'] for q in qs for a,b in zip(old[q['id']]['choices'],q['choices'])),'explanationMedianLengthBefore':statistics.median(len(old[q['id']]['explanation']) for q in qs),'explanationMedianLengthAfter':statistics.median(len(q['explanation']) for q in qs),'scope':'字數記錄不代表語義品質或學生理解度驗收。'}
(d/'content-metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(metrics,ensure_ascii=False))
