// Public links use the current sheet ID; internal mini scenes name an orbital asset.
import { loadCurrentEpisodes } from "../../shared/episode-feed.js?v=5";
const query = new URLSearchParams(location.search);
const publicId = query.get("episode") || "E-001";
let episodeId = query.get("asset");
if (!episodeId) {
  try {
    const feed = await loadCurrentEpisodes();
    episodeId = feed.episodes.find(row => row["Episode ID"] === publicId)?.ID;
  } catch (error) {
    document.getElementById("episodeTitle").textContent = `Current episode information unavailable: ${error.message}`;
    const boot = document.getElementById("episodeBootText");
    if (boot) boot.textContent = `Could not load episode: ${error.message}`;
    throw error;
  }
}
const episodeModule = {
  "E-001": "./compare.js?v=19", "E-002": "./episode-e002.js?v=8",
  "E-005": "./episode-e005.js?v=10", "E-003": "./episode-e003.js?v=5",
  "E-006": "./episode-e006.js?v=12", "E-008": "./episode-e008.js?v=4",
  "E-016": "./episode-e016.js?v=2", "E-059": "./episode-e059.js?v=3",
}[episodeId];
if (episodeModule) import(episodeModule).catch(error => {
  console.error(error);
  const boot = document.getElementById("episodeBootText");
  if (boot) boot.textContent = `Could not load episode: ${error.message}`;
});
else document.getElementById("episodeTitle").textContent = `${publicId}: visualization unavailable`;
