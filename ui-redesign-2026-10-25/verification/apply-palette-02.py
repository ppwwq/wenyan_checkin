from pathlib import Path
import re, colorsys, shutil, json
root=Path(__file__).resolve().parents[1]
backup=root/'verification/before-palette-02'
backup.mkdir(exist_ok=True)
mapping={
'#f5f3ec':'#f6f3ed','#203f36':'#393632','#234e40':'#986316',
'#34433c':'#433e36','#626e65':'#70675b','#dcded3':'#ded8cc','#e9ede2':'#f5e8cb',
'#24473b':'#815411','#244d3e':'#815411','#325246':'#4d4840','#345342':'#815411',
'#3e5945':'#78551f','#486145':'#986316','#52634a':'#71634f','#667e54':'#986316',
'#73816a':'#9c8c70','#75836d':'#92754c','#819774':'#bb965e','#92a087':'#b69a70',
'#97a77c':'#c3a46d','#a3b28d':'#cbb381','#a9b6a0':'#c8af86',
'#ccd4bf':'#e4d4af','#d1d7c6':'#dcd4c5','#d2d8c9':'#ded4c2',
'#c8d0c1':'#d1c6b4','#c5ceba':'#d1c6b4','#c7d0bd':'#d1c6b4',
'#c8d2c5':'#dad4c8','#c8d2be':'#dad4c8','#c9d2bd':'#dad4c8',
'#d4ded0':'#e1dbcf','#d7e0d6':'#e6e0d4','#e1e5d7':'#ece4d3',
'#e5ecd9':'#f5e8cb','#e6eadc':'#f4e8cd','#e7ecdd':'#f5e8cb',
'#e8eedc':'#f5e8cb','#e9eddf':'#f5e8cb','#eaece2':'#eee8dd',
'#edf2e5':'#faf0d9','#eef1e6':'#faf0d9','#eff2e6':'#f8eed9',
'#f0efdf':'#f5e8cb','#f0f2e7':'#faf2e3','#f2f4eb':'#f6f0e5',
'#f5f6ee':'#faf5eb','#f6f7ef':'#faf5eb','#f1f1eb':'#f2efe8',
'#152b24':'#29251e',
}
def recolor(match):
    value=match.group().lower()
    if len(value) in (7,9) and value[:7] in mapping:return mapping[value[:7]]+value[7:]
    if len(value) not in (7,9):return value
    r,g,b=[int(value[i:i+2],16)/255 for i in (1,3,5)]
    h,l,s=colorsys.rgb_to_hls(r,g,b)
    if 60<=h*360<=185 and s>.02:
        # Older component-specific green tints become warm neutral/amber hues.
        rgb=colorsys.hls_to_rgb(36/360,l,min(s,.28 if l<.85 else .5))
        return '#'+''.join(f'{round(c*255):02x}' for c in rgb)+value[7:]
    return value
for name in ['styles.css','assets/design.css','assets/icon.svg','index.html','manifest.webmanifest','sw.js','build-info.json']:
    p=root/'app'/name; saved=backup/name;saved.parent.mkdir(parents=True,exist_ok=True)
    if not saved.exists():shutil.copy2(p,saved)
    s=saved.read_text(encoding='utf-8')
    if name.endswith('.css'):
        s=re.sub(r'#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b',recolor,s)
    elif name=='assets/icon.svg':
        s=s.replace('#173f35','#393632').replace('#d05d3e','#986316').replace('#faf5e5','#f5e8cb')
    elif name=='index.html':s=s.replace('#173f35','#393632')
    elif name=='manifest.webmanifest':s=s.replace('#173f35','#393632').replace('#faf5e5','#f6f3ed')
    elif name=='sw.js':s=s.replace('2026.10.25.design.1','2026.10.25.design.2')
    elif name=='build-info.json':
        v=json.loads(s);v.update(uiVersion='2026.10.25.design.2',palette='02-warm-gray-amber',releaseScope='Local UI redesign preview; production bank and learning logic retained');s=json.dumps(v,ensure_ascii=False,indent=2)
    p.write_text(s,encoding='utf-8')
with (root/'app/assets/design.css').open('a',encoding='utf-8') as f:
    f.write('''
/* User-selected palette 02: warm gray + amber. Semantic answer colors remain distinct. */
:root{--paper:#f6f3ed;--white:#fffefa;--ink:#36322c;--body:#433e36;--muted:#70675b;--line:#ded8cc;--green:#986316;--soft:#f5e8cb;--yellow:#f5dfa5;--rust:#9d3f2e}
.sidebar,.auth-story{background:#393632}.start-card{background:#f5e8cb;border-color:#e4d4af}.start-card .eyebrow,.start-card p:not(.eyebrow){color:#71634f}
.btn:not(.secondary):not(.quiet),.toolbar .btn:not(.secondary):not(.quiet){background:#986316;color:#fffefa}
.btn:not(.secondary):not(.quiet):hover:not(:disabled){background:#7e5011}.btn.secondary:hover:not(:disabled){background:#faf0d9}.btn.quiet:hover{background:#eee8dd}
.btn.danger{background:#9d3f2e!important}.option:hover:not(:disabled){border-color:#bb965e;background:#fcf6e9}.option.selected{border-color:#986316;background:#faf0d9}.option.selected b{background:#986316;color:#fffefa;border-color:#986316}
.option.correct{background:#e7f5eb;border-color:#22863a;outline-color:#22863a}.option.correct b{background:#22863a;border-color:#22863a;color:#fff}.option.wrong{background:#fff0f0;border-color:#c53030;outline-color:#c53030}.option.wrong b{background:#c53030;border-color:#c53030;color:#fff}
.auth-story .edition-label,.auth-story>div>p,.auth-story-foot{color:#dad4c8}.auth-stamp{border-color:#c6b89e;color:#ede0c6}.review-day.active{background:#f5e8cb;border-color:#c3a46d}.nav button.active{background:#f5e8cb;color:#815411}.nav button:hover:not(.active){background:#4d4840}.study-path:hover{background:#faf2e3;border-color:#b69a70}.home-shortcut:hover{background:#eee8dd}.library-card.selected{background:#faf0d9;border-color:#bb965e;box-shadow:inset 3px 0 #986316}
''')
print('Palette 02 applied; original presentation backed up. Learning/content modules untouched.')
