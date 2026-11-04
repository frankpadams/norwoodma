# Norwood trail mapping — durable handoff and working notes
Updated 2026-10-23. This file is a project handoff for subsequent ChatGPT sessions. READ THIS BEFORE EDITING TRAILS.

## User objective and constraints
- Show real trail path lines overlaid on an interactive OpenStreetMap/satellite basemap, on a **private review/test page**.
- Cover **all Norwood trail systems**, not just one; useful provisional placement is acceptable, but never disguise guessed lines as accurate.
- Use the original official PDF brochure maps to find recognizable landmarks (road intersections, bridges, parking, waterways, fields, railroad, power lines), match those to geographic basemaps, solve image-pixel-to-geographic registration, and independently test additional control points.
- DO NOT change the public `map.html` until explicitly approved. Maintain mobile usability and `noindex` for review pages.
- User wants work performed directly in repo, not instructions requiring them to manually enter coordinates. User is worried about chat context running out; preserve progress here on every substantive step.

## Repository and pages
Repo: `frankpadams/norwoodma`.
- `trails-preliminary-diagrams.html`: 11 system cards, Leaflet OSM maps, purple dashed OSM path candidates fetched from Overpass, provisional red brochure lines for Bernie Cooper, expandable raw trace SVG, two-landmark manual registration control, GeoJSON export. Direct Google Drive iframe previews FAILED with HTTP 400 on iPhone; removed. Original brochure PDF links remain. IMPORTANT: current OSM Nominatim/Overpass runtime requests may fail or be throttled; test in browser. Some geocode names may not resolve.
- `trails-review-2026.html`: original private geographic review workbench. Loads `map-trails-review.js`; contains GIS candidates and Vanderbilt landmark-registration workbench with leave-one-out accuracy checking. Prefer consolidating instead of duplicating alignment UI.
- `trail-registration-provisional.js`: two-point similarity transform and GeoJSON export utility. Two landmarks alone are NOT independent accuracy verification.
- `map-trails-review.js`: existing Leaflet map, GIS/OSM candidates, satellite toggle and Vanderbilt registration controls.
- Public `map.html`: KEEP UNCHANGED.

## Latest implementation and caveats
- Commit `cf4eb9b9df5162464e03fbf4d957ac9960da05c9`: Bernie Cooper brochure linework shown as red dashed paths over Leaflet basemap, using approximate center lat 42.17478 lon -71.20465, assumed brochure pixel [525,495], 0.423 meters/pixel and assumed north-up orientation. **These assumptions were NOT matched to independently verified brochure control points. The overlay may be seriously wrong.** Treat only as a visible prototype and replace ASAP with genuine registration. The park center coordinate was presented as approximate, not independently reverified in this session.
- Commit `cfa832d4a07660624466bd4472e856e579f4a529`: purple dashed actual OSM path candidates within 420m of geocoded area. Candidates are not confirmed brochure matches.
- Commit `7f047bb007fe5206b24128eb2cf43bb873ec9865`: after manual two-anchor entry, red dashed registered lines appear over Leaflet map and GeoJSON downloads.
- Commit `0fca2e07eb552c93380e4f08239ac8c3e1657ac1`: Nominatim geocoding for each trail area.
- Commit `54506f3a32690dba60ac27938e33b0cf0f4d9910`: replaced broken Google PDF embeds with Leaflet map.
- Commit `70aa00b72c4a036a2e4cb61337c4d3e9b5ff0762`: broken Drive iframe attempt; subsequently removed.
- Commit `b2af421c5fdcdfb47fd3838db604cfcbaef10024`: manual registration controls.

