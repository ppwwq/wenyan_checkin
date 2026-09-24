"""Generate a self-contained local review report, without uploading or previewing data."""
import collections, html, json, hashlib
from pathlib import Path
from apply_quality import read, apply_quality
HERE=Path(__file__).resolve().parent
def esc(v):return html.escape(str(v))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def render(q):
 return '<p class="material">'+esc(q.get('quote',''))+'</p><p><b>'+esc(q['stem'])+'</b></p><ol type="A">'+''.join('<li>'+esc(c['text'])+(' <b>〔答案〕</b>' if c['id']==q['answerId'] else '')+'<p class="reason">'+esc(c['explanation'])+'</p></li>' for c in q['choices'])+'</ol><p>'+esc(q.get('summary',''))+'</p><p class="material">'+esc(q['explanation'])+'</p>'
def main():
 base=read(HERE/'baseline-bank.json');before={q['id']:q for q in base['questions']};questions,summary=apply_quality(base['questions']);after={q['id']:q for q in questions}
 manifest=read(HERE/'release-manifest.json');records=[]
 livepath=HERE.parents[2]/'web-study/content/bank.json';live=read(livepath)
 if live['questions']!=questions or live['version']!=manifest['version']:raise ValueError('Live bank does not match reviewed build')
 write(HERE/'last-build.json',{'bankSha256':hashlib.sha256(livepath.read_bytes()).hexdigest(),'version':live['version']})
 for entry in manifest['packs']:
  review={r['id']:r for r in read(HERE/entry['review'])['records']}
  for r in read(HERE/entry['file'])['records']:records.append({**r,'reviewMethod':'逐題交叉審稿','reviewNote':review[r['id']]['notes']})
 for entry in manifest.get('authorPacks',[]):
  samples={r['id']:r for r in read(HERE/entry['audit'])['records']}
  for r in read(HERE/entry['file'])['records']:
   note=('抽樣覆核：'+samples[r['id']]['notes']) if r['id'] in samples else '本題有作者逐題審稿記錄；未被抽中作另一人覆核。'
   records.append({**r,'reviewMethod':'作者改稿＋分層抽檢','reviewNote':note})
 reused=[r for entry in manifest.get('reusePacks',[]) for r in read(HERE/entry['file'])['records']]
 reused_ids={r['id'] for r in reused}
 if len(reused_ids)!=len(reused) or reused_ids.intersection(manifest['reviewedIds']):raise ValueError('Reuse IDs overlap or repeat')
 changed=collections.Counter();rows=[]
 labels={'revise':'已修改','retain':'審後保留','hold':'待來源・暫停新抽題'}
 for r in records:
  old=before[r['id']];new=after[r['id']]
  for field in ['stem','quote','choices','explanation','summary','source','active','practiceGroup']:
   if old.get(field)!=new.get(field):changed[field]+=1
  if [(x['id'],x['text']) for x in old['choices']]!=[(x['id'],x['text']) for x in new['choices']]:changed['optionText']+=1
  source=''.join('<li>PDF '+esc(e['pdfPage'])+' · '+esc(e['blockPath'])+'<p>'+esc(e['quote'])+'</p><p>'+esc(e['claim'])+'</p></li>' for e in r['evidence'])
  audit=''.join('<li><b>'+esc(a['id'].upper())+'</b> '+esc(a['attraction'])+'<br>判斷：'+esc(a['misreading'])+'<br>依據：'+esc(a['refutation'])+'<br>補救：'+esc(a['followUp'])+'</li>' for a in r['optionAudit'])
  rows.append('<article data-decision="'+r['decision']+'"><h2>'+esc(r['id'])+' · '+labels[r['decision']]+'</h2><p>'+esc(r['reason'])+'</p><p>訓練目標：'+esc(r['objective'])+'</p><div class="pair"><section><h3>原題 v'+esc(old['version'])+'</h3>'+render(old)+'</section><section><h3>修訂後 v'+esc(new['version'])+'</h3>'+render(new)+'</section></div><details><summary>來源與逐項審稿</summary><ul>'+source+'</ul><ol>'+audit+'</ol><p>'+esc(r['reviewMethod'])+'：'+esc(r['reviewNote'])+'</p></details></article>')
 pending=[q['id'] for q in questions if q['id'] not in set(manifest['reviewedIds'])|set(manifest.get('authorReviewedIds',[]))|reused_ids]
 result={'summary':summary,'changedFields':dict(changed),'reusedPriorReviewIds':sorted(reused_ids),'pendingIds':pending,'teacherReview':'not-run','studentTrial':'not-run','browserVisualCheck':'not-run','deployment':'not-run'}
 write(HERE/'progress.json',result);write(HERE/'review-ledger.json',records)
 page='''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>題目選項改前改後與審核</title><style>body{font:17px/1.8 system-ui;background:#f5f4ef;color:#213a30;margin:24px auto;max-width:1400px;padding:0 18px}article{background:white;border:1px solid #ddd;border-radius:12px;padding:20px;margin:20px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:24px}.pair section{min-width:0}.material{white-space:pre-wrap}.reason{color:#52635b;font-size:.94em}li{margin:8px 0}input,select{padding:12px;font:inherit;max-width:100%;box-sizing:border-box}h2{font-size:1.2em;overflow-wrap:anywhere}summary{cursor:pointer}button{font:inherit}#status{position:sticky;top:0;background:#f5f4ef;padding:12px 0}@media(max-width:800px){.pair{grid-template-columns:1fr}}@media print{#status{display:none}article{break-inside:avoid}}</style><h1>題目與選項優化：改前改後</h1>'''
 page+='<p>本輪逐題交叉審查 '+str(summary['reviewed'])+' 題；作者改稿並依層抽檢 '+str(summary.get('revisedAuthorReviewed',0))+' 題；沿用對應舊審稿記錄 '+str(len(reused_ids))+' 題；尚待處置 '+str(len(pending))+' 題。已修改 '+str(summary['revised'])+'，審後保留 '+str(summary['retained'])+'，待來源 '+str(summary['held'])+'；其中 '+str(changed['optionText'])+' 題改了選項文字。</p><p>沿用舊記錄表示題目與既有記錄對齊並經規則核查，不代表本輪重新逐題審讀或交叉審稿。作者改稿、抽樣覆核和逐題交叉審稿分開標記；程式另查來源、版本及結構。非真人教師終審或學生實測；原題與歷史快照保留。Laya未參與。</p><div id="status"><input id="search" aria-label="搜尋題號或內容" placeholder="搜尋題號或內容"><select id="filter" aria-label="處置"><option value="">所有本輪逐題審題</option><option value="revise">已修改</option><option value="retain">審後保留</option><option value="hold">待來源</option></select> <span id="count"></span></div>'
 if reused:
  page+='<details><summary>沿用舊審稿記錄的 '+str(len(reused))+' 題（題面未改）</summary><p>此清單只記錄沿用，未計作本輪逐題交叉審稿。</p><ul>'+''.join('<li>'+esc(r['id'])+' · 原審稿：'+esc(before[r['id']].get('review',{}).get('method','未標明'))+'</li>' for r in reused)+'</ul></details>'
 page+=''.join(rows)+'''<script>const cards=[...document.querySelectorAll('article')],search=document.querySelector('#search'),filter=document.querySelector('#filter');function show(){let n=0;for(const c of cards){const ok=(!filter.value||c.dataset.decision===filter.value)&&c.textContent.toLowerCase().includes(search.value.trim().toLowerCase());c.hidden=!ok;if(ok)n++;}document.querySelector('#count').textContent=n+' 題';}search.addEventListener('input',show);filter.addEventListener('change',show);show();</script></html>'''
 (HERE/'report.html').write_text(page,encoding='utf-8')
 print(json.dumps({'summary':summary,'changedFields':dict(changed)},ensure_ascii=False))
if __name__=='__main__':main()
