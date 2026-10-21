"""Check the Government Guide's official source links; produce an audit report.
This is a source-check, not an automatic content updater.
"""
import json
import re
import urllib.request
from datetime import datetime, timezone
from html import unescape

with open("government-guide-test.html", encoding="utf-8") as f:
    page = f.read()
links = sorted(set(unescape(u) for u in re.findall(r'href="(https://www\\.norwoodma\\.gov/[^"]+)"', page)))
results = []
for url in links:
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "NorwoodMA-GovernmentGuide-SourceCheck/1.0"})
        with urllib.request.urlopen(request, timeout=20) as response:
            results.append({"url": url, "status": response.status, "final_url": response.url})
    except Exception as exc:
        results.append({"url": url, "error": str(exc)})
report = {"checked_at": datetime.now(timezone.utc).isoformat(), "note": "Link health only; leadership and menu synchronization not implemented.", "results": results}
with open("government-guide-source-check.json", "w", encoding="utf-8") as f:
    json.dump(report, f, indent=2)
print(f"Checked {len(results)} official links; {sum('error' in r for r in results)} returned errors.")
