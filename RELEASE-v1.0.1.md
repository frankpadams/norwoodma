# Norwood.ma v1.0.1

**Released:** September 29, 2026

## Event ordering refinement

- One-time and drop-in events now rank ahead of occurrences from multi-week session-based Recreation programs when displayed on the same date.
- The rule uses the existing structured `session_based` and `drop_in` event metadata.
- Source-diversity logic now operates within the one-time and session tiers, so it cannot accidentally promote a class above a discrete event.
- The homepage upcoming-events sorter applies the same rule.

This is a PATCH release under `VERSIONING.md`: it refines event ordering without introducing a new major capability.
