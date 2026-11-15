/* The public Episodes tab is the authority for episode metadata on every load. */
export const EPISODES_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSuS29xd8KpFPmyz5xJmUiH8jeQNUqaFvf_7dPf8DN6QfKQgNSuzJ5FGfcMkN1giCjOvXA_ZJ8slera/pub?output=csv&gid=0&single=true";

export function parseCsv(text) {
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
  if (quoted) throw new Error("Episodes sheet contains an unfinished CSV field");
  row.push(cell); if (row.some(value => value.trim())) rows.push(row);
  const headers = rows.shift()?.map(value => value.replace(/^\uFEFF/, "").trim());
  if (!headers?.includes("ID") || !headers.includes("Start Date") || !headers.includes("End Date")) throw new Error("Episodes sheet headers could not be verified");
  return rows.map(values => Object.fromEntries(headers.map((key, index) => [key, (values[index] || "").trim()]))).filter(record => record.ID);
}

let request;
export function loadCurrentEpisodes() {
  return request ||= fetch(`${EPISODES_CSV}&_=${Date.now()}`, { cache: "no-store", credentials: "omit" })
    .then(response => { if (!response.ok) throw new Error(`Episodes sheet returned ${response.status}`); return response.text(); })
    .then(parseCsv).then(episodes => {
      if (!episodes.length) throw new Error("Episodes sheet returned no episode records");
      return { episodes, fetchedUtc: new Date().toISOString() };
    });
}

export function episodeUtcInterval(row) {
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
