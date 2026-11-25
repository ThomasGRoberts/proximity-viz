"""Install the student tool's TLE archive for the local chapter review pane.

The archive is kept out of the public site repository. The source commit is
fixed so the local analysis remains reproducible between reviews.
"""

from __future__ import annotations

import gzip
import re
from pathlib import Path
from urllib.request import urlopen

SOURCE = (
    "https://raw.githubusercontent.com/psxd/temp-hcitc/"
    "e2c95ac519b0734003123e6a3955fb5e4d0deac1/index.html"
)
DESTINATION = Path(__file__).with_name("tle-data.json.gz")


def main() -> None:
    with urlopen(SOURCE, timeout=90) as response:
        page = response.read()
    match = re.search(
        rb'<script id="tle-data" type="application/json">(.*?)</script>',
        page,
        re.DOTALL,
    )
    if not match:
        raise RuntimeError("The source page has no embedded TLE archive")
    DESTINATION.write_bytes(gzip.compress(match.group(1), compresslevel=9))
    print(f"Installed {DESTINATION}")


if __name__ == "__main__":
    main()
