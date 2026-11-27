const $ = id => document.getElementById(id);
const labels = {
  page: "Overall page layout",
  intro: "Introduction panel",
  repository: "Data repository icon and label",
  title: "Page title",
  language: "Introduction from Website Language A2",
  contributors: "Contributor strip",
  portraits: "Contributors from Website Language B2",
  table: "Embedded Dynamic Table",
  "about-link": "About this project link",
  "repo-meta": "Repository update and GitHub link",
  "project-page": "Project page",
  "project-banner": "Project banner",
  "research-updates": "Research updates",
  "special-model": "Interactive model card",
  "special-data": "Data repository card",
  "hero-table-link": "Banner table link",
  "research-page": "Research page",
  "publication-table": "Publication table",
  "people-page": "People page",
  "student-biocards": "Student biography cards",
  "student-research-updates": "Student research updates",
  "area-page": "Research area page",
};
const selectors = {
  page: ".espl-episodes-page",
  intro: ".espl-episodes-page .intro",
  repository: ".espl-episodes-page .repo-kicker",
  title: ".espl-episodes-page h1",
  language: ".espl-episodes-page [data-espl-introduction]",
  contributors: ".espl-episodes-page .contributors",
  portraits: ".espl-episodes-page [data-espl-contributors]",
  table: ".espl-episodes-page iframe",
  "about-link": ".espl-episodes-page .about-link",
  "repo-meta": ".espl-episodes-page .repo-meta",
};
const projectSelectors = {
  "project-page": "#espl-project-page",
  "project-banner": "#espl-project-page .espl-sbi-banner-embed, #espl-project-page .espl-proximity-banner-embed",
  "research-updates": "#espl-project-page .project-outputs",
  "special-model": "#espl-project-page .archive-model-card",
  "special-data": "#espl-project-page .data-repository-card",
  "hero-table-link": "#espl-project-page .espl-proximity-banner-embed",
};
const researchSelectors = {
  "research-page": "#espl-research-projects",
  "publication-table": "#publications-overview",
};
const peopleSelectors = {
  "people-page": "#espl-people-page",
  "student-biocards": "#espl-people-page .student-card, #espl-people-page .person-card",
  "student-research-updates": "#studentOverlay .project-outputs, #studentOverlay #publicationStage",
};
const genericSelectors = { page: "body" };
const areaSelectors = { "area-page": "body" };
const panes = {
  library: { surface: "Website Page", snippet: "../website-embed-snippet.html", copyLabel: "Copy table HTML" },
  sbi: { surface: "SBI Project", snippet: "./sbi-complete-block.html", copyLabel: "Copy SBI HTML" },
  proximity: { surface: "Proximity Project", snippet: "./proximity-complete-block.html", copyLabel: "Copy proximity HTML" },
  lunar: { surface: "Lunar Project", snippet: "./lunar-complete-block.html", copyLabel: "Copy Lunar HTML" },
  research: { surface: "Research", snippet: "./research-complete-block.html", copyLabel: "Copy Research page" },
  people: { surface: "People", snippet: "./people-complete-block.html", copyLabel: "Copy People HTML" },
  home: { surface: "Home", snippet: "./home-complete-block.html", copyLabel: "Copy Home HTML" },
  opportunities: { surface: "Opportunities" },
  news: { surface: "News" },
  "space-security": { surface: "Space Security Area", group: "areas", snippet: "./space-security-complete-block.html", copyLabel: "Copy Space Security HTML" },
  "space-sustainability": { surface: "Space Sustainability Area", group: "areas", snippet: "./space-sustainability-complete-block.html", copyLabel: "Copy Space Sustainability HTML" },
  "space-coordination": { surface: "Space Coordination Area", group: "areas", snippet: "./space-coordination-complete-block.html", copyLabel: "Copy Space Coordination HTML" },
  "model-sbi": { surface: "SBI Model" },
  "model-proximity": { surface: "Proximity Model", snippet: "./model-proximity-complete-block.html", copyLabel: "Copy Proximity model HTML" },
};
for (const key of ["sbi", "proximity", "lunar"]) panes[key].group = "projects";
const paneSelectors = { library: selectors, sbi: projectSelectors, proximity: projectSelectors, lunar: projectSelectors, research: researchSelectors, people: peopleSelectors,
  "space-security": areaSelectors, "space-sustainability": areaSelectors, "space-coordination": areaSelectors };
