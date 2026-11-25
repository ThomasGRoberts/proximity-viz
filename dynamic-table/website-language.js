// Hydrate the lab website's table introduction from the published editorial tab.
const LANGUAGE_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSuS29xd8KpFPmyz5xJmUiH8jeQNUqaFvf_7dPf8DN6QfKQgNSuzJ5FGfcMkN1giCjOvXA_ZJ8slera/pub?output=csv&gid=253374416";
const THOMAS = "Thomas G. Roberts";
const PAGE_TITLE = "Episodes of Concerning Satellite Proximity";
const portraits = { "thomas g. roberts": "https://thomasgroberts.github.io/proximity-viz/dynamic-table/assets/contributors/thomas-gonzalez-roberts.jpg" };
const profileAnchors = { "thomas g. roberts": "biography" };
const key = name => name.normalize("NFKD").replace(/\p{M}/gu, "").trim().toLowerCase();

// WordPress may retain an earlier full-page block when a replacement is pasted below it.
// Keep the newest block so the table, contributors, and return route have one destination.
const tablePages = [...document.querySelectorAll("[data-espl-episodes-page]")];
for (const previous of tablePages.slice(0, -1)) previous.remove();

// Preserve the selected episode when returning from a full visualization.
const pageParams = new URLSearchParams(location.search);
const requestedEpisode = pageParams.get("episode") || pageParams.get("review");
if (requestedEpisode && /^E-\d{3}$/.test(requestedEpisode)) {
  for (const frame of document.querySelectorAll("[data-espl-episodes-page] iframe")) {
    const url = new URL(frame.src);
    url.searchParams.set("episode", requestedEpisode);
    url.searchParams.delete("review");
    if (frame.src !== url.href) frame.src = url.href;
  }
}

function showModelWarning(url) {
  let dialog = document.getElementById("espl-table-model-warning");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "espl-table-model-warning";
    dialog.style.cssText = "position:fixed;inset:0;box-sizing:border-box;width:min(420px,calc(100vw - 28px));max-height:calc(100dvh - 28px);margin:auto;padding:20px;border:1px solid #d9d0b7;border-radius:12px;background:#fff;color:#333;box-shadow:0 18px 45px #0003;font:13px/1.5 system-ui,sans-serif";
    dialog.innerHTML = '<h2 style="margin:0 0 8px;font-size:18px">Open the orbital model?</h2><p style="margin:0 0 18px;color:#555">The interactive model works best on a larger screen. You can still open it here.</p><div style="display:flex;justify-content:flex-end;gap:12px"><button type="button" style="padding:8px 11px;border:1px solid #d8d8d8;border-radius:6px;background:#fff">Stay here</button><a style="padding:8px 11px;border:1px solid #d5ad39;border-radius:6px;background:#fff6dc;color:#333;font-weight:700;text-decoration:none">Open model</a></div>';
    dialog.querySelector("button").addEventListener("click", () => dialog.close());
    dialog.querySelector("a").addEventListener("click", () => dialog.close());
    document.body.append(dialog);
  }
  dialog.querySelector("a").href = url;
  if (!dialog.open) dialog.showModal();
}

if (!window.__esplTableFrameMessageListener) {
  window.__esplTableFrameMessageListener = true;
  window.addEventListener("message", event => {
    for (const frame of document.querySelectorAll("[data-espl-episodes-page] iframe")) {
      if (frame.contentWindow !== event.source || new URL(frame.src).origin !== event.origin) continue;
      if (event.data?.type === "espl-table-height" && Number.isFinite(event.data.height)) {
        frame.style.height = `${Math.max(300, Math.ceil(event.data.height))}px`;
        frame.contentWindow.postMessage({ type: "espl-table-scroll-bridge" }, event.origin);
      } else if (event.data?.type === "espl-table-wheel" && Number.isFinite(event.data.deltaY)) {
        window.scrollBy(0, event.data.deltaY);
      } else if (event.data?.type === "espl-table-row" && Number.isFinite(event.data.top)) {
        const top = window.scrollY + frame.getBoundingClientRect().top + event.data.top - 8;
        window.scrollTo(0, Math.max(0, top));
      } else if (event.data?.type === "espl-table-model-warning") {
        try {
          const destination = new URL(event.data.url);
          if (destination.protocol === "https:" && ["espl.ae.gatech.edu", "thomasgroberts.github.io"].includes(destination.hostname)) showModelWarning(destination.href);
        } catch { /* Ignore invalid model links. */ }
      }
      break;
    }
  });
}
for (const frame of document.querySelectorAll("[data-espl-episodes-page] iframe")) {
  const ready = () => frame.contentWindow?.postMessage({ type: "espl-table-scroll-bridge" }, new URL(frame.src).origin);
  frame.addEventListener("load", ready);
  ready();
}

