# Norwood.ma Developer To-Do

This is a shared working log for unfinished development, data-quality issues, and follow-up work. It is not an authority on what is true: Frank's decisions govern project direction, and automated entries are leads to review rather than conclusions. When Frank asks for the developer to-do list, project work log, outstanding issues, next steps, or similar, review this file as a useful project record and update it as work is completed or new issues are identified.

_Last updated: 2026-10-15_

## October 8–15 development review — unfinished / unverified

These are follow-ups identified from the week's development conversations. A commit alone does not establish that the deployed desktop and mobile experiences work. Recheck against the live site before marking an item complete.

### High priority: Trail accuracy and deployment

- [ ] **Finish the Germany Brook Trail geometry on the test map.** Use the exact existing OpenStreetMap footpaths, not hand-drawn approximations or broad path searches: cross Winter Street, follow the east side of Father MacAleer soccer fields, behind the pool, emerge at the end of Hawthorne Street, continue through the Savage Center, and terminate at the short trail near the Senior Center. Preserve the Willett School/landfill route and legitimate viewpoint/field branches shown on the official brochure. Exclude cemetery roads and unrelated sidewalks; visually verify every connection and endpoint on desktop and mobile.
- [ ] **Verify trail boundary policy and OSM connectivity.** Retain an entire selected trail way whenever any part intersects Norwood, including a brief Westwood crossing. Confirm that the Winter Street connection actually renders and that named OSM ways plus manually verified unnamed connectors form the intended route. Remove or disable obsolete brochure approximation and overly broad ten-hop candidate-selection logic after accurate geometry is implemented.
- [ ] **Advance the townwide trail overlay.** Identify and align remaining Norwood trails to actual OSM paths / authoritative maps, preserving the already-accurate Shattuck Park trails. Validate trailheads, route lengths, junctions and mobile map usability before moving test routes live.

### Ads, sponsors and admin publishing

- [ ] **Audit and complete all advertising placements and the sponsor registry.** Confirm Boston Mobile Tire's existing ad renders consistently; connect lender/real-estate agent slots and all other active spaces to the admin panel. Inventory homepage/sidebar/footer, real estate and other pages, including Trash page ad 1–4. Display actual placement dimensions, recommended upload dimensions, aspect ratio, and desktop/mobile previews in the admin editor; test blank-state behavior and deployment.
- [ ] **Complete secure one-click admin publishing and verify deployed dashboard.** Carry forward the existing top-priority publishing task; verify permissions, preview, save, publish, errors, and status for events, Hey Norwood, news, alerts, resources and sponsors, rather than relying on staged JSON downloads.

### Events and source quality

- [ ] **Live-QA universal event popups.** Verify consistent popup behavior across government and nongovernment events, the visible organizer website and Norwood.ma referral line, clear cost notices, external links opening once, responsive mobile layout, calendar export to Google/Apple, and social sharing. Commits were reported but deployed behavior remains unverified.
- [ ] **Audit the events feed for duplicates, confusing titles, incorrect categories and expired entries.** Specifically check same-evening Dungeons & Dragons duplicates, incorrectly imported news items, homepage ordering (Common/farmers market first on their date), and source deduplication. Confirm local Home Depot children's workshops, Weekend Craft Café and other newly added feeds actually appear.
- [ ] **Finish event source and ingestion verification.** Compare newly added PTO/school/youth-organization fundraiser sources, public-health and community sources, and the Worcester Deaf Club craft fair in Framingham against the live calendar; do not treat a registered source as successful until events are ingested.

### Search, directories and local content

- [ ] **Test and improve sitewide search federation.** Verify searches reach the Town Meeting Archive, Library of Things, Food & Drink, business directory and other indexes; prioritize relevant Norwood.ma results, handle synonyms (including VHS/VCR), misspellings and aliases, and suppress irrelevant resource-library pages. Verify the recent Library of Things synonym changes live.
- [ ] **Finish Food & Drink desktop/mobile QA.** Verify autocomplete, cuisine and dietary filters, full-bar filter, Dinner Spinner, beverage coverage, partial/third-party menus, restaurant aliases and spelling tolerance; audit missing/renamed establishments and licensing information. Confirm the main-search restaurant-result integration.
- [ ] **Verify and finish business/artist listings.** Check Colonial Ale House/Gemma updates, Got Styles Hair Salon, and any unpublished Lucky Mart, El Valle and La Baguette records; complete individually verified Winsmith Mill/Commerce Center tenant and artist profiles rather than linking everyone to a generic building page.
- [ ] **Verify How Do I and resource-directory navigation.** Confirm the Norwood.ma trash/recycling pickup-day link is prominent and working after the Oct. 15 commit. Audit the Town's How Do I topics for missing Norwood.ma internal links, verify resource categorization and map links, and test on mobile.

