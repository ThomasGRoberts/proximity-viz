"""Refresh the paired GSSAP satellite's Space-Track elements for sheet chapters.

Requires the ``spacetrack`` package and SPACETRACK_USERNAME/PASSWORD in the
environment. E-009 is local-only and is skipped unless --include-local is set.
The script never prints or stores credentials. Existing files are kept unless
--replace is supplied.
"""

import argparse
import csv
from datetime import datetime, timedelta, timezone
import hashlib
import io
import json
import os
from pathlib import Path
import re
import urllib.request

from spacetrack import SpaceTrackClient
import spacetrack.operators as op


ROOT = Path(__file__).resolve().parents[2]
SHEET = "https://docs.google.com/spreadsheets/d/1IEQ3tmerXXxEty8BcZeaonWhQbHUfA2Z5b44IuCsQ8I/export?format=csv&gid=860337817"
PAIRS = {
    "E-003": {"objects": ("2016-052B", "2019-097A"), "asset": "e003", "partner": 41744},
    "E-004": {"objects": ("2016-052A", "2021-129A"), "asset": "e005", "partner": 41745},
    "E-009": {"objects": ("2016-052A", "2025-131A"), "asset": "e009", "partner": 41745},
}


def chapter_windows():
    with urllib.request.urlopen(SHEET, timeout=30) as source:
        rows = list(csv.reader(io.StringIO(source.read().decode("utf-8-sig"))))
    top, sub = rows[:2]
    result = {}
    for row in rows[2:]:
        eid = row[top.index("Episode ID")].strip()
        if eid not in PAIRS:
            continue
        objects = tuple(row[next(i for i, item in enumerate(sub) if item.startswith(f"Object {slot}"))].strip() for slot in "AB")
        if objects != PAIRS[eid]["objects"]:
            raise ValueError(f"{eid} spacecraft changed in the published sheet")
        windows = []
        for number in range(1, 5):
            if f"Chapter {number}" not in top:
                continue
            first = top.index(f"Chapter {number}")
            center, width = row[first:first + 2]
            match = re.fullmatch(r"(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?", center.strip())
            if not match or not width.strip():
                continue
            middle = datetime.fromisoformat(f"{match[1]}T{int(match[2]):02d}:{int(match[3]):02d}:{int(match[4] or 0):02d}+00:00")
            half = timedelta(hours=float(width) / 2)
            windows.append((middle - half, middle + half))
        if windows:
            result[eid] = (min(start for start, _ in windows), max(end for _, end in windows))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--include-local", action="store_true", help="also fetch the unpublished E-009 draft")
    parser.add_argument("--replace", action="store_true", help="replace existing partner history")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    windows = chapter_windows()
    selected = [eid for eid in PAIRS if (eid != "E-009" or args.include_local) and eid in windows]
    if not args.dry_run and (not os.getenv("SPACETRACK_USERNAME") or not os.getenv("SPACETRACK_PASSWORD")):
        raise SystemExit("Space-Track environment credentials are required")
    client = None if args.dry_run else SpaceTrackClient(identity=os.environ["SPACETRACK_USERNAME"], password=os.environ["SPACETRACK_PASSWORD"])
    try:
        for eid in selected:
            config = PAIRS[eid]
            start, end = windows[eid]
            # These classified spacecraft can have sparse public elements. Keep
            # two weeks on either side so the nearest element is not excluded.
            first, last = (start - timedelta(days=14)).date(), (end + timedelta(days=15)).date()
            path = ROOT / "dev" / config["asset"] / "data" / f'{config["partner"]}.json'
            print(f"{eid}: NORAD {config['partner']}, {first} through {last}")
            if args.dry_run or (path.exists() and not args.replace):
                continue
            response = client.gp_history(norad_cat_id=config["partner"], epoch=op.inclusive_range(first, last), orderby="EPOCH", format="json")
            rows = json.loads(response) if isinstance(response, str) else response
            if not isinstance(rows, list) or not rows:
                raise RuntimeError(f"No partner elements returned for {eid}")
            tles = []
            for item in rows:
                if str(item.get("NORAD_CAT_ID")) != str(config["partner"]):
                    raise RuntimeError(f"Unexpected catalog number in {eid} response")
                epoch = datetime.fromisoformat(item["EPOCH"].replace("Z", "+00:00")).replace(tzinfo=timezone.utc)
                tles.append({"epoch": epoch.isoformat().replace("+00:00", "Z"), "line1": item["TLE_LINE1"], "line2": item["TLE_LINE2"], "source": "space-track"})
            payload = json.dumps({"norad": str(config["partner"]), "tles": tles}, separators=(",", ":")).encode() + b"\n"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(payload)
            manifest_path = path.parent / "provenance.json"
            manifest = json.loads(manifest_path.read_text())
            manifest["datasets"] = [entry for entry in manifest["datasets"] if entry["object"]["norad"] != str(config["partner"])]
            manifest["datasets"].append({"object": {"norad": str(config["partner"])}, "url": f"data/{path.name}", "sha256": hashlib.sha256(payload).hexdigest(), "count": len(tles), "firstEpoch": tles[0]["epoch"], "lastEpoch": tles[-1]["epoch"], "purpose": "GSSAP partner audit", "retrievedUtc": datetime.now(timezone.utc).isoformat()})
            manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
            print(f"  saved {len(tles)} elements")
    finally:
        if client:
            client.close()


if __name__ == "__main__":
    main()
