// Simulated seconds per real second for one target orbit in about 25 seconds.
// State vectors use Earth radii and Earth radii per second.
export function eciRateForState(state, earthRadiusKm = 6378.137) {
  if (!state?.p || !state?.v) return 3600;
  const mu = 398600.4418 / earthRadiusKm ** 3;
  const radius = state.p.length(), speedSquared = state.v.lengthSq();
  const semimajor = 1 / (2 / radius - speedSquared / mu);
  if (!(semimajor > 1) || !Number.isFinite(semimajor)) return 3600;
  const periodSeconds = 2 * Math.PI * Math.sqrt(semimajor ** 3 / mu);
  return Math.max(60, Math.min(259200, periodSeconds / 25));
}
