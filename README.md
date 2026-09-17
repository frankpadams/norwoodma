# Norwood.ma v0.2.0
Independent community information prototype for Norwood, Massachusetts.

## Live features
- NWS weather from api.weather.gov
- MBTA V3 vehicle positions for Route 34E and Franklin/Foxboro commuter rail
- 34E stops and route shape on OpenStreetMap / Leaflet
- RSS-first news loading with a local fallback
- Searchable resident resource directory with original-site links
- Clear independent-site disclosure linking to the official Town of Norwood website

## Run locally
A web server is required because the site loads JSON files:
`python3 -m http.server 8000`
then open `http://localhost:8000`.

## GitHub Pages
Upload the contents of this folder to the repository root and enable Pages. The build is static. Browser access to third-party feeds/APIs can be affected by CORS or rate limits; production should add scheduled GitHub Actions caching for news/events while leaving MBTA and NWS live.

## Important
Norwood.ma is not affiliated with the Town of Norwood government.
