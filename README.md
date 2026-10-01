# Norwood.ma v1.0.2

Norwood.ma is an independent community information site for Norwood, Massachusetts. It combines local events, news, civic information, directories, maps, transit, weather, recreation, calendars, search, and practical resident resources in one mobile-friendly site.

**Production:** https://www.norwood.ma  
**Status:** stable 1.0 series  
**Canonical release policy:** `VERSIONING.md`

> Norwood.ma is independent and is not the Town of Norwood government website. Where appropriate, the site links residents to authoritative Town, school, transit, library, organization, and publisher sources.

## Current architecture

### Events and calendars
- `data/events.json` / `data/events-data.js` are the shared generated event dataset used by What's Happening and related event experiences.
- Event ingestion is source-driven, normalized, deduplicated, and expiration-aware.
- Community-submitted events enter through the documented moderation pipeline in `EVENT-SUBMISSION-SYSTEM.md`.
- Selectable calendars include official/community sources and topic-specific feeds where dependable ingestion is available.
- Same-day What's Happening priority is structural policy: Town Common/Farmers Market events first; then non-religious one-time/drop-in events; religious one-time/drop-in events; non-religious session occurrences; religious session occurrences. Source diversity operates within a tier.
- Regional events are maintained separately from the core Norwood calendar. Curated nearby/regional events may be included when they are reasonably relevant to Norwood residents, with municipality clearly identified.
- Recurring/annual event discovery begins up to six months ahead so major community events can be found before the immediate event window.
- Monthly discovery sweeps explicitly cover Health Department, Recreation, and individual school sources in addition to normal recurring ingestion.
- Public 5K/run/walk and similar community events are valid discovery targets.
- One-time public events should not be displaced by routine multi-week session occurrences.

### News
- News is aggregated from local/official and regional sources under the policy in `NEWS-SOURCES.md`.
- The system favors current, materially Norwood-related reporting; rejects stale, undated, promotional, obituary, and low-value single-game material; and deduplicates substantially identical coverage.
- Google News is a discovery mechanism, not a publisher or preferred source.
- News and event refreshes are automated; ordinary generated-content refreshes are not software releases.

### Search
- Search is comprehensive but intentionally ranked: Norwood.ma standalone/topic pages first, authoritative Town/school/utility pages second, and individual records/items after the relevant landing page.
- Search supports synonyms, related terms, spelling tolerance, and source indicators.
- Norwood government, Norwood Light, and Norwood Public Schools results receive source-specific indicators; event results receive an event/calendar indicator.
- Directory/category landing pages should rank before individual businesses/resources when the query names the category.

### Directories, resources, and maps
- Local Resources is for nonprofit, civic, public-service, assistance, and community resources; commercial businesses belong in the Business Directory.
- Business records may belong to multiple relevant categories. Every record with a usable street address should be mappable.
- Business categories/subcategories should provide a map route so users can compare nearby options.
- Food & Drink is backed by the maintained restaurant dataset and includes the Dinner Spinner.
- Parks/trails/recreation pages expose known amenities and mapping.
- How Do I provides task-oriented resident guidance and links to authoritative departments/services.

### Civic information and alerts
- Time-sensitive alerts are reserved for genuinely time-sensitive local information such as severe weather, major transit disruption/presence, emergency alerts, elections, major public meetings, and specially identified civic sessions.
- Alerts and homepage civic notices are date-sensitive content and should expire or be removed when no longer useful.
- Norwood Community Media schedules/streams are used when a government meeting has a confirmed live broadcast.
- The site clearly distinguishes itself from Town government.

### Transit, weather, and local tools
- Transit includes MBTA commuter rail and Route 34E context, with live information where available.
- Weather uses National Weather Service forecast data plus local radar and the Norwood Airport webcam.
- Interactive tools include Norwood Trivia, Dinner Spinner, calendar selection/subscription, maps, gas-price information, and other resident-oriented utilities.

### PWA, navigation, and presentation
- Primary interior navigation is Home · What's Happening · News · Explore · Transit · Calendars · Local Resources; the homepage omits redundant Home.
- Mobile navigation uses the hamburger menu; Support Norwood.ma is intentionally kept there rather than promoted into primary desktop navigation.
- Approved blue/gold Norwood.ma branding, favicon/home-screen icon, accessibility controls, and independent-site disclosures are sitewide conventions.
- Asset query-string versions are cache-busters and are separate from the product release number.

## Documentation policy

Documentation records **how Norwood.ma works**, not every ordinary content edit.

A structural or organizational change must be documented when it changes any persistent rule, architecture, workflow, taxonomy, ranking behavior, source strategy, data model, automation, navigation pattern, eligibility rule, or user-facing organization. Examples include changing event priority, adding a new class of monitored sources, creating a regional-events policy, changing search ranking, reorganizing resource/business taxonomy, adding a new calendar subsystem, or changing how alerts expire.

Routine content maintenance normally does **not** require a release note or README entry. Examples include adding/removing one event, deleting an expired notice, correcting one business record, replacing one article, changing a single event's date, or removing an obsolete detail page—unless that individual case also establishes or changes a general rule.

When an individual correction exposes a systemic gap, document the **systemic change**, not the individual item. For example, a missed clinic may lead to “Health Department is now an actively monitored event source”; the permanent documentation should record that monitoring rule rather than preserve the clinic itself as architecture.

See `VERSIONING.md` for the authoritative release/documentation rules.

## Authoritative project documents

- `VERSIONING.md` — product versioning, release procedure, and content-vs-structural documentation rule.
- `DATASET.md` — datasets, source registries, generated-data architecture, and schema notes.
- `EVENT-SUBMISSION-SYSTEM.md` — community submission/moderation/publication pipeline.
- `NEWS-SOURCES.md` — news-source strategy and publication rules.
- `DEVELOPER_TODO.md` — current unfinished work and verification tasks.
- `RECONCILIATION.md` — historical reconciliation record; not the current source of truth.
- `RELEASE-vX.Y.Z.md` — historical release notes for intentional product releases.

## Current stable release

### v1.0.2 — event priority and source coverage
Released September 29, 2026.

- Formalized same-day event priority and the one-time/drop-in-over-session rule.
- Added active Health Department event monitoring after a source-coverage gap was identified.
- Strengthened school Fine Arts/theatre discovery and added an NHS Theatre / Drama selectable calendar.

Post-release operational development has also added regional-event organization, six-month advance recurring-event discovery, and monthly Health/Recreation/per-school discovery sweeps. These are documented above as current architecture. They do not turn individual event additions/removals into software releases.

## Release history

- **v1.0.2** — event priority, Health Department source coverage, and Fine Arts/theatre monitoring.
- **v1.0.1** — one-time/drop-in events prioritized ahead of session occurrences.
- **v1.0.0** — first stable release; permanent semantic versioning and documentation synchronization established.
- **v0.13.0 and earlier** — pre-1.0 development history is preserved in the corresponding `RELEASE-v*.md` files and Git history rather than duplicated in this README.

## Maintenance rule

Before calling a software release complete, synchronize the current version in `VERSIONING.md`, this README, the matching release note, and `SITE_VERSION` in `nav.js`, then update any authoritative subsystem document affected by the change. Do not bump the product version for routine generated data or one-off content maintenance.
