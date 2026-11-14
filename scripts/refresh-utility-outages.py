#!/usr/bin/env python3
"""Convert Norwood's publicly displayed DataCapable outage events into GeoJSON."""
import datetime as dt
import json
import math
import pathlib
import urllib.request

URL = "https://utilisocial.io/datacapable/v2/p/norwood/map/events"
MAP_URL = "https://norwood.datacapable.com/map/"
DEST = pathlib.Path("data/norwood-utility-outages.geojson")

def valid_point(lon, lat):
    return all(isinstance(x,(int,float)) and not isinstance(x,bool) and math.isfinite(x) for x in (lon,lat)) and -71.30 <= lon <= -71.10 and 42.10 <= lat <= 42.26

def geometry_from_polygon(poly):
    """Handle GeoJSON geometry and ArcGIS rings; skip unknown structures."""
    if not isinstance(poly,dict): return None
    if poly.get("type") in ("Polygon","MultiPolygon") and isinstance(poly.get("coordinates"),list):
        geometry={"type":poly["type"],"coordinates":poly["coordinates"]}
    elif isinstance(poly.get("rings"),list):
        geometry={"type":"Polygon","coordinates":poly["rings"]}
    elif poly.get("type")=="Feature":
        return geometry_from_polygon(poly.get("geometry"))
    else:return None
    def walk(obj):
        if isinstance(obj,list) and len(obj)>=2 and all(isinstance(x,(int,float)) for x in obj[:2]):
            yield obj
        elif isinstance(obj,list):
            for child in obj:yield from walk(child)
    pts=list(walk(geometry["coordinates"]))
    if len(pts)<4 or any(not valid_point(p[0],p[1]) for p in pts):return None
    return geometry

req=urllib.request.Request(URL,headers={"Accept":"application/json","User-Agent":"Norwood.ma public outage map/1.0"})
with urllib.request.urlopen(req,timeout=25) as resp:
    if resp.status!=200 or resp.geturl()!=URL:raise RuntimeError("Unexpected outage API response")
    raw=resp.read(2_000_001)
if len(raw)>2_000_000:raise RuntimeError("Response exceeds size limit")
events=json.loads(raw)
if not isinstance(events,list) or len(events)>1000:raise RuntimeError("Expected outage event array")
features=[]
for event in events:
    if not isinstance(event,dict):raise RuntimeError("Invalid outage event")
    lat,lon=event.get("latitude"),event.get("longitude")
    if not valid_point(lon,lat):
        raise RuntimeError("Outage event missing valid Norwood-area coordinates")
    props={"title":str(event.get("title") or "Norwood Light power outage")[:180],
           "provider":"Norwood Light","service":"Electric","source_url":MAP_URL}
    if event.get("numPeople") is not None:props["customers_affected"]=event["numPeople"]
    for src,dest in (("startTime","reported_at"),("lastUpdatedTime","updated_at"),("status","status"),("identifier","identifier")):
        if event.get(src) is not None:props[dest]=str(event[src])[:180]
    eid=str(event.get("id",""))[:100]
    features.append({"type":"Feature","id":eid or None,"geometry":{"type":"Point","coordinates":[lon,lat]},"properties":props})
    # Boundaries are included only if the source supplies interpretable geographic coordinates.
    polys=event.get("polygons") or []
    if isinstance(polys,dict):polys=[polys]
    if isinstance(polys,list):
        for i,poly in enumerate(polys[:30]):
            geom=geometry_from_polygon(poly)
            if geom:
                features.append({"type":"Feature","id":eid+"-area-"+str(i),"geometry":geom,"properties":dict(props,area_boundary=True)})
now=dt.datetime.now(dt.timezone.utc).isoformat()
output={"type":"FeatureCollection","metadata":{"source":"Norwood Light / DataCapable public outage map","source_url":URL,"updated_at":now,"status":"connected","event_count":len(events)},"features":features}
DEST.parent.mkdir(parents=True,exist_ok=True)
DEST.write_text(json.dumps(output,indent=2,ensure_ascii=False)+"\n")
print(f"Fetched {len(events)} Norwood outage events; published {len(features)} geographic features.")
