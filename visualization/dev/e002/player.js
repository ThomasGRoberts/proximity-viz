import * as THREE from "../../Viz/vendor/three/three.module.js";
import { OrbitControls } from "../../Viz/vendor/three/addons/controls/OrbitControls.js";
import { feature } from "../../Viz/vendor/topojson/topojson-client.js";
import { DOT_SCREEN_SIZE, dotTexture } from "../../Viz/relative-rendering.js?v=3";
import { MARKER } from "../../../shared/marker-spec.js?v=3";
import { spaceTrackHistoryUrl } from "../../../shared/tle-provenance.js?v=2";

const $ = id => document.getElementById(id);
const mini = document.body.classList.contains("mini");
const sgp4 = window.satellite;
const EARTH_KM = 6378.137, MAX_AGE = 36 * 3600000, TRAIL_MS = 45 * 60000;
const RATE = 90 * 1000; // 90 simulated seconds per real second; each window lasts one minute.
const RADIUS = 6.2;
const craft = [
  { slot: "A", name: "Kosmos 2542", norad: "44797", color: MARKER.A },
  { slot: "B", name: "USA 245", norad: "39232", color: MARKER.B },
  { slot: "C", name: "Kosmos 2543", norad: "44835", color: MARKER.C }
];
const windows = [
  { id: "dec31", label: "December 31 · three spacecraft", start: "2019-12-31T18:00:00Z", end: "2019-12-31T19:30:00Z", note: "All three spacecraft have nearby dated elements. USA 245's element is roughly 8–10 hours from this window; this is geometry, not a measured close approach." },
  { id: "dec7", label: "December 7 · after deployment", start: "2019-12-07T09:45:00Z", end: "2019-12-07T11:15:00Z", note: "USA 245 has a nearby amateur-derived element. The Russian spacecraft have dated elements within the display gate, but Kosmos 2542's is over 12 hours away." },
  { id: "dec8", label: "December 8 · second observer window", start: "2019-12-08T10:05:00Z", end: "2019-12-08T11:35:00Z", note: "The second December USA 245 element supports a short, separate reconstruction. No track is drawn across the gap from December 7." },
  { id: "jan24", label: "January 24 · Russian spacecraft only", start: "2020-01-24T12:00:00Z", end: "2020-01-24T13:30:00Z", note: "USA 245 has no nearby local element. Only Kosmos 2542 and Kosmos 2543 are rendered; no B position or B-pair statistic is inferred." }
];
const formatUtc = ms => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "UTC" }).format(new Date(ms)) + " UTC";
const formatShort = ms => new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(new Date(ms)) + " UTC";
const toScene = point => new THREE.Vector3(point.x / EARTH_KM, point.z / EARTH_KM, -point.y / EARTH_KM);
const data = { libraries: {}, window: windows[0], selected: {}, available: {}, positions: {}, velocities: {}, traces: [], playing: false, current: Date.parse(windows[0].start), auto: true, nearer: "A", ready: false, lastCoverageMs: 0 };

