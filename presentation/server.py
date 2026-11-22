"""Independent local review server for the synthetic orbital presentation."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import tempfile
import uuid
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
HERE = Path(__file__).resolve().parent
CONFIG = HERE / "config.json"
COMMENTS = HERE / "comments.json"

def read_json(path, fallback):
    try:
        return json.loads(path.read_text())
    except FileNotFoundError:
        return fallback

def write_json(path, value):
    with tempfile.NamedTemporaryFile("w", dir=path.parent, prefix=".presentation-", delete=False) as handle:
        json.dump(value, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
        temp = handle.name
    os.replace(temp, path)

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, value, status=200):
        data = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/api/presentation-config":
            return self.send_json(read_json(CONFIG, read_json(HERE / "defaults.json", {})))
        if self.path == "/api/presentation-comments":
            return self.send_json(read_json(COMMENTS, {"schema": "presentation-comments-v1", "comments": []}))
        return super().do_GET()

    def do_POST(self):
        if self.path not in {"/api/presentation-config", "/api/presentation-comments"}:
            return self.send_json({"error": "Unknown endpoint"}, 404)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 1000000:
                return self.send_json({"error": "Payload too large"}, 413)
            payload = json.loads(self.rfile.read(length))
            if self.path.endswith("config"):
                if not isinstance(payload, dict) or payload.get("schema") != "espl-orbital-carousel-v1":
                    return self.send_json({"error": "Invalid presentation config"}, 400)
                write_json(CONFIG, payload)
                return self.send_json(payload)
            doc = read_json(COMMENTS, {"schema": "presentation-comments-v1", "comments": []})
            if payload.get("action") == "add":
                entry = payload.get("comment", {})
                if not isinstance(entry, dict) or not str(entry.get("text", "")).strip() or len(str(entry.get("text", ""))) > 4000:
                    return self.send_json({"error": "Enter a comment of at most 4,000 characters"}, 400)
                entry = {"id": uuid.uuid4().hex, "createdAt": datetime.now(timezone.utc).isoformat(), "status": "open", **entry}
                doc["comments"].append(entry)
            elif payload.get("action") == "archive":
                for item in doc["comments"]:
                    if item.get("id") == payload.get("id"):
                        item["status"] = "archived"
                        item["archivedAt"] = datetime.now(timezone.utc).isoformat()
                        break
            else:
                return self.send_json({"error": "Unknown comment action"}, 400)
            write_json(COMMENTS, doc)
            return self.send_json(doc)
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            return self.send_json({"error": str(error)}, 400)

if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8772), Handler).serve_forever()
