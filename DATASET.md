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

## v0.12.4 community-submission source

Approved/Published community submissions are ingested from the deployed privacy-safe Apps Script JSON endpoint registered as `community-event-submissions` in `data/source-registry.json`. The adapter maps allowlisted public fields into the standard event schema before deduplication and expiration. The private Google response spreadsheet and private submitter/moderation fields are not part of the public dataset.

## v0.12.4 publication acknowledgment

Community-submission records represented in `events.json` retain their `submission-…` stable IDs. The scheduled workflow can send those IDs plus public matching fields (title/date/venue) to the authenticated Apps Script acknowledgment endpoint after the generated dataset has been pushed. This acknowledgment contains no submitter contact or reviewer-note data and does not add private moderation data to the public dataset.

## Resource HTML publication

`data/resources-data.js` and `data/businesses-data.js` feed `scripts/generate-resource-html.cjs`, which runs the existing category/card rules in `scripts/resource-renderer.js` and writes all 27 topic sections into `resources.html`. Run the generator after changing those inputs. `.github/workflows/generate-resource-html.yml` automates regeneration on main. `resources.js` controls visibility, browser history, and filters without fetching either dataset. Related businesses remain collapsed. No-JavaScript visitors receive all topics.

## Town Meeting member records

`data/town-meeting-member-records.json` is the cumulative public dataset used by `town-meeting-member-records.js`. It contains 341 distinct member identities and five meeting cycles: May and October 2024, May and November 2025, and May 2026, with nine official attendance nights, one voting-derived attendance night and 179 electronic motions. Clicker tests and informal poll questions are excluded. The legacy 2026 and November 2025 voting files remain as source inputs.

Each member profile groups attendance and votes by meeting, newest first. Each motion links to an explicit stable article_target in the archive ledger; amendments and procedural votes share their parent article. Article navigation closes the member overlay and expands, highlights and focuses the destination. Members are linked from the current representative finder, the historical member directory and individual vote lists. Historical directory districts use the newest available attendance roster and do not imply current office.

For the nine nights with official attendance reports, PRESENT/ABSENT comes only from the dated official roster. For October 24, 2024, the owner explicitly authorized a separate voting-derived rule: any Yes/No/Abs vote means present; no recorded votes means absent. All 280 named rows are included, with 170 inferred present and 110 inferred absent; the UI labels the basis and does not call this an official attendance checklist. Districts use the May 2024 roster. Not listed, no vote recorded, abstention and unresolved identity remain distinct. Votes in combined reports are not assigned inferred dates. Official summary totals and named-voter totals are stored separately; seven source discrepancies are disclosed in the relevant vote details without changing any member’s named vote.

Name matching uses normalized full names or unique compatible given names and middle initials, preserving suffixes. The 2024 surname/initial reports are matched to the historical roster; ambiguous labels are resolved only when surrounding independently matched rows uniquely establish their roster position. One blank voter row is absent from the May 16 roster and is not assigned attendance. OCR corrections and 2024 row-level matching evidence are preserved in `data/town-meeting-member-match-audit.json`. Reproduction instructions and import scripts are in `scripts/town-meeting/`.

Every member-record motion has a nonempty description drawn from its linked article. Bare article labels and procedural labels are enriched with the subject so the record is intelligible before opening the article. Run `enrich-article-descriptions.py` after importing or updating source records.


## Map: ALPR cameras

The Explore Norwood map has an optional ALPR camera overlay, off by default. It consumes the public hourly U.S. vector-tile feed at `https://tiles.dontgetflocked.com/cameras-us-hourly.json`, sourced from community-mapped OpenStreetMap data through DeFlock. The layer uses viewport tiles rather than downloading the national dataset. Popups show available brand, operator and direction tags and link back to the OpenStreetMap record. Coverage may be incomplete; the site does not present this as a complete inventory. Attribute OpenStreetMap contributors and DeFlock when displaying this dataset.
