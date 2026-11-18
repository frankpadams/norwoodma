#!/usr/bin/env python3
"""Render all discovered links into native, crawlable HTML details."""
import json,re
from html import escape
from pathlib import Path
from datetime import datetime
p=Path('unofficialsitemap.html')
data=json.loads(Path('data/unofficial-sitemap.json').read_text())
pages=data['pages']
expanded=set()
linked=set()
def link(n):
    u=n.get('url')
    t=escape(n['title'])
    if not u or not u.startswith(('https://','http://')): return t
    linked.add(u)
    return f'<a href="{escape(u,quote=True)}" target="_blank" rel="noopener noreferrer">{t}</a>'
def node(n,depth=0,ancestors=frozenset()):
    u=n.get('url')
    level=f'level-{depth}' if depth<3 else 'level-deep'
    if u and u in ancestors: return ''
    page=pages.get(u,{}) if u not in expanded else {}
    if u: expanded.add(u)
    nextpath=ancestors|({u} if u else set())
    seen=set()
    def clean(items):
        result=[]
        for item in items:
            v=item.get('url')
            key=(item['title'],v)
            if key in seen or (v and v in nextpath): continue
            seen.add(key);result.append(item)
        return result
    children=clean(n.get('children',[])+page.get('menu',[]))
    other=clean(page.get('other',[]))
    body=''.join(node(k,depth+1,nextpath) for k in children)
    extra=''.join(node(k,depth+1,nextpath) for k in other)
    if not body and not extra: return f'<div class="leaf {level}">{link(n)}</div>'
    direct=f'<div class="leaf">{link(n)}</div>' if u else ''
    if extra: body+=f'<details class="extra-links"><summary>Additional linked pages</summary>{extra}</details>'
    return f'<details class="{level}"><summary>{escape(n["title"])}</summary>{direct}{body}</details>'
tree=''.join(node(n) for n in data['roots'])
root=pages.get('https://www.norwoodma.gov/',{})
if root.get('other'): tree+=node({'title':'Town Homepage Links','children':root['other']})
# Guarantee discoverability of any page or destination not reached in the rendered tree.
def flatten(ns):
    for n in ns:
        yield n
        yield from flatten(n.get('children',[]))
missing=[]
for u,pg in pages.items():
    for n in [{'title':pg['title'],'url':u},*flatten(pg.get('menu',[])),*flatten(pg.get('other',[]))]:
        if n.get('url') and n['url'] not in linked:
            missing.append(f'<div class="leaf">{link(n)}</div>')
if missing: tree+='<details class="level-0"><summary>Other indexed town links</summary>'+''.join(missing)+'</details>'
html=p.read_text()
start='<!-- TOWN_TREE_START -->';end='<!-- TOWN_TREE_END -->'
if start not in html or end not in html: raise RuntimeError('Missing render markers')
html=html.split(start,1)[0]+start+tree+end+html.split(end,1)[1]
status=f"{data['count']} town pages indexed · Updated {datetime.fromisoformat(data['updated']).strftime('%B %d, %Y')}"
if data.get('failures'): status+=f" · {len(data['failures'])} pages could not be checked"
html=re.sub(r'(<p id="status"[^>]*>).*?(</p>)',lambda m:m[1]+escape(status)+m[2],html,count=1,flags=re.S)
p.write_text(html)
print(f'Rendered {len(linked)} unique link destinations in static HTML')
