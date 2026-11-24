#!/usr/bin/env python3
"""Refresh the Norwood.ma closed-sales snapshot from a dated public market report.

Safeguards: require a dated report, a recognizable sold-only table and valid
prices/dates; leave the previously published page untouched on any failure.
The report is an MLS-backed market snapshot, NOT a deeds registry feed.
"""
import argparse
from datetime import date, datetime
from html import escape
from pathlib import Path
import re
import sys
import requests
from bs4 import BeautifulSoup

SOURCE = "https://www.lisaisrealestate.com/norwood-home-values/"
PAGE = Path("real-estate.html")
START = '<div class="tool-card" id="sales">'
END = '<div class="tool-card local-lookups">'
MONTHS = ("January February March April May June July August September October November December").split()
MONTH_RE = "|".join(MONTHS + [m[:3] for m in MONTHS])
DATE_RE = re.compile(rf"\b(?:{MONTH_RE})\.?\s+\d{{1,2}},?\s+20\d{{2}}\b", re.I)
DATE_HEADER = re.compile(r"Market report,\s*updated\s+((?:" + MONTH_RE + r")\s+\d{1,2},?\s+20\d{2})", re.I)
PRICE_RE = re.compile(r"\$\s*[\d,]+")
ADDRESS_RE = re.compile(r"\bNorwood,\s*MA\s*02062\b", re.I)