### Media, maps and municipal records

- [ ] **Fix Real Estate / Moving to Norwood video navigation.** Each linked eLocalLink video must open its specific segment, not the default welcome video. Verify sponsor visibility, test the requested in-page popup player and mobile behavior, and check deployment.
- [ ] **Finish Town Meeting Archive quality audit.** Replace remaining placeholders with sourced records, fix popup/external-link double activation and broken Town document links, verify article votes/outcomes/NCM video references and multi-night meetings, and confirm deep indexing works in archive and sitewide search.
- [ ] **Verify homepage hero image rotation.** Confirm the Senior Center photo is in rotation with its crop positioned approximately 15% higher and the repeatedly shown house photo receives a lower frequency; audit all image weights and mobile crops.

### Infrastructure and analytics

- [ ] **Complete gas-price reliability and submission workflow.** Find a sustainable free/low-cost price data source (including iExit feasibility); preserve user-submitted prices, implement the agreed automatic acceptance for submissions within 15% and review handling outside that range, and display each price's update time. Test the live gas page and admin review workflow.
- [ ] **Finish analytics ingestion setup.** Verify the Google Apps Script web-app `/exec` URL and Events-sheet receipt, resolve public tracking-token security and privacy design, then enable and test the website tracker.
- [ ] **Verify GitHub Pages deployment and recently committed changes.** Audit failed/queued workflows, confirm the live site matches the intended cumulative commits, check custom error pages and shared footer, and perform targeted desktop/mobile smoke tests before marking any of the above complete.

## Existing-backlog currency audit — October 15

Reviewed every pre-existing checklist item against available repository evidence, focusing on homepage/calendar code, source-health data, Conflict Contraption, and release metadata. This is a source-code audit, not a complete live deployment or ingestion verification.

- **Implemented in source:** Homepage Select Calendars link and its deep link to the expanded picker. Marked complete for implementation; live/mobile QA still applies.
- **Partially implemented:** Calendar-source health fields and selector presentation exist; stale policies, complete source coverage, and operational alerting remain open.
- **Still open:** Conflict Contraption combines the main event array with a separate possible-conflicts array; unification and relevance metadata are not complete.
- **Consistent but potentially dated:** README, VERSIONING and footer script agree on v1.0.2; evaluate whether October changes warrant a release bump.
- **Insufficient evidence to close:** Secure admin publishing, individual school/sports/arts/health feed ingestion, zero-event feeds, calendar availability/submission UX, remembered homepage selection behavior, Conflict Contraption filtering/preferences, and ongoing documentation discipline. Retain open status pending functional verification.
- **Overlap:** October follow-ups overlap older ingestion, publishing and versioning tasks; treat the new entries as acceptance checks rather than separate projects.

## Highest priority: Secure one-click publishing

- [ ] **Enable secure direct publishing from /admin/.** Authenticate only the authorized Norwood.ma Google account with server-side token validation; store GitHub publishing credentials as backend secrets (never in browser code); provide Publish for events, Hey Norwood, news, alerts, resources, and featured items; validate inputs, commit to correct live data sources, trigger deployment, show success/failure and publication status. Aim for no JSON download or manual GitHub step. Confirm Cloudflare Worker free-tier suitability and protect against unauthorized requests.

## Priority: Calendar / Events Infrastructure

- [ ] **Finish connecting and verifying every calendar source.** A calendar counts as connected only when real events are successfully reaching the master event dataset; a registered URL or selector alone does not count.
- [ ] **Complete the unified master event dataset.** What's Happening, calendar feeds, and Conflict Contraption should use the same underlying event records, with metadata controlling where events appear.
- [ ] **Verify NHS Athletics ingestion.** Confirm the NPS/athletics structured calendar route is producing current games/events in the master dataset; support sport/team filtering where data permits.
- [ ] **Verify NPS Fine Arts ingestion.** Multi-source monitoring now checks NHS iCal + official NHS Fine Arts + NPS news + PMA and exposes an NHS Theatre / Drama selector. Confirm the next newly announced theatre/drama event reaches the master dataset automatically.
- [ ] **Verify NPS Music (PMA) ingestion.** Compact selector label should remain “NPS Music (PMA)”; expanded detail should identify “NPS Parent Music Association.”
- [ ] **Complete youth-sports adapters.** Prioritize Norwood Youth Soccer and Norwood Little League, then work through remaining youth-sports sources. Generate team-level choices dynamically when practical rather than hard-coding stale team lists.
- [ ] **Work through zero-event selectable sources.** Continue source-by-source through support/recovery groups, faith organizations, community organizations, recreation, arts/classes, and other selectable calendars.
- [ ] **Calendar availability UX.** Keep the checkbox-style control for known calendars. If Norwood.ma cannot ingest a live feed, clicking it should explain that no live feed is available and link to the best schedule/calendar page, or the organization website if no schedule page exists. Do not falsely add it to the combined calendar.
- [ ] **Future calendar submission UX.** When calendar submissions are implemented, add a contextual “Know a calendar feed? Submit it” action to unavailable-feed details.

