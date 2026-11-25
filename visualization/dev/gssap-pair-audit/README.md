# GSSAP pair audit

The published Episodes sheet currently has GSSAP spacecraft in E-003 (USA 271), E-004 (USA 270; orbital asset `e005`), and the unpublished E-009 draft (USA 270). Space-Track SATCAT identifies USA 270 as 2016-052A / NORAD 41744 and USA 271 as 2016-052B / NORAD 41745. They launched together on 19 August 2016, consistent with the [U.S. Space Force's GSSAP 3/4 launch notice](https://www.losangeles.spaceforce.mil/News/Article-Display/Article/920031/air-force-successfully-launches-gssap-34-afspc-6-from-cape-canaveral-afs/).

I fetched the missing partner's GP_HISTORY elements from Space-Track and stored them beside each episode's existing elements. The public E-003/E-004 assets now have 27 and 5 partner elements, respectively. E-009 has 13 partner elements locally; its directory is Git-ignored and remains unpublished. The existing scene renderers do not select these extra files until a partner is deliberately added to an episode.

## Separation during current sheet chapters

The figures below use the nearest available TLE for **each** spacecraft at one-hour intervals, SGP4 propagation, and the current sheet center/width for each chapter. Distances are indicative and rounded to the nearest kilometer. The TLE ages at the pair's minimum are shown to reveal sparse coverage; these are not uncertainty bounds.

| Episode / chapter | Closest USA 270–271 distance | TLE ages at that sample, USA 270 / USA 271 | Closest partner–episode-target distance |
| --- | ---: | ---: | ---: |
| E-003 / Apr 29, 2020 | 61,578 km | 11 h / 114 h | 61,752 km |
| E-003 / Aug 28, 2020 | 50,944 km | 169 h / 418 h | 50,532 km |
| E-003 / Oct 31, 2020 | 57,340 km | 25 h / 303 h | 57,135 km |
| E-004 / Jan 8, 2022 | 18,939 km | 162 h / 174 h | 18,484 km |
| E-004 / Feb 14, 2022 | 42,328 km | 60 h / 168 h | 42,410 km |
| E-009 / Sep 26, 2026 | 63,920 km | 25 h / 30 h | 60,288 km |

These elements are available for a third-object view, but the paired spacecraft was **not nearby** in the selected chapters. Adding it to the current proximity scenes would introduce an object tens of thousands of kilometers away. E-004's first chapter is the closest of these cases, and even that partner is about 19,000 km from the plotted GSSAP spacecraft. In E-003, TLE ages of 169–418 hours for one or both GSSAP objects make the reconstructed distances especially tentative.

## Refresh

`python3 visualization/dev/gssap-pair-audit/fetch_partner_history.py --dry-run` reads chapter dates from the published sheet. With the `spacetrack` package installed and `SPACETRACK_USERNAME` / `SPACETRACK_PASSWORD` in the environment, run it without `--dry-run` to download missing public partner files. Add `--replace` to refresh existing files; add `--include-local` to refresh unpublished E-009 data. Credentials are not written to the repository.
