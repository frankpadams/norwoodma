# Norwood.ma v1.3.1 — repair live MBTA vehicle requests

Released October 26, 2026.

- Removed an unsupported cache-buster query parameter from live MBTA vehicle requests, which the V3 API rejected with HTTP 400.
- Kept browser caching disabled for vehicle-location refreshes and preserved the 30-second update interval.
