# Episode routing on the lab site

The model-page router is live. A browser check confirmed that `?episode=E-001`,
`E-002`, and `E-008` set the iframe to the matching GitHub visualization.
Embedded Dynamic Table model links now go through
`https://espl.ae.gatech.edu/research/models/proximity/?episode=E-xxx`.
The visualizations' return and neighboring-episode links go through the lab site.

The live table page has two complete Episodes of Concern HTML blocks because the
new block was appended beneath the old one. `website-language.js` keeps the last
block visible so navigation has one destination. The next WordPress edit should
remove the old block and use [`../website-embed-snippet.html`](../website-embed-snippet.html)
as its replacement. The model page already contains
[`model-episode-router.html`](model-episode-router.html); its local draft now accepts
future three-digit episode IDs too.