for (const key of Object.keys(panes)) paneSelectors[key] ||= genericSelectors;
const paneName = Object.fromEntries(Object.entries(panes).map(([key, pane]) => [key, pane.surface]));

let comments = [], draft = null, spotMode = false, activePane = "library";
const visibleComments = () => comments.filter(item => (item.surface || "Website Page") === panes[activePane].surface ||
  (panes[activePane].group && item.sisterGroup === panes[activePane].group));
const projectFrame = () => document.getElementById("projectFrame");
const previewDocument = () => activePane === "library" ? document : projectFrame()?.contentDocument;
const spotNode = spot => {
  const selector = paneSelectors[activePane]?.[spot];
  return selector ? previewDocument()?.querySelector(selector) : null;
};
const spotRect = node => {
  const rect = node.getBoundingClientRect();
  if (activePane === "library") return rect;
  const frame = projectFrame()?.getBoundingClientRect();
  return { left: frame.left + rect.left, top: frame.top + rect.top, width: rect.width, height: rect.height };
};
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
  layer.replaceChildren(...visibleComments().flatMap((item, index) => {
    const node = spotNode(item.spot) || spotNode("project-page") || spotNode("area-page") || spotNode("page");
    if (!node) return [];
    const rect = spotRect(node);
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
  const group = panes[activePane].group;
  $("sisterScopeLabel").hidden = !group;
  $("sisterScopeName").textContent = group === "projects" ? "project pages" : "research area pages";
  $("sisterScope").checked = Boolean(group && item.sisterGroup === group);
  $("commentForm").hidden = false; showDrawer(true);
  $("commentText").focus();
}

function renderComments() {
  const current = visibleComments();
  $("commentCount").textContent = String(current.length);
  const list = $("commentList"); list.replaceChildren();
  current.forEach((item, index) => {
    const card = document.createElement("article"); card.className = "comment-item"; card.dataset.commentId = item.id;
    const heading = document.createElement("strong"); heading.textContent = `${index + 1}. ${labels[item.spot] || item.spot}`;
    const body = document.createElement("p"); body.textContent = item.text;
    const scope = document.createElement("small");
    scope.className = "comment-scope";
    scope.textContent = item.sisterGroup ? `Applies to all ${item.sisterGroup === "projects" ? "project" : "research area"} pages` : "";
    const date = document.createElement("small"); date.textContent = new Date(item.updatedAt || item.createdAt).toLocaleString();
    const actions = document.createElement("div"); actions.className = "comment-item-actions";
    const jump = document.createElement("button"); jump.type = "button"; jump.textContent = "Show spot";
    jump.addEventListener("click", () => { (spotNode(item.spot) || spotNode("project-page") || spotNode("area-page") || spotNode("page"))?.scrollIntoView({ behavior: "smooth", block: "center" }); showComment(item.id); });
    const edit = document.createElement("button"); edit.type = "button"; edit.textContent = "Edit";
    edit.addEventListener("click", () => openForm(item));
    const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      try { comments = await requestComments({ action: "delete", id: item.id }); renderComments(); status("Website comment deleted."); }
      catch (error) { status(`Could not delete comment: ${error.message}`); }
    });
    actions.append(jump, edit, remove); card.append(heading, body, scope, date, actions); list.append(card);
  });
  drawPins();
}

function annotate() {
  const doc = previewDocument();
  for (const [spot, selector] of Object.entries(paneSelectors[activePane])) {
    const node = doc?.querySelector(selector);
    if (node) node.dataset.websiteSpot = spot;
  }
}

