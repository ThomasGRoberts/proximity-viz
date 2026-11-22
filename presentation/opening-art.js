import * as THREE from "../visualization/Viz/vendor/three/three.module.js";
import { OrbitControls } from "../visualization/Viz/vendor/three/addons/controls/OrbitControls.js";
import { feature } from "../visualization/Viz/vendor/topojson/topojson-client.js";
import { dotTexture } from "../visualization/Viz/relative-rendering.js";
import { EARTH_RADIUS_KM, buildOrbits, propagate, relativeAt } from "./invitation-orbits.js";

// The opening uses the same two-body LEO pair as the invitation image studio.
// Every path point is propagated and expressed in the target's changing RIC frame.
const orbits = buildOrbits(
  { altitudeKm: 550, eccentricity: .001, inclinationDeg: 53, raanDeg: 93, argPerigeeDeg: 35, meanAnomalyDeg: 358 },
  { daKm: 0, dlambdaKm: -25, dexKm: 35, deyKm: 0, dixKm: 35, diyKm: 0 }
);
const extraOrbits = [1,2,3].map(index => buildOrbits(
  { altitudeKm: 550, eccentricity: .001, inclinationDeg: 53, raanDeg: 93, argPerigeeDeg: 35, meanAnomalyDeg: 358 },
  { daKm: 0, dlambdaKm: -25 + 95 * index, dexKm: 35, deyKm: 0, dixKm: 35, diyKm: 0 }
));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const point = (position, target, frame) => {
  const dr = position.map((value, index) => value - target[index]);
  return new THREE.Vector3(dot(dr, frame.T) / 1000, dot(dr, frame.N) / 1000, dot(dr, frame.R) / 1000);
};

