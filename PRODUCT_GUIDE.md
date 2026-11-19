# Episodes of Concern: product guide

*Engineering Space Policy Laboratory · Current implementation reviewed November 19, 2026*

This repository contains a connected set of public interfaces for examining reported satellite proximity episodes, plus local tools for designing and reviewing them. The **Dynamic Library** is the entry point. Each published episode has an expanded library row with records and a small animated orbital scene, and a link to its **full visualization**. A separate **local review environment** adds spot comments and camera controls without showing those controls to public readers.

The episode roster and record categories below describe the live Google Sheet when this guide was written. The website fetches the sheet again on each page load, so the roster can change without this file changing.

## Open the products

| Product | Public address | Purpose |
| --- | --- | --- |
| Dynamic Library | [Open the library](https://thomasgroberts.github.io/proximity-viz/dynamic-table/) | Browse, search, sort, and expand episodes. |
| E-001 full visualization | [Open E-001](https://thomasgroberts.github.io/proximity-viz/visualization/e001/) | Luch and Athena-Fidus reconstruction. |
| E-002 full visualization | [Open E-002](https://thomasgroberts.github.io/proximity-viz/visualization/e002/) | Cosmos 2542 and 2543 near USA 245. |
| E-003 through E-008 | [Open the shared viewer](https://thomasgroberts.github.io/proximity-viz/visualization/Viz/compare.html?episode=E-003) | Change the public `episode=` parameter, or enter through the library. |
| Local design review | `http://127.0.0.1:8769/dynamic-table/` | Library mini-scene editing and the shared review ribbon; requires the local server below. |

The root [landing page](index.html) and [visualization redirect](visualization/index.html) are simple gateways. The library is the most complete index of current episodes.

## Current episode roster

Public episode IDs come from the order of rows in the **Episodes** tab. They are the IDs readers should see. The older asset names in code are implementation keys, not alternative public identifiers.

| Public ID | Orbit | Scenario | Chapters in current sheet |
| --- | --- | --- | ---: |
| E-001 | GEO | Russia's Luch near Athena-Fidus | 2 |
| E-002 | LEO | Cosmos 2542 and 2543 near USA 245 | 0; see the chapter exception below |
| E-003 | GEO | USA 271 near China's SJ-20 | 3 |
| E-004 | GEO | USA 270 near Shiyan 12 01 and 02 | 2 |
| E-005 | GEO | Luch near Intelsat 7 and Intelsat 901 | 3 |
| E-006 | GEO | SJ-17 and Skynet 5A | 4 |
| E-007 | GEO | Luch and Intelsat 36 | 2 |
| E-008 | LEO | Cosmos 2612 and ICEYE-X36 | 1 |

These are short scenario labels; the exact titles and descriptions are maintained in the sheet. In three-object episodes, Object C may be another chaser (E-002) or another target (E-004 and E-005). Selecting one comparison pair changes its emphasis, while the full scene can still show the third object.

## What a reader can do

**In the Dynamic Library:** Readers can search episodes, sort the period, distance, velocity, or record columns, inspect spacecraft identity details, and expand a row. The expanded row combines the episode description, an animated mini scene, and linked source cards. A link opens the full visualization. The mini scene uses a saved loop and camera framing; it is a preview, not a substitute for the full playback controls.

**In a full visualization:** Readers can move among chapters, play or scrub time, change playback speed, inspect the spacecraft disclosures and selected orbital elements, and use ECI or relative-motion views. Three-object panels let readers choose which object to compare with the reference object. The charts draw the reconstructed separation distance and relative velocity through the active chapter. Minimum-value dates are links that move playback to their underlying timestamp. Threshold controls support illustrative dwell-time calculations; gray chart intervals indicate one threshold, and gold intervals indicate both. Subtle **‹ Previous** and **Next ›** links move through the current sheet order and wrap at the ends.

**Camera behavior:** ECI views show motion in an Earth-centered inertial frame. Relative views use a moving reference frame and a reference orbit to make the pair's relative motion legible. Saved author camera views guide automatic framing through chapters; the globe can also be rotated and zoomed manually. Chapter jumps are discontinuities in time, even though the playback controls present them as one episode.

## Editorial backend and what updates on refresh

The browser reads the [Episodes of Concern Library sheet](https://docs.google.com/spreadsheets/d/1IEQ3tmerXXxEty8BcZeaonWhQbHUfA2Z5b44IuCsQ8I/edit) through the published CSV exports for its **Episodes** and **Records** tabs. [The feed parser](shared/episode-feed.js) requests them with browser caching disabled. A page already open does not poll for edits; reload it to fetch the current values.

| Backend | What it controls | Where it appears |
| --- | --- | --- |
| Episodes tab | Public ID, exact title, orbit label, description, Objects A/B/C and C's role, up to four chapter centers and widths, tagged Record IDs | Library and full visualizations |
| Records tab | Record URL, related episodes, category, optional override title/date/source name | Library source cards |
| [Bundled support data](dynamic-table/data/table.json) | Reviewed source metadata, preview images, and other presentation support | Library cards; it does **not** replace the live editorial rows |
| [Space-Track SATCAT extract](dynamic-table/data/space-track-satcat.json) | Satellite identity and launch metadata | Object labels and disclosures; this committed extract needs a code/data update to change |
| Historical TLE files and provenance manifests | Orbital reconstruction | Full scenes, mini scenes, and calculated metrics |

The current Records tab contains **21 records**. Its categories are Official reaction, Operator reaction, Parliamentary record, Research analysis, News reporting, and Commentary. A record may link to multiple episodes. The three override fields take precedence over bundled title, publication date, and source-name metadata on a library card. Card thumbnails and orbital histories are stored assets, so changing a sheet URL does not automatically create a new thumbnail or a new orbital reconstruction.

The code resolves orbital assets from the Objects A and B COSPAR IDs, independently of the sheet's current public ID. This lets public IDs change when rows are reordered, while preserving the correct orbital files. The temporary **Legacy ID** column is not used for public routing. Adding an entirely new pair to the sheet still requires an asset mapping and an episode reconstruction in code.

**E-002 chapter exception:** At the time of review, E-002 has no chapter centers or widths in the live Episodes tab. Its full and mini visualizations therefore use two reviewed fallback windows centered on December 9 and December 30, 2019, defined in [the E-002 panel controller](visualization/dev/e002-control-panel-preview/app.js) and [mini controller](visualization/dev/e002-control-panel-preview/table-mini.js). Once valid chapter cells are entered, those controllers use the sheet chapters on reload. Until then, the library cannot derive E-002's period from the sheet.

## How the reconstruction works

The scenes propagate dated two-line element sets (TLEs) with SGP4. For a sampled time, the software normally chooses the nearest available TLE for each spacecraft, propagates it to that time, and compares the resulting position and velocity vectors. **Separation distance** is the magnitude of the difference between positions. **Relative velocity** is the magnitude of the difference between inertial velocity vectors; it is not simply the rate at which the distance displayed on screen changes. The moving relative camera changes how motion is viewed, not that metric's definition.

The Dynamic Library computes E-001 metrics from [the public E-001 histories](visualization/Viz/data/tles_public/) and computes E-003 through E-008 chapter minima from the checked-in Space-Track histories. E-002's library minima use [a bundled metrics file](dynamic-table/data/e002-metrics.json). Full viewers calculate charts within their active chapters. Where age limits or missing elements prevent a supported value, the interface can show gaps or an unavailable value. E-002's ECI display holds an element choice at each chapter anchor to keep its *visual trail* continuous; its proximity calculations still use the nearest-TLE method.

These reconstructions are illustrative. TLEs are estimates from observations, and sparse or old elements can make exact separation and velocity claims unreliable, especially for USA 245. A close approach in the visualization is not a measured collision probability, and the project's threshold controls are reader-selected illustrations rather than a universal safety standard. Historical source records and orbit-derived results should be read together.

## Loading and publication

The library waits for its current editorial rows and core satellite catalog, then paints the table before starting its heavier WebGL mini scenes and supplemental metric requests. It warms three reusable mini scenes in the background and prefetches episode scripts and hash-versioned orbital files during browser idle time. This reduces later waits when the browser honors the prefetch hints; a first visit, a slow network, or a large scene can still show the centered loading motif. The full viewers also fetch the Episodes tab when they load.

This is a static GitHub Pages site deployed from the repository's `main` branch. There is no application build step or production server. The [shared episode entry point](visualization/Viz/episode-entry.js) chooses a viewer by the current sheet row's orbital asset mapping. [The Dynamic Library controller](dynamic-table/app.js) assembles rows, records, metrics, and mini scenes. [Shared loading styles](shared/episode-loading.css), [panel styles](shared/episode-panel.css), and [navigation](shared/episode-navigation.js) keep common treatments aligned.

Orbital data for E-002 and the later generic viewers have SHA-256 provenance checks. The E-001 public histories and Willa Madsen's original visualization structure are documented in [the repository README](README.md) and [provenance audit](shared/TLE-PROVENANCE-AUDIT.md). Third-party notices remain under `visualization/Viz/vendor/` and `visualization/Viz/assets/flags/`.

## Local design review workflow

Run this from the repository root:

```sh
python3 visualization/dev/e002-control-panel-preview/server.py
```

Then open `http://127.0.0.1:8769/dynamic-table/`. The top ribbon links the library and all full-episode reviews. For a direct episode route, use `http://127.0.0.1:8769/visualization/Viz/compare.html?dev=1&episode=E-003` with the desired **public** episode ID; E-001 and E-002 have their own review pages under `visualization/dev/`.

The review server adds a shared pool of location-specific comments, including an option to mark a full-viz comment as applying to all episodes. It also serves camera workshops and saved camera views. On the library, **Adjust mini scene** lets the reviewer set a chapter, loop, speed, view mode, and camera; **Save preview loop & camera** writes the local settings. Comments and camera views are saved to files by the local server, so a separate download/export is not necessary when work continues in the same workspace. Exports remain useful for sharing or backup.

Key review files are [the active shared comments](visualization/dev/review-comments.json), per-episode `saved-camera-views.json` files under `visualization/dev/`, [local mini settings](visualization/dev/e002-control-panel-preview/table-preview.json), and [published mini settings](dynamic-table/data/mini-preview-settings.json). Completed comment rounds are archived with resolution notes. The review ribbon and editing controls are enabled only on the localhost review route; the committed static assets and review source files are still part of the repository.

## Maintaining the set

1. Edit titles, descriptions, object IDs, chapter centers/widths, and Record links in the sheet; reload the library and affected full viewer.
2. For a new spacecraft pair, add its asset mapping, verified orbital histories, episode controller or configuration, and any needed satellite catalog records. A sheet row alone cannot generate its 3D scene.
3. Review the full visualization first: check source coverage, chapter choices, charts, selected pair behavior, and camera framing. Use spot comments and the camera workshop to save exact moments and views.
4. Review and save the library mini loop and camera, then copy approved mini settings into the published settings file.
5. Verify the public-facing page without the review ribbon, commit the assets, and push `main`. Check GitHub Pages after its deployment finishes.

The most useful entry points for future work are [the sheet parser](shared/episode-feed.js), [the library controller](dynamic-table/app.js), [the full-view dispatcher](visualization/Viz/episode-entry.js), [the local review server](visualization/dev/e002-control-panel-preview/server.py), and [the review history](visualization/dev/review-comments-2026-11-19-resolution.md).
