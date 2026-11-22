# Parallel review workflow and carousel style family

This is a handoff for a separate ChatGPT conversation starting a **fragmentation carousel**. The existing presentation is the **proximity carousel**. The fragmentation work belongs in a separate folder under `Georgia Tech/Talks`, outside the ESPL *How Close is Too Close* project.

## How review rounds work

The owner can leave spot comments in several local review panes while Codex works on a different pane. A comment is saved by the pane's local server; the owner then says in chat which pane's round is ready. Codex reads that pane's current saved comments, implements and checks them, archives that processed round, and returns a clean pane with no processed comments. Comments added to another pane during the work stay open for a later round. A download and upload of JSON is optional backup, not the normal handoff.

Current independent review streams:

| Stream | Local review URL | Active comments |
| --- | --- | --- |
| Dynamic Table and episode visualizations | `http://127.0.0.1:8769/dynamic-table/` | `visualization/dev/review-comments.json` |
| ESPL website pages | `http://127.0.0.1:8771/dynamic-table/website-review/` | `dynamic-table/website-review/comments.json` |
| Proximity carousel | `http://127.0.0.1:8772/presentation/?mode=review` | `presentation/comments.json` |

The URLs are local to the owner's laptop, and their servers must be running. The page and carousel files for these streams are in `ESPL/Projects/How Close is Too Close/proximity-viz-site/`. Codex should state which stream it is processing, preserve comments in the other streams, and return links to the refreshed panes. It should report any comment it cannot implement instead of silently clearing it. Production pages should omit the review ribbon and spot editor.

## Fragmentation carousel setup

Create the second presentation in a dedicated `Georgia Tech/Talks/fragmentation-carousel/` folder, with its own local review URL, spot comment store, export, and archived comment rounds. Its content and assets stay separate from the proximity project. The owner can keep commenting on the proximity carousel while Codex works on fragmentation, and vice versa.

Use the proximity carousel's typography, title hierarchy, spacing, card geometry, toolbar behavior, and motion timing as the starting style family. The current implementation is in `proximity-viz-site/presentation/`, especially `style.css`, `index.html`, `app.js`, and `defaults.json`. Scientific diagrams and episode-specific art can differ.

Keep a small shared style specification for both carousels covering fonts, type sizes, spacing scale, colors, corner radii, controls, transitions, and responsive behavior. For any change to those shared styles in either carousel, update the specification and apply or consciously evaluate the corresponding change in the other carousel. Keep each carousel's local preview and comment queue independent. A shared style change should be tested in both previews before it is considered complete. This is an intentional two-way synchronization workflow; the current code does not automatically import styles across the separate folders.

## Starting a round in ChatGPT

Tell Codex which carousel or page has a finished comment round and whether to publish after review. Codex should read the saved comments directly from that pane's local store, identify the exact affected components, implement the round, verify the preview, archive only the comments it processed, and return the relevant review links. When creating the fragmentation carousel, first set up its separate pane and comment store, then let the owner review it the same way.