export function mountOpeningArt(host, initialOptions = {}) {
  const options = { markerSizePx:42, trailHours:1.2, trailThickness:3.2, referenceThickness:1.3,
    borderThickness:1.1, borderOpacity:.68, borderColor:"#685f53", earthColor:"#e5e5e5",
    animationRate:240, extraChasers:0, ...initialOptions };
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  const camera = new THREE.PerspectiveCamera(36, 1, .01, 100);
  camera.position.set(1.15, .45, .55);
  camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  host.append(renderer.domElement);
  renderer.domElement.dataset.noAdvance = "true";
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .08; controls.enablePan = true;
  controls.minDistance = .2; controls.maxDistance = 18;
  const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS_KM / 1000, 72, 48), new THREE.MeshBasicMaterial({ color: options.earthColor }));
  scene.add(earth);
  const grid = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(EARTH_RADIUS_KM / 1000 * 1.001, 24, 12)), new THREE.LineBasicMaterial({ color: options.borderColor, transparent: true, opacity: options.borderOpacity * .24, depthWrite: false }));
  earth.add(grid);
  const borderGeometry = new THREE.CylinderGeometry(1,1,1,3);
  const borderMaterial = new THREE.MeshBasicMaterial({ color:options.borderColor, transparent:true, opacity:options.borderOpacity, depthWrite:false });
  const borderSegments = [], yAxis = new THREE.Vector3(0,1,0), scratch = new THREE.Object3D();
  let borderMesh;
  function redrawBorders() {
    if (!borderSegments.length) return;
    if (borderMesh) { earth.remove(borderMesh); borderMesh.dispose(); }
    borderMesh = new THREE.InstancedMesh(borderGeometry,borderMaterial,borderSegments.length);
    borderMesh.frustumCulled = false;
    const thickness = .0034 * Number(options.borderThickness);
    borderSegments.forEach(([a,b],index) => {
      const direction=b.clone().sub(a),length=direction.length();
      if(length<1e-9){scratch.scale.set(0,0,0);scratch.updateMatrix();borderMesh.setMatrixAt(index,scratch.matrix);return;}
      scratch.position.copy(a).add(b).multiplyScalar(.5);
      scratch.quaternion.setFromUnitVectors(yAxis,direction.normalize());
      scratch.scale.set(thickness,length,thickness);scratch.updateMatrix();
      borderMesh.setMatrixAt(index,scratch.matrix);
    });
    borderMesh.instanceMatrix.needsUpdate=true;earth.add(borderMesh);
  }
  fetch("../visualization/Viz/vendor/countries-50m.json").then(response => response.json()).then(topology => {
    const radius = EARTH_RADIUS_KM / 1000 * 1.004;
    const xyz = ([lon,lat]) => { const p=THREE.MathUtils.degToRad(lat),q=THREE.MathUtils.degToRad(lon); return new THREE.Vector3(radius*Math.cos(p)*Math.cos(q),radius*Math.sin(p),-radius*Math.cos(p)*Math.sin(q)); };
    for (const country of feature(topology, topology.objects.countries).features) {
      const rings = country.geometry.type === "Polygon" ? country.geometry.coordinates : country.geometry.type === "MultiPolygon" ? country.geometry.coordinates.flat() : [];
      for (const ring of rings) for (let index = 1; index < ring.length; index++) {
        const a = ring[index - 1], b = ring[index];
        if (Math.abs(a[0] - b[0]) > 25 || Math.abs(a[1] - b[1]) > 25) continue;
        borderSegments.push([xyz(a),xyz(b)]);
      }
    }
    redrawBorders();
  }).catch(() => {});
  const line = (color, opacity) => {
    const object = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    scene.add(object); return object;
  };
  const reference = line(0x716b5d, .62), trail = line(0xd6a50d, .94);
  const target = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture("#a9a9a9"), transparent: true, depthTest: true, depthWrite: false }));
  const chaser = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture("#eaaa00"), transparent: true, depthTest: true, depthWrite: false }));
  const extraMarkers = extraOrbits.map(() => new THREE.Sprite(new THREE.SpriteMaterial({map:dotTexture("#eaaa00"),transparent:true,opacity:.55,depthTest:true,depthWrite:false})));
  for (const marker of [target, chaser, ...extraMarkers]) { marker.renderOrder = 3; scene.add(marker); }
  const resize = () => {
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
  };
  new ResizeObserver(resize).observe(host); resize();
  const worldPerPixel = () => 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.distanceTo(controls.target) / Math.max(1,host.clientHeight) / camera.zoom;
  function tube(mesh,points,weight) {
    mesh.geometry.dispose();
    mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,false,"centripetal"),points.length-1,Math.max(.0006,weight*worldPerPixel()*.5),4,false);
  }
  function setOptions(next) {
    Object.assign(options,next);
    earth.material.color.set(options.earthColor);
    borderMaterial.color.set(options.borderColor); borderMaterial.opacity=Number(options.borderOpacity);
    grid.material.color.set(options.borderColor);grid.material.opacity=Number(options.borderOpacity)*.24;
    if ("borderThickness" in next) redrawBorders();
  }
  let lastTick = -Infinity, lastCameraDistance = 0;
  function render(now) {
    controls.update();
    const cameraDistance=camera.position.distanceTo(controls.target);
    if (now - lastTick < 55 && Math.abs(cameraDistance-lastCameraDistance)<.02) return;
    lastTick = now; lastCameraDistance=cameraDistance;
    const seconds = (now / 1000 * Number(options.animationRate)) % orbits.periodSeconds;
    const state = relativeAt(orbits, seconds);
    const radius = Math.hypot(...state.targetState.r);
    earth.position.set(0, 0, -radius / 1000);
    target.position.set(0, 0, 0);
    chaser.position.copy(point(state.chaserState.r, state.targetState.r, state.frame));
    const diameter=Number(options.markerSizePx)*worldPerPixel();
    target.scale.setScalar(diameter);chaser.scale.setScalar(diameter);
    extraMarkers.forEach((marker,index) => {
      marker.visible=index<Number(options.extraChasers);
      if(marker.visible){const sample=relativeAt(extraOrbits[index],seconds);marker.position.copy(point(sample.chaserState.r,state.targetState.r,state.frame));marker.scale.setScalar(diameter*.85);}
    });
    const orbitPoints = Array.from({ length: 181 }, (_, index) => {
      const at = seconds + orbits.periodSeconds * index / 180;
      return point(propagate(orbits.target, at).r, state.targetState.r, state.frame);
    });
    tube(reference,orbitPoints,Number(options.referenceThickness));
    const trailSeconds=Math.max(300,Math.min(2*orbits.periodSeconds,Number(options.trailHours)*3600));
    const trailPoints = Array.from({ length: 150 }, (_, index) => {
      const at = seconds - trailSeconds + trailSeconds * index / 149;
      const sample = relativeAt(orbits, at);
      return new THREE.Vector3(sample.ric[1] / 1000, sample.ric[2] / 1000, sample.ric[0] / 1000);
    });
    tube(trail,trailPoints,Number(options.trailThickness));
    renderer.render(scene, camera);
  }
  return { render, resize, setOptions, options };
}
