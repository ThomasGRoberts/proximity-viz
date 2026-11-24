"""Local review server for the website page that embeds the Dynamic Table."""

from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import re
from pathlib import Path
import tempfile
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from uuid import uuid4


HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
PEOPLE_BLOCK = REPO.parents[2] / "Web Content/WordPress Code Blocks/People/people-WORDPRESS-SAFE-V13-COMPLETE-PASTE.html"
COMMENTS = HERE / "comments.json"
PORT = 8771
SPOTS = {"page", "intro", "repository", "title", "language", "contributors", "portraits", "table", "full-link", "about-link", "repo-meta", "project-page", "project-banner", "research-updates", "special-model", "special-data", "hero-table-link", "research-page", "publication-table", "people-page", "student-biocards", "student-research-updates", "area-page"}
SURFACES = {"Website Page", "SBI Project", "Proximity Project", "Research", "People", "Lunar Project", "Home", "Opportunities", "News", "Space Security Area", "Space Sustainability Area", "Space Coordination Area", "SBI Model", "Proximity Model"}
SURFACE_GROUPS = {"SBI Project": "projects", "Proximity Project": "projects", "Lunar Project": "projects", "Space Security Area": "areas", "Space Sustainability Area": "areas", "Space Coordination Area": "areas"}
PROJECT_URLS = {
    "home": "https://espl.ae.gatech.edu/",
    "opportunities": "https://espl.ae.gatech.edu/opportunities/",
    "news": "https://espl.ae.gatech.edu/news/",
    "sbi": "https://espl.ae.gatech.edu/research/projects/sbi/",
    "proximity": "https://espl.ae.gatech.edu/research/projects/proximity/",
    "lunar": "https://espl.ae.gatech.edu/research/projects/lunar/",
    "space-security": "https://espl.ae.gatech.edu/research/areas/space-security/",
    "space-sustainability": "https://espl.ae.gatech.edu/research/areas/space-sustainability/",
    "space-coordination": "https://espl.ae.gatech.edu/research/areas/space-coordination/",
    "model-sbi": "https://espl.ae.gatech.edu/research/models/sbi/",
    "model-proximity": "https://espl.ae.gatech.edu/research/models/proximity/",
    "research": "https://espl.ae.gatech.edu/research/",
    "people": "https://espl.ae.gatech.edu/people/",
}


def read_comments():
    if not COMMENTS.exists():
        return []
    return json.loads(COMMENTS.read_text(encoding="utf-8")).get("comments", [])


