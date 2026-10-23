# Fundraiser discovery and publication

`fundraising.html` has a generated current/upcoming section bounded by HTML comments. Header, footer and ongoing-giving sections are preserved.

## GitHub publication

`.github/workflows/refresh-fundraisers.yml` runs once daily at 12:35 UTC (8:35 AM EDT / 7:35 AM EST), on relevant input pushes and manually. It runs `scripts/refresh_fundraisers.py`, requiring only Python's standard library and no AI/API credentials. The shared calendar is refreshed independently by the existing content workflow. The fundraiser job reads its latest committed output, combines it with `data/fundraisers-curated.json`, and writes `data/fundraisers.json` and the HTML section. This is calendar aggregation, not a new general website scraper.

Calendar candidates need explicit fundraising evidence in the title, public access, verification metadata, a usable web link, organizer, dates and explicit Norwood location/organizer evidence. Mere feed membership and fundraising words in scraped page boilerplate are insufficient. Citizens for a Better Norwood sources are excluded. Regional organizations serving Norwood children can be added to curated records with a documented local connection.

Curated records retain researched campaigns and links that are not represented in the calendar. End dates expire listings after the local calendar day. Ordering deadlines mark sales closed while retaining pickup information through the pickup date. Undated campaigns remain until their current status is reviewed; they cannot be automatically inferred closed. Primary links should be official event/order/ticket/donation destinations; public posts are discovery leads and fallback sources. No flyers are archived or rehosted.

## Social discovery

The separately configured once-daily ChatGPT task remains responsible for finding publicly accessible Facebook/Instagram posts and reading accessible flyers, including Norwood MA community groups and GOFI. It should update curated inputs rather than hand-edit generated HTML, and use the existing event seed/import system for regular calendar events. It must deduplicate campaigns, confirm Norwood MA relevance, preserve current source links, and never imply private/login-blocked posts were checked. Organization-site discovery already handled by the calendar ingestion continues there; additional unstructured campaigns can be researched into curated inputs.

The GitHub publishing/expiration job runs without ChatGPT. Discovery of additional social posts still depends on the separate task; missing posts are a coverage limitation, not a reason to remove existing verified campaigns.
