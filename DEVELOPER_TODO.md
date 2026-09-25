# Norwood.ma Developer To-Do

This is a shared working log for unfinished development, data-quality issues, and follow-up work. It is not an authority on what is true: Frank's decisions govern project direction, and automated entries are leads to review rather than conclusions. When Frank asks for the developer to-do list, project work log, outstanding issues, next steps, or similar, review this file as a useful project record and update it as work is completed or new issues are identified.

_Last updated: 2026-09-25_

## Priority: Calendar / Events Infrastructure

- [ ] **Finish connecting and verifying every calendar source.** A calendar counts as connected only when real events are successfully reaching the master event dataset; a registered URL or selector alone does not count.
- [ ] **Complete the unified master event dataset.** What's Happening, calendar feeds, and Conflict Contraption should use the same underlying event records, with metadata controlling where events appear.
- [ ] **Verify NHS Athletics ingestion.** Confirm the NPS/athletics structured calendar route is producing current games/events in the master dataset; support sport/team filtering where data permits.
- [ ] **Verify NPS Fine Arts ingestion.** Confirm current Fine Arts events are entering the master dataset.
- [ ] **Verify NPS Music (PMA) ingestion.** Compact selector label should remain “NPS Music (PMA)”; expanded detail should identify “NPS Parent Music Association.”
- [ ] **Complete youth-sports adapters.** Prioritize Norwood Youth Soccer and Norwood Little League, then work through remaining youth-sports sources. Generate team-level choices dynamically when practical rather than hard-coding stale team lists.
- [ ] **Work through zero-event selectable sources.** Continue source-by-source through support/recovery groups, faith organizations, community organizations, recreation, arts/classes, and other selectable calendars.
- [ ] **Calendar availability UX.** Keep the checkbox-style control for known calendars. If Norwood.ma cannot ingest a live feed, clicking it should explain that no live feed is available and link to the best schedule/calendar page, or the organization website if no schedule page exists. Do not falsely add it to the combined calendar.
- [ ] **Future calendar submission UX.** When calendar submissions are implemented, add a contextual “Know a calendar feed? Submit it” action to unavailable-feed details.

## Calendar Freshness / Data Quality Safeguards

- [ ] **Add stale-calendar detection.** Track at minimum `last_checked`, `last_successful_update`, consecutive failures, and stale status for every monitored source.
- [ ] **Define source-specific freshness thresholds.** Do not assume that a low-frequency annual calendar is stale on the same schedule as athletics or a frequently updated community calendar.
- [ ] **Prevent stale data from appearing current.** Old events/feed data should be flagged, suppressed, or clearly identified according to the source's freshness policy rather than silently presented as current.
- [ ] **Create actionable stale/failure reporting.** Repeated failures or a source crossing its stale threshold should create/record a developer action item instead of failing silently.
- [ ] **Add a source-health audit view/report.** Make it easy to see active sources, sources producing events, zero-event sources, stale sources, failures, and last successful refresh.

## What's Happening / Homepage

- [ ] **Add “Select Calendars” to the homepage What's Happening header.** Place it right-aligned on the same line as “What's Happening.”
- [ ] **Deep-link the homepage button to the expanded calendar page with Select Calendars already open.**
- [ ] **Honor remembered calendar selections on the homepage.** Keep curated core What's Happening events and supplement them with events from the visitor's locally remembered selections.
- [ ] **Show selection state in the homepage button.** After customization, use a compact indication such as “Calendars · 3 selected.”

## Conflict Contraption

- [ ] **Use the master event dataset rather than a separate event database.**
- [ ] **Implement conflict relevance profiles.** Support `default conflict`, `optional conflict`, and `not conflict relevant` (or equivalent metadata).
- [ ] **Use sensible defaults rather than selecting every granular feed.** Major community events, school-wide events, significant athletics, performances, fundraisers, facility reservations, roadwork, elections, etc. should generally be on by default; individual teams/practices and other high-volume feeds should generally be optional.
- [ ] **Add hierarchical filters.** Allow broad categories to be toggled and expanded into increasingly specific feeds (for example Sports → Youth Soccer → division/team) without rendering every team at once.
- [ ] **Remember Conflict Contraption preferences locally.**

## Ongoing Rule

- [ ] **Keep this file current.** Add newly discovered unfinished work here and mark completed work complete. Automated/site-generated entries must be labeled as system observations requiring review; they do not override Frank's decisions or establish project truth.
