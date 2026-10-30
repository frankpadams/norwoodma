# Gas-price refresh and free-source coverage

The daily `refresh-gas-prices.yml` workflow also runs when its importer, shared matching rules or tests change. It verifies station identity, fetches Google prices, tries free fallbacks for stations without a regular report checked/reported within 48 hours, and publishes prices plus `data/gas-price-status.json` diagnostics.

## Source order

1. **Google Places:** search by station name/address, then address-only when necessary. Examine up to five candidates per search. Require a gas-station listing (or an explicitly allowlisted known station name when Google omits its gas-station type) with the expected street number, normalized street, town and Massachusetts state component. Record the chosen/rejected place IDs, names, addresses and outcomes. A changed brand must still match the exact physical location. Do not take the first result blindly.
2. **Costco official warehouse pages:** the curated Dedham and Sharon warehouse URLs publishes Regular and Premium prices directly. Verify warehouse name/address before accepting. This is an official price observed on the source; Costco does not provide a report timestamp here. Store `observed_at` and show “Checked on source”, not a fabricated “Reported” date.
3. **GasBuddy community reports:** a best-effort free source through `py-gasbuddy==0.7.2` on Python 3.13. Query the unresolved stations' ZIP codes, following at most three result pages per ZIP. Require exact address, town, state, USD/gallons, and the fuel's `last_updated`. Use credit pump prices, never `deal_price` or un-timestamped cash prices. No login, paid scraper, proxy or anti-bot bypass is configured. When unavailable, record the failure and preserve cached data.

There is no verified universally reliable free station-price API covering every station. A free website that shows a price is not automatically a dependable automated feed.

## Research checked October 30, 2026

| Source | Verified coverage/use | Automation decision |
|---|---|---|
| Costco official warehouse pages | `https://www.costco.com/warehouse-locations-319.html`; correct 200 Legacy Blvd address; Sharon uses `https://www.costco.com/warehouse-locations-1704.html` at 160 Old Post Road. Both publish regular/premium in public HTML | Enabled direct official fallback; observation date only |
| GasBuddy | Station-level community reports; library exposes per-fuel `last_updated`, credit price and exact address | Enabled best effort; availability tested in every run, not promised; first live run returned CloudflareBlocked |
| iExit | Norwood listings cover Broadway Gulf, Mr. Frank's, Shell on Walpole Street, 69 Providence Hwy (listed as Marathon), and Costco Dedham | Human cross-check; direct HTTP returned 403 in the development environment, and its documented API requires paid access. Do not treat search snippets as live reports |
| BJ's official Norwood club | `https://www.bjs.com/cl/norwood/0904/`; verifies club/address/hours, but no fuel prices in the inspected public page | Not a price importer |
| Way | Norwood directory has several missing prices and conflicting duplicate records; no dependable report dates in inspected listings | Not accepted as an automatic replacement |

iExit public reference pages: `https://www.iexitapp.com/gasprices/Massachusetts/17/Norwood/14977/Unleaded/3`, `https://www.iexitapp.com/Massachusetts/I-95/Exit%2023B/5733`, `https://www.iexitapp.com/business/Marathon/467027?origin=gas_prices`, `https://www.iexitapp.com/business/Costco%20Gasoline/85025?origin=gas_prices`. Its API access policy is at `https://developer.iexitapp.com/reference/getting-started`.

## Preservation and provenance

- `scripts/gas_price_common.py` is the shared inventory and conservative address/merge policy for all 14 stations, including nearby Costco locations.
- `fuel_reports` stores each grade's own source, source URL/place ID, report time or observation time, and known payment requirement. Updating regular must not make old premium/diesel appear newly reported.
- Keep the existing flat price fields for browser compatibility. The legacy row date follows regular rather than the newest unrelated grade. The browser shows source details on individual prices and a link to the regular-price source when available.
- Reject missing/naive/future timestamps, non-USD Google prices, invalid values and reports over 30 days old. Never overwrite a newer per-grade report with an older one. An unsuccessful lookup must not alter cached prices or their dates.
- Preserve old reports visibly under the existing frontend policy; this work does not hide stale prices or change station ordering.
- The diagnostics distinguish failed matching, verified station with no usable prices, request/source failures, accepted grades, and unresolved stations. Workflow summaries expose gaps even when other stations update successfully.

Run `python -m unittest discover -s tests -p test_gas_prices.py -v` for address, wrong-top-result, retry, timestamp, per-grade preservation and free-source parser checks. Run `node --check gas-prices.js` after browser changes.

Google lists the Sharon fuel forecourt at 162 Old Post Road while Costco lists the warehouse at 160. Both are explicitly allowlisted for this station; unrelated street numbers remain rejected. The first live run recovered Rojo through a separate Marathon listing at the same verified 69 Providence Hwy address.