- [ ] **Health Department event coverage.** A dedicated active source now monitors Norwood Health Department public clinics/events after the Oct. 1 flu clinic exposed a source gap. Confirm future vaccination/screening/public-health events are discovered automatically rather than only through manual flyers or Senior Center materials.

## Calendar Freshness / Data Quality Safeguards

- [ ] **Audit stale-calendar detection end-to-end (partially implemented).** Calendar source-health data already contains last_checked, last_successful_update and consecutive_failures, and the calendar selector reads health data. Verify stale policy, coverage, alerting and production refresh.
- [ ] **Define source-specific freshness thresholds.** Do not assume that a low-frequency annual calendar is stale on the same schedule as athletics or a frequently updated community calendar.
- [ ] **Prevent stale data from appearing current.** Old events/feed data should be flagged, suppressed, or clearly identified according to the source's freshness policy rather than silently presented as current.
- [ ] **Create actionable stale/failure reporting.** Repeated failures or a source crossing its stale threshold should create/record a developer action item instead of failing silently.
- [ ] **Add a source-health audit view/report.** Make it easy to see active sources, sources producing events, zero-event sources, stale sources, failures, and last successful refresh.

## What's Happening / Homepage

- [x] **Add “Select Calendars” to the homepage calendar header (implemented in source).** The homepage has a right-aligned Select Calendars link; verify mobile layout.
- [x] **Deep-link the homepage button to the expanded calendar page with Select Calendars open (implemented in source).** The link and parameter/fragment handling exist; verify live navigation.
- [ ] **Honor remembered calendar selections on the homepage.** Keep curated core What's Happening events and supplement them with events from the visitor's locally remembered selections.
- [ ] **Show selection state in the homepage button.** After customization, use a compact indication such as “Calendars · 3 selected.”

## Conflict Contraption

- [ ] **Unify Conflict Contraption event data and relevance rules.** Its JavaScript currently merges NORWOOD_EVENTS with a separate NORWOOD_POSSIBLE_CONFLICTS dataset; consolidate authoritative records and control inclusion with relevance metadata.
- [ ] **Implement conflict relevance profiles.** Support `default conflict`, `optional conflict`, and `not conflict relevant` (or equivalent metadata).
- [ ] **Use sensible defaults rather than selecting every granular feed.** Major community events, school-wide events, significant athletics, performances, fundraisers, facility reservations, roadwork, elections, etc. should generally be on by default; individual teams/practices and other high-volume feeds should generally be optional.
- [ ] **Add hierarchical filters.** Allow broad categories to be toggled and expanded into increasingly specific feeds (for example Sports → Youth Soccer → division/team) without rendering every team at once.
- [ ] **Remember Conflict Contraption preferences locally.**

## Documentation / architecture hygiene

- [ ] **Document structural changes, not individual content churn.** When work changes a persistent rule, source class, taxonomy, ranking system, data flow, automation, navigation pattern, or organizational model, update README and the affected authoritative subsystem documentation. Ordinary additions/removals of individual events, notices, businesses, articles, and similar records belong in Git history rather than release documentation.
- [ ] **Promote systemic lessons from one-off fixes.** If an individual miss/correction reveals a recurring coverage or architecture problem, document and implement the generalized rule rather than recording the one-off item as project architecture.
- [ ] **Keep README current-state oriented.** Do not append repetitive patch diaries or “current test build” sections to README; historical detail belongs in release notes and Git history.

## Ongoing Rule

- [ ] **Keep this file current.** Add newly discovered unfinished work here and mark completed work complete. Automated/site-generated entries must be labeled as system observations requiring review; they do not override Frank's decisions or establish project truth.


## Release/version hygiene

- [ ] **Keep every product release synchronized.** October 15 source audit: VERSIONING.md, README.md and nav.js consistently report v1.0.2 (September 29). Determine whether later deployments constitute a new stable release, then update all release metadata and notes together.
