import { loadCurrentEpisodes } from "./episode-feed.js?v=6";

// Embedded miniatures have their own loading motif in the table's preview pane.
const isMiniature = new URLSearchParams(location.search).get("mini") === "1";
const context = isMiniature ? null : document.getElementById("episodeLoadingContext") || document.getElementById("episodeBootContext");
if (context) {
  window.episodeLoadingHoldUntil = new Promise(resolve => {
    const timeout = setTimeout(resolve, 1800);
    window.finishSpecificEpisodeLoading = () => { clearTimeout(timeout); setTimeout(resolve, 1100); };
  });
  const query = new URLSearchParams(location.search);
  const path = location.pathname;
  const asset = query.get("asset") || (/\/(?:e001|e001-review)\//.test(path) ? "E-001" : /\/(?:e002|e002-control-panel-preview)\//.test(path) ? "E-002" : "");
  Promise.all([
    loadCurrentEpisodes(),
    fetch(new URL("../dynamic-table/data/space-track-satcat.json", import.meta.url)).then(response => response.ok ? response.json() : null)
  ]).then(([feed, catalog]) => {
    const row = feed.episodes.find(item => asset ? item.ID === asset : item["Episode ID"] === query.get("episode"));
    if (!row) return;
    const name = slot => catalog?.records?.[row[`Object ${slot}`]]?.OBJECT_NAME || row[`Object ${slot}`] || `Object ${slot}`;
    const em = value => { const node = document.createElement("em"); node.textContent = value; return node; };
    context.replaceChildren("Finding ", em(name("A")), " and ", em(name("B")), "…");
    context.parentElement.dataset.specificLoading = "1";
    window.finishSpecificEpisodeLoading();
  }).catch(() => { window.finishSpecificEpisodeLoading(); });
}
