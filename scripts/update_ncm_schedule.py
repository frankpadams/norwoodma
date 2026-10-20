#!/usr/bin/env python3
"""Read NCM's rendered public schedules. Never invent a program when unavailable."""
import json, re, datetime
from pathlib import Path
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright

TZ=ZoneInfo("America/New_York")
CHANNELS={"community":"https://norwoodcommunitymedia.org/programs/site/community-1/broadcast/","government":"https://norwoodcommunitymedia.org/programs/site/government-3/broadcast/","schools":"https://norwoodcommunitymedia.org/programs/site/school-2/broadcast/"}
TIME=re.compile(r"(?<!\d)(\d{1,2}):(\d{2})\s*(AM|PM)",re.I)
def minutes(s):
 m=TIME.search(s)
 return (int(m[1])%12+(12 if m[3].lower()=="pm" else 0))*60+int(m[2]) if m else None
def extract(page):
 # NCM's schedule is client-rendered. Only accept a time paired with a program title.
 return page.evaluate("""() => {
 const selectors=['[class*="schedule"] tr','[class*="schedule"] li','[class*="schedule"] [class*="item"]','[class*="schedule"] [class*="row"]','[class*="airing"]','[class*="broadcast"] [class*="entry"]'];
 const els=[...new Set(selectors.flatMap(s=>[...document.querySelectorAll(s)]))];
 return els.map(e=>({text:(e.innerText||'').trim().replace(/\\s+/g,' '),title:(e.querySelector('a, strong, [class*="title"]')?.innerText||'').trim()})).filter(x=>x.text.length<260);
 }""")
def main():
 now=datetime.datetime.now(TZ); out={"updated_at":now.isoformat(),"date":now.date().isoformat(),"channels":{}}
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True)
  for key,url in CHANNELS.items():
   entry={"status":"unavailable","title":None,"url":url}
   try:
    page=browser.new_page(timezone_id="America/New_York")
    page.goto(url,wait_until="domcontentloaded",timeout=30000)
    page.wait_for_timeout(4500)
    rows=extract(page); slots=[]
    for row in rows:
     t=minutes(row["text"])
     if t is None:continue
     title=row["title"]
     if not title:
      title=TIME.sub("",row["text"],count=1).strip(" -–|")
     if len(title)<3 or title.lower() in ("today","schedule","search the schedule"):continue
     slots.append((t,title))
    slots.sort()
    current=[x for x in slots if x[0]<=now.hour*60+now.minute]
    if current:
     entry.update(status="scheduled",title=current[-1][1])
    page.close()
   except Exception as exc:print(key,str(exc)[:180])
   out["channels"][key]=entry
  browser.close()
 Path("data/ncm-now-playing.json").write_text(json.dumps(out,indent=2)+"\n")
if __name__=="__main__":main()