void fetch("https://api.github.com/repos/ThomasGRoberts/proximity-viz/commits/main", { cache: "no-store" })
  .then(response => { if (!response.ok) throw new Error(`GitHub returned ${response.status}`); return response.json(); })
  .then(commit => {
    const date = new Date(commit.commit?.committer?.date);
    if (!Number.isFinite(date.valueOf())) throw new Error("Commit date unavailable");
    const label = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" }).format(date);
    document.querySelectorAll("[data-espl-last-updated]").forEach(node => { node.textContent = label; });
  }).catch(() => document.querySelectorAll("[data-espl-last-updated]").forEach(node => { node.textContent = "date unavailable"; }));

function csvRows(text) {
  const rows = []; let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  row.push(cell); if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

async function loadStudentContributors() {
  const base = "https://docs.google.com/spreadsheets/d/e/2PACX-1vREf4bo6ZknVw_ITND5Rtfe8RJufodwkihs9GZBf5p_7tlE5wwgDPcPd9jFjFa2wF4WJP296jhPuApz/pub?output=csv";
  await Promise.all(["", "&gid=466308581&single=true"].map(async suffix => {
    const response = await fetch(`${base}${suffix}&refresh=${Date.now()}`, {cache: "no-store", credentials: "omit"});
    if (!response.ok) throw new Error(`ESPL Students returned ${response.status}`);
    const [headers, ...rows] = csvRows(await response.text());
    const field = (row, name) => String(row[headers.indexOf(name)] || "").trim();
    if (!["Name", "Anchor Name", "Photo File", "Alternate Name(s)"].every(name => headers.includes(name))) throw new Error("ESPL Students headers changed");
    for (const row of rows) {
      const anchor = field(row, "Anchor Name"), photo = field(row, "Photo File");
      if (!anchor || !photo) continue;
      const src = new URL(photo.replace(/^\//, ""), "https://sites.gatech.edu/thomas-test-website/").href;
      const names = [field(row, "Name"), ...field(row, "Alternate Name(s)").split(/[,;]+/).map(name => name.trim())];
      for (const name of names) if (name) { portraits[key(name)] = src; profileAnchors[key(name)] = anchor; }
    }
  }));
}

function safeIntroduction(markup) {
  const source = new DOMParser().parseFromString(markup, "text/html").body;
  const result = document.createDocumentFragment();
  const allowed = new Set(["P", "BR", "EM", "I", "STRONG", "B", "A", "UL", "OL", "LI"]);
  const discarded = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH", "IMG", "FORM"]);
  function copy(node, parent) {
    if (node.nodeType === Node.TEXT_NODE) { parent.append(document.createTextNode(node.textContent)); return; }
    if (node.nodeType !== Node.ELEMENT_NODE || discarded.has(node.tagName)) return;
    const next = allowed.has(node.tagName) ? document.createElement(node.tagName.toLowerCase()) : parent;
    if (node.tagName === "A") {
      try {
        const href = node.getAttribute("href");
        if (!href) throw new Error("Link has no destination");
        const url = new URL(href, location.href);
        if (["https:", "http:"].includes(url.protocol)) {
          next.href = url.href; next.target = "_blank"; next.rel = "noopener noreferrer";
        }
      } catch { /* Keep the link text. */ }
    }
    for (const child of node.childNodes) copy(child, next);
    if (next !== parent) parent.append(next);
  }
  for (const child of source.childNodes) copy(child, result);
  return result;
}

function renderContributors(host, cell) {
  const names = [...new Set(cell.replace(/,?\s+and\s+/gi, ",").split(/[,;\n]/).map(name => name.trim()).filter(Boolean))]
    .filter(name => key(name) !== key(THOMAS));
  names.push(THOMAS);
  const list = document.createDocumentFragment();
  for (const name of names) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = `https://espl.ae.gatech.edu/people/#${profileAnchors[key(name)] || "lab-members"}`;
    link.setAttribute("aria-label", `${name}’s biography`);
    const portrait = portraits[key(name)];
    if (portrait) {
      const image = document.createElement("img");
      image.src = portrait;
      image.alt = name; image.loading = "lazy"; link.append(image);
    } else {
      const initials = document.createElement("span"); initials.className = "espl-contributor-initials";
      initials.textContent = name.split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase();
      initials.setAttribute("aria-hidden", "true"); link.append(initials);
    }
    item.append(link); list.append(item);
  }
  host.replaceChildren(list);
  const namesLine = host.closest(".contributors")?.querySelector("[data-espl-contributor-names]");
  if (namesLine) {
    const parts = document.createDocumentFragment();
    names.forEach((name, index) => {
      if (index) parts.append(document.createTextNode(index === names.length - 1 ? (names.length > 2 ? ", and " : " and ") : ", "));
      if (key(name) === key(THOMAS)) { const link = document.createElement("a"); link.href = "https://espl.ae.gatech.edu/people/#biography"; link.textContent = THOMAS; parts.append(link); return; }
      const link = document.createElement("a");
      link.href = `https://espl.ae.gatech.edu/people/#${profileAnchors[key(name)] || key(name).replace(/[^a-z0-9]+/g, "-")}`;
      link.textContent = name;
      parts.append(link);
    });
    namesLine.replaceChildren(parts);
  }
}

try {
  const response = await fetch(`${LANGUAGE_CSV}&refresh=${Date.now()}`, { cache: "no-store", credentials: "omit" });
  if (!response.ok) throw new Error(`Website Language tab returned ${response.status}`);
  const rows = csvRows(await response.text());
  if (rows[0]?.[0]?.replace(/^\uFEFF/, "").trim() !== "Introduction HTML" || rows[0]?.[1]?.trim() !== "Contributors")
    throw new Error("Website Language headers changed");
  const [introduction = "", contributors = ""] = rows[1] || [];
  if (!introduction.trim()) throw new Error("Website Language A2 is empty");
  for (const page of document.querySelectorAll("[data-espl-episodes-page]")) {
    page.querySelector("[data-espl-title]")?.replaceChildren(PAGE_TITLE);
    page.querySelector("[data-espl-introduction]")?.replaceChildren(safeIntroduction(introduction));
    page.dataset.languageSource = "live";
  }
} catch (error) {
  console.warn("Website language unavailable; the introductory panel is awaiting live text.", error);
}

// The table's publication record is the authority for its contributor roster.
try {
  const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRN6Pc85vfaqu_XEU4MQC9HTGckmU9k5AXtSXuy8iOp5uPUcOrbJdI1Lmklqtqp4IpAdQoO3TtrEZuR/pub?output=csv";
  const response = await fetch(`${url}&refresh=${Date.now()}`, {cache: "no-store", credentials: "omit"});
  if (!response.ok) throw new Error(`Publications sheet returned ${response.status}`);
  const [headers, ...rows] = csvRows(await response.text());
  const titleIndex = headers.indexOf("Title"), authorsIndex = headers.indexOf("Authors");
  if (titleIndex < 0 || authorsIndex < 0) throw new Error("Publications headers changed");
  const record = rows.find(row => row[titleIndex]?.trim() === PAGE_TITLE);
  if (!record?.[authorsIndex]) throw new Error("Table publication record unavailable");
  await loadStudentContributors();
  for (const page of document.querySelectorAll("[data-espl-episodes-page]")) {
    const people = page.querySelector("[data-espl-contributors]");
    if (people) renderContributors(people, record[authorsIndex]);
  }
} catch (error) { console.warn("Table publication contributors unavailable.", error); }
