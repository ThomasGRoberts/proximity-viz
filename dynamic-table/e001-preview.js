/* Compact E-001 scene adapted from Willa Madsen's Viz/compare.js. The camera
   follows the same Earth-fixed GEO reference used by the full relative view;
   spacecraft and trails come from the same public TLEs and SGP4 propagation. */
import * as THREE from "../visualization/Viz/vendor/three/three.module.js";
import { feature } from "../visualization/Viz/vendor/topojson/topojson-client.js";
import { relativeCameraFrame, relativeFitDistance } from "../visualization/Viz/relative-camera.js";
import { DOT_SCREEN_SIZE, SATELLITE_STYLES, dotTexture, fadingTrailGeometry, fadingTrailMaterial } from "../visualization/Viz/relative-rendering.js";

const ROOT = "../visualization/Viz/";
const EARTH_KM = 6378.137;
const DAY = 86400000;
const PREVIEW_RATE = 3 * 3600000; // simulated milliseconds per real second
const GEO_KM = 42164;
const earthAxis = new THREE.Vector3(0, 1, 0);
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
function latLon(latitude, longitude, radius = 1.001) {
  const lat = THREE.MathUtils.degToRad(latitude), lon = THREE.MathUtils.degToRad(longitude);
  return new THREE.Vector3(radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), -radius * Math.cos(lat) * Math.sin(lon));
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

