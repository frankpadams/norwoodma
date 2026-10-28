# Sports & Recreation

`sports-recreation.html` is the single maintained sports hub. Resources and Things to Do link here rather than creating separate league directories.

## Organization and navigation

- Youth sports, Adult sports & fitness, and Places to play are audience tabs.
- Youth leagues are grouped in native expandable `details` elements by sport. Each organization has one entry in the hub, with verified descriptions and official links.
- Adult leagues/programs and facility guides use the same hub. Existing resource-directory records may still appear in relevant categories.
- Hash links select the audience and open the matching sport, e.g. `#youth-softball`, `#adult`, `#places`. Search routes exact sport queries to their matching group. Keyboard arrows, Home and End work across tabs. Without JavaScript, all sections remain available.

## Compact registration announcements

Maintain announcements directly in the audience's `.ns-notices` list in `sports-recreation.html`. Each linked row needs an audience, official details/registration URL, truthful title, and ISO `data-expires` date. Use the confirmed registration deadline; when none is published, stop promoting a session at its start date or set a conservative review date. Sort by the deadline/review date. Do not describe unknown availability as open or closed.

`sports-guide.js` hides notices after their expiry date in America/New_York, including when a tab remains open across midnight. It also hides a league's registration badge when no matching unexpired announcement remains. `data-sport` associates notices with a league group, and `data-status` supplies the optional badge. Do not separately maintain registration text in league badges.

Expired records must also be removed during routine source maintenance; browser expiry does not replace editorial review or automatically discover new registration openings. With JavaScript disabled, dated announcements remain visible, including their stated dates.

## Calendar boundary

Registration announcements are links, not invented calendar events. Games and clinic occurrences continue through the existing event pipeline and calendar selector. A season label or a populated opponent feed does not establish future coverage. Confirm dates, times and feed scope before publishing events.

## Verification

Check all three tabs, keyboard navigation, direct sport hashes, announcement expiry, absence of duplicate hub organizations, search routing, and layout at narrow widths. Preserve the independent-site disclaimer and existing global navigation.
