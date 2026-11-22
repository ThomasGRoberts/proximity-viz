"""Local review server for the website page that embeds the Dynamic Table."""

from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import tempfile
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from uuid import uuid4


HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
COMMENTS = HERE / "comments.json"
PORT = 8771
SPOTS = {"page", "intro", "repository", "title", "language", "contributors", "portraits", "table", "full-link", "about-link", "repo-meta", "project-page", "project-banner", "research-updates", "special-model", "special-data", "hero-table-link"}
SURFACES = {"Website Page", "SBI Project", "Proximity Project"}
PROJECT_URLS = {
    "sbi": "https://espl.ae.gatech.edu/research/projects/sbi/",
    "proximity": "https://espl.ae.gatech.edu/research/projects/proximity/",
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
        if self.path == "/api/website-comments":
            return self.respond(200, {"schema": "espl-website-review-v1", "comments": read_comments()})
        path = urlsplit(self.path).path
        if path.startswith("/api/project-preview/"):
            slug = path.rsplit("/", 1)[-1]
            if slug not in PROJECT_URLS:
                return self.send_error(404, "Unknown project preview")
            try:
                request = Request(PROJECT_URLS[slug], headers={"User-Agent": "Mozilla/5.0 (ESPL local design review)"})
                with urlopen(request, timeout=20) as source:
                    html = source.read().decode("utf-8", "replace")
                html = html.replace("<head>", '<head><base href="https://espl.ae.gatech.edu/">', 1)
                local_script = f'http://127.0.0.1:{PORT}/dynamic-table/website-review/project-page-updates.js?v=1'
                addon = f'<script src="{local_script}" data-espl-project="{slug}"></script>'
                html = html.replace("</body>", addon + "</body>", 1)
                encoded = html.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(encoded)))
                self.end_headers()
                self.wfile.write(encoded)
            except Exception as error:
                self.send_error(502, f"Could not load live project page: {error}")
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
                text = str(request.get("text", "")).strip()
                x, y = float(request.get("x", -1)), float(request.get("y", -1))
                if spot not in SPOTS or surface not in SURFACES or not text or len(text) > 4000 or not (0 <= x <= 1 and 0 <= y <= 1):
                    raise ValueError("Invalid comment or location")
                comments.append({
                    "id": uuid4().hex,
                    "surface": surface,
                    "spot": spot,
                    "x": x,
                    "y": y,
                    "text": text,
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
