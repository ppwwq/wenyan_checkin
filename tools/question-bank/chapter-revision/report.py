"""Export all chapter questions and before/after review cards; no external assets."""
import html, json, statistics
from apply_chapter import HERE, read, apply_chapter, apply_sequence, digest
BASE=read(HERE/'baseline-bank.json');questions,summary=apply_chapter(BASE['questions'])
live=read(HERE.parents[2]/'web-study/content/bank.json')
current,cumulative=apply_sequence(BASE['questions'])
assert current==live['questions'] and cumulative==live['chapterRevisionSummary']
old={q['id']:q for q in BASE['questions']}
qs=[q for q in questions if summary['essayId'] in q['essayIds']]
e=html.escape
cards=[];student=['# 《論仁、論孝、論君子》全篇練習\n\n自編練習；來源為所附復習書。\n'];teacher=['# 《論仁、論孝、論君子》答案與解析\n\n266題作者逐項改寫及自檢，未作獨立盲審、教師審定或學生試做。\n']
for i,q in enumerate(qs,1):
 previous=old[q['id']]
 student.append(f"## {i}. {q['stem']}\n\n{q['quote']}\n\n"+'\n'.join(f"- {c['id'].upper()}. {c['text']}" for c in q['choices'])+'\n')
 teacher.append(f"## {i}. {q['stem']}\n\n題號：{q['id']}；答案：{q['answerId'].upper()}\n\n{q['explanation']}\n\n"+'\n'.join(f"- {c['id'].upper()}. {c['text']}：{c['explanation']}" for c in q['choices'])+f"\n\n來源：PDF物理頁 {q['source']['pdfPage']}／印頁 {q['source']['printedPage']}；`{q['source']['blockPath']}`\n")
 changed=any(a['text']!=b['text'] for a,b in zip(previous['choices'],q['choices']))
 rows=''.join(f"<tr><th>{e(c['id'].upper())}{' ✓' if c['id']==q['answerId'] else ''}</th><td>{e(previous['choices'][j]['text'])}</td><td>{e(c['text'])}</td><td>{e(c['explanation'])}</td></tr>" for j,c in enumerate(q['choices']))
 cards.append(f"<article id='{e(q['id'])}' data-changed='{str(changed).lower()}'><h2>{i}. {e(q['stem'])}</h2><small>{e(q['id'])} · 第 {q['source']['pdfPage']} 物理頁 · 選項{'已改' if changed else '逐項檢查後保留'}</small><blockquote>{e(q['quote'])}</blockquote><details><summary>修改前解析</summary><p>{e(previous['explanation'])}</p></details><p><b>現在解析：</b>{e(q['explanation'])}</p><table><thead><tr><th>項</th><th>原選項</th><th>現選項</th><th>現逐項解析</th></tr></thead><tbody>{rows}</tbody></table></article>")
(HERE/'student-questions.md').write_text('\n'.join(student),encoding='utf-8')
(HERE/'teacher-explanations.md').write_text('\n'.join(teacher),encoding='utf-8')
(HERE/'report.html').write_text("<!doctype html><html lang='zh-Hant'><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'><title>論語全篇逐題修訂</title><style>body{font:17px/1.8 system-ui;max-width:1100px;margin:32px auto;padding:0 20px;color:#202a36;background:#f7f8fa}article{background:white;border:1px solid #dae0e8;border-radius:12px;margin:26px 0;padding:22px}h1,h2{line-height:1.4}h2{font-size:21px}blockquote{border-left:4px solid #7993a9;padding:12px;white-space:pre-wrap}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #d5dce3;padding:8px;vertical-align:top;overflow-wrap:anywhere}th:first-child{width:28px}small{color:#5b697a}summary{cursor:pointer}@media(max-width:600px){body{padding:0 10px}article{padding:12px}th,td{padding:5px;font-size:14px}}</style><h1>《論仁、論孝、論君子》全篇逐題修訂</h1><p>266題全部重寫解析及逐項理由；40題修改111個選項文字；2題改題幹，1題修正標亮。版本 2026.09.23.7，本地未部署。</p><p>審核方式：同一作者逐題來源核對與自檢。未作独立盲審、教師審定或學生試做。原題ID、答案ID、記憶單元及歷史作答保持。</p>"+''.join(cards)+'</html>',encoding='utf-8')
metrics={'questions':len(qs),'mainExplanationLengthBefore':{'median':statistics.median(len(old[q['id']]['explanation']) for q in qs)},'mainExplanationLengthAfter':{'min':min(len(q['explanation']) for q in qs),'median':statistics.median(len(q['explanation']) for q in qs),'max':max(len(q['explanation']) for q in qs)},'explanationChanged':sum(old[q['id']]['explanation']!=q['explanation'] for q in qs),'choiceRationaleChanged':sum(a['explanation']!=b['explanation'] for q in qs for a,b in zip(old[q['id']]['choices'],q['choices'])),'scope':'長度僅記錄變化，不是語義品質或學生理解度的驗收標準。'}
(HERE/'content-metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(metrics,ensure_ascii=False))
