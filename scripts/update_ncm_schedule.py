#!/usr/bin/env python3
"""Publish NCM's scheduled programming from the public Cablecast listings.

The JSON contains the day's start-time slots; browsers choose the current
program locally, rather than freezing a title at the workflow's run time.
"""
import datetime
import json
import re
from pathlib import Path
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright

TZ = ZoneInfo("America/New_York")
CHANNELS = {
    "community": {"site": 1, "url": "https://norwoodcommunitymedia.org/programs/site/community-1/broadcast/"},
    "government": {"site": 3, "url": "https://norwoodcommunitymedia.org/programs/site/government-3/broadcast/"},
    "schools": {"site": 2, "url": "https://norwoodcommunitymedia.org/programs/site/school-2/broadcast/"},
}
# Cablecast's publicly indexed guide displays schedule time and title pairs.
CABLECAST = "https://reflect-npa.cablecast.tv/internetchannel/?channel=1&site={site}&currentDay={date}"
TIME = re.compile(r"^\s*(1[0-2]|0?[1-9]):([0-5][0-9])\s*([AP]M)\s*$", re.I)
IGNORE = {"schedule", "see the entire schedule", "search the schedule", "today"}

def to_minutes(line):
    m = TIME.fullmatch(line.strip())
    if not m:
        return None
    return (int(m[1]) % 12 + (12 if m[3].upper() == "PM" else 0)) * 60 + int(m[2])

def parse_lines(lines):
    """Only accept an exact standalone time followed by a plausible program title."""
    slots = []
    for i, line in enumerate(lines):
        minute = to_minutes(line)
        if minute is None:
            continue
        title = next((s.strip() for s in lines[i + 1:i + 5]
                      if s.strip() and to_minutes(s) is None), "")
        if not title or title.lower() in IGNORE or len(title) > 180:
            continue
        if title.startswith(("See the entire", "Showing ", "Browse our")):
            continue
        slots.append({"minute": minute, "title": title})
    # The schedule is chronological. Do not overwrite a valid title with
    # an unrelated list of archive programs further down the page.
    dedup = {}
    for slot in slots:
        dedup.setdefault(slot["minute"], slot)
    return sorted(dedup.values(), key=lambda x: x["minute"])

def extract(page):
    return page.evaluate("""() => {
      const section = [...document.querySelectorAll('h1,h2,h3,h4')]
        .find(h => h.textContent.trim().toLowerCase() === 'schedule');
      if (section) {
        let root = section.parentElement;
        for (let i=0; i<3 && root && root.innerText.length<180; i++) root=root.parentElement;
        if (root) {
          const text=root.innerText;
          if (/\\b(?:AM|PM)\\b/i.test(text)) return text.split(/\\n+/).map(s=>s.trim()).filter(Boolean);
        }
      }
      return document.body.innerText.split(/\\n+/).map(s=>s.trim()).filter(Boolean);
    }""")

def main():
    now = datetime.datetime.now(TZ)
    date = now.date().isoformat()
    output = {"updated_at": now.isoformat(), "date": date, "timezone": "America/New_York", "channels": {}}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for key, info in CHANNELS.items():
            entry = {"status": "unavailable", "title": None, "url": info["url"], "slots": []}
            for url in [CABLECAST.format(site=info["site"], date=date), info["url"]]:
                page = browser.new_page(timezone_id="America/New_York", user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36")
                try:
                    response = page.goto(url, wait_until="domcontentloaded", timeout=25000)
                    if response and response.status >= 400:
                        raise RuntimeError(f"HTTP {response.status}")
                    page.wait_for_timeout(3500)
                    slots = parse_lines(extract(page))
                    if slots:
                        entry["status"] = "scheduled"
                        entry["slots"] = slots
                        current = [s for s in slots if s["minute"] <= now.hour * 60 + now.minute]
                        entry["title"] = (current[-1] if current else slots[-1])["title"]
                        entry["source"] = url
                        break
                except Exception as exc:
                    print(f"{key}: {url}: {str(exc)[:160]}")
                finally:
                    page.close()
            output["channels"][key] = entry
        browser.close()
    Path("data/ncm-now-playing.json").write_text(json.dumps(output, indent=2) + "\n")
    print({k: (v["status"], len(v["slots"])) for k, v in output["channels"].items()})

if __name__ == "__main__":
    main()
