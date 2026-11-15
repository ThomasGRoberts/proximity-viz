/* Compact E-001 scene adapted from Willa Madsen's Viz/compare.js. It uses the
   same published TLE files, SGP4 propagation, ECI-to-Three coordinates, Earth
   rotation, and orbital trajectories as the full Proximity-Viz. */
import * as THREE from "../visualization/Viz/vendor/three/three.module.js";
import { feature } from "../visualization/Viz/vendor/topojson/topojson-client.js";

const ROOT = "../visualization/Viz/";
const EARTH_KM = 6378.137;
const MINUTE = 60000;
const DAY = 86400000;
const eci = vector => new THREE.Vector3(vector[0] / EARTH_KM, vector[2] / EARTH_KM, -vector[1] / EARTH_KM);
const json = async path => {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`E-001 preview data unavailable: ${path}`);
  return response.json();
};
let satellitePromise;
function satelliteLibrary() {
  return satellitePromise ||= import(`${ROOT}vendor/satellite/satellite.min.js`).then(() => {
    if (!window.satellite?.twoline2satrec) throw new Error("Satellite propagation library unavailable");
    return window.satellite;
  });
}
function nearest(lib, ms) {
  let low = 0, high = lib.epochs.length - 1;
  while (low < high) { const middle = Math.floor((low + high) / 2); if (lib.epochs[middle] < ms) low = middle + 1; else high = middle; }
  return low > 0 && ms - lib.epochs[low - 1] < lib.epochs[low] - ms ? low - 1 : low;
}
function satrec(lib, index, sgp4) {
  return lib.recs[index] ||= sgp4.twoline2satrec(lib.tles[index].line1, lib.tles[index].line2);
}
function stateAt(lib, ms, sgp4, maxAgeMs, index = nearest(lib, ms)) {
  if (Math.abs(ms - lib.epochs[index]) > maxAgeMs) return null;
  const state = sgp4.propagate(satrec(lib, index, sgp4), new Date(ms));
  return state.position && state.velocity ? { r: [state.position.x, state.position.y, state.position.z], v: [state.velocity.x, state.velocity.y, state.velocity.z] } : null;
}
function latLon(latitude, longitude) {
  const lat = THREE.MathUtils.degToRad(latitude), lon = THREE.MathUtils.degToRad(longitude);
  return new THREE.Vector3(1.001 * Math.cos(lat) * Math.cos(lon), 1.001 * Math.sin(lat), -1.001 * Math.cos(lat) * Math.sin(lon));
}
function dotTexture(color) {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 96;
  const ctx = canvas.getContext("2d"); ctx.beginPath(); ctx.arc(48, 48, 28, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 9; ctx.strokeStyle = "#3d3d3d"; ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function disposeScene(scene, renderer) {
  scene.traverse(object => {
    object.geometry?.dispose();
    for (const material of object.material ? Array.isArray(object.material) ? object.material : [object.material] : []) {
      material.map?.dispose(); material.dispose();
    }
  });
  renderer.dispose(); renderer.forceContextLoss();
}

export async function mountE001Preview(host) {
  const [sgp4, config, topology, series, historyA, historyB] = await Promise.all([
    satelliteLibrary(), json("../visualization/local/episodes/E-001.json"), json(`${ROOT}vendor/countries-110m.json`),
    json("../shared/e001-series.json"), json(`${ROOT}data/tles_public/40258.json`), json(`${ROOT}data/tles_public/39509.json`)
  ]);
  if (!host.isConnected) return null;
  const libs = [historyA, historyB].map(history => ({ tles: history.tles, epochs: history.tles.map(tle => Date.parse(tle.epoch)), recs: [] }));
  const maxAgeMs = config.maximumTleAgeDays * DAY;
  const validTimes = series.samples.filter(sample => Number.isFinite(sample.separationKm) && Number.isFinite(sample.relativeVelocityMps)).map(sample => sample.ms);
  if (!validTimes.length) throw new Error("No verified E-001 preview interval");
  const start = validTimes[0], end = validTimes.at(-1);
  let current = Date.parse("2017-10-30T12:00:00Z");
  if (!libs.every(lib => stateAt(lib, current, sgp4, maxAgeMs))) current = validTimes.reduce((best, ms) => Math.abs(ms - current) < Math.abs(best - current) ? ms : best, validTimes[0]);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xfaf9f5);
  const camera = new THREE.PerspectiveCamera(35, 1, .01, 100);
  const initialStates = libs.map(lib => stateAt(lib, current, sgp4, maxAgeMs));
  const pairMid = eci(initialStates[0].r).add(eci(initialStates[1].r)).multiplyScalar(.5);
  const target = pairMid.clone().multiplyScalar(.52);
  const normals = initialStates.map(state => eci(state.r).cross(eci(state.v)).normalize());
  if (normals[0].dot(normals[1]) < 0) normals[1].negate();
  const normal = normals[0].add(normals[1]).normalize();
  if (normal.z < 0) normal.negate();
  camera.up.copy(normal.clone().cross(pairMid).normalize());
  camera.position.copy(target).addScaledVector(normal, 9); camera.lookAt(target);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "preview-scene"; renderer.domElement.setAttribute("aria-hidden", "true");
  host.append(renderer.domElement); host.querySelector(".visualization-still")?.setAttribute("hidden", "");
  scene.add(new THREE.HemisphereLight(0xffffff, 0xeeeeee, 2));
  const earth = new THREE.Group(); earth.add(new THREE.Mesh(new THREE.SphereGeometry(1, 72, 48), new THREE.MeshBasicMaterial({ color: 0xf0f0ed }))); scene.add(earth);
  const borders = new THREE.Group(); earth.add(borders);
  for (const item of feature(topology, topology.objects.countries).features) {
    const geometry = item.geometry, rings = geometry.type === "Polygon" ? geometry.coordinates : geometry.type === "MultiPolygon" ? geometry.coordinates.flat() : [];
    for (const ring of rings) {
      if (ring.length < 3) continue;
      const curve = new THREE.CatmullRomCurve3(ring.map(([lon, lat]) => latLon(lat, lon)), true);
      borders.add(new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(18, ring.length * 2), .004, 4, true), new THREE.MeshBasicMaterial({ color: 0x828282, transparent: true, opacity: .85, depthWrite: false })));
    }
  }
  const belt = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 180 }, (_, index) => latLon(0, index * 2 - 180).multiplyScalar(6.6108))), new THREE.LineBasicMaterial({ color: 0xb8aa84, transparent: true, opacity: .45 }));
  earth.add(belt);
  const dots = [], orbits = [], labels = [];
  for (const [index, color] of ["#eaaa00", "#8b8b8b"].entries()) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(color), sizeAttenuation: false }));
    const lens = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); sprite.scale.set(.046 * lens, .046 * lens, 1);
    sprite.renderOrder = 8; scene.add(sprite); dots.push(sprite);
    const orbit = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: index ? 0x9e9e9e : 0xb59a4f, transparent: true, opacity: .78 }));
    scene.add(orbit); orbits.push(orbit);
    const label = document.createElement("span"); label.className = `preview-sat-label preview-sat-${index}`;
    label.textContent = index ? "Athena-Fidus" : "Luch (Olymp-K)"; host.append(label); labels.push(label);
  }
  let disposed = false, frame = 0, last = performance.now();
  function resize() { if (disposed) return; const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight); camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); draw(); }
  function draw() {
    if (disposed) return;
    const currentStates = libs.map(lib => stateAt(lib, current, sgp4, maxAgeMs));
    if (currentStates.every(Boolean)) {
      const midpoint = eci(currentStates[0].r).add(eci(currentStates[1].r)).multiplyScalar(.5);
      const focus = midpoint.clone().multiplyScalar(.52);
      camera.up.copy(normal.clone().cross(midpoint).normalize());
      camera.position.copy(focus).addScaledVector(normal, 9);
      camera.lookAt(focus);
    }
    for (let index = 0; index < 2; index++) {
      const lib = libs[index], tleIndex = nearest(lib, current), state = currentStates[index];
      dots[index].visible = !!state; labels[index].hidden = !state;
      if (!state) continue;
      dots[index].position.copy(eci(state.r));
      const record = satrec(lib, tleIndex, sgp4), orbitMs = 2 * Math.PI / record.no * MINUTE, points = [];
      for (let step = 0; step <= 120; step++) {
        const orbitalState = stateAt(lib, current - orbitMs * (1 - step / 120), sgp4, maxAgeMs, tleIndex);
        if (orbitalState) points.push(eci(orbitalState.r));
      }
      orbits[index].geometry.dispose(); orbits[index].geometry = new THREE.BufferGeometry().setFromPoints(points);
    }
    earth.rotation.y = -sgp4.gstime(new Date(current));
    renderer.render(scene, camera);
    camera.updateMatrixWorld(true);
    for (let index = 0; index < 2; index++) {
      if (!dots[index].visible) continue;
      const point = dots[index].position.clone().project(camera);
      labels[index].style.left = `${Math.max(4, Math.min(host.clientWidth - 90, (point.x + 1) * host.clientWidth / 2 + 7))}px`;
      labels[index].style.top = `${Math.max(3, Math.min(host.clientHeight - 15, (1 - point.y) * host.clientHeight / 2 + (index ? -17 : 4)))}px`;
    }
  }
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  function animate(now) {
    if (disposed || !host.isConnected) return;
    if (!document.hidden && now - last >= 110 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current += Math.min((now - last) / 1000, .2) * 21600 * 1000;
      if (current > end) current = start;
      if (!libs.every(lib => stateAt(lib, current, sgp4, maxAgeMs))) current = validTimes.find(ms => ms >= current) || start;
      host.dataset.previewTime = new Date(current).toISOString();
      draw(); last = now;
    }
    frame = requestAnimationFrame(animate);
  }
  frame = requestAnimationFrame(animate);
  return { dispose() { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); labels.forEach(label => label.remove()); renderer.domElement.remove(); disposeScene(scene, renderer); } };
}
