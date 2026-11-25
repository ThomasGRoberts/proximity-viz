// Public links use the current sheet ID; internal mini scenes name an orbital asset.
import { loadCurrentEpisodes } from "../../shared/episode-feed.js?v=7";
import { installEpisodeNavigation } from "../../shared/episode-navigation.js?v=5";
const query = new URLSearchParams(location.search);
const publicId = query.get("episode") || "E-001";
let episodeId = query.get("asset");
const localReview = ["localhost", "127.0.0.1"].includes(location.hostname) && location.port === "8769" && (query.get("dev") === "1" || query.get("mini") === "1");
if ((publicId === "E-009" || episodeId === "E-009") && !localReview) {
  document.getElementById("episodeTitle").textContent = "This episode is in local review";
  document.getElementById("episodeBootText").textContent = "This episode is not yet available publicly.";
  document.getElementById("episodeBoot")?.classList.add("is-error");
  throw new Error("E-009 is reserved for local review");
}
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
  "E-001": "./compare.js?v=31", "E-002": "./episode-e002.js?v=16",
  "E-005": "./episode-e005.js?v=20", "E-003": "./episode-e003.js?v=15",
  "E-006": "./episode-e006.js?v=22", "E-008": "./episode-e008.js?v=14",
  "E-016": "./episode-e016.js?v=12", "E-059": "./episode-e059.js?v=14",
  ...(localReview ? { "E-009": "./episode-e009.js?v=1" } : {}),
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
