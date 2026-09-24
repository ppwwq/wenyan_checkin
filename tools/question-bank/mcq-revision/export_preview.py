"""Write a read-only before/after sample from the actual released bank."""
import html,json,sys
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
D=Path(__file__).parent;ROOT=D.parents[2]
old=json.loads((D/'baseline-bank.json').read_text(encoding='utf-8-sig'))
new=json.loads((ROOT/'web-study/content/bank.json').read_text(encoding='utf-8-sig'))
before={q['id']:q for q in old['questions']}
changed=[q for q in new['questions'] if q!=before[q['id']] and q['essayIds']]
titles={e['id']:e['title'] for e in new['essays']}
priority=['full-c-13-10-01-03','full-c-14-12-01-04','full-c-14-12-01-03',
 'full-c-15-03-00-07','full-c-15-05-00-06','full-c-15-12-01-05','full-c-16-09-03-03',
 'full-c-01-00-01-02','full-c-16-09-01-02','full-c-12-00-07-80',
 'full-b-06-15-00-8','full-a-e05-p27-b02-x020','q-e06-exp-007']
selected=[q for ident in priority for q in changed if q['id']==ident]
for essay in new['essays']:
 for ability in ['theme','technique','meaning']:
  candidates=[q for q in changed if q['essayIds'][0]==essay['id'] and q['ability']==ability and q not in selected]
  if candidates:selected.append(candidates[0])
esc=lambda s:html.escape(str(s)).replace('\n','<br>')
def question(q):
 quote='<blockquote>'+esc(q['quote'])+'</blockquote>' if q['quote'] else ''
 options='<ol type="A">'+''.join('<li>'+esc(c['text'])+'</li>' for c in q['choices'])+'</ol>'
 answer=next(c for c in q['choices'] if c['id']==q['answerId'])
 feedback='<details><summary>查看答案與辨析</summary><p><b>'+esc(answer['id'].upper())+' · '+esc(answer['text'])+'</b></p><p>'+esc(q['explanation'])+'</p>'+''.join('<p>'+esc(c['id'].upper())+'：'+esc(c['explanation'])+'</p>' for c in q['choices'])+'</details>'
 return quote+'<h3>'+esc(q['stem'])+'</h3>'+options+feedback
cards=[]
for q in selected:
 title='／'.join(titles[e] for e in q['essayIds'])
 cards.append('<article data-essay="'+esc(q['essayIds'][0])+'"><header><h2>'+esc(title)+'</h2><small>'+esc(q['id'])+'</small></header><div class="pair"><section><span class="label">修改前</span>'+question(before[q['id']])+'</section><section><span class="label">修改後</span>'+question(q)+'</section></div><p class="note">'+esc(q.get('revisionReason',''))+'</p></article>')
options='<option value="">全部篇章</option>'+''.join('<option value="'+esc(k)+'">'+esc(v)+'</option>' for k,v in titles.items())
document='''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>指定篇章選擇題・改題對照</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f1ea;color:#262822;font:17px/1.8 system-ui,"Microsoft JhengHei",sans-serif}main{max-width:1280px;margin:auto;padding:32px}h1{font-size:30px;line-height:1.4}h2{font-size:22px;margin:0}h3{font-size:18px;white-space:normal}p{margin:12px 0}.intro{max-width:900px}.bar{position:sticky;top:0;background:#f4f1ea;padding:12px 0;z-index:2}select{font:inherit;padding:8px 16px;border:1px solid #a5aba0;border-radius:6px}article{border:1px solid #d8d9cf;background:white;border-radius:12px;margin:24px 0;overflow:hidden}header{padding:20px 24px;border-bottom:1px solid #ddd}.pair{display:grid;grid-template-columns:1fr 1fr}.pair section{padding:24px;min-width:0}.pair section+section{border-left:1px solid #ddd;background:#fafdf8}.label{font-size:14px;font-weight:700;color:#466247}blockquote{margin:16px 0;padding:12px 16px;border-left:3px solid #bdc8b5;background:#f3f5ef}ol{padding-left:28px}li{margin:12px 0;padding-left:4px}summary{cursor:pointer;color:#315c42;font-weight:600}details{border-top:1px solid #ddd;padding-top:12px}.note{padding:12px 24px;background:#f3f5ef;margin:0;font-size:14px}small{color:#667065;overflow-wrap:anywhere}article[hidden]{display:none}@media(max-width:760px){main{padding:16px}.pair{grid-template-columns:1fr}.pair section+section{border-left:0;border-top:1px solid #ddd}}
</style><main><h1>指定篇章選擇題・改題對照</h1><div class="intro"><p>以下樣本直接取自已合併的本地 App 題庫。保留四選一，重寫問法、干擾項與逐項辨析；仍屬自編辨識練習，並非官方真題或完整書面作答訓練。</p><p>原151道附錄知識題沒有套用另造短文改稿。本頁不涉及個人作答資料，也不代表正式網站已更新。</p><p>題庫版本：'''+esc(new['version'])+'；本頁 '+str(len(selected))+' 題樣本。</p></div><div class="bar"><label>查看篇章 <select id="filter">'+options+'</select></label></div>'+''.join(cards)+'''</main><script>document.querySelector('#filter').addEventListener('change',e=>{for(const a of document.querySelectorAll('article'))a.hidden=Boolean(e.target.value&&a.dataset.essay!==e.target.value)});</script></html>'''
out=Path('D:/DSE中文甲部知识库/11_審查報告/DSE甲部題庫研究_2026-09-20/09_選擇題改題前後對照.html')
out.write_text(document,encoding='utf-8')
print('Exported',len(selected),'actual before/after samples:',out)
