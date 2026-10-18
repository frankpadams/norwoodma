#!/usr/bin/env python3
"""Regenerate restaurant SEO pages from data/restaurants.json. Idempotent."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
restaurants = json.loads((ROOT / "data/restaurants.json").read_text())
categories = [
    ("pizza", "Pizza", lambda x: x.get("category") == "Pizza & Italian" and "pizza" in (x.get("cuisine") or "").lower()),
    ("italian", "Italian Restaurants", lambda x: x.get("category") == "Pizza & Italian" and ("italian" in (x.get("cuisine") or "").lower() or "pasta" in (x.get("cuisine") or "").lower())),
    ("breakfast-cafes", "Breakfast & Cafés", lambda x: x.get("category") == "Breakfast & Cafe"),
    ("indian-south-asian", "Indian & South Asian", lambda x: x.get("category") == "Indian & South Asian"),
    ("asian", "Asian Restaurants", lambda x: x.get("category") in ("Asian", "Hibachi")),
    ("gluten-free-options", "Restaurants with Gluten-Free Options", lambda x: x.get("gluten_free") is True),
    ("mexican-latin", "Mexican & Latin", lambda x: x.get("category") == "Mexican & Latin"),
]
def e(value):
    return html.escape(str(value or ""), quote=True)
def official(x):
    url = x.get("url", "")
    return url if x.get("link_type") == "official" and url.startswith("https://") else ""
def item(x):
    name, address = x.get("name"), x.get("address")
    return {"@type": "Restaurant", "name": name,
            "address": {"@type": "PostalAddress", "streetAddress": address,
                        "addressLocality": "Norwood", "addressRegion": "MA", "addressCountry": "US"},
            **({"url": official(x)} if official(x) else {})}
def schema(rows, name):
    return json.dumps({"@context": "https://schema.org", "@type": "ItemList", "name": name,
                       "itemListElement": [{"@type": "ListItem", "position": i + 1, "item": item(x)}
                                           for i, x in enumerate(rows)]}, ensure_ascii=False).replace("<", "\\u003c")
def links():
    return " ".join(f'<a href="restaurants-{slug}.html">{e(label)}</a>' for slug, label, _ in categories)
for slug, label, test in categories:
    rows = [x for x in restaurants if x.get("name") and x.get("address") and test(x)]
    listings = "".join(
        f'<article class="listing"><h2>{e(x["name"])}</h2>'
        f'<p>{e(x.get("cuisine") or x.get("category"))} · {e(x["address"])}, Norwood, MA</p>'
        + (f'<a href="{e(official(x))}" rel="noopener">Official website ↗</a>' if official(x) else "")
        + ('<p>Gluten-free options reported; confirm ingredients and cross-contact directly.</p>' if x.get("gluten_free") else "")
        + '</article>' for x in rows)
    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(label)} in Norwood, MA | Norwood.ma</title><meta name="description" content="Explore {e(label.lower())} in Norwood, Massachusetts, with addresses and links to restaurant websites.">
<link rel="canonical" href="https://www.norwood.ma/restaurants-{slug}.html"><link rel="stylesheet" href="styles.css">
<script type="application/ld+json">{schema(rows, label + " in Norwood, MA")}</script>
<style>.category-page{{max-width:950px;margin:auto;padding:24px 18px 60px}}.listing{{padding:16px 0;border-bottom:1px solid #d9e2e9}}.listing h2{{margin:0 0 6px;font-size:1.25rem}}.listing p{{margin:6px 0}}.category-page nav a{{display:inline-block;margin:6px 12px 6px 0}}</style>
</head><body><div class="independent"><strong>Norwood.ma is an independent community site — not the Town of Norwood government website.</strong><a href="https://www.norwoodma.gov/">Official Town website ↗</a></div>
<main class="category-page"><a href="restaurants.html">← Food &amp; Drink directory</a><h1>{e(label)} in Norwood, Massachusetts</h1>
<p>Explore local places to eat. This is an alphabetical directory, not a ranking. Verify menus, hours and dietary needs directly with each establishment.</p>
<nav aria-label="Restaurant categories">{links()}</nav>{listings or "<p>No current listings.</p>"}</main>
<footer class="category-page"><p>Norwood.ma is independent and not affiliated with the Town of Norwood. Listings are informational, not endorsements.</p></footer></body></html>"""
    (ROOT / f"restaurants-{slug}.html").write_text(page)
# Refresh only generated blocks, preserving the existing interactive directory.
page_path = ROOT / "restaurants.html"
page = page_path.read_text()
start = page.index('<script type="application/ld+json">')
stop = page.index('</script>', start) + len('</script>')
rows = [x for x in restaurants if x.get("name") and x.get("address")]
page = page[:start] + '<script type="application/ld+json">' + schema(rows, "Norwood, Massachusetts Food and Drink Directory") + '</script>' + page[stop:]
start = page.index('<details class="restaurant-seo-list">')
stop = page.index('</details>', start) + len('</details>')
listings = "\n".join('<li><strong>' + e(x["name"]) + '</strong> — ' + e(x.get("category")) + ' · ' + e(x["address"]) + ((' · <a href="' + e(official(x)) + '" rel="noopener">Website</a>') if official(x) else '') + '</li>' for x in rows)
block = '<details class="restaurant-seo-list"><summary>Browse the full A–Z restaurant list</summary><h2 id="restaurant-all-heading">Norwood Restaurants, Cafés and Food Businesses A–Z</h2><p>Browse the complete directory below or use the search and filters above. Restaurant details may change; confirm directly before visiting.</p><ul>' + listings + '</ul></details>'
page = page[:start] + block + page[stop:]
page_path.write_text(page)
print(f"Generated 7 category pages and main directory from {len(rows)} restaurants")
