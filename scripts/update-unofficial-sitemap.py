#!/usr/bin/env python3
"""Crawl public town navigation and same-site content page links; never crawl external sites."""
import json, re, time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit
import requests
from bs4 import BeautifulSoup
from urllib.robotparser import RobotFileParser

ROOT='https://www.norwoodma.gov/'
OUT=Path('data/unofficial-sitemap.json')
HOSTS={'www.norwoodma.gov','norwoodma.gov'}
session=requests.Session()
session.headers['User-Agent']='NorwoodMA-Sitemap/1.0 (+https://www.norwood.ma/contact.html)'
robots=RobotFileParser(ROOT+'robots.txt')
try:
    r=session.get(robots.url,timeout=20)
    if r.status_code==200: robots.parse(r.text.splitlines())
    elif r.status_code in (401,403): raise RuntimeError('robots access denied')
    else: robots.parse([])
except requests.RequestException: raise RuntimeError('Unable to check robots.txt')

def normalize(href, base):
    if not href or href.startswith(('#','mailto:','tel:','javascript:')): return None
    u=urlsplit(urljoin(base,href))
    if u.scheme not in ('http','https') or not u.hostname: return None
    if u.hostname in HOSTS:
        return urlunsplit(('https','www.norwoodma.gov',u.path or '/',u.query,''))
    return urlunsplit(u)

def crawlable(u):
    p=urlsplit(u)
    return p.hostname in HOSTS and not p.query and not re.search(r'\.(?!php$|html?$|aspx?$)[a-z0-9]{2,8}$',p.path,re.I) and not re.search(r'/(?:login|logout|admin|intranet|search)(?:[/.]|$)',p.path,re.I)

def anchor(a,base):
    u=normalize(a.get('href'),base)
    title=' '.join(a.stripped_strings) or a.get('aria-label','') or a.get('title','')
    if not title or not u: return None
    return {'title':title,'url':u,'children':[]}

def dedup(nodes):
    seen=set(); out=[]
    for n in nodes:
        k=(n['title'],n['url'])
        if k not in seen: seen.add(k);out.append(n)
    return out

def list_tree(ul,base):
    out=[]
    for li in ul.find_all('li',recursive=False):
        a=li.find('a',recursive=False)
        if not a:
            a=next((x for x in li.find_all('a') if x.find_parent('li') is li),None)
        n=anchor(a,base) if a else None
        kids=[]
        for sub in li.find_all(['ul','ol']):
            if sub.find_parent('li') is li: kids+=list_tree(sub,base)
        if n: n['children']=dedup(kids);out.append(n)
        elif kids:
            label=' '.join(li.find(string=True,recursive=False).split()) if li.find(string=True,recursive=False) else 'More'
            out.append({'title':label or 'More','url':None,'children':kids})
    return dedup(out)

def extract(container,base):
    nodes=[]
    for ul in container.find_all(['ul','ol']):
        if not ul.find_parent(['ul','ol']) or not container.find(lambda x:x is ul.find_parent(['ul','ol'])):
            nodes+=list_tree(ul,base)
    if not nodes:
        nodes=[n for a in container.find_all('a',href=True) if (n:=anchor(a,base))]
    return dedup(nodes)

def flatten(nodes):
    for n in nodes:
        yield n
        yield from flatten(n['children'])

def global_menu(soup,base):
    expected={'departments','boards/committees','residents','business','how do i...'}
    best=[]
    for ul in soup.find_all('ul'):
        ns=list_tree(ul,base)
        if len(expected & {n['title'].lower().strip() for n in ns})>=3 and len(ns)>len(best): best=ns
    if not best: raise RuntimeError('Town global menu not recognized')
    return best

def local_menu(soup,base):
    candidates=[]
    # Revize places Related Pages in a sidebar, often separated from its list by wrappers.
    for heading in soup.find_all(string=lambda t: t and t.strip().lower()=='related pages'):
        el=heading.parent
        for level in range(5):
            if not el or el.name in ('body','html'): break
            ul=el.find_next_sibling(['ul','ol'])
            if ul:
                candidates+=list_tree(ul,base);break
            ul=el.find(['ul','ol'])
            if ul:
                candidates+=list_tree(ul,base);break
            el=el.parent
    for h in soup.find_all(['h1','h2','h3','h4','div','span']):
        if h.get_text(' ',strip=True).lower()=='related pages':
            for sib in h.next_siblings:
                if getattr(sib,'name',None) in ('ul','ol','div','nav'):
                    nodes=list_tree(sib,base) if sib.name in ('ul','ol') else extract(sib,base)
                    if nodes: candidates+=nodes;break
            if not candidates and h.parent: candidates+=extract(h.parent,base)
    for sel in ['#side-nav','#sidebar-nav','.side-nav','.sidenav','.subnav','.sub-nav','.related-pages','#related-pages','#leftnav','.leftnav','aside nav','nav[aria-label*="Related"]']:
        for el in soup.select(sel): candidates+=extract(el,base)
    # Remove the repeated global navigation if a broad sidebar selector matched it.
    return dedup([n for n in candidates if n['title'].lower().strip() not in {'departments','boards/committees','residents','business','how do i...'}])

pages={}; failures={}; queue=deque([ROOT]); queued={ROOT}; roots=[]; global_urls=set()
while queue:
    u=queue.popleft()
    if not robots.can_fetch(session.headers['User-Agent'],u):
        failures[u]='robots.txt disallows crawling';continue
    try:
        time.sleep(.35)
        r=session.get(u,timeout=25);r.raise_for_status()
        if urlsplit(r.url).hostname not in HOSTS or 'html' not in r.headers.get('Content-Type','').lower():
            pages[u]={'title':u,'menu':[],'other':[]};continue
        soup=BeautifulSoup(r.content,'html.parser')
        if u==ROOT:
            roots=global_menu(soup,u)
            global_urls={n['url'] for n in flatten(roots) if n['url']}
        menu=local_menu(soup,u) if u!=ROOT else []
        menu=[n for n in menu if n['url']!=u]
        local_urls={n['url'] for n in flatten(menu)}
        other=[]
        for a in soup.find_all('a',href=True):
            n=anchor(a,u)
            if not n or n['url']==u or n['url'] in global_urls or n['url'] in local_urls: continue
            if a.find_parent(['footer','header','nav']): continue
            if crawlable(n['url']): other.append(n)
        other=dedup(other)
        title=soup.title.get_text(' ',strip=True) if soup.title else u
        pages[u]={'title':title,'menu':menu,'other':other}
        for n in flatten((roots if u==ROOT else [])+menu+other):
            v=n['url']
            if v and crawlable(v) and v not in queued: queued.add(v);queue.append(v)
    except (requests.RequestException,ValueError) as e:
        failures[u]=str(e)
if not roots or len(pages)<10 or not all(any('/departments/'+dept+'/' in u and len(p['menu'])>=8 and any(n['children'] for n in p['menu']) for u,p in pages.items()) for dept in ('public_works','town_clerk')): raise RuntimeError('Crawl incomplete; preserving previous index')
data={'updated':datetime.now(timezone.utc).isoformat(),'roots':roots,'pages':pages,'failures':failures,'count':len(pages)}
OUT.parent.mkdir(exist_ok=True)
tmp=OUT.with_suffix('.tmp');tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');tmp.replace(OUT)
print(f'{len(pages)} pages indexed; {len(failures)} fetch failures')
