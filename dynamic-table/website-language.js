// Hydrate the lab website's table introduction from the published editorial tab.
const LANGUAGE_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSuS29xd8KpFPmyz5xJmUiH8jeQNUqaFvf_7dPf8DN6QfKQgNSuzJ5FGfcMkN1giCjOvXA_ZJ8slera/pub?output=csv&gid=253374416";
const THOMAS = "Thomas González Roberts";
const portraits = {
  "dayana alagirova": "dayana-alagirova.jpg",
  "kate futrowsky": "kate-futrowsky.jpg",
  "willa madsen": "willa-madsen.jpg",
  "pradosh sivaramkumar": "pradosh-sivaramkumar.jpg",
  "thomas gonzalez roberts": "thomas-gonzalez-roberts.jpg",
};
const key = name => name.normalize("NFKD").replace(/\p{M}/gu, "").trim().toLowerCase();

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
  const names = [...new Set(cell.split(/[,;\n]/).map(name => name.trim()).filter(Boolean))]
    .filter(name => key(name) !== key(THOMAS));
  names.push(THOMAS);
  const list = document.createDocumentFragment();
  for (const name of names) {
    const item = document.createElement("li");
    const portrait = portraits[key(name)];
    if (portrait) {
      const image = document.createElement("img");
      image.src = new URL(`./assets/contributors/${portrait}`, import.meta.url).href;
      image.alt = ""; image.loading = "lazy"; item.append(image);
    } else {
      const initials = document.createElement("span"); initials.className = "espl-contributor-initials";
      initials.textContent = name.split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase();
      initials.setAttribute("aria-hidden", "true"); item.append(initials);
    }
    item.append(document.createTextNode(name)); list.append(item);
  }
  host.replaceChildren(list);
}

try {
  const response = await fetch(`${LANGUAGE_CSV}&refresh=${Date.now()}`, { cache: "no-store", credentials: "omit" });
  if (!response.ok) throw new Error(`Website Language tab returned ${response.status}`);
  const rows = csvRows(await response.text());
  if (rows[0]?.[0]?.replace(/^\uFEFF/, "").trim() !== "Introduction HTML" || rows[0]?.[1]?.trim() !== "Contributors")
    throw new Error("Website Language headers changed");
  const [introduction = "", contributors = ""] = rows[1] || [];
  for (const page of document.querySelectorAll("[data-espl-episodes-page]")) {
    if (introduction.trim()) page.querySelector("[data-espl-introduction]")?.replaceChildren(safeIntroduction(introduction));
    const people = page.querySelector("[data-espl-contributors]");
    if (people) renderContributors(people, contributors);
    page.dataset.languageSource = "live";
  }
} catch (error) {
  console.warn("Website language unavailable; showing the page's introductory fallback.", error);
}
