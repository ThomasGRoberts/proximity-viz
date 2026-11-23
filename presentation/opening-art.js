import * as THREE from "../visualization/Viz/vendor/three/three.module.js";
import { OrbitControls } from "../visualization/Viz/vendor/three/addons/controls/OrbitControls.js";
import { dotTexture, fadingTrailGeometry, fadingTrailMaterial } from "../visualization/Viz/relative-rendering.js";
import { EARTH_RADIUS_KM, buildOrbits, propagate, relativeAt } from "./invitation-orbits.js";
import { loadGlobeGeography, adjustableCountryBorders } from "./globe-style.js";

// The opening uses the same two-body LEO pair as the invitation image studio.
// Every path point is propagated and expressed in the target's changing RIC frame.
const defaultTarget = { altitudeKm: 550, eccentricity: .001, inclinationDeg: 53, raanDeg: 93, argPerigeeDeg: 35, meanAnomalyDeg: 358 };
const targetElements = options => Object.fromEntries(Object.keys(defaultTarget).map(key => [key, Number(options[`target${key[0].toUpperCase()}${key.slice(1)}`] ?? defaultTarget[key])]));
const relativeElements = options => ({daKm:Number(options.chaserDaKm),dlambdaKm:Number(options.chaserDlambdaKm),dexKm:Number(options.chaserDexKm),deyKm:Number(options.chaserDeyKm),dixKm:Number(options.chaserDixKm),diyKm:Number(options.chaserDiyKm)});
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const point = (position, target, frame) => {
  const dr = position.map((value, index) => value - target[index]);
  return new THREE.Vector3(dot(dr, frame.T) / 1000, dot(dr, frame.N) / 1000, dot(dr, frame.R) / 1000);
};

