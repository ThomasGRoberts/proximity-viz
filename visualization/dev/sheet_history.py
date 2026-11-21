"""Fetch Space-Track GP history around the current Episodes sheet chapters.

The visualization reads chapter timing from the sheet on every page load. This
module gives the offline Space-Track acquisition scripts the same chapter source.
Existing verified elements are merged, so a new chapter never removes older
observations that may still be the nearest available TLE.
"""

import argparse
import csv
from datetime import date, datetime, timedelta, timezone
import hashlib
import io
import json
import math
import os
from pathlib import Path
import re
import tempfile
import time
import urllib.request


EPISODES_CSV = (
    "https://docs.google.com/spreadsheets/d/"
    "1IEQ3tmerXXxEty8BcZeaonWhQbHUfA2Z5b44IuCsQ8I/export?format=csv&gid=860337817"
)
PAD_DAYS = 30
UTC = timezone.utc


def cell(row, column):
    return row[column].strip() if 0 <= column < len(row) else ""


def parse_center(value):
    match = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?Z?", value)
    if not match:
        raise ValueError(f"Invalid chapter center: {value!r}")
    parts = [int(part or 0) for part in match.groups()]
    return datetime(*parts, tzinfo=UTC)


def sheet_chapters(csv_text, objects):
    """Return the live public ID and its configured chapters, matched by COSPAR."""
    rows = [row for row in csv.reader(io.StringIO(csv_text)) if any(value.strip() for value in row)]
    if len(rows) < 3:
        raise ValueError("Episodes sheet has no episode rows")
    top = [value.lstrip("\ufeff").strip() for value in rows[0]]
    sub = [value.strip() for value in rows[1]]
    if "Episode ID" not in top:
        raise ValueError("Episodes sheet has no Episode ID column")

    def subcolumn(prefix):
        return next((index for index, value in enumerate(sub) if value.startswith(prefix)), -1)

    a_column, b_column, c_column = (subcolumn(f"Object {slot}") for slot in "ABC")
    if min(a_column, b_column, c_column) < 0:
        raise ValueError("Episodes sheet object columns could not be verified")
    matches = [row for row in rows[2:] if (cell(row, a_column), cell(row, b_column)) == objects[:2]]
    if len(matches) != 1:
        raise ValueError(f"Expected one Episodes sheet row for {objects[:2]}, found {len(matches)}")
    row = matches[0]
    if cell(row, c_column) != (objects[2] if len(objects) > 2 else ""):
        raise ValueError("Object C in the Episodes sheet differs from this history's spacecraft")
    episode_id = cell(row, top.index("Episode ID"))
    if not re.fullmatch(r"E-\d{3,}", episode_id):
        raise ValueError(f"Invalid published episode ID: {episode_id!r}")

    def chapter_column(number, part):
        explicit = next((i for i, value in enumerate(top) if value.lower().startswith(f"chapter {number} {part.lower()}")), -1)
        if explicit >= 0:
            return explicit
        first = next((i for i, value in enumerate(top) if value == f"Chapter {number}"), -1)
        if first < 0:
            return -1
        pattern = r"^Centerpoint" if part == "Center" else r"^Width"
        return next((i for i in (first, first + 1) if i < len(sub) and re.match(pattern, sub[i], re.I)), -1)

    chapters = []
    for number in range(1, 5):
        center_text = cell(row, chapter_column(number, "Center"))
        width_text = cell(row, chapter_column(number, "Width"))
        if not center_text and not width_text:
            continue
        if not center_text or not width_text:
            raise ValueError(f"{episode_id} chapter {number} has an incomplete center/width pair")
        try:
            center = parse_center(center_text)
            width_hours = float(width_text)
        except ValueError as error:
            raise ValueError(f"{episode_id} chapter {number}: {error}") from error
        if not math.isfinite(width_hours) or not 0 < width_hours <= 24 * 366:
            raise ValueError(f"{episode_id} chapter {number} has invalid width: {width_text!r}")
        chapters.append({"number": number, "center": center, "widthHours": width_hours})
    if not chapters:
        raise ValueError(f"{episode_id} has no valid chapters in the Episodes sheet")
    return episode_id, sorted(chapters, key=lambda chapter: chapter["center"])


