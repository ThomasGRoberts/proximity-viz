import * as THREE from "../visualization/Viz/vendor/three/three.module.js";
import { OrbitControls } from "../visualization/Viz/vendor/three/addons/controls/OrbitControls.js";
import { feature } from "../visualization/Viz/vendor/topojson/topojson-client.js";
import { dotTexture } from "../visualization/Viz/relative-rendering.js";
import { createEngine, EPOCH_MS, EARTH_KM, orbitalFrame, relativeCoordinates, dwellHours } from "./orbit-engine.js";

const $ = id => document.getElementById(id);
const clone = value => structuredClone(value);
const chapterIds = ["tle", "uncertainty", "neighbors", "relative", "time-series", "conjunction", "thresholds", "shadowing"];
const initialVisibility = {
  tle: { objectB:false, tle:true, uncertainty:false, metrics:false, charts:false, thresholds:false, maneuvers:false },
  uncertainty: { objectB:false, tle:true, uncertainty:true, metrics:false, charts:false, thresholds:false, maneuvers:false },
  neighbors: { objectB:true, tle:false, uncertainty:false, metrics:false, charts:false, thresholds:false, maneuvers:false },
  relative: { objectB:true, tle:false, uncertainty:false, metrics:true, charts:false, thresholds:false, maneuvers:true },
  "time-series": { objectB:true, tle:false, uncertainty:false, metrics:true, charts:true, thresholds:false, maneuvers:true },
  conjunction: { objectB:true, tle:false, uncertainty:false, metrics:true, charts:true, thresholds:false, maneuvers:false },
  thresholds: { objectB:true, tle:false, uncertainty:false, metrics:true, charts:true, thresholds:true, maneuvers:false },
  shadowing: { objectB:true, tle:false, uncertainty:false, metrics:true, charts:true, thresholds:true, maneuvers:true }
};
const controlGroups = {
  absoluteControls: [
    ["objectA.altitudeKm", "Altitude", 35000, 36500, 1, "km"], ["objectA.inclinationDeg", "Inclination", 0, 6, .01, "°"],
    ["objectA.eccentricity", "Eccentricity", 0, .02, .00001, ""], ["objectA.raanDeg", "RAAN", 0, 360, .1, "°"],
    ["objectA.argPerigeeDeg", "Argument of perigee", 0, 360, .1, "°"], ["objectA.meanAnomalyDeg", "Mean anomaly", 0, 360, .1, "°"]
  ], relativeControls: [
    ["objectB.relativeLongitudeDeg", "Relative longitude", -3, 3, .001, "°"], ["objectB.deltaAltitudeKm", "Altitude difference", -500, 500, .1, "km"],
    ["objectB.deltaInclinationDeg", "Inclination difference", -3, 3, .01, "°"], ["objectB.deltaEccentricity", "Eccentricity difference", -.005, .005, .00001, ""],
    ["objectB.deltaRaanDeg", "RAAN difference", -5, 5, .01, "°"]
  ], maneuverControls: [
    ["maneuver.enabled", "Enable maneuvers", "check"], ["maneuver.sequence", "Sequence", "select", ["drift", "hold", "repeat"]],
    ["maneuver.startHour", "First burn", 0, 96, .1, "h"], ["maneuver.deltaVms", "Tangential impulse", -10, 10, .1, "m/s"],
    ["maneuver.durationHours", "Between burns", .1, 96, .1, "h"]
  ], displayControls: [
    ["display.mode", "Frame", "select", ["eci", "relative"]], ["display.startHour", "Timeline start", -48, 120, .1, "h"],
    ["display.endHour", "Timeline end", -24, 240, .1, "h"], ["display.rateHoursPerSecond", "Playback speed", .05, 24, .05, "h/s"],
    ["display.trailHours", "Trail length", 0, 96, .5, "h"], ["display.markerSizePx", "Marker size", 5, 25, 1, "px"],
    ["display.showOrbit", "Reference orbit", "check"], ["display.showTrail", "Trails", "check"],
    ["display.showVectors", "Relative vector", "check"], ["display.showUncertainty", "Hypothetical ellipsoid", "check"],
    ["display.uncertaintyKm", "Ellipsoid scale", 1, 1000, 1, "km"],
    ["display.distanceThresholdKm", "Distance threshold", 0, 50000, 10, "km"],
    ["display.speedThresholdMs", "Speed threshold", 0, 1000, .1, "m/s"]
  ]
};
const components = ["objectB", "tle", "uncertainty", "metrics", "charts", "thresholds", "maneuvers"];
const fieldLabels = { objectB:"Object B card", tle:"TLE and epoch", uncertainty:"Uncertainty", metrics:"Relative metrics", charts:"Time-series charts", thresholds:"Threshold controls", maneuvers:"Maneuver history" };
const toScene = (point, scale) => new THREE.Vector3(point.x / scale, point.z / scale, -point.y / scale);
const fmtDate = hour => new Intl.DateTimeFormat("en-US", { timeZone:"UTC", month:"short", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit", hour12:false }).format(new Date(EPOCH_MS + hour * 3600000)) + " UTC";
const fmtNum = value => Number.isFinite(value) ? new Intl.NumberFormat("en-US", {maximumFractionDigits: value < 10 ? 2 : 0}).format(value) : "—";
let doc, stepIndex = 0, config, engine, series, currentHour = 0, playing = true, lastFrame = 0, spotMode = false, draft = null, comments = [], activePreset = "neighbors", customCamera = false, scene3d;

async function request(path, payload) {
  const res = await fetch(path, payload ? { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) } : { cache:"no-store" });
  const value = await res.json();
  if (!res.ok) throw new Error(value.error || `Save failed (${res.status})`);
  return value;
}
const presentMode = new URLSearchParams(location.search).get("mode") === "present";
document.body.classList.toggle("presentation", presentMode);
document.body.classList.toggle("review", !presentMode);
queueMicrotask(async () => {
  try {
    doc = await request("/api/presentation-config").catch(() => fetch("defaults.json").then(r => r.json()));
    comments = (await request("/api/presentation-comments").catch(() => ({comments:[]}))).comments || [];
    setup();
  } catch (error) { $("error").textContent = error.message; $("error").hidden = false; console.error(error); }
});

function setup() {
  stepIndex = Math.max(0, doc.steps.findIndex(step => step.id === location.hash.slice(1)));
  buildStepNav(); buildControls(); buildVisibility(); buildPresets(); setupScene(); bind(); showStep(); animate(0); renderComments();
}
function step() { return doc.steps[stepIndex]; }
function chapter() { return step().kind === "chapter"; }
function visibility() { return { ...initialVisibility[step().id], ...doc.chapterVisibility[step().id] }; }
function buildStepNav() {
  $("steps").replaceChildren();
  doc.steps.forEach((item, index) => {
    const button = document.createElement("button"); button.type = "button";
    button.textContent = item.kind === "chapter" ? `${chapterIds.indexOf(item.id) + 1}. ${item.title}` : item.title;
    button.title = item.title; button.addEventListener("click", () => go(index)); $("steps").append(button);
  });
}
function go(index) { if (index < 0 || index >= doc.steps.length) return; stepIndex = index; history.replaceState(null, "", `#${step().id}`); showStep(); }
function showStep() {
  const item = step();
  [...$("steps").children].forEach((node, index) => index === stepIndex ? node.setAttribute("aria-current", "step") : node.removeAttribute("aria-current"));
  $("stepPosition").textContent = `${stepIndex + 1} / ${doc.steps.length}`;
  $("previous").disabled = stepIndex === 0; $("next").disabled = stepIndex === doc.steps.length - 1;
  $("slide").hidden = chapter(); $("episode").hidden = !chapter(); $("inspector").hidden = !chapter() || presentMode;
  if (!chapter()) { $("slideTitle").textContent = item.title; $("slideEyebrow").textContent = item.subtitle || ""; $("slideBody").textContent = item.body || ""; placePins(); return; }
  activePreset = doc.chapterPresets[item.id] || "neighbors";
  config = clone(doc.chapterOverrides[item.id] || doc.presets[activePreset]);
  if (item.id === "conjunction") config.display.mode = "relative";
  currentHour = config.display.startHour; customCamera = false;
  $("chapterNumber").textContent = item.subtitle; $("chapterTitle").textContent = item.title; $("chapterBody").textContent = item.body;
  $("presetSelect").value = activePreset;
  syncControls(); updateVisibility(); recalc(); restoreCamera(); placePins();
}
function buildPresets() {
  $("presetSelect").replaceChildren(); for (const [key, preset] of Object.entries(doc.presets)) {
    const option = new Option(preset.label || key, key); $("presetSelect").append(option);
  }
}
const atPath = (object, path) => path.split(".").reduce((value, key) => value[key], object);
const setPath = (object, path, value) => { const keys = path.split("."); object[keys[0]][keys[1]] = value; };
function buildControls() {
  for (const [hostId, fields] of Object.entries(controlGroups)) {
    const host = $(hostId); host.replaceChildren();
    for (const [path, label, min, max, increment, unit] of fields) {
      const wrapper = document.createElement("label"); wrapper.dataset.spot = label; wrapper.dataset.path = path;
      const title = document.createElement("span"); title.textContent = label; wrapper.append(title);
      if (min === "check") {
        wrapper.className = "checkRow"; const input = document.createElement("input"); input.type = "checkbox"; input.dataset.path = path; input.addEventListener("change", () => change(path, input.checked)); wrapper.prepend(input);
      } else if (min === "select") {
        const select = document.createElement("select"); select.dataset.path = path;
        for (const value of max) select.append(new Option(value === "eci" ? "ECI" : value === "relative" ? "Relative to A" : value, value));
        select.addEventListener("change", () => change(path, select.value)); wrapper.append(select);
      } else {
        const row = document.createElement("div"); row.className = "valueRow";
        const range = document.createElement("input"); range.type = "range"; range.min = min; range.max = max; range.step = increment; range.dataset.path = path;
        const number = document.createElement("input"); number.type = "number"; number.min = min; number.max = max; number.step = increment; number.dataset.path = path;
        for (const input of [range, number]) input.addEventListener("input", () => change(path, Number(input.value)));
        row.append(range, number, document.createTextNode(unit || "")); wrapper.append(row);
      }
      host.append(wrapper);
    }
  }
}
function syncControls() {
  document.querySelectorAll("#inspector [data-path]").forEach(input => {
    if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)) return;
    const value = atPath(config, input.dataset.path);
    if (input.type === "checkbox") input.checked = Boolean(value); else input.value = value;
  });
  $("distanceThreshold").value = config.display.distanceThresholdKm;
  $("speedThreshold").value = config.display.speedThresholdMs;
}
function change(path, value) {
  setPath(config, path, value);
  if (config.display.endHour <= config.display.startHour) config.display.endHour = config.display.startHour + 1;
  currentHour = THREE.MathUtils.clamp(currentHour, config.display.startHour, config.display.endHour);
  syncControls();
  if (path === "display.mode") { customCamera = false; restoreCamera(); }
  try { recalc(); $("saveStatus").textContent = "Unsaved chapter changes"; } catch (error) { $("saveStatus").textContent = error.message; }
}
function buildVisibility() {
  const host = $("visibilityControls"); host.replaceChildren();
  for (const key of components) {
    const label = document.createElement("label"); label.className = "checkRow"; label.dataset.spot = `${fieldLabels[key]} visibility`;
    const input = document.createElement("input"); input.type = "checkbox"; input.dataset.visibility = key;
    input.addEventListener("change", async () => {
      doc.chapterVisibility[step().id] = { ...visibility(), [key]:input.checked }; updateVisibility(); await saveDoc("Chapter layout saved");
    }); label.append(input, document.createTextNode(fieldLabels[key])); host.append(label);
  }
}
function updateVisibility() {
  const show = visibility();
  for (const key of components) {
    const node = $({ objectB:"objectB", tle:"tleBlock", uncertainty:"uncertaintyBlock", metrics:"metricBlock", charts:"chartBlock", thresholds:"thresholdBlock", maneuvers:"maneuverBlock" }[key]);
    node.hidden = !show[key];
    const checkbox = document.querySelector(`[data-visibility="${key}"]`); if (checkbox) checkbox.checked = Boolean(show[key]);
  }
  $("legendB").hidden = !show.objectB;
  if (scene3d) { scene3d.markerB.visible = Boolean(show.objectB); scene3d.trailB.visible = Boolean(show.objectB && config?.display.showTrail); }
}
async function saveDoc(message) { await request("/api/presentation-config", doc); $("saveStatus").textContent = message; }
function recalc() {
  engine = createEngine(config);
  series = engine.sample(config.display.startHour, config.display.endHour, 260);
  $("tleText").textContent = `${engine.tleA.line1}\n${engine.tleA.line2}`;
  $("epochText").textContent = engine.tleA.epochUtc.replace(".000Z", " UTC").replace("T", " ");
  $("aElements").textContent = `Synthetic TLE · ${(EARTH_KM + config.objectA.altitudeKm).toFixed(0)} km semi-major axis`;
  $("bElements").textContent = `Synthetic TLE · ${config.objectB.relativeLongitudeDeg}° relative longitude at epoch`;
  $("speedText").textContent = `${config.display.rateHoursPerSecond} h/s`;
  const events = $("maneuverList"); events.replaceChildren();
  if (!engine.events.length) { const li = document.createElement("li"); li.textContent = "No modeled burns."; events.append(li); }
  for (const event of engine.events) { const li = document.createElement("li"); li.textContent = `Hour ${fmtNum(event.hour)} · ${event.dv > 0 ? "+" : ""}${event.dv} m/s tangential impulse`; events.append(li); }
  updateScene(); drawCharts();
}

