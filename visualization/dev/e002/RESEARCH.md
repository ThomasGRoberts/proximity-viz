# E-002 development reconstruction · November 15, 2026

This folder is a published **development preview**, not a finalized science visualization. The E-002 spreadsheet fields have not been edited. The browser retrieves checksum-pinned TLE files from Willa Madsen's existing published project; this site does not commit a new copy of the raw E-002 elements. The [machine-readable manifest](data/provenance.json) identifies each dataset, provider, immediate retrieval source, available epoch range, checksum, and reuse status.

The [primary playback view](index.html) starts at December 31, 2019, 18:00–19:30 UTC and advances at 90 simulated seconds per real second. Three other short windows can be selected: December 7 and 8 (three spacecraft) and January 24 (Russian spacecraft only). Each craft uses one dated TLE throughout its selected window; the player never crosses a nearest-element switch within playback. USA 245 is omitted when no element lies within the 36-hour display gate. The [miniature table view](mini.html) plays the same December 31 window forward and stops at its end. The [advanced camera explorer](camera-explorer.html) remains available for manual views and captures.

The automatic camera stays on a 6.2-Earth-radius sphere with a 35° field of view. It aims near the midpoint of USA 245 and the nearer Russian craft, using 15% hysteresis to avoid frequent pair switching; without USA 245, it uses the A/C midpoint. Candidate viewing directions are scored for an unobstructed line of sight to the primary craft and continuity with the preceding view. Camera position moves on the sphere, and its up vector follows the selected craft's actual orbital plane so along-track motion appears mainly horizontal. The globe rotates by Greenwich sidereal time; spacecraft trajectories are unchanged. A short smoothing time keeps camera changes deliberate during playback. All distances shown by the scene are model geometry, not measured miss distances.

## Episode copy supplied for review

**Title:** Russia's *Kosmos 2542* and *Kosmos 2543* approaching U.S. reconnaissance satellite

**Description:** After launching *Kosmos 2542* in November 2019, Russia deployed a smaller satellite, *Kosmos 2543*, from it. The Russian spacecraft subsequently conducted proximity operations near *USA 245*, an American reconnaissance satellite, prompting public concern from U.S. officials in February 2020. Russia described the spacecraft as part of an inspection mission. Publicly reconstructed orbital data provide an opportunity to examine these encounters, although sparse observations of *USA 245* complicate precise assessments of separation and relative motion.

## Identity and source provenance

The published Episodes sheet and bundled episode metadata agree: **A = Kosmos 2542 (2019-079A, 44797, gold); B = USA 245 (2013-043A, 39232, light gray); C = Kosmos 2543 (2019-079D, 44835, dark gray).** This order must not be inferred from the title.

