#!/usr/bin/env python3
"""Build a compact public-page index for Norwood.ma search. Standard library only."""
import json, re, time, urllib.request, urllib.parse, urllib.robotparser
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

ROOT="https://www.norwoodma.gov/"
OUT=Path("data/official-town-search.json")
MAX_PAGES=350
UA="NorwoodMA-CommunitySearchIndexer/1.0 (+https://www.norwood.ma/)"
class Extract(HTMLParser):
    def __init__(self):
        super().__init__();self.title="";self.parts=[];self.in_title=False;self.skip=0
    def handle_starttag(self,tag,attrs):
        if tag in ("script","style","nav","footer","header"):self.skip+=1
        if tag=="title":self.in_title=True
    def handle_endtag(self,tag):
        if tag=="title":self.in_title=False
        if tag in ("script","style","nav","footer","header"):self.skip=max(0,self.skip-1)
    def handle_data(self,data):
        if self.in_title:self.title+=data
        elif not self.skip:self.parts.append(data)
def fetch(url):
    req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"text/html,application/xml,text/xml"})
    with urllib.request.urlopen(req,timeout=18) as r:
        if int(r.headers.get("Content-Length","0"))>2000000:return b""
        return r.read(2000000)
def canonical(url):
    p=urllib.parse.urlsplit(url)
    if p.scheme!="https" or p.hostname not in ("www.norwoodma.gov","norwoodma.gov"):return None
    if not (p.path.endswith((".php",".html","/")) or "." not in p.path.rsplit("/",1)[-1]):return None
    if re.search(r"/(login|admin|calendar|events|search|staff_directory)/",p.path,re.I):return None
    return urllib.parse.urlunsplit(("https","www.norwoodma.gov",p.path,"",""))
def main():
    robot=urllib.robotparser.RobotFileParser()
    robot.set_url(ROOT+"robots.txt")
    try:robot.read()
    except Exception:pass
    urls=[ROOT];seen=set()
    for sm in (ROOT+"sitemap.xml",ROOT+"sitemap_index.xml"):
        try:
            doc=ET.fromstring(fetch(sm))
            for e in doc.iter():
                if e.tag.endswith("loc") and e.text:
                    u=canonical(e.text.strip())
                    if u and u not in seen:urls.append(u);seen.add(u)
        except Exception as e:print("Sitemap unavailable:",sm,str(e)[:120])
    # Preserve the prior index if the town site blocks crawling.
    previous=[]
    if OUT.exists():
        try:previous=json.loads(OUT.read_text()).get("results",[])
        except Exception:pass
    results=[]
    for url in dict.fromkeys(urls):
        if len(results)>=MAX_PAGES:break
        if not robot.can_fetch(UA,url):continue
        try:
            html=fetch(url).decode("utf-8","replace")
            if "<html" not in html.lower():continue
            parser=Extract();parser.feed(html)
            title=re.sub(r"\\s+"," ",parser.title).strip()
            title=re.sub(r"\\s*[-|]\\s*(Town of Norwood|Norwood, MA).*$","",title,flags=re.I)
            body=re.sub(r"\\s+"," "," ".join(parser.parts)).strip()
            if len(title)<4 or len(body)<40:continue
            results.append({"name":title[:125],"url":url,"type":"Official Town Website","text":body[:360]})
        except Exception as e:print("Skipped",url,str(e)[:100])
        time.sleep(0.12)
    if len(results)<5:
        if previous:print("Too few results; preserving prior index");return
        raise RuntimeError("Town crawl produced fewer than 5 pages; refusing empty index")
    OUT.parent.mkdir(parents=True,exist_ok=True)
    payload={"source":ROOT,"results":sorted(results,key=lambda x:x["url"])}
    OUT.write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":"))+"\n")
    print("Indexed",len(results),"town pages;",OUT.stat().st_size,"bytes")
if __name__=="__main__":main()
