from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]/'app'
def edit(name, old, new):
    p=root/name
    s=p.read_text(encoding='utf-8')
    assert old in s, (name,old[:100])
    p.write_text(s.replace(old,new,1),encoding='utf-8')

edit('index.html','<link rel="stylesheet" href="/styles.css">','<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/assets/design.css">')
edit('src/app.mjs',"root.innerHTML='<section class=\"auth\"><img", "root.innerHTML='<div class=\"auth-layout\"><aside class=\"auth-story\"><p class=\"edition-label\">DSE CHINESE · 文言研習</p><div><span class=\"auth-stamp\" aria-hidden=\"true\">文</span><h2>讀懂一句，<br>再進一步。</h2><p>從字詞到篇章，<br>把每一次練習，積成自己的理解。</p></div><p class=\"auth-story-foot\">十六篇經典 · 練習 · 複習 · 記錄</p></aside><section class=\"auth\"><img")
edit('src/app.mjs','密碼至少 10 字元。</p></section>','密碼至少 10 字元。</p></section></div>')
edit('src/app.mjs',"document.body.classList.toggle('in-session',page==='practice');", "document.body.classList.toggle('in-session',page==='practice');document.body.dataset.page=page;")
edit('src/app.mjs',"(mobile?'<span class=\"nav-icon\">'+navigationIcon(id)+'</span>':'')+label", "'<span class=\"nav-icon\" aria-hidden=\"true\">'+navigationIcon(id)+'</span><span>'+label+'</span>'+(!mobile?'<span class=\"nav-index\" aria-hidden=\"true\">0'+(i+1)+'</span>':'')")
edit('src/app.mjs',"root.innerHTML='<div class=\"shell\">", "root.innerHTML='<a class=\"skip-link\" href=\"#main\">跳至主要內容</a><div class=\"shell\">")
edit('src/app.mjs','<small class="muted">十六篇 · 練習與複習</small>', '<small class="muted">文言研習手冊 · 十六篇</small>')
edit('src/app.mjs','<div class="sidebar-bottom">','<div class="sidebar-bottom"><p class="sidebar-motto">日日有所得。</p>')
edit('src/app.mjs','<main class="page" id="main">','<main class="page" id="main" tabindex="-1">')
edit('src/app.mjs',"esc(page==='mistakes'?'錯題複習':nav.find(n=>n[0]===page)?.[1]||'練習')", "esc(({mistakes:'錯題複習',saved:'我的收藏',quick:'快速回顧',weakness:'薄弱知識點',compare:'詞義對照',written:'字詞與句譯',training:'學習設定',reports:'題目回報',admin:'回報維護',practice:'練習中'})[page]||nav.find(n=>n[0]===page)?.[1]||'練習')")
p=root/'src/app.mjs';s=p.read_text(encoding='utf-8')
start=s.index("(['home','library'].includes(page)?'<div class=\"side-card\">")
end=s.index("+(page==='home'&&corrections.length",start)
s=s[:start]+"(views[page]||views.home)()"+s[end:]
p.write_text(s,encoding='utf-8')

paths="""export function studyPaths(compact=false){
 const entries=[['written-list','vocabulary','字詞輸入','在原句中，寫出字詞的意思。','字'],['written-list','translation','整句理解／翻譯','先寫譯文，再逐項核對。','句'],['nav','library','篇章與混合重溫','選擇篇章，練習與辨析。','篇']];
 return '<section class="study-paths '+(compact?'compact':'')+'" aria-label="練習方式"><div class="section-title"><h2>換個方式，讀深一點</h2><span class="subtle">字 · 句 · 篇</span></div><div class="study-path-grid">'+entries.filter(e=>!compact||e[0]!=='nav').map(([action,value,label,note,letter])=>'<button type="button" class="study-path" data-action="'+action+'" '+(action==='nav'?'data-page':'data-kind')+'="'+value+'"><span class="path-letter" aria-hidden="true">'+letter+'</span><span class="path-copy"><strong>'+label+'</strong><small>'+note+'</small></span><span class="path-arrow" aria-hidden="true">↗</span></button>').join('')+'</div></section>';
}
"""
edit('src/features/records.mjs',"export function homeView(bank,state){return dailyHomeView(bank,state)+reviewShortcuts();}",paths+"export function homeView(bank,state){return '<header class=\"home-heading\"><div><p class=\"edition-label\">文言研習 / 每日一習</p><h1>溫故，而知新。</h1></div><span class=\"home-heading-note\">把理解留住，讓積累有跡可循。</span></header>'+dailyHomeView(bank,state)+studyPaths()+reviewShortcuts();}")
edit('src/features/training.mjs',"return '<section class=\"home-primary\"", "return '<div class=\"home-overview\"><section class=\"home-primary\"")
edit('src/features/training.mjs',"</section>'+(others.length?", "</section></div>'+(others.length?")
edit('src/features/library.mjs',"import {studyPools}","import {studyPaths} from './records.mjs';\nimport {studyPools}")
edit('src/features/library.mjs',"'先選基礎、已審自編仿真或官方真題，再選篇章。')+", "'先選基礎、已審自編仿真或官方真題，再選篇章。')+studyPaths(true)+")
# The CSS asset is versioned by the existing offline cache, just like styles.css.
p=root/'sw.js';s=p.read_text(encoding='utf-8');print(s[:650])
s=s.replace("'/styles.css'","'/styles.css','/assets/design.css'")
s=s.replace('2026.10.21.formal.4','2026.10.25.design.1')
p.write_text(s,encoding='utf-8')
p=root/'build-info.json';info=json.loads(p.read_text(encoding='utf-8'));info['uiVersion']='2026.10.25.design.1';info['designBase']='self-study-2026.10.24.2';p.write_text(json.dumps(info,ensure_ascii=False,indent=2),encoding='utf-8')
print('Presentation updates applied')
