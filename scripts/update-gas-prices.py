#!/usr/bin/env python3
import json, os, urllib.request, urllib.error
from datetime import datetime, timezone
from pathlib import Path

KEY=os.environ["GOOGLE_PLACES_API_KEY"]
OUT=Path("data/gas-prices.json")
stations=[
 ("Norwood Gulf","Norwood Gulf, 707 Neponset St, Norwood MA"),
 ("Mobil — Route 1","Mobil, 971 Providence Hwy, Norwood MA"),
 ("Irving Oil / Rojo","Irving Oil Rojo, 69 Providence Hwy, Norwood MA"),
 ("BJ's Gas Station","BJ's Gas, 1412 Boston Providence Turnpike, Norwood MA"),
 ("CITGO","CITGO, 960 Boston Providence Hwy, Norwood MA"),
 ("Shell — Walpole Street","Shell, 491 Walpole St, Norwood MA"),
 ("Mobil / On the Run — Norwood Center","Mobil, 499 Washington St, Norwood MA"),
 ("Shell — Pleasant Street","Shell, 238 Pleasant St, Norwood MA"),
 ("Costco Gas — Dedham","Costco Gasoline, 200 Legacy Blvd, Dedham MA"),
 ("Costco Gas — Sharon","Costco Gasoline, 160 Old Post Rd, Sharon MA"),
]
def req(url, body=None, fields=None):
 headers={"X-Goog-Api-Key":KEY,"Content-Type":"application/json"}
 if fields: headers["X-Goog-FieldMask"]=fields
 r=urllib.request.Request(url,data=(json.dumps(body).encode() if body else None),headers=headers,method="POST" if body else "GET")
 with urllib.request.urlopen(r,timeout=25) as x:return json.load(x)
def price_value(x):
 v=x.get("price",{})
 units=v.get("units")
 nanos=v.get("nanos",0)
 return (float(units)+float(nanos)/1e9) if units is not None else None
def normalize(place):
 out={}
 newest=None
 for f in place.get("fuelOptions",{}).get("fuelPrices",[]):
  typ=str(f.get("type","")).upper()
  key={"REGULAR_UNLEADED":"regular","MIDGRADE":"midgrade","PREMIUM":"premium","DIESEL":"diesel"}.get(typ)
  if not key: continue
  val=price_value(f)
  if val is not None: out[key]=round(val,3)
  t=f.get("updateTime")
  if t and (newest is None or t>newest):newest=t
 if newest: out["updated"]=newest
 return out
results={}
for label,q in stations:
 try:
  s=req("https://places.googleapis.com/v1/places:searchText",{"textQuery":q,"maxResultCount":1},"places.id")
  places=s.get("places",[])
  if not places: continue
  pid=places[0]["id"]
  p=req("https://places.googleapis.com/v1/places/"+pid,fields="id,fuelOptions")
  n=normalize(p)
  if n: results[label]=n
 except Exception as e:
  print(f"{label}: {e}")
old={}
if OUT.exists():
 try: old=json.loads(OUT.read_text())
 except: pass
# Preserve last good station data if Google temporarily omits a station.
oldstations=old.get("stations",{}) if isinstance(old,dict) else {}
for label,_ in stations:
 if label not in results and label in oldstations: results[label]=oldstations[label]
payload={"generated_at":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"source":"Google Places API (New)","stations":results}
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n")
print(f"Wrote {len(results)} stations to {OUT}")
