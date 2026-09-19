# Norwood.ma News Source Audit — v0.11.43

Audited: 2026-09-19

## Goal
The news aggregator should answer “What has happened in Norwood recently that a resident might care about?” It is not a raw keyword feed. Articles must be materially about Norwood, Massachusetts or have a direct local consequence.

## Source tiers
1. **Primary local/official:** The Norwood Record; Town of Norwood; Norwood Public Schools.
2. **Strong local/regional reporting:** CBS Boston/WBZ Norwood topic coverage; Norwood Community Media.
3. **Supplemental local/regional:** Boston.com Norwood topic coverage; Inside Norwood; Patch after quality filtering.
4. **Community-specialist:** Friends of Norwood Center and similar organizations for their subject areas.
5. **Discovery only:** Google News exact-location searches. Discovery is not itself a publisher and should not outrank a direct source.

The machine-readable audit is `data/news-source-registry.json`.

## Verified ingestion observations
- Norwood Public Schools exposes RSS feeds, including the district news feed and feeds for individual school/program news sections.
- The Norwood Record has current dated news and latest-news listing pages that are suitable for structured/HTML extraction.
- CBS Boston maintains a dedicated Norwood News topic page, making it preferable to generic regional keyword searching for WBZ coverage.
- Patch has a Norwood edition but mixes true local reporting with daily briefings, events, statewide material, community submissions and promoted content. It should be filtered aggressively rather than treated as a clean feed.
- The Town site is authoritative but heterogeneous; substantive announcements should be distinguished from routine meetings and static service pages.

## Publication rules
- Prefer roughly the last 7 days on the homepage. Expand the window only when needed to provide a useful set.
- The dedicated News page may retain a deeper archive, but older material must never be used to make the homepage look artificially busy.
- Reject undated items, ads/advertorials, coupons, generic promotions, and stories about other Norwoods.
- Reject incidental mentions where Norwood is not materially part of the story.
- Route event announcements primarily to What's Happening unless the announcement itself is newsworthy.
- Group/deduplicate substantially identical coverage. Prefer the original/primary source when available; otherwise retain distinct journalism when it adds meaningful reporting.
- Summaries on Norwood.ma must be neutral and brief; the headline links to the publisher.

## Next engineering pass
Add per-source parsers/health reporting for the highest-value sources, stronger semantic duplicate clustering, category assignment, direct-publisher URL resolution for Google News discoveries, and an editorial override file for feature/hide/pin/category corrections without changing application code.
