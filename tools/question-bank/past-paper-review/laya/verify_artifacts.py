"""Local static artifact checks only. Does not launch or remotely inspect a browser."""
from html.parser import HTMLParser
from common import *

class ReportParser(HTMLParser):
    def __init__(self):
        super().__init__();self.items=[];self.options=[];self.ids=[];self.external=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='details' and a.get('class')=='item':self.items.append(a)
        if tag=='option':self.options.append(a.get('value'))
        if tag in {'script','link','img','iframe'} and any(a.get(k,'').startswith(('http:','https:','//')) for k in ['src','href']):self.external.append(a)

out=HERE/'runs/2026-09-23-v2'
p=ReportParser();p.feed((out/'report.html').read_text(encoding='utf-8'))
assert len(p.items)==2134
assert sum(a['data-reviewed']=='yes' for a in p.items)==60
assert sum(a['data-status']=='revise-options' for a in p.items)==30
assert p.options==['reviewed','pending','all','revise-options','revise-material','hold-source']
assert len(p.ids)==len(set(p.ids))
assert not p.external
assert filehash(BANK)==read(out/'manifest.json')['bankSha256']
report={'staticResult':'PASS','cards':len(p.items),'reviewed':60,'filters':p.options,'externalResources':0,
 'browserVisualValidation':'not-run','browserReason':'Auto-review denied browser connector access to private local question-bank report; no workaround attempted',
 'liveBankUnchanged':True}
write(out/'artifact-checks.json',report)
print(report)
