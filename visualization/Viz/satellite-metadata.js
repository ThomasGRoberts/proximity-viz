// SATCAT metadata in the native disclosures used by the SBI control panel.
const host = document.getElementById("identity");
const catalog = fetch("data/episode-library.json").then(response => response.ok ? response.json() : null).catch(() => null);
const externalIcon = '<svg viewBox="0 0 18 18" aria-hidden="true"><path class="espl-news-external__box" d="M7.25 4.25H4.5A1.75 1.75 0 0 0 2.75 6v7.5a1.75 1.75 0 0 0 1.75 1.75H12a1.75 1.75 0 0 0 1.75-1.75v-2.75"></path><g class="espl-news-external__arrow"><path d="M9.25 2.75h6v6"></path><path d="m8 10 7.25-7.25"></path></g></svg>';
const dateText = value => {
  const date = new Date(value?.includes("T") ? value : `${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value || "";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
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
  const section = title => {
    const wrap = document.createElement("section"); wrap.className = "metadataSection";
    const heading = document.createElement("h4"); heading.textContent = title;
    const dl = document.createElement("dl"); dl.className = "object-meta";
    wrap.append(heading, dl); details.append(wrap); return dl;
  };
  const satellite = section("Satellite Details");
  row(satellite, "COSPAR ID", satcat.OBJECT_ID);
  row(satellite, "NORAD ID", satcat.NORAD_CAT_ID);
  row(satellite, "Country", owner(satcat.OWNER) || record.ownerName);
  row(satellite, "Object type", satcat.OBJECT_TYPE === "PAY" ? "Payload" : satcat.OBJECT_TYPE);
  row(satellite, "Launch date", dateText(satcat.LAUNCH_DATE));
  row(satellite, "Launch site", `${data.launchSites?.names?.[satcat.LAUNCH_SITE] || satcat.LAUNCH_SITE}${siteFlags(satcat.LAUNCH_SITE)}`);
  const identitySource = document.createElement("div"), identityLabel = document.createElement("dt"), identityValue = document.createElement("dd");
  identityLabel.textContent = "Data Source";
  identityValue.append(link("CelesTrak SATCAT", record.recordUrl || `https://celestrak.org/satcat/search.php?SEARCH=${encodeURIComponent(satcat.NORAD_CAT_ID)}`));
  if (data.launchSites?.names?.[satcat.LAUNCH_SITE] && data.launchSites.sourceUrl) identityValue.append(document.createTextNode(" · "), link("CSIS launch-site names", data.launchSites.sourceUrl));
  identitySource.append(identityLabel, identityValue); satellite.append(identitySource);
  const orbital = section("Orbital Details");
  const epochRow = document.createElement("div"), epochLabel = document.createElement("dt"), epochValue = document.createElement("dd");
  epochLabel.textContent = "Selected TLE epoch";
  const selectedEpoch = new Date(card.dataset.epoch);
  const dateLine = document.createElement("span"), timeLine = document.createElement("span");
  dateLine.className = "epochDate"; timeLine.className = "epochTime";
  dateLine.textContent = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(selectedEpoch);
  timeLine.textContent = `at ${new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "UTC" }).format(selectedEpoch)} UTC`;
  epochValue.append(dateLine, timeLine); epochRow.append(epochLabel, epochValue); orbital.append(epochRow);
  row(orbital, "Current TLE age", card.dataset.tleAge || "Calculating…");
  orbital.lastElementChild.querySelector("dd").className = "tleAgeValue";
  const line2 = card.dataset.tleLine2 || "";
  const inclination = Number(line2.slice(8, 16));
  const eccentricity = Number(`0.${line2.slice(26, 33).trim()}`);
  const meanMotion = Number(line2.slice(52, 63));
  if (Number.isFinite(inclination)) row(orbital, "Inclination", `${inclination.toFixed(4)}°`);
  if (Number.isFinite(eccentricity)) row(orbital, "Eccentricity", eccentricity.toFixed(7));
  if (Number.isFinite(meanMotion)) row(orbital, "Mean motion", `${meanMotion.toFixed(5)} rev/day`);
  const sourceRow = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd");
  dt.textContent = "Data Source";
  if (card.dataset.sourceQueryHref) {
    const sourceLink = link(card.dataset.sourceData, card.dataset.sourceQueryHref);
    sourceLink.title = "Space-Track historical elements for this satellite and UTC date; sign-in required. The query may include other element sets from the same date.";
    dd.append(sourceLink);
  } else if (card.dataset.sourceHref && card.dataset.sourceData !== "Source unverified") dd.append(link(card.dataset.sourceData, card.dataset.sourceHref));
  else dd.textContent = card.dataset.sourceData || "Source unverified";
  sourceRow.append(dt, dd); orbital.append(sourceRow);
}
host.addEventListener("toggle", event => {
  const card = event.target.closest(".satCard");
  if (card?.open) render(card);
}, true);
host.addEventListener("tlechange", event => {
  const card = event.target.closest(".satCard");
  if (card?.open) render(card);
});
