# Norwood.ma v1.0.2

**Released:** September 29, 2026

## Event ordering

Same-date What's Happening ordering now follows this fixed hierarchy:

1. Town Common / Farmers Market events.
2. Non-religious one-time or drop-in events.
3. Religious one-time or drop-in events.
4. Non-religious multi-week session occurrences.
5. Religious multi-week session occurrences.

Source-diversity rotation is limited to items within the same tier.

## Health Department coverage

A verified Norwood Health Department flu-shot clinic on October 1, 2026 exposed a source gap: the Health Department existed in the registry only as a passive resource. This release:

- adds the clinic as a verified one-time event;
- creates an active Health Department event monitor;
- keeps Health Department events independent of the Senior Center newsletter, since clinics may be promoted through other Town channels.

## Theatre / Fine Arts coverage

- The official Norwood Theatre Shows & Events source remains the canonical schedule and is actively parsed through linked dated detail pages.
- NPS Fine Arts monitoring now combines NHS iCal, the official NHS Fine Arts page, NPS news, and PMA sources instead of relying on an empty NHS iCal feed alone.
- Theatre/drama/musical matches are categorized as school theatre.
- A dedicated **NHS Theatre / Drama** selectable calendar is available.

This is a PATCH release under `VERSIONING.md`.
