"""Generate a standalone filterable review report. Candidate labels never change bank status."""
import argparse
import html
from collections import Counter
from common import *
from run_batch import previous_results

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--run',default='runs/2026-09-23-v2');args=ap.parse_args();out=HERE/args.run
    records=read(out/'records.json');references=read(out/'reference-set.json')['records'];ref={r['id']:r for r in references}
    raw=previous_results(out/'raw-results.jsonl');evaluation=read(out/'evaluation.json');manifest=read(out/'manifest.json')
    ledger=[]
    for r in records:
        q=r['question'];author=ref.get(r['id'])
        model={stage:raw.get(r['id']+'/'+stage) for stage in ['student','review']+['option:'+c['id'] for c in q['choices']]}
        row={**r,'authorReview':author,'modelResults':model,'finalDecision':None,
             'semanticReview':'author-sample-reviewed' if author else 'pending',
             'publicationStatus':'unchanged; not approved by this report',
             'candidateDisposition':author['decision'] if author else 'pending',
             'choiceReviews':author['choiceReviews'] if author else r['choiceReviews']}
        ledger.append(row)
    write(out/'review-ledger.json',ledger)
    summary={'bankSha256':manifest['bankSha256'],'questions':len(records),'options':sum(len(r['question']['choices']) for r in records),
       'wrongOptions':sum(len(r['question']['choices'])-1 for r in records),'authorReviewedQuestions':len(references),
       'authorReviewedOptions':sum(len(r['choiceReviews']) for r in references),'semanticPending':len(records)-len(references),
       'ruleFlags':dict(Counter(f for r in records for f in r['ruleFlags'])),
       'candidateDispositions':dict(Counter(r['decision'] for r in references)),
       'liveBankUnchanged':filehash(BANK)==manifest['bankSha256'],
       'rawCallStatuses':dict(Counter(v['status'] for k,v in raw.items() if '/probe-' not in k)),
       'probeCallStatuses':dict(Counter(v['status'] for k,v in raw.items() if '/probe-' in k)),
       'adoption':{'semanticQuality':'disabled_for_full_bank_decisions','reason':'pilot agreement is insufficient; no model label can approve, remove or grade a question'},
       'notPerformed':['full-bank source-reading','teacher validation','student trial','live bank/app changes','deployment','current conversation native tool reload']}
    write(out/'summary.json',summary)
    labels={'core':'核心保留候選','specialist':'專項保留候選','revise-options':'改錯項','revise-explanation':'改解析','revise-material':'改材料','hold-source':'待補證','pending':'待逐義審讀'}
    cards=[]
    for row in ledger:
        q=row['question'];a=row['authorReview'];status=row['candidateDisposition']
        paragraphs=[]
        for c in q['choices']:
            review=next((v for v in (a or {}).get('choiceReviews',[]) if v['id']==c['id']),None)
            note=review['reason'] if review else '尚未逐義審讀；不能由模板或長度推定錯項無效。'
            rating=review['attraction'] if review else 'pending'
            raw_option=raw.get(q['id']+'/option:'+c['id'],{})
            model_label=raw_option.get('result',{}).get('answers',{}).get('attraction',{}).get('choice',raw_option.get('status','not-run'))
            paragraphs.append('<li><b>'+html.escape(c['id'].upper())+(' · 原題正解' if c['id']==q['answerId'] else '')+'</b> '+html.escape(c['text'])+
                '<p>'+html.escape(note)+'</p><small>作者吸引點標記：'+html.escape(rating)+'；Laya：'+html.escape(model_label)+'（非採納結論）</small></li>')
        src=q['source'];source_label=f"PDF {src.get('pdfPage')} / 印刷 {src.get('printedPage')} / {src.get('blockPath')}"
        badges=' · '.join(row['ruleFlags']) or '未命中這組字串規則，不代表品質通過'
        content=('<p class="note">'+html.escape(a['reason'] if a else '只有結構／規則記錄；內容審核待辦。')+'</p>'+
            '<blockquote>'+html.escape(q.get('quote','') or '題面不展示原文')+'</blockquote><ol>'+''.join(paragraphs)+'</ol>'+
            '<details><summary>原題解析及來源</summary><p>'+html.escape(q.get('explanation',''))+'</p><p>'+html.escape(source_label)+'</p><p>'+html.escape(src.get('excerpt') or src.get('anchor') or '')+'</p></details>'+
            '<p class="flags">規則線索：'+html.escape(badges)+'</p>')
        cards.append('<details class="item" data-status="'+status+'" data-reviewed="'+('yes' if a else 'no')+'"><summary><span>'+html.escape(labels.get(status,status))+'</span> '+html.escape(q['id'])+' · '+html.escape(q['stem'])+'</summary>'+content+'</details>')
    tables=[]
    metric_names={'student/operation':'主要考查操作','review/set_strength':'整組錯項效力','option/attraction':'逐個錯項吸引力'}
    for metric,groups in evaluation['metrics'].items():
        h=groups['holdout'];tables.append('<tr><td>'+html.escape(metric_names[metric])+'</td><td>'+str(h['agreement'])+' / '+str(h['total'])+'</td><td>'+str(h['completedCalls'])+'</td><td>'+str(h['majorityBaselineAgreement'])+' / '+str(h['total'])+'</td></tr>')
    template='''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Laya 題庫篩選試驗</title>
<style>body{font:17px/1.65 system-ui,sans-serif;background:#f6f4ef;color:#252d32;max-width:1080px;margin:auto;padding:28px}h1{font-size:30px}section,.item{background:white;border:1px solid #d8ddd8;border-radius:10px;padding:18px;margin:14px 0}summary{cursor:pointer}summary span{color:#246348;font-weight:700}small,.flags{color:#596368}.note{border-left:4px solid #dba94c;padding-left:12px}blockquote{white-space:pre-wrap;border-left:3px solid #a9b9b0;margin:16px 0;padding-left:14px}li{margin:18px 0}li p{margin:6px 0}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:9px;border-bottom:1px solid #ddd}input,select{font:inherit;padding:8px;max-width:100%;margin:5px}input{width:340px}.hidden{display:none}.warning{background:#fff1d6;padding:14px;border-radius:7px}code{word-break:break-all}</style>
<h1>Laya 接入與題庫篩選試驗</h1><p>2026-09-23 · 題庫 2026.09.22.1 · 原題與歷史作答未改</p>
<p class="warning">Laya 已能在 GPU 運行，但本次語義篩選評測不足以支持全庫准入／淘汰。模型標記只作實驗記錄；下列作者審读也是 AI 自檢，沒有真人教師或學生驗收。</p>
<section><h2>覆蓋與狀態</h2><p>2,134 題／8,536 選項已建結構及來源定位清單。60 題／240 選項有作者具體審讀，其中180個錯項；其餘2,074題待逐義審讀。逐項吸引點是設計假設，非實測誘答率。</p><p>兩項目配置與獨立MCP實際推理已驗證；本對話原生工具列表仍需重新載入驗收。</p></section>
<section><h2>預留40題：與來源審讀標記的一致情況</h2><table><tr><th>維度</th><th>一致／全樣本</th><th>成功返回數</th><th>總猜調整集最多類別</th></tr>__TABLE__</table><p>棄判及未返回亦保留在全樣本分母。三個錯項屬同一道題，不是獨立學生樣本。這不是教師金標準確率。</p></section>
<section><h2>逐題與逐選項</h2><label>搜尋 <input id="search" placeholder="題號、篇名、錯項內容"></label><label>範圍 <select id="scope"><option value="reviewed">60題已審讀</option><option value="pending">待逐義審讀</option><option value="all">全庫記錄</option><option value="revise-options">需要改錯項</option><option value="revise-material">需要改材料</option><option value="hold-source">待補證</option></select></label><p id="count"></p></section>
<div id="items">__CARDS__</div><script>const items=[...document.querySelectorAll('.item')],search=document.querySelector('#search'),scope=document.querySelector('#scope');function filter(){let n=0;const q=search.value.toLowerCase(),s=scope.value;for(const el of items){const ok=(s==='all'||s==='reviewed'&&el.dataset.reviewed==='yes'||s==='pending'&&el.dataset.reviewed==='no'||el.dataset.status===s)&&el.textContent.toLowerCase().includes(q);el.classList.toggle('hidden',!ok);if(ok)n++;}document.querySelector('#count').textContent='顯示 '+n+' 題';}search.addEventListener('input',filter);scope.addEventListener('change',filter);filter();</script></html>'''
    (out/'report.html').write_text(template.replace('__TABLE__',''.join(tables)).replace('__CARDS__',''.join(cards)),encoding='utf-8')
    print(json.dumps(summary,ensure_ascii=False))

if __name__=='__main__':main()
