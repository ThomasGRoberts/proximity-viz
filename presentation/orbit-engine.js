// Synthetic orbital teaching model: SGP4 from internally generated TLEs, followed
// by continuous two-body propagation after optional tangential impulse burns.
export const EPOCH_MS = Date.parse("2026-11-23T00:00:00Z");
export const EARTH_KM = 6378.137;
export const MU = 398600.4418;
const HOUR = 3600000;
const TWO_PI = 2 * Math.PI;
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = a => Math.hypot(a.x, a.y, a.z);
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const scale = (a, k) => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const unit = a => scale(a, 1 / norm(a));
const wrap = angle => ((angle % 360) + 360) % 360;
const checksum = line => {
  const prefix = line.padEnd(68, " ").slice(0, 68);
  let total = 0;
  for (const character of prefix) total += character === "-" ? 1 : /\d/.test(character) ? Number(character) : 0;
  return `${prefix}${total % 10}`;
};

export function syntheticTle(elements, number, designator, epochMs = EPOCH_MS) {
  const { altitudeKm, eccentricity, inclinationDeg, raanDeg, argPerigeeDeg, meanAnomalyDeg } = elements;
  const a = EARTH_KM + altitudeKm;
  const meanMotion = Math.sqrt(MU / a ** 3) * 86400 / TWO_PI;
  const angle = value => wrap(value).toFixed(4).padStart(8, " ");
  const date = new Date(epochMs), year = String(date.getUTCFullYear()).slice(-2);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const day = 1 + (epochMs - yearStart) / 86400000;
  const epoch = `${year}${day.toFixed(8).padStart(12, "0")}`;
  const line1 = checksum(`1 ${number}U 26001${designator}   ${epoch}  .00000000  00000-0  00000-0 0  999`);
  const line2 = checksum(`2 ${number} ${angle(inclinationDeg)} ${angle(raanDeg)} ${Math.round(eccentricity * 1e7).toString().padStart(7, "0")} ${angle(argPerigeeDeg)} ${angle(meanAnomalyDeg)} ${meanMotion.toFixed(8).padStart(11, " ")}${"1".padStart(5, " ")}`);
  return { line1, line2, meanMotion, epochUtc: date.toISOString() };
}

function elementsFromState(state) {
  const { r, v } = state, radius = norm(r), h = cross(r, v), hLength = norm(h);
  const node = { x: -h.y, y: h.x, z: 0 }, nodeLength = norm(node);
  const eccentricityVector = sub(scale(cross(v, h), 1 / MU), scale(r, 1 / radius));
  const eccentricity = norm(eccentricityVector);
  const a = 1 / (2 / radius - dot(v, v) / MU);
  const inclination = Math.acos(h.z / hLength), raan = Math.atan2(node.y, node.x);
  const signedAngle = (left, right, leftLength, rightLength) => Math.atan2(
    dot(cross(left, right), h) / (leftLength * rightLength * hLength),
    dot(left, right) / (leftLength * rightLength)
  );
  const argument = signedAngle(node, eccentricityVector, nodeLength, eccentricity);
  const trueAnomaly = signedAngle(eccentricityVector, r, eccentricity, radius);
  const eccentricAnomaly = 2 * Math.atan2(Math.sqrt(1 - eccentricity) * Math.sin(trueAnomaly / 2), Math.sqrt(1 + eccentricity) * Math.cos(trueAnomaly / 2));
  const meanAnomaly = eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly);
  return { altitudeKm: a - EARTH_KM, eccentricity, inclinationDeg: inclination * 180 / Math.PI,
    raanDeg: raan * 180 / Math.PI, argPerigeeDeg: argument * 180 / Math.PI, meanAnomalyDeg: meanAnomaly * 180 / Math.PI };
}

function stumpff(z) {
  if (z > 1e-8) { const r = Math.sqrt(z); return { C: (1 - Math.cos(r)) / z, S: (r - Math.sin(r)) / (r ** 3) }; }
  if (z < -1e-8) { const r = Math.sqrt(-z); return { C: (Math.cosh(r) - 1) / -z, S: (Math.sinh(r) - r) / (r ** 3) }; }
  return { C: .5 - z / 24 + z * z / 720, S: 1 / 6 - z / 120 + z * z / 5040 };
}

