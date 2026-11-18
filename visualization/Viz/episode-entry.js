// One page shell routes episode-specific data into the shared visualization UI.
const episodeId = new URLSearchParams(location.search).get("episode") || "E-001";
if (episodeId === "E-001") import("./compare.js?v=14");
else if (episodeId === "E-002") import("./episode-e002.js?v=7");
else if (episodeId === "E-005") import("./episode-e005.js?v=4");
else if (episodeId === "E-003") import("./episode-e003.js?v=1");
else if (episodeId === "E-006") import("./episode-e006.js?v=2");
else document.getElementById("episodeTitle").textContent = `${episodeId}: visualization unavailable`;
