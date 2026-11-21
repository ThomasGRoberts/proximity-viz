# Chapter timing and historical elements

All eight public episode views and the Dynamic Library read chapter centers and
widths from the published **Episodes** tab when they load. The browser then
propagates the historical TLEs already bundled with the site. Because GitHub
Pages is static and Space-Track requires credentials, editing the Sheet changes
the playback windows immediately but cannot download new TLE history by itself.

The six Space-Track history scripts under `visualization/dev/` now use
`sheet_history.py` to find their row by COSPAR IDs, read all configured chapters,
and query a padded interval around each chapter. They merge new elements with
the existing checksum-verified files and update the provenance manifest.
Run, for example, from the repository root:

```sh
python3 visualization/dev/e008/fetch_history.py --dry-run
python3 visualization/dev/e008/fetch_history.py
```

The first command needs no credentials and reports the current Sheet windows
and nearest stored TLE ages. The second needs `SPACETRACK_USERNAME` and
`SPACETRACK_PASSWORD` in the environment. Publish the resulting data files and
manifest together. The directory names are internal asset keys; the scripts
print the current public episode IDs from the Sheet.

On November 21, 2026, the public E-006 history was refreshed for its June 2018
and September 2022 chapters. Before the refresh, the nearest bundled TLEs at
those centers were about 103 and 155 days old. Afterward, both spacecraft have
TLEs within a few hours of each center. The three E-002 chapters are now parsed
even when the Sheet supplies single-digit minute or second fields.

E-002's January 23, 2020 chapter still has no nearby public USA 245 element.
The saved observer elements around that period end on December 31, 2019, and an
authenticated Space-Track GP_HISTORY query for January 1–February 10, 2020
returned no USA 245 rows. Its target position is therefore unavailable under
the current display-age rule; the Sheet chapter itself is loaded correctly.