// Universal-variable f/g solution keeps position continuous through a burn.
export function coast(initial, seconds) {
  if (!seconds) return initial;
  const r0 = norm(initial.r), v02 = dot(initial.v, initial.v);
  const vr0 = dot(initial.r, initial.v) / r0;
  const alpha = 2 / r0 - v02 / MU, sqrtMu = Math.sqrt(MU);
  let chi = sqrtMu * Math.abs(alpha) * seconds;
  for (let i = 0; i < 40; i++) {
    const z = alpha * chi * chi, { C, S } = stumpff(z);
    const f = r0 * vr0 / sqrtMu * chi * chi * C + (1 - alpha * r0) * chi ** 3 * S + r0 * chi - sqrtMu * seconds;
    const df = r0 * vr0 / sqrtMu * chi * (1 - z * S) + (1 - alpha * r0) * chi * chi * C + r0;
    const correction = f / df;
    chi -= correction;
    if (Math.abs(correction) < 1e-9) break;
  }
  const z = alpha * chi * chi, { C, S } = stumpff(z);
  const f = 1 - chi * chi / r0 * C;
  const g = seconds - chi ** 3 / sqrtMu * S;
  const r = add(scale(initial.r, f), scale(initial.v, g));
  const radius = norm(r);
  const fdot = sqrtMu / (radius * r0) * (alpha * chi ** 3 * S - chi);
  const gdot = 1 - chi * chi / radius * C;
  return { r, v: add(scale(initial.r, fdot), scale(initial.v, gdot)) };
}

function burnEvents(maneuver) {
  if (!maneuver?.enabled || !maneuver.deltaVms) return [];
  const start = maneuver.startHour, end = start + Math.max(.1, maneuver.durationHours);
  const impulse = maneuver.deltaVms;
  if (maneuver.sequence === "drift") return [{ hour: start, dv: impulse }];
  if (maneuver.sequence === "repeat") return [
    { hour: start, dv: impulse }, { hour: end, dv: -impulse },
    { hour: end + Math.max(.1, maneuver.durationHours), dv: -impulse },
    { hour: end + 2 * Math.max(.1, maneuver.durationHours), dv: impulse },
  ];
  return [{ hour: start, dv: impulse }, { hour: end, dv: -impulse }];
}

