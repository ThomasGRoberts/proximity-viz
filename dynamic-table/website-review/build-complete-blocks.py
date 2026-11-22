"""Build complete WordPress paste files from the latest local page sources."""

from pathlib import Path
import re


HERE = Path(__file__).resolve().parent
ESPL = HERE.parents[4]
BLOCKS = ESPL / "Web Content/WordPress Code Blocks"
SOURCES = {
    "proximity": BLOCKS / "Project Pages/Proximity/proximity-RESEARCH-AREA-PARITY-COMPLETE-PASTE.html",
    "sbi": BLOCKS / "Project Pages/SBI/sbi-COLLABORATORS-MODEL-NAV-V4-COMPLETE-PASTE.html",
    "research": BLOCKS / "Publication-Page-Size-Update/research-COMPLETE-CODE-EDITOR.html",
    "people": BLOCKS / "People/people-WORDPRESS-SAFE-V13-COMPLETE-PASTE.html",
}


for page, source in SOURCES.items():
    suffix_name = f"{page}-project-embed-snippet.html" if page in {"sbi", "proximity"} else f"{page}-page-embed-snippet.html"
    suffix = (HERE / suffix_name).read_text(encoding="utf-8")
    suffix = re.sub(r"^<!--.*?-->\s*", "", suffix, count=1, flags=re.S)
    complete = source.read_text(encoding="utf-8").rstrip() + "\n" + suffix.strip() + "\n"
    if page == "research":
        complete = "\n".join(line.rstrip() for line in complete.splitlines()) + "\n"
    output = HERE / f"{page}-complete-block.html"
    output.write_text(complete, encoding="utf-8")
    print(f"{page}: {output.name} ({len(complete):,} characters)")
