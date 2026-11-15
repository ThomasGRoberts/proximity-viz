import { emojiForOwner, flagsForOwner } from "./flag-icons.js";
import { renderSatelliteShortcodes } from "./satellite-shortcodes.js";
import { loadCurrentEpisodes, loadCurrentDescriptions, episodeUtcInterval } from "../shared/episode-feed.js";
import { calculateE001 } from "../shared/e001-live-metrics.js";
import { safeEpisodeName, episodeNameText } from "../shared/episode-name.js";
import { applyMarkerCssVariables } from "../shared/marker-spec.js?v=3";

applyMarkerCssVariables();

const $ = selector => document.querySelector(selector);
const el = (tag, className = "", value) => { const node = document.createElement(tag); if (className) node.className = className; if (value !== undefined) node.textContent = value; return node; };
const field = (row, ...names) => {
  const cells = Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]/g, ""), String(value ?? "").trim()]));
  return names.map(name => cells[name.toLowerCase().replace(/[^a-z0-9]/g, "")]).find(Boolean) || "";
};
const safeUrl = value => { try { const url = new URL(value); return /^https?:$/.test(url.protocol) ? url.href : ""; } catch { return ""; } };
const EARTH_COLORS = { warm: 0xe8e5df, stone: 0xe6e6e1, taupe: 0xe6e1db, neutral: 0xedeae5 };
const state = { live: null, preview: null, series: null, seriesPromise: null, usePreview: false, selected: null, query: "", orbit: "", earthColor: "neutral", sort: { key: "index", direction: "asc" }, glossary: [], details: new Map(), detailPending: new Map(), detailFailures: new Set() };
const prefetch = { queue: [], active: 0, scheduled: false, images: [], imageActive: 0, imageSeen: new Set() };
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");


function dateText(value) {
  if (!value) return "Date not recorded";
  const iso = String(value).match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!iso) return value;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date) + value.slice(iso.length);
}
function fullDate(value) {
  const iso = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== iso ? "" :
    new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}
