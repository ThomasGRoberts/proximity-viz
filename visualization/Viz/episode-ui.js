// Only the editorial markup used in the published Episodes sheet is displayed.
import { loadCurrentEpisodes, episodeUtcInterval } from "../../shared/episode-feed.js?v=7";
import { installEpisodeDescriptionToggle } from "./panel-enhancements.js?v=13";
// Parse in an inert document, then create fresh, explicitly allowed DOM nodes.
const allowed = new Set(["P", "BR", "I", "EM", "B", "STRONG"]);
const discarded = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH", "IMG", "VIDEO", "AUDIO", "FORM", "INPUT", "BUTTON"]);

export function sanitizeEpisodeDescription(markup) {
  const parsed = new DOMParser().parseFromString(markup, "text/html");
  const clean = document.createDocumentFragment();
  function copy(node, parent) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Change editorial text only; never rewrite tag attributes or URLs.
      parent.append(document.createTextNode(node.textContent.replace(/https?:\/\/[^\s<>]+|'/g, part => part === "'" ? "’" : part)));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || discarded.has(node.tagName)) return;
    const target = allowed.has(node.tagName) ? document.createElement(node.tagName.toLowerCase()) : parent;
    for (const child of node.childNodes) copy(child, target);
    if (target !== parent) parent.append(target);
  }
  for (const child of parsed.body.childNodes) copy(child, clean);
  return clean;
}

const query = new URLSearchParams(location.search);
const publicId = query.get("episode") || "E-001";
if ((query.get("asset") || publicId) === "E-001") {
  const header = document.querySelector("#ui .episodeHeader");
  const back = header?.querySelector(".backEpisodes"), title = header?.querySelector("#episodeTitle");
  if (header && back && title && !header.querySelector(".episode-focus")) {
    document.body.classList.add("e001-shared");
    const focus = document.createElement("section"); focus.id = "episodeFocus"; focus.className = "episode-focus";
    const link = document.createElement("a"); link.href = back.href; link.className = "episode-focus-link";
    link.setAttribute("aria-label", "Choose a different episode");
    const top = document.createElement("div"); top.className = "episode-focus-top";
    const eyebrow = document.createElement("span"); eyebrow.className = "episode-eyebrow"; eyebrow.textContent = "Current episode";
    const action = document.createElement("span"); action.className = "episode-hover-action";
    action.append(back.querySelector(".libraryBackArrow")?.cloneNode(true) || document.createTextNode("←"), document.createTextNode("Choose a different episode"));
    top.append(eyebrow, action); link.append(top, title); focus.append(link);
    back.remove(); header.querySelector("h1")?.after(focus);
  }
}
const description = document.getElementById("episodeDescription");
const storyToggle = installEpisodeDescriptionToggle(description);
loadCurrentEpisodes().then(feed => {
  const episode = feed.episodes.find(row => query.has("asset") ? row.ID === query.get("asset") : row["Episode ID"] === publicId);
  if (!episode) throw new Error(`${publicId} missing from current Episodes sheet`);
  const episodeId = episode.ID;
  if (episodeId === "E-001") episodeUtcInterval(episode);
  const text = episode["Episode Description"];
  if (!text && ["E-003", "E-005", "E-006"].includes(episodeId)) { description.hidden = true; return; }
  if (!text) throw new Error("Episode description unavailable");
  description.replaceChildren(sanitizeEpisodeDescription(text));
  storyToggle.hidden = false;
}).catch(error => {
  description.textContent = `Current episode information unavailable: ${error.message}.`;
  storyToggle.hidden = false;
});
