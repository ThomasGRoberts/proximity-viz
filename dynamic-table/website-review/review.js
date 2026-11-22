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
const panes = {
  library: { surface: "Website Page", snippet: "../website-embed-snippet.html", copyLabel: "Copy table HTML" },
  sbi: { surface: "SBI Project", snippet: "./sbi-project-embed-snippet.html", copyLabel: "Copy SBI HTML" },
  proximity: { surface: "Proximity Project", snippet: "./proximity-project-embed-snippet.html", copyLabel: "Copy proximity HTML" },
};

let comments = [], draft = null, spotMode = false, activePane = "library";
const visibleComments = () => comments.filter(item => (item.surface || "Website Page") === panes[activePane].surface);
const projectFrame = () => document.getElementById("projectFrame");
const previewDocument = () => activePane === "library" ? document : projectFrame()?.contentDocument;
const spotNode = spot => previewDocument()?.querySelector((activePane === "library" ? selectors : projectSelectors)[spot]);
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
    const node = spotNode(item.spot);
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
  const doc = previewDocument();
  for (const [spot, selector] of Object.entries(activePane === "library" ? selectors : projectSelectors)) {
    const node = doc?.querySelector(selector);
    if (node) node.dataset.websiteSpot = spot;
  }
}

async function loadPreview() {
  const pane = activePane;
  status(pane === "library" ? "Loading the current website embed draft…" : `Loading the live ${pane === "sbi" ? "SBI" : "proximity"} project page…`);
  try {
    if (pane !== "library") {
      const frame = document.createElement("iframe");
      frame.id = "projectFrame"; frame.className = "project-frame";
      frame.title = `${pane === "sbi" ? "SBI" : "Proximity"} project page preview`;
      frame.src = `/api/project-preview/${pane}?refresh=${Date.now()}`;
      frame.addEventListener("load", () => {
        if (activePane !== pane || frame !== projectFrame()) return;
        try {
          if (!frame.contentDocument?.querySelector("#espl-project-page")) throw new Error("Project page unavailable");
          annotate(); drawPins();
          frame.contentWindow.addEventListener("scroll", drawPins, { passive: true });
          const publications = frame.contentDocument.querySelector(".project-publications");
          if (publications) {
            let scheduled = false;
            new MutationObserver(() => {
              if (scheduled) return;
              scheduled = true;
              requestAnimationFrame(() => { scheduled = false; if (activePane === pane && frame === projectFrame()) { annotate(); drawPins(); } });
            }).observe(publications, { childList: true });
          }
          status(`Live ${pane === "sbi" ? "SBI" : "proximity"} project page with local updates. Spot comments save in this pane only.`);
        } catch (error) { status(`Could not display project page: ${error.message}`); }
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

function selectPane(pane) {
  if (!panes[pane]) return;
  setSpotMode(false);
  activePane = pane;
  document.querySelectorAll(".review-switch button").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.preview === pane)));
  $("copyHtml").textContent = panes[pane].copyLabel;
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
    return inner?.closest?.("[data-website-spot]") || spotNode("project-page");
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
document.querySelectorAll(".review-switch button").forEach(button => button.addEventListener("click", () => selectPane(button.dataset.preview)));
$("commentsToggle").addEventListener("click", () => showDrawer($("commentDrawer").hidden));
$("closeDrawer").addEventListener("click", () => showDrawer(false));
$("cancelComment").addEventListener("click", () => { $("commentForm").hidden = true; draft = null; });
$("commentForm").addEventListener("submit", async event => {
  event.preventDefault(); if (!draft) return;
  try {
    const payload = draft.id ? { action: "update", id: draft.id, text: $("commentText").value }
      : { action: "add", surface: draft.surface || panes[activePane].surface, spot: draft.spot, x: draft.x, y: draft.y, text: $("commentText").value };
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
    status(pane === "library" ? "The table page Custom HTML block is on your clipboard." : `The ${pane === "sbi" ? "SBI" : "proximity"} project update block is on your clipboard. Add it after the existing project block.`);
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
selectPane("library");
