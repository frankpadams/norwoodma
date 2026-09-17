# Norwood.ma v0.1.1

First visible, mobile-first prototype for a low-maintenance Norwood, Massachusetts community information hub.

## Run
Open `index.html` directly, or preferably serve the folder locally (for example `python3 -m http.server 8000`) so browser APIs work normally.

## Included
- Responsive/mobile-first homepage
- Norwood visual identity and real Norwood Central photography (remote Wikimedia Commons image with attribution page)
- Mobile navigation
- News/event/resource UI
- Searchable resource cards
- Transit concept panel designed around Route 34E + Franklin/Foxboro Line
- NWS weather adapter with graceful offline fallback
- Initial machine-readable source registry

## Important prototype boundary
The transit drawing in v0.1.1 is explicitly a concept visualization, not a geographic map. The next build should use a real map library + MBTA `/routes`, `/stops`, `/shapes`, `/vehicles`, `/predictions`, and `/alerts` data. No invented arrival times are shown.

## Mobile acceptance targets
- 320px width without page-level horizontal scrolling
- Touch-sized navigation and controls
- One-column news/transit/events layouts on phones
- Search input >=16px to avoid iOS zoom
- Large map area retained on small screens
