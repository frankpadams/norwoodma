# Norwood.ma Event Prioritization & Sorting Rules

**Status:** Permanent editorial policy  
**Applies to:** The homepage event feed, full community calendar, expanded event details, and featured daily event displays.

## Objective

Rank events independently for each calendar day by Norwood community relevance, public importance, accessibility, and opportunity to participate. Feed order, import order, popularity, and source-provider ordering never determine display order.

## Daily ranking hierarchy

Every event receives the highest applicable priority below. Lower-numbered priorities appear first.

| Priority | Category | Classification |
| --- | --- | --- |
| 1 | Elections and voting | Election days and events; voter registration deadlines; early, precinct, and other voting opportunities; public election information sessions and candidate forums. |
| 2 | Norwood Town Common | Events held at Norwood Town Common, regardless of cost, ticketing, or recurrence. Election events remain first. Religious events remain last. |
| 3 | Other one-time community events | Special events, open houses, expos, fairs, festivals, non-music performances, community celebrations, one-time workshops, and presentations. |
| 4 | Live music | Live bands, concerts, musical performances, and other live music events. Free live music stays in this category. |
| 5 | Free, non-religious events | Free public activities, programs, educational events, family activities, and other secular events not classified above. |
| 6 | Other non-religious events | Ticketed activities, paid performances, educational or recreational events, and other secular events not classified above. |
| 7 | Norwood municipal meetings | Select Board, School Committee, Planning Board, Zoning Board of Appeals, Finance Commission, other Norwood boards and committees, and their public meetings. |
| 8 | Multi-session and recurring programs | Recreation classes, weekly activities, ongoing workshops, multi-week programs, recurring classes, and other recurring activities. |
| 9 | Religious events | Worship services, religious education, church-sponsored activities, gatherings, and other faith-based programming. |

## Classification and tie-breaking

- A higher-priority category wins when an event matches more than one category. Elections always lead. Religious events remain last even when free or held at a prominent venue.
- Town Common events outrank other categories, including recurring events, subject to the election and religious rules above.
- A multi-day festival or other special one-time event stays in its one-time category; a date range by itself does not make an event recurring.
- Recreation classes, weekly activities, and other multi-session programs remain recurring even when one occurrence is listed on a particular date.
- Municipal meetings retain their municipal classification even when held once. A meeting related to an election uses Priority 1.
- After priority, sort by starting time. Events without a published start time follow timed events in the same category.
- Recalculate the comparison for each date. An event's rank for one day does not affect another day.

## Display rules

Show date, title, time, and location on one line when space and content length allow. Let long titles and narrow screens wrap naturally. Do not put times on a dedicated line without need. Keep titles prominent, and show time and location in secondary text. Use compact lowercase time labels such as “9am” or “9:30am,” never “09:00.” Use abbreviated month and day labels, such as “Jan 24,” not numeric dates such as “01/24/2027.”

The shared comparator in `event-agenda.js` implements this policy for the full calendar, generated event listings, and homepage feed. New and refreshed events pass through that comparator automatically. Public religious events and municipal board and committee meetings remain eligible for the calendar.
