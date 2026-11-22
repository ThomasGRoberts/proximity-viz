# Website page local review

Run `python3 dynamic-table/website-review/server.py` from the repository root and open `http://127.0.0.1:8771/dynamic-table/website-review/`.

This pane renders the current `dynamic-table/website-embed-snippet.html` draft. It replaces the published table iframe with the local public table at port 8771, then loads the current introductory language and contributors from the published **Website Language** sheet through `dynamic-table/website-language.js`.

Website spot comments are saved only to `dynamic-table/website-review/comments.json` through `/api/website-comments`. That file is ignored by Git and is separate from the Dynamic Table and episode comments served on port 8769. Export the JSON from the pane if you want a portable copy. The website embed draft remains unchanged until a comment round is implemented.
