# Norwood.ma jobs — verified source inventory (2026-11-16)

Status: research inventory only; not an operating import or publication pipeline. Norwood-only by default; existing UI may expand to nearby towns. No paid feeds or employer submissions.

| Employer/source | Hiring platform | Public URL / endpoint | Evidence | Integration status |
|---|---|---|---|---|
| Home Market Foods | Greenhouse | https://boards-api.greenhouse.io/v1/boards/homemarketfoods/jobs | Public board https://job-boards.greenhouse.io/homemarketfoods lists Norwood jobs alongside CT and Norton; filter each posting's location | Confirmed board and documented public API pattern; endpoint not yet runtime-tested |
| Big Y, 434 Walpole St | Cadient Talent | https://cta.cadienttalent.com/index.jsp?applicationName=BigYNonReqExt&deviceMode=desktop&locale=en_US&location_id=98438440999&seq=locationDetails | Public location page lists 17 job categories including cashier, bakery, deli, grocery, overnight | HTML career page verified; automated reuse/API permissions unverified |
| The Chateau, Norwood | Indeed listing | Employer direct career platform not identified | Norwood part-time host/server listings discovered via job search | Direct feed not identified |
| Four Points by Sheraton, Norwood | Indeed listing | Employer direct career platform not identified | Norwood part-time bistro host discovered via job search | Direct feed not identified |
| TJ Maxx, Norwood | ZipRecruiter listing | Employer direct career platform not identified | Norwood retail merchandise associate discovered via job search | Direct feed not identified |
| Smoothie King, Norwood | Indeed listing | Employer direct career platform not identified | Norwood part-time team member discovered via job search | Direct feed not identified |
| Monster Mini Golf, Norwood | Indeed listing | Employer direct career platform not identified | Norwood part-time team member discovered via job search | Direct feed not identified |
| Bay State Physical Therapy, Norwood | Indeed listing | Employer direct career platform not identified | Norwood part-time rehab aide discovered via job search | Direct feed not identified |
| Cornerstone Caregiving, Norwood | Indeed listing | Employer direct career platform not identified | Norwood part-time caregiver discovered via job search | Direct feed not identified |

## Public employer-feed adapters to evaluate
- Greenhouse: GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs (no key for public job board GET).
- Lever: GET https://api.lever.co/v0/postings/{slug}?mode=json.
- Ashby: GET https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true.
- Recruitee, Workable, SmartRecruiters: investigate employer-by-employer, checking terms and robots restrictions.
- Cadient Talent: investigate official permitted API or employer-specific structured data; do not assume HTML scraping is permitted.
- HigherMe and Harri: discover Norwood franchise employers and permitted feeds.
- Adzuna, Jooble: evaluate publisher/API approval and terms; do not assume commercial rights or zero cost.
- Craigslist, Indeed, ZipRecruiter, Monster: discovery only unless authorized feeds/partnerships exist.

## Next engineering steps
1. Identify existing Jobs page files and data contract before modifying it.
2. Test Home Market Foods Greenhouse endpoint, filter strictly by exact Norwood job location, and normalize title, employer, location, source, source ID, URL, date.
3. Add other verified employer-specific boards; retain nearby locations only for opt-in expanded search.
4. Deduplicate by employer + title + location + canonical apply URL; expire missing postings after successive successful refreshes.
5. Schedule daily updates with a free existing infrastructure option; publish only after reviewing source terms and successful runs.
6. Keep Jobs page standalone/unlinked until enough reliable inventory is flowing.

Research references: https://job-boards.greenhouse.io/homemarketfoods ; https://cta.cadienttalent.com/index.jsp?applicationName=BigYNonReqExt&deviceMode=desktop&locale=en_US&location_id=98438440999&seq=locationDetails