const scene = new THREE.Scene(); scene.background = new THREE.Color(0xfffcf6);
const camera = new THREE.PerspectiveCamera(35, 1, .01, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mini ? 1.5 : 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.setAttribute("aria-hidden", "true"); $("scene").append(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = .08; controls.enablePan = false; controls.minDistance = 2; controls.maxDistance = 12;
controls.addEventListener("start", () => { data.auto = false; $("scene").dataset.cameraMode = "manual"; });
scene.add(new THREE.HemisphereLight(0xffffff, 0xdcd8cf, 1.6));
const earth = new THREE.Group(); scene.add(earth);
earth.add(new THREE.Mesh(new THREE.SphereGeometry(1, 96, 72), new THREE.MeshBasicMaterial({ color: 0xe9e6e0 })));
const borders = new THREE.Group(); earth.add(borders);
const equator = Array.from({ length: 181 }, (_, i) => {
  const angle = i / 180 * Math.PI * 2;
  return new THREE.Vector3(Math.cos(angle) * 1.003, 0, Math.sin(angle) * 1.003);
});
earth.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(equator), new THREE.LineBasicMaterial({ color: 0xb5a77c, transparent: true, opacity: .5 })));
fetch("../../Viz/vendor/countries-110m.json").then(response => response.json()).then(topology => {
  const coords = [], radius = 1.0015;
  for (const country of feature(topology, topology.objects.countries).features) {
    const geometry = country.geometry;
    const rings = geometry.type === "Polygon" ? geometry.coordinates : geometry.type === "MultiPolygon" ? geometry.coordinates.flat() : [];
    for (const ring of rings) for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1], b = ring[i];
      if (Math.abs(a[0] - b[0]) > 30 || Math.abs(a[1] - b[1]) > 30) continue;
      for (const point of [a, b]) {
        const lat = THREE.MathUtils.degToRad(point[1]), lon = THREE.MathUtils.degToRad(point[0]);
        coords.push(radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), -radius * Math.cos(lat) * Math.sin(lon));
      }
    }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(coords, 3));
  borders.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xa8a39a, transparent: true, opacity: .55 })));
}).catch(() => {});

const markers = {}, labels = {};
for (const item of craft) {
  const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(item.color), sizeAttenuation: false, transparent: true, depthTest: false, depthWrite: false }));
  marker.renderOrder = 10; scene.add(marker); markers[item.slot] = marker;
  const label = document.createElement("span"); label.className = `sat-label slot-${item.slot}`; label.textContent = `${item.slot} · ${item.name}`;
  $("labels").append(label); labels[item.slot] = label;
}