export async function mountE001Preview(host, interval) {
  const [sgp4, config, cameraReference, topology, historyA, historyB] = await Promise.all([
    satelliteLibrary(), json("../visualization/local/episodes/E-001.json"),
    json("../visualization/local/camera-references/E-001-2017-10-30.json"),
    json(`${ROOT}vendor/countries-110m.json`),
    json(`${ROOT}data/tles_public/40258.json`), json(`${ROOT}data/tles_public/39509.json`)
  ]);
  if (!host.isConnected) return null;
  const libs = [historyA, historyB].map(history => ({ tles: history.tles, epochs: history.tles.map(tle => Date.parse(tle.epoch)), recs: [] }));
  const maxAgeMs = config.maximumTleAgeDays * DAY;
  let current = Math.max(interval.startMs, Math.min(interval.endMs, Date.parse(config.initialTime)));
  if (!libs.every(lib => stateAt(lib, current, sgp4, maxAgeMs))) throw new Error("No supported TLE pair at the preview start within the current episode");
  // Stay within the two initial, age-checked TLEs. Reversing at the ends keeps
  // the small scene continuous without switching between independently fitted TLEs.
  const fixedIndices = libs.map(lib => nearest(lib, current));
  const playStart = Math.max(interval.startMs, current - 12 * 3600000), playEnd = Math.min(interval.endMs, current + 36 * 3600000);
  if (playEnd <= playStart) throw new Error("Current episode interval is too short for the preview");
  let playbackDirection = 1;
  const referenceAt = ms => latLon(0, config.geoReferenceLongitudeDeg, GEO_KM / EARTH_KM).applyAxisAngle(earthAxis, sgp4.gstime(new Date(ms)));
  const compositionLift = new THREE.Vector3(0, .008, 0);
  const sourceTarget = new THREE.Vector3(...cameraReference.target);
  const closerPosition = sourceTarget.clone().addScaledVector(new THREE.Vector3(...cameraReference.position).sub(sourceTarget), .52);
  const previewCameraReference = { ...cameraReference, position: closerPosition.toArray() };
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xffffff);
  const camera = new THREE.PerspectiveCamera(cameraReference.fieldOfViewDeg, 1, cameraReference.near, cameraReference.far);
  camera.zoom = cameraReference.zoom;
  camera.up.fromArray(cameraReference.up);
  const initialFrame = relativeCameraFrame(THREE, referenceAt(current), previewCameraReference, camera.aspect);
  camera.position.copy(initialFrame.position); camera.lookAt(initialFrame.target.clone().add(compositionLift));
  let lastReference = initialFrame.target.clone();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "preview-scene"; renderer.domElement.setAttribute("aria-hidden", "true");
  host.dataset.previewFrame = "earth-fixed-relative";
  host.dataset.cameraReference = cameraReference.schema;
  host.append(renderer.domElement); host.querySelector(".visualization-still")?.setAttribute("hidden", "");
  scene.add(new THREE.HemisphereLight(0xffffff, 0xeeeeee, 2));
  const earth = new THREE.Group(); earth.add(new THREE.Mesh(new THREE.SphereGeometry(1, 160, 160), new THREE.MeshBasicMaterial({ color: 0xf7f7f7 }))); scene.add(earth);
  const borders = new THREE.Group(); earth.add(borders);
  const seenBorders = new Set(), borderPoints = [], borderRadius = 1.0017;
  const borderKey = point => `${point[0].toFixed(5)},${point[1].toFixed(5)}`;
  for (const item of feature(topology, topology.objects.countries).features) {
    const geometry = item.geometry, rings = geometry.type === "Polygon" ? geometry.coordinates : geometry.type === "MultiPolygon" ? geometry.coordinates.flat() : [];
    for (const ring of rings) {
      if (ring.length < 3) continue;
      for (let i = 1; i < ring.length; i++) {
        const first = ring[i - 1], second = ring[i];
        const key = [borderKey(first), borderKey(second)].sort().join("|");
        if (seenBorders.has(key)) continue;
        seenBorders.add(key);
        const a = latLon(first[1], first[0], borderRadius), b = latLon(second[1], second[0], borderRadius);
        const angle = a.angleTo(b);
        if (angle > THREE.MathUtils.degToRad(25)) continue;
        const steps = Math.max(1, Math.ceil(THREE.MathUtils.radToDeg(angle)));
        let last = a;
        for (let step = 1; step <= steps; step++) {
          const next = a.clone().lerp(b, step / steps).normalize().multiplyScalar(borderRadius);
          borderPoints.push(...last.toArray(), ...next.toArray()); last = next;
        }
      }
    }
  }
  const borderGeometry = new THREE.BufferGeometry(); borderGeometry.setAttribute("position", new THREE.Float32BufferAttribute(borderPoints, 3));
  borders.add(new THREE.LineSegments(borderGeometry, new THREE.LineBasicMaterial({ color: 0x626262, transparent: true, opacity: .85, depthTest: true, depthWrite: false })));
  const belt = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 360 }, (_, index) => latLon(0, index - 180, GEO_KM / EARTH_KM))), new THREE.LineBasicMaterial({ color: 0xb8aa84, transparent: true, opacity: .62, depthWrite: false }));
  earth.add(belt);
  const dots = [], orbits = [];
  const beltLabel = document.createElement("span"); beltLabel.className = "preview-geo-label"; beltLabel.textContent = "Geostationary orbit"; host.append(beltLabel);
  for (const [index, slot] of ["A", "B"].entries()) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(SATELLITE_STYLES[slot].dot), sizeAttenuation: false, transparent: true, depthTest: false, depthWrite: false }));
    const lens = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); sprite.scale.set(DOT_SCREEN_SIZE * 1.35 * lens, DOT_SCREEN_SIZE * 1.35 * lens, 1);
    sprite.renderOrder = index ? 8 : 9; scene.add(sprite); dots.push(sprite);
    const orbit = new THREE.Mesh(new THREE.BufferGeometry(), fadingTrailMaterial(slot));
    orbit.material.depthTest = false;
    orbit.renderOrder = 5;
    scene.add(orbit); orbits.push(orbit);
  }
  let disposed = false, frame = 0, last = performance.now(), lastRender = 0, lastTrail = 0;
  function resize() { if (disposed) return; const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight); camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); draw(true); }
  function draw(snapCamera = false, updateTrails = true) {
    if (disposed) return;
    const currentStates = libs.map((lib, index) => stateAt(lib, current, sgp4, maxAgeMs, fixedIndices[index]));
    const target = referenceAt(current);
    if (snapCamera) camera.position.copy(relativeCameraFrame(THREE, target, previewCameraReference, camera.aspect).position);
    else {
      const rotation = new THREE.Quaternion().setFromUnitVectors(lastReference.clone().normalize(), target.clone().normalize());
      const offset = camera.position.clone().sub(lastReference).applyQuaternion(rotation);
      camera.position.copy(target).add(offset);
    }
    lastReference = target.clone();
    const positions = currentStates.filter(Boolean).map(state => eci(state.r));
    if (positions.length) {
      const offset = camera.position.clone().sub(target), distance = offset.length();
      const goal = relativeFitDistance(THREE, { positions, target, offset, up: camera.up, fov: camera.fov,
        aspect: camera.aspect, reference: previewCameraReference, minDistance: .006, maxDistance: 50 });
      const next = snapCamera || goal > distance ? goal
        : Math.abs(goal - distance) / Math.max(distance, .001) < .06 ? distance : distance + (goal - distance) * .02;
      camera.position.copy(target).add(offset.setLength(next));
    }
    camera.lookAt(target.clone().add(compositionLift));
    const earthAngle = sgp4.gstime(new Date(current));
    for (let index = 0; index < 2; index++) {
      const lib = libs[index], tleIndex = fixedIndices[index], state = currentStates[index];
      dots[index].visible = !!state;
      if (!state) continue;
      dots[index].position.copy(eci(state.r));
      if (updateTrails) {
        const orbitMs = 2 * DAY, points = [];
        for (let step = 0; step <= 180; step++) {
          const trailTime = current - orbitMs * (1 - step / 180);
          const orbitalState = stateAt(lib, trailTime, sgp4, maxAgeMs, tleIndex);
          if (orbitalState) points.push(eci(orbitalState.r).applyAxisAngle(earthAxis, earthAngle - sgp4.gstime(new Date(trailTime))));
        }
        orbits[index].geometry.dispose(); orbits[index].geometry = fadingTrailGeometry(points);
      }
      orbits[index].material.uniforms.uResolution.value.set(host.clientWidth, host.clientHeight);
    }
    earth.rotation.y = earthAngle;
    renderer.render(scene, camera);
    camera.updateMatrixWorld(true);
    earth.updateMatrixWorld(true);
    const projectBelt = longitude => {
      const point = earth.localToWorld(latLon(0, longitude, GEO_KM / EARTH_KM + .01)).project(camera);
      return { x: (point.x + 1) * host.clientWidth / 2, y: (1 - point.y) * host.clientHeight / 2, z: point.z };
    };
    const beltAtReference = projectBelt(config.geoReferenceLongitudeDeg);
    const before = projectBelt(config.geoReferenceLongitudeDeg - .3), after = projectBelt(config.geoReferenceLongitudeDeg + .3);
    const dx = after.x - before.x, labelX = Math.min(95, host.clientWidth * .17);
    const labelY = beltAtReference.y + (after.y - before.y) / dx * (labelX - beltAtReference.x);
    beltLabel.hidden = beltAtReference.z < -1 || beltAtReference.z > 1 || Math.abs(dx) < 5 || labelY < 22 || labelY > host.clientHeight - 22;
    if (!beltLabel.hidden) {
      beltLabel.style.left = `${labelX}px`; beltLabel.style.top = `${labelY}px`;
    }
  }
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  function animate(now) {
    if (disposed || !host.isConnected) return;
    if (!document.hidden && now - lastRender >= 33 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current += Math.min((now - last) / 1000, .08) * PREVIEW_RATE * playbackDirection;
      if (current > playEnd) { current = playEnd - (current - playEnd); playbackDirection = -1; }
      if (current < playStart) { current = playStart + (playStart - current); playbackDirection = 1; }
      draw(false, now - lastTrail >= 100);
      if (now - lastTrail >= 100) lastTrail = now;
      lastRender = last = now;
    }
    if (document.hidden) last = now;
    frame = requestAnimationFrame(animate);
  }
  frame = requestAnimationFrame(animate);
  return { dispose() { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); beltLabel.remove(); renderer.domElement.remove(); disposeScene(scene, renderer); } };
}
