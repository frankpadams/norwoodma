# Norwood.ma agent operating guide

Read this before editing the website. This repository is the source of truth; do not rely on remembered paths.

## Start here
- Site: https://www.norwood.ma ; repository: frankpadams/norwoodma ; default branch: main.
- Read README.md, VERSIONING.md, and the relevant existing procedural document before edits.
- List repository contents via GitHub contents API when code search returns nothing. An empty search result does NOT mean a file is absent.
- Do not claim a change is published until the commit and deployment are verified.
- Preserve the independent-from-town-government disclaimer and mobile usability.

## Calendar/event workflow
1. Read EVENT-SUBMISSION-SYSTEM.md and README.md.
2. Inspect scripts/ and data/ to locate source inputs and generation pipeline. data/events.json and data/events-data.js are generated outputs; do not assume editing only those is durable.
3. For each candidate verify date/year, time, organizer/venue, cost, and an official event link when possible.
4. Check duplicates before adding. Include local Norwood events and relevant regional events; clearly mark regional events as Out of Town using existing conventions.
5. Use the existing recurrence and date-range conventions. Multi-day events must be represented accurately, not as a single-day event.
6. Run available validation/tests, commit, check GitHub Actions and site deployment, and report exact outcomes. If verification fails, state precisely what remains undone.

## Other workflows
- Business directory: inspect business-directory.js, businesses.js, data/ and existing categorization rules. Confirm addresses and map eligibility.
- Resource directory: inspect resources.js and existing categorization conventions. Prefer relevant local resources, but relevance beats geography.
- Deployment: consult .github/workflows/, VERSIONING.md, and README.md; check workflow success before claiming live status.

## Communication
- When asked to do a task, execute it rather than stopping after planning.
- Distinguish verified facts, unverified leads, committed changes, and live changes.
- Never expose credentials, private moderation records, or sensitive account information.
