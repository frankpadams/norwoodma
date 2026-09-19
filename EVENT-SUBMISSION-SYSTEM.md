# Norwood.ma Event Submission & Moderation System

**Introduced:** v0.12.0  
**Documentation added:** v0.12.2  
**Status:** Operational end to end. Approved/Published rows are exposed through a privacy-safe Apps Script Web App and imported by the scheduled Norwood.ma event refresh into `events.json`. v0.12.4 adds the optional authenticated publication-acknowledgment loop so successful imports can write publication state back to the private moderation Sheet.

> **Permanent release document:** Keep this file in every future Norwood.ma release and update it whenever the event-submission, moderation, or publication workflow changes.

## Purpose

Norwood.ma uses a Google Form for community event submissions while the public website remains a static GitHub Pages site. This avoids operating a public form backend or database and keeps submitted information in the site owner's Google account.

The intended architecture is:

`Public Google Form → private Google response Sheet → moderation → Approved → Norwood.ma event ingestion → events.json → website`

All stages are now operational. The public Apps Script endpoint was verified with an Approved test event on September 19, 2026, and v0.12.4 connects that endpoint to the scheduled Norwood.ma event ingestion pipeline.

## Public form

**Name:** `Norwood.ma — Submit an Event`

**Public URL:**  
https://docs.google.com/forms/d/e/1FAIpQLSdfxwECrzswF-uRA_VraKrYMPVL605stp4fKwhbpFSuTqlG3w/viewform

The public site links to this form from the prominent **Submit an Event** control on the What's Happening / Events experience. The footer is **not** an event-submission entry point; its link is reserved for **Support Norwood.ma**.

Submissions are moderated. They are not automatically published merely because somebody submits the form.

### Form principles

- Keep submission friction reasonably low.
- Do **not** enable file uploads. Norwood.ma does not want community-submitted files/images stored in the owner's Google account.
- Instead, allow an optional link to an event page, registration page, public social-media post, online flyer, or other verification source.
- Submitter contact information is for verification and should not be published as part of an event listing.
- A submission is a lead/candidate, not authoritative evidence by itself. Verify important event facts before publication.

### Current field policy

Required fields are intended to cover the minimum information needed to identify an event: event name, brief description, category, event date, start time, recurrence choice, venue/location name, town/city, submitter name, submitter email, relationship to event, and submission confirmation.

Optional fields include end time, recurrence details, street address, event webpage/source, registration/ticket link, cost, accessibility information, organizer/sponsoring organization, and additional notes.

No upload field should be added without an explicit project decision to reverse the current no-file-upload policy.

## Google Sheet / moderation queue

**Spreadsheet name:** `Norwood.ma — Event Submissions & Moderation`

Google Forms writes each submission to the `Form Responses 1` sheet (Google may vary the response-tab name, so automation locates a tab whose name begins with `Form Responses`).

The response sheet itself is the moderation queue. This is intentional: do not create a second manually synchronized copy of submissions.

Administrative columns appended to the response sheet are:

| Column | Purpose |
| --- | --- |
| Status | Moderation/publication state |
| Reviewed | Review date |
| Reviewer Notes | Private moderation notes |
| Published Event ID | Identifier of resulting Norwood.ma event, when applicable |
| Last Verified | Most recent verification date |
| Import Status | State/errors from the future automated importer |

### Status values

- `Pending` — new/unreviewed submission
- `Approved` — approved for ingestion/publication, subject to the event pipeline
- `Rejected` — will not be published
- `Needs Information` — requires clarification or additional verification
- `Published` — successfully represented in the Norwood.ma event dataset/site

The first test submission was successfully assigned `Pending` during setup.

## Apps Script

The production Apps Script is a standalone project that opens the response spreadsheet by its permanent spreadsheet ID rather than by filename or folder location. Moving or renaming the Form/Sheet in Google Drive therefore does not break the integration.

The production script provides:

- `setupNorwoodEventSystem()` — one-time setup/repair function. It opens the existing spreadsheet by ID, ensures moderation columns/status validation exist, initializes blank statuses to `Pending`, and recreates the installable spreadsheet form-submit trigger.
- `onNorwoodEventSubmit(e)` — installable form-submit trigger. New responses are marked `Pending` and `Awaiting review`. Do not run this manually.
- `testPublicEventFeed()` — safe manual privacy/output test showing exactly which event fields would be public.
- `doGet()` — Web App entry point. It returns JSON containing only Approved/Published records and only explicitly allowlisted public fields.
- `createNorwoodEventForm()` — safety guard only. It deliberately throws an error because the production Form already exists and must not be duplicated.

The production spreadsheet ID is `1gngkyJAoVhT37BuBW2J0JXR8ayVKkJdSpH_YC2foEn8`. This is a file identifier, not a credential.

### Deployed public endpoint

The privacy-safe Approved-event Web App endpoint is:

`https://script.google.com/macros/s/AKfycbx7-saWBvzP492fspqbrRx6EUxECfbbMXyafVhxuXVWPNGZ-6Z5x7PVe7lWTrqP4BJY/exec`

Deployment configuration: Web app; execute as the owner; public access permitted to the Web App output. **Do not make the underlying Sheet public.**