function nearest(library, ms) {
  let result = null, age = Infinity;
  for (const tle of library.tles) {
    const difference = Math.abs(ms - Date.parse(tle.epoch));
    if (difference < age) { result = tle; age = difference; }
  }
  return { tle: age <= MAX_AGE ? result : null, age };
}
function stateAt(tle, ms) {
  if (!tle || Math.abs(ms - Date.parse(tle.epoch)) > MAX_AGE) return null;
  const satrec = tle.satrec ||= sgp4.twoline2satrec(tle.line1, tle.line2);
  const result = sgp4.propagate(satrec, new Date(ms));
  return result.position && result.velocity ? { position: toScene(result.position), velocity: toScene(result.velocity) } : null;
}
function clearTraces() {
  for (const trace of data.traces) { scene.remove(trace.mesh); trace.mesh.geometry.dispose(); trace.mesh.material.dispose(); }
  data.traces = [];
}
function buildTraces() {
  clearTraces();
  for (const item of craft) {
    const tle = data.selected[item.slot]; if (!tle) continue;
    const mesh = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .8, depthWrite: false }));
    mesh.renderOrder = 2; scene.add(mesh);
    data.traces.push({ mesh, tle, color: new THREE.Color(item.color) });
  }
}
function updateTraces(ms) {
  const background = new THREE.Color(0xfffcf6);
  for (const trace of data.traces) {
    const points = [], colors = [];
    for (let sample = 15; sample >= 0; sample--) {
      const state = stateAt(trace.tle, ms - sample * 3 * 60000);
      if (!state) continue;
      points.push(state.position);
      const fade = 1 - sample / 16;
      const color = background.clone().lerp(trace.color, fade * fade);
      colors.push(color.r, color.g, color.b);
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    trace.mesh.geometry.dispose(); trace.mesh.geometry = geometry;
    trace.mesh.visible = points.length > 1;
  }
}
function setPlaybackButton() {
  if (!$('play')) return;
  $('play').innerHTML = data.playing ? 'Ⅱ <span>Pause</span>' : '▶ <span>Play</span>';
  $('play').setAttribute('aria-label', data.playing ? 'Pause animation' : 'Play animation');
}
function selectWindow(windowId, initial = false) {
  data.window = windows.find(item => item.id === windowId) || windows[0];
  data.current = Date.parse(data.window.start); data.playing = true; data.auto = true; data.nearer = "A";
  const mid = (Date.parse(data.window.start) + Date.parse(data.window.end)) / 2;
  data.selected = {};
  for (const item of craft) {
    const selection = nearest(data.libraries[item.slot], mid);
    // One fixed element per craft for the whole short window: playback cannot
    // jump when a nearest-TLE boundary is crossed.
    data.selected[item.slot] = selection.tle && Math.abs(Date.parse(data.window.start) - Date.parse(selection.tle.epoch)) <= MAX_AGE && Math.abs(Date.parse(data.window.end) - Date.parse(selection.tle.epoch)) <= MAX_AGE ? selection.tle : null;
  }
  buildTraces(); renderFrame(initial); setPlaybackButton();
  if ($('moment')) { $('moment').value = data.window.id; $('momentNote').textContent = data.window.note; $('startLabel').textContent = formatShort(Date.parse(data.window.start)); $('endLabel').textContent = formatShort(Date.parse(data.window.end)); $('timeline').min = String(Date.parse(data.window.start)); $('timeline').max = String(Date.parse(data.window.end)); }
}
function earthOccludes(point, cameraPosition) {
  const ray = point.clone().sub(cameraPosition);
  const closest = THREE.MathUtils.clamp(-cameraPosition.dot(ray) / ray.lengthSq(), 0, 1);
  return cameraPosition.clone().addScaledVector(ray, closest).lengthSq() < 1.002 * 1.002;
}
function frameCamera(immediate = false, seconds = .016) {
  const b = data.positions.B, a = data.positions.A, c = data.positions.C;
  let target, primary;
  if (b && (a || c)) {
    if (a && c) {
      const da = a.distanceTo(b), dc = c.distanceTo(b), old = data.nearer;
      data.nearer = old === "A" && da <= dc * 1.15 ? "A" : old === "C" && dc <= da * 1.15 ? "C" : da <= dc ? "A" : "C";
    } else data.nearer = a ? "A" : "C";
    primary = data.nearer; target = b.clone().lerp(data.positions[primary], .5);
  } else { primary = "none"; target = a && c ? a.clone().lerp(c, .5) : (a || b || c)?.clone(); }
  if (!target) return;
  const relevant = [b, data.positions[primary]].filter(Boolean);
  const all = Object.values(data.positions);
  const baseDirection = target.clone().normalize();
  let direction = baseDirection;
  // Prefer the actual three-craft geometry when all three can be seen from it.
  const average = all.reduce((sum, point) => sum.add(point.clone().normalize()), new THREE.Vector3()).normalize();
  const candidates = [direction, average, ...relevant.map(point => point.clone().normalize())];
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const eye = candidate.clone().multiplyScalar(RADIUS);
    const visible = relevant.filter(point => !earthOccludes(point, eye)).length;
    const secondaryVisible = all.filter(point => !earthOccludes(point, eye)).length;
    const continuity = camera.position.lengthSq() ? candidate.dot(camera.position.clone().normalize()) : 0;
    const score = visible * 100 + secondaryVisible * 12 + continuity * 4 + candidate.dot(baseDirection) * 3;
    if (score > bestScore) { bestScore = score; direction = candidate; }
  }
  const eye = direction.clone().multiplyScalar(RADIUS);
  const referenceSlot = b ? "B" : a ? "A" : "C";
  let normal = data.positions[referenceSlot].clone().cross(data.velocities[referenceSlot]).normalize();
  if (normal.y < 0) normal.negate();
  if (!immediate && normal.dot(camera.up) < 0) normal.negate();
  if (immediate || !camera.position.lengthSq()) {
    camera.position.copy(eye); controls.target.copy(target); camera.up.copy(normal);
  } else if (data.auto) {
    const alpha = 1 - Math.exp(-seconds / 1.15);
    const from = camera.position.clone().normalize(), to = eye.clone().normalize();
    const rotation = new THREE.Quaternion().setFromUnitVectors(from, to);
    const part = new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), rotation, alpha);
    camera.position.copy(from.applyQuaternion(part).multiplyScalar(RADIUS));
    controls.target.lerp(target, alpha);
    camera.up.lerp(normal, alpha).normalize();
  }
  if (data.auto) camera.lookAt(controls.target);
  $("scene").dataset.cameraMode = data.auto ? "auto" : "manual";
  $("scene").dataset.cameraRadius = camera.position.length().toFixed(3);
  $("scene").dataset.nearRussian = primary;
}
function renderFrame(immediate = false, seconds = .016) {
  const ms = data.current;
  data.positions = {}; data.velocities = {}; data.available = {};
  earth.rotation.y = sgp4.gstime(new Date(ms));
  for (const item of craft) {
    const tle = data.selected[item.slot], state = stateAt(tle, ms);
    data.available[item.slot] = !!state;
    markers[item.slot].visible = !!state;
    labels[item.slot].hidden = !state;
    if (state) { data.positions[item.slot] = state.position; data.velocities[item.slot] = state.velocity; markers[item.slot].position.copy(state.position); }
  }
  if (data.auto) frameCamera(immediate, seconds);
  updateTraces(ms);
  $('timestamp').textContent = formatUtc(ms);
  if ($('timeline')) { $('timeline').value = String(ms); $('timeline').style.setProperty('--progress', `${(ms - Date.parse(data.window.start)) / (Date.parse(data.window.end) - Date.parse(data.window.start)) * 100}%`); }
  const unavailable = craft.filter(item => !data.available[item.slot]).map(item => item.name);
  $('sceneStatus').textContent = unavailable.length ? `${unavailable.join(' and ')} unavailable in this window; no position or trail is shown.` : 'Three dated elements support this short viewing window. Geometry is reconstructed.';
  if ($('coverageRows') && (immediate || Math.abs(ms - data.lastCoverageMs) >= 30000)) {
    data.lastCoverageMs = ms;
    $('coverageRows').replaceChildren(...craft.map(item => {
      const row = document.createElement('div'); row.className = `coverage-row slot-${item.slot}`;
      const dot = document.createElement('i'); dot.className = `dot slot-${item.slot}`;
      const content = document.createElement('div'), title = document.createElement('strong'), source = document.createElement('small');
      title.textContent = `${item.slot} · ${item.name}`;
      const tle = data.selected[item.slot];
      if (tle) {
        const age = Math.abs(ms - Date.parse(tle.epoch)) / 3600000;
        const label = tle.source === 'space-track' ? 'Space-Track' : 'Amateur observers';
        if (tle.source === 'space-track') {
          const anchor = document.createElement('a'); anchor.href = spaceTrackHistoryUrl(item.norad, tle.epoch); anchor.target = '_blank'; anchor.rel = 'noopener noreferrer';
          anchor.textContent = label; anchor.title = 'Historical query for the selected UTC date; login required. May include more than one element set.'; source.append(anchor);
        } else source.append(label);
        source.append(` · epoch ${formatShort(Date.parse(tle.epoch))} · ${age.toFixed(1)} h from view`);
      } else source.textContent = 'No nearby dated element; omitted from the model';
      content.append(title, source); row.append(dot, content); return row;
    }));
  }
}
function resize() {
  const width = Math.max(1, $('scene').clientWidth), height = Math.max(1, $('scene').clientHeight);
  camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
  const markerScale = DOT_SCREEN_SIZE * 2.85 * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 275 / height * MARKER.diameterPx / 12;
  for (const marker of Object.values(markers)) marker.scale.set(markerScale, markerScale, 1);
}
new ResizeObserver(resize).observe($('scene'));
let last = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const seconds = Math.min(.1, (now - last) / 1000); last = now;
  if (data.playing) {
    data.current = Math.min(Date.parse(data.window.end), data.current + seconds * RATE);
    if (data.current >= Date.parse(data.window.end)) { data.playing = false; setPlaybackButton(); }
  }
  renderFrame(false, seconds);
  if (!data.auto) controls.update();
  const rect = $('scene').getBoundingClientRect(), screen = {};
  for (const item of craft) {
    if (!data.available[item.slot]) continue;
    const projected = data.positions[item.slot].clone().project(camera);
    const x = (projected.x + 1) * rect.width / 2, y = (1 - projected.y) * rect.height / 2;
    const label = labels[item.slot]; screen[item.slot] = { x, y };
    label.style.left = `${x}px`; label.style.top = `${y}px`;
    const occluded = earthOccludes(data.positions[item.slot], camera.position);
    label.style.visibility = Math.abs(projected.x) > .92 || Math.abs(projected.y) > .84 || occluded ? 'hidden' : 'visible';
    markers[item.slot].visible = !occluded;
  }
  const overlap = screen.A && screen.C && Math.hypot(screen.A.x - screen.C.x, screen.A.y - screen.C.y) < 22;
  labels.A.textContent = mini ? (overlap ? 'A+C' : 'A') : overlap ? 'A + C · projected overlap' : 'A · Kosmos 2542';
  labels.B.textContent = mini ? 'B' : 'B · USA 245';
  labels.C.textContent = mini ? 'C' : 'C · Kosmos 2543';
  labels.C.style.display = overlap ? 'none' : '';
  const abCollide = screen.A && screen.B && Math.abs(screen.A.y - screen.B.y) < 22 && Math.abs(screen.B.x - screen.A.x) < (mini ? 30 : 110);
  labels.A.style.transform = abCollide && !mini ? 'translate(10px,calc(-100% - 7px))' : 'translate(10px,-50%)';
  labels.B.style.transform = abCollide && !mini ? 'translate(10px,6px)' : 'translate(10px,-50%)';
  renderer.render(scene, camera);
}