function periodInfo(row) {
  const start = field(row, "Start Date", "Date"), end = field(row, "End Date");
  const portion = value => {
    const found = String(value).match(/^(\d{4})(?:-(\d{2}))?/);
    if (!found) return null;
    const year = Number(found[1]), month = Number(found[2]);
    if (!month) return { year, label: String(year), part: "" };
    if (month < 1 || month > 12) return null;
    const part = month <= 4 ? "early" : month <= 8 ? "mid" : "late";
    return { year, label: `${part[0].toUpperCase()}${part.slice(1)} ${year}`, part };
  };
  const a = portion(start), b = portion(end);
  const days = fullDate(start) && fullDate(end) && end >= start ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1 : null;
  if (!a && !b) return { label: "Dates not recorded", days };
  if (!b || !a || end < start || a.label === b.label) return { label: a?.label || b.label, days };
  return { label: a.year === b.year && a.part && b.part ? `${a.label.split(" ")[0]} to ${b.part} ${a.year}` : `${a.label} to ${b.label[0].toLowerCase()}${b.label.slice(1)}`, days };
}
function period(row) { return periodInfo(row).label; }
function dateKey(row) { return field(row, "Start Date", "Date").match(/^\d{4}(?:-\d{2})?(?:-\d{2})?/)?.[0] || ""; }
function descriptionIds(row) { return field(row, "Descriptions").split(/[,;\n]/).map(x => x.trim()).filter(Boolean); }
function linkedDescriptions(row, data) {
  const lookup = new Map((data.descriptions || []).map(d => [field(d, "ID", "Description ID").toUpperCase(), d]));
  const episode = field(row, "ID").toUpperCase();
  return descriptionIds(row).map(id => ({ id, row: lookup.get(id.toUpperCase()) })).filter(item => item.row && field(item.row, "Episode", "Episode ID").toUpperCase() === episode);
}
function sourceGroups(row, data) {
  const groups = new Map();
  for (const item of linkedDescriptions(row, data)) {
    const ref = field(item.row, "Source URL", "URL", "Link", "Source link");
    const url = safeUrl(ref);
    const key = ref || `record:${item.id}`;
    if (!groups.has(key)) groups.set(key, { url, ref, items: [] });
    groups.get(key).items.push(item);
  }
  const publicationDay = group => {
    const value = data.sourceMetadata?.[group.ref]?.publishedDate || field(group.items[0]?.row, "Publication date", "Published date");
    const iso = String(value || "").match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
    return iso && fullDate(iso) ? Date.parse(`${iso}T00:00:00Z`) : Infinity;
  };
  // Map insertion order is the linked-record order; stable sort preserves ties and undated records.
  return [...groups.values()].sort((a, b) => publicationDay(a) - publicationDay(b));
}
function organizationKind(info) {
  if (/^INTELSAT\b/i.test(info.name)) return "Intelsat";
  if (info.owner === "ESA" || /^(?:ESA |ESA-)/i.test(info.name)) return "ESA";
  if (/^(?:EUTELSAT|INMARSAT|SES\b)/i.test(info.name)) return "International operator";
  return "";
}
function ownerDisplay(info) {
  if (info.owner === "CIS") return "Russia (CIS)";
  if (info.owner === "FRIT") return "France / Italy";
  return info.ownerName || info.owner;
}
function ownerIndicators(info, compact = false) {
  const org = organizationKind(info);
  if (org && compact) { const badge = el("span", "organization-badge", org === "Intelsat" ? "Intelsat" : org === "ESA" ? "ESA" : "Intl."); badge.title = `${org} text indicator`; badge.setAttribute("aria-label", `${org} text indicator`); return [badge]; }
  const flags = flagsForOwner(info.owner);
  if (flags.length) return flags;
  if (org) { const badge = el("span", "organization-badge", org === "Intelsat" ? "Intelsat" : org === "ESA" ? "ESA" : "Intl."); badge.title = `${org} text indicator`; return [badge]; }
  return [];
}
function objectInfo(row, role, data) {
  const raw = field(row, `Object ${role}`);
  if (!raw || /^(?:not applicable|not assigned|none|—|-)(?:\b|$)/i.test(raw)) return null;
  const record = data.celestrak?.objects?.[raw.toUpperCase()] || null;
  const satcat = record?.status === "resolved" ? record.satcat : null;
  const compact = data.compactObjects?.[raw.toUpperCase()] || currentData()?.compactObjects?.[raw.toUpperCase()] || {};
  return { role, raw, record, satcat, gp: record?.gp || null,
    cospar: satcat?.OBJECT_ID || compact.cospar || raw, norad: satcat?.NORAD_CAT_ID || compact.norad || "",
    name: satcat?.OBJECT_NAME || compact.name || raw, owner: satcat?.OWNER || "",
    ownerName: record?.ownerName || "", launchSite: data.celestrak?.csisLaunchSites?.[satcat?.LAUNCH_SITE] || data.celestrak?.launchSites?.[satcat?.LAUNCH_SITE] || satcat?.LAUNCH_SITE || "",
    launchSiteFromCsis: !!data.celestrak?.csisLaunchSites?.[satcat?.LAUNCH_SITE], csisSourceUrl: data.celestrak?.csisSourceUrl || "" };
}
function titleMarkup(row) { return field(row, "Episode Name", "Episode label", "Episode Title", "Title") || field(row, "ID") || "Unnamed episode"; }
function title(row) { return episodeNameText(titleMarkup(row)); }
function episodeDescription(row) { return field(row, "Episode Description"); }
function formattedDescription(value) {
  const fragment = document.createDocumentFragment();
  const parsed = new DOMParser().parseFromString(`<div>${value}</div>`, "text/html").body.firstElementChild;
  const allowed = new Set(["P", "EM", "I", "STRONG", "B", "BR"]);
  function copy(source, target) {
    for (const child of source.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) target.append(document.createTextNode(child.textContent.replace(/(\p{L})'(\p{L})/gu, "$1’$2")));
      else if (child.nodeType === Node.ELEMENT_NODE && !["SCRIPT", "STYLE", "IFRAME", "SVG"].includes(child.tagName)) {
        const next = allowed.has(child.tagName) ? document.createElement(child.tagName.toLowerCase()) : target;
        if (next !== target) { if (next.tagName === "P") next.className = "episode-description"; target.append(next); }
        copy(child, next);
      }
    }
  }
  if (parsed.querySelector("p")) copy(parsed, fragment);
  else { const paragraph = el("p", "episode-description"); copy(parsed, paragraph); fragment.append(paragraph); }
  return fragment;
}
function account(row) { return field(row, "Reported behavior", "Short Description", "Summary", "Context", "Description"); }
function regime(row) { return field(row, "Orbital Regime", "Orbit Regime", "Orbit", "Regime") || "Not recorded"; }
function regimeShort(row) { const full = regime(row), match = full.match(/\b(LEO|MEO|GEO|HEO|GTO|SSO)\b/i); return match ? match[1].toUpperCase() : /sun[ -]?synchronous/i.test(full) ? "SSO" : full; }

function externalLink(label, url) {
  const a = el("a", "espl-external"); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
  a.append(document.createTextNode(label));
  a.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path class="espl-news-external__box" d="M7.25 4.25H4.5A1.75 1.75 0 0 0 2.75 6v7.5a1.75 1.75 0 0 0 1.75 1.75H12a1.75 1.75 0 0 0 1.75-1.75v-2.75"></path><g class="espl-news-external__arrow"><path d="M9.25 2.75h6v6"></path><path d="m8 10 7.25-7.25"></path></g></svg>');
  return a;
}
function visualizationLink(url, label = "Open orbital visualization") {
  const link = el("a", "visual-link model-link"); link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.setAttribute("aria-label", label);
  const preview = el("div", "orbital-preview");
  const action = el("span", "model-action"), icon = el("span", "model-icon"), fallback = el("img", "model-static"), flourish = el("canvas", "model-canvas");
  fallback.src = "./assets/polyhedron-icon.png"; fallback.alt = "";
  flourish.width = flourish.height = 116; flourish.setAttribute("aria-hidden", "true");
  icon.append(fallback, flourish);
  action.append(icon, el("span", "model-label", "Explore the interactive model"), el("span", "model-arrow", "→"));
  link.append(preview, action);
  import("./model-link.js?v=3").then(module => module.decorateModelLink(link)).catch(() => link.classList.add("model-static-fallback"));
  return link;
}

const popover = el("div", "object-popover"); popover.id = "object-popover"; popover.hidden = true; popover.setAttribute("role", "dialog"); popover.setAttribute("aria-label", "Space object metadata"); document.body.append(popover);
let activeObject = null, pinnedObject = false, hideTimer = null, showTimer = null;
function closeObject() { clearTimeout(hideTimer); clearTimeout(showTimer); if (activeObject) activeObject.setAttribute("aria-expanded", "false"); activeObject = null; pinnedObject = false; popover.hidden = true; }
function scheduleObjectClose() { clearTimeout(hideTimer); clearTimeout(showTimer); if (!pinnedObject) hideTimer = setTimeout(() => { if (!popover.matches(":hover") && !popover.contains(document.activeElement)) closeObject(); }, 320); }
function addMetadata(dl, label, value) { if (!value) return; const item = el("div"); item.append(el("dt", "", label), el("dd", "", value)); dl.append(item); }
const launchFlagEmoji = { AFETR:["🇺🇸"], AFWTR:["🇺🇸"], DLS:["🇷🇺"], FRGUI:["🇫🇷"], JSC:["🇨🇳"], PLMSC:["🇷🇺"], RLLB:["🇳🇿"], SRILR:["🇮🇳"], TAISC:["🇨🇳"], TANSC:["🇯🇵"], TYMSC:["🇰🇿","🇷🇺"], WSC:["🇨🇳"], XICLF:["🇨🇳"] };
function buildObjectPopover(info) {
  popover.replaceChildren(); popover.append(el("strong", "object-popover-title", info.name));
  if (!info.satcat) {
    popover.append(el("p", "metadata-note", `No exact CelesTrak SATCAT match for ${info.raw}. Identity remains unresolved.`));
    popover.append(externalLink("CelesTrak SATCAT search", `https://celestrak.org/satcat/search.php?SEARCH=${encodeURIComponent(info.raw)}`));
    return;
  }
  const s = info.satcat, dl = el("dl", "object-meta");
  const objectTypes = { PAY:"Payload", "R/B":"Rocket body", DEB:"Debris", TBA:"To be assigned" };
  addMetadata(dl, "COSPAR", s.OBJECT_ID);
  addMetadata(dl, "NORAD", s.NORAD_CAT_ID);
  const ownerRow = el("div"), ownerValue = el("dd"); ownerRow.append(el("dt", "", "Country / Org."));
  ownerValue.append(document.createTextNode(ownerDisplay(info)));
  if (!organizationKind(info)) for (const flag of emojiForOwner(info.owner)) ownerValue.append(document.createTextNode(` ${flag}`));
  ownerRow.append(ownerValue); dl.append(ownerRow);
  addMetadata(dl, "Object type", objectTypes[s.OBJECT_TYPE] || s.OBJECT_TYPE);
  addMetadata(dl, "Launch date", fullDate(s.LAUNCH_DATE));
  if (info.launchSite) addMetadata(dl, "Launch site", `${info.launchSite.replace(/\s*\(/g, " (")}${(launchFlagEmoji[s.LAUNCH_SITE] || []).map(flag => ` ${flag}`).join("")}`);
  popover.append(dl);
  const sourceRow = el("div", "object-source-row"), sourceValue = el("dd");
  sourceRow.append(el("dt", "", "Data Source"));
  sourceValue.append(externalLink("CelesTrak SATCAT", info.record?.recordUrl || `https://celestrak.org/satcat/search.php?SEARCH=${encodeURIComponent(s.NORAD_CAT_ID)}`));
  sourceRow.append(sourceValue); dl.append(sourceRow);
}
function positionObject() {
  if (!activeObject || popover.hidden) return;
  const trigger = activeObject.getBoundingClientRect(), width = popover.offsetWidth, height = popover.offsetHeight;
  const left = Math.max(10, Math.min(trigger.left, innerWidth - width - 10));
  const above = trigger.bottom + height + 12 > innerHeight && trigger.top > height + 12;
  const top = above ? trigger.top - height - 8 : trigger.bottom + 8;
  popover.style.left = `${left}px`; popover.style.top = `${Math.max(8, top)}px`;
}
function showObject(button, info, pin = false, row = null) {
  clearTimeout(hideTimer);
  if (activeObject && activeObject !== button) activeObject.setAttribute("aria-expanded", "false");
  activeObject = button; pinnedObject = pin; button.setAttribute("aria-expanded", "true");
  const cached = row && state.details.get(field(row, "ID"));
  if (cached) buildObjectPopover(objectInfo(cached.row, info.role, cached));
  else if (row && currentData()?.source === "live") {
    popover.replaceChildren(el("span", "metadata-note", "Loading CelesTrak record…"));
    ensureDetail(row).then(detail => {
      if (activeObject !== button || !detail) return;
      buildObjectPopover(objectInfo(detail.row, info.role, detail)); positionObject();
    }).catch(() => { if (activeObject === button) popover.replaceChildren(el("span", "metadata-note", "Catalog details unavailable.")); });
  } else buildObjectPopover(info);
  popover.hidden = false; positionObject();
}
popover.addEventListener("pointerenter", () => clearTimeout(hideTimer));
popover.addEventListener("pointerleave", scheduleObjectClose);
document.addEventListener("pointerdown", event => { if (activeObject && !activeObject.contains(event.target) && !popover.contains(event.target)) closeObject(); });
document.addEventListener("keydown", event => { if (event.key === "Escape") closeObject(); });
window.addEventListener("resize", positionObject); window.addEventListener("scroll", positionObject, true);
function objectNode(info, row) {
  const line = el("div", "object-line"), button = el("button", "object-trigger", info.name);
  button.type = "button"; button.setAttribute("aria-haspopup", "dialog"); button.setAttribute("aria-expanded", "false"); button.setAttribute("aria-label", `${info.name}, show object metadata`);
  line.append(el("span", `dot ${info.role.toLowerCase()}`), button);
  if (info.cospar) line.append(el("span", "object-id", info.cospar));
  button.addEventListener("pointerenter", () => { if (matchMedia("(hover:hover)").matches) { clearTimeout(hideTimer); clearTimeout(showTimer); showTimer = setTimeout(() => showObject(button, info, false, row), 90); } });
  button.addEventListener("pointerleave", scheduleObjectClose);
  button.addEventListener("focus", () => showObject(button, info, false, row));
  button.addEventListener("blur", () => { if (!popover.contains(document.activeElement)) scheduleObjectClose(); });
  button.addEventListener("click", event => { event.stopPropagation(); if (activeObject === button && pinnedObject) closeObject(); else showObject(button, info, true, row); });
  return line;
}
function objects(row, data) {
  const wrap = el("div", "objects");
  for (const role of ["A", "B", "C"]) { const info = objectInfo(row, role, data); if (info) wrap.append(objectNode(info, row)); }
  if (!wrap.children.length) wrap.append(el("span", "muted", "Objects not recorded"));
  return wrap;
}

function glossaryText(value) {
  const fragment = document.createDocumentFragment();
  const variants = state.glossary.flatMap(entry => [field(entry, "Term"), ...field(entry, "Acronym").split(";").map(x => x.trim())].filter(Boolean).map(label => ({ label, entry }))).sort((a, b) => b.label.length - a.label.length);
  if (!variants.length) { fragment.append(document.createTextNode(value)); return fragment; }
  const escaped = variants.map(item => item.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  let expression; try { expression = new RegExp(`(^|[^\\p{L}\\p{N}])(${escaped.join("|")})(?=$|[^\\p{L}\\p{N}])`, "giu"); } catch { fragment.append(document.createTextNode(value)); return fragment; }
  let cursor = 0, match;
  while ((match = expression.exec(value))) {
    const start = match.index + match[1].length, label = match[2]; if (start < cursor) continue;
    const entry = variants.find(item => item.label.toLocaleLowerCase() === label.toLocaleLowerCase())?.entry; if (!entry) continue;
    fragment.append(document.createTextNode(value.slice(cursor, start)));
    const term = el("span", "gterm", label); term.tabIndex = 0; term.setAttribute("aria-label", `${label}: ${field(entry, "Definition")}`); term.append(el("span", "gterm-tip", field(entry, "Definition")));
    fragment.append(term); cursor = start + label.length;
  }
  fragment.append(document.createTextNode(value.slice(cursor))); return fragment;
}

function descriptionText(value) { return glossaryText(value); }
export function episodeDescriptionText(value, row, data) {
  return renderSatelliteShortcodes(value, descriptionText, id => {
    const role = ["A", "B", "C"].find(candidate => field(row, `Object ${candidate}`).toUpperCase() === id);
    if (!role) return null;
    const info = objectInfo(row, role, data);
    if (!info) return null;
    const node = objectNode(info, row);
    node.classList.add("sat-shortcode");
    return node;
  });
}

function currentData() { return state.usePreview && state.live?.source !== "live" ? state.preview : state.live; }
function visibleRows() {
  const data = currentData(); if (!data) return [];
  const approved = new Set(data.approvedEpisodeIds || []);
  const publicRows = state.usePreview ? data.episodes : data.episodes.filter(row => approved.size ? approved.has(field(row, "ID")) : false);
  const query = state.query.toLocaleLowerCase();
  const rows = publicRows.filter(row => {
    if (state.orbit && regime(row) !== state.orbit) return false;
    if (!query) return true;
    const terms = [field(row, "ID"), title(row), episodeDescription(row), account(row), regime(row), ...["A", "B", "C"].flatMap(role => { const info = objectInfo(row, role, data); return info ? [info.name, info.cospar, info.norad] : []; })];
    return terms.join(" ").toLocaleLowerCase().includes(query);
  });
  const { key, direction } = state.sort, sign = direction === "asc" ? 1 : -1;
  if (key === "index") return rows;
  rows.sort((a, b) => {
    let av, bv;
    if (key === "date") { av = dateKey(a); bv = dateKey(b); if (!av) return bv ? 1 : 0; if (!bv) return -1; }
    else if (key === "sources") { av = linkedDescriptions(a, data).length; bv = linkedDescriptions(b, data).length; }
    else if (key === "distance" || key === "speed") {
      av = field(a, "ID") === "E-001" ? state.series?.[key === "distance" ? "minimumDistance" : "minimumSpeed"]?.value : null;
      bv = field(b, "ID") === "E-001" ? state.series?.[key === "distance" ? "minimumDistance" : "minimumSpeed"]?.value : null;
      if (!Number.isFinite(av)) return Number.isFinite(bv) ? 1 : 0;
      if (!Number.isFinite(bv)) return -1;
    }
    else { av = title(a); bv = title(b); }
    const compare = typeof av === "number" ? av - bv : av.localeCompare(bv, undefined, { numeric: true });
    return sign * compare || field(a, "ID").localeCompare(field(b, "ID"), undefined, { numeric: true });
  });
  return rows;
}
function updateOrbitOptions() {
  const select = $("#orbit"), data = currentData();
  const approved = new Set(data?.approvedEpisodeIds || []);
  const values = [...new Set((data?.episodes || []).filter(row => state.usePreview || approved.has(field(row, "ID"))).map(regime))].sort();
  select.replaceChildren(new Option("All regimes", ""), ...values.map(x => new Option(x, x)));
  if (!values.includes(state.orbit)) state.orbit = ""; select.value = state.orbit;
}
function updateSortHeaders() {
  for (const button of document.querySelectorAll(".sort-head")) {
    const active = button.dataset.sort === state.sort.key, th = button.closest("th");
    th.setAttribute("aria-sort", active ? (state.sort.direction === "desc" ? "descending" : "ascending") : "none");
    button.querySelector(".sort-indicator").textContent = active ? (state.sort.direction === "desc" ? "↓" : "↑") : "";
  }
}
function ensureDetail(row) {
  const id = field(row, "ID");
  if (state.details.has(id)) return Promise.resolve(state.details.get(id));
  if (state.detailPending.has(id)) return state.detailPending.get(id);
  const pending = Promise.resolve().then(() => {
    const data = state.live;
    const fullRow = data?.episodes?.find(item => field(item, "ID") === id);
    if (!fullRow) throw new Error(`Episode ${id} is unavailable`);
    const refs = new Set(descriptionIds(fullRow));
    const descriptions = (data.descriptions || []).filter(item => refs.has(field(item, "ID", "Description ID")) && field(item, "Episode", "Episode ID").toUpperCase() === id.toUpperCase());
    const urls = new Set(descriptions.map(item => field(item, "Source URL", "URL", "Link")));
    const objectIds = new Set(["A", "B", "C"].map(role => field(fullRow, `Object ${role}`).toUpperCase()).filter(Boolean));
    const detail = { source: data.source, row: fullRow, descriptions, sourceMetadata: Object.fromEntries(Object.entries(data.sourceMetadata || {}).filter(([url]) => urls.has(url))),
      celestrak: { ...(data.celestrak || {}), objects: Object.fromEntries(Object.entries(data.celestrak?.objects || {}).filter(([key]) => objectIds.has(key.toUpperCase()))) }, glossary: data.glossary || [] };
    state.details.set(id, detail); state.detailFailures.delete(id); state.glossary = detail.glossary || state.glossary;
    prefetchDetailImages(detail);
    return detail;
  }).finally(() => state.detailPending.delete(id));
  state.detailPending.set(id, pending); return pending;
}
function prefetchDetailImages(detail) {
  for (const meta of Object.values(detail.sourceMetadata || {})) {
    const path = meta.imagePath || meta.previewPath;
    if (!path || prefetch.imageSeen.has(path)) continue;
    prefetch.imageSeen.add(path); prefetch.images.push(path);
  }
  pumpImages();
}
function pumpImages() {
  while (prefetch.imageActive < 2 && prefetch.images.length) {
    const image = new Image(), path = prefetch.images.shift();
    prefetch.imageActive++;
    image.onload = image.onerror = () => { prefetch.imageActive--; pumpImages(); };
    image.src = path;
  }
}
function pumpDetails() {
  while (prefetch.active < 3 && prefetch.queue.length) {
    const row = prefetch.queue.shift(), id = field(row, "ID");
    if (state.details.has(id) || state.detailPending.has(id) || state.detailFailures.has(id)) continue;
    prefetch.active++;
    ensureDetail(row).catch(error => { state.detailFailures.add(id); console.warn(`Background detail unavailable for ${id}:`, error); })
      .finally(() => { prefetch.active--; pumpDetails(); });
  }
}
function scheduleDetailPrefetch() {
  if (prefetch.scheduled) return;
  prefetch.scheduled = true;
  requestAnimationFrame(() => {
    prefetch.scheduled = false;
    const rows = visibleRows(), visible = [], later = [];
    const rowElements = new Map([...document.querySelectorAll("#rows tr.episode-row")].map(node => [node.dataset.episodeId, node]));
    for (const row of rows) {
      const tr = rowElements.get(field(row, "ID"));
      const rect = tr?.getBoundingClientRect();
      (rect && rect.bottom > 0 && rect.top < innerHeight ? visible : later).push(row);
    }
    const seen = new Set();
    prefetch.queue = [...visible, ...later, ...prefetch.queue].filter(row => {
      const id = field(row, "ID");
      if (seen.has(id)) return false;
      seen.add(id);
      return !state.details.has(id) && !state.detailPending.has(id) && !state.detailFailures.has(id);
    });
    pumpDetails();
  });
}
function recordCategory(row) {
  const type = field(row, "Description type", "Voice type").toUpperCase();
  if (type.startsWith("T01")) return ["Official reaction", "announcement"];
  if (type.startsWith("T03")) return ["Technical account", "document"];
  if (type.startsWith("T04")) return ["Commentary", "press"];
  if (type.startsWith("T05")) return ["Research analysis", "document"];
  if (type.startsWith("T06")) return ["Technical observation", "press"];
  return ["Source record", "document"];
}
function categoryIcon(kind) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", kind === "announcement" ? "M3 10h4l10-5v14L7 14H3z M7 14l2 5h3 M20 9c1 2 1 4 0 6" : kind === "press" ? "M4 4h14v16H5a2 2 0 0 1-2-2V4z M18 7h3v11a2 2 0 0 1-2 2 M7 8h8 M7 12h8 M7 16h5" : "M6 3h9l4 4v14H6z M15 3v5h4 M9 12h7 M9 16h7");
  svg.append(path); return svg;
}
function sourceFallback(documentSource) {
  const fallback = el("span", "source-fallback");
  fallback.append(categoryIcon("document"), el("span", "", documentSource ? "Source document" : "Source image unavailable"));
  return fallback;
}
function sourceCard(group, data) {
  const { url, ref, items } = group, d = items[0].row, meta = data.sourceMetadata?.[ref] || {};
  const card = el("article", `source-card${url ? " source-clickable" : ""}`);
  if (url) {
    card.tabIndex = 0; card.setAttribute("role", "link"); card.setAttribute("aria-label", `Open original source: ${meta.titleEnglish || meta.title || ref}`);
    card.addEventListener("click", () => window.open(url, "_blank", "noopener,noreferrer"));
    card.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); window.open(url, "_blank", "noopener,noreferrer"); } });
  }
  const [category, kind] = recordCategory(d), eyebrow = el("div", "source-eyebrow"); eyebrow.append(categoryIcon(kind), el("span", "", category)); card.append(eyebrow);
  const document = meta.kind === "document" || /\.pdf(?:$|[?#])/i.test(ref);
  const media = el("div", `source-media${document ? " document-media" : ""}`);
  const imageUrl = meta.imagePath || meta.previewPath || safeUrl(meta.imageUrl) || "";
  if (imageUrl) {
    const img = el("img"); img.src = imageUrl; img.alt = meta.imageAlt || (meta.kind === "document" ? "First page of source document" : "Publisher's featured image for this source"); img.loading = "lazy";
    img.onerror = () => { img.remove(); media.append(sourceFallback(meta.kind === "document")); };
    media.append(img);
  } else media.append(sourceFallback(meta.kind === "document"));
  card.append(media);
  const content = el("div", "source-content");
  const needsTranslation = !meta.titleEnglish && meta.title && (/[\u0400-\u052f\u0600-\u06ff\u4e00-\u9fff]/u.test(meta.title) || (meta.language && !/^en(?:-|_|$)/i.test(meta.language)));
  const headline = meta.titleEnglish || (needsTranslation ? `Untranslated title: ${meta.title}` : meta.title) || (document ? (/statement/i.test(field(d, "Voice type", "Description type")) ? "Official statement" : "Source document") : "Source page");
  const heading = el("h4", "source-headline", headline);
  if (meta.titleEnglish && meta.title) { heading.title = `Original title: ${meta.title}`; heading.append(el("span", "visually-hidden", ` Original title: ${meta.title}`)); }
  content.append(heading);
  if (meta.publishedDate) content.append(el("time", "source-date", fullDate(meta.publishedDate) || dateText(meta.publishedDate)));
  else if (document && field(d, "Statement date")) content.append(el("span", "source-date", `Statement dated ${fullDate(field(d, "Statement date")) || dateText(field(d, "Statement date"))}`));
  const source = meta.publisher || field(d, "Source", "Publisher", "Organization", "Outlet", "State / affiliation / joint signatories") || (url ? new URL(url).hostname.replace(/^www\./, "") : "Source unavailable");
  const foot = el("div", "source-foot");
  const sourceGroup = el("span", "source-link-group"); sourceGroup.append(el("span", "source-publisher", source));
  if (url) { const arrow = el("span", "source-external-arrow"); arrow.setAttribute("aria-hidden", "true"); arrow.innerHTML = '<svg viewBox="0 0 18 18"><path d="M7.25 4.25H4.5A1.75 1.75 0 0 0 2.75 6v7.5a1.75 1.75 0 0 0 1.75 1.75H12a1.75 1.75 0 0 0 1.75-1.75v-2.75"/><g class="arrow-tip"><path d="M9.25 2.75h6v6"/><path d="m8 10 7.25-7.25"/></g></svg>'; sourceGroup.append(arrow); }
  foot.append(sourceGroup);
  content.append(foot);
  card.append(content); return card;
}
function expandedContent(row, data) {
  const episodeId = field(row, "ID");
  const wrap = el("div", `expanded-inner${["E-001", "E-002"].includes(episodeId) ? " has-visual" : ""}`);
  if (["E-001", "E-002"].includes(episodeId)) import("./globe-backdrop.js?v=2").then(module => module.mountGlobeBackdrop(wrap)).catch(console.warn);
  if (state.usePreview) wrap.append(el("p", "caution", data.source === "local-verification-candidates" ? "Verification worklist entry. The possible counterpart is not a confirmed episode participant." : "Local preview includes unpublished records. This is not the public selection."));
  const overview = el("div", "detail-overview");
  const context = el("section", "context-block"); context.setAttribute("aria-label", "Episode description");
  const description = episodeDescription(row);
  if (description) context.append(formattedDescription(description));
  else context.append(el("p", "description-pending", "Episode description pending editorial entry."));
  overview.append(context);
  if (["E-001", "E-002"].includes(episodeId)) {
    const viz = el("section", "visual-block"), target = new URL(episodeId === "E-001" ? "../visualization/" : "../visualization/Viz/compare.html?episode=E-002", location.href).href;
    viz.setAttribute("aria-label", `${episodeId} orbital visualization`);
    viz.append(visualizationLink(target, `Explore the interactive model for ${title(row)}`));
    overview.append(viz);
  } else overview.classList.add("no-visual");
  const evidence = el("section", "evidence-section"), found = linkedDescriptions(row, data), requested = descriptionIds(row), sources = sourceGroups(row, data);
  evidence.setAttribute("aria-label", `${found.length} source records`);
  if (requested.length > found.length) evidence.append(el("p", "caution", `${requested.length - found.length} referenced description ID(s) could not be resolved.`));
  if (!found.length) evidence.append(el("p", "muted", "No linked sources are available."));
  else {
    const grid = el("div", "source-grid"); let index = 0;
    const appendCard = (group, targetGrid) => {
      const sheet = el("div", "source-stack"); sheet.style.setProperty("--card-angle", ["-1.2deg", "1.1deg", "-.7deg", ".8deg"][index++ % 4]);
      sheet.append(sourceCard(group, data));
      if (group.items.length > 1) {
        const details = el("details", "source-records"), summary = el("summary", "", `${group.items.length} linked descriptions`); details.append(summary);
        for (const item of group.items) { const excerpt = field(item.row, "Statement excerpt", "Excerpt", "Quotation", "Quote", "Summary", "Description", "Text"); details.append(el("p", "", `${item.id}${excerpt ? `: ${excerpt}` : ""}`)); }
        sheet.append(details);
      }
      targetGrid.append(sheet);
    };
    sources.slice(0, 6).forEach(group => appendCard(group, grid));
    evidence.append(grid);
    if (sources.length > 6) { const more = el("details", "more-records"), summary = el("summary", "", `Show ${sources.length - 6} more source cards`), moreGrid = el("div", "source-grid"); sources.slice(6).forEach(group => appendCard(group, moreGrid)); more.append(summary, moreGrid); evidence.append(more); }
  }
  wrap.append(overview, evidence); return wrap;
}
function loadingDetail(row, data) {
  const wrap = el("div", "expanded-inner expanded-partial");
  wrap.setAttribute("aria-busy", "true");
  const context = el("section", "context-block");
  context.append(el("h3", "", "Description"), el("p", "description-pending", "Loading description and source records…"));
  context.append(el("p", "partial-period", period(row)), objects(row, data));
  wrap.append(context, el("p", "partial-records", `${linkedDescriptions(row, data).length} linked records; details loading…`));
  return wrap;
}
function animateIn(node) { if (!reducedMotion.matches) node.animate([{ opacity: 0, transform: "translateY(-5px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 190, easing: "ease-out" }); }
let scrollFrame = 0;
function toggleRow(row) {
  cancelAnimationFrame(scrollFrame);
  closeObject(); state.selected = state.selected === row ? null : row; render();
  const content = document.querySelector(".expanded-inner"); if (content) animateIn(content);
  if (state.selected) requestAnimationFrame(() => {
    const selected = [...document.querySelectorAll(".episode-row")].find(item => item.dataset.episodeId === field(row, "ID"));
    if (!selected) return;
    const stickyHeader = document.querySelector(".table-wrap thead th");
    const headerOffset = stickyHeader?.getBoundingClientRect().height || 0;
    const destination = Math.max(0, scrollY + selected.getBoundingClientRect().top - headerOffset - 14);
    if (reducedMotion.matches) { window.scrollTo(0, destination); return; }
    const origin = scrollY, distance = destination - origin, started = performance.now();
    const duration = Math.min(950, Math.max(620, Math.abs(distance) * .48));
    const step = now => {
      const fraction = Math.min(1, (now - started) / duration);
      const eased = fraction < .5 ? 4 * fraction ** 3 : 1 - (-2 * fraction + 2) ** 3 / 2;
      window.scrollTo(0, origin + distance * eased);
      if (fraction < 1) scrollFrame = requestAnimationFrame(step);
    };
    scrollFrame = requestAnimationFrame(step);
  });
}
function periodNode(row) { const node = el("span", "period-label", periodInfo(row).label); node.title = [fullDate(field(row, "Start Date", "Date")), fullDate(field(row, "End Date"))].filter(Boolean).join(" to "); return node; }
function proximityNode(row, key) {
  const cell = el("div", "proximity-cell");
  const metric = field(row, "ID") === "E-001" ? state.series?.[key === "distance" ? "minimumDistance" : "minimumSpeed"] : null;
  if (!Number.isFinite(metric?.value)) { cell.append(el("span", "plot-pending", field(row, "ID") === "E-001" && !state.series ? "Loading…" : "Unavailable")); return cell; }
  const value = metric.value < 100 ? metric.value.toFixed(1) : Math.round(metric.value).toLocaleString();
  cell.append(el("strong", "minimum-value", value), el("span", "minimum-unit", key === "distance" ? "km" : "m/s"));
  cell.title = `Minimum sampled ${key === "distance" ? "separation distance" : "relative velocity"}: ${value} ${key === "distance" ? "km" : "m/s"} on ${fullDate(new Date(metric.ms).toISOString().slice(0, 10))}`;
  return cell;
}
let previewScene = null, previewToken = 0;
function stopPreview() { previewToken++; previewScene?.dispose(); previewScene = null; }
function startPreview(row) {
  const episodeId = field(row, "ID");
  if (!["E-001", "E-002"].includes(episodeId)) return;
  const host = document.querySelector(".expanded-row .orbital-preview"); if (!host) return;
  if (episodeId === "E-002") {
    const frame = el("iframe", "e002-mini");
    frame.src = new URL("../visualization/dev/e002/mini.html", location.href).href;
    frame.title = "Animated E-002 relative-motion reconstruction, December 8, 2019";
    frame.tabIndex = -1; frame.setAttribute("aria-hidden", "true");
    host.append(frame); host.dataset.previewIntervalUtc = "2019-12-08T10:05:00Z / 2019-12-08T10:50:00Z";
    return;
  }
  const token = ++previewToken;
  let interval;
  try { interval = episodeUtcInterval(row); }
  catch (error) { console.warn("E-001 dates invalid", error); return; }
  Promise.all([import("./e001-preview.js?v=3"), state.seriesPromise?.catch(() => null) || Promise.resolve(state.series)])
    .then(([module, metrics]) => module.mountE001Preview(host, interval, metrics?.minimumDistance?.ms, EARTH_COLORS[state.earthColor])).then(scene => {
    if (token !== previewToken || !host.isConnected) scene?.dispose();
    else previewScene = scene;
  }).catch(error => { if (token === previewToken) { console.warn("E-001 preview unavailable", error); host.append(el("span", "orbital-error", "Orbital preview unavailable")); } });
}
function newsIndicator(row, count) {
  const wrap = el(count ? "button" : "span", "news-indicator");
  if (count) { wrap.type = "button"; wrap.setAttribute("aria-label", `Show ${count} linked ${count === 1 ? "record" : "records"} for ${title(row)}`); wrap.addEventListener("click", event => { event.stopPropagation(); toggleRow(row); }); }
  else wrap.setAttribute("aria-label", "0 linked records");
  const stack = el("span", `news-mini-stack cards-${Math.min(3, count)}`); stack.setAttribute("aria-hidden", "true");
  for (let index = 0; index < Math.min(3, count); index++) stack.append(el("span", "news-mini"));
  wrap.title = `${count} linked ${count === 1 ? "record" : "records"}`; wrap.append(stack); return wrap;
}
function render() {
  stopPreview(); closeObject(); updateOrbitOptions(); updateSortHeaders();
  const data = currentData(), rows = visibleRows();
  if (state.selected && !rows.includes(state.selected)) state.selected = null;
  $("#count").textContent = `${rows.length} ${state.usePreview ? "preview records" : "published episodes"}`;
  const body = $("#rows"); body.replaceChildren();
  for (const [index, row] of rows.entries()) {
    const open = state.selected === row, tr = el("tr", `episode-row${open ? " selected" : ""}`);
    tr.tabIndex = 0; tr.dataset.episodeId = field(row, "ID"); tr.setAttribute("aria-label", `${title(row)}, ${open ? "collapse" : "expand"} details`);
    tr.setAttribute("aria-expanded", String(open));
    if (open) tr.setAttribute("aria-controls", `episode-detail-${field(row, "ID")}`);
    const episode = el("td", "episode-cell"), heading = el("div", "episode-heading");
    const badge = el("span", "orbit-tag", regimeShort(row)); badge.title = regime(row);
    const name = el("span", "episode-title"); name.append(safeEpisodeName(titleMarkup(row)));
    heading.append(name, badge, el("span", "episode-id", field(row, "ID")));
    episode.append(heading); tr.append(episode);
    const objectCell = el("td", "object-cell"); objectCell.append(objects(row, data)); tr.append(objectCell);
    const periodCell = el("td", "period-cell"); periodCell.append(periodNode(row)); tr.append(periodCell);
    const separation = el("td", "separation-column"); separation.append(proximityNode(row, "distance")); tr.append(separation);
    const speed = el("td", "speed-column"); speed.append(proximityNode(row, "speed")); tr.append(speed);
    const newsCell = el("td", "news-column"); newsCell.append(newsIndicator(row, linkedDescriptions(row, data).length)); tr.append(newsCell);
    tr.addEventListener("click", event => { if (!event.target.closest("button, a, input, select, .gterm")) toggleRow(row); });
    tr.addEventListener("keydown", event => { if (event.target === tr && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); toggleRow(row); } });
    body.append(tr);
    if (open) {
      const detailRow = el("tr", "expanded-row"), td = el("td"); detailRow.id = `episode-detail-${field(row, "ID")}`; td.colSpan = 6; detailRow.append(td); body.append(detailRow);
      const id = field(row, "ID"), cached = state.details.get(id);
      if (data.source === "local-verification-candidates") td.append(expandedContent(row, { source: data.source, descriptions: [], sourceMetadata: {} }));
      else if (cached) { td.append(expandedContent(cached.row, cached)); requestAnimationFrame(() => { if (td.isConnected) startPreview(cached.row); }); }
      else {
        td.append(loadingDetail(row, data));
        ensureDetail(row).then(detail => {
          if (state.selected !== row || !td.isConnected) return;
          td.replaceChildren(expandedContent(detail.row, detail)); startPreview(detail.row);
        }).catch(error => {
          if (state.selected !== row || !td.isConnected) return;
          const notice = el("div", "expanded-loading", "Episode context is unavailable. "), retry = el("button", "text-action", "Retry");
          retry.addEventListener("click", () => { state.detailFailures.delete(id); td.replaceChildren(loadingDetail(row, data)); ensureDetail(row).then(detail => { if (state.selected === row && td.isConnected) { td.replaceChildren(expandedContent(detail.row, detail)); startPreview(detail.row); } }).catch(() => { if (state.selected === row && td.isConnected) td.replaceChildren(notice); }); });
          notice.append(retry); td.replaceChildren(notice); console.warn(error);
        });
      }
    }
  }
  const empty = $("#empty"); empty.hidden = rows.length > 0;
  if (!rows.length) {
    const noFeed = !data || data.source === "unavailable", nonePublished = !state.usePreview && data?.source === "live" && data.publishedEpisodes === 0;
    empty.replaceChildren(el("strong", "", noFeed ? "Current records could not be verified" : nonePublished ? "No episodes selected for public display" : "No matching episodes"), el("span", "", noFeed ? "Check the live-sheet status above and reload after the source is corrected." : nonePublished ? "The Frontend publication flag controls this table." : "Try another search or reset the filters."));
  }
  if (data?.source === "live") scheduleDetailPrefetch();
}
function setStatus() {
  const status = $("#status"), live = state.live;
  if (state.usePreview) { status.dataset.kind = "preview"; status.textContent = currentData()?.source === "local-verification-candidates" ? "LOCAL PREVIEW: verification candidates from a worklist, not published episodes." : "LOCAL PREVIEW: all workbook episodes, including unpublished rows."; }
  else if (live?.source === "live") { status.dataset.kind = live.descriptionError ? "error" : "live"; status.textContent = `Live published Google Sheet checked ${new Date(live.snapshotUtc).toLocaleString("en-US")}: ${live.publishedEpisodes} selected episode${live.publishedEpisodes === 1 ? "" : "s"}.${live.descriptionError ? ` Source records unavailable: ${live.descriptionError}.` : ""}`; }
  else { status.dataset.kind = "error"; status.textContent = `Current published sheet unavailable: ${live?.error || "unknown error"}. No stale episode dates are shown.`; }
}
async function init() {
  if (["localhost", "127.0.0.1"].includes(location.hostname)) {
    const selector = $("#earth-choice"), swatch = $("#earth-swatch");
    $("#earth-controls").hidden = false;
    swatch.style.backgroundColor = `#${EARTH_COLORS[state.earthColor].toString(16).padStart(6, "0")}`;
    selector.addEventListener("change", () => {
      state.earthColor = selector.value;
      const color = EARTH_COLORS[state.earthColor];
      swatch.style.backgroundColor = `#${color.toString(16).padStart(6, "0")}`;
      previewScene?.setEarthColor(color);
    });
  }
  $("#preview-toggle").addEventListener("change", event => { state.usePreview = event.target.checked; state.selected = null; state.orbit = ""; setStatus(); render(); });
  $("#search").addEventListener("input", event => { state.query = event.target.value.trim(); render(); });
  $("#orbit").addEventListener("change", event => { state.orbit = event.target.value; render(); });
  $("#reset").addEventListener("click", () => { state.query = ""; state.orbit = ""; state.sort = { key: "index", direction: "asc" }; $("#search").value = ""; render(); });
  document.querySelectorAll(".sort-head").forEach(button => button.addEventListener("click", () => { const key = button.dataset.sort; state.sort = { key, direction: state.sort.key === key ? (state.sort.direction === "desc" ? "asc" : "desc") : key === "title" || key === "orbit" ? "asc" : "desc" }; render(); }));
  state.live = await Promise.all([
    fetch("./data/table.json", { cache: "no-store" }).then(r => { if (!r.ok) throw new Error(`Table support data returned ${r.status}`); return r.json(); }),
    loadCurrentEpisodes(),
    loadCurrentDescriptions().catch(error => ({ descriptions: [], error: error.message })),
  ]).then(([snapshot, feed, descriptionFeed]) => {
    const supporting = new Map(snapshot.episodes.map(row => [field(row, "ID"), row]));
    const episodes = feed.episodes.filter(row => /^(true|yes|1)$/i.test(row.Frontend || ""))
      .map(row => ({ ...(supporting.get(row.ID) || {}), ...row }));
    const e001 = episodes.find(row => field(row, "ID") === "E-001");
    if (e001) episodeUtcInterval(e001);
    return { ...snapshot, descriptions: descriptionFeed.descriptions, episodes, publishedEpisodes: episodes.length, source: "live", snapshotUtc: feed.fetchedUtc, descriptionsCheckedUtc: descriptionFeed.fetchedUtc, descriptionError: descriptionFeed.error || "" };
  }).catch(error => ({ source: "unavailable", episodes: [], error: error.message }));
  setStatus(); render();
  const e001 = state.live.episodes?.find(row => field(row, "ID") === "E-001");
  if (e001) state.seriesPromise = calculateE001(episodeUtcInterval(e001)).then(series => { state.series = series; render(); return series; })
    .catch(error => { $("#status").dataset.kind = "error"; $("#status").textContent += ` E-001 reconstruction unavailable: ${error.message}.`; });
}
init().catch(error => { $("#status").textContent = `The table could not start: ${error.message}`; $("#status").dataset.kind = "error"; });

