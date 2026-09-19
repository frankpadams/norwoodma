# Norwood.ma v0.11.42

## v0.11.42 interactive Norwood trivia

- Replaces the static Trivia & Local History page with a playable, accessible multiple-choice Norwood trivia game.
- Launches with 152 sourced questions across local history, notable people, landmarks, schools, industry, nature, archives and Norwood on screen; research continues toward the 200-question target rather than padding the bank with weak facts.
- Supports randomized 10-, 25-, and 50-question rounds, randomized answer order, score/progress, answer explanations and per-question source links.
- Adds current in-person trivia nights from the verified event dataset (Irish Brewing Boston Wednesdays; Castle Island Brewing Norwood Thursdays).
- Adds Norwood Trivia to Things to Do as well as Explore.
- Adds `data/trivia-questions.js` and `trivia.js`; updates documentation and cache-version references.

## v0.11.41 reconciliation + typography

- Preserves the functioning sitewide search.
- Cleans up typography and visual hierarchy across desktop/mobile.
- Adds a data-driven, date-bounded homepage featured-item mechanism plus local admin export UI.
- Adds Norwood Trivia & Local History under Explore.
- Favors civic architecture/nature in homepage hero rotation and adds verified high-resolution aerial and Oak View images with licensing metadata.
- Confirms the existing twice-daily GitHub Actions refresh for events/news remains part of the release.
- README, release notes, credits, dataset notes and reconciliation documentation are updated with the release.

## v0.11.15 navigation + calendar restructuring

- Standardized primary navigation across public pages: **Home · What’s Happening · News · Explore · Transit · Calendars · Local Resources**. The homepage omits the redundant Home item.
- Added a new **Explore** hub. **Things to Do** and **Food & Drink** are equal, prominent destinations within Explore and remain prominent on the homepage.
- Reworked the homepage discovery area so it no longer acts like a second copy of the global navigation.
- Renamed the homepage quick links to **Calendars** and **Local Resources**.
- Rebuilt the Calendars page as a general calendar hub: browse school/community/town/library/recreation calendars first, then use a separate subscription area for Google Calendar, Apple Calendar, Outlook and other apps.
- Standardized interior-page navigation and intro/hero treatment, with **Home** first on every public interior page.
- Moved **Town Updates** out of primary navigation and surfaced it through News.
- Added cache-busted shared navigation code so the mobile menu behaves consistently after deployment.

## v0.11.10 homepage / Things to Do / weather cleanup

- Homepage Resources tile renamed to **Resource Directory**; redundant lower resource CTA removed.
- Norwood Trails item now represents the Town's broader trail maps/resources rather than only Endean/Hawes.
- Added Splitsville Foxborough plus nearby movie theaters in Dedham and Foxborough, with out-of-town badges.
- Weather forecast rows now use conventional, consistent weather symbols instead of remote NWS image thumbnails.

## v0.11.9 resource-page copy

- Replaced the instructional Resources intro with the shorter approved copy: “Find what you need.”
- New intro emphasizes services, programs, organizations, activities and community resources in Norwood and nearby, with browse-or-search language.


## v0.11.8 Build My Calendar
- Replaced the calendar placeholder with a functional calendar builder.
- Users can select official live NPS district/school iCal feeds plus Norwood.ma-generated community topic feeds.
- Selections persist in local storage and can also be shared with a URL query parameter.
- The selected-feed panel provides webcal subscription buttons, copyable subscription URLs, Google Calendar instructions, and a one-time combined `.ics` snapshot of the currently selected Norwood.ma community event categories.
- Added six Norwood.ma live calendar feeds under `/feeds/`; the twice-daily content workflow regenerates and commits these feeds automatically whenever events refresh.
- Library, Town meetings, Recreation and Senior Center are retained as browse-only sources until a reliable global subscription feed is verified rather than pretending those links are live subscriptions.

## v0.11.6 youth-directory + cuisine taxonomy
- Food & Drink now treats **Brazilian** as its own cuisine/type and groups Turkish and Lebanese restaurants under **Middle Eastern**.
- Resources now has a dedicated **Youth Sports & Activities** browse section in addition to the broader Kids, Families & Education topic.
- Added 24 youth-facing organizations/programs, including Little League, youth lacrosse, youth cheer, field hockey, Challenger Sports, multiple gymnastics and cheer programs, dance, skating, martial arts, music, Cub Scouts/Scouting America, Girl Scouts and youth theater.
- Existing youth-sports records are cross-tagged into the new youth topic so the section includes the leagues that were already in the dataset as well as the new additions.

