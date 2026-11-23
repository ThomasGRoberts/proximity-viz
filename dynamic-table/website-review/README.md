# Website page local review

Run `python3 dynamic-table/website-review/server.py` from the repository root and open `http://127.0.0.1:8771/dynamic-table/website-review/`.

The top switcher opens six separate reviews. **Table page** renders the current `dynamic-table/website-embed-snippet.html` draft. It replaces the published table iframe with the local public table at port 8771, then loads the current introductory language and contributors from the published **Website Language** sheet through `dynamic-table/website-language.js`.

**SBI project** and **Proximity project** proxy their live ESPL pages for review and apply `project-page-updates.js` locally. The script reads the live publications archive and places model and data repository cards at the top of research updates, without dates or author portraits. The proximity page also gets a table action in its hero banner. Each pane has its own **Copy HTML** button. The project, People, and table buttons copy complete replacement Custom HTML blocks. Research copies complete WordPress Code Editor content. Run `python3 dynamic-table/website-review/build-complete-blocks.py` after changing the source blocks or update scripts. Publish the linked update scripts to GitHub Pages before pasting the copied blocks into WordPress.

Website spot comments are saved only to `dynamic-table/website-review/comments.json` through `/api/website-comments`. Each of the six website panes has its own comment surface. The file is ignored by Git and is separate from the Dynamic Table and episode comments served on port 8769. Export the JSON from the pane if you want a portable copy. The drafts remain unchanged until a comment round is implemented.

The Proximity and Lunar project panes share SBI-style News Updates controls. A gold dot on either pane tab means its updated WordPress block has not yet been copied from this browser. Copying the block clears that indicator.
