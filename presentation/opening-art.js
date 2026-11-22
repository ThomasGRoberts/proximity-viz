import * as THREE from "../visualization/Viz/vendor/three/three.module.js";
import { feature } from "../visualization/Viz/vendor/topojson/topojson-client.js";
import { dotTexture } from "../visualization/Viz/relative-rendering.js";
import { EARTH_RADIUS_KM, buildOrbits, propagate, relativeAt } from "./invitation-orbits.js";

// The opening uses the same two-body LEO pair as the invitation image studio.
// Every path point is propagated and expressed in the target's changing RIC frame.
const orbits = buildOrbits(
  { altitudeKm: 550, eccentricity: .001, inclinationDeg: 53, raanDeg: 93, argPerigeeDeg: 35, meanAnomalyDeg: 358 },
  { daKm: 14, dlambdaKm: -25, dexKm: 35, deyKm: 0, dixKm: 35, diyKm: 0 }
);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const point = (position, target, frame) => {
  const dr = position.map((value, index) => value - target[index]);
  return new THREE.Vector3(dot(dr, frame.T) / 1000, dot(dr, frame.N) / 1000, dot(dr, frame.R) / 1000);
};

export function mountOpeningArt(host) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfffcf6);
  const camera = new THREE.PerspectiveCamera(36, 1, .01, 100);
  camera.position.set(1.15, .45, .55);
  camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  host.append(renderer.domElement);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS_KM / 1000, 72, 48), new THREE.MeshBasicMaterial({ color: 0xd8cbb9 }));
  scene.add(earth);
  const grid = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(EARTH_RADIUS_KM / 1000 * 1.001, 24, 12)), new THREE.LineBasicMaterial({ color: 0x897d6c, transparent: true, opacity: .22, depthWrite: false }));
  earth.add(grid);
  fetch("../visualization/Viz/vendor/countries-50m.json").then(response => response.json()).then(topology => {
    const positions = [], radius = EARTH_RADIUS_KM / 1000 * 1.003;
    for (const country of feature(topology, topology.objects.countries).features) {
      const rings = country.geometry.type === "Polygon" ? country.geometry.coordinates : country.geometry.type === "MultiPolygon" ? country.geometry.coordinates.flat() : [];
      for (const ring of rings) for (let index = 1; index < ring.length; index++) {
        const a = ring[index - 1], b = ring[index];
        if (Math.abs(a[0] - b[0]) > 25 || Math.abs(a[1] - b[1]) > 25) continue;
        for (const [lon, lat] of [a, b]) {
          const p = THREE.MathUtils.degToRad(lat), q = THREE.MathUtils.degToRad(lon);
          positions.push(radius * Math.cos(p) * Math.cos(q), radius * Math.sin(p), -radius * Math.cos(p) * Math.sin(q));
        }
      }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    earth.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0x685f53, transparent: true, opacity: .45, depthWrite: false })));
  }).catch(() => {});
  const line = (color, opacity, width = 1) => {
    const object = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color, transparent: true, opacity, linewidth: width, depthWrite: false }));
    scene.add(object); return object;
  };
  const reference = line(0x716b5d, .62), trail = line(0xd6a50d, .94, 2);
  const target = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture("#a9a9a9"), transparent: true, depthTest: true, depthWrite: false }));
  const chaser = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture("#eaaa00"), transparent: true, depthTest: true, depthWrite: false }));
  for (const marker of [target, chaser]) { marker.renderOrder = 3; scene.add(marker); }
  const resize = () => {
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
    const diameter = 14 * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.length() / height;
    target.scale.setScalar(diameter); chaser.scale.setScalar(diameter);
  };
  new ResizeObserver(resize).observe(host); resize();
  let lastTick = -Infinity;
  function render(now) {
    if (now - lastTick < 70) return;
    lastTick = now;
    const seconds = ((now / 1000 * 46) % (4 * 3600)) - 2 * 3600;
    const state = relativeAt(orbits, seconds);
    const radius = Math.hypot(...state.targetState.r);
    earth.position.set(0, 0, -radius / 1000);
    target.position.set(0, 0, 0);
    chaser.position.copy(point(state.chaserState.r, state.targetState.r, state.frame));
    const orbitPoints = Array.from({ length: 241 }, (_, index) => {
      const at = seconds + orbits.periodSeconds * index / 240;
      return point(propagate(orbits.target, at).r, state.targetState.r, state.frame);
    });
    reference.geometry.dispose(); reference.geometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const trailPoints = Array.from({ length: 220 }, (_, index) => {
      const at = seconds - 4 * 3600 + 4 * 3600 * index / 219;
      const sample = relativeAt(orbits, at);
      return new THREE.Vector3(sample.ric[1] / 1000, sample.ric[2] / 1000, sample.ric[0] / 1000);
    });
    trail.geometry.dispose(); trail.geometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
    renderer.render(scene, camera);
  }
  return { render, resize };
}