function setupScene() {
  const host = $("scene"), scene = new THREE.Scene(); scene.background = new THREE.Color(0xffffff);
  const camera = new THREE.PerspectiveCamera(35, 1, .001, 10000);
  const renderer = new THREE.WebGLRenderer({ antialias:true, preserveDrawingBuffer:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; host.prepend(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = .08;
  controls.addEventListener("start", () => { customCamera = true; });
  scene.add(new THREE.HemisphereLight(0xffffff, 0xeeeeee, 2.1));
  const earth = new THREE.Group(); scene.add(earth);
  const surface = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), new THREE.MeshBasicMaterial({color:0xf7f7f7})); earth.add(surface);
  fetch("../visualization/Viz/vendor/countries-50m.json").then(r => r.json()).then(topology => {
    const positions = [];
    for (const country of feature(topology, topology.objects.countries).features) {
      const rings = country.geometry.type === "Polygon" ? country.geometry.coordinates : country.geometry.type === "MultiPolygon" ? country.geometry.coordinates.flat() : [];
      for (const ring of rings) for (let i = 1; i < ring.length; i++) {
        const a = ring[i-1], b = ring[i]; if (Math.abs(a[0]-b[0]) > 25 || Math.abs(a[1]-b[1]) > 25) continue;
        for (const [lon,lat] of [a,b]) { const p = THREE.MathUtils.degToRad(lat), q = THREE.MathUtils.degToRad(lon); positions.push(1.006*Math.cos(p)*Math.cos(q),1.006*Math.sin(p),-1.006*Math.cos(p)*Math.sin(q)); }
      }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
    earth.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0x707070,depthWrite:false})));
  }).catch(console.warn);
  const markerA = new THREE.Sprite(new THREE.SpriteMaterial({map:dotTexture("#eaaa00"),sizeAttenuation:false,transparent:true,depthTest:true,depthWrite:false}));
  const markerB = new THREE.Sprite(new THREE.SpriteMaterial({map:dotTexture("#a9a9a9"),sizeAttenuation:false,transparent:true,depthTest:true,depthWrite:false}));
  for (const marker of [markerA,markerB]) { marker.renderOrder = 10; scene.add(marker); }
  const line = (color, opacity=1) => new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false}));
  const orbit = line(0x555555,.72), trailA = line(0xeaaa00,.76), trailB = line(0x777777,.78), vector = line(0x8d6d11,.78), velocityVector = line(0x7890a5,.86);
  for (const item of [orbit,trailA,trailB,vector,velocityVector]) scene.add(item);
  const ellipsoid = new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:0xe9c977,transparent:true,opacity:.22,depthWrite:false})); scene.add(ellipsoid);
  scene3d = {host,scene,camera,renderer,controls,earth,markerA,markerB,orbit,trailA,trailB,vector,velocityVector,ellipsoid};
  new ResizeObserver(resizeScene).observe(host);
}
function resizeScene() {
  if (!scene3d) return; const {host,camera,renderer} = scene3d; const width = Math.max(1,host.clientWidth), height=Math.max(1,host.clientHeight);
  camera.aspect=width/height; camera.updateProjectionMatrix(); renderer.setSize(width,height,false);
}
function linePoints(line, points) { line.geometry.dispose(); line.geometry = new THREE.BufferGeometry().setFromPoints(points); line.visible = points.length > 1; }
function restoreCamera() {
  if (!scene3d || !chapter()) return;
  const {camera,controls} = scene3d, saved = doc.cameraViews[step().id];
  if (saved && saved.mode === config.display.mode) {
    camera.position.set(...saved.position); camera.up.set(...saved.up); controls.target.set(...saved.target);
    camera.zoom = saved.zoom || 1; camera.updateProjectionMatrix(); controls.update(); customCamera = true; return;
  }
  if (config.display.mode === "eci") { const frame=orbitalFrame(engine.stateA(currentHour)); camera.position.copy(toScene(frame.normal,1).multiplyScalar(26)); camera.up.copy(toScene(frame.along,1)); controls.target.set(0,0,0); }
  else { camera.position.set(0,1.2,3.8); controls.target.set(0,0,0); }
  if (config.display.mode !== "eci") camera.up.set(0,1,0); camera.zoom=1; camera.updateProjectionMatrix(); controls.update(); customCamera=false;
}
function updateScene() {
  if (!engine || !scene3d || !chapter()) return;
  const {earth,markerA,markerB,trailA,trailB,orbit,vector,velocityVector,ellipsoid,camera,controls} = scene3d;
  const state=engine.at(currentHour), frame=orbitalFrame(state.A), relative=config.display.mode === "relative";
  const scale=relative ? 1000 : EARTH_KM;
  const transform = p => relative ? toScene(relativeCoordinates(p,state.A.r,frame),scale) : toScene(p,scale);
  earth.position.copy(transform({x:0,y:0,z:0})); earth.scale.setScalar(EARTH_KM/scale);
  // Earth and its border map rotate with sidereal time in ECI.
  earth.rotation.y = window.satellite.gstime(new Date(EPOCH_MS+currentHour*3600000));
  markerA.position.copy(transform(state.A.r)); markerB.position.copy(transform(state.B.r));
  const diameter=config.display.markerSizePx * 128/89 * 2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/(Math.max(1,scene3d.host.clientHeight)*camera.zoom);
  markerA.scale.setScalar(diameter); markerB.scale.setScalar(diameter); markerB.visible=visibility().objectB;
  const orbitHours=engine.periodHours;
  const orbitPoints=Array.from({length:240},(_,i)=>transform(engine.stateA(currentHour+orbitHours*i/239).r));
  linePoints(orbit,orbitPoints); orbit.visible=config.display.showOrbit;
  const trailStart=Math.max(config.display.startHour,currentHour-config.display.trailHours);
  const trailHours=Array.from({length:90},(_,i)=>trailStart+(currentHour-trailStart)*i/89);
  linePoints(trailA,trailHours.map(t=>transform(engine.stateA(t).r))); linePoints(trailB,trailHours.map(t=>transform(engine.stateB(t).r)));
  trailA.visible=config.display.showTrail; trailB.visible=config.display.showTrail&&visibility().objectB;
  linePoints(vector,[markerA.position.clone(),markerB.position.clone()]); vector.visible=config.display.showVectors&&visibility().objectB;
  const velocityTip={x:state.B.r.x+state.dv.x*3600,y:state.B.r.y+state.dv.y*3600,z:state.B.r.z+state.dv.z*3600};
  linePoints(velocityVector,[markerB.position.clone(),transform(velocityTip)]); velocityVector.visible=config.display.showVectors&&visibility().objectB;
  ellipsoid.position.copy(markerA.position); const size=Math.max(.001,config.display.uncertaintyKm/scale);
  ellipsoid.scale.set(size*1.8,size*.9,size); ellipsoid.visible=(config.display.showUncertainty||visibility().uncertainty)&&visibility().uncertainty;
  if (relative&&!customCamera) {
    const midpoint=markerA.position.clone().add(markerB.position).multiplyScalar(.5);
    const separation=markerA.position.distanceTo(markerB.position);
    const distance=Math.max(1.6,separation*4/Math.max(.55,camera.aspect));
    const direction=new THREE.Vector3(.42,.68,.6).normalize();
    controls.target.copy(midpoint);camera.position.copy(midpoint).addScaledVector(direction,distance);
  }
  if (!relative&&!customCamera) { controls.target.set(0,0,0); camera.position.copy(toScene(frame.normal,1).multiplyScalar(26)); camera.up.copy(toScene(frame.along,1)); }
  controls.update();
  $("distanceValue").textContent=`${fmtNum(state.distanceKm)} km`;
  $("speedValue").textContent=`${fmtNum(state.relativeSpeedMs)} m/s`;
  $("rangeValue").textContent=`${state.rangeRateMs>=0?"+":""}${fmtNum(state.rangeRateMs)} m/s`;
  $("sceneMetrics").textContent=`${fmtNum(state.distanceKm)} km  ·  ${fmtNum(state.relativeSpeedMs)} m/s`;
  $("timeText").textContent=fmtDate(currentHour);
  $("timeSlider").value=Math.round((currentHour-config.display.startHour)/(config.display.endHour-config.display.startHour)*1000);
}
function chart(canvasId, key, threshold, color) {
  const canvas=$(canvasId), width=Math.max(1,canvas.clientWidth), height=95, dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=width*dpr; canvas.height=height*dpr; const ctx=canvas.getContext("2d"); ctx.scale(dpr,dpr);
  const left=27,right=width-6,top=9,bottom=height-17, max=Math.max(threshold*1.1,...series.map(item=>item[key]))*1.08;
  const y=value=>bottom-(bottom-top)*value/max, x=i=>left+(right-left)*i/(series.length-1);
  ctx.clearRect(0,0,width,height); ctx.strokeStyle="#d6d1c7"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(left,bottom);ctx.lineTo(right,bottom);ctx.stroke();
  ctx.fillStyle="#777";ctx.font="9px sans-serif";ctx.fillText("0",5,bottom+2);ctx.fillText(fmtNum(max),3,top+4);
  if (threshold>0) { ctx.strokeStyle="#999";ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(left,y(threshold));ctx.lineTo(right,y(threshold));ctx.stroke();ctx.setLineDash([]); }
  ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.beginPath(); series.forEach((item,i)=>i?ctx.lineTo(x(i),y(item[key])):ctx.moveTo(x(i),y(item[key])));ctx.stroke();
  const current=(currentHour-config.display.startHour)/(config.display.endHour-config.display.startHour);
  ctx.strokeStyle="#b98b17";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left+(right-left)*current,top);ctx.lineTo(left+(right-left)*current,bottom);ctx.stroke();
  const spots=series.filter(item=>item.distanceKm<=config.display.distanceThresholdKm&&item.relativeSpeedMs<=config.display.speedThresholdMs);
  if (spots.length&&visibility().thresholds) { ctx.strokeStyle="#9c8f73";ctx.lineWidth=3;ctx.beginPath(); for(const item of spots){const i=Math.round((item.hour-config.display.startHour)/(config.display.endHour-config.display.startHour)*(series.length-1));ctx.moveTo(x(i),bottom+3);ctx.lineTo(x(i)+1,bottom+3);}ctx.stroke(); }
}
function drawCharts() {
  if (!series||!chapter()) return;
  chart("distanceChart","distanceKm",config.display.distanceThresholdKm,"#b48820");
  chart("speedChart","relativeSpeedMs",config.display.speedThresholdMs,"#777777");
  $("dwellLabel").textContent=`Both thresholds: ${fmtNum(dwellHours(series,config.display.distanceThresholdKm,config.display.speedThresholdMs))} h cumulative dwell`;
}
function animate(now) {
  const dt=lastFrame?Math.min(.1,(now-lastFrame)/1000):0;lastFrame=now;
  if (chapter()&&playing&&engine) { currentHour+=dt*config.display.rateHoursPerSecond; if (currentHour>config.display.endHour) currentHour=config.display.startHour; updateScene(); drawCharts(); }
  if (scene3d) scene3d.renderer.render(scene3d.scene,scene3d.camera);
  requestAnimationFrame(animate);
}
function bind() {
  $("previous").onclick=()=>go(stepIndex-1); $("next").onclick=()=>go(stepIndex+1);
  document.addEventListener("keydown",event=>{ if (["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)) return; if(event.key==="ArrowRight")go(stepIndex+1);if(event.key==="ArrowLeft")go(stepIndex-1);if(event.code==="Space"&&chapter()){event.preventDefault();togglePlay();} });
  $("playButton").onclick=togglePlay;
  $("timeSlider").addEventListener("input",event=>{currentHour=config.display.startHour+Number(event.target.value)/1000*(config.display.endHour-config.display.startHour);updateScene();drawCharts();});
  for (const [id,path] of [["distanceThreshold","display.distanceThresholdKm"],["speedThreshold","display.speedThresholdMs"]]) $(id).addEventListener("input",event=>change(path,Number(event.target.value)));
  $("presetSelect").onchange=()=>{ activePreset=$("presetSelect").value;config=clone(doc.presets[activePreset]);currentHour=config.display.startHour;syncControls();recalc();restoreCamera();$("saveStatus").textContent="Unsaved preset choice"; };
  $("savePreset").onclick=async()=>{const name=prompt("Preset name",doc.presets[activePreset]?.label||"My scenario");if(!name)return;const key=/^[a-z0-9-]+$/.test(activePreset)&&doc.presets[activePreset]?.label===name?activePreset:`custom-${Date.now()}`;doc.presets[key]={...clone(config),label:name};activePreset=key;buildPresets();$("presetSelect").value=key;await saveDoc("Preset saved on this computer");};
  $("saveChapter").onclick=async()=>{doc.chapterOverrides[step().id]=clone(config);doc.chapterPresets[step().id]=activePreset;await saveDoc("Scenario saved for this chapter");};
  $("saveCamera").onclick=async()=>{const {camera,controls}=scene3d;doc.cameraViews[step().id]={mode:config.display.mode,position:camera.position.toArray(),target:controls.target.toArray(),up:camera.up.toArray(),zoom:camera.zoom};await saveDoc("Camera saved for this chapter");};
  $("resetCamera").onclick=()=>{delete doc.cameraViews[step().id];customCamera=false;restoreCamera();$("saveStatus").textContent="Camera reset; save the chapter to keep this change";};
  $("inspectorToggle").onclick=()=>{document.body.classList.toggle("inspectorCollapsed");$("inspectorToggle").textContent=document.body.classList.contains("inspectorCollapsed")?"Show controls":"Hide controls";setTimeout(resizeScene,20);};
  $("spotButton").onclick=()=>{spotMode=!spotMode;document.body.classList.toggle("spotMode",spotMode);$("spotButton").setAttribute("aria-pressed",spotMode);};
  $("commentsButton").onclick=()=>{$("commentsDrawer").hidden=!$("commentsDrawer").hidden;};$("closeComments").onclick=()=>{$("commentsDrawer").hidden=true;};
  $("cancelComment").onclick=()=>{$("commentForm").hidden=true;};
  $("commentForm").onsubmit=async event=>{event.preventDefault();try{const result=await request("/api/presentation-comments",{action:"add",comment:{...draft,text:$("commentText").value.trim()}});comments=result.comments;$("commentForm").hidden=true;$("commentText").value="";spotMode=false;document.body.classList.remove("spotMode");$("spotButton").setAttribute("aria-pressed","false");renderComments();}catch(error){alert(error.message);}};
  $("downloadComments").onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({schema:"presentation-comments-v1",comments},null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="presentation-comments.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  document.addEventListener("click",event=>{if(!spotMode||presentMode)return;const target=event.target.closest("[data-spot]")||event.target.closest("#slide")||event.target.closest("#playback");if(!target||event.target.closest("#commentsDrawer,#reviewBar"))return;event.preventDefault();event.stopPropagation();const rect=target.getBoundingClientRect();draft={stepId:step().id,stepTitle:step().title,element:target.dataset.spot||target.id||"Slide",x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height,atHour:chapter()?currentHour:null};$("commentLocation").textContent=`${step().title} · ${draft.element}`;$("commentsDrawer").hidden=false;$("commentForm").hidden=false;$("commentText").focus();},true);
  window.addEventListener("resize",()=>{resizeScene();drawCharts();placePins();}); window.addEventListener("hashchange",()=>{const index=doc.steps.findIndex(item=>item.id===location.hash.slice(1));if(index>=0){stepIndex=index;showStep();}});
}
function togglePlay(){playing=!playing;$("playButton").textContent=playing?"Pause":"Play";}
function renderComments() {
  const open=comments.filter(item=>item.status!=="archived"), archived=comments.filter(item=>item.status==="archived");
  $("commentCount").textContent=open.length;const host=$("commentList");host.replaceChildren();
  if(!open.length){const p=document.createElement("p");p.textContent="No new comments yet.";host.append(p);}
  for(const item of [...open,...archived]){
    const article=document.createElement("article");
    const jump=document.createElement("button");jump.textContent=`${item.stepTitle} · ${item.element}${item.status==="archived"?" · Archived":""}`;jump.onclick=()=>{const index=doc.steps.findIndex(step=>step.id===item.stepId);if(index>=0)go(index);if(Number.isFinite(item.atHour)&&chapter()){currentHour=item.atHour;updateScene();drawCharts();}};
    const p=document.createElement("p");p.textContent=item.text;article.append(jump,p);
    if(item.status!=="archived"){const archive=document.createElement("button");archive.textContent="Archive";archive.onclick=async()=>{comments=(await request("/api/presentation-comments",{action:"archive",id:item.id})).comments;renderComments();};article.append(archive);}
    host.append(article);
  }
  placePins();
}
function placePins(){if(!doc)return;const layer=$("spotPins");layer.replaceChildren();if(presentMode)return;let i=0;for(const item of comments){if(item.status==="archived"||item.stepId!==step().id)continue;i++;const target=[...document.querySelectorAll("[data-spot]")].find(node=>node.dataset.spot===item.element)||$(step().kind==="slide"?"slide":"scene");if(!target||target.hidden)continue;const rect=target.getBoundingClientRect();const pin=document.createElement("button");pin.className="pin";pin.textContent=i;pin.title=item.text;pin.style.left=`${rect.left+rect.width*item.x}px`;pin.style.top=`${rect.top+rect.height*item.y}px`;pin.onclick=()=>{$("commentsDrawer").hidden=false;};layer.append(pin);}}
