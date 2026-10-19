#!/usr/bin/env python3
"""Free public Grants.gov feed refresh. Stdlib only; never fabricates opportunities."""
import json,urllib.request,datetime,pathlib
url="https://api.grants.gov/v1/api/search2"
payload=json.dumps({"rows":1000,"oppStatuses":"posted|forecasted"}).encode()
req=urllib.request.Request(url,data=payload,headers={"Content-Type":"application/json","User-Agent":"NorwoodOpportunityCenter/1.0"},method="POST")
with urllib.request.urlopen(req,timeout=40) as res: data=json.load(res)
hits=data.get("data",{}).get("oppHits")
if not isinstance(hits,list): raise RuntimeError("Grants.gov returned unexpected response; preserving previous data")
today=datetime.date.today().isoformat()
items=[]
for x in hits:
    if not x.get("id") or not x.get("title"):continue
    items.append({"id":str(x["id"]),"title":x["title"],"agencyName":x.get("agencyName",""),"closeDate":x.get("closeDate",""),"source":"Grants.gov","url":"https://www.grants.gov/search-results-detail/"+str(x["id"])})
out={"updated":datetime.datetime.now(datetime.timezone.utc).isoformat(),"source":"Grants.gov search2 public API","count":len(items),"opportunities":items}
dest=pathlib.Path("data/opportunity-grants.json");dest.parent.mkdir(parents=True,exist_ok=True)
dest.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n")
print(f"Saved {len(items)} federal opportunities")
