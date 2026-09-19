# Norwood.ma v0.13.0 — September 19 consolidation

This release consolidates the September 18–19 product decisions on top of the current production repository rather than rebuilding from an older package.

## Included and verified

- Preserves the working two-hour GitHub Actions content refresh (`17 */2 * * *`) and current news/event generation pipeline.
- Preserves the operational moderated community-event path and its allowlisted public-data boundary documented in `EVENT-SUBMISSION-SYSTEM.md`.
- Preserves responsive hamburger navigation at tablet/phone widths.
- Adds a fourth accessibility display control: persistent High Contrast, independent of the three text-size choices. Preferences remain local to the browser; no user account is required.
- Expands homepage site search to include current event records as well as resources, restaurants, transit, activity guides, calendars, Get Involved and Norwood Trivia.
- Adds privacy-local search insight capture (last 100 submitted searches/result counts in localStorage) so a future admin/analytics layer can inspect zero-result patterns without sending search terms to a new third party.
- Preserves all three Norwood commuter-rail stations — Norwood Depot, Norwood Central and Windsor Gardens — with direct station links and full Franklin/Foxboro and 34E schedule links.
- Preserves Get Involved, including civic participation/election-worker pathways.
- Preserves the sourced interactive Norwood trivia experience and recurring local trivia-night information.
- Preserves Support Norwood.ma and the voluntary-support/non-influence disclosure.
- Adds a hidden, noindex `moving-to-norwood.html` development page. It is deliberately absent from public navigation and search until it is ready for launch.
- Keeps out-of-town destination municipality labeling and the broader activity-first Things to Do direction already present in the current codebase.

## Operational rules carried forward

- Do not use David Groh-created sites as Norwood.ma sources, links, event/news inputs or backend references.
- Prefer authoritative, specific destination URLs. Soft 404s, generic fallbacks and stale external links are defects.
- Recurring events require current verification and should expire/suspend when no longer supportable.
- Sponsored/affiliate placements must be clearly labeled and visually separated from independent Norwood.ma information.
- GitHub `main` is the production source of truth; future work should reconcile against it before editing.

## Still requires external configuration or ongoing operations

- Cloudflare Web Analytics / Microsoft Clarity require site-owner account identifiers before their scripts can be safely installed; no fabricated IDs are committed.
- The private moderation Sheet remains the direct administrative interface for community submissions. A richer private admin UI is a separate authenticated-backend project, not something to expose from GitHub Pages.
- Outbound-link auditing is ongoing maintenance; individual soft-404 destinations should be corrected to specific authoritative pages as discovered.
- Moving to Norwood remains a development preview and is intentionally not exposed in navigation, footer or site search.

## Release discipline

This release intentionally changes only the pieces needed to close the two-day reconciliation while preserving working production behavior. It does not replace the functioning refresh pipeline, event privacy boundary, search foundation, transit integration, or existing content datasets.
