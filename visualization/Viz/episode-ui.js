// Only the editorial markup used in the published Episodes sheet is displayed.
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
fetch("data/episode-library.json").then(response => {
  if (!response.ok) throw new Error("Episode library unavailable");
  return response.json();
}).then(data => {
  const episode = data.episodes.find(row => row.id === "E-001");
  if (!episode?.description) throw new Error("Episode description unavailable");
  description.replaceChildren(sanitizeEpisodeDescription(episode.description));
}).catch(() => {
  description.textContent = "Episode description is temporarily unavailable.";
});
