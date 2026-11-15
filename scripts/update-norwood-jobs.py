#!/usr/bin/env python3
"""Refresh Norwood Jobs from public employer job-board JSON endpoints.

Uses only public machine-readable endpoints. Workday integration is optional and
disabled by default pending employer permission for third-party republication.
"""
import json, os, urllib.request, datetime, pathlib, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
CONFIG=ROOT/"data/job-feeds.json"
OUT=ROOT/"data/jobs.json"
HEADERS={"User-Agent":"NorwoodMA-Jobs/1.0 (community jobs directory; https://norwood.ma/jobs.html)","Accept":"application/json"}
def get(url):
    req=urllib.request.Request(url,headers=HEADERS)
    with urllib.request.urlopen(req,timeout=25) as response:
        return json.load(response)
def normalize(feed, item):
    provider=feed["provider"]
    if provider=="greenhouse":
        loc=(item.get("location") or {}).get("name","")
        return dict(id="greenhouse:"+str(item["id"]),title=item.get("title",""),company=feed["company"],location=loc,url=item.get("absolute_url",""),posted=item.get("first_published") or item.get("updated_at") or "",source="Employer (Greenhouse)")
    if provider=="lever":
        loc=(item.get("categories") or {}).get("location","")
        return dict(id="lever:"+str(item["id"]),title=item.get("text",""),company=feed["company"],location=loc,url=item.get("hostedUrl") or item.get("applyUrl") or "",posted="",source="Employer (Lever)")
    if provider=="ashby":
        return dict(id="ashby:"+str(item.get("id") or item.get("jobUrl")),title=item.get("title",""),company=feed["company"],location=item.get("location",""),url=item.get("jobUrl") or item.get("applyUrl") or "",posted=item.get("publishedAt") or "",source="Employer (Ashby)")
def collect(feed):
    provider=feed["provider"]; slug=feed["slug"]
    if provider=="greenhouse":
        payload=get("https://boards-api.greenhouse.io/v1/boards/"+slug+"/jobs")
        items=payload.get("jobs",[])
    elif provider=="lever":
        items=get("https://api.lever.co/v0/postings/"+slug+"?mode=json")
    elif provider=="ashby":
        items=get("https://api.ashbyhq.com/posting-api/job-board/"+slug)
        items=items.get("jobs",[])
    else: raise ValueError("Unsupported provider")
    return [normalize(feed,i) for i in items]
def in_norwood(location):
    # Strict match; unknown or multi-location postings are excluded until verified.
    import re
    return bool(re.search(r"\bNorwood\s*,\s*(?:MA|Massachusetts)\b",location,re.I)) and not any(x in location.lower() for x in ("remote", "hybrid"))
def main():
    feeds=json.loads(CONFIG.read_text())["feeds"]
    previous=json.loads(OUT.read_text()) if OUT.exists() else {"jobs":[]}
    old_by_company={}
    for job in previous.get("jobs",[]):old_by_company.setdefault(job["company"],[]).append(job)
    jobs=[]; failed=[]
    for feed in feeds:
        if not feed.get("enabled",True):continue
        try:
            found=[j for j in collect(feed) if j and j["url"] and in_norwood(j["location"])]
            jobs.extend(found)
            print(feed["company"],len(found))
        except Exception as exc:
            failed.append(feed["company"]);jobs.extend(old_by_company.get(feed["company"],[]))
            print("FEED ERROR",feed["company"],str(exc),file=sys.stderr)
    unique={j["id"]:j for j in jobs}
    if not feeds or not any(f.get("enabled",True) for f in feeds):
        print("No active feeds; retaining existing data");return
    if len(failed)==len([f for f in feeds if f.get("enabled",True)]):
        print("All feeds failed; preserving existing file",file=sys.stderr);sys.exit(1)
    output={"updated":datetime.datetime.now(datetime.timezone.utc).isoformat(),"jobs":sorted(unique.values(),key=lambda j:(j.get("posted") or "",j["title"]),reverse=True),"failed_sources":failed}
    OUT.parent.mkdir(exist_ok=True);OUT.write_text(json.dumps(output,indent=2)+"\n")
if __name__=="__main__":main()