def query_windows(chapters, pad_days=PAD_DAYS):
    """Merge whole-day Space-Track queries around each chapter and its padding."""
    windows = []
    for chapter in chapters:
        half = timedelta(hours=chapter["widthHours"] / 2)
        first = (chapter["center"] - half - timedelta(days=pad_days)).date()
        last = (chapter["center"] + half + timedelta(days=pad_days)).date() + timedelta(days=1)
        if windows and first <= windows[-1][1]:
            windows[-1] = (windows[-1][0], max(windows[-1][1], last))
        else:
            windows.append((first, last))
    return windows


def read_verified_history(data_dir, norads):
    manifest_path = data_dir / "provenance.json"
    if not manifest_path.exists():
        if any((data_dir / f"{number}.json").exists() for number in norads):
            raise ValueError("History files exist without a provenance manifest")
        return {}, {str(number): {} for number in norads}
    manifest = json.loads(manifest_path.read_text())
    records = {}
    for number in norads:
        key = str(number)
        entry = next((item for item in manifest.get("datasets", []) if str(item.get("object", {}).get("norad")) == key), None)
        if not entry:
            raise ValueError(f"No verified provenance entry for {key}")
        path = data_dir / f"{key}.json"
        payload = path.read_bytes()
        if hashlib.sha256(payload).hexdigest() != entry["sha256"]:
            raise ValueError(f"Existing history checksum does not match for {key}")
        history = json.loads(payload)
        # The TLE lines carry the precise element epoch. Keying on them also
        # merges earlier files that rounded the GP_HISTORY timestamp to a
        # whole second without conflating distinct elements in that second.
        records[key] = {(item["line1"], item["line2"]): item for item in history["tles"]}
    return manifest, records


def parse_spacetrack_record(row, records):
    key = str(row.get("NORAD_CAT_ID", ""))
    if key not in records:
        return False
    epoch = str(row.get("EPOCH", "")).replace(" ", "T")
    if epoch and not epoch.endswith("Z") and "+" not in epoch:
        epoch += "Z"
    parsed = datetime.fromisoformat(epoch.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError(f"Space-Track returned an epoch without UTC offset for {key}")
    epoch = parsed.astimezone(UTC).isoformat().replace("+00:00", "Z")
    line1, line2 = row.get("TLE_LINE1"), row.get("TLE_LINE2")
    if not line1 or not line2 or not line1.startswith("1 ") or not line2.startswith("2 "):
        raise ValueError(f"Invalid TLE for {key} at {epoch}")
    records[key][(line1, line2)] = {"epoch": epoch, "line1": line1, "line2": line2, "source": "space-track"}
    return True


def write_history(data_dir, asset_slug, norads, records, previous, windows, episode_id, chapters):
    datasets = []
    payloads = {}
    for number in norads:
        key = str(number)
        by_epoch = {}
        for item in records[key].values():
            by_epoch[item["epoch"]] = item  # a newly fetched revision wins at the same epoch
        dated = sorted(by_epoch.values(), key=lambda item: item["epoch"])
        if not dated:
            raise ValueError(f"No Space-Track history for {key}")
        encoded = (json.dumps({"norad": key, "tles": dated}, separators=(",", ":")) + "\n").encode()
        payloads[f"{key}.json"] = encoded
        datasets.append({"object": {"norad": key}, "url": f"data/{key}.json", "sha256": hashlib.sha256(encoded).hexdigest(),
                         "count": len(dated), "firstEpoch": dated[0]["epoch"], "lastEpoch": dated[-1]["epoch"]})
    previous_ranges = previous.get("queryEpochRanges", [])
    if not previous_ranges and previous.get("queryEpochRange"):
        previous_ranges = [previous["queryEpochRange"]]
    requested_ranges = [[str(first), str(last)] for first, last in windows]
    all_ranges = []
    for pair in previous_ranges + requested_ranges:
        if pair not in all_ranges:
            all_ranges.append(pair)
    manifest = {"schema": f"espl-{asset_slug}-dated-elements-v1", "source": "Space-Track GP_HISTORY",
                "retrievedUtc": datetime.now(UTC).isoformat(), "queryEpochRanges": all_ranges,
                "chapterSource": {"sheet": EPISODES_CSV, "episodeId": episode_id, "padDays": PAD_DAYS,
                                  "chapters": [{"number": chapter["number"], "center": chapter["center"].isoformat().replace("+00:00", "Z"),
                                                "widthHours": chapter["widthHours"]} for chapter in chapters]},
                "datasets": datasets}
    payloads["provenance.json"] = (json.dumps(manifest, indent=2) + "\n").encode()
    data_dir.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="history-stage-", dir=data_dir) as temporary:
        staged = Path(temporary)
        for name, encoded in payloads.items():
            (staged / name).write_bytes(encoded)
        for name in payloads:
            os.replace(staged / name, data_dir / name)
    return datasets


