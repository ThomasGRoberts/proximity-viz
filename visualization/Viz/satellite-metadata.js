// SATCAT metadata in the native disclosures used by the SBI control panel.
const host = document.getElementById("identity");
const catalog = fetch("data/episode-library.json").then(response => response.ok ? response.json() : null).catch(() => null);
const archiveRequestUrl = "https://celestrak.org/NORAD/archives/request.php?FORMAT=tle";
const externalIcon = '<svg viewBox="0 0 18 18" aria-hidden="true"><path class="espl-news-external__box" d="M7.25 4.25H4.5A1.75 1.75 0 0 0 2.75 6v7.5a1.75 1.75 0 0 0 1.75 1.75H12a1.75 1.75 0 0 0 1.75-1.75v-2.75"></path><g class="espl-news-external__arrow"><path d="M9.25 2.75h6v6"></path><path d="m8 10 7.25-7.25"></path></g></svg>';
const dateText = value => {
  const date = new Date(value?.includes("T") ? value : `${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value || "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(date).replace(/^([A-Za-z]{3}) /, (_, month) => `${month.toUpperCase()}. `);
};
const epochText = value => {
  const whole = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "UTC" }).format(new Date(value));
  const fraction = value.match(/\.(\d+)Z$/)?.[1];
  return `${whole}${fraction ? `.${fraction}` : ""} UTC`;
};
const owner = code => code === "CIS" ? "Russia (CIS) 🇷🇺" : code === "FRIT" ? "France / Italy 🇫🇷 🇮🇹" : code;
const siteFlags = code => code === "TYMSC" ? " 🇰🇿 🇷🇺" : code === "FRGUI" ? " 🇫🇷" : "";
function link(label, href) {
  const anchor = document.createElement("a");
  anchor.className = "espl-news-external"; anchor.href = href; anchor.target = "_blank"; anchor.rel = "noopener noreferrer";
  anchor.textContent = label; anchor.insertAdjacentHTML("beforeend", externalIcon);
  return anchor;
}
function row(dl, label, value) {
  if (!value) return;
  const wrap = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd");
  dt.textContent = label; dd.textContent = String(value); wrap.append(dt, dd); dl.append(wrap);
}
async function render(card) {
  const details = card.querySelector(".satMetaDetails");
  const data = await catalog;
  if (!card.open) return;
  const record = data?.objects?.[card.dataset.cospar], satcat = record?.satcat;
  details.replaceChildren();
  if (!satcat) { details.textContent = "Catalog metadata unavailable."; return; }
  const dl = document.createElement("dl"); dl.className = "object-meta";
  row(dl, "COSPAR ID", satcat.OBJECT_ID);
  row(dl, "NORAD ID", satcat.NORAD_CAT_ID);
  row(dl, "Country / Org.", owner(satcat.OWNER) || record.ownerName);
  row(dl, "Object type", satcat.OBJECT_TYPE === "PAY" ? "Payload" : satcat.OBJECT_TYPE);
  row(dl, "Launch date", dateText(satcat.LAUNCH_DATE));
  row(dl, "Launch site", `${data.launchSites?.names?.[satcat.LAUNCH_SITE] || satcat.LAUNCH_SITE}${siteFlags(satcat.LAUNCH_SITE)}`);
  const epochRow = document.createElement("div"), epochLabel = document.createElement("dt"), epochValue = document.createElement("dd");
  epochLabel.textContent = "Selected TLE epoch";
  const selectedEpoch = new Date(card.dataset.epoch);
  const dateLine = document.createElement("span"), timeLine = document.createElement("span");
  dateLine.className = "epochDate"; timeLine.className = "epochTime";
  dateLine.textContent = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(selectedEpoch);
  timeLine.textContent = `at ${new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "UTC" }).format(selectedEpoch)} UTC`;
  epochValue.append(dateLine, timeLine); epochRow.append(epochLabel, epochValue); dl.append(epochRow);
  const sourceRow = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd");
  dt.textContent = "Data source"; dd.append(link("CelesTrak", card.dataset.archiveHref || archiveRequestUrl)); sourceRow.append(dt, dd); dl.append(sourceRow);
  details.append(dl);
}
host.addEventListener("toggle", event => {
  const card = event.target.closest(".satCard");
  if (card?.open) render(card);
}, true);
host.addEventListener("tlechange", event => {
  const card = event.target.closest(".satCard");
  if (card?.open) render(card);
});