if ($('moment')) {
  for (const window of windows) { const option = document.createElement('option'); option.value = window.id; option.textContent = window.label; $('moment').append(option); }
  $('moment').addEventListener('change', event => selectWindow(event.target.value));
  $('play').addEventListener('click', () => {
    if (data.current >= Date.parse(data.window.end)) data.current = Date.parse(data.window.start);
    data.playing = !data.playing; setPlaybackButton();
  });
  $('timeline').addEventListener('input', event => { data.current = Number(event.target.value); data.playing = false; setPlaybackButton(); renderFrame(); });
  $('autoFrame').addEventListener('click', () => { data.auto = true; frameCamera(false, .3); });
}

async function load() {
  if (!sgp4?.twoline2satrec) throw new Error('Orbital propagation library unavailable');
  const manifest = await fetch('data/provenance.json').then(response => response.json());
  await Promise.all(craft.map(async item => {
    const record = manifest.datasets.find(dataset => dataset.object.norad === item.norad);
    if (!record) throw new Error(`Missing provenance for ${item.name}`);
    const response = await fetch(record.url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Dated elements for ${item.name} could not be retrieved`);
    const bytes = await response.arrayBuffer();
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
    if (digest !== record.sha256) throw new Error(`Dated elements for ${item.name} changed; provenance review required`);
    data.libraries[item.slot] = JSON.parse(new TextDecoder().decode(bytes));
  }));
  resize(); selectWindow('dec31', true);
  if ($('timeline')) { $('timeline').min = String(Date.parse(data.window.start)); $('timeline').max = String(Date.parse(data.window.end)); }
  // Main view starts moving immediately; Play/Pause remains visible throughout.
  data.playing = true; setPlaybackButton(); data.ready = true; requestAnimationFrame(animate);
}
load().catch(error => { $('sceneStatus').textContent = error.message; });
