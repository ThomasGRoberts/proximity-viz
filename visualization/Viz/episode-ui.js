// Only the editorial markup used in the published Episodes sheet is displayed.
import { loadCurrentEpisodes, episodeUtcInterval } from "../../shared/episode-feed.js";
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

const description = document.getElementById("episodeDescription");
loadCurrentEpisodes().then(feed => {
  const episode = feed.episodes.find(row => row.ID === "E-001");
  if (!episode) throw new Error("E-001 missing from current Episodes sheet");
  episodeUtcInterval(episode);
  if (!episode["Episode Description"]) throw new Error("Episode description unavailable");
  description.replaceChildren(sanitizeEpisodeDescription(episode["Episode Description"]));
}).catch(error => {
  description.textContent = `Current episode information unavailable: ${error.message}.`;
});