async function loadPreview() {
  const pane = activePane;
  status(pane === "library" ? "Loading the current website embed draft…" : `Loading the live ${paneName[pane]} page…`);
  try {
    if (pane !== "library") {
      const frame = document.createElement("iframe");
      frame.id = "projectFrame"; frame.className = "project-frame";
      frame.title = `${paneName[pane]} page preview`;
      const previewEpisode = new URLSearchParams(location.search).get("episode");
      const episodeQuery = pane === "model-proximity" && /^E-\d{3}$/.test(previewEpisode || "") ? `&episode=${encodeURIComponent(previewEpisode)}` : "";
      frame.src = `/api/project-preview/${pane}?refresh=${Date.now()}${episodeQuery}`;
      frame.addEventListener("load", () => {
        if (activePane !== pane || frame !== projectFrame()) return;
        try {
          const required = pane === "people" ? "#espl-people-page" : pane === "research" ? "#espl-research-projects" : pane === "model-proximity" ? "#espl-proximity-model" : ["sbi", "proximity", "lunar"].includes(pane) ? "#espl-project-page" : "body";
          if (!frame.contentDocument?.querySelector(required) || frame.contentDocument?.title === "Error response") throw new Error("Page unavailable");
          annotate(); drawPins();
          frame.contentWindow.addEventListener("scroll", drawPins, { passive: true });
          const publications = frame.contentDocument.querySelector(pane === "people" ? "#studentOverlay" : pane === "research" ? "#publications-overview" : ".project-publications");
          if (publications) {
            let scheduled = false;
            new MutationObserver(() => {
              if (scheduled) return;
              scheduled = true;
              requestAnimationFrame(() => { scheduled = false; if (activePane === pane && frame === projectFrame()) { annotate(); drawPins(); } });
            }).observe(publications, { childList: true, subtree: pane === "people" });
          }
          status(pane === "model-proximity" ? "Complete Proximity model HTML draft. Copy HTML replaces the current model block." : `Live ${paneName[pane]} page. Spot comments save locally.`);
        } catch (error) { status(`Could not display page: ${error.message}`); }
      });
      $("pageHost").replaceChildren(frame);
      renderComments();
      return;
    }
    const response = await fetch("../website-embed-snippet.html", { cache: "no-store" });
    if (!response.ok) throw new Error(`Draft returned ${response.status}`);
    if (activePane !== pane) return;
    const parsed = new DOMParser().parseFromString(await response.text(), "text/html");
    const sourceStyle = parsed.querySelector("style"), sourcePage = parsed.querySelector(".espl-episodes-page");
    if (!sourceStyle || !sourcePage) throw new Error("The embed draft is missing its page markup or styling");
    $("websiteSnippetStyles")?.remove();
    const style = document.createElement("style"); style.id = "websiteSnippetStyles"; style.textContent = sourceStyle.textContent;
    document.head.append(style);
    const frame = sourcePage.querySelector("iframe");
    if (frame) frame.src = new URL("../?embed=1", location.href).href;
    $("pageHost").replaceChildren(sourcePage);
    annotate(); renderComments(); drawPins();
    await import(`../website-language.js?website-review=${Date.now()}`);
    if (activePane !== pane) return;
    status(sourcePage.dataset.languageSource === "live"
      ? "Preview uses the current Website Language sheet. Spot comments save in this pane only."
      : "Website Language sheet unavailable; showing the draft's fallback text. Spot comments still save locally.");
  } catch (error) { status(`Could not load website page preview: ${error.message}`); }
}

function updateCopyIndicators() {
  document.querySelectorAll('.review-switch button.needs-update').forEach(button => button.classList.remove('needs-update'));
  document.querySelectorAll(".review-switch [data-update-version]").forEach(button => {
    let copied = false;
    try { copied = localStorage.getItem(`espl-copied-${button.dataset.preview}`) === button.dataset.updateVersion; } catch { /* Private browser storage can be unavailable. */ }
    button.classList.toggle("needs-update", !copied);
  });
  document.querySelectorAll(".review-group").forEach(group => group.classList.toggle("group-needs-update", Boolean(group.querySelector("button.needs-update"))));
}

