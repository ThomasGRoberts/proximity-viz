// One page shell routes episode-specific data into the shared visualization UI.
const episodeId = new URLSearchParams(location.search).get("episode") || "E-001";
if (episodeId === "E-001") import("./compare.js?v=9");
else if (episodeId === "E-002") import("./episode-e002.js?v=4");
else document.getElementById("episodeTitle").textContent = `${episodeId}: visualization unavailable`;
