/* The Research page already fetches its Publications sheet with cache:no-store.
   Keep this small hook for local spot review and WordPress parity. */
(() => {
  const table = document.getElementById('publications-overview');
  if (table) table.dataset.esplPublicationSource = 'live-sheet';
})();