## v0.11.4 reconciliation release
- Rebuilt Food & Drink as a conventional searchable/filterable A–Z directory backed by `data/restaurants.json` rather than hard-coded tiles.
- Expanded Food & Drink to 80 current Norwood listings. Restaurant links go to verified official sites where available; otherwise they go to the specific business in Google Maps, never a generic Google web search.
- Repaired the Food & Drink search and added a category filter, live result count, clear control, keyboard focus styles and mobile directory layout.
- Replaced the obsolete Olde Colonial Café entry with current Gemma Kitchen & Bar.
- Corrected Norwood Trails to the Town's current Trails Advisory Committee/document center page.
- Added a dedicated Houses of Worship resource topic, retaining Norwood congregations and adding nearby Westwood/Needham/Sharon options where useful for traditions not represented in town.
- Rechecked the prior-chat commitments: twice-daily event refresh workflow, four required Google News queries, diversified bundled news, homepage news container, Emerald City Plant Shop Events, 18 rights-cleared hero images plus rights-review candidates, non-endorsement language, and accessibility baseline remain in place.
- Reserved the former homepage “Useful updates” dashboard tile as a clearly labeled advertisement slot (`#homeAdSlot` / `#homeAdCreative`) so future sponsor creative stays visually and semantically separate from editorial content.


Dashboard-oriented prototype incorporating the September 17 feedback.

Highlights:
- Approved transparent Norwood.ma logo is used as the canonical logo on Home, Transit, Resources and Calendars.
- Homepage is no longer news-dominant: compact live transit at right, Today/This Week, Town & Schools, topic shortcuts, publications, current news, and resource discovery.
- Transit preview is column-sized; full live map remains on the detailed Transit page.
- Resource directory reorganized around plain-language needs rather than agency acronyms.
- Adds Norwood Special Education Parent Advisory Council (Norwood SEPAC) with full wording.
- Adds Project Bread FoodSource Hotline as a Massachusetts-wide resource available to Norwood residents.
- Adds Calendar Hub concept and NPS official calendar subscription entry point.
- The Norwood Record is included as a local publication/current-news source.
- News logic retains the hard 30-day freshness cutoff and rejects undated news.

Production follow-up: expand/verify every topic and calendar source, add reliable live feeds for Library/Town/Recreation/Senior Center where available, and add richer current-issue discovery for Senior Center and school publications.


## v0.8.1 resource directory
Expanded to 211 curated entries spanning local Norwood organizations and regional/state/federal resources that serve Norwood residents. Resource cards support multiple topic assignments, coverage labels, plain-language search synonyms, and optional social-media links shown with compact platform icons.


## v0.8.1 additions
- Rotating, rights-tracked Norwood hero photo pool with repeat avoidance and About this photo metadata.
- WCAG 2.2 AA-oriented accessibility foundation: skip links, keyboard focus, semantic/live status support, reduced-motion handling, descriptive hero image alternatives.
- Site-wide non-endorsement disclosure.
- Common news-quality gate for sponsored/promotional content and ambiguous/wrong-state Norwood matches, while retaining the 30-day freshness cutoff.
- Hero photo registry is data-driven in `data/hero-photos.json`.


## v0.8.1
- Weather provider links now resolve to Norwood MA 02062/local Norwood pages.
- Weather detail redesigned with visual condition graphics and embedded Windy radar centered on Norwood.
- Detailed transit header uses the approved Norwood.ma logo.
- Norwood Central and Norwood Depot now have permanent map labels.
- Resource directory expanded to 263 curated entries, including additional current resources from Morrill Memorial Library community guides.


## v0.8.1
- Fixed approved header logo/tagline clipping and Hero overlap by sizing the sticky header to contain the complete canonical artwork on desktop, tablet, and mobile.
- No logo artwork was redrawn, recolored, or AI-generated.

## v0.10.1
- Homepage and detailed transit maps permanently label Norwood Central and Norwood Depot.
- Each station shows up to the next two MBTA predictions in each inbound/outbound direction when available.
- 34E vehicle popups use plain-language Inbound → Forest Hills / Outbound → Walpole and show the nearest reported 34E stop as location context. This is GPS-derived context, not a claim of exact intersection crossing.
- Added Entertainment & Things to Do with Luke Adams Glassblowing Studio, The Norwood Theatre, Norwood Space Center/Magic Room, and Launch Norwood.
- Restored the earlier compact dark footer treatment while retaining the non-endorsement notice.
- Resource directory now has a bundled JavaScript fallback so it works when opened directly via file://.
- Added a first local /admin content editor for staging resource additions and importing/exporting resources JSON.


## v0.10.1
- Weather detail redesigned as a natural forecast narrative with NWS condition graphics and embedded radar.
- Train countdowns now pair minutes with an explicitly estimated clock time.
- Things to Do moved off the homepage to a dedicated page and expanded with Winsmith Mill, Hometown Arcade, Monster Mini Golf, Fallout Shelter, trails, recreation and more.

## v0.11.1
- Transit moved back above news on homepage.
- Homepage news source sidebar removed; expanded News page added.
- What’s Happening redesigned as a denser public-event feed and participant-only youth soccer removed.


## v0.11.2
- Fixes the homepage/local-news loader so bundled news renders immediately and does not depend on a browser-side RSS proxy.
- Adds a twice-daily GitHub Actions content refresh pipeline for events and news.
- What’s Happening now renders from generated event data (`data/events.json` / `data/events-data.js`) instead of hard-coded HTML.
- Homepage event preview uses the same generated event data.
- Adds Emerald City Plant Shop Events to Things to Do and adds Emerald City as an event-monitor source.
- Adds refresh status/automation coverage artifacts so failed sources do not silently break the public site.

