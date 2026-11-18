// One page shell routes episode-specific data into the shared visualization UI.
const episodeId = new URLSearchParams(location.search).get("episode") || "E-001";
if (episodeId === "E-001") import("./compare.js?v=13");
else if (episodeId === "E-002") import("./episode-e002.js?v=6");
else if (episodeId === "E-005") import("./episode-e005.js?v=3");
else document.getElementById("episodeTitle").textContent = `${episodeId}: visualization unavailable`;
