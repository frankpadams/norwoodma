# Norwood.ma Data + Automation Foundation

This package turns the growing Norwood source registry into a static-site content pipeline. The site can render current event/news data without a new visual release, while GitHub Actions refreshes the data twice daily.

## Core data files

- `data/source-registry.json` — catalog of local/official/community/media/venue sources, including monitor priority, ingestion method, filtering, verification, and expected output types.
- `data/events-seed.json` — manually verified seed/current event records used as a safety net and for sources that do not yet expose machine-readable events.
- `data/events.json` — generated current/upcoming publish feed used by the public site.
- `data/events-data.js` — browser-safe fallback copy of the event feed so the package also works when opened directly from disk.
- `data/news.json` — generated current local-news feed.
- `data/news-data.js` — browser-safe fallback copy of current news.
- `data/discovery-queries.json` — targeted discovery queries for harder-to-find community events.
- `data/ingestion-policy.json` — publication, geography, deduplication, expiration, and source-precedence rules.
- `data/place-aliases.json` — canonical venue/place aliases and geography-normalization rules.
- `data/refresh-status.json` — most recent refresh run details/failures.
- `data/automation-coverage.json` — current programmatic coverage summary.
- `data/dataset-audit.json` — integrity checks.

## Current snapshot — 2026-09-17

- 217 source records
- 69 active monitor channels overall
- 86 unique source domains
- 56 normalized seed events
- 54 current publish candidates
- 26 cross-source discovery-query templates
- 55 active event-producing sources
- 35 event sources are programmatically attempted on each scheduled run using structured feeds/APIs or machine-readable event markup
- 18 active event-discovery sources still require a search-provider integration to become fully automatic
- 18 active hero photographs with verified reusable/public-domain licensing, plus a separate rights-review candidate list

## Twice-daily refresh

`.github/workflows/refresh-content.yml` runs `scripts/refresh_content.py` at 11:17 and 23:17 UTC and can also be run manually. The odd minute avoids the busiest top-of-hour GitHub scheduler window.

Each run:

1. checks supported event sources,
2. ingests The Events Calendar/Tribe APIs, iCal feeds, JSON-LD Event markup, and discoverable iCal links,
3. merges results with still-current verified seed events,
4. applies geography/public-access filtering and deduplication,
5. expires past events,
6. refreshes local news from configured RSS/page sources **and four Google News RSS searches** (`"norwood, ma"`, `"norwood ma"`, `norwoodma`, `"norwood, massachusetts"`), then deduplicates while preferring direct-publisher URLs,
7. writes `events.json`, `events-data.js`, `news.json`, `news-data.js`, and refresh diagnostics,
8. commits only when the generated data changed.

A failed source does not blank the site: the updater preserves other valid/current material and the browser has bundled JS fallbacks.

## Important distinction

A source being monitored does not mean every item from that source belongs in **What's Happening**. The ingestion policy filters routine municipal meetings, registered-only youth activities, routine worship, out-of-town events, undated resource pages, and duplicates.

## Remaining automation work

Broad web/social discovery is the main gap. The 26 discovery queries and 18 discovery-source records are ready for a future search-provider adapter; GitHub Actions cannot reliably reproduce a general web search without a search service/API. Those sources remain valuable discovery targets, but they should not be scraped blindly.

## Food & Drink directory
`data/restaurants.json` is the canonical Food & Drink directory. v0.11.6 contains 80 Norwood eateries/drink/dessert listings. Links use an official business website when verified; when an official site is not available, the record uses a business-specific Google Maps URL. `data/restaurants-data.js` is the static-browser companion file.

## Houses of Worship
The resource taxonomy now includes a dedicated `worship` topic. Norwood congregations are listed first by relevance; nearby Westwood, Needham and Sharon resources are intentionally included when they broaden the faith traditions available to Norwood residents. These entries are resource-directory listings, not endorsements, and do not automatically make routine worship services eligible for What’s Happening.

## Trails
Norwood Trails now points to the Town's current Trails Advisory Committee/document center hub: `https://www.norwoodma.gov/document_center/trails_advisory_committee.php`.


## Youth Sports & Activities
The resource taxonomy now includes a dedicated `youth` topic. This build contains 34 records tagged into that topic, combining existing Norwood leagues with newly added cheer, gymnastics, lacrosse, field hockey, adaptive sports, dance, skating, martial arts, music, scouting and theater resources.

## Food taxonomy
Food & Drink now exposes **Brazilian** as its own cuisine/type. Turkish and Lebanese restaurants are grouped under **Middle Eastern** while retaining their specific cuisine descriptions and search tags.


## v0.11.8 additions
Resources: 312 records. Source registry: 225 sources across 94 domains. Added Temple Sinai of Sharon and seven nearby Things to Do destinations with explicit municipality labeling.

## v0.11.41 additions
- `data/featured.json` / `data/featured-data.js`: optional manually curated homepage feature with enabled state, label, title, summary, specific URL, start date and expiration date.
- `data/hero-photos.json`: `heroPriority` may be `primary` or `supporting`; homepage rotation prefers `primary` images. `resolution` is recorded when verified for newly added images.


## Trivia question bank (v0.11.42)

`data/trivia-questions.js` contains 152 launch questions. Each record stores the question, four answer choices, correct-answer index, category, explanatory fact, and a source URL. Current primary sources include the Norwood Historical Society, Morrill Memorial Library local-history archive, Town annual-report material, and Norwood on Film. The target is approximately 200 questions, but additions should be fact-checked and sourced rather than generated to hit a quota. Time-sensitive census/demographic questions must identify their reference year.
