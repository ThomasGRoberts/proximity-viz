# Episode routing on the lab site

The live model page now uses
[`model-proximity-complete-block.html`](model-proximity-complete-block.html).
A browser check confirmed that `?episode=E-009` selects the E-009 visualization
and that the iframe starts at the top of the content area. All public episode
links use the lab-site model page. The website review pane's Proximity model
Copy HTML button provides the complete block on one line so WordPress does not
turn a standalone comment or script into a full-height empty paragraph.

The complete table-page block is
[`../website-embed-snippet.html`](../website-embed-snippet.html).
If an older copy remains in WordPress, `website-language.js` keeps the last
block visible; the page editor should still remove the older copy. Shareable
table links use `?episode=E-xxx` and open the corresponding expanded row.
