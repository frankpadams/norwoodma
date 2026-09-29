# Norwood.ma v1.0.0

**Released:** September 29, 2026

Norwood.ma v1.0.0 marks the first stable public release of the project.

## Stable-release baseline

Version 1.0.0 recognizes the current Norwood.ma experience as the stable baseline: an independent, mobile-first Norwood community guide combining local events, news, resources, businesses, food and dining discovery, things to do, transit, weather, maps, calendars, search, civic information, and interactive local tools.

The site remains independent of Town government and continues to direct visitors to authoritative original sources where appropriate.

## Included systems

The 1.0 baseline includes, among other existing production capabilities:

- sitewide search with Norwood.ma-first relevance rules and authoritative-source indicators;
- What's Happening and selectable calendars backed by the shared event dataset;
- automated event/news refresh infrastructure;
- community event submission, moderation, public ingestion, and publication-state workflow;
- Food & Drink directory and Dinner Spinner;
- Local Resources, How Do I, business discovery, and mapping;
- live MBTA/transit information;
- weather and local weather resources;
- Things to Do, parks/trails, recreation, and Norwood Trivia;
- responsive/mobile navigation, accessibility controls, PWA/home-screen support, and independent-site disclosures.

## Versioning change

Beginning with this release, Norwood.ma uses the permanent versioning rules in `VERSIONING.md`:

- **MAJOR** for a new product generation;
- **MINOR** for substantial new user-facing capabilities;
- **PATCH** for fixes, refinements, small improvements, and maintenance.

Routine automated content/data refreshes do not require a product-version bump.

The current product version must be kept synchronized across `VERSIONING.md`, the README heading, this release document, and the public footer version in `nav.js`.

## Documentation requirement

Future releases must update authoritative documentation affected by the change rather than allowing implementation and documentation to drift apart. The release checklist in `VERSIONING.md` is part of the project's permanent maintenance rules.
