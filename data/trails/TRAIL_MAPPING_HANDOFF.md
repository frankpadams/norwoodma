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
