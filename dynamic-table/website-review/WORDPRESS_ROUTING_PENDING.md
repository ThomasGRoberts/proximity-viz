# Episode routing on the lab site

The live model-page router accepts only `E-001` through `E-008`. For `E-009`,
it leaves the default E-001 iframe in place. Replace the entire model page
Custom HTML block, including its iframe and router, with
[`model-proximity-complete-block.html`](model-proximity-complete-block.html).
The website review pane's Proximity model Copy HTML button provides this exact
complete block. Do not append it beneath the old block. Until the replacement
is visible on the lab site, public E-009 links use the direct GitHub
visualization so visitors see the correct episode. Other episode links continue
to use the lab-site model page.

The live table page has two complete Episodes of Concern HTML blocks because the
new block was appended beneath the old one. `website-language.js` keeps the last
block visible so navigation has one destination. The next WordPress edit should
remove the old block and use [`../website-embed-snippet.html`](../website-embed-snippet.html)
as its replacement. The complete model-page block accepts future three-digit
episode IDs.
