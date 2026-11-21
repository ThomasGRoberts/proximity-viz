"""Fetch dated Space-Track history for the current published chapter windows.

Run with --dry-run to inspect Sheet-derived queries without Space-Track credentials.
Existing verified TLEs are merged when fetching, and credentials are never saved.
"""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sheet_history import main


if __name__ == "__main__":
    main('e005', ('2016-052A', '2021-129A', '2021-129B'), (41744, 50321, 50322), Path(__file__).resolve().parent)
