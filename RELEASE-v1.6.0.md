# v1.6.0 — Live work zones and clearer precinct colors

Released November 5, 2026.

- Adds an optional Norwood-area work-zone overlay from MassDOT’s public GeoJSON feed. It requires no signup or API key, is published under CC0, and refreshes every 60 seconds while enabled.
- Shows active work zones within the Norwood map area, with road name, direction, traffic impact, end time, and a source link in each popup.
- Replaces generated precinct hues with a high-contrast palette and stronger outlines so adjacent precincts are easier to distinguish.

The site serves the feed through a same-origin PHP relay to avoid browser cross-origin restrictions. The feed covers work zones only; it does not provide general congestion speeds. The overlay is off by default.
