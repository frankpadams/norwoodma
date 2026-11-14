#!/usr/bin/env python3
"""Fetch an explicitly authorized GeoJSON outage feed. Never fabricate outages."""
import json, os, sys, urllib.request, datetime, pathlib, ipaddress, socket
from urllib.parse import urlparse

url=os.environ.get("OUTAGE_GEOJSON_URL","").strip()
if not url:
    print("No approved geographic outage endpoint configured; leaving data unchanged.")
    sys.exit(0)
u=urlparse(url)
if u.scheme!="https" or not u.hostname or u.username or u.password:
    sys.exit("Only an approved HTTPS feed URL is allowed")
# Prevent fetching loopback, private or link-local hosts.
for info in socket.getaddrinfo(u.hostname,443,type=socket.SOCK_STREAM):
    addr=ipaddress.ip_address(info[4][0])
    if not addr.is_global: sys.exit("Non-public endpoint refused")
req=urllib.request.Request(url,headers={"User-Agent":"NorwoodMA-OutageMap/1.0","Accept":"application/geo+json, application/json"})
with urllib.request.urlopen(req,timeout=20) as response:
    if response.geturl()!=url: sys.exit("Redirects are not permitted")
    raw=response.read(2_000_001)
if len(raw)>2_000_000: sys.exit("Feed too large")
data=json.loads(raw)
if data.get("type")!="FeatureCollection" or not isinstance(data.get("features"),list):
    sys.exit("Expected a GeoJSON FeatureCollection")
if len(data["features"])>2000: sys.exit("Too many features")
for feature in data["features"]:
    if feature.get("type")!="Feature" or not isinstance(feature.get("properties"),dict) or not isinstance(feature.get("geometry"),dict):
        sys.exit("Invalid feature")
    geom=feature["geometry"]
    if geom.get("type") not in ("Point","Polygon","MultiPolygon"): sys.exit("Unsupported geometry")
    if "coordinates" not in geom: sys.exit("Missing coordinates")
    def points(obj):
        if isinstance(obj,list) and len(obj)>=2 and all(isinstance(v,(int,float)) and not isinstance(v,bool) for v in obj[:2]):
            yield obj
        elif isinstance(obj,list):
            for child in obj: yield from points(child)
    coords=list(points(geom["coordinates"]))
    if not coords or any(not (-71.30 <= c[0] <= -71.10 and 42.10 <= c[1] <= 42.26) for c in coords):
        sys.exit("Coordinates outside Norwood area")
data["metadata"]={"source":"Approved Norwood utility geographic feed","updated_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"status":"connected"}
target=pathlib.Path("data/norwood-utility-outages.geojson")
target.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
print("Validated",len(data["features"]),"features")