## Eleven provisional brochure-image traces (many UNVERIFIED / guessed)
Each JSON holds `trails[].points` in brochure render pixel coordinates; `source.renderWidth/renderHeight` or `imageWidth/imageHeight` describes dimensions.
1. `data/trails/meadow-street-brochure-trace.json` — Meadow Street; `Broc_MeadowStProp_D5Alt_20250807.pdf`, 1188x918
2. `data/trails/bernie-cooper-brochure-trace.json` — Bernie Cooper Riverfront Park; `Broc_Cooper_D1_20250812.pdf`, 1188x918
3. `data/trails/vanderbilt-5k-brochure-trace.json` — Vanderbilt/Pine Tree Forest 5K; `VanderbiltPTFInnerAndOuterLoops5KMap.pdf`, 1088x1408
4. `data/trails/shattuck-park-brochure-trace.json` — Shattuck Park; `2023.03.24 ShattuckPark_Trails_MAP_BROCHURE.pdf`, 1188x918
5. `data/trails/germany-brook-brochure-trace.json` — Germany Brook; `2023.03.24 GermanyBk_MAP_BROCHURE.pdf`, 1188x918
6. `data/trails/ellis-playground-brochure-trace.json` — Ellis Playground; `2023.03.24 EllisPlayground_ MAP_BROCHURE.pdf`, 612x472
7. `data/trails/hennessey-murphy-brochure-trace.json` — Hennessey/Murphy; `2023.03.24 HennesseyField and MurphyPark_Trails_MAP_BROCHURE.pdf`, 612x472
8. `data/trails/ellis-pond-brochure-trace.json` — Ellis Pond/Alevizos; `2023.03.24 EllisPond_Alevizos Park_MAP_BROCHURE.pdf`, 792x612
9. `data/trails/endean-hawes-brochure-trace.json` — Endean/Hawes Brook; `2023.02.21 EndeanHawesBrTr_MAP_BROCHURE.pdf`, 792x612
10. `data/trails/ledgeview-brochure-trace.json` — Ledgeview Drive; `LedgeviewDriveMap.pdf`, 595x842. Distinguish existing 0.3mi blue trail from **proposed** loop contingent on acquisition.
11. `data/trails/willett-tiot-brochure-trace.json` — Willett/Tiot; `WillettTiotTrailLegMap.pdf`, 595x842; ~0.37mi planned leg; public access uncertain.

**Critical: eight or more of these traces were manually guessed and not carefully traced from actual PDF map lines.** Even the Meadow/Cooper/Vanderbilt drawings are not independently validated. First overlay each JSON trace on a raster render of its original brochure to find and correct mismatches. Avoid presenting them as surveyed or accurate.

## Original PDF source storage
Google Drive folder: https://drive.google.com/drive/folders/1RTjkk-Ckrmgwtd3L3N13O8AI5i8N8oAh
Google Drive file IDs:
- Cooper: `1m3gd8omNf9o07rn6RJQ4meeIz9Kc1Z9V`
- Meadow: `1u1MtJmXcGFB3NRXDAlsmGkPwTM53QUXF`
- Vanderbilt 5K: `1vZ7KuQE0WHdan1lJJLNMbYqAdzj50iF0`
- Shattuck: `1glv3UMbXWVrsLtV4dnJAy4_3qkfwBXTw`
- Germany: `1X-mPJgOAaNFPAF_jxQHyPPiwcpqv9--1`
- Ellis Playground: `1x32aHzxdJrrcJvBEZbuB9H05Xaxtbkfp`
- Hennessey/Murphy: `1WePcy2c3Map2MZzt0i3PFl5hZNEprT-q`
- Ellis Pond: `1nMBh4QI94dyM5U6xjmYX7CHpvKGr_6wX`
- Endean: `1WwtpOYWhmyOCY1-L9RdgvQ4v-Yj8J3Sz`
- Ledgeview: `1XtBbNiYSEFR1R6i1udUzjPr1Hv_mC20o`
- Willett: `1i3uG3TOsoQ2OeCiyV_-mpyKqjwjxlVKL`
Many PDFs and renders were available in the prior chat working container under `/mnt/data`, but **do not assume these paths persist across new sessions**. Use Google Drive connector or files library if necessary.

## Geographic landmark leads (NOT all verified control points)
- Bernie Cooper: Saint Joseph Ave (approx center 42.17478,-71.20465); Saint John and Saint Paul street entrances; Neponset River.
- Meadow Street: Meadow St terminus, Fortune Drive, Neponset River and Traphole Brook; railroad bridge at approximately 42.174249,-71.212308 from prior conversation, MUST verify.
- Vanderbilt/Pine Tree Forest: Vanderbilt Avenue, power lines, storage facility, sewer easement.
- Endean: Hawes Pool, pool parking, Washington Street, middle school, community garden/orchard.
- Germany Brook: Savage Center, Winter Street, Willett School and landfill overlook spur.
- Shattuck: Winter/Nichols/Bond streets, Bellevue Avenue parking.
- Ellis Playground: Codman Road, boardwalk.
- Ellis Pond: Walpole Street, Nichols Street, dam.
- Hennessey/Murphy: Pleasant Street, Lenox Avenue.
- Ledgeview: Ledgeview Drive.
- Willett/Tiot: Willett School, Westover Parkway easement.

