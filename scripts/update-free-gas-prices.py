#!/usr/bin/env python3
"""Best-effort free, community-reported station-price feed.
Unofficial GasBuddy client; no paid credentials. Never invent report timestamps.
"""
import asyncio, json, re
from datetime import datetime, timezone
from pathlib import Path
from py_gasbuddy import GasBuddy

OUT=Path("data/gas-prices.json")
ADDRESSES={
 "Norwood Gulf":"707 neponset",
 "Gulf — Broadway":"145 broadway",
 "Mr. Frank's Food Mart":"917 washington",
 "Sunoco — Route 1":"515 providence",
 "Route 1 Auto Services":"305 boston",
 "Mobil — Route 1":"971 providence",
 "Irving Oil / Rojo":"69 providence",
 "BJ's Gas Station":"1412",
 "CITGO":"960",
 "Shell — Walpole Street":"491 walpole",
 "Mobil / On the Run — Norwood Center":"499 washington",
 "Shell — Pleasant Street":"238 pleasant",
}
def norm(s): return re.sub(r"[^a-z0-9]+"," ",str(s).lower()).strip()
def timestamp(value):
 if not value:return None
 if isinstance(value,(int,float)):
  try:return datetime.fromtimestamp(value/1000 if value>1e11 else value,timezone.utc).isoformat()
  except (ValueError,OverflowError):return None
 if isinstance(value,str):
  try:return datetime.fromisoformat(value.replace("Z","+00:00")).astimezone(timezone.utc).isoformat()
  except ValueError:return None
 return None
def station_rows(payload):
 if isinstance(payload,list):return payload
 if not isinstance(payload,dict):return []
 for k in ("results","stations","data"):
  if isinstance(payload.get(k),list):return payload[k]
 return []
async def main():
 old=json.loads(OUT.read_text()) if OUT.exists() else {"stations":{}}
 try:
  client=GasBuddy()
  response=await client.price_lookup_service(zipcode="02062",limit=100)
 except Exception as exc:
  raise SystemExit(f"Free station feed failed; preserving existing data: {exc}")
 rows=station_rows(response)
 updates={}
 for item in rows:
  if not isinstance(item,dict):continue
  address=item.get("address") or {}
  addr=norm(" ".join(str(address.get(k,"")) for k in ("line1","line2")) if isinstance(address,dict) else str(address))
  name=norm(item.get("name",""))
  matches=[label for label,needle in ADDRESSES.items() if norm(needle) in addr]
  if len(matches)!=1:continue
  fuel=item.get("regular_gas") or item.get("regularGas") or {}
  if not isinstance(fuel,dict):continue
  raw=fuel.get("price")
  try:price=float(str(raw).replace("$",""))
  except (ValueError,TypeError):continue
  if not 1.5<=price<=8.0:continue
  report=next((timestamp(v) for v in (fuel.get("reported_at"),fuel.get("updated_at"),fuel.get("last_updated"),fuel.get("timestamp"),item.get("updated_at")) if timestamp(v)),None)
  if not report:continue
  if (datetime.now(timezone.utc)-datetime.fromisoformat(report)).total_seconds()>30*86400:continue
  updates[matches[0]]={"regular":round(price,3),"updated":report,"source":"GasBuddy community report"}
 if not updates:
  raise SystemExit(f"Free feed returned {len(rows)} stations but no safely matched, timestamped prices. Preserving existing data.")
 stations=dict(old.get("stations",{}))
 for label,entry in updates.items():
  previous=stations.get(label,{})
  old_time=timestamp(previous.get("updated") or previous.get("reported_at") or previous.get("checked"))
  if old_time and old_time>entry["updated"]:continue
  stations[label]={**previous,**entry,"stale":False}
 payload={**old,"generated_at":datetime.now(timezone.utc).isoformat(),"source":"Free community station reports","stations":stations}
 OUT.write_text(json.dumps(payload,indent=2,ensure_ascii=False)+"\n")
 print(f"Matched {len(updates)} timestamped station prices from {len(rows)} results")
if __name__=="__main__":asyncio.run(main())
