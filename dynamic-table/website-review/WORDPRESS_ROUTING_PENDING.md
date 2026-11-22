# Episode routing on the lab site

The Dynamic Table currently opens the GitHub visualization directly. That link remains in place because the live lab model page embeds E-001 regardless of its `episode` query parameter.

To move the row links to the lab domain without sending E-002–E-008 visitors to E-001:

1. Add [`model-episode-router.html`](model-episode-router.html) after the existing iframe block on `https://espl.ae.gatech.edu/research/models/proximity/`.
2. Replace the table page Custom HTML block with [`../website-embed-snippet.html`](../website-embed-snippet.html). This forwards `?review=E-xxx` into the table iframe and scrolls to it on return.
3. Once the model route is live and verified, change the public branch of the row link in `../app.js` to `https://espl.ae.gatech.edu/research/models/proximity/?episode=E-xxx`.

Both WordPress edits are prepared. No live WordPress edit was made in this round.