## Correct next workflow
1. Read this file and fetch latest repo pages/JSON before editing. Inspect the **actual brochure map image**, not just source notes.
2. Rasterize the PDF at consistent dimensions; superimpose JSON points on the raster; correct badly guessed traces. If available, use PDF vector path extraction (`fitz.get_drawings()`) to capture real colored route geometry.
3. Match 3–5 widely spaced visible landmarks between brochure and satellite/OSM map; record source pixel coords, verified lat/lon, how matched, and independent residuals in per-trail registration JSON. Reject poor fit; avoid made-up control points.
4. Apply similarity/affine transformation and export provisional geographic GeoJSON. Compare with OSM actual paths. Mark proposed routes separately. Show route lines directly on Leaflet with toggles and explicit confidence.
5. Test mobile viewport, network failures, map tile display and geometry alignment; preserve `noindex` and public map unchanged.
6. After each system, update this handoff with exact control points, quality measures, changed paths and commit SHA.

## User-facing truthfulness
Never say that a brochure is aligned just because a marker was geocoded or arbitrary center/scale used. The user has explicitly rejected blank SVG diagrams and broken Google Drive iframe previews. Avoid promising invisible background work. Commit actual code and provide exact SHA when available.

## Critical cartographic warning — brochure maps may NOT be to scale (user clarification 2026-10-11)
- Do NOT infer real trail distance or geometry from the brochure's printed scale bar, north arrow, or one uniform meters-per-pixel transform without checking. Brochures may be schematic, stretched, distorted or have different local scales.
- The existing Bernie Cooper automatic red-line overlay uses **0.423 m/pixel and a guessed pixel center**. This is a visualization prototype, **NOT a trustworthy geographic alignment**. Remove or supersede that placement as soon as landmark-anchored routes exist; keep conspicuous warning meanwhile.
- Use multiple recognizable, independently located control points distributed across each trail system. Check held-out landmarks and local distortion. Where a global affine/similarity transform fits poorly, use piecewise/local registration or trace against georeferenced aerial/OSM path features, with manual review and explicit uncertainty.
- Never use an image-space trace's apparent length to claim an actual trail length. Preserve the distinction between existing, planned and proposed trails.

## Practical registration refinement (user clarification, 2026-10-11)
- Begin with **two widely separated, identifiable fixed landmarks** (e.g. road intersections) to solve uniform scale, rotation, and translation, *if* the brochure is approximately similarity-transformable.
- Use a **third independently identified landmark** as a check. If the third point deviates significantly, the brochure may be distorted, not to scale, or the matching point may be wrong. Investigate before accepting.
- Three non-collinear landmarks can also fit an affine transform (including shear/nonuniform scale), but an independent fourth landmark is then needed to test it. Do not confuse fitting controls with independent validation.
- For locally distorted schematic maps, use additional local controls and segment-specific tracing against satellite imagery or verified mapped footpaths. Do not require dozens of landmarks when two or three suffice for a useful first approximation.


## Trail editor prototype — 2026-10-23
- Added a test-page draft editor: choose a visible candidate line, create a separate draft copy, click the draft line to insert an anchor, and drag anchors (including endpoints) to reshape it.
- Undo/redo, delete draft, local browser autosave, and GeoJSON download are included. The visible source candidate remains unchanged; none of these edits publish.
- The review page remains `noindex`, but is not access-controlled; anyone with its URL can view it.
- Validate browser interactions and mobile behavior on the review page before using the prototype for trail data. All geometry remains provisional and unverified.


