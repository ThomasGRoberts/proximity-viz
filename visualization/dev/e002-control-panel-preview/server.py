"""Local E-002 review server. Serves repo files and saves spot comments locally."""

from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import math
from pathlib import Path
import tempfile
from uuid import uuid4


HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
COMMENTS = HERE / "spot-comments.json"
CAMERA_VIEWS = HERE / "saved-camera-views.json"
PORT = 8769


def read_comments():
    if not COMMENTS.exists():
        return []
    data = json.loads(COMMENTS.read_text(encoding="utf-8"))
    return data.get("comments", [])


def write_comments(comments):
    payload = {"schema": "espl-e002-spot-comments-v1", "comments": comments}
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=HERE, prefix=".spot-comments-", delete=False
    ) as temporary:
        json.dump(payload, temporary, ensure_ascii=False, indent=2)
        temporary.write("\n")
        name = temporary.name
    Path(name).replace(COMMENTS)


def read_camera_views():
    if not CAMERA_VIEWS.exists():
        return []
    return json.loads(CAMERA_VIEWS.read_text(encoding="utf-8")).get("views", [])


def write_camera_views(views):
    payload = {"schema": "espl-e002-camera-views-v1", "views": views}
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=HERE, prefix=".camera-views-", delete=False
    ) as temporary:
        json.dump(payload, temporary, ensure_ascii=False, indent=2)
        temporary.write("\n")
        name = temporary.name
    Path(name).replace(CAMERA_VIEWS)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO), **kwargs)

    def respond(self, status, payload):
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self):
        if self.path == "/api/spot-comments":
            self.respond(200, {"schema": "espl-e002-spot-comments-v1", "comments": read_comments()})
            return
        if self.path == "/api/camera-views":
            self.respond(200, {"schema": "espl-e002-camera-views-v1", "views": read_camera_views()})
            return
        super().do_GET()

    def do_POST(self):
        if self.path not in ("/api/spot-comments", "/api/camera-views"):
            self.respond(404, {"error": "Unknown endpoint"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > 16384:
                raise ValueError("Comment request must be 1–16384 bytes")
            request = json.loads(self.rfile.read(length))
            if self.path == "/api/camera-views":
                if request.get("action") == "delete":
                    identifier = str(request.get("id", ""))
                    views = read_camera_views()
                    if not identifier or not any(view.get("id") == identifier for view in views):
                        raise ValueError("Camera view not found")
                    views = [view for view in views if view.get("id") != identifier]
                    write_camera_views(views)
                    self.respond(200, {"schema": "espl-e002-camera-views-v1", "views": views})
                    return
                view = request.get("view", {})
                if request.get("action") != "add" or not isinstance(view, dict):
                    raise ValueError("Unknown camera-view action")
                for name in ("position", "target", "up"):
                    values = view.get(name)
                    if not isinstance(values, list) or len(values) != 3 or not all(isinstance(x, (int, float)) and math.isfinite(x) for x in values):
                        raise ValueError(f"Invalid camera {name}")
                if view.get("mode") not in ("eci", "relative") or view.get("referenceMode") not in ("midpoint", "nearusa", "usa245", "target", "chaser"):
                    raise ValueError("Invalid camera mode")
                if view.get("selected") not in ("A", "C") or len(str(view.get("windowId", ""))) > 80:
                    raise ValueError("Invalid camera context")
                datetime.fromisoformat(str(view.get("timeUtc", "")).replace("Z", "+00:00"))
                views = read_camera_views()
                views.append({"id": uuid4().hex, "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                              **{key: view[key] for key in ("windowId", "timeUtc", "selected", "mode", "referenceMode", "auto", "position", "target", "up", "fov", "zoom")}})
                write_camera_views(views)
                self.respond(200, {"schema": "espl-e002-camera-views-v1", "views": views})
                return
            comments = read_comments()
            if request.get("action") == "add":
                text = str(request.get("text", "")).strip()
                key = str(request.get("key", ""))
                root = str(request.get("root", ""))
                label = str(request.get("label", ""))
                x, y = float(request.get("x", 0)), float(request.get("y", 0))
                if not text or len(text) > 4000 or len(key) > 120 or len(label) > 160:
                    raise ValueError("Comment text or location is invalid")
                if root not in ("panel", "selector") or not (0 <= x <= 1 and 0 <= y <= 1):
                    raise ValueError("Comment location is invalid")
                comments.append({
                    "id": uuid4().hex, "root": root, "key": key, "label": label,
                    "x": x, "y": y, "text": text,
                    "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                })
            elif request.get("action") == "delete":
                identifier = str(request.get("id", ""))
                comments = [comment for comment in comments if comment.get("id") != identifier]
            else:
                raise ValueError("Unknown comment action")
            write_comments(comments)
            self.respond(200, {"schema": "espl-e002-spot-comments-v1", "comments": comments})
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            self.respond(400, {"error": str(error)})


if __name__ == "__main__":
    print(f"E-002 control-panel review: http://127.0.0.1:{PORT}/visualization/dev/e002-control-panel-preview/", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
