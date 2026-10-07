# Norwood.ma — Unfinished Work

This file is a handoff/worklog for tasks that have been started but are **not yet complete**. Remove items only after the work has been implemented and verified in the live/deployed site.

_Last updated: October 7, 2026_

## Town Meeting Archive — active

### NCM video audit
- [ ] Finish the comprehensive Norwood Community Media audit for every Town Meeting from 2016–2026.
- [ ] Check **all relevant NCM program/category/search pages**, not only the Town Meeting gallery. Recent recordings and supporting programs may be filed under other government series.
- [ ] Add every available meeting-night recording to the correct meeting's **Watch on NCM** popup.
- [ ] Add meeting-specific related NCM videos (information sessions, warrant/article previews, Q&As, budget presentations, Finance Commission, Planning Board, School Committee, CPC, Budget Balancing Committee, and other relevant presentations) under a clearly separated **Related NCM videos** heading.
- [ ] Keep evergreen training/orientation material (Town Meeting 101, Municipal Finance 101, etc.) in the top **Town Meeting Member Guide**, rather than duplicating it under every meeting.
- [ ] Do not present NCM catalog entries whose video is unavailable as playable videos.
- [ ] Restore/verify direct NCM program URLs for 2022 and 2021 meetings that may have regressed to generic gallery links.
- [ ] Specifically locate/verify recordings for 2023–2025 meetings and missing multi-night sessions in 2021–2022.
- [ ] QA every `data-videos` payload after earlier transformations; remove malformed/concatenated URLs and ensure labels, types (`meeting` vs `related`) and destinations are correct.

### Source registry and durable deep search
- [x] Create `data/town-meeting-sources.json` so source provenance and link health are not embedded only in the archive HTML.
- [x] Give the newest 2026/2025 meeting cards stable meeting IDs and wire the registry into archive search with the legacy HTML corpus retained as a fallback during migration.
- [x] Migrate the existing recent source-derived search corpus into the registry without discarding the legacy fallback.
- [ ] Replace migrated meeting-level corpus with source-by-source extracted text and attribution, beginning 2026 → 2025 → 2024 → 2023 → backward.
- [ ] Add stable article/motion associations to source records where the underlying document supports them.
- [ ] Relocate Town documents whose old Revize URLs have moved; retain the original URL and link-health status as provenance.
- [ ] Add a durable local archival/stable-reference strategy for high-value public records (warrants, clerk results, annual reports and budget books) where appropriate rather than depending on mutable Town URLs.
- [ ] Upgrade source-only search results to identify the matching source (and a useful snippet where possible), not merely the meeting.
- [ ] Move sitewide search from fetching/parsing the entire Town Meeting Archive HTML on every query to a cached compact registry/search index.
- [ ] Add regression checks for obscure source-only terms so deep-search coverage cannot silently disappear during later edits.

### Archive content and source QA
- [ ] Continue meeting-by-meeting review to ensure every article/separately voted motion has a verified outcome and no placeholder text remains.
- [ ] Complete/verify the 2025 Annual Town Meeting ledger and remove stale wording in the May 15, 2025 Special Town Meeting summary that says exact tallies have not been located where tallies are now present.
- [ ] Add/verify official warrants, clerk results, budget books, presentations and other relevant Town documents for each meeting where available.
- [ ] Make archive search genuinely comprehensive: index visible meeting text, article details, reconstructed narratives, NCM recordings and related-video metadata.
- [ ] Index the **contents of related source documents** where technically available (warrants, clerk records/results, budgets, presentations, reports and other linked PDFs/documents), not merely each document's link label or URL.
- [ ] Check NCM video pages/players for captions, subtitle tracks, transcripts or other closed-caption data. If available, ingest that text into the archive's searchable index without requiring the transcript to be visibly displayed on the page.
- [ ] If an NCM video has no captions/transcript, still index its title, date, description, program/category metadata and its association with the relevant meeting.
- [ ] Keep extracted document/transcript text out of the visible page unless useful to readers; it may serve as hidden search-index content so searches can surface the correct meeting/article/document/video.
- [x] Fix the May 2026 metadata label from “Special + Regular Town Meetings” to “Special + Annual Town Meetings.”
- [ ] Convert remaining reconstructed-detail `href="#"` links to buttons where appropriate.
- [ ] Make Escape close the reconstructed-detail modal as well as the other archive modals.
- [ ] Verify external/document links never simultaneously open an article-detail popup.
- [ ] Verify the archive footer matches the site's standard homepage footer.

### Final QA
- [ ] Test desktop and mobile layouts, including member guide, search, meeting cards, article modal, reconstructed-detail modal and Watch on NCM popup.
- [ ] Check mobile spacing, scrolling, tap targets and long video/document labels.
- [ ] Check all external links for obvious dead/stale destinations.
- [ ] Verify chronological order and separate legal warrants vs. multi-night continuations.
- [ ] Only mark the Town Meeting Archive complete after the above checks pass.

## Possible future archive work
- Board of Selectmen work is **deferred / under consideration**, not a committed next project. After the Town Meeting Archive is stable, consider a lightweight Norwood.ma index/skin over existing Town/NCM Selectmen content rather than building and maintaining a second full historical archive.
