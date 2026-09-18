# Norwood.ma v0.11.21

Live-site stabilization release.

- Removed the Stadia Maps tile dependency that produced 401 Invalid Authentication errors on GitHub Pages. Transit maps now use the existing no-key Esri street basemap directly.
- Repaired malformed opening markup on Local Resources that had accidentally embedded the Everyday Local Services card inside the `<html>` tag.
- Restored Everyday Local Services as a normal topic card in the Local Resources topic grid.
- Retained the approved Norwood Next Facebook advertisement and v0.11.20 calendar-link corrections.
- Bumped browser cache-busting references for the deployment.
