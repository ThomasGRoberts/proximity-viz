// Public links use the current sheet ID; internal mini scenes name an orbital asset.
import { loadCurrentEpisodes } from "../../shared/episode-feed.js?v=4";
const query = new URLSearchParams(location.search);
const publicId = query.get("episode") || "E-001";
let episodeId = query.get("asset");
if (!episodeId) {
  try {
    const feed = await loadCurrentEpisodes();
    episodeId = feed.episodes.find(row => row["Episode ID"] === publicId)?.ID;
  } catch (error) {
    document.getElementById("episodeTitle").textContent = `Current episode information unavailable: ${error.message}`;
    throw error;
  }
}
if (episodeId === "E-001") import("./compare.js?v=17");
else if (episodeId === "E-002") import("./episode-e002.js?v=8");
else if (episodeId === "E-005") import("./episode-e005.js?v=7");
else if (episodeId === "E-003") import("./episode-e003.js?v=4");
else if (episodeId === "E-006") import("./episode-e006.js?v=9");
else if (episodeId === "E-008") import("./episode-e008.js?v=2");
else if (episodeId === "E-016") import("./episode-e016.js?v=1");
else if (episodeId === "E-059") import("./episode-e059.js?v=1");
else document.getElementById("episodeTitle").textContent = `${episodeId}: visualization unavailable`;
