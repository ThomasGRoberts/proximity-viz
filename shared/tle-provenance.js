/* Source labels are intentionally distinct from the provider that served a file. */
export function tleProvenance(tle) {
  const source = String(tle?.source || "").trim();
  if (source === "CelesTrak GEO via Internet Archive") return {
    label: "Archived CelesTrak GEO", origin: "Upstream catalog origin unverified",
    retrieval: "CelesTrak GEO file via Internet Archive", href: tle.sourceUrl || ""
  };
  if (source === "space-track") return {
    label: "Space-Track historical", origin: "USSPACECOM basic SSA catalog",
    retrieval: "Space-Track historical file in the project subset", href: "https://www.space-track.org/documentation"
  };
  if (source === "seesat") return {
    label: "Amateur reconstruction", origin: "Independent satellite observers; individual fit attribution unavailable",
    retrieval: "SeeSat-L collection in the project library", href: "https://www.satobs.org/seesat/"
  };
  if (source === "CelesTrak (latest)") return {
    label: "Live via CelesTrak", origin: "Upstream GP origin not verified for this element",
    retrieval: "Current CelesTrak GP query", href: "https://celestrak.org/NORAD/elements/"
  };
  return { label: "Historical source unverified", origin: "Unknown",
    retrieval: source ? `Local project file labeled “${source}”; original retrieval undocumented` : "Local project file; original retrieval undocumented",
    href: "" };
}
