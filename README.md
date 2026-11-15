# Episodes of Concern and Proximity-Viz

Static publication of two Engineering Space Policy Laboratory interfaces:

- `dynamic-table/` browses the public Episodes of Concern records.
- `visualization/` presents the E-001 Luch (Olymp-K) and Athena-Fidus historical orbital reconstruction.

Open `index.html` for navigation. All application paths are relative, so the site works at `https://thomasgroberts.github.io/proximity-viz/`.

## Local preview

From the directory containing this repository, run `python3 -m http.server 8770` and open `http://127.0.0.1:8770/proximity-viz-site/`. The table and visualization are available at `/proximity-viz-site/dynamic-table/` and `/proximity-viz-site/visualization/`. On GitHub Pages, the folder name is the repository name, `proximity-viz`.

## GitHub Pages

This is a static site with no build step. In repository **Settings → Pages**, select **Deploy from a branch**, branch **main**, folder **/(root)**, then save. The expected addresses are:

- `https://thomasgroberts.github.io/proximity-viz/`
- `https://thomasgroberts.github.io/proximity-viz/dynamic-table/`
- `https://thomasgroberts.github.io/proximity-viz/visualization/`

Wait for the Pages deployment to finish, then open each address and check the E-001 visualization preview and the return link. Do not assume a URL is live until that check succeeds.

## Data and attribution

The Dynamic Table's `data/table.json` is a public-sheet snapshot taken **2026-11-15 01:28 UTC**. It includes 20 episodes selected for publication and the latest E-001 description HTML as served by the published Google Sheet. Changes to the sheet require refreshing this file and redeploying. The original local table server and its refresh utilities remain in the ESPL project workspace; local caches and unpublished research files are excluded from this repository.

`shared/e001-series.json` contains actual E-001 distance and relative-speed samples, selected from the synchronized 15-minute SGP4 calculation in `visualization/Viz/compare.js`. The compact table plots show those samples in gray; other episodes show a pending reconstruction state. The E-001 preview is a direct capture of the running Proximity-Viz scene.

The orbital visualization is adapted from [Willa Madsen's *How Close Is Too Close?*](https://github.com/willamadsen/How-Close-Is-Too-Close). Her historical orbital elements, Three.js scene structure, and scientific implementation are credited here; this repository does not replace or modify her upstream project. The E-001 configuration documents the public TLE sources and the analysis limitations. Satellite positions are reconstructed from dated orbital elements; times without supported data are not interpolated as verified positions. Original third-party notices are retained in `visualization/Viz/vendor/satellite/LICENSE` and `visualization/Viz/assets/flags/LICENSE-flag-icons.txt`.

This repository contains only the two public E-001 TLE histories required for the reconstruction. Its static table snapshot and source thumbnails are public-facing data, with no credentials or local caches.