export function mountOpeningArt(host, initialOptions = {}) {
  const options = { markerSizePx:42, trailHours:1.2, trailThickness:3.2, referenceThickness:1.3,
    borderThickness:1.1, borderOpacity:.68, borderColor:"#685f53", earthColor:"#e5e5e5",
    animationRate:240, extraChasers:0, earthScale:1, artScale:1, earthSwivelDeg:0,
    chaserDaKm:0,chaserDlambdaKm:-25,chaserDexKm:35,chaserDeyKm:0,chaserDixKm:35,chaserDiyKm:0,...initialOptions };
  let orbits=buildOrbits(targetElements(options),relativeElements(options));
  let extraOrbits=[1,2,3].map(index=>buildOrbits(targetElements(options),{...relativeElements(options),dlambdaKm:Number(options.chaserDlambdaKm)+95*index}));
  const scene = new THREE.Scene();
  const artGroup = new THREE.Group(); scene.add(artGroup);
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
  controls.minDistance = .2; controls.maxDistance = options.sectionMode ? 40 : 18;
  if(options.sectionMode){camera.position.set(6,2,24);controls.target.set(0,0,-3.7);controls.update();}
  if(options.cameraView){camera.position.fromArray(options.cameraView.position);controls.target.fromArray(options.cameraView.target);camera.up.fromArray(options.cameraView.up);camera.zoom=options.cameraView.zoom||1;camera.updateProjectionMatrix();controls.update();}
  const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS_KM / 1000, 160, 160), new THREE.MeshBasicMaterial({ color: options.earthColor }));
  artGroup.add(earth);
  let borderMesh;
  loadGlobeGeography({land:true,radius:(EARTH_RADIUS_KM / 1000) * 1.0003}).then(({geometry,landTexture}) => {
    earth.material.map=landTexture;earth.material.needsUpdate=true;
    borderMesh=adjustableCountryBorders(Array.from(geometry.attributes.position.array),options.borderColor,options.borderOpacity,options.borderThickness,host.clientWidth,host.clientHeight);
    borderMesh.material.polygonOffset=true;borderMesh.material.polygonOffsetFactor=-1;borderMesh.material.polygonOffsetUnits=-1;
    earth.add(borderMesh);geometry.dispose();
  }).catch(error=>console.warn("Opening globe geography unavailable",error));
  const line = (color, opacity) => {
    const object = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    artGroup.add(object); return object;
  };
  const reference = line(0x716b5d, .62);
  const trail = new THREE.Mesh(new THREE.BufferGeometry(),fadingTrailMaterial("B",Number(options.trailThickness)/2,0));
  trail.material.uniforms.uColor.value.set("#eaaa00");
  trail.frustumCulled=false;artGroup.add(trail);
  const target = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture("#a9a9a9"), transparent: true, depthTest: true, depthWrite: false }));
  const chaser = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture("#eaaa00"), transparent: true, depthTest: true, depthWrite: false }));
  const extraMarkers = extraOrbits.map(() => new THREE.Sprite(new THREE.SpriteMaterial({map:dotTexture("#eaaa00"),transparent:true,opacity:.55,depthTest:true,depthWrite:false})));
  for (const marker of [target, chaser, ...extraMarkers]) { marker.renderOrder = 3; artGroup.add(marker); }
  const resize = () => {
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
  };
  new ResizeObserver(resize).observe(host); resize();
  const worldPerPixel = () => 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.distanceTo(controls.target) / Math.max(1,host.clientHeight) / camera.zoom;
  function tube(mesh,points,weight) {
    mesh.geometry.dispose();
    mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,false,"centripetal"),points.length-1,Math.max(.00008,weight*worldPerPixel()*.5),4,false);
  }
  function setOptions(next) {
    Object.assign(options,next);
    if(Object.keys(next).some(key=>key.startsWith("chaserD")||key.startsWith("target"))){
      orbits=buildOrbits(targetElements(options),relativeElements(options));
      extraOrbits=[1,2,3].map(index=>buildOrbits(targetElements(options),{...relativeElements(options),dlambdaKm:Number(options.chaserDlambdaKm)+95*index}));
    }
    earth.scale.setScalar(Number(options.earthScale));
    artGroup.scale.setScalar(Number(options.artScale));
    earth.material.color.set(options.earthColor);
    if(borderMesh){borderMesh.material.uniforms.uColor.value.set(options.borderColor);borderMesh.material.uniforms.uOpacity.value=Number(options.borderOpacity);borderMesh.material.uniforms.uHalfWidthPx.value=Number(options.borderThickness)/2;}
    trail.material.uniforms.uHalfWidthPx.value=Number(options.trailThickness)/2;
  }
  setOptions(options);
  let lastTick = -Infinity, lastCameraDistance = 0, chaserStartSeconds = null, sceneStartSeconds = null;
  function render(now) {
    controls.update();
    const cameraDistance=camera.position.distanceTo(controls.target);
    if (now - lastTick < 28 && Math.abs(cameraDistance-lastCameraDistance)<.02) return;
    lastTick = now; lastCameraDistance=cameraDistance;
    const simulatedSeconds=now / 1000 * Number(options.animationRate);
    sceneStartSeconds ??= simulatedSeconds;
    chaserStartSeconds ??= simulatedSeconds;
    let seconds=simulatedSeconds-chaserStartSeconds;
    let state=relativeAt(orbits,seconds);
    let chaserPoint=point(state.chaserState.r,state.targetState.r,state.frame);
    let screenEdge=Math.max(Math.abs(chaserPoint.clone().project(camera).x),Math.abs(chaserPoint.clone().project(camera).y));
    // Once the current synthetic chaser has left the camera's view, begin the
    // next one without stopping the long-running presentation animation.
    if(seconds>orbits.periodSeconds&&screenEdge>1.25){
      chaserStartSeconds=simulatedSeconds;seconds=0;state=relativeAt(orbits,seconds);
      chaserPoint=point(state.chaserState.r,state.targetState.r,state.frame);
      screenEdge=Math.max(Math.abs(chaserPoint.clone().project(camera).x),Math.abs(chaserPoint.clone().project(camera).y));
    }
    const radius = Math.hypot(...state.targetState.r);
    earth.position.set(0, 0, -radius / 1000);
    const {T,N,R}=state.frame;
    const basis=new THREE.Matrix4().makeBasis(new THREE.Vector3(T[0],N[0],R[0]),new THREE.Vector3(T[2],N[2],R[2]),new THREE.Vector3(-T[1],-N[1],-R[1]));
    earth.quaternion.setFromRotationMatrix(basis).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),(simulatedSeconds-sceneStartSeconds)*7.2921159e-5+THREE.MathUtils.degToRad(Number(options.earthSwivelDeg))));
    target.position.set(0, 0, 0);
    chaser.position.copy(chaserPoint);
    const diameter=Number(options.markerSizePx)*worldPerPixel();
    target.scale.setScalar(diameter);chaser.scale.setScalar(diameter);
    const edgeFade=THREE.MathUtils.clamp((1.35-screenEdge)/.2,0,1);
    chaser.material.opacity=1;
    extraMarkers.forEach((marker,index) => {
      marker.visible=index<Number(options.extraChasers);
      if(marker.visible){const sample=relativeAt(extraOrbits[index],seconds);marker.position.copy(point(sample.chaserState.r,state.targetState.r,state.frame));marker.scale.setScalar(diameter*.85);}
    });
    const orbitPoints = Array.from({ length: 181 }, (_, index) => {
      const at = seconds + orbits.periodSeconds * index / 180;
      return point(propagate(orbits.target, at).r, state.targetState.r, state.frame);
    });
    tube(reference,orbitPoints,Number(options.referenceThickness));
    const trailSeconds=Math.max(60,Math.min(2*orbits.periodSeconds,Number(options.trailHours)*3600));
    const trailPoints = Array.from({ length: 150 }, (_, index) => {
      const at = seconds - trailSeconds + trailSeconds * index / 149;
      const sample = relativeAt(orbits, at);
      return new THREE.Vector3(sample.ric[1] / 1000, sample.ric[2] / 1000, sample.ric[0] / 1000);
    });
    trail.geometry.dispose();trail.geometry=fadingTrailGeometry(trailPoints);
    trail.material.uniforms.uResolution.value.set(host.clientWidth,host.clientHeight);
    // The sprite has perspective size attenuation. Its recent trail should
    // recede at the same rate when the chaser travels away from the camera.
    const perspectiveScale=camera.position.distanceTo(controls.target)/Math.max(.01,camera.position.distanceTo(chaser.position));
    trail.material.uniforms.uHalfWidthPx.value=Number(options.trailThickness)/2*perspectiveScale;
    if(borderMesh)borderMesh.material.uniforms.uResolution.value.set(host.clientWidth,host.clientHeight);
    trail.material.uniforms.uOpacity.value=.94*Math.max(0,edgeFade);
    renderer.render(scene, camera);
  }
  const getCamera=()=>({position:camera.position.toArray(),target:controls.target.toArray(),up:camera.up.toArray(),zoom:camera.zoom});
  const resetPlayback=()=>{chaserStartSeconds=null;lastTick=-Infinity;};
  return { render, resize, setOptions, getCamera, resetPlayback, options };
}
