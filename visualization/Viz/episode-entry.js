// Public links use the current sheet ID; internal mini scenes name an orbital asset.
import { loadCurrentEpisodes } from "../../shared/episode-feed.js?v=7";
import { installEpisodeNavigation } from "../../shared/episode-navigation.js?v=8";
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
    document.getElementById("episodeBoot")?.classList.add("is-error");
    throw error;
  }
}
const episodeModule = {
  "E-001": "./compare.js?v=32", "E-002": "./episode-e002.js?v=18",
  "E-005": "./episode-e005.js?v=23", "E-003": "./episode-e003.js?v=18",
  "E-006": "./episode-e006.js?v=25", "E-008": "./episode-e008.js?v=17",
  "E-016": "./episode-e016.js?v=15", "E-059": "./episode-e059.js?v=17",
  "E-009": "./episode-e009.js?v=4",
}[episodeId];
if (episodeModule) import(episodeModule).then(async () => {
  if (query.get("mini") === "1") return;
  try {
    const { episodes } = await loadCurrentEpisodes();
    installEpisodeNavigation(document.querySelector("#episodeFocus"), episodes, episodeId, { review: query.get("dev") === "1", period: episodeId !== "E-002" });
  } catch (error) { console.warn("Episode navigation unavailable", error); }
}).catch(error => {
  console.error(error);
  const boot = document.getElementById("episodeBootText");
  if (boot) boot.textContent = `Could not load episode: ${error.message}`;
  document.getElementById("episodeBoot")?.classList.add("is-error");
});
else document.getElementById("episodeTitle").textContent = `${publicId}: visualization unavailable`;
