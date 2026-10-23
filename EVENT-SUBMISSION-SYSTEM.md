# Norwood.ma Event Submission & Moderation System

**Introduced:** v0.12.0  
**Documentation added:** v0.12.2  
**Status:** Operational end to end. Approved/Published rows are exposed through a privacy-safe Apps Script Web App and imported by the scheduled Norwood.ma event refresh into `events.json`. v0.12.4 adds the optional authenticated publication-acknowledgment loop so successful imports can write publication state back to the private moderation Sheet.

> **Permanent release document:** Keep this file in every future Norwood.ma release and update it whenever the event-submission, moderation, or publication workflow changes.

## Current public intake

The Events page’s **Submit an Event** control opens the Contact page with “Submit or ask about an event” selected. People can send event details through the site contact form. The owner reviews the message, verifies the event and its Norwood relevance, then adds eligible events to the normal event pipeline. Contact messages are not published or imported automatically; ChatGPT may assist with review when the owner asks it to process email.

Current path:

`Events page → Contact page → message to site owner → manual verification and curation → shared event pipeline → events.json → website`

The Google Form and spreadsheet workflow described below is retained as a legacy path for previously submitted records and any existing approved data. The public website no longer links to the Google Form.

## Legacy Google Form and moderation workflow

**Name:** `Norwood.ma — Submit an Event`

**Public URL:**  
https://docs.google.com/forms/d/e/1FAIpQLSdfxwECrzswF-uRA_VraKrYMPVL605stp4fKwhbpFSuTqlG3w/viewform

This is the former public form. The Events page now links to the Contact page instead. The footer remains reserved for **Support Norwood.ma**.

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

The current production path is manual from the Contact page as described above. The legacy Google Form path remains:

`Google Sheet Approved/Published row → Apps Script allowlisted JSON endpoint → scheduled GitHub content refresh → normalization/deduplication/expiration → events.json → Git commit/Pages deployment → authenticated acknowledgment → private moderation Sheet`

For legacy records, changing a valid submission to `Approved` makes it eligible for the next scheduled content refresh.

### Security boundary

The response spreadsheet is private. Do **not** make it public or publish the Sheet to the web. GitHub Actions reads only the deliberately sanitized Apps Script endpoint. Submitter name/email, relationship-to-event, submission confirmation, reviewer notes, Status, Reviewed, Import Status, and other moderation-only fields are not emitted by the endpoint and must not be added to public `events.json`.

## Public/private data boundary

Potentially public event fields include the event's title, description, date/time, recurrence, public venue/address, town, category, source URL, registration URL, cost, accessibility information, and organizer when appropriate.

Private administrative information includes submitter name/email, reviewer notes, internal review state/history, and other moderation-only data. Treat these as non-public unless a later documented requirement explicitly changes that policy.

## Deployment notes

The Contact page and its email delivery are the current public intake route. The legacy Google Form, response Sheet, and ingestion integration remain separate from the public Contact form. Do not restore the old Form as the public submission link unless the owner requests that change. If the legacy Form is eventually retired, first confirm that no approved or pending records still depend on its import path.

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

Homepage event summaries display both start and end dates for multi-day events, plus recurrence text when supplied, so seasonal attractions are not presented as single-day or daily events.

The Events list uses one shared date badge per day with compact, expandable listings. `event-agenda.js` renders both browser results and the crawlable HTML generated by `node scripts/generate-event-html.cjs`. The content refresh workflow regenerates event HTML and structured data from the default community calendar after each data refresh; search, calendar selection, calendar view, and calendar/sharing dialogs remain interactive.
