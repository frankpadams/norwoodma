# Norwood.ma Versioning & Release Policy

**Authority:** This file is the canonical rule for Norwood.ma release numbering and release documentation.

**Current stable release:** **v1.0.2**  
**Stable-release date:** September 29, 2026

Norwood.ma uses a three-part release number:

`MAJOR.MINOR.PATCH`

Example: `1.4.2`.

## What each number means

### MAJOR — `X.0.0`

Increase the major version when Norwood.ma reaches a new product generation or makes a substantial change to its public architecture, information model, or operating assumptions.

Examples include a major redesign/navigation model, replacement of the core publishing architecture, a major change in project scope, or a deliberately declared new generation of the site. Major releases should be uncommon.

### MINOR — `1.X.0`

Increase the minor version for a meaningful user-facing feature, substantial capability, or notable expansion that does not redefine the whole product.

Examples include a new major page or interactive tool, a new event/calendar subsystem, a substantial search/map/transit/directory capability, a meaningful new automation/data integration, or a significant redesign of an existing feature.

A minor release resets PATCH to zero: `1.3.7 → 1.4.0`.

### PATCH — `1.0.X`

Increase the patch version for fixes, refinements, data/schema corrections, small UX improvements, styling changes, accessibility fixes, reliability work, and maintenance that does not constitute a new major feature.

Examples include layout/mobile fixes, search-ranking refinements, wording changes, small ingestion fixes, cache/reliability changes, and correcting broken links or sources.

Example: `1.0.3 → 1.0.4`.

## Development and cache versions

Asset cache-busting query strings such as `app.js?v=...`, `nav.js?v=...`, or `styles.css?v=...` are **not** the canonical product version. They may change whenever needed to force browsers to retrieve updated assets.

The canonical product version must agree in all of these places:

1. `VERSIONING.md` — **Current stable release**.
2. The first heading of `README.md`.
3. The matching `RELEASE-vX.Y.Z.md` file.
4. The public footer value defined by `SITE_VERSION` in `nav.js`.

## Required release procedure

Every intentional product release must complete all of these steps before it is considered finished:

1. **Choose the next version number** using the rules above.
2. **Update `VERSIONING.md`** — change Current stable release and date.
3. **Update `README.md`**
   - first heading must show the current stable version;
   - add/update the current-release summary near the top.
4. **Create `RELEASE-vX.Y.Z.md`**
   - summarize meaningful user-facing changes;
   - identify important technical/automation changes;
   - note known limitations when relevant.
5. **Update the public footer version**
   - set `SITE_VERSION` in `nav.js` to the same `X.Y.Z`;
   - static HTML footer text may act as a fallback, but must not contradict the shared value when edited.
6. **Update authoritative subsystem documentation when affected.**
   Examples:
   - `EVENT-SUBMISSION-SYSTEM.md` for submission/moderation/publication changes;
   - `NEWS-SOURCES.md` for news-source architecture;
   - `DATASET.md` for dataset/schema changes;
   - `RECONCILIATION.md` when a release resolves or materially changes recorded commitments;
   - `DEVELOPER_TODO.md` when work is completed, superseded, or newly identified.
7. **Check version consistency before release.** Search the repository for obsolete product-version labels and correct misleading current-version references.
8. **Do not version routine generated-data refreshes.** Automated event, news, feed, gas-price, or similar data refresh commits do not by themselves require a product version bump.

## Release naming

Use these exact forms:

- Product/release label: `vMAJOR.MINOR.PATCH` — for example `v1.2.0`.
- Release document: `RELEASE-vMAJOR.MINOR.PATCH.md`.
- Footer display: `Version MAJOR.MINOR.PATCH`.

Do not use four-part product versions for stable releases. Cache-busting identifiers are separate and may have their own values.

## Source-of-truth rule

If version references disagree, resolve them in this order:

1. `VERSIONING.md`
2. current `README.md` heading
3. matching `RELEASE-vX.Y.Z.md`
4. `SITE_VERSION` in `nav.js`
5. older release notes/history

Older historical release references should remain intact when they describe the version in which work actually happened; only misleading claims about the **current** version should be changed.
