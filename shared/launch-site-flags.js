// SATCAT launch-site codes used by episode disclosures and the library table.
const FLAGS = {
  AFETR: "🇺🇸", AFWTR: "🇺🇸", DLS: "🇷🇺", FRGUI: "🇫🇷",
  JSC: "🇨🇳", OREN: "🇷🇺", PKMTR: "🇷🇺", PLMSC: "🇷🇺",
  RLLB: "🇳🇿", RLLC: "🇳🇿", SRI: "🇮🇳", SRILR: "🇮🇳",
  TAISC: "🇨🇳", TANSC: "🇯🇵", TNSTA: "🇯🇵",
  TTMTR: "🇰🇿 🇷🇺", TYMSC: "🇰🇿 🇷🇺",
  WSC: "🇨🇳", XICLF: "🇨🇳", XSC: "🇨🇳",
};

export function launchSiteFlags(code) {
  return FLAGS[String(code || "").toUpperCase()] || "";
}

export function launchSiteWithFlags(name, code) {
  const flags = launchSiteFlags(code);
  return `${name || code || "Unknown"}${flags ? ` ${flags}` : ""}`;
}