## OSM-aligned Germany Brook route — 2026-10-31
- User explicitly requested following existing OSM path geometry when it matches brochure routes.
- Retrieved OSM API map data for bbox -71.225,42.20,-71.21,42.21; complete way geometries include the Germany Brook corridor beyond the query envelope. Overpass queries failed, but the OSM map API succeeded.
- Compared the actual Germany Brook brochure map with mapped footpaths, pool, playing fields and Savage Center property. Route uses OSM ways 339612105 (named Germany Brook Trail), 194823774 (ground track with motor_vehicle=no), and 194823771 (path behind/north of Father Mac's pool continuing to Savage Center property).
- These ways share endpoint nodes 1684914889 and 2053294671; joining them leaves zero geometric gap and removes the earlier artificial 34.2m connector. Retained the existing short Willett access approach from the MassGIS/MAPC review geometry.
- Review GeoJSON now has 114 coordinates and a measured length of 1811.9m / 1.126mi. This is measured geometry, not a brochure-stated length. The separate short gravel loop and Vernon Street branch (OSM way 1343590941) are not part of the main route.
- Changed data/trails/germany-brook-review.geojson and germany-brook-review.js, with review-page cache version 20261031-osm1. Public map.html remains untouched. OSM source way URLs and ODbL attribution are in the GeoJSON. Geometry commit: 02d94c625650dc52e5c26e76c906ce071c0f87d7.
- Other brochure systems are not made complete by this change; their OSM candidates still require brochure matching.

### Endean existing-path snapshot — 2026-10-31
- Downloaded OSM map API geometry for bbox -71.22,42.17,-71.205,42.18. Inspected the existing Endean/Hawes brochure raster and compared the rail corridor, sports fields, Hawes facilities and Mylod Street path network.
- Saved six explicitly named Endean Conservation Land Path ways (808767513, 834820018, 834820513, 834821451, 834821452, 835006003) in data/trails/endean-osm-paths.geojson with source way URLs and ODbL attribution.
- Replaced the named-Endean live Overpass request with that stored geometry in map-trails-review.js, rendering these actual mapped segments as solid green paths. Additional brochure-only branches remain incomplete; no artificial joins were added to this network. General candidate layers are still separate. Review-page script cache version: 20261031-osm1.
- Repo commits: 1a9b5664793b5f7e762ec02c286aefbf21390e93 (snapshot), 5667e8fc596c781b1b6e29671f95181ecf37d89d (loader), e6ecbb062c23a7addb4266dec13fa39ab971cbac (page cache). Live site was still serving the older Germany route when first checked; do not claim deployment until checked.

## Existing source geometry review — November 2, 2026
- Current user direction supersedes the brochure-registration workflow above: use existing GIS/OSM geographic lines, including proposed paths, directly on the test map for alignment review. Do not recreate paths from brochure pixels.
- Downloaded MAPC TrailMap_map_svc_v01 MapServer layers 4–11 across the Norwood bounding window. 298 layer records collapse to 247 unique source features; 27 touch the official Norwood municipal boundary, including three planned/proposed segments. Keep full source lines, including portions crossing municipal limits.
- Downloaded 20 OSM map API cells (.02 degree grid), combined complete way geometries and removed duplicate way IDs. Stored 303 off-road path/footway/steps/bridleway/eligible track segments touching Norwood; explicitly private/no-foot-access and cemetery paths excluded. Roadside sidewalks/crossings excluded. These are mapped line segments, not 303 separate trail systems, and are not all recorded GPS tracks.
- Saved data/trails/norwood-source-paths.geojson, norwood-boundary.geojson and source-snapshot-summary.json. Source IDs, source URLs, original properties, status and ODbL attribution preserved. No snapping, smoothing, image transforms or synthetic joins.
- map-test.html now loads trail-source-layer.js with all 11 area views, MAPC/OSM/planned toggles, optional outside-town MAPC paths, source popups, GeoJSON download and OSM/MassGIS 2025 aerial basemap switch. Area bounds are viewports only; they do not assign unnamed paths to a trail system. Stored source data removes dependency on live Overpass requests when opening this review page.
- Public map.html and public map source are unchanged. The test page remains unlinked and noindex.
- Rebuild helper: python scripts/build-trail-source-snapshot.py CACHE_DIRECTORY; required input formats and URLs are in its docstring. Raw downloaded XML is transient; the distributable GeoJSON is committed.

## Germany Brook connected-path expansion — November 2, 2026
- User approved the current Bernie Cooper Park and Shattuck Park alignments. Preserve both. Decisions are stored in review-decisions.json.
- User requested the original Germany Brook line plus all OSM paths touching/connecting to it, recursively including offshoots. germany-brook-connected.geojson retains the original route exactly and includes 10 complete OSM ways reached through shared OSM nodes from seeds 339612105, 194823774 and 194823771. Includes Vernon Street branch 1343590941 and further offshoots. Every added way records its parent way and connecting node; no synthetic connectors or coordinate edits.
- Germany Brook area now displays the original green route and connected blue network; other area views retain the previous source overlay. Builder: scripts/build-germany-connected-paths.py CACHE_DIRECTORY.

### Savage Center / Father Mac’s loop leg — November 2, 2026
User directed a connection from the Savage Center endpoint WSW to Father Mac’s parking lot, then north behind the pool to the existing route. Added a green leg constructed from exact OSM node slices of ways 9280147, 806490984, 806490992 and 1343590941. Starts at existing Savage node 69631695, joins at node 2053294671; all intermediate joins share identical mapped nodes. Original route and other park alignments are unchanged. Builder reproduces the new leg; no guessed connectors.

### Include landfill spur and Willett School leg — November 2, 2026
User requested inclusion of the landfill offshoot (OSM way 1343590948) and the western-end connection south past the baseball field to Willett School (ways 896399146 and 156220165). These already exist in the connected network; promoted them to green included-route legs with clear names, preserving all source coordinates. Builder now reproduces the included-leg roles.

### Final-view preview control — November 2, 2026
Production preference: one toggle per named trail system, grouping all its included paths; no green/blue/orange source toggles in production. Test map now has a Preview Germany Brook button, displaying the complete included Germany network in a single solid style, with one Germany Brook trail checkbox. Source comparison controls are hidden during preview and restored by Return to source comparison. Direct preview URL: map-test.html?trail=germany&preview=1. Switching area exits this Germany-only preview. Public map remains unchanged.

## Germany Brook APPROVED AND LOCKED — November 2, 2026
The owner approved the complete single-style Germany Brook preview and said “lock it in.” germany-brook-approved.geojson is the fixed approved snapshot; germany-brook-lock.json records its geometry SHA-256 and included legs. The test map now loads that snapshot, preserving the exact approved alignment. The connected-path builder rejects geometry changes against the lock. Carry this same snapshot into the production map under one Germany Brook toggle. Do not re-derive or replace its geometry during other trail work. Public map remains unchanged.

### Selected-trail preview — November 2, 2026
Preview control now follows the View area selection, with a matching trail name and single trail checkbox. Changing area while previewing updates that preview instead of jumping to Germany Brook or exiting preview. Germany Brook always uses its locked approved snapshot. Other area previews show the existing source paths intersecting that area viewport; these area previews are not new approvals or final system-membership classifications. All Norwood requires selection of an individual trail before preview.

### Endean Coakley western-edge connection — November 2, 2026
User instructed connecting the trail endpoint at the western edge of the new Coakley School to the endpoint south-southeast. Added endean-connections.geojson with a direct connection from OSM way 789314426 last coordinate (-71.2130664,42.172585) to way 835006003 last coordinate (-71.2122394,42.1713315). This is an owner-directed link between existing mapped endpoints, not an OSM-imported segment. Source snapshots remain unchanged; the loader merges this maintained addition into the Endean area. Germany Brook approved geometry remains unchanged.

## Endean / Hawes Brook APPROVED AND LOCKED — November 2, 2026
Owner approved the displayed Endean preview including the new western-Coakley-to-SSE-endpoint connection and said “lock it in.” endean-approved.geojson freezes exactly the source features displayed in that selected-area preview, without changing their coordinates. endean-lock.json records its geometry SHA-256. The map loader now uses this snapshot whenever Endean is selected, preventing future general-source refreshes from changing the approved view. Carry the approved snapshot forward under one Endean / Hawes Brook toggle. Germany Brook’s separate approved snapshot and lock remain unchanged.

## Meadow Street location correction — November 2, 2026
Owner flagged Meadow Street as badly misplaced and requested Google verification. Google Maps Meadow Street Trails place result identifies 42.1776317,-71.1731659, at the eastern end of Meadow Street beside Norwood Memorial Airport; its official website link points to the August 2025 Town brochure. Source and exact observed URL saved in meadow-street-trailhead.json. Previous Meadow viewport [-71.215,-71.192] was about 1.5 miles west of the actual start and the generic source-area filter mislabeled unrelated paths. Corrected viewport to the trailhead/airport area and added a starting-point marker. Meadow selection now displays no unrelated route linework: current MAPC/OSM snapshots have none at the actual Meadow trail. Do not shift nearby paths to fit or reuse guessed brochure transforms. Reconstruct the real network from supported sources as a separate next step; the point correction does not complete trail geometry. Germany Brook and Endean locks are untouched.

## Meadow Street approximate routes — November 2, 2026
Owner explicitly authorized an exception to GPS-only sourcing: “for this one, try to approximate trails based on proximity to nearby roads and the river.” Used the actual August 2025 Town map image (1056x816, page 2), read its seven named routes including Blue river-side branch and two Green–White branches, and placed them with three road/river controls. Source coordinates, controls, independent checks and transform are in meadow-street-registration.json; checks are about 11–15 m and indicate image placement only, not route accuracy. No source GPS claims. meadow-street-approximate.geojson contains 8 features for the 7 named routes. scripts/build-meadow-approximation.py reproduces the geometry. Meadow preview shows them together under one trail toggle; source comparison retains brochure route colors. Download points to Meadow-specific GeoJSON. This is for owner review, not locked. Germany Brook and Endean locks remain unchanged.

### Correct eastern Meadow Blue leg off I-95 — November 2, 2026
Owner flagged the eastern Blue trail lying on I-95. Corrected this leg to run parallel on the western woodland side, using the western carriageway geometry (OSM ways 1099197709 and 1099156880) as a guide and a 45 m perpendicular offset from its centerline. Removed the previous short highway-reaching spur and joined the incoming Blue trail to the corrected leg at one identical coordinate. Builder checks sampled corrected-leg points remain over 44 m west of that carriageway centerline. This is still an owner-authorized approximation, not a surveyed setback. The old bridge point used for coarse registration is not a trail endpoint. Check the aerial before publishing; no route may use the highway. All other Meadow routes and both approved-trail locks remain unchanged.

### Meadow Blue extension along western riverbank — November 2, 2026
Owner clarified that the I-95-parallel Blue leg continues northeast to the river, then follows the western bank to each other riverside trail endpoint. Added that extension using the mapped west-bank edges of OSM water polygons 1325519385 and 1325521005, offset roughly 10 m landward as an approximation. Continued the off-highway corridor to its intersection with the bank path. Yellow’s river end, Orange’s north end and Green’s river end now share exact coordinates with the extended Blue route; minor endpoint adjustments (under 30 m) are recorded in registration JSON. No highway approach or crossing was added. Other trail geometry and approved locks are unchanged.

## Production trail popups — owner requirement, November 2, 2026
Every named trail system must be clickable on the real map. Clicking any included segment opens a popup showing the trail system name and a direct link to its official Town trail brochure. This applies across all trail systems and all their included branches, regardless of source or former review colors. Use the system's brochure, not a generic source/GIS link. Maintain one map toggle per named trail system; preserve approved geometry. This is a recorded production requirement, not a request to publish the public trail layer now.

## Meadow Street APPROVED AND LOCKED — November 2, 2026
Owner approved the complete Meadow Street preview and said “lock it in.” meadow-street-approved.geojson freezes all seven named routes, the Blue leg west of I-95, its northeast continuation and western riverbank path, and exact Yellow/Orange/Green connections. meadow-street-lock.json records the geometry checksum. The loader uses the approved snapshot, and the approximation builder rejects changes against the lock. Preserve its approved approximate alignment; this is not a conversion to recorded GPS data. Carry it into production under one Meadow Street toggle with the official brochure popup requirement above. Other approved trail locks remain unchanged.

## Vanderbilt / Pine Tree Forest — 2026-11-03 test approximation
- Owner requested inner and outer loops traced using the Drive brochure and nearby map features.
- Source: VanderbiltPTFInnerAndOuterLoops5KMap.pdf, Drive ID 1vZ7KuQE0WHdan1lJJLNMbYqAdzj50iF0.
- Test page loads vanderbilt-loops-approximate.geojson; vanderbilt-registration.json preserves the landmark controls, transform and source pixel traces. Inner loop follows PDF vector strokes; outer follows red raster route. Approximate alignment uses Vanderbilt/Morgan junction, Vanderbilt entrance and paired power-line bend. Compared against stored OSM roads, power lines and waterways.
- Both loops together form the brochure’s 5K; neither individual loop is advertised as 5K. Every loop popup links to the brochure. Generic preview retains one trail-system control.
- Awaiting owner review; not locked. Public map unchanged. Preserve all previously approved/locked systems.

## Vanderbilt locked — 2026-11-03
Owner approved both displayed loops and requested lock-in. vanderbilt-approved.geojson freezes the approved geometry byte-for-byte, protected by vanderbilt-lock.json SHA-256 0760e583a89ee1d44d5158ca3e2cf149820a5b233a1a26dff8790e82abdcc329. Test map now loads the approved snapshot. Preserve red outer and black inner loop styling in both modes. Next review: Hennessey Field / Murphy Park.

## Hennessey Field / Murphy Park review — 2026-11-03
Opened Drive brochure 2023.03.24 HennesseyField and MurphyPark_Trails_MAP_BROCHURE.pdf, page 2. Retained OSM ways 1077490141 and 1077490142 for main gravel network; added brochure-derived natural loop and short northern offshoot using six path/entrance landmarks. hennessey-registration.json records controls and residuals. hennessey-review.geojson displays only these four features when selected, with brochure popups. Owner review pending. Vanderbilt remains locked.

### Hennessey brochure colors and descriptions — 2026-11-03
Owner requested brochure colors and text explaining sections: gray primary gravel paths, green natural woodland loop and northern offshoot, in both review and preview. Added plain-language map explanation and section-specific popups. Keep one system toggle. Geometry unchanged.

### Brochure colors apply to earlier systems — 2026-11-03
Owner extended the convention to previously reviewed trails. Preserve approved geometry and one system toggle. Match route colors where explicit; explain types in map text and popups, with brochure links. Preview now preserves Meadow route colors and Green–White dashes; Shattuck natural paths are green; Cooper park paths are tan. Reviewed the actual Germany, Shattuck, Cooper and Endean brochure images. Germany uses olive main natural route, green branches, black identified paving. Endean uses black identified paving, gray identified gravel, green natural/connecting paths. Do not invent primary/secondary/seasonal classifications for source sections without those attributes; the Endean explanation says that distinction is incomplete. Hennessey gray gravel and green natural paths apply in both modes. Locked GeoJSON files remain byte-for-byte unchanged.

## Ellis Pond / Alevizos Park review — 2026-11-03
Owner requested next trail. Opened actual Drive Town brochure 2023.03.24 EllisPond_Alevizos Park_MAP_BROCHURE.pdf, page 2 (ID 1nMBh4QI94dyM5U6xjmYX7CHpvKGr_6wX). Corrected misplaced old area viewport: actual network is around 42.181,-71.220, not the old 42.19 location. Retained OSM ways 824000280,824228125,824228597,1243709537,1243709538 for eastern shore and dam; three missing sections approximated from brochure: Nichols Street northern launch, west-dam paved approach, Lower Pond/Alevizos natural path. Five east-shore control fit residuals 1–6m; this does not estimate accuracy of remote sections. Compared rendered overlay with cached OSM shoreline, brook and roads; paths remain beside the water. West-dam road endpoint snapped to actual Walpole Street; no artificial connections between separate access trails. Files ellis-pond-review.geojson and ellis-pond-registration.json. Colors match brochure: olive natural, gray gravel crossing, black paved west approach. Popups explain sections and link brochure. One preview toggle for whole system; owner review pending. All approved snapshots untouched.

### Owner correction — Ellis Pond southern segment, 2026-11-03
The disconnected segment at the bottom of the map (Alevizos Park / Lower Pond path) is not a trail. Removed from the displayed GeoJSON and source-route registration. Do not restore this segment. Other seven features unchanged; updated legend to remove Lower Pond path references.

## Ellis Playground review — 2026-11-03
Owner approved corrected Ellis Pond alignment and requested next trail. Ellis Playground brochure is off Codman Road, not Balch Woods; initial conversational label corrected before implementation. Opened actual page 2 of Drive 1x32aHzxdJrrcJvBEZbuB9H05Xaxtbkfp. Traced primary/secondary natural trails, seasonal wetland route and playground connectors. Six road/entrance landmarks fit residuals 2–9m; missing trail sections are approximate, not GPS tracks. Shared source pixels maintain junctions. Compared overlay to OSM road/brook geometry; southern primary trail remains north of Plantingfield Brook and eastern trail remains west of US Route 1. Corrected old misplaced viewport to actual Codman Road site around 42.206,-71.189. Files: ellis-playground-review.geojson and ellis-playground-registration.json. Olive primary, green secondary, olive dashed seasonal, green dotted connectors; descriptions and brochure links in popups; one system toggle. All previously approved linework unchanged. Owner review pending.

## Ledgeview Drive proposed loop review — 2026-11-03
Opened Drive LedgeviewDriveMap.pdf (1XtBbNiYSEFR1R6i1udUzjPr1Hv_mC20o), dated 6 August 2026. Explicitly a potential loop contingent on land acquisition; preserve PROPOSED status and explanation, never represent as confirmed public access. Approximated blue Tiot leg, green loop, red pipe-gate approach, black dotted pool-side section from actual map. Five road/river controls fit residuals 11–24m. River-adjacent vertices kept landward with a 25m centerline offset when closer; gate endpoint snapped to road terminus, shared junctions maintained. Compared geometry against OSM river, brook, road and highway context. Corrected old viewport from wrong site to western end of Ledgeview Drive, south of Neponset Street. Files ledgeview-review.geojson, ledgeview-registration.json. One system toggle; section descriptions and source link. Owner review pending. Existing approved trail files unchanged.

### Ledgeview approval and brochure notice — 2026-11-03
Owner approved the displayed Ledgeview alignment. Preserve geometry and source colors. Added conditional notice above the map and popup reminder covering proposed access, pools, trenches, high water, and the source's typical best-condition guideline of river height 10 feet or less. Owner supplied the USGS Neponset River gauge URL and instructed us to assume it is the right link; added it to the Ledgeview popup. The QR itself has not been independently decoded. Ledgeview popup update commit: 60f563d1f21e59911092fee5f5a2d0cc88017702.


## Willett School / Tiot Trail leg preview — 2026-11-03
- Next trail in the documented brochure queue after Ledgeview. Source: `WillettTiotTrailLegMap.pdf` (Google Drive ID `1i3uG3TOsoQ2OeCiyV_-mpyKqjwjxlVKL`), dated 5 March 2026. It identifies a new Tiot Trail leg behind Willett School, 0.37 mile, from the easement to Westover Parkway, shown red.
- Added `data/trails/willett-tiot-review.geojson` as one planned red dashed line. Its 40 centerline vertices were traced from the brochure’s satellite inset. Approximate scale uses the map’s stated 0.37-mile leg (595.5m over 874.5 screen pixels, 0.681m/pixel); its anchor is the mapped Willett school site at approximately 42.19405, -71.22197. This is a brochure-derived approximation, not an OSM/GPS track or a surveyed alignment.
- The test map loads this feature only in Willett / Tiot preview, while source-comparison mode continues to show the stored MAPC/OSM paths for the surrounding area. The popup names the planned leg and links to its brochure. Public `map.html` remains unchanged.
- Commits: `91c37b416122a75bc1c2c5327b05145fff317d77` (GeoJSON), `ccef526b0a189355fe018575fa32fa341dfd70c4` (preview logic), `d6904df4eb40251902b87f297e8c6e3a0461256a` (test-page cache version). Review URL: `https://norwood.ma/map-test.html?trail=willett&preview=1&v=20261103-willett1`.


## Willett / Tiot APPROVED AND LOCKED — 2026-11-04
Owner accepted the uniform-scale version and explicitly said to consider it right. Preserve the exact geometry in willett-tiot-approved.geojson. It contains the actual extracted red centerline (1274 vertices), registered with uniform scale and rotation; supersedes all earlier Willett approximations and affine registrations. Test map now uses the approved snapshot. Retain red source color, one trail control, brochure popup, and source planned status. Do not alter the accepted geometry during other trail work.
