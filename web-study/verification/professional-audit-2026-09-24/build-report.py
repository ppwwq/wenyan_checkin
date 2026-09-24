from pathlib import Path
from html import escape
import re, json
from PIL import Image

base=Path(__file__).resolve().parent
source=Path('D:/DSE中文甲部知识库/11_審查報告/文言每日練專業評審_2026-09-24.md')
text=source.read_text(encoding='utf-8')
for old,new in [('practice.mjs:64','practice.mjs:67'),('app.mjs:18','app.mjs:19'),('app.mjs:19](D:/wenyan_checkin/web-study/src/app.mjs:19)、','app.mjs:20](D:/wenyan_checkin/web-study/src/app.mjs:20)、'),('repository.mjs:18','repository.mjs:19'),('worker.mjs:60','worker.mjs:66')]:
    text=text.replace(old,new)
source.write_text(text,encoding='utf-8')

def inline(s):
    s=escape(s)
    s=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',r'<a href="\2">\1</a>',s)
    s=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',s)
    return re.sub(r'`([^`]+)`',r'<code>\1</code>',s)

parts=[]; table=False; listing=False
for line in text.splitlines():
    if not line.strip():
        if table: parts.append('</tbody></table></div>'); table=False
        if listing: parts.append('</ul>'); listing=False
        continue
    if line.startswith('|'):
        if re.match(r'^\|[\s:|\-]+$',line): continue
        cells=line.strip('|').split('|')
        if not table:
            parts.append('<div class="table"><table><thead><tr>'+''.join('<th>'+inline(c.strip())+'</th>' for c in cells)+'</tr></thead><tbody>'); table=True
        else: parts.append('<tr>'+''.join('<td>'+inline(c.strip())+'</td>' for c in cells)+'</tr>')
    elif line.startswith('#'):
        level=min(len(line)-len(line.lstrip('#')),4); parts.append(f'<h{level}>'+inline(line.lstrip('#').strip())+f'</h{level}>')
    elif line.startswith('- '):
        if not listing: parts.append('<ul>'); listing=True
        parts.append('<li>'+inline(line[2:])+'</li>')
    else: parts.append('<p>'+inline(line)+'</p>')

shots=[
('01-login.png','1 · 登录','表单结构清楚；初始窄面板。'),
('02-setup-390.png','2 · 首次设置','此图为初始窄面板局部；390px另测页面5819px、82个复选框。'),
('03-home-390.png','3 · 首页','主操作明确；范围截断、同步状态隐藏。'),
('04-question-390.png','4 · 题目','原文与题面区分明确，需滚动读完。'),
('05-explanation-390.png','5 · 错答解析','突出具体误解；完整解析可展开。'),
('06-retry-home-390.png','6 · 暂停与回练','可立即回练；今日首次和回练分别统计。'),
('07-retry-complete-390.png','7 · 回练完成','1题却列出16篇，其中15篇0题。'),
('08-history-390.png','8 · 学习记录','首次错答与回练正确都保留，次日仍有1项。'),
('09-account-390.png','9 · 我的','备份入口齐全；文案误称此iPad，无待传数量。'),
('10-setup-768.png','10 · 平板设置','双列可用，设置列表仍很长。'),
('11-weakness-390.png','11 · 手机薄弱页','需要横向移动才能看全四类，篇名列过窄。')]
gallery=[]; manifest=[]
for file,title,note in shots:
    with Image.open(base/file) as im:
        im.verify()
    with Image.open(base/file) as im: size=list(im.size)
    manifest.append({'file':file,'title':title,'dimensions':size,'note':note})
    gallery.append(f'<article class="shot"><h3>{title}</h3><p>{note}</p><div class="image-scroll"><img src="{file}" alt="{title}"></div><a href="{file}">查看原图</a></article>')
css='''body{margin:0;background:#f5f6f3;color:#22352d;font:16px/1.8 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1120px;margin:auto;padding:36px 24px}h1{font-size:32px;line-height:1.35}h2{margin-top:48px;border-top:1px solid #cbd4ce;padding-top:24px}h3{margin-top:30px}a{color:#176246}code{background:#e8eee9;border-radius:4px;padding:2px 5px;overflow-wrap:anywhere}p,li{max-width:92ch}table{border-collapse:collapse;width:100%;background:white}th,td{border:1px solid #d8ded9;padding:10px;text-align:left;vertical-align:top}.table{overflow:auto}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}.shot{background:white;border:1px solid #d8ded9;padding:16px;border-radius:12px;min-width:0}.shot h3{margin-top:0}.image-scroll{height:480px;overflow:auto;background:#eef1ed}.image-scroll img{width:100%;height:auto;display:block}.intro{padding:20px;background:#e6eee7;border-radius:12px}summary{cursor:pointer;font-weight:600}footer{margin-top:40px;font-size:14px;color:#52625a}@media print{.gallery{display:block}.shot{break-inside:avoid}.image-scroll{height:480px}.details{display:block}}'''
html='<!doctype html><html lang="zh-Hans"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>文言每日练专业评审 · 2026-09-24</title><style>'+css+'</style><main><h1>文言每日练 · 专业评审</h1><p class="intro">本地界面2026.09.24.5 · 66项现有测试通过 · 15项体验、可靠性与维护发现。只评审，未修改或发布应用。下方截图按实际流程排列，每张可独立滚动并打开原图。</p><div class="gallery">'+''.join(gallery)+'</div><details open><summary>完整评审、优先级与验收建议</summary>'+''.join(parts)+'</details><footer>截图与探针均来自本轮本地隔离检查。无真实学生数据。完整截图中的固定底栏位置由拍摄时视口决定。</footer></main></html>'
(base/'report.html').write_text(html,encoding='utf-8')
(base/'screenshots.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'report':str(source),'html':str(base/'report.html'),'screenshots':len(manifest),'verifiedPngs':len(manifest)},ensure_ascii=False))
