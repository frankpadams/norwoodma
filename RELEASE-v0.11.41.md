# Norwood.ma v0.11.41

## Release focus
This release reconciles several UX/content commitments from the September 17–19 planning discussions while preserving the now-working site search.

## Changes
- Cleaned up the typography system: smaller, more consistent body/card type, quieter supporting copy, tighter page heroes, and a more restrained heading hierarchy on desktop and mobile.
- Preserved the current sitewide search behavior without redesigning it.
- Added a data-driven homepage **featured community item** area for important temporary information that does not belong in the normal event/news feeds. It supports start/expiration dates and a specific source link.
- Extended the local admin editor with a featured-item editor/export workflow.
- Added **Norwood Trivia & Local History** under Explore, with starting points for local history, screen-location research, notable people/facts, and the Historical Society.
- Refined homepage hero selection so public/civic architecture and nature are favored over transit imagery.
- Added two verified high-resolution hero candidates: a 5,184×3,457 2019 Norwood aerial (CC BY-SA 3.0) and a 4,032×3,024 Oak View photograph (CC BY 4.0), including source/creator/license metadata.
- Retained train/station photography for supporting/transit contexts but de-emphasized it in homepage hero rotation.
- Confirmed the twice-daily GitHub Actions event/news refresh remains wired to generated public data and calendar feeds.
- Updated README, credits, reconciliation and dataset documentation as part of release completion.

## Still requires server-backed work
A public community-event submission queue with authentication/moderation cannot be securely implemented as a GitHub-Pages-only browser feature. The current admin remains a local staging/editor tool until a serverless/authenticated backend is selected.