The original project library is built by [`build_tle_library.py`](https://github.com/willamadsen/How-Close-Is-Too-Close/blob/main/Code/build_tle_library.py) from source-labeled raw TLEs. Its public-subset builder retains Space-Track records only in specified event windows and retains the amateur SeeSat-L records. The full raw source directory is not present in the current workspace. The source field in the published JSON gives provenance at the source-category level; it does not identify a unique original download URL for each element. The original retrieval dates are unknown. The three source files' SHA-256 checksums and URLs are recorded in the manifest. Space-Track's [current documentation](https://www.space-track.org/documentation) states blanket approval to redistribute basic SSA data, including TLE/OMM, with appropriate citation; observer-specific SeeSat-L reuse terms remain unverified.

| Craft | Local source / count | Relevant epochs | Important gaps |
|---|---|---|---|
| A, 44797 | Space-Track subset; 55 | Dec 6, 2019 17:03 to Jan 30, 2020 11:18 UTC | Dec 16–31: 14.75 days; Jan 5–20: 14.55 days; none in February |
| B, 39232 | SeeSat-L amateur; 6 total, 3 in episode | Dec 7 09:43, Dec 8 10:03, Dec 31 09:35 UTC | Dec 8–31: 22.98 days; Dec 31, 2019–Aug 30, 2021: 608.44 days; none in Jan/Feb 2020 |
| C, 44835 | Space-Track subset; 55 | Dec 6, 2019 13:49 to Jan 30, 2020 11:38 UTC | Dec 16–31: 14.83 days; Jan 5–20: 14.56 days; none in February |

All epochs are element-set epochs, **not observation timestamps** and not proof of continuous coverage. The display gate is 36 hours from an epoch; the stricter numeric-pair gate is 12 hours for each craft. Neither is an uncertainty bound. A maneuver between an epoch and view time can invalidate even a short propagation. A distance computed from two TLEs is a model estimate, not a measured miss distance. The explorer withholds the apparent kilometer-scale A–C result near deployment, when public TLE errors and deployment dynamics could dominate it.

## Historical reading

- The [2024 GMV AMOS paper, section 2.1.4](https://amostech.com/TechnicalPapers/2024/Poster/Serrano.pdf) dates the Kosmos 2542 launch to November 25, 2019 and Kosmos 2543 release to December 6. It reports a 46 km minimum for early 2542–USA 245 passes, around 37.1 km for the first 2543 phase, 15–25 km for a later 2543 phase, and 150–300 km for 2542's January 22–February 1 pseudo-constant-proximity phase. These are **the authors' reconstructed findings**, not independently reproduced values here. The paper expressly notes limited USA 245 TLE availability. Its assertions about mission intent are analytical interpretation, not directly observed intent.
- [Nico Janssen's January 29, 2020 SeeSat-L message](https://www.satobs.org/seesat/Jan-2020/0198.html) describes 2542's raised orbit, USA 245's changed orbit, and near-aligned planes; it quotes an earlier December 31 amateur USA 245 element. [Michael Thompson's January 29 analysis](https://www.satobs.org/seesat/Jan-2020/0203.html) describes a 150–500 km trailing geometry after January 21–24 maneuvers. These are contemporary observer analyses, not official measurements. The original posts contain orbital parameters but no usable January USA 245 TLE in the local library.
- The linked episode records preserve [Raymond's February 10 interview](https://time.com/5779315/russian-spacecraft-spy-satellite-space-force/) as a U.S. official expression of concern, and a [Russian Foreign Ministry position published February 18](https://vpk.name/news/376303_v_mid_otvetili_na_obvineniya_ssha_v_presledovanii_amerikanskogo_sputnika.html) saying its spacecraft did not threaten the U.S. object. These are official positions, not orbital measurements.
- [U.S. Space Command's July 23 statement](https://www.spacecom.mil/Newsroom/News/Article-Display/Article/2285098/russia-conducts-space-based-anti-satellite-weapons-test/) says Kosmos 2543 released another object July 15 and links the system to the earlier U.S. satellite encounter. This is later context, outside the sheet's December–February E-002 scope; the prototype does not model July.

## Candidate camera moments

The date is a view anchor, not an event time unless independently described as such. Distances below are coarse instantaneous SGP4 values from the local files when the 12-hour metric gate passes. The fact that a pair is within the gate does not make a close-approach minimum or a maneuver inference reliable.

| View (UTC) | Coverage | Geometry and interest | Caution / suggested framing |
|---|---|---|---|
| Dec 7 09:45 | B 0h, A just over 12h, C 9h from elements | Shortly after reported deployment; C–B around 4,200 km in this frame | A–B is withheld by the 12-hour gate, and the apparent A–C kilometer-scale separation is unreliable. Camera centered on B, widen to include A/C. |
| Dec 8 10:05 | B nearly 0h, A/C nearby | Second B observer epoch; A–B and C–B around 2,100 km | Observer epochs do not establish a continuous track. Frame all three, with A/C labels separated visually. |
| Dec 9 04:25 | B about 18h old, A/C nearby | Exploratory model convergence; A–C around 80 km from nearby Russian elements | Numeric B-pair statistics withheld: this is not a verified close approach to USA 245. Tighten only after new B elements are found. |
| Dec 31 18:00 | B about 8h, A about 1h, C 0h | Best late-December three-object epoch alignment; A–B about 4,300 km | Suggested local starting view. Frame Earth and all three; this is a coverage choice, not the smallest modeled separation. |
| Jan 1 00:00 | B about 14h old, A/C nearby | Tests how the trio's relative geometry changes after the Dec 31 B fit | B-pair statistics withheld by the 12-hour metric gate. Keep a broad Earth view. |
| Jan 24 12:00 | A and C within about 2h; B unavailable | Russian spacecraft during the reported 2542 maneuver phase; A–C about 12,400 km | Do not draw USA 245 or B-pair statistics. Use A as reference; the January U.S. position requires new dated elements. |

The paper's January 22–February 1 2542 pseudo-constant-proximity phase and later 2543 close passes are historically compelling but **cannot yet be rendered as a three-spacecraft reconstruction** using this local B series. A reported distance in a paper must not be copied into our modeled statistics or substituted for a missing B position.

## Statistics and presentation recommendation

For a public three-craft version, render all three objects, but show one **explicitly selected pair** in the separation, relative-speed, and dwell panel. Offer A–B and C–B as named tabs (A–C as an optional comparison), with no silent automatic switch. Make the selected pair visible in the chart title, threshold labels, and legend. Default to a historically relevant pair only after the episode interval is chosen and coverage reviewed. Gate each statistic by both TLE ages and known maneuver boundaries. If B is unavailable, show “data unavailable” rather than a number or continuous line.

An unobtrusive status line can show each craft's element source, epoch, and age, plus an “unavailable” state. The local explorer demonstrates this. Do not draw numerical uncertainty bands until a defensible estimation method and inputs exist. Do not fold the July object release into the December–February modeled episode by default.

## GMV source audit and model comparison

The [2024 GMV paper](https://amostech.com/TechnicalPapers/2024/Poster/Serrano.pdf) acknowledges U.S. Strategic Command/Space-Track for orbit data, but does not print the exact USA 245 TLE lines, their epochs, a download date, or a machine-readable supplement. The [AMOS paper listing](https://amostech.space/year/2024/monitoring-of-rendezvous-proximity-operations-with-sst-and-sda-techniques-combination/) likewise links the paper without a data supplement. Therefore, the paper's element inputs cannot presently be reproduced or compared element by element. Its reported 46 km, 37.1 km, 15–25 km, and 150–300 km values should be labeled as **GMV's findings** when cited, never silently imported as local calculations.

The local B library has only the December 7, December 8, and December 31 element epochs during this historical episode, and no January or February 2020 B set. The early December and December 31 frames can show model geometry at selected times; none of those selected times is established as the GMV minimum. The 12-hour numeric gate rejects December 9 and January 1 B-pair statistics. The January 24 frame deliberately shows A/C only. The local reconstruction cannot test the paper's January/February B-pair claims or its claimed minima. GMV's pair-specific relative-motion figures and phase annotations are useful design references for a future pair selector and maneuver-aware timeline, provided their published values remain source-attributed overlays rather than recomputed statistics.

## Scope and sheet recommendations

Keep the historical episode span broad, **December 2019 through February 2020**, to cover the reported operations and February public concern. That is a historical scope, not a claim that orbital elements cover the full period. For a data-backed three-craft visualization, start with separate exploratory windows around December 7–8 and December 31–January 1; within them, show the epoch ages and suppress numeric B-pair results when either element exceeds 12 hours. January 20–30 can support an A/C-only reconstruction, explicitly marked as lacking B. Do not draw a continuous B track between the windows or through February. Revisit these windows if new dated B elements and their terms are verified. No sheet dates were edited.

For the Descriptions tab, reserve four **new** rows (assuming the current last ID remains D-137):

| ID | Episode | Source URL | Description type |
|---|---|---|---|
| D-138 | E-030 · Luch / Intelsat 33e | https://amostech.com/TechnicalPapers/2024/Poster/Serrano.pdf | T05 — Academic / research analysis |
| D-139 | E-005 · USA 270 / Shiyan 12 | https://amostech.com/TechnicalPapers/2024/Poster/Serrano.pdf | T05 — Academic / research analysis |
| D-140 | E-044 · Kosmos 2558 / USA 326 | https://amostech.com/TechnicalPapers/2024/Poster/Serrano.pdf | T05 — Academic / research analysis |
| D-141 | E-002 · Kosmos 2542 / 2543 / USA 245 | https://amostech.com/TechnicalPapers/2024/Poster/Serrano.pdf | T05 — Academic / research analysis |

D-041 already cites the PDF but has no Episode link, so do not reuse its ID. Review IDs against the live sheet before insertion. No Description rows were edited.