def write_comments(comments):
    payload = {"schema": "espl-website-review-v1", "comments": comments}
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=HERE, prefix=".website-comments-", delete=False) as temporary:
        json.dump(payload, temporary, ensure_ascii=False, indent=2)
        temporary.write("\n")
        name = temporary.name
    Path(name).replace(COMMENTS)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def respond(self, status, payload):
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self):
        if urlsplit(self.path).path == "/api/people-wordpress":
            markup = PEOPLE_BLOCK.read_text(encoding="utf-8") + "\n" + (HERE / "people-page-embed-snippet.html").read_text(encoding="utf-8")
            encoded = markup.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)
            return
        if self.path == "/api/website-comments":
            return self.respond(200, {"schema": "espl-website-review-v1", "comments": read_comments()})
        path = urlsplit(self.path).path
        if path.startswith("/api/project-preview/"):
            slug = path.rsplit("/", 1)[-1]
            if slug not in PROJECT_URLS:
                return self.send_error(404, "Unknown project preview")
            if slug == "people":
                # Show the current editable People block, including its location map,
                # before that block has been copied into WordPress.
                block = (HERE / "people-complete-block.html").read_text(encoding="utf-8")
                block = block.replace(
                    "https://thomasgroberts.github.io/proximity-viz/dynamic-table/website-review/people-page-updates.js",
                    f"http://127.0.0.1:{PORT}/dynamic-table/website-review/people-page-updates.js",
                )
                block = block.replace(
                    "https://thomasgroberts.github.io/proximity-viz/dynamic-table/website-review/special-output-cards.js",
                    f"http://127.0.0.1:{PORT}/dynamic-table/website-review/special-output-cards.js",
                )
                html = '<!doctype html><html><head><base href="https://espl.ae.gatech.edu/"></head><body>' + block + '</body></html>'
                encoded = html.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(encoded)))
                self.end_headers()
                self.wfile.write(encoded)
                return
            try:
                request = Request(PROJECT_URLS[slug], headers={"User-Agent": "Mozilla/5.0 (ESPL local design review)"})
                with urlopen(request, timeout=8) as source:
                    html = source.read().decode("utf-8", "replace")
                html = html.replace("<head>", '<head><base href="https://espl.ae.gatech.edu/">', 1)
                addon = ""
                if slug in {"sbi", "proximity", "lunar"}:
                    local_script = f'http://127.0.0.1:{PORT}/dynamic-table/website-review/project-page-updates.js?v=14'
                    html, replaced = re.subn(
                        r'https://thomasgroberts\.github\.io/proximity-viz/dynamic-table/website-review/project-page-updates\.js(?:\?v=\d+)?',
                        local_script, html,
                    )
                    if not replaced:
                        addon += f'<script src="{local_script}" data-espl-project="{slug}"></script>'
                if slug == "research":
                    addon += f'<script src="http://127.0.0.1:{PORT}/dynamic-table/website-review/research-page-updates.js?v=9"></script>'
                if slug == "lunar":
                    local_block = (HERE / "lunar-project-embed-snippet.html").read_text(encoding="utf-8")
                    addon += "<style>" + local_block.split("<style>", 1)[1].split("</style>", 1)[0] + "</style>"
                if slug in {"proximity", "lunar"}:
                    addon += f'<script src="http://127.0.0.1:{PORT}/dynamic-table/website-review/project-news-controls.js?v=2"></script>'
                if slug in {"space-security", "space-sustainability", "space-coordination"}:
                    addon += f'<script src="http://127.0.0.1:{PORT}/dynamic-table/website-review/special-output-cards.js?v=4"></script>'
                html = html.replace("</body>", addon + "</body>", 1)
                encoded = html.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(encoded)))
                self.end_headers()
                self.wfile.write(encoded)
            except Exception as error:
                # Keep the review pane usable while the lab site is temporarily unavailable.
                fallback = HERE / f"{slug}-complete-block.html"
                if not fallback.exists():
                    self.send_error(502, f"Could not load live project page: {error}")
                    return
                block = fallback.read_text(encoding="utf-8")
                for script_name in ("project-page-updates.js", "project-news-controls.js"):
                    block = block.replace(
                        f"https://thomasgroberts.github.io/proximity-viz/dynamic-table/website-review/{script_name}",
                        f"http://127.0.0.1:{PORT}/dynamic-table/website-review/{script_name}",
                    )
                html = '<!doctype html><html><head><base href="https://espl.ae.gatech.edu/"></head><body>' + block + '</body></html>'
                encoded = html.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("X-Review-Source", "local-block-fallback")
                self.send_header("Content-Length", str(len(encoded)))
                self.end_headers()
                self.wfile.write(encoded)
            return
        return super().do_GET()

    def do_POST(self):
        if self.path != "/api/website-comments":
            return self.respond(404, {"error": "Unknown endpoint"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 16384:
                raise ValueError("Invalid request size")
            request = json.loads(self.rfile.read(length))
            comments = read_comments()
            action = request.get("action")
            if action == "add":
                spot = str(request.get("spot", ""))
                surface = str(request.get("surface", "Website Page"))
                sister_group = str(request.get("sisterGroup", ""))
                text = str(request.get("text", "")).strip()
                x, y = float(request.get("x", -1)), float(request.get("y", -1))
                if spot not in SPOTS or surface not in SURFACES or not text or len(text) > 4000 or not (0 <= x <= 1 and 0 <= y <= 1):
                    raise ValueError("Invalid comment or location")
                if sister_group and sister_group != SURFACE_GROUPS.get(surface):
                    raise ValueError("Invalid sister page scope")
                comments.append({
                    "id": uuid4().hex,
                    "surface": surface,
                    "spot": spot,
                    "x": x,
                    "y": y,
                    "text": text,
                    **({"sisterGroup": sister_group} if sister_group else {}),
                    "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                })
            elif action == "update":
                text = str(request.get("text", "")).strip()
                if not text or len(text) > 4000:
                    raise ValueError("Invalid comment text")
                item = next((item for item in comments if item.get("id") == request.get("id")), None)
                if item is None:
                    raise ValueError("Comment not found")
                item["text"] = text
                sister_group = str(request.get("sisterGroup", ""))
                if sister_group and sister_group != SURFACE_GROUPS.get(item.get("surface")):
                    raise ValueError("Invalid sister page scope")
                if sister_group:
                    item["sisterGroup"] = sister_group
                else:
                    item.pop("sisterGroup", None)
                item["updatedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
            elif action == "delete":
                comments = [item for item in comments if item.get("id") != request.get("id")]
            else:
                raise ValueError("Unknown comment action")
            write_comments(comments)
            return self.respond(200, {"schema": "espl-website-review-v1", "comments": comments})
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            return self.respond(400, {"error": str(error)})


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Website review ready at http://127.0.0.1:{PORT}/dynamic-table/website-review/", flush=True)
    server.serve_forever()