export function createEngine(config) {
  if (!window.satellite?.twoline2satrec) throw new Error("Bundled SGP4 library did not load");
  const a = config.objectA, delta = config.objectB;
  const b = {
    altitudeKm: a.altitudeKm + delta.deltaAltitudeKm,
    eccentricity: Math.max(0, a.eccentricity + delta.deltaEccentricity),
    inclinationDeg: Math.max(.001, a.inclinationDeg + delta.deltaInclinationDeg),
    raanDeg: wrap(a.raanDeg + delta.deltaRaanDeg),
    argPerigeeDeg: a.argPerigeeDeg,
    meanAnomalyDeg: wrap(a.meanAnomalyDeg + delta.relativeLongitudeDeg - delta.deltaRaanDeg),
  };
  for (const object of [a, b]) {
    const axis = EARTH_KM + object.altitudeKm;
    if (!(object.altitudeKm >= 200 && object.altitudeKm <= 60000 && object.eccentricity >= 0 && object.eccentricity < .7 && object.inclinationDeg >= 0 && object.inclinationDeg <= 180 && axis * (1 - object.eccentricity) >= EARTH_KM + 160))
      throw new Error("Keep synthetic inclinations within 0°–180° and perigees at least 160 km above Earth");
  }
  const tleA = syntheticTle(a, "99901", "A"), tleB = syntheticTle(b, "99902", "B");
  const satA = window.satellite.twoline2satrec(tleA.line1, tleA.line2);
  const satB = window.satellite.twoline2satrec(tleB.line1, tleB.line2);
  const sgp = (record, hour) => {
    const state = window.satellite.propagate(record, new Date(EPOCH_MS + hour * HOUR));
    if (!state.position || !state.velocity) throw new Error("SGP4 could not propagate this synthetic TLE");
    return { r: state.position, v: state.velocity };
  };
  const events = burnEvents(config.maneuver);
  const prepared = [];
  for (const event of events) {
    const prior = prepared.at(-1);
    const before = prior ? coast(prior.state, (event.hour - prior.hour) * 3600) : sgp(satB, event.hour);
    prepared.push({ ...event, state: { r: before.r, v: add(before.v, scale(unit(before.v), event.dv / 1000)) } });
  }
  const teaching = config.teachingApogeeKick;
  const preManeuverA = hour => sgp(satA, hour);
  let apogeeKick = null, tleAfterA = null;
  if (teaching && Number.isFinite(teaching.hour) && Number.isFinite(teaching.inclinationChangeDeg)) {
    const before = preManeuverA(teaching.hour);
    // Rotate velocity about the radius vector at the node. This keeps position,
    // speed, and orbital energy continuous while changing the plane by 20°.
    const radial = unit(before.r);
    const initialInclination = elementsFromState(before).inclinationDeg;
    const desired = Math.min(179.9, initialInclination + teaching.inclinationChangeDeg);
    const rotated = angle => add(scale(before.v, Math.cos(angle)), add(scale(cross(radial, before.v), Math.sin(angle)), scale(radial, dot(radial, before.v) * (1 - Math.cos(angle)))));
    const error = angle => elementsFromState({r:before.r,v:rotated(angle)}).inclinationDeg - desired;
    const direction = Math.abs(error(.35)) < Math.abs(error(-.35)) ? 1 : -1;
    let low = 0, high = Math.PI / 2;
    for (let i = 0; i < 44; i++) { const mid = (low + high) / 2; if (error(direction * mid) < 0) low = mid; else high = mid; }
    apogeeKick = { hour: teaching.hour, state: { r: before.r, v: rotated(direction * (low + high) / 2) } };
    // The disclosure teaches a single planned inclination change. The scene
    // coasts continuously from the rotated state; its mean-element summary
    // retains the other planned elements rather than exposing osculating
    // differences introduced by converting the SGP4 state at the burn.
    tleAfterA = syntheticTle({ ...a, inclinationDeg: desired }, "99901", "A", EPOCH_MS + teaching.hour * HOUR);
  }
  const stateA = hour => apogeeKick && hour >= apogeeKick.hour ? coast(apogeeKick.state, (hour - apogeeKick.hour) * 3600) : preManeuverA(hour);
  const stateB = hour => {
    let latest = null;
    for (const event of prepared) { if (event.hour <= hour) latest = event; else break; }
    return latest ? coast(latest.state, (hour - latest.hour) * 3600) : sgp(satB, hour);
  };
  const at = hour => {
    const A = stateA(hour), B = stateB(hour), dr = sub(B.r, A.r), dv = sub(B.v, A.v);
    const distanceKm = norm(dr), relativeSpeedMs = norm(dv) * 1000;
    return { hour, A, B, dr, dv, distanceKm, relativeSpeedMs,
      rangeRateMs: distanceKm ? dot(dr, dv) / distanceKm * 1000 : 0 };
  };
  const sample = (startHour, endHour, points = 350) => Array.from({ length: points }, (_, i) => at(startHour + (endHour - startHour) * i / (points - 1)));
  return { at, sample, stateA, preManeuverA, stateB, tleA, tleAfterA, tleB, events, objectB: b,
    periodHours: 24 / tleA.meanMotion };
}

export function orbitalFrame(state) {
  const radial = unit(state.r), normal = unit(cross(state.r, state.v));
  const along = cross(normal, radial);
  return { radial, along, normal };
}

export function relativeCoordinates(point, origin, frame) {
  const d = sub(point, origin);
  return { x: dot(d, frame.radial), y: dot(d, frame.normal), z: -dot(d, frame.along) };
}

export function dwellHours(series, distanceThresholdKm, speedThresholdMs) {
  let hours = 0;
  for (let i = 1; i < series.length; i++) {
    const left = series[i - 1], right = series[i];
    if ((left.distanceKm + right.distanceKm) / 2 <= distanceThresholdKm &&
        (left.relativeSpeedMs + right.relativeSpeedMs) / 2 <= speedThresholdMs)
      hours += right.hour - left.hour;
  }
  return hours;
}
