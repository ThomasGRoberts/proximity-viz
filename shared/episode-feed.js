/* The two editorial tabs are fetched on every page load. Legacy IDs remain the
   stable keys for existing visualizations and historical orbital data. */
const SHEET_ID = "1IEQ3tmerXXxEty8BcZeaonWhQbHUfA2Z5b44IuCsQ8I";
export const EPISODES_CSV = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=860337817`;
export const RECORDS_CSV = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=1572351989`;

async function fetchCsv(primary) {
  const request = url => fetch(`${url}&_=${Date.now()}`, { cache: "no-store", credentials: "omit" })
    .then(response => { if (!response.ok) throw new Error(`Sheet returned ${response.status}`); return response.text(); });
  return request(primary);
}

// Only entire spacecraft cells, never identifiers embedded in notes, select plotted objects.
export function cleanCospar(value) {
  const text = String(value ?? "").trim();
  return /^(?:19|20)\d{2}-\d{3}[A-Z]{1,3}$/.test(text) ? text : "";
}

export function plottedObjects(row) {
  return ["A", "B", "C"].map(slot => ({ slot, cospar: cleanCospar(row?.[`Object ${slot}`]) })).filter(item => item.cospar);
}

export function csvRows(text) {
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
  return rows;
}

export function parseCsv(text, requiredHeaders = ["ID"]) {
  const rows = csvRows(text);
  const headers = rows.shift()?.map(value => value.replace(/^\uFEFF/, "").trim());
  if (!headers || requiredHeaders.some(header => !headers.includes(header))) throw new Error(`Published sheet headers could not be verified: ${requiredHeaders.join(", ")}`);
  return rows.map(values => Object.fromEntries(headers.map((key, index) => [key, (values[index] || "").trim()]))).filter(record => record[requiredHeaders[0]]);
}

let request;
export function loadCurrentEpisodes() {
  return request ||= fetchCsv(EPISODES_CSV)
    .then(text => {
      const rows = csvRows(text);
      if (rows[0]?.[0]?.replace(/^\uFEFF/, "").trim() !== "Episode ID" || rows[0]?.[1]?.trim() !== "Legacy ID" ||
          rows[0]?.[2]?.trim() !== "Episode Title" || rows[0]?.[17]?.trim() !== "Tagged Records" ||
          rows[1]?.[5]?.trim() !== "Object A (Chaser)\nCOSPAR ID" || rows[1]?.[6]?.trim() !== "Object B (Target)\nCOSPAR ID")
        throw new Error("New Episodes tab headers could not be verified");
      return rows.slice(2).filter(values => values[2]?.trim()).map(values => {
        const publicId = values[0]?.trim(), legacyId = values[1]?.trim() || publicId;
        if (!/^E-\d{3,}$/.test(publicId) || !/^E-\d{3,}$/.test(legacyId))
          throw new Error(`Episode title has an invalid episode ID: ${values[2]}`);
        const episode = { ID: legacyId, "Episode ID": publicId, "Legacy ID": legacyId,
          "Episode Name": values[2].trim(), "Episode Description": (values[4] || "").trim(),
          Orbit: (values[3] || "").trim(), Frontend: "TRUE", Descriptions: (values[17] || "").trim(),
          "Tagged Records": (values[17] || "").trim(), "Object C's Role": (values[8] || "").trim() };
        for (const [index, slot] of ["A", "B", "C"].entries()) episode[`Object ${slot}`] = (values[5 + index] || "").trim();
        for (let index = 1; index <= 4; index++) {
          episode[`Chapter ${index} Center`] = (values[7 + 2 * index] || "").trim();
          episode[`Chapter ${index} Width (hours)`] = (values[8 + 2 * index] || "").trim();
        }
        return episode;
      });
    }).then(episodes => {
      if (!episodes.length) throw new Error("Episodes sheet returned no episode records");
      for (const key of ["ID", "Episode ID"]) if (new Set(episodes.map(row => row[key])).size !== episodes.length)
        throw new Error(`Episodes sheet contains duplicate ${key} values`);
      return { episodes, fetchedUtc: new Date().toISOString() };
    });
}

let recordRequest;
export function loadCurrentRecords() {
  return recordRequest ||= Promise.all([fetchCsv(RECORDS_CSV), loadCurrentEpisodes()])
    .then(([text, feed]) => {
      const records = parseCsv(text, ["Record ID", "Related episodes", "URL", "Category"]);
      const publicToLegacy = new Map(feed.episodes.map(row => [row["Episode ID"], row.ID]));
      const ids = records.map(row => row["Record ID"]);
      if (new Set(ids).size !== ids.length) throw new Error("Records sheet contains duplicate record IDs");
      const descriptions = records.map(row => {
        const linked = row["Related episodes"].split(/[,;\n]/).map(id => id.trim()).filter(Boolean);
        const unknown = linked.filter(id => !publicToLegacy.has(id));
        if (unknown.length) throw new Error(`Record ${row["Record ID"]} refers to unknown episode ${unknown.join(", ")}`);
        return { ...row, ID: row["Record ID"], Episode: linked.map(id => publicToLegacy.get(id)).join(", "),
          "Source URL": row.URL, "Description type": row.Category };
      });
      return { descriptions, records, fetchedUtc: new Date().toISOString() };
    });
}

export const loadCurrentDescriptions = loadCurrentRecords;

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
