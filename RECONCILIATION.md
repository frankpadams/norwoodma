# Norwood.ma v0.11.9 — prior-chat reconciliation

This file records the September 17 reconciliation pass after development moved into a new chat. It distinguishes completed work from items that still need a stronger source or another integration rather than silently treating them as done.

## Completed in the current package

- **Food & Drink rebuilt as a conventional directory.** `restaurants.html` is now an A–Z row directory, not a tile wall. It is backed by `data/restaurants.json` / `data/restaurants-data.js` and currently contains 80 Norwood food-and-drink listings.
- **Food search repaired.** Search matches name, cuisine, food terms, address/street and tags; category filtering, live result count and Clear controls are active. The bundled JS data means it also works when the package is opened locally rather than only over HTTP.
- **Restaurant links corrected.** Verified official restaurant/location pages are preferred. Where an official site could not be verified, the record uses a business-specific Google Maps destination. There are no generic Google web-search restaurant links in the directory.
- **Norwood Trails link corrected** to the Town's current Trails Advisory Committee/document-center page.
- **Houses of Worship added** as a resource topic. It includes Norwood congregations and selected nearby communities where that broadens traditions not represented in town.
- **Emerald City Plant Shop Events** remains on Things to Do and is also in the event-source registry.
- **Events refresh twice daily** through the GitHub Actions workflow, with normalized generated event data, expiration and shared homepage/full-page event data.
- **News refresh/search architecture retained.** Google News discovery includes all four agreed queries: `"norwood, ma"`, `"norwood ma"`, `norwoodma`, and `"norwood, massachusetts"`.
- **News source diversity retained.** The bundled fallback currently includes six different publishers rather than only The Norwood Record.
- **Homepage news container retained.** Recent Norwood News uses the white rounded card/container treatment consistent with the rest of the homepage.
- **Hero pool retained and expanded.** There are 18 active rights-cleared/public-domain Norwood images. Norwood High School and a Norwood Theatre exterior are in the active set.
- **Accessibility and disclosure work retained.** Skip links, focus treatment, semantic/live status elements, descriptive hero alternatives, reduced-motion handling and the independent/non-endorsement language remain present.
- **Approved Norwood.ma branding retained.** The blue/gold approved logo, dark-footer treatment and approved favicon remain in the package.
- **Homepage ad position reserved.** The former “Useful updates” tile is now a dedicated, clearly labeled advertising slot; Town/School information remains reachable through Town Updates, News, Resources and the broader site navigation.

## Deliberately still open

- **Town Common/gazebo, new Coakley school and Norwood Theatre interior hero photographs:** candidates have been identified, but images without clear reusable rights have not been copied into the live Hero pool. They remain tracked in `data/hero-photo-candidates.json` until a rights-cleared source or an authorized community/school photo is available.
- **Broad social/web event discovery:** the source registry and discovery queries are present, but sources that do not expose a feed, structured page or parseable calendar still need a search-provider/source-specific adapter. The site should discover aggressively but publish conservatively; it does not blindly scrape social networks.
- **Restaurant completeness is an ongoing maintenance target.** v0.11.6 retains the expanded directory to 80 verified/current listings, but the data file is intentionally maintainable so openings, closures and link changes can be corrected without redesigning the page.

## Release audit

`data/dataset-audit.json` is the machine-readable audit for this package. At packaging time it passes checks for duplicate/missing source records, event/source relationships, restaurant duplicate IDs/names, generic Google web-search links, Google Maps fallback validity, the corrected trails URL, Houses of Worship population, news-query variants, twice-daily automation, Emerald City, homepage news container and the active Hero count.


## v0.11.5 search fix
- Restaurant search now has explicit submit/live filtering, visible counts, clear behavior, and cache-busted scripts.
- Resource search now shows results immediately in place of the topic grid, deduplicates search results, provides visible status/clear controls, and supports both live typing and Search/Enter.


## v0.11.6 additions
- Food taxonomy: Brazilian is a distinct filter; Turkish and Lebanese listings are grouped under Middle Eastern.
- Added a dedicated Youth Sports & Activities browse topic.
- Added 24 verified youth leagues/programs and organizations spanning baseball, lacrosse, cheer, field hockey, adaptive sports, gymnastics, dance, skating, martial arts, music, scouting and theater.


## v0.11.8 calendar builder
- Build My Calendar is now interactive rather than a planned-feature placeholder.
- Official NPS school iCal subscriptions and Norwood.ma-generated community topic feeds are selectable.
- Selections persist locally, can be shared, and expose standard webcal/copy-URL subscription actions.
- Six generated `.ics` feeds are rebuilt by the same twice-daily automation as event/news data.
- Browse-only sources are explicitly labeled until a dependable subscription feed is verified.


## v0.11.8 nearby destinations
- Temple Sinai of Sharon added to Houses of Worship.
- Things to Do now explicitly supports selected nearby destinations and marks every out-of-town item with a town badge.
- Added Ward’s Berry Farm (Sharon), Supercharged Entertainment (Wrentham), Urban Air (Bellingham), Gillette Stadium (Foxborough), Legacy Place, Kings, and The Escape Game (Dedham).
- Nearby Things to Do sources are passive directory sources and do not automatically broaden the What’s Happening event geography.


## v0.11.9 resource introduction

The Resources page now uses the approved concise introduction: “Find what you need.”

## v0.11.10 cleanup

Homepage Resource Directory naming, redundant resource CTA removal, all-Norwood trails wording, nearby bowling/cinema additions, and conventional weather icons were reconciled from the latest feedback.


## v0.11.15 navigation/calendar restructuring
- Primary navigation standardized across public interior pages: Home, What’s Happening, News, Explore, Transit, Calendars, Local Resources.
- Homepage omits the redundant Home item but otherwise uses the same hierarchy.
- Added Explore as the top-level discovery hub; Things to Do and Food & Drink are peer destinations within it and remain prominent on the homepage.
- Homepage quick-use strip now says Calendars and Local Resources.
- Calendars is now a general calendar hub: browse original calendars first, then optionally subscribe to live feeds in a separate section.
- Interior page headers and intro/hero treatment standardized.
- Town Updates remains available through News rather than occupying primary navigation.


### v0.11.20 homepage quick bar
- Replaced Live Transit quick tile with Dinner Spinner — Restaurant Randomizer & Dining Directory.
- Replaced Calendars quick tile with Things to Do.
- Dinner Spinner quick tile deep-links directly to the randomizer and uses a small custom spinner icon with subtle hover motion.
- Transit and Calendars remain in global navigation.
