# Building permits and development map — source validation (2026-11-16)

Status: research and integration specification only; **no live map layer or automated permit feed is connected**.

## Verified leads

1. Official Town of Norwood Citizen Self Service (EnerGov) supports public-record search and has a map interface. Access guide: https://support.norwoodma.gov/portal/en/kb/articles/citizen-self-service-how-to-access-online-permit-licensing-page . Public search does not itself establish a free bulk API or republication license.
2. Town knowledge-base instructions describe a custom monthly Building Permit Report (Assessor): https://support.norwoodma.gov/portal/en/kb/articles/how-to-access-custom-built-monthly-building-permit-report-assessor . Determine whether a public, repeatable export can be obtained.
3. PermitStack lists Norwood permit records and advertises a 100-request/day free API tier: https://permit-stack.com/building-permits/ma/ . Validate coverage, licensing, address quality and API-key requirements before use; do not rely on the vendor's totals as official comprehensive counts.

## Proposed Explore Norwood by Map layer

- Optional **Building permits & development** checkbox, initially unchecked, in `map.html`; keep existing map and mobile controls intact.
- Show geocoded Norwood addresses only; filter out nearby municipalities. Never place a pin at an invented approximate address.
- Each popup: permit type, work description where public, status, issued/applied date, address, source and link to official record. Label application versus issued permit explicitly; do not imply construction is underway merely because a permit exists.
- Filters: last 30/90/365 days, major projects versus all permits, permit type; deduplicate by source permit ID.
- Daily or weekly update only after a legal, stable, free machine-readable source is validated. Display last successful update and stale-data warning. Never show example permits as real data.
- Separate major planning/development proposals from routine electrical, roofing, and plumbing permits.

## Next technical validation

1. Test whether public EnerGov search has documented export/API access and terms permitting republication; otherwise request a recurring public report from the Building Department.
2. Test PermitStack's free API with an authorized key and inspect a sample of records against official permits, especially town boundary and timestamps.
3. Inspect existing map layer architecture, geocoding, and parcel-address matching before implementing a new JS module.
4. Only enable the layer once source refresh, geocoding, mobile display and source links have been tested.
