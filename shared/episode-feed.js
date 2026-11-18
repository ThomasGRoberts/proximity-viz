/* Direct exports read the shared source sheet on refresh. Published exports can
   lag behind edits, so retain them only as a fallback if direct access fails. */
const SHEET_ID = "1IEQ3tmerXXxEty8BcZeaonWhQbHUfA2Z5b44IuCsQ8I";
const PUBLISHED_ID = "2PACX-1vSuS29xd8KpFPmyz5xJmUiH8jeQNUqaFvf_7dPf8DN6QfKQgNSuzJ5FGfcMkN1giCjOvXA_ZJ8slera";
export const EPISODES_CSV = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;
export const DESCRIPTIONS_CSV = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=541287173`;
const PUBLISHED_DESCRIPTIONS_CSV = `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_ID}/pub?output=csv&gid=541287173&single=true`;

async function fetchCsv(primary, fallback) {
  const request = url => fetch(`${url}&_=${Date.now()}`, { cache: "no-store", credentials: "omit" })
    .then(response => { if (!response.ok) throw new Error(`Sheet returned ${response.status}`); return response.text(); });
  try { return await request(primary); }
  catch (error) {
    if (!fallback) throw error;
    console.warn("Direct sheet export unavailable; using published copy", error);
    return request(fallback);
  }
}

// Only entire spacecraft cells, never identifiers embedded in notes, select plotted objects.
export function cleanCospar(value) {
  const text = String(value ?? "").trim();
  return /^(?:19|20)\d{2}-\d{3}[A-Z]{1,3}$/.test(text) ? text : "";
}

export function plottedObjects(row) {
  return ["A", "B", "C"].map(slot => ({ slot, cospar: cleanCospar(row?.[`Object ${slot}`]) })).filter(item => item.cospar);
}

export function parseCsv(text, requiredHeaders = ["ID"]) {
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
      row.push(cell); if (row.some(value => value.trim())) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("Published sheet contains an unfinished CSV field");
  row.push(cell); if (row.some(value => value.trim())) rows.push(row);
  const headers = rows.shift()?.map(value => value.replace(/^\uFEFF/, "").trim());
  if (!headers || requiredHeaders.some(header => !headers.includes(header))) throw new Error(`Published sheet headers could not be verified: ${requiredHeaders.join(", ")}`);
  return rows.map(values => Object.fromEntries(headers.map((key, index) => [key, (values[index] || "").trim()]))).filter(record => record.ID);
}

let request;
export function loadCurrentEpisodes() {
  return request ||= fetchCsv(EPISODES_CSV)
    .then(parseCsv).then(episodes => {
      if (!episodes.length) throw new Error("Episodes sheet returned no episode records");
      return { episodes, fetchedUtc: new Date().toISOString() };
    });
}

let descriptionRequest;
export function loadCurrentDescriptions() {
  return descriptionRequest ||= fetchCsv(DESCRIPTIONS_CSV, PUBLISHED_DESCRIPTIONS_CSV)
    .then(text => parseCsv(text, ["ID", "Episode", "Source URL", "Description type"]))
    .then(descriptions => {
      if (!descriptions.length) throw new Error("Descriptions sheet returned no records");
      const ids = descriptions.map(row => row.ID.toUpperCase());
      if (new Set(ids).size !== ids.length) throw new Error("Descriptions sheet contains duplicate record IDs");
      return { descriptions, fetchedUtc: new Date().toISOString() };
    });
}

export function episodeChapters(row) {
  const chapters = [];
  for (let index = 1; index <= 4; index++) {
    const centerText = String(row?.[`Chapter ${index} Center`] || "").trim();
    const widthText = String(row?.[`Chapter ${index} Width (hours)`] || row?.[`Chapter ${index} Width`] || "").trim();
    if (!centerText && !widthText) continue;
    const match = centerText.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?(?:Z)?$/);
    const widthHours = Number(widthText);
    if (!match || !Number.isFinite(widthHours) || widthHours <= 0 || widthHours > 24 * 366) continue;
    const iso = `${match[1]}T${(match[2] || "0").padStart(2, "0")}:${match[3] || "00"}:${match[4] || "00"}Z`;
    const centerMs = Date.parse(iso);
    if (!Number.isFinite(centerMs) || new Date(centerMs).toISOString().slice(0, 19) !== iso.slice(0, 19)) continue;
    const half = widthHours * 1800000;
    chapters.push({ id: `chapter-${index}`, index, center: iso, centerMs, widthHours,
      start: new Date(centerMs - half).toISOString(), end: new Date(centerMs + half).toISOString(),
      startMs: centerMs - half, endMs: centerMs + half });
  }
  return chapters.sort((a, b) => a.centerMs - b.centerMs);
}

export function episodeUtcInterval(row) {
  const chapters = episodeChapters(row);
  if (chapters.length) {
    const startMs = Math.min(...chapters.map(item => item.startMs));
    const endMs = Math.max(...chapters.map(item => item.endMs));
    return { start: new Date(startMs).toISOString().slice(0, 10), end: new Date(endMs).toISOString().slice(0, 10),
      startMs, endMs, endExclusiveMs: endMs + 1, chapters };
  }
  const start = row?.["Start Date"], end = row?.["End Date"];
  const valid = value => /^\d{4}-\d{2}-\d{2}$/.test(value || "") &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!valid(start) || !valid(end)) throw new Error(`Episode ${row?.ID || "record"} has invalid start or end dates in the published sheet`);
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endExclusiveMs = Date.parse(`${end}T00:00:00Z`) + 86400000;
  if (endExclusiveMs <= startMs) throw new Error(`Episode ${row.ID} ends before it starts in the published sheet (${start} to ${end})`);
  return { start, end, startMs, endExclusiveMs, endMs: endExclusiveMs - 1 };
}
