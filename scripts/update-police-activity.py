#!/usr/bin/env python3
"""Fail-closed police activity feed monitor. Never infer incident locations from articles."""
import datetime as dt
import json
import pathlib
import re
import urllib.request
from html.parser import HTMLParser

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/"data/police-activity.json"
SOURCES=["https://www.norwoodrecord.com/news","https://norwoodrecord.weebly.com/"]
class Links(HTMLParser):
    def __init__(self): super().__init__();self.links=[]
    def handle_starttag(self,tag,attrs):
        if tag=="a":
            d=dict(attrs)
            if d.get("href"):self.links.append(d["href"])
def discover():
    found=[]
    for url in SOURCES:
        try:
            req=urllib.request.Request(url,headers={"User-Agent":"NorwoodMA-public-data-monitor/1.0"})
            with urllib.request.urlopen(req,timeout=15) as response:
                html=response.read(1_000_000).decode("utf-8","replace")
            p=Links();p.feed(html)
            from urllib.parse import urljoin
            found.extend(urljoin(url,link) for link in p.links if re.search(r"police.?log|crime.?log",link,re.I))
        except Exception as e:
            print("Source unavailable:",url,type(e).__name__)
    return sorted(set(found))
def main():
    links=discover()
    # Do not convert unverified links or free-form reports to incident coordinates.
    # A source-specific extractor must be validated against current dated logs
    # and must suppress residential/sensitive addresses before publishing.
    old=json.loads(OUT.read_text()) if OUT.exists() else {}
    incidents=old.get("incidents",[])
    if not isinstance(incidents,list):incidents=[]
    status="Candidate police-log links found; extraction not validated" if links else "No verified current automated police-log source"
    data={"generated_at":dt.datetime.now(dt.timezone.utc).isoformat(),"coverage_start":old.get("coverage_start"),"coverage_end":old.get("coverage_end"),"source_status":status,"candidate_links":links[:20],"incidents":incidents}
    OUT.write_text(json.dumps(data,indent=2,ensure_ascii=False)+"\n")
    print(status,"| mapped incidents:",len(incidents))
if __name__=="__main__":main()
