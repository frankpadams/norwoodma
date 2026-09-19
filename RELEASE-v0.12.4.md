# Norwood.ma v0.12.4

**Release focus:** Close the community-event publication feedback loop and preserve the production-tested GitHub Actions fix.

## Changes

- Fixed the canonical `.github/workflows/refresh-content.yml` by removing the `setup-python` pip cache configuration that caused the first production manual run to fail.
- Added a post-push publication acknowledgment step using the private GitHub Actions secret `NORWOOD_EVENT_ACK_SECRET`.
- Added `scripts/refresh_content.py --ack-published` to report community submissions actually represented in `events.json`.
- Added `google-apps-script/publication-acknowledgment.gs` for authenticated write-back to the private moderation Sheet.
- Successful acknowledgments set `Status` to `Published`, store the stable Published Event ID, update Last Verified, and set Import Status to `Published successfully`.
- The existing public GET endpoint and its allowlisted privacy boundary are unchanged.
- If acknowledgment has not been configured yet, normal two-hour content refreshes continue and the acknowledgment step explicitly skips.
- Updated README, reconciliation, dataset/event-submission documentation, and release version references.

## Required one-time setup

This release contains both sides of the feedback loop, but the write-back remains disabled until the owner adds the Apps Script extension, generates the shared secret, saves it as the GitHub Actions repository secret `NORWOOD_EVENT_ACK_SECRET`, and deploys a new version of the existing Apps Script Web App. See `EVENT-SUBMISSION-SYSTEM.md`.

## Production validation inherited from v0.12.3

The Approved TLC Homecoming test submission was successfully imported by a manually triggered GitHub Actions refresh and appeared on the live site. v0.12.4 does not change that public ingestion path; it adds feedback after the dataset commit.