## v0.11.3
- Homepage news now sits in a styled white container consistent with the dashboard cards.
- News seed data is diversified beyond The Norwood Record.
- Scheduled updater now includes Google News discovery for: "norwood, ma", "norwood ma", norwoodma, and "norwood, massachusetts".
- Hero rotation expanded with additional openly licensed Norwood imagery, including Norwood High School, Town Hall interior, F. Holland Day House, Windsor Gardens, Neponset River, and additional rail views; Norwood Theatre exterior added from a CC BY-SA Flickr source.

Wanted-photo list remains open for strong reusable images of the Town Common/gazebo and the new Coakley school.


## v0.11.5 search fix
- Restaurant search now has explicit submit/live filtering, visible counts, clear behavior, and cache-busted scripts.
- Resource search now shows results immediately in place of the topic grid, deduplicates search results, provides visible status/clear controls, and supports both live typing and Search/Enter.


### v0.11.8
- Added a clearly labeled Nearby Favorites section to Things to Do, with town badges for destinations outside Norwood.
- Added Ward’s Berry Farm, Supercharged Entertainment, Urban Air Bellingham, Gillette Stadium, Legacy Place, Kings Dedham, and The Escape Game Dedham.
- Added Temple Sinai of Sharon to Houses of Worship.


## v0.11.15 navigation/calendar restructuring
- Primary navigation standardized across public interior pages: Home, What’s Happening, News, Explore, Transit, Calendars, Local Resources.
- Homepage omits the redundant Home item but otherwise uses the same hierarchy.
- Added Explore as the top-level discovery hub; Things to Do and Food & Drink are peer destinations within it and remain prominent on the homepage.
- Homepage quick-use strip now says Calendars and Local Resources.
- Calendars is now a general calendar hub: browse original calendars first, then optionally subscribe to live feeds in a separate section.
- Interior page headers and intro/hero treatment standardized.
- Town Updates remains available through News rather than occupying primary navigation.

## v0.11.15
Expanded Explore with Live Music, Rage Zone and additional Space Center experiences; added initial Everyday Local Services directory entries; expanded event-source monitoring for event-producing businesses.


### v0.11.20 homepage quick bar
- Replaced Live Transit quick tile with Dinner Spinner — Restaurant Randomizer & Dining Directory.
- Replaced Calendars quick tile with Things to Do.
- Dinner Spinner quick tile deep-links directly to the randomizer and uses a small custom spinner icon with subtle hover motion.
- Transit and Calendars remain in global navigation.


## v0.11.25
- Repositioned Time-Sensitive alert as a single compact line beneath desktop navigation while preserving the original header divider.
- Restored desktop navigation behavior so the mobile Menu button does not appear on desktop.
- Added Town Common Books (coming soon, 679 Washington St) to Local Resources and relevant search/topics.


## Current test build
Version 0.11.30: dark masthead plus activity-guide redesign.

### v0.11.43 news aggregation audit
The news system now has a documented source audit in `NEWS-SOURCES.md` and a machine-readable registry in `data/news-source-registry.json`. The homepage “More local news →” link was moved to the bottom of the news card so the card reads headlines first and navigation second.

## v0.12.1 — support-page correction

Corrected the standard footer so the link beneath the non-endorsement language is **Support Norwood.ma**, not Submit an Event. Added a dedicated support page with voluntary-support disclosures and Venmo `@frankpadams`. The prominent Submit an Event action remains on What’s Happening.

## v0.12.0 — community event submissions

Norwood.ma now has a public **Submit an Event** intake path using a Google Form owned by the site administrator. The public form is linked prominently from What’s Happening. Submissions are not auto-published: they enter a private Google Sheets moderation queue and begin in `Pending` status. The intended lifecycle is `Pending` → `Approved` / `Rejected` / `Needs Information` → `Published`.

The public submission form does not accept file uploads. Submitters may optionally provide a public event/source URL. Contact information is for verification and is not intended for publication.

The scheduled content refresh cadence is now every two hours. GitHub Pages remains the public host, with `www.norwood.ma` as the canonical public domain. Approved-submission ingestion into generated event data is the next automation step; until that authenticated bridge is configured, approval in the private Sheet does not by itself publish an event.

## v0.12.2 — event submission system documentation

- Added `EVENT-SUBMISSION-SYSTEM.md` as permanent developer documentation for the Google Form → Google Sheet → moderation → event-ingestion architecture.
- Future releases must retain and update this document whenever the submission/moderation/publication workflow changes.

## v0.12.3 — approved submissions reach the live event pipeline

The deployed privacy-safe Google Apps Script feed for community submissions is now a first-class automated event source. The scheduled two-hour content refresh reads only the feed's Approved/Published public records, normalizes them into Norwood.ma's event schema, deduplicates them with other sources, applies normal expiration rules, and writes them into `data/events.json` / `data/events-data.js`. The private response spreadsheet is never read by GitHub Actions and remains private.

Approved out-of-town events retain their submitted municipality, and the event UI explicitly labels non-Norwood municipalities (for example, `Framingham, MA`). Software releases are no longer required to add an approved community-submitted event.
