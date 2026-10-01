# Norwood.ma Historical Reconciliation Record

**Status:** Historical archive.  
**Current project architecture:** see `README.md`.  
**Current release/documentation policy:** see `VERSIONING.md`.

This file preserves the major reconciliation work performed while Norwood.ma was moving rapidly through pre-1.0 development. It is **not** a current checklist or source of truth. Items that remain genuinely unfinished belong in `DEVELOPER_TODO.md`; current architecture belongs in `README.md`; subsystem rules belong in their dedicated documentation.

Do not append ordinary event/business/news/resource additions or deletions here. Do not use this file as a second changelog.

## Major reconciled milestones

### Directory and resource architecture
- Food & Drink was rebuilt as a data-backed searchable directory.
- Local Resources evolved toward plain-language resident needs, with businesses separated into the Business Directory.
- Houses of Worship and Youth Sports & Activities became explicit resource topics.
- Nearby resources/destinations are permitted where useful, with geography identified rather than implying they are in Norwood.
- Trails links were corrected toward authoritative Town resources.

### Event and calendar architecture
- What's Happening moved from hard-coded HTML to generated event data shared with homepage/event experiences.
- Scheduled ingestion, normalization, deduplication, expiration, source monitoring, and generated calendar feeds became core infrastructure.
- Build My Calendar evolved from a placeholder into a selectable/subscribable calendar experience.
- Community event submissions gained a moderation-first Google Form/Sheet/Apps Script pipeline; the permanent technical authority is `EVENT-SUBMISSION-SYSTEM.md`.
- Same-day ordering later formalized one-time/drop-in events ahead of multi-week session occurrences, with Town Common/Farmers Market priority and religious/non-religious tiers.
- Health Department and school Fine Arts/theatre coverage were strengthened as monitored source classes.
- Post-1.0.2 work added a distinct regional-events calendar/policy, advance discovery for recurring/annual events up to six months ahead, and monthly discovery sweeps for Health, Recreation, and individual schools.

### News architecture
- News moved to a scheduled generated-data pipeline with freshness and relevance filtering.
- Google News searches are used for discovery, while direct publishers/official sources are preferred.
- Source strategy was audited and moved into the permanent `NEWS-SOURCES.md` authority.

### Navigation and discovery
- Primary navigation standardized around Home, What's Happening, News, Explore, Transit, Calendars, and Local Resources, with Home omitted on the homepage.
- Explore became the discovery hub; Food & Drink and Things to Do remain prominent destinations.
- Search, source indicators, directory search, and relevance behavior were iteratively improved and preserved as core site functionality.

### Branding, accessibility, and presentation
- Approved Norwood.ma blue/gold branding and favicon became canonical.
- Independent/non-endorsement disclosures, keyboard/focus/accessibility work, and responsive/mobile navigation were retained.
- Homepage hero imagery became data-driven with rights/source tracking.

### Stable-release transition
- v1.0.0 declared the first stable public release.
- `VERSIONING.md` became the canonical version/release policy.
- Product versions were separated from cache-busting asset identifiers.
- Release synchronization across VERSIONING, README, release notes, footer version, and affected subsystem docs became mandatory.

## Historical note on ordinary content

During rapid development, older documentation sometimes named individual events, businesses, resources, or corrections. Those references are historical evidence of why a system changed, not a requirement to keep recording content item-by-item.

From the 1.0 series forward, permanent documentation should capture the **generalized structural rule**. Individual content additions/removals remain visible in Git history and generated datasets without becoming architecture documentation.
