// Display increments describe editorial precision, never physical uncertainty.
export const ESTIMATE_DISPLAY = Object.freeze({
  "E-001": { separationKm: 5, relativeSpeedMps: 1, scope: "in this reconstruction" },
  "E-002": { separationKm: 10, relativeSpeedMps: 10, scope: "in this interval" },
});

export function estimatedValue(value, metric, episodeId) {
  if (!Number.isFinite(value)) return "—";
  const increment = ESTIMATE_DISPLAY[episodeId]?.[metric] || 1;
  return (Math.round(value / increment) * increment).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function estimatedCaption(episodeId) {
  return `Estimated minimum ${ESTIMATE_DISPLAY[episodeId]?.scope || "in this reconstruction"}`;
}