function selectPane(pane) {
  if (!panes[pane]) return;
  setSpotMode(false);
  activePane = pane;
  const url = new URL(location.href);
  url.searchParams.set("pane", pane);
  history.replaceState(null, "", url);
  document.querySelectorAll(".review-switch [data-preview]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.preview === pane)));
  document.querySelectorAll(".review-group").forEach(group => { group.open = false; group.classList.toggle("is-active", Boolean(group.querySelector('[aria-pressed="true"]'))); });
  $("copyHtml").textContent = panes[pane].copyLabel || "Live page preview";
  $("copyHtml").disabled = !panes[pane].snippet;
  $("commentDrawer").setAttribute("aria-label", `${panes[pane].surface} comments`);
  $("commentDrawer").querySelector(".drawer-head strong").textContent = `${panes[pane].surface} comments`;
  $("commentForm").hidden = true; draft = null;
  void loadPreview();
}

function setSpotMode(active) {
  spotMode = active; $("spotLayer").hidden = !active; $("spotHighlight").hidden = true;
  $("spotMode").setAttribute("aria-pressed", String(active));
  $("spotMode").textContent = active ? "Cancel spot comment" : "✚ Spot comment";
  if (active) status("Choose a location on the website page to comment on.");
}

function underlyingSpot(clientX, clientY) {
  if (activePane !== "library") {
    const frame = projectFrame(), rect = frame?.getBoundingClientRect();
    if (!frame || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    const inner = frame.contentDocument?.elementFromPoint(clientX - rect.left, clientY - rect.top);
    return inner?.closest?.("[data-website-spot]") || spotNode("project-page") || spotNode("area-page") || spotNode("page");
  }
  const overlay = $("spotLayer"); overlay.style.pointerEvents = "none";
  const element = document.elementFromPoint(clientX, clientY);
  overlay.style.pointerEvents = "";
  return element?.closest?.("[data-website-spot]") || spotNode("page");
}

$("spotMode").addEventListener("click", () => setSpotMode(!spotMode));
$("spotLayer").addEventListener("pointermove", event => {
  const node = underlyingSpot(event.clientX, event.clientY), highlight = $("spotHighlight");
  if (!node) { highlight.hidden = true; return; }
  const rect = spotRect(node);
  Object.assign(highlight.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  highlight.hidden = false;
});
$("spotLayer").addEventListener("pointerleave", () => { $("spotHighlight").hidden = true; });
$("spotLayer").addEventListener("click", event => {
  const node = underlyingSpot(event.clientX, event.clientY);
  if (!node) return;
  const rect = spotRect(node);
  const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
  setSpotMode(false); openForm({ surface: panes[activePane].surface, spot: node.dataset.websiteSpot, x, y });
});
document.querySelectorAll(".review-switch [data-preview]").forEach(button => button.addEventListener("click", () => selectPane(button.dataset.preview)));
document.querySelectorAll(".review-group").forEach(group => group.addEventListener("toggle", () => {
  if (group.open) document.querySelectorAll(".review-group").forEach(other => { if (other !== group) other.open = false; });
}));
$("commentsToggle").addEventListener("click", () => showDrawer($("commentDrawer").hidden));
$("closeDrawer").addEventListener("click", () => showDrawer(false));
$("cancelComment").addEventListener("click", () => { $("commentForm").hidden = true; draft = null; });
$("commentForm").addEventListener("submit", async event => {
  event.preventDefault(); if (!draft) return;
  try {
    const sisterGroup = $("sisterScope").checked && panes[activePane].group ? panes[activePane].group : "";
    const payload = draft.id ? { action: "update", id: draft.id, text: $("commentText").value, sisterGroup }
      : { action: "add", surface: draft.surface || panes[activePane].surface, spot: draft.spot, x: draft.x, y: draft.y, text: $("commentText").value, sisterGroup };
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
$("copyHtml").addEventListener("click", async () => {
  const button = $("copyHtml"), pane = activePane;
  if (!panes[pane].snippet) return;
  try {
    const response = await fetch(panes[pane].snippet, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTML draft returned ${response.status}`);
    const markup = await response.text();
    let copied = false;
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(markup); copied = true; }
      catch { /* Integrated browsers may deny this API; try the selection route. */ }
    }
    if (!copied) {
      const fallback = document.createElement("textarea"); fallback.value = markup;
      fallback.style.cssText = "position:fixed;left:-9999px;top:0"; document.body.append(fallback);
      fallback.select();
      copied = document.execCommand("copy"); fallback.remove();
      if (!copied) throw new Error("Clipboard access is unavailable");
    }
    button.textContent = "Copied HTML";
    const paneButton = document.querySelector(`.review-switch [data-preview="${pane}"]`);
    if (paneButton?.dataset.updateVersion) { try { localStorage.setItem(`espl-copied-${pane}`, paneButton.dataset.updateVersion); } catch {} updateCopyIndicators(); }
    status(pane === "library" ? "The complete table page Custom HTML block is on your clipboard." : pane === "research" ? "The complete Research page Code Editor content is on your clipboard." : `The complete ${paneName[pane]} Custom HTML block is on your clipboard. Replace the existing block with it.`);
    setTimeout(() => { if (activePane === pane) button.textContent = panes[pane].copyLabel; }, 1800);
  } catch (error) { status(`Could not copy HTML: ${error.message}`); }
});
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
updateCopyIndicators();
selectPane(panes[new URLSearchParams(location.search).get("pane")] ? new URLSearchParams(location.search).get("pane") : "library");
