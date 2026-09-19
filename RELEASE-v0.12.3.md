# Norwood.ma v0.12.3

## Approved community submissions are now self-publishing after moderation

This release completes the website side of the Google Form submission pipeline. The scheduled content updater now reads the deployed privacy-safe Apps Script endpoint, normalizes Approved/Published community submissions, deduplicates them with other event sources, expires past events normally, and writes the results into the generated public event dataset.

The private Google response spreadsheet remains private. GitHub Actions sees only the explicitly allowlisted public fields emitted by the Apps Script Web App.

The source registry now treats the approved-submission endpoint as an active event source. Approved out-of-town events retain their municipality and the public event UI labels non-Norwood municipalities explicitly.

The content refresh remains scheduled every two hours. This means approving an event no longer requires a Norwood.ma software release; under normal operation it becomes eligible for the next scheduled refresh.

`EVENT-SUBMISSION-SYSTEM.md`, README, reconciliation notes, source registry, and cache-busting version references were updated for this release.
