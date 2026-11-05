import json
import urllib.request
from pathlib import Path

URL = "https://feed.massdot-swzm.com/massdot_wzdx_v4.1_work_zone_feed.geojson"

def points(coords):
    if coords and isinstance(coords[0], (float, int)):
        yield coords
    else:
        for child in coords:
            yield from points(child)

def nearby(feature):
    coords = list(points((feature.get("geometry") or {}).get("coordinates", [])))
    return any(-71.29 <= x <= -71.10 and 42.12 <= y <= 42.27 for x, y, *_ in coords)

def save(feed):
    feed["features"] = [feature for feature in feed["features"] if nearby(feature)]
    Path("data/work-zones.json").write_text(json.dumps(feed, separators=(",", ":")) + "\n")

if __name__ == "__main__":
    with urllib.request.urlopen(URL, timeout=30) as response:
        save(json.load(response))
