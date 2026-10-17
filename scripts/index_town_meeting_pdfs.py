#!/usr/bin/env python3
"""Build crawlable, searchable text pages from public Town Meeting PDFs.
Run in CI; PDFs remain on their original hosts. No OCR or invented text.
"""
import hashlib, html, json, re, time
from pathlib import Path
from urllib.parse import urlparse, unquote
import requests
import fitz
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"town-meeting-documents"
OUT.mkdir(exist_ok=True)
PAGE=(ROOT/"town-meeting-archive.html").read_text(encoding="utf-8")
soup=BeautifulSoup(PAGE,"html.parser")
urls={}
for a in soup.select('a[href]'):
    u=a.get("href","").strip()
    if re.search(r"\.pdf(?:[?#]|$)",u,re.I) and u.startswith("https://"):
        urls.setdefault(u,a.get_text(" ",strip=True) or "Town Meeting document")
registry=json.loads((ROOT/"data/town-meeting-sources.json").read_text())
for meeting in registry.get("meetings",[]):
    for source in meeting.get("sources",[]):
        u=source.get("url","")
        if re.search(r"\.pdf(?:[?#]|$)",u,re.I) and u.startswith("https://"):
            urls.setdefault(u,source.get("title") or "Town Meeting document")
session=requests.Session()
session.headers["User-Agent"]="NorwoodMACommunityArchiveIndexer/1.0 (+https://www.norwood.ma/)"
manifest=[]
for n,(url,label) in enumerate(urls.items(),1):
    slug=hashlib.sha256(url.encode()).hexdigest()[:16]
    filename=slug+".html"
    target=OUT/filename
    status="previously indexed" if target.exists() else "unavailable"
    if not target.exists():
        try:
            with session.get(url,timeout=22,stream=True,allow_redirects=True) as response:
                response.raise_for_status()
                data=bytearray()
                for chunk in response.iter_content(65536):
                    data.extend(chunk)
                    if len(data)>12_000_000:raise ValueError("PDF exceeds 12MB limit")
            doc=fitz.open(stream=bytes(data),filetype="pdf")
            pages=[p.get_text("text",sort=True).strip() for p in doc]
            text="\n\n".join(p for p in pages if p)
            if len(text)<80:raise ValueError("No extractable text (likely scanned PDF)")
            # Avoid massive low-quality index pages.
            text=text[:400000]
            title=html.escape(label)
            body=html.escape(text)
            source=html.escape(url,quote=True)
            markup=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><link rel="canonical" href="https://www.norwood.ma/town-meeting-documents/{filename}"><title>{title} — Norwood Town Meeting document text | Norwood.ma</title><meta name="description" content="Searchable text extracted from a public Town Meeting source document. Consult the original PDF for the authoritative record."></head><body><main><p><a href="../town-meeting-archive.html">← Norwood Town Meeting &amp; Archive</a></p><h1>{title}</h1><p>Text extracted from a publicly linked PDF. Formatting and extraction may be imperfect. The original document is authoritative: <a href="{source}">View original PDF</a>.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;line-height:1.5">{body}</pre></main><footer>Independent community information site. Not affiliated with the Town of Norwood government.</footer></body></html>'''
            target.write_text(markup,encoding="utf-8")
            status="indexed"
        except Exception as ex:
            status="unavailable: "+str(ex)[:110]
    manifest.append({"url":url,"title":label,"page":filename if target.exists() else None,"status":status})
    print(n,len(urls),status,label[:60],flush=True)
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
items="\n".join(f'<li><a href="{html.escape(x["page"])}">{html.escape(x["title"])}</a> — <a href="{html.escape(x["url"],quote=True)}">Original PDF</a></li>' for x in manifest if x["page"])
(OUT/"index.html").write_text(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><link rel="canonical" href="https://www.norwood.ma/town-meeting-documents/"><title>Searchable Town Meeting Documents | Norwood.ma</title></head><body><main><h1>Searchable Town Meeting Documents</h1><p><a href="../town-meeting-archive.html">Norwood Town Meeting &amp; Archive</a></p><p>Extracted text is provided for discovery; original official documents remain authoritative.</p><ul>{items}</ul></main></body></html>''',encoding="utf-8")
sitemap=ROOT/"sitemap.xml"
xml=sitemap.read_text(encoding="utf-8")
xml=re.sub(r'\s*<url><loc>https://www\.norwood\.ma/town-meeting-documents/[^<]*</loc></url>',"",xml)
newurls=['https://www.norwood.ma/town-meeting-documents/']+['https://www.norwood.ma/town-meeting-documents/'+x["page"] for x in manifest if x["page"]]
xml=xml.replace("</urlset>","".join(f"  <url><loc>{html.escape(u)}</loc></url>\n" for u in newurls)+"</urlset>")
sitemap.write_text(xml,encoding="utf-8")
print("Indexed",sum(bool(x["page"]) for x in manifest),"of",len(manifest),"linked PDFs")