def parse_date(value):
    value = value.strip().replace(".", "")
    for fmt in ("%B %d, %Y", "%b %d, %Y", "%B %d %Y", "%b %d %Y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            pass
    raise ValueError(f"Unrecognized date: {value}")

def clean(value):
    return " ".join(value.split())

def get_cells(row):
    return [clean(cell.get_text(" ", strip=True)) for cell in row.find_all(["th","td"], recursive=False)]

def parse_rows_from_tables(soup, report_date):
    results = []
    for table in soup.find_all("table"):
        trs = table.find_all("tr")
        if not trs:
            continue
        headers = [x.lower() for x in get_cells(trs[0])]
        if not (any("sold price" in h for h in headers) and any("sold date" in h for h in headers)):
            continue
        def col(name):
            return next((i for i,h in enumerate(headers) if name in h), None)
        ix = {k:col(k) for k in ("address","beds","baths","living","sold price","sold date")}
        if any(v is None for v in ix.values()):
            continue
        for tr in trs[1:]:
            cells = get_cells(tr)
            if len(cells) <= max(ix.values()):
                continue
            raw_date = DATE_RE.search(cells[ix["sold date"]])
            price = PRICE_RE.search(cells[ix["sold price"]])
            if not raw_date or not price:
                continue
            sold_date = parse_date(raw_date.group())
            if sold_date > report_date or sold_date > date.today():
                continue
            address = re.sub(r"\s*Norwood,\s*MA\s*02062.*$", "", cells[ix["address"]], flags=re.I).strip()
            if not address or len(address)>110:
                continue
            results.append(dict(address=address,beds=cells[ix["beds"]],baths=cells[ix["baths"]],
                sqft=cells[ix["living"]],price=price.group(),sold=sold_date))
    return results

def parse_rows_from_text(soup, report_date):
    """Fallback for accessible reports rendered without HTML table elements."""
    text = clean(soup.get_text(" ", strip=True))
    begin = text.find("All sold listings")
    if begin < 0:
        return []
    portion = text[begin:text.find("Questions about this market?", begin) if "Questions about this market?" in text[begin:] else begin + 16000]
    # Require the sold-only table headers so active/pending prices cannot be confused with sales.
    head = portion.find("Sold date")
    if head < 0 or "Sold price" not in portion[:head]:
        return []
    portion = portion[head + len("Sold date"):]
    # Text-rendered report records have a town/ZIP anchor, followed by: beds, baths,
    # area, sold price, sold/list %, $/ft2, days and closing date.
    pattern = re.compile(
        r"(?P<address>[\w#./'() -]{4,95}?)\s+Norwood,\s*MA\s*02062\s+"
        r"(?P<beds>\d+|—)\s+(?P<baths>\d+|—)\s+(?P<sqft>[\d,]+|—)\s+"
        r"(?P<price>\$[\d,]+)\s+(?:[\d.]+%|—)\s+(?:\$[\d,]+|—)\s+"
        r"(?:\d+\s+days|—)\s+(?P<sold>(?:" + MONTH_RE + r")\.?\s+\d{1,2},?\s+20\d{2})",
        re.I)
    out = []
    for match in pattern.finditer(portion):
        row = match.groupdict()
        sold = parse_date(row["sold"])
        if sold <= report_date and sold <= date.today():
            out.append(dict(address=clean(row["address"]), beds=row["beds"],baths=row["baths"],
                sqft=row["sqft"],price=row["price"],sold=sold))
    return out

def render(rows, report_date):
    rows = sorted({(r["address"].lower(),r["sold"]):r for r in rows}.values(),
                  key=lambda r:(r["sold"],r["address"]), reverse=True)[:15]
    if len(rows) < 5:
        raise ValueError("Too few valid closed-sale rows; preserving current page")
    parts = [
      START+'<h3>Recent Norwood Home Sales</h3>',
      '<p class="source-note"><strong>Report updated: '+report_date.strftime("%B %-d, %Y")+
      '.</strong> Latest available source report; sales are reported closings, not independently verified deed recordings.</p>',
      '<div class="sales-row header"><span>Address</span><span>Beds/Baths</span><span>Sq. ft.</span><span>Sale price</span><span>Sale date</span></div>'
    ]
    for r in rows:
        fields=[f"<strong>{escape(r['address'])}</strong>",
                escape(f"{r['beds']} / {r['baths']}"),escape(r["sqft"]),
                escape(r["price"]),r["sold"].strftime("%b. %d, %Y")]
        parts.append('<div class="sales-row">'+''.join('<span>'+f+'</span>' for f in fields)+'</div>')
    parts.append('<p class="source-note"><strong>Source:</strong> <a href="'+SOURCE+
      '" target="_blank" rel="noopener">Current Norwood market report and closed sales ↗</a>. '
      'The source may omit or delay transactions. Confirm officially recorded transfers through the '
      '<a href="https://www.norfolkdeeds.org/research/begin-online-research" target="_blank" rel="noopener">'
      'Norfolk County Registry of Deeds ↗</a>.</p></div>\n')
    return "".join(parts)

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--check-only",action="store_true")
    args=p.parse_args()
    response=requests.get(SOURCE,timeout=25,headers={"User-Agent":"NorwoodMA-Community-Sales-Report/1.0"})
    response.raise_for_status()
    soup=BeautifulSoup(response.text,"html.parser")
    normalized=clean(soup.get_text(" ", strip=True))
    match=DATE_HEADER.search(normalized)
    if not match:
        raise ValueError("Missing explicit source report update date; no changes published")
    report_date=parse_date(match.group(1))
    if report_date>date.today():
        raise ValueError("Source report date is in the future")
    rows=parse_rows_from_tables(soup,report_date) or parse_rows_from_text(soup,report_date)
    snapshot=render(rows,report_date)
    original=PAGE.read_text(encoding="utf-8")
    if original.count(START)!=1 or original.count(END)!=1:
        raise ValueError("Cannot uniquely locate sales card; preserving page")
    old=original.split(START,1)[1].split(END,1)[0]
    previous=re.search(r"(?:Report updated:|Latest verified snapshot:)\s*(\w+\s+\d{1,2},\s*20\d{2})",old)
    if previous and parse_date(previous.group(1))>report_date:
        print("Source report is older than published snapshot; no update")
        return
    updated=original.split(START,1)[0]+snapshot+END+original.split(END,1)[1]
    if updated==original:
        print("No changes")
        return
    if args.check_only:
        print(f"Would publish {len(rows)} closed sales from {report_date}")
    else:
        PAGE.write_text(updated,encoding="utf-8")
        print(f"Published {len(rows)} closed sales from report dated {report_date}")

if __name__=="__main__":
    try:
        main()
    except Exception as exc:
        print(f"Sales updater: {exc}. Existing data preserved.",file=sys.stderr)
        sys.exit(1)
