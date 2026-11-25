# Local chapter analysis

This review tool adapts [Pradosh's chapter selector](https://github.com/psxd/temp-hcitc)
at commit `e2c95ac519b0734003123e6a3955fb5e4d0deac1`. Its SGP4 plot,
time-window slider, TLE-age display, and chapter export are preserved. The
episode picker is replaced by searchable Object A and Object B fields. A pair
without overlapping TLE history is labeled infeasible before analysis.

Run `python3 visualization/dev/chapter-analysis/install_archive.py` once to
install its historical TLE data. Start the local review server and open
`http://127.0.0.1:8769/visualization/dev/chapter-analysis/`.

The historical archive is intentionally local and is not a live Space-Track
feed. Its dates and object coverage should be checked before making a new
episode.
