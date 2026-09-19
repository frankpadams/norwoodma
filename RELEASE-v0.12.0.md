# Norwood.ma v0.12.0

## Community event submissions
- Added a prominent **Submit an Event** action to What’s Happening.
- Added a smaller **Submit an Event** link beneath the site-wide non-endorsement language in standard footers.
- Links use the live Norwood.ma Google Form; submissions remain in the administrator’s Google account.
- Submission workflow is moderation-first. Events are not auto-published simply because someone submits them.
- No file-upload field is used; public source/event links may be supplied instead.

## Dynamic-content infrastructure
- Changed the GitHub Actions content-refresh schedule from twice daily to every two hours, offset to minute 17 to reduce top-of-hour contention.
- Preserved the existing generated `events.json` / browser-fallback event architecture.
- Documented the remaining authenticated bridge: Approved rows in the private moderation Sheet do not publish automatically until that bridge is configured.

## Domain and versioning
- Starts the 0.12 development line as a meaningful feature/architecture milestone rather than continuing mechanical 0.11 patch increments.
- Added `CNAME` for `www.norwood.ma` and updated the refresh bot identifier to use the canonical public domain.
- Cache-busting references on public HTML now identify v0.12.0.

## Safety / editorial integrity
- Community submissions remain candidates until reviewed.
- Submitter contact information is not intended for public event records.
- Existing non-endorsement language remains in place.
