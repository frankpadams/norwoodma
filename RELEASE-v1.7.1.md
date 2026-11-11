# Norwood.ma v1.7.1

Released November 10, 2026.

- Adds 18 businesses verified through their official websites or the Norwood Space Center tenant directory, including CVS, the Home Depot retail store, Harbor Freight, Ocean State Job Lot, Advance Auto Parts, Jiffy Lube, Valvoline, TNT Auto Detailing, McDonald Flooring, Sky Spa, You Lucky Dogs, two dental practices, two home-care providers, two photographers and Rage Zone.
- Combines maintained business and restaurant data for 873 searchable directory listings, adding 77 restaurant records to business-directory browsing without copying their source dataset.
- Repairs category matching for 35 previously unclassified business records and provides a fallback category for future unmatched records.
- Corrects 64 generated addresses, including 49 Walpole Street records previously assigned to the town of Walpole.
- Keeps map category matching aligned with directory categories and uses the map food layer for restaurant links.

Validation uses the normal directory scripts to check city classification, category coverage, search, restaurant deduplication and food map links. Existing business IDs retain their order.