def main(asset_slug, objects, norads, here):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Print sheet chapters and query windows without Space-Track login")
    args = parser.parse_args()
    request = urllib.request.Request(f"{EPISODES_CSV}&_={time.time_ns()}", headers={"Cache-Control": "no-cache"})
    with urllib.request.urlopen(request, timeout=60) as response:
        episode_id, chapters = sheet_chapters(response.read().decode("utf-8-sig"), objects)
    windows = query_windows(chapters)
    print(f"{episode_id} from the published Episodes tab:")
    for chapter in chapters:
        print(f"  Chapter {chapter['number']}: {chapter['center']:%Y-%m-%d %H:%M:%S} UTC, {chapter['widthHours']:g} h")
    print("  Space-Track windows: " + "; ".join(f"{first} to {last}" for first, last in windows))
    if args.dry_run:
        _, existing = read_verified_history(here / "data", norads)
        for chapter in chapters:
            ages = []
            for number in norads:
                epochs = (datetime.fromisoformat(item["epoch"].replace("Z", "+00:00"))
                          for item in existing[str(number)].values())
                nearest = min((abs((epoch - chapter["center"]).total_seconds()) / 3600 for epoch in epochs), default=None)
                ages.append(f"{number}: {nearest:.1f} h" if nearest is not None else f"{number}: no stored TLE")
            print(f"  Chapter {chapter['number']} nearest stored TLE: " + ", ".join(ages))
        return

    identity = os.environ.get("SPACETRACK_USERNAME")
    password = os.environ.get("SPACETRACK_PASSWORD")
    if not identity or not password:
        raise SystemExit("Space-Track environment credentials are required")
    from spacetrack import SpaceTrackClient
    import spacetrack.operators as op

    data_dir = here / "data"
    previous, records = read_verified_history(data_dir, norads)
    new_count = 0
    with SpaceTrackClient(identity=identity, password=password) as client:
        for first, last in windows:
            result = client.gp_history(norad_cat_id=list(norads), epoch=op.inclusive_range(first, last),
                                       orderby="NORAD_CAT_ID,EPOCH", format="json")
            rows = json.loads(result) if isinstance(result, str) else result
            if not isinstance(rows, list):
                raise ValueError("Space-Track returned no GP_HISTORY record list")
            for row in rows:
                new_count += parse_spacetrack_record(row, records)
    if not new_count:
        raise ValueError("Space-Track returned no matching TLEs; existing files were not changed")
    datasets = write_history(data_dir, asset_slug, norads, records, previous, windows, episode_id, chapters)
    print("  Verified history: " + ", ".join(f"{item['object']['norad']}: {item['count']} TLEs" for item in datasets))