The endpoint was manually verified on September 19, 2026. A Pending test returned zero events. After the same row was changed to Approved, the endpoint returned one sanitized event. The output contained event title/description/category/date/time/venue/address/town/source/accessibility/organizer/additional information and did not contain submitter name, email, relationship, submission confirmation, reviewer notes, Status, or other private moderation data.

The public-data design is an **allowlist**, not a blocklist: only fields deliberately constructed by the sanitizer can leave the Sheet. Future private columns therefore do not become public merely because they were added to the response spreadsheet.

## Moderation rules

Before publishing a community submission, verify as applicable:

1. The event actually exists.
2. Date and time are current and correct.
3. Venue/location is correct.
4. The event is in Norwood or otherwise meets Norwood.ma's relevance rules.
5. Registration/ticket/cost information is accurate when presented.
6. Links are safe and lead to the intended event/resource.
7. Duplicate coverage of the same event is merged rather than creating duplicate listings.
8. Recurring events have a current, supportable recurrence and should eventually expire/suspend if no longer verified.

Prefer the most specific authoritative event or registration URL available rather than a generic organization homepage.

## Relationship to the main event pipeline

Community submissions are one source feeding the broader What's Happening system. They should ultimately use the same normalization, verification, categorization, deduplication, recurrence, expiration, and publication rules as automatically discovered events.

The implemented production path is:

`Google Sheet Approved/Published row → Apps Script allowlisted JSON endpoint → scheduled GitHub content refresh → normalization/deduplication/expiration → events.json → Git commit/Pages deployment → authenticated acknowledgment → private moderation Sheet`

This operates independently of software releases. Under normal operation, changing a valid submission to `Approved` makes it eligible for the next scheduled two-hour content refresh.

### Security boundary

The response spreadsheet is private. Do **not** make it public or publish the Sheet to the web. GitHub Actions reads only the deliberately sanitized Apps Script endpoint. Submitter name/email, relationship-to-event, submission confirmation, reviewer notes, Status, Reviewed, Import Status, and other moderation-only fields are not emitted by the endpoint and must not be added to public `events.json`.

## Public/private data boundary

Potentially public event fields include the event's title, description, date/time, recurrence, public venue/address, town, category, source URL, registration URL, cost, accessibility information, and organizer when appropriate.

Private administrative information includes submitter name/email, reviewer notes, internal review state/history, and other moderation-only data. Treat these as non-public unless a later documented requirement explicitly changes that policy.

## Deployment notes

The Google Form and Sheet live independently of GitHub Pages and do not require a Norwood.ma release to continue accepting submissions. Website releases only need to preserve the public form link and the event-ingestion integration code/configuration.

If the Google Form is replaced rather than edited in place, update every site reference and this document with the new public URL. Editing the existing form normally preserves its URL.

## Developer checklist for future changes

When modifying this system, verify the public form still opens; a submission still reaches the correct response sheet; new responses receive `Pending`; moderation dropdowns remain valid; no private submitter data is emitted publicly; Approved import behavior still works; event deduplication/expiration still applies; and this document, README, reconciliation notes, and release notes are updated.

## Historical note

The initial implementation briefly created a separate `Moderation` tab, but the design was corrected to use the Form Responses sheet itself as the moderation queue. Future developers should not reintroduce a second manually synchronized moderation copy unless there is a strong technical reason and reliable synchronization is implemented.


## v0.12.4 publication acknowledgment

The website-side acknowledgment client is implemented in `scripts/refresh_content.py --ack-published`. After the refresh has generated the dataset and the workflow has pushed any changed `data/`/`feeds/` files, the workflow posts the community-submission IDs represented in `events.json` back to the same Apps Script Web App.

The write path is authenticated with a high-entropy secret stored in two private locations only: Apps Script **Script Properties** and the GitHub Actions repository secret named `NORWOOD_EVENT_ACK_SECRET`. The secret must never be committed to the repository, placed in `events.json`, embedded in browser JavaScript, or returned by `doGet()`.

The Apps Script extension is preserved in `google-apps-script/publication-acknowledgment.gs`. Add it to the existing production Apps Script project; do not create a new Form, Sheet, or Web App. Run `createPublicationAckSecret()` once, copy the generated value from the execution log, create the GitHub Actions repository secret `NORWOOD_EVENT_ACK_SECRET` with that exact value, then deploy a **new version of the existing Web App deployment**. The `/exec` URL should remain the same.

On an authenticated acknowledgment, Apps Script matches the public submission ID (or the approved row's event name/date/venue on the first acknowledgment) and writes only administrative fields in the private Sheet: `Status = Published`, `Published Event ID = submission-…`, `Last Verified = current timestamp`, and `Import Status = Published successfully`. The public GET sanitizer remains unchanged.

If the GitHub secret has not yet been configured, the scheduled workflow skips acknowledgment rather than failing the event/news refresh. Once configured, acknowledgment errors fail that workflow step so the broken feedback loop is visible in Actions.

### Workflow correction captured in v0.12.4

The production test of v0.12.3 exposed a GitHub Actions configuration defect: `actions/setup-python` had `cache: pip`, which expects a conventional `requirements.txt`/`pyproject.toml` unless a dependency path is supplied. Norwood.ma uses `requirements-automation.txt`. The production repository was manually corrected by removing that cache setting, and v0.12.4 makes that correction canonical so future releases do not restore the broken workflow.
