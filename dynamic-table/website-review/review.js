const $ = id => document.getElementById(id);
const labels = {
  page: "Overall page layout",
  intro: "Introduction panel",
  repository: "Data library icon and link",
  title: "Page title",
  language: "Introduction from Website Language A2",
  contributors: "Contributor strip",
  portraits: "Contributors from Website Language B2",
  table: "Embedded Dynamic Table",
  "full-link": "Open in full window link",
};
const selectors = {
  page: ".espl-episodes-page",
  intro: ".espl-episodes-page .intro",
  repository: ".espl-episodes-page .repo-link",
  title: ".espl-episodes-page h1",
  language: ".espl-episodes-page [data-espl-introduction]",
  contributors: ".espl-episodes-page .contributors",
  portraits: ".espl-episodes-page [data-espl-contributors]",
  table: ".espl-episodes-page iframe",
  "full-link": ".espl-episodes-page .full-link",
};

let comments = [], draft = null, spotMode = false;
const spotNode = spot => document.querySelector(selectors[spot]);
const status = message => { $("reviewStatus").textContent = message; };

async function requestComments(payload) {
  const response = await fetch("/api/website-comments", payload ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  } : { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Comment service returned ${response.status}`);
  return data.comments;
}

function drawPins() {
  const layer = $("pinLayer"), area = $("previewArea").getBoundingClientRect();
  layer.replaceChildren(...comments.flatMap((item, index) => {
    const node = spotNode(item.spot);
    if (!node) return [];
    const rect = node.getBoundingClientRect();
    const pin = document.createElement("button");
    pin.type = "button"; pin.className = "spot-pin"; pin.textContent = String(index + 1);
    pin.title = `${labels[item.spot] || item.spot}: ${item.text}`;
    pin.setAttribute("aria-label", `Open website comment ${index + 1} on ${labels[item.spot] || item.spot}`);
    pin.style.left = `${rect.left - area.left + rect.width * item.x}px`;
    pin.style.top = `${rect.top - area.top + rect.height * item.y}px`;
    pin.addEventListener("click", () => showComment(item.id));
    return [pin];
  }));
}

function showDrawer(open = true) {
  $("commentDrawer").hidden = !open;
  $("commentsToggle").setAttribute("aria-expanded", String(open));
  if (!open) { $("commentForm").hidden = true; draft = null; }
}

function showComment(id) {
  showDrawer(true);
  const card = [...$("commentList").children].find(node => node.dataset.commentId === id);
  if (card) {
    $("commentList").querySelectorAll(".is-current").forEach(node => node.classList.remove("is-current"));
    card.classList.add("is-current"); card.scrollIntoView({ block: "nearest" });
  }
}

function openForm(item) {
  draft = item;
  $("commentLocation").textContent = labels[item.spot] || item.spot;
  $("commentText").value = item.text || "";
  $("saveComment").textContent = item.id ? "Save edit" : "Save comment";
  $("commentForm").hidden = false; showDrawer(true);
  $("commentText").focus();
}

function renderComments() {
  $("commentCount").textContent = String(comments.length);
  const list = $("commentList"); list.replaceChildren();
  comments.forEach((item, index) => {
    const card = document.createElement("article"); card.className = "comment-item"; card.dataset.commentId = item.id;
    const heading = document.createElement("strong"); heading.textContent = `${index + 1}. ${labels[item.spot] || item.spot}`;
    const body = document.createElement("p"); body.textContent = item.text;
    const date = document.createElement("small"); date.textContent = new Date(item.updatedAt || item.createdAt).toLocaleString();
    const actions = document.createElement("div"); actions.className = "comment-item-actions";
    const jump = document.createElement("button"); jump.type = "button"; jump.textContent = "Show spot";
    jump.addEventListener("click", () => { spotNode(item.spot)?.scrollIntoView({ behavior: "smooth", block: "center" }); showComment(item.id); });
    const edit = document.createElement("button"); edit.type = "button"; edit.textContent = "Edit";
    edit.addEventListener("click", () => openForm(item));
    const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      try { comments = await requestComments({ action: "delete", id: item.id }); renderComments(); status("Website comment deleted."); }
      catch (error) { status(`Could not delete comment: ${error.message}`); }
    });
    actions.append(jump, edit, remove); card.append(heading, body, date, actions); list.append(card);
  });
  drawPins();
}

function annotate() {
  for (const [spot, selector] of Object.entries(selectors)) {
    const node = document.querySelector(selector);
    if (node) node.dataset.websiteSpot = spot;
  }
}

async function loadPreview() {
  status("Loading the current website embed draft…");
  try {
    const response = await fetch("../website-embed-snippet.html", { cache: "no-store" });
    if (!response.ok) throw new Error(`Draft returned ${response.status}`);
    const parsed = new DOMParser().parseFromString(await response.text(), "text/html");
    const sourceStyle = parsed.querySelector("style"), sourcePage = parsed.querySelector(".espl-episodes-page");
    if (!sourceStyle || !sourcePage) throw new Error("The embed draft is missing its page markup or styling");
    $("websiteSnippetStyles")?.remove();
    const style = document.createElement("style"); style.id = "websiteSnippetStyles"; style.textContent = sourceStyle.textContent;
    document.head.append(style);
    const frame = sourcePage.querySelector("iframe");
    if (frame) frame.src = new URL("../", location.href).href;
    $("pageHost").replaceChildren(sourcePage);
    annotate(); drawPins();
    await import(`../website-language.js?website-review=${Date.now()}`);
    status(sourcePage.dataset.languageSource === "live"
      ? "Preview uses the current Website Language sheet. Spot comments save in this pane only."
      : "Website Language sheet unavailable; showing the draft's fallback text. Spot comments still save locally.");
  } catch (error) { status(`Could not load website page preview: ${error.message}`); }
}

function setSpotMode(active) {
  spotMode = active; $("spotLayer").hidden = !active; $("spotHighlight").hidden = true;
  $("spotMode").setAttribute("aria-pressed", String(active));
  $("spotMode").textContent = active ? "Cancel spot comment" : "✚ Spot comment";
  if (active) status("Choose a location on the website page to comment on.");
}

function underlyingSpot(clientX, clientY) {
  const overlay = $("spotLayer"); overlay.style.pointerEvents = "none";
  const element = document.elementFromPoint(clientX, clientY);
  overlay.style.pointerEvents = "";
  return element?.closest?.("[data-website-spot]") || spotNode("page");
}

$("spotMode").addEventListener("click", () => setSpotMode(!spotMode));
$("spotLayer").addEventListener("pointermove", event => {
  const node = underlyingSpot(event.clientX, event.clientY), highlight = $("spotHighlight");
  if (!node) { highlight.hidden = true; return; }
  const rect = node.getBoundingClientRect();
  Object.assign(highlight.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  highlight.hidden = false;
});
$("spotLayer").addEventListener("pointerleave", () => { $("spotHighlight").hidden = true; });
$("spotLayer").addEventListener("click", event => {
  const node = underlyingSpot(event.clientX, event.clientY);
  if (!node) return;
  const rect = node.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
  setSpotMode(false); openForm({ spot: node.dataset.websiteSpot, x, y });
});
$("commentsToggle").addEventListener("click", () => showDrawer($("commentDrawer").hidden));
$("closeDrawer").addEventListener("click", () => showDrawer(false));
$("cancelComment").addEventListener("click", () => { $("commentForm").hidden = true; draft = null; });
$("commentForm").addEventListener("submit", async event => {
  event.preventDefault(); if (!draft) return;
  try {
    const payload = draft.id ? { action: "update", id: draft.id, text: $("commentText").value }
      : { action: "add", spot: draft.spot, x: draft.x, y: draft.y, text: $("commentText").value };
    comments = await requestComments(payload); draft = null; $("commentForm").hidden = true;
    renderComments(); status("Website comment saved locally. The Dynamic Table comment pool is unchanged.");
  } catch (error) { status(`Could not save website comment: ${error.message}`); }
});
$("exportComments").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ schema: "espl-website-review-v1", comments }, null, 2)], { type: "application/json" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "website-review-comments.json";
  link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});
$("refreshPreview").addEventListener("click", loadPreview);
new ResizeObserver(() => {
  document.documentElement.style.setProperty("--bar-height", `${$("reviewBar").getBoundingClientRect().height}px`);
  drawPins();
}).observe($("reviewBar"));
new ResizeObserver(drawPins).observe($("pageHost"));
window.addEventListener("resize", drawPins);
window.addEventListener("scroll", drawPins, { passive: true });
window.addEventListener("keydown", event => { if (event.key === "Escape") { setSpotMode(false); if (!$("commentDrawer").hidden) showDrawer(false); } });

try { comments = await requestComments(); renderComments(); }
catch (error) { status(`Could not load website comments: ${error.message}`); }
await loadPreview();
