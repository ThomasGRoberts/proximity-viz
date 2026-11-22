/**
 * Idealized two-body chief/deputy model for a synthetic proximity image.
 * Lengths are km, time is seconds, angles inside orbital elements are radians.
 *
 * The six input relative elements are the quasi-nonsingular differences
 * (a·δa, a·δλ, a·δeₓ, a·δeᵧ, a·δiₓ, a·δiᵧ), expressed in km at t = 0. They
 * define the deputy's *absolute* osculating elements at that epoch. Both
 * spacecraft are then propagated independently with the exact Kepler equation;
 * the plotted curve must be sampled from their states, never hand-drawn.
 *
 * Relative-element definitions: Lipp and D'Amico (2019), Eq. 2:
 * https://slab.sites.stanford.edu/sites/g/files/sbiybj25201/files/media/file/iwscff2019_lippedamico.pdf
 * Two-body element/state conversion follows the standard perifocal method:
 * https://ntrs.nasa.gov/api/citations/19710007868/downloads/19710007868.pdf
 * This excludes J2, drag, thrust, third bodies, and measurement uncertainty.
 */

export const EARTH_RADIUS_KM = 6378.137;
export const MU_KM3_S2 = 398600.4418;
const DEG = Math.PI / 180;
const TWO_PI = 2 * Math.PI;

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
const norm = vector => Math.hypot(...vector);
const sub = (a, b) => a.map((value, index) => value - b[index]);
const unit = vector => {
  const length = norm(vector);
  if (!(length > 0)) throw new Error('An orbital frame could not be defined.');
  return vector.map(value => value / length);
};
const finite = (value, label) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
  return value;
};
const radians = (degrees, label) => finite(degrees, label) * DEG;
const wrapRadians = angle => ((angle + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;

function checkOrbit(elements, label) {
  if (!(elements.a > EARTH_RADIUS_KM)) throw new Error(`${label} semimajor axis must exceed Earth radius.`);
  if (!(elements.e >= 0 && elements.e < .2)) throw new Error(`${label} eccentricity must be between 0 and 0.2 in this near-circular editor.`);
  const perigeeAltitude = elements.a * (1 - elements.e) - EARTH_RADIUS_KM;
  if (!(perigeeAltitude >= 200)) throw new Error(`${label} perigee must remain at least 200 km above Earth.`);
  return elements;
}

/** Convert editable target and ROE controls to two Keplerian orbits at t = 0. */
export function buildOrbits(target, roe) {
  if (!target || !roe) throw new Error('Target and chaser orbital elements are required.');
  const a = EARTH_RADIUS_KM + finite(target.altitudeKm, 'Target altitude');
  const e = finite(target.eccentricity, 'Target eccentricity');
  const i = radians(target.inclinationDeg, 'Target inclination');
  if (!(i > 6 * DEG && i < 174 * DEG)) throw new Error('Target inclination must be between 6° and 174° for this relative-element mapping.');
  const raan = radians(target.raanDeg, 'Target RAAN');
  const omega = radians(target.argPerigeeDeg, 'Target argument of perigee');
  const M0 = radians(target.meanAnomalyDeg, 'Target mean anomaly');
  const chief = checkOrbit({ a, e, i, raan, omega, M0 }, 'Target');

  const da = finite(roe.daKm, 'Relative semimajor axis') / a;
  const dlambda = finite(roe.dlambdaKm, 'Relative mean longitude') / a;
  const dex = finite(roe.dexKm, 'Relative eccentricity X') / a;
  const dey = finite(roe.deyKm, 'Relative eccentricity Y') / a;
  const dix = finite(roe.dixKm, 'Relative inclination X') / a;
  const diy = finite(roe.diyKm, 'Relative inclination Y') / a;
  const chaserA = a * (1 + da);
  const chaserI = i + dix;
  const chaserRaan = raan + diy / Math.sin(i);
  const ex = e * Math.cos(omega) + dex;
  const ey = e * Math.sin(omega) + dey;
  const chaserE = Math.hypot(ex, ey);
  const chaserOmega = chaserE < 1e-14 ? 0 : Math.atan2(ey, ex);
  const chaserM0 = M0 + omega + dlambda - Math.cos(i) * (chaserRaan - raan) - chaserOmega;
  const deputy = checkOrbit({ a: chaserA, e: chaserE, i: chaserI, raan: chaserRaan,
    omega: chaserOmega, M0: chaserM0 }, 'Chaser');
  if (!(deputy.i > 0 && deputy.i < Math.PI)) throw new Error('Chaser inclination must lie between 0° and 180°.');

  return { target: chief, chaser: deputy, periodSeconds: TWO_PI * Math.sqrt(a ** 3 / MU_KM3_S2) };
}

/** Exact two-body propagation of one Keplerian orbit from the common epoch. */
export function propagate(elements, tSeconds) {
  const t = finite(tSeconds, 'Time');
  const { a, e, i, raan: O, omega: w, M0 } = elements;
  const n = Math.sqrt(MU_KM3_S2 / a ** 3);
  const M = wrapRadians(M0 + n * t);
  let E = M;
  for (let iteration = 0; iteration < 24; iteration++) {
    const correction = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= correction;
    if (Math.abs(correction) < 1e-14) break;
  }
  const cosE = Math.cos(E), sinE = Math.sin(E);
  const beta = Math.sqrt(1 - e * e);
  const denominator = 1 - e * cosE;
  const x = a * (cosE - e), y = a * beta * sinE;
  const vx = -a * n * sinE / denominator, vy = a * n * beta * cosE / denominator;
  const cosO = Math.cos(O), sinO = Math.sin(O);
  const cosW = Math.cos(w), sinW = Math.sin(w);
  const cosI = Math.cos(i), sinI = Math.sin(i);
  const P = [
    cosO * cosW - sinO * sinW * cosI,
    sinO * cosW + cosO * sinW * cosI,
    sinW * sinI
  ];
  const Q = [
    -cosO * sinW - sinO * cosW * cosI,
    -sinO * sinW + cosO * cosW * cosI,
    cosW * sinI
  ];
  return {
    r: P.map((component, j) => component * x + Q[j] * y),
    v: P.map((component, j) => component * vx + Q[j] * vy)
  };
}

/** Instantaneous target radial / along-track / orbit-normal unit basis. */
export function frameAt(state) {
  const R = unit(state.r);
  const angularMomentum = cross(state.r, state.v);
  const N = unit(angularMomentum);
  const T = cross(N, R);
  return { R, T, N };
}

/** Chaser-minus-target position and *rotating-frame* speed at time t. */
export function relativeAt(orbits, tSeconds) {
  const targetState = propagate(orbits.target, tSeconds);
  const chaserState = propagate(orbits.chaser, tSeconds);
  const frame = frameAt(targetState);
  const dr = sub(chaserState.r, targetState.r);
  const dv = sub(chaserState.v, targetState.v);
  const ric = [dot(dr, frame.R), dot(dr, frame.T), dot(dr, frame.N)];
  const angularSpeed = norm(cross(targetState.r, targetState.v)) / norm(targetState.r) ** 2;
  const frameAngularVelocity = frame.N.map(component => component * angularSpeed);
  const rotatingVelocity = sub(dv, cross(frameAngularVelocity, dr));
  return {
    targetState, chaserState, frame, ric,
    separationKm: norm(dr),
    relativeSpeedMs: 1000 * norm(rotatingVelocity)
  };
}
