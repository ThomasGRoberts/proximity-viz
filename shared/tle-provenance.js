/* Source labels are intentionally distinct from the provider that served a file. */
export function spaceTrackHistoryUrl(norad, epoch) {
  if (!/^\d+$/.test(String(norad)) || !Number.isFinite(Date.parse(epoch))) return "";
  const day = new Date(epoch).toISOString().slice(0, 10);
  const next = new Date(Date.parse(`${day}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  return `https://www.space-track.org/basicspacedata/query/class/gp_history/norad_cat_id/${norad}/EPOCH/${day}--${next}/format/xml`;
}
export function tleProvenance(tle) {
  const source = String(tle?.source || "").trim();
  if (source === "CelesTrak GEO via Internet Archive") return {
    label: "Archived CelesTrak GEO", dataSource: "Source unverified", origin: "Upstream catalog origin unverified",
    retrieval: "CelesTrak GEO file via Internet Archive", href: tle.sourceUrl || ""
  };
  if (source === "space-track") return {
    label: "Space-Track historical", dataSource: "Space-Track", origin: "USSPACECOM basic SSA catalog",
    retrieval: "Space-Track historical file in the project subset", href: "https://www.space-track.org/documentation"
  };
  if (source === "seesat") return {
    label: "Amateur reconstruction", dataSource: "Amateur observers", origin: "Independent satellite observers; individual fit attribution unavailable",
    retrieval: "SeeSat-L collection in the project library", href: "https://www.satobs.org/seesat/"
  };
  if (source === "CelesTrak (latest)") return {
    label: "Live via CelesTrak", dataSource: "CelesTrak (current)", origin: "Upstream GP origin not verified for this element",
    retrieval: "Current CelesTrak GP query", href: "https://celestrak.org/NORAD/elements/"
  };
  return { label: "Source unverified", dataSource: "Source unverified", origin: "Unknown",
    retrieval: source ? `Local project file labeled “${source}”; original retrieval undocumented` : "Local project file; original retrieval undocumented",
    href: "" };
}
