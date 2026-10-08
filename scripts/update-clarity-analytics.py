#!/usr/bin/env python3
"""Publish an allowlisted, aggregate-only Clarity summary. Never publish the token or raw export."""
import datetime as dt
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

TOKEN = os.environ.get("CLARITY_API_TOKEN")
if not TOKEN:
    raise SystemExit("CLARITY_API_TOKEN GitHub secret is missing")
url = "https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=3"
req = Request(url, headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/json"})
with urlopen(req, timeout=35) as response:
    raw = json.load(response)
if not isinstance(raw, list):
    raise SystemExit("Unexpected Clarity API response format; not publishing")
# Clarity's metric export is a list of {metricName, information:[...]} records.
# Publish ONLY approved numerical totals, never raw referrers, URLs, or user/session identifiers.
allowed = {"Traffic", "EngagementTime", "ScrollDepth", "Quickback", "DeadClick", "RageClick"}
summary = {"updated_at": dt.datetime.now(dt.timezone.utc).isoformat(), "period_days": 3, "metrics": {}}
for record in raw:
    if not isinstance(record, dict) or record.get("metricName") not in allowed:
        continue
    metric = record["metricName"]
    info = record.get("information")
    if not isinstance(info, list) or not info or not isinstance(info[0], dict):
        continue
    first = info[0]
    keys = {
        "Traffic": ("totalSessionCount", "totalBotSessionCount", "distinctUserCount", "pagesPerSessionPercentage"),
        "EngagementTime": ("averageEngagementTime",),
        "ScrollDepth": ("averageScrollDepth",),
        "Quickback": ("sessionsCount",),
        "DeadClick": ("sessionsCount",),
        "RageClick": ("sessionsCount",),
    }[metric]
    values = {k: first[k] for k in keys if isinstance(first.get(k), (int, float)) and not isinstance(first[k], bool)}
    if values:
        summary["metrics"][metric] = values
if not summary["metrics"]:
    raise SystemExit("No recognized aggregate metrics in Clarity response; not overwriting cached data")
path = Path("data/clarity-summary.json")
path.parent.mkdir(exist_ok=True)
path.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")
print("Clarity summary updated with aggregate metrics:", ", ".join(summary["metrics"]))
