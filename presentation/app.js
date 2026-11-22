import * as THREE from "../visualization/Viz/vendor/three/three.module.js";
import { OrbitControls } from "../visualization/Viz/vendor/three/addons/controls/OrbitControls.js";
import { dotTexture, fadingTrailGeometry, fadingTrailMaterial } from "../visualization/Viz/relative-rendering.js";
import { loadGlobeGeography, adjustableCountryBorders } from "./globe-style.js";
import { createEngine, EPOCH_MS, EARTH_KM, orbitalFrame, relativeCoordinates, dwellHours } from "./orbit-engine.js";
import { mountOpeningArt } from "./opening-art.js";
import { drawOrbitalChart } from "../visualization/dev/e002-control-panel-preview/orbital-preview.js";
import { loadGeoChart } from "./geo-chart.js";
import "../visualization/Viz/project-flourish.js";

const $ = id => document.getElementById(id);
const clone = value => structuredClone(value);
const chapterIds = ["tle", "uncertainty", "neighbors", "relative", "time-series", "conjunction", "thresholds", "shadowing", "covariance-examples", "future-examples"];
const initialVisibility = {
  tle: { objectB:false, tle:false, uncertainty:false, metrics:false, charts:false, thresholds:false, maneuvers:false },
  uncertainty: { objectB:false, tle:false, uncertainty:false, metrics:false, charts:false, thresholds:false, maneuvers:false },
  neighbors: { objectB:false, tle:false, uncertainty:false, metrics:false, charts:false, thresholds:false, maneuvers:false },
  relative: { objectB:true, tle:false, uncertainty:false, metrics:true, charts:true, thresholds:true, maneuvers:false },
  "time-series": { objectB:true, tle:false, uncertainty:false, metrics:true, charts:true, thresholds:true, maneuvers:true },
  conjunction: { objectB:true, tle:false, uncertainty:false, metrics:true, charts:true, thresholds:false, maneuvers:false },
  thresholds: { objectB:true, tle:false, uncertainty:false, metrics:true, charts:true, thresholds:true, maneuvers:false },
  shadowing: { objectB:true, tle:false, uncertainty:false, metrics:true, charts:true, thresholds:true, maneuvers:true },
  "covariance-examples": { objectB:true, tle:false, uncertainty:true, metrics:true, charts:true, thresholds:true, maneuvers:false },
  "future-examples": { objectB:true, tle:false, uncertainty:false, metrics:true, charts:true, thresholds:true, maneuvers:false }
};
const controlGroups = {
  openingTargetControls: [
    ["openingStyle.targetAltitudeKm", "Target altitude", 200, 60000, 1, "km"],
    ["openingStyle.targetInclinationDeg", "Target inclination", 0, 179.9, .1, "°"],
    ["openingStyle.targetEccentricity", "Target eccentricity", 0, .19, .0001, ""],
    ["openingStyle.targetRaanDeg", "Target RAAN", 0, 360, .1, "°"],
    ["openingStyle.targetArgPerigeeDeg", "Target argument of perigee", 0, 360, .1, "°"],
    ["openingStyle.targetMeanAnomalyDeg", "Target mean anomaly", 0, 360, .1, "°"]
  ],
  openingControls: [
    ["openingStyle.markerSizePx", "Satellite dot size", 8, 64, 1, "px"],
    ["openingStyle.earthScale", "Earth size", .25, 1.5, .01, "×"],
    ["openingStyle.artScale", "Artwork scale", .4, 1.6, .01, "×"],
    ["openingStyle.sectionEarthScale", "Section Earth size", .2, 1.4, .01, "×"],
    ["openingStyle.sectionArtScale", "Section scene scale", .3, 1.4, .01, "×"],
    ["openingStyle.sectionOffsetX", "Section artwork horizontal offset", -60, 60, 1, "%"],
    ["openingStyle.sectionOffsetY", "Section artwork vertical offset", -60, 60, 1, "%"],
    ["openingStyle.sectionRotationDeg", "Section artwork rotation", -90, 90, 1, "°"],
    ["openingStyle.extraChasers", "Additional chasers", 0, 3, 1, ""],
    ["openingStyle.animationRate", "Animation speed", 10, 1000, 10, "×"],
    ["openingStyle.trailHours", "Chaser trail length", .0166667, 3.2, .0166667, "min"],
    ["openingStyle.earthSwivelDeg", "Earth starting longitude", -180, 180, 1, "°"],
    ["openingStyle.trailThickness", "Chaser trail thickness", .5, 12, .1, "px"],
    ["openingStyle.referenceThickness", "Reference orbit thickness", .1, 10, .1, "px"],
    ["openingStyle.borderThickness", "Country border thickness", .4, 4, .1, "px"],
    ["openingStyle.borderOpacity", "Country border opacity", 0, 1, .01, ""],
    ["openingStyle.borderColor", "Country border color", "color"],
    ["openingStyle.earthColor", "Earth color", "color"]
  ], openingRelativeControls: [
    ["openingStyle.chaserDaKm", "Semi-major axis difference", -80, 80, .5, "km"],
    ["openingStyle.chaserDlambdaKm", "Along-track offset", -300, 300, 1, "km"],
    ["openingStyle.chaserDexKm", "Relative eccentricity x", -150, 150, 1, "km"],
    ["openingStyle.chaserDeyKm", "Relative eccentricity y", -150, 150, 1, "km"],
    ["openingStyle.chaserDixKm", "Relative inclination x", -150, 150, 1, "km"],
    ["openingStyle.chaserDiyKm", "Relative inclination y", -150, 150, 1, "km"]
  ],
  absoluteControls: [
    ["objectA.altitudeKm", "Altitude", 200, 60000, 1, "km"], ["objectA.inclinationDeg", "Inclination", 0, 179.9, .1, "°"],
    ["objectA.eccentricity", "Eccentricity", 0, .69, .0001, ""], ["objectA.raanDeg", "RAAN", 0, 360, .1, "°"],
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
    ["display.trailHours", "Trail length", .0166667, 96, .0166667, "min"], ["display.markerSizePx", "Marker size", 5, 25, 1, "px"],
    ["display.showOrbit", "Reference orbit", "check"], ["display.showTrail", "Trails", "check"],
    ["display.showVectors", "Relative vector", "check"], ["display.showUncertainty", "Hypothetical ellipsoid", "check"],
    ["display.uncertaintyKm", "Ellipsoid scale", 1, 1000, 1, "km"],
    ["display.trailThickness", "Trail thickness", .5, 8, .1, "px"],
    ["display.referenceThickness", "Orbit thickness", .1, 8, .1, "px"],
    ["display.borderThickness", "Country border thickness", .4, 4, .1, "px"],
    ["display.borderOpacity", "Country border opacity", 0, 1, .01, ""],
    ["display.borderColor", "Country border color", "color"],
    ["display.distanceThresholdKm", "Distance threshold", 0, 50000, 10, "km"],
    ["display.speedThresholdMs", "Speed threshold", 0, 1000, .1, "m/s"]
  ]
};
const components = ["objectB", "tle", "uncertainty", "metrics", "charts", "thresholds", "maneuvers"];
const fieldLabels = { objectB:"Object B card", tle:"TLE and epoch", uncertainty:"Uncertainty", metrics:"Relative metrics", charts:"Time-series charts", thresholds:"Threshold controls", maneuvers:"Maneuver history" };
const toScene = (point, scale) => new THREE.Vector3(point.x / scale, point.z / scale, -point.y / scale);
const fmtDate = hour => new Intl.DateTimeFormat("en-US", { timeZone:"UTC", month:"short", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit", hour12:false }).format(new Date(EPOCH_MS + hour * 3600000)) + " UTC";
const fmtElapsed = hour => `${String(Math.floor(Math.max(0,hour))).padStart(2,"0")}:${String(Math.floor(Math.max(0,hour)*60)%60).padStart(2,"0")}`;
const fmtEpoch = iso => {
  const date=new Date(iso),day=new Intl.DateTimeFormat("en-US",{timeZone:"UTC",month:"long",day:"numeric",year:"numeric"}).format(date);
  const time=`${String(date.getUTCHours()).padStart(2,"0")}:${String(date.getUTCMinutes()).padStart(2,"0")}`;
  return `${day} · ${time} UTC`;
};
const fmtNum = value => Number.isFinite(value) ? new Intl.NumberFormat("en-US", {maximumFractionDigits: value < 10 ? 2 : 0}).format(value) : "—";
function fillElementList(host, values, epoch) {
  host.replaceChildren();
  for(const [name,value] of [["Semi-major axis",`${(EARTH_KM+values.altitudeKm).toFixed(1)} km`],["Eccentricity",Number(values.eccentricity).toFixed(5)],["Inclination",`${Number(values.inclinationDeg).toFixed(2)}°`],["RAAN",`${Number(values.raanDeg).toFixed(2)}°`],["Argument of perigee",`${Number(values.argPerigeeDeg).toFixed(2)}°`],["Mean anomaly",`${Number(values.meanAnomalyDeg).toFixed(2)}°`],["Epoch",fmtEpoch(epoch)]]){
    const row=document.createElement("div"),dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=name;
    if(name==="Epoch") { row.classList.add("epochRow");const parts=value.split(" · ");dd.append(document.createTextNode(parts[0]),document.createElement("br"),document.createTextNode(parts[1]||"")); }
    else dd.textContent=value;
    row.append(dt,dd);host.append(row);
  }
}
function elementsFromTle(tle) {
  const line=tle.line2, meanMotion=Number(line.slice(52,63));
  return {altitudeKm:Math.cbrt(398600.4418/(meanMotion*2*Math.PI/86400)**2)-EARTH_KM,
    inclinationDeg:Number(line.slice(8,16)),raanDeg:Number(line.slice(17,25)),eccentricity:Number(`0.${line.slice(26,33)}`),
    argPerigeeDeg:Number(line.slice(34,42)),meanAnomalyDeg:Number(line.slice(43,51))};
}
const beatCounts = {lab:4,"statements-shadow":6,"statements-focus":2,tle:3,uncertainty:3,neighbors:3,relative:2,conjunction:3,"covariance-examples":3,"future-examples":2,"discussion-questions":4};
const beatLabels = {
  lab:["All research areas","Space Coordination","Space Sustainability","Space Security"],
  "statements-shadow":["United Kingdom","China","Australia","European Union","Netherlands","United States"],
  "statements-focus":["Unusual dynamics","Disturbing context"],
  tle:["Orbit elements","Orbit in motion","Updated elements"],
  uncertainty:["Estimated orbit","Relative view","Uncertainty region"],
  neighbors:["Object A","Introduce Object B","Relative view"],
  relative:["Separation distance","Relative speed"],
  conjunction:["Conjunction","Close approach","Shadowing"],
  "covariance-examples":["Conjunction · uncertainty","Close approach · uncertainty","Shadowing · uncertainty"],
  "future-examples":["Nearby orbital energy","Sustained line of sight"]
  ,"discussion-questions":["Question 1","Question 2","Question 3","Question 4"]
};
const statementCards = {
  "statements-shadow": [
    { flag:"🇬🇧", country:"United Kingdom", date:"9 July 2026", quote:"Unsolicited rendezvous and proximity operations can introduce safety risks through <strong>excessively close approaches</strong> that may result in physical interference or accidents potentially involving strategic space assets.", source:"UK delegation · OEWG on PAROS, third substantive session", url:"https://conf.unog.ch/digitalrecordings/en/clients/12.1266/meetings/6D062758-D961-4805-BF6F-B39345439672/10h14/en?position=5935" },
    { flag:"🇨🇳", country:"China", date:"8 July 2026", quote:"Sometimes the distance [between non-cooperative satellites] is merely <strong>10 kilometers</strong> ... Sometimes it was only <strong>12 kilometers</strong>.", source:"Chinese delegation, OEWG on PAROS, third substantive session (English transcription; in reference to TJS-15, -16, and -17 in GEO)", url:"https://conf.unog.ch/digitalrecordings/en/clients/12.1266/meetings/44A60FEA-18CA-4F46-AF6F-4B6236CAF19B/15h07/en?position=8499" },
    { flag:"🇦🇺", country:"Australia", date:"9 July 2026", quote:"Nonconsensual proximity operations including close approach or <strong>so-called shadowing</strong> may be perceived as interference with the state's control over its space object or as coercive signaling.", source:"Australian delegation · OEWG on PAROS, third substantive session", url:"https://conf.unog.ch/digitalrecordings/en/clients/12.1266/meetings/6D062758-D961-4805-BF6F-B39345439672/10h14/en?position=5363" },
    { flag:"🇪🇺", country:"European Union", date:"9 July 2026", quote:"Unfortunately, we continue to witness examples of unfriendly and even aggressive operations, including <strong>satellites being shadowed by other ones</strong> ...", source:"European Union delegation · OEWG on PAROS, third substantive session", url:"https://conf.unog.ch/digitalrecordings/en/clients/12.1266/meetings/6D062758-D961-4805-BF6F-B39345439672/10h14/en?position=88" },
    { flag:"🇳🇱", country:"Netherlands", date:"9 July 2026", quote:"The risks increase when such operations interfere with another space object or <strong>force it to perform an evasive maneuver</strong>.", source:"Dutch delegation · OEWG on PAROS, third substantive session", url:"https://conf.unog.ch/digitalrecordings/en/clients/12.1266/meetings/6D062758-D961-4805-BF6F-B39345439672/10h14/en?position=8206" },
    { flag:"🇺🇸", country:"United States", date:"February 2020", quote:"This is <strong>unusual and disturbing behavior</strong> and has the potential to create a dangerous situation in space.", source:"General John W. Raymond, CBS News, 12 February 2020 (in reference to USA-245, in LEO)", url:"https://www.cbsnews.com/news/russian-satellites-fly-near-us-government-satellite-activity-unusual-disturbing-space-command/" }
  ],
  "statements-focus": [
    { flag:"🇨🇳", country:"China", date:"8 July 2026", quote:"Sometimes the distance [between non-cooperative satellites] is merely <strong>10 kilometers</strong> ... Sometimes it was only <strong>12 kilometers</strong>.", source:"Chinese delegation, OEWG on PAROS, third substantive session (English transcription; in reference to TJS-15, -16, and -17 in GEO)", url:"https://conf.unog.ch/digitalrecordings/en/clients/12.1266/meetings/44A60FEA-18CA-4F46-AF6F-4B6236CAF19B/15h07/en?position=8499" },
    { flag:"🇺🇸", country:"United States", date:"February 2020", quote:"This is <strong class=\"unusualWord\">unusual</strong> and <strong class=\"disturbingWord\">disturbing</strong> behavior and has the potential to create a dangerous situation in space.", source:"General John W. Raymond, CBS News, 12 February 2020 (in reference to USA-245, in LEO)", url:"https://www.cbsnews.com/news/russian-satellites-fly-near-us-government-satellite-activity-unusual-disturbing-space-command/" }
  ],
};
let doc, stepIndex = 0, beatIndex = 0, config, engine, series, geoChart = null, currentHour = 0, playing = true, lastFrame = 0, spotMode = false, draft = null, comments = [], showArchived = false, activePreset = "neighbors", customCamera = false, scene3d, sceneOrigin = "A", openingArt, sectionArt, saveStyleTimer, saveWordingTimer, saveTeachingTimer;
const modelChartScales = new Map();

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
  doc.openingStyle ||= {markerSizePx:42,trailHours:1.2,trailThickness:3.2,referenceThickness:1.3,borderThickness:1.1,borderOpacity:.68,borderColor:"#685f53",earthColor:"#e5e5e5",animationRate:240,extraChasers:0};
  doc.openingStyle.earthScale ??= 1;
  doc.openingStyle.earthSwivelDeg ??= 0;
  doc.openingStyle.artScale ??= 1;
  doc.openingStyle.sectionEarthScale ??= .55;
  doc.openingStyle.sectionArtScale ??= .8;
  for(const [key,value] of Object.entries({targetAltitudeKm:550,targetInclinationDeg:53,targetEccentricity:.001,targetRaanDeg:93,targetArgPerigeeDeg:35,targetMeanAnomalyDeg:358,chaserDaKm:0,chaserDlambdaKm:-25,chaserDexKm:35,chaserDeyKm:0,chaserDixKm:35,chaserDiyKm:0,sectionOffsetX:0,sectionOffsetY:0,sectionRotationDeg:-16})) doc.openingStyle[key] ??= value;
  doc.chapterLayout ||= {};
  doc.chapterLabels ||= {};
  if(doc.inspectorPosition?.x===12.5&&doc.inspectorPosition?.y===0)doc.inspectorPosition={x:75,y:8};
  doc.chapterLabels.tle={...doc.chapterLabels.tle,A:"Object A"};
  for (const [after,item] of [
    ["library",{id:"project-page",kind:"project",title:"How Close Is Too Close?",subtitle:"Project page",body:""}],
    ["limitations",{id:"covariance-examples",kind:"chapter",title:"Uncertainty in three scenarios",subtitle:"Illustrative covariance",body:"The ellipsoids are illustrative, not measured covariance from a TLE."}],
    ["future",{id:"future-examples",kind:"chapter",title:"Further behavioral questions",subtitle:"Future research",body:"Energy-space proximity and sustained line of sight are distinct from separation distance alone."}],
    ["discussion",{id:"discussion-questions",kind:"slide",title:"Questions for discussion",subtitle:"OEWG on PAROS",body:""}],
    ["discussion-questions",{id:"closing",kind:"slide",title:"How Close Is Too Close?",subtitle:"Side event",tagline:"Building Shared Understanding of Satellite Behavior",body:"OEWG on PAROS, Fourth Session · November 23, 2026"}]
  ]) if(!doc.steps.some(step=>step.id===item.id)){const index=doc.steps.findIndex(step=>step.id===after);if(index>=0)doc.steps.splice(index+1,0,item);}
  doc.chapterOverrides ||= {}; doc.chapterPresets ||= {}; doc.cameraViews ||= {};
  for(const item of doc.steps){if(item.id==="opening"||item.id==="closing")item.tagline="Building Shared Understanding of Satellite Behavior";
    if(item.id==="statements-close")item.body="States describe these activities, in certain contexts, as concerning. Although each of these terms can be defined with physical conditions, states do not share their understanding of those conditions in public fora.";
    if(item.id==="discussion")item.body="";}
  stepIndex = Math.max(0, doc.steps.findIndex(step => step.id === location.hash.slice(1)));
  buildStepNav(); buildControls(); buildWordingControls(); buildVisibility(); buildPresets(); setupScene();
  openingArt = mountOpeningArt($("openingArt"),doc.openingStyle);
  sectionArt = mountOpeningArt($("sectionArt"),{...doc.openingStyle,cameraView:doc.openingStyle.sectionCameraView||null,sectionMode:true,markerSizePx:Math.max(10,doc.openingStyle.markerSizePx*.6),animationRate:85,earthScale:doc.openingStyle.sectionEarthScale??.55,artScale:doc.openingStyle.sectionArtScale??.8});
  applySectionArtLayout();
  bind(); bindLayoutDrag(); showStep(); animate(0); renderComments();
  loadGeoChart().then(value=>{geoChart=value;updateModelSceneNote();drawCharts(true);}).catch(error=>{console.warn("GEO chart unavailable",error);$("geoChartLabel").textContent="GEO example unavailable";$("modelChartStatus").textContent="Historical GEO measurements unavailable";});
  if(doc.inspectorPosition){Object.assign($("inspector").style,{left:`${doc.inspectorPosition.x}%`,top:`${Math.max(8,doc.inspectorPosition.y)}%`,right:"auto",bottom:"auto"});}
  requestAnimationFrame(clampInspector);
}
function clampInspector(){
  const node=$("inspector");if(!node||node.hidden)return;
  const rect=node.getBoundingClientRect(),topLimit=presentMode?8:$("reviewBar").getBoundingClientRect().bottom+8;
  const top=Math.min(Math.max(rect.top,topLimit),Math.max(topLimit,innerHeight-rect.height-8));
  let left=Math.min(Math.max(rect.left,8),Math.max(8,innerWidth-rect.width-8));
  const legend=$("sceneLegend");
  if(chapter()&&!legend.hidden&&left<legend.getBoundingClientRect().right&&top<legend.getBoundingClientRect().bottom)left=Math.max(8,innerWidth-rect.width-14);
  const copy=$("slideCopy");
  if(!chapter()&&!copy.hidden){
    const content=copy.getBoundingClientRect();
    if(left<content.right&&left+rect.width>content.left&&top<content.bottom&&top+rect.height>content.top)left=Math.max(8,innerWidth-rect.width-14);
  }
  node.style.top=`${top}px`;node.style.left=`${left}px`;node.style.right="auto";node.style.bottom="auto";
}
function step() { return doc.steps[stepIndex]; }
function chapter() { return step().kind === "chapter"; }
function updateModelSceneNote() {
  if(step()?.id === "relative" && geoChart) $("modelChartStatus").textContent=`E-003 TLE charts · synthetic ${config.display.mode === "relative" ? "relative" : "Earth"} view`;
}
function visibility() {
  const show = { ...initialVisibility[step().id], ...doc.chapterVisibility[step().id] };
  if (step().id === "tle") Object.assign(show, { objectB:false, tle:false, uncertainty:false, metrics:false, charts:false, thresholds:false, maneuvers:false });
  if (step().id === "uncertainty") Object.assign(show, { objectB:false, tle:false, uncertainty:beatIndex >= 2, metrics:false, charts:false, thresholds:false, maneuvers:false });
  if (step().id === "neighbors") Object.assign(show, { objectB:beatIndex >= 1, tle:false, uncertainty:false, metrics:false, charts:false, thresholds:false, maneuvers:false });
  return show;
}
function buildStepNav() {
  $("steps").replaceChildren(); $("stepJump").replaceChildren();
  doc.steps.forEach((item, index) => {
    const button = document.createElement("button"); button.type = "button";
    button.textContent = item.kind === "chapter" ? `${chapterIds.indexOf(item.id) + 1}. ${item.title}` : item.title;
    button.title = item.title; button.addEventListener("click", () => go(index)); $("steps").append(button);
    $("stepJump").append(new Option(item.title,String(index)));
  });
}
function buildWordingControls() {
  const details=document.createElement("details"),summary=document.createElement("summary");
  summary.textContent="On-screen wording";details.append(summary);
  for(const [key,label,multiline] of [["title","Chapter title",false],["subtitle","Eyebrow",false],["body","Chapter description",true],["tagline","Opening subtitle",false],["A","Object A label",false],["B","Object B label",false]]){
    const wrapper=document.createElement("label"),caption=document.createElement("span");caption.textContent=label;
    const input=document.createElement(multiline?"textarea":"input");
    if(!multiline)input.type="text";else input.rows=3;
    input.dataset.wording=key;wrapper.dataset.spot=label;wrapper.append(caption,input);details.append(wrapper);
    input.addEventListener("input",()=>{
      if(key==="A"||key==="B"){
        doc.chapterLabels[step().id]||={A:"Object A",B:"Object B"};doc.chapterLabels[step().id][key]=input.value;
      }else step()[key]=input.value;
      applyWording();clearTimeout(saveWordingTimer);
      $("saveStatus").textContent="Saving wording…";
      saveWordingTimer=setTimeout(()=>saveDoc("On-screen wording saved locally").catch(error=>{$("saveStatus").textContent=error.message}),400);
    });
  }
  $("chapterControlsSection").prepend(details);
}
function syncWordingControls() {
  const labels=doc.chapterLabels[step().id]||{A:"Object A",B:"Object B"};
  document.querySelectorAll("[data-wording]").forEach(input=>{input.value=input.dataset.wording==="A"||input.dataset.wording==="B"?labels[input.dataset.wording]:step()[input.dataset.wording]||"";});
  applyWording();
}
function applySectionArtLayout(){
  const art=$("sectionArt");if(!art)return;
  art.style.setProperty("--section-x",`${Number(doc.openingStyle.sectionOffsetX||0)}vw`);
  art.style.setProperty("--section-y",`${Number(doc.openingStyle.sectionOffsetY||0)}vh`);
  art.style.setProperty("--section-rotation",`${Number(doc.openingStyle.sectionRotationDeg??-16)}deg`);
}
function alignOpeningMetadata(){
  if(!["opening","closing"].includes(step()?.id))return;
  const title=$("slideTitle").getBoundingClientRect(),copy=$("slideCopy").getBoundingClientRect();
  $("slideBody").style.left=`${title.left-copy.left}px`;
}
function applyWording() {
  const item=step(),labels=doc.chapterLabels[item.id]||{A:"Object A",B:"Object B"};
  if(["opening","closing"].includes(item.id))$("openingSubtitle").textContent=item.tagline||"Building Shared Understanding of Satellite Behavior";
  $("chapterNumber").textContent=item.subtitle;$("chapterTitle").textContent=item.title;$("chapterBody").textContent=item.body;
  $("teachingEyebrow").textContent=item.subtitle;$("teachingTitle").textContent=item.title;$("teachingBody").textContent=item.body;
  for(const key of ["A","B"]){
    const summary=$(`legend${key}`).querySelector("summary");summary.lastChild.textContent=labels[key];
    $(`object${key}`).querySelector("strong").textContent=labels[key];
  }
  const nav=$("steps").children[stepIndex];
  if(nav){nav.textContent=`${chapterIds.indexOf(item.id)+1}. ${item.title}`;nav.title=item.title;}
}
function updateProgress() {
  const count=beatCounts[step().id]||1;
  $("beatSelect").replaceChildren();
  for(let index=0;index<count;index++)$("beatSelect").append(new Option(`${beatLabels[step().id]?.[index]||"Slide"} · ${index+1}/${count}`,String(index)));
  $("beatSelect").value=String(beatIndex);
  $("beatSelect").disabled=count===1;
  $("progressText").textContent=`${stepIndex+1}/${doc.steps.length} · ${beatIndex+1}/${count}`;
  $("stepJump").value=String(stepIndex);
  $("previousStep").disabled=stepIndex===0&&beatIndex===0;
  $("nextStep").disabled=stepIndex===doc.steps.length-1&&beatIndex===count-1;
}
function go(index, lastBeat = false) { if (index < 0 || index >= doc.steps.length) return; stepIndex = index; beatIndex = lastBeat ? (beatCounts[step().id] || 1) - 1 : 0; history.replaceState(null, "", `#${step().id}`); showStep(); }
function advance(direction) {
  const count = beatCounts[step().id] || 1;
  if (direction > 0 && beatIndex + 1 < count) { beatIndex++; applyBeat(); return; }
  if (direction < 0 && beatIndex > 0) { beatIndex--; applyBeat(); return; }
  go(stepIndex + direction, direction < 0);
}
function enterStep() {
  const node = chapter() ? $("episode") : step().kind==="project" ? $("projectVisit") : $("slide");
  node.classList.remove("entering"); void node.offsetWidth; node.classList.add("entering");
}
function exampleConfig(id, index) {
  if (!["conjunction","covariance-examples","future-examples"].includes(id)) return null;
  const names=id==="future-examples"?["neighbors","shadowing"]:["conjunction","close","shadowing"];
  const scenario=clone(doc.presets[names[index]||names[0]]);
  scenario.display.mode="relative";
  scenario.display.showOrbit=true;
  scenario.display.showTrail=true;
  scenario.display.showUncertainty=id==="covariance-examples";
  scenario.display.trailHours=Math.min(scenario.display.trailHours||4,4);
  scenario.display.trailThickness=2.8;
  scenario.display.referenceThickness=1;
  if(id==="future-examples"&&index===0){scenario.objectB.deltaAltitudeKm=15;scenario.objectB.relativeLongitudeDeg=.03;}
  if(id==="future-examples"&&index===1){scenario.objectB.relativeLongitudeDeg=.08;scenario.maneuver.enabled=false;scenario.display.showVectors=true;}
  return scenario;
}
function apogeeKickHour() {
  const a=EARTH_KM+config.objectA.altitudeKm;
  const period=2*Math.PI*Math.sqrt(a*a*a/398600.4418)/3600;
  const phase=((180-config.objectA.meanAnomalyDeg)%360+360)%360/360;
  return period*(phase+Math.max(0,Math.round(8/period-phase)));
}
function renderQuoteCards(id) {
  const cards = statementCards[id] || [], host = $("quoteCards"); host.replaceChildren();
  host.hidden = !cards.length; host.classList.toggle("two", cards.length === 2);
  for (const item of cards) {
    const card = document.createElement("article"); card.className = "quoteCard";
    const head = document.createElement("div"); head.className = "quoteHead";
    const name = document.createElement("strong"); name.textContent = `${item.flag} ${item.country}`;
    head.append(name);
    const quote = document.createElement("blockquote"); quote.innerHTML = `“${item.quote}”`;
    const source = document.createElement("p"); source.textContent = item.source;
    source.innerHTML = source.innerHTML.replaceAll("TJS-15, -16, and -17", "<em>TJS-15, -16, and -17</em>").replaceAll("USA-245", "<em>USA-245</em>").replaceAll(" · ", ", ");
    source.title=item.url;
    card.append(head, quote, source); host.append(card);
  }
}
function showStep() {
  const item = step();
  if (item.id === "closing") openingArt?.resetPlayback();
  [...$("steps").children].forEach((node, index) => index === stepIndex ? node.setAttribute("aria-current", "step") : node.removeAttribute("aria-current"));
  $("steps").children[stepIndex]?.scrollIntoView({block:"nearest",inline:"nearest"});
  document.body.dataset.step = item.id;
  document.body.classList.toggle("chapterActive", chapter());
  $("slide").hidden = chapter() || item.kind==="project"; $("episode").hidden = !chapter(); $("projectVisit").hidden=item.kind!=="project";
  if(item.kind==="project"&&["127.0.0.1","localhost"].includes(location.hostname))$("projectVisit").querySelector("iframe").src="/api/proximity-project";
  $("inspector").hidden = presentMode || (!chapter() && !["opening","closing","statements-close"].includes(item.id));
  if(doc.inspectorPosition){$("inspector").style.left=`${doc.inspectorPosition.x}%`;$("inspector").style.top=`${Math.max(8,doc.inspectorPosition.y)}%`;$("inspector").style.right="auto";$("inspector").style.bottom="auto";}
  $("openingControlsSection").hidden = !["opening","closing","statements-close","library","limitations","future"].includes(item.id);
  $("saveOpeningCamera").hidden = !["opening","closing"].includes(item.id);
  $("saveSectionCamera").hidden = !["statements-close","library","limitations","future"].includes(item.id);
  $("chapterControlsSection").hidden = !chapter();
  $("inspectorTitle").textContent=["opening","closing"].includes(item.id)?"Opening artwork":item.id==="statements-close"?"Section artwork":"Scenario design";
  if (!chapter()) {
    if(["opening","closing"].includes(item.id)){
      document.body.classList.remove("inspectorCollapsed");$("inspectorToggle").textContent="Hide controls";$("inspectorToggle").setAttribute("aria-expanded","true");syncControls();
    }
    $("slideTitle").textContent = item.title; $("slideEyebrow").textContent = item.subtitle||"";
    if(item.id==="discussion-questions"){$("slideBody").replaceChildren(...(item.body||"").split(/\n\s*\n/).filter(Boolean).map(question=>{const span=document.createElement("span");span.textContent=question;return span;}));}
    else $("slideBody").textContent = item.body||"";
    $("openingSubtitle").textContent=item.tagline||"Building Shared Understanding of Satellite Behavior";
    $("openingSubtitle").hidden=!["opening","closing"].includes(item.id);
    $("slideBody").hidden=Boolean(statementCards[item.id]);
    if(["opening","closing"].includes(item.id))$("slideTitle").innerHTML="How Close Is<br>Too Close?";
    $("openingArt").hidden = !["opening","closing"].includes(item.id); $("labIntro").hidden = item.id !== "lab"; $("slideCopy").hidden = item.id === "lab" || item.kind==="project";
    $("sectionArt").hidden = !["statements-close","library","limitations","future"].includes(item.id);
    $("slidePrompt").hidden = item.id!=="statements-focus";
    $("slidePrompt").textContent = item.body || "";
    renderQuoteCards(item.id); applyBeat(); enterStep(); updateProgress();requestAnimationFrame(()=>{alignOpeningMetadata();clampInspector();}); placePins(); return;
  }
  activePreset = doc.chapterPresets[item.id] || "neighbors";
  config = clone(doc.chapterOverrides[cameraKey()] || doc.chapterOverrides[item.id] || exampleConfig(item.id,beatIndex) || (item.id==="uncertainty" ? doc.chapterOverrides.tle : null) || doc.presets[activePreset]);
  if(item.id==="uncertainty"&&!doc.chapterOverrides[item.id])delete config.teachingApogeeKick;
  config.display={trailThickness:1.8,referenceThickness:1.2,borderThickness:1.1,borderOpacity:.7,borderColor:"#707070",...config.display};
  const teaching = ["uncertainty","neighbors","relative"].includes(item.id);
  document.body.classList.toggle("inspectorCollapsed", teaching && !presentMode);
  $("inspectorToggle").textContent = teaching && !presentMode ? "Show controls" : "Hide controls";
  $("inspectorToggle").setAttribute("aria-expanded",String(!teaching || presentMode));
  setTimeout(resizeScene, 30);
  if (item.id === "conjunction") config.display.mode = "relative";
  if (item.id === "tle") config.display.mode = "eci";
  if (item.id === "relative" && !doc.chapterOverrides[cameraKey()] && !doc.chapterOverrides[item.id]) {
    // An Earth-centred overview keeps the globe and the close pair in frame.
    // The frame button still lets the presenter switch to relative motion.
    config.display.mode = "eci";
    config.display.markerSizePx = Math.max(18,config.display.markerSizePx);
  }
  if (item.id === "tle" && beatIndex >= 2) config.teachingApogeeKick = { hour:apogeeKickHour(), dvMs:180 };
  if (item.id === "tle" && beatIndex < 2) delete config.teachingApogeeKick;
  if (item.id === "neighbors") config.display.mode = "relative";
  if (item.id === "neighbors" && !doc.chapterOverrides[item.id]) {
    Object.assign(config.objectB,{deltaAltitudeKm:0,deltaInclinationDeg:0,deltaEccentricity:0,deltaRaanDeg:0,relativeLongitudeDeg:.15});
    config.display.trailHours=2;config.display.trailThickness=3.2;config.display.referenceThickness=1;
  }
  if (item.id === "uncertainty") config.display.mode = beatIndex ? "relative" : "eci";
  if (item.id === "uncertainty" && !doc.chapterOverrides[item.id]) config.display.uncertaintyKm = 150;
  currentHour = config.display.startHour; customCamera = false;
  if (["tle","uncertainty","neighbors"].includes(item.id)) { playing = true; $("playButton").textContent = "Ⅱ";$("playButton").setAttribute("aria-label","Pause playback"); }
  sceneOrigin = "A";
  syncWordingControls();
  $("presetSelect").value = activePreset;
  syncControls(); updateVisibility(); recalc(); redrawSceneBorders(); restoreCamera(); applyBeat(false); applyLayout(); enterStep(); updateProgress();requestAnimationFrame(clampInspector); placePins();
}
function applyBeat(rebuild = true) {
  const id = step().id;
  document.body.dataset.beat = String(beatIndex);
  if (!chapter()) {
    if(id==="lab") setResearchArea(beatIndex-1);
    else setResearchArea(-1);
    if(id==="statements-shadow") [...$("quoteCards").children].forEach((node,index)=>{node.classList.toggle("pending",index>beatIndex);node.classList.toggle("revealed",index===beatIndex);});
    if(id==="statements-focus") {$("quoteCards").dataset.focus=String(beatIndex);[...$("quoteCards").children].forEach((node,index)=>node.hidden=index>beatIndex);}
    if(id==="discussion-questions") [...$("slideBody").children].forEach((node,index)=>node.hidden=index>beatIndex);
    updateProgress();placePins();return;
  }
  if (id === "tle") {
    const changed = (beatIndex >= 2) !== Boolean(config.teachingApogeeKick);
    if (beatIndex >= 2) { config.teachingApogeeKick = { hour:apogeeKickHour(), dvMs:180 }; if (changed) currentHour = config.teachingApogeeKick.hour; }
    else delete config.teachingApogeeKick;
    if (changed && rebuild) recalc();
    $("legendA").open = beatIndex >= 1;
  }
  if (id === "uncertainty") {
    const mode = beatIndex >= 1 ? "relative" : "eci";
    if (rebuild && config.display.mode !== mode) { config.display.mode = mode; customCamera = false; syncControls(); recalc(); restoreCamera(); }
    config.display.showUncertainty = beatIndex >= 2;
    $("legendA").open = false;
  }
  if (id === "neighbors") {
    if(!doc.chapterOverrides[id]&&!doc.chapterOverrides[cameraKey()]){
      config.objectB.deltaInclinationDeg=beatIndex>=2?.05:0;
      config.objectB.deltaEccentricity=beatIndex>=2?.00005:0;
      if(rebuild)recalc();
    }
    const mode="relative";
    if(rebuild&&config.display.mode!==mode){config.display.mode=mode;customCamera=false;syncControls();recalc();restoreCamera();}
    $("legendB").open = beatIndex >= 1;
  }
  if(id === "relative" && rebuild && !doc.chapterOverrides[cameraKey()]) {
    const mode=beatIndex ? "relative" : "eci";
    if(config.display.mode!==mode){config.display.mode=mode;customCamera=false;syncControls();recalc();restoreCamera();}
  }
  if(id === "relative") updateModelSceneNote();
  if (["conjunction","covariance-examples","future-examples"].includes(id) && rebuild) {
    config=clone(doc.chapterOverrides[cameraKey()] || exampleConfig(id,beatIndex));
    config.display={trailThickness:2.7,referenceThickness:1,borderThickness:1.1,borderOpacity:.7,borderColor:"#707070",...config.display};
    currentHour=config.display.startHour;syncControls();recalc();restoreCamera();
  }
  $("sceneLegend").hidden = false;
  $("panel").hidden = ["tle", "uncertainty", "neighbors"].includes(id);
  $("ui").hidden = id !== "relative";
  if(id === "relative") $("nowModeling").open = true;
  $("teachingIntro").hidden=true;
  $("playback").hidden = false;
  $("sceneMetrics").hidden = true;
  $("frameTools").hidden = false;
  $("frameToggle").title = `Switch to ${config.display.mode === "eci" ? "relative motion" : "ECI"}`;
  $("frameToggle").setAttribute("aria-label",$("frameToggle").title);
  $("frameToggle").hidden=id==="tle";
  $("originToggle").title = `Center Object ${sceneOrigin === "A" ? "B" : "A"}`;
  $("originToggle").hidden = config.display.mode !== "relative" || id === "tle" || id === "uncertainty" || (id === "neighbors" && beatIndex < 2);
  $("examplePicker").hidden = !["conjunction","covariance-examples","future-examples"].includes(id);
  $("exampleSelect").replaceChildren(...(beatLabels[id]||[]).map((name,index)=>new Option(name,String(index))));$("exampleSelect").value=String(beatIndex);
  $("exampleChapters").replaceChildren(...(beatLabels[id]||[]).map((name,index)=>{
    const button=document.createElement("button");button.type="button";button.textContent=name;button.title=name;
    button.classList.toggle("active",index===beatIndex);button.setAttribute("aria-pressed",String(index===beatIndex));
    button.onclick=()=>{if(index!==beatIndex){beatIndex=index;applyBeat();}};return button;
  }));
  $("chartBlock").dataset.chart=id==="relative"?(beatIndex===0?"distance":"both"):"both";
  if (rebuild && doc.cameraViews[cameraKey()]?.mode === config.display.mode) restoreCamera();
  updateVisibility(); resizeScene(); updateScene();
  if(id === "relative") drawCharts(true);
  if (rebuild) { const node = $("episode"); node.classList.remove("beat-change"); void node.offsetWidth; node.classList.add("beat-change"); }
  updateProgress();placePins();
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
      } else if (min === "color") {
        const input=document.createElement("input");input.type="color";input.dataset.path=path;
        input.addEventListener("input",()=>change(path,input.value));wrapper.append(input);
      } else if (min === "select") {
        const select = document.createElement("select"); select.dataset.path = path;
        for (const value of max) select.append(new Option(value === "eci" ? "ECI" : value === "relative" ? "Relative to A" : value, value));
        select.addEventListener("change", () => change(path, select.value)); wrapper.append(select);
      } else {
        const row = document.createElement("div"); row.className = "valueRow";
        const unitScale=path.endsWith("trailHours")?60:1;
        const range = document.createElement("input"); range.type = "range"; range.min = Math.round(min*unitScale); range.max = Math.round(max*unitScale); range.step = unitScale===60?1:increment; range.dataset.path = path;
        const number = document.createElement("input"); number.type = "number"; number.min = Math.round(min*unitScale); number.max = Math.round(max*unitScale); number.step = unitScale===60?1:increment; number.dataset.path = path;
        for (const input of [range, number]) input.addEventListener("input", () => change(path, Number(input.value)/unitScale));
        row.append(range, number, document.createTextNode(unit || "")); wrapper.append(row);
      }
      host.append(wrapper);
    }
  }
}
function syncControls() {
  document.querySelectorAll("#inspector [data-path]").forEach(input => {
    if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)) return;
    const source=input.dataset.path.startsWith("openingStyle.")?doc:config;
    if (!source) return;
    const value = atPath(source, input.dataset.path);
    if (input.type === "checkbox") input.checked = Boolean(value); else input.value = input.dataset.path.endsWith("trailHours") ? Math.round(Number(value)*60) : value;
  });
  if(config){
    $("distanceThreshold").value = config.display.distanceThresholdKm;
    $("speedThreshold").value = config.display.speedThresholdMs;
    $("distanceThresholdRange").value = config.display.distanceThresholdKm;
    $("speedThresholdRange").value = config.display.speedThresholdMs;
  }
}
function change(path, value) {
  if (path.startsWith("openingStyle.")) {
    const before=clone(doc.openingStyle);
    setPath(doc,path,value);
    const maxE=Math.max(0,Math.min(.19,1-(EARTH_KM+200)/(EARTH_KM+Number(doc.openingStyle.targetAltitudeKm))));
    doc.openingStyle.targetEccentricity=Math.min(Number(doc.openingStyle.targetEccentricity),maxE);
    try{openingArt?.setOptions(doc.openingStyle);}catch(error){doc.openingStyle=before;openingArt?.setOptions(before);syncControls();$("saveStatus").textContent=error.message;return;}
    applySectionArtLayout();
    sectionArt?.setOptions({...doc.openingStyle,earthScale:doc.openingStyle.sectionEarthScale??.55,artScale:doc.openingStyle.sectionArtScale??.8,markerSizePx:Math.max(10,doc.openingStyle.markerSizePx*.6)});syncControls();
    $("saveStatus").textContent="Saving opening artwork…";
    clearTimeout(saveStyleTimer);saveStyleTimer=setTimeout(()=>saveDoc("Opening artwork saved locally").catch(error=>{$("saveStatus").textContent=error.message}),350);
    return;
  }
  setPath(config, path, value);
  if(path==="display.borderThickness")redrawSceneBorders();
  if (config.display.endHour <= config.display.startHour) config.display.endHour = config.display.startHour + 1;
  currentHour = THREE.MathUtils.clamp(currentHour, config.display.startHour, config.display.endHour);
  syncControls();
  if (path === "display.mode") { customCamera = false; restoreCamera(); }
  try { recalc(); $("saveStatus").textContent = "Unsaved chapter changes"; } catch (error) { $("saveStatus").textContent = error.message; }
  if(step().id==="tle"){
    doc.chapterOverrides.tle=clone(config);clearTimeout(saveTeachingTimer);
    saveTeachingTimer=setTimeout(()=>saveDoc("Orbit settings saved locally").catch(error=>{$("saveStatus").textContent=error.message}),450);
  }
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
  const displayedA = step().id === "tle" && beatIndex >= 2 && engine.tleAfterA ? engine.tleAfterA : engine.tleA;
  $("tleText").textContent = `${displayedA.line1}\n${displayedA.line2}`;
  fillElementList($("legendTleA"),elementsFromTle(displayedA),displayedA.epochUtc);
  fillElementList($("legendTleB"),elementsFromTle(engine.tleB),engine.tleB.epochUtc);
  $("epochText").textContent = fmtEpoch(displayedA.epochUtc);
  $("aElements").textContent = `${engine.tleAfterA && step().id === "tle" && beatIndex >= 2 ? "Updated synthetic TLE" : "Synthetic TLE"} · ${(EARTH_KM + config.objectA.altitudeKm).toFixed(0)} km semi-major axis`;
  $("bElements").textContent = `Synthetic TLE · ${config.objectB.relativeLongitudeDeg}° relative longitude at epoch`;
  $("speedText").textContent = `${config.display.rateHoursPerSecond} h/s`;
  const events = $("maneuverList"); events.replaceChildren();
  if (!engine.events.length) { const li = document.createElement("li"); li.textContent = "No modeled burns."; events.append(li); }
  for (const event of engine.events) { const li = document.createElement("li"); li.textContent = `Hour ${fmtNum(event.hour)} · ${event.dv > 0 ? "+" : ""}${event.dv} m/s tangential impulse`; events.append(li); }
  updateScene(); drawCharts(true);
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
  const surface = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 160), new THREE.MeshBasicMaterial({color:0xf7f7f7})); earth.add(surface);
  loadGlobeGeography({radius:1.00035}).then(({geometry}) => {
    const borders=adjustableCountryBorders(Array.from(geometry.attributes.position.array),"#626262",.85,1.1,host.clientWidth,host.clientHeight);
    borders.material.polygonOffset=true;borders.material.polygonOffsetFactor=-1;borders.material.polygonOffsetUnits=-1;
    earth.add(borders);scene3d.borders=borders;geometry.dispose();redrawSceneBorders();
  }).catch(error=>console.warn("Episode globe geography unavailable",error));
  const markerA = new THREE.Sprite(new THREE.SpriteMaterial({map:dotTexture("#a9a9a9"),sizeAttenuation:false,transparent:true,depthTest:true,depthWrite:false}));
  const markerB = new THREE.Sprite(new THREE.SpriteMaterial({map:dotTexture("#eaaa00"),sizeAttenuation:false,transparent:true,depthTest:true,depthWrite:false}));
  for (const marker of [markerA,markerB]) { marker.renderOrder = 10; scene.add(marker); }
  const line = (color, opacity=1, thick=false) => {
    const object=thick?new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false}))
      :new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false}));
    object.userData.thick=thick;return object;
  };
  const orbit = line(0x555555,.72,true), trailA = new THREE.Mesh(new THREE.BufferGeometry(),fadingTrailMaterial("A")), trailB = new THREE.Mesh(new THREE.BufferGeometry(),fadingTrailMaterial("B")), vector = line(0x8d6d11,.78), velocityVector = line(0x7890a5,.86);
  trailA.material.uniforms.uColor.value.set("#777777");trailB.material.uniforms.uColor.value.set("#eaaa00");
  for(const trail of [trailA,trailB]){trail.userData.fade=true;trail.frustumCulled=false;}
  for (const item of [orbit,trailA,trailB,vector,velocityVector]) scene.add(item);
  const ringPoints=Array.from({length:241},(_,i)=>{const a=i*2*Math.PI/240;return new THREE.Vector3(1.34*Math.cos(a),0,1.34*Math.sin(a));});
  const equator=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ringPoints),new THREE.LineBasicMaterial({color:0xd3b968,transparent:true,opacity:.56,depthWrite:false}));
  const ecliptic=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ringPoints),new THREE.LineBasicMaterial({color:0x8f9da6,transparent:true,opacity:.6,depthWrite:false}));
  ecliptic.rotation.x=THREE.MathUtils.degToRad(23.44);scene.add(equator,ecliptic);
  const ellipsoid = new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:0xe9c977,transparent:true,opacity:.22,depthWrite:false})); scene.add(ellipsoid);
  const ellipsoidGrid = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(1.002,16,10)),new THREE.LineBasicMaterial({color:0xa77e17,transparent:true,opacity:.48,depthWrite:false})); scene.add(ellipsoidGrid);
  const ellipsoidB=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:0xeaaa00,transparent:true,opacity:.16,depthWrite:false}));scene.add(ellipsoidB);
  const ellipsoidGridB=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(1.002,16,10)),new THREE.LineBasicMaterial({color:0xb48617,transparent:true,opacity:.5,depthWrite:false}));scene.add(ellipsoidGridB);
  const axes = new THREE.Group();
  for (const [direction,color] of [[new THREE.Vector3(1,0,0),0xb58820],[new THREE.Vector3(0,-1,0),0x727b82],[new THREE.Vector3(0,0,-1),0x9d8672]]) axes.add(new THREE.ArrowHelper(direction,new THREE.Vector3(),1.7,color,.25,.12));
  axes.visible=false;
  scene.add(axes);
  scene3d = {host,scene,camera,renderer,controls,earth,markerA,markerB,orbit,trailA,trailB,vector,velocityVector,ellipsoid,ellipsoidGrid,ellipsoidB,ellipsoidGridB,axes,equator,ecliptic};
  new ResizeObserver(resizeScene).observe(host);
}
function resizeScene() {
  if (!scene3d) return; const {host,camera,renderer} = scene3d; const width = Math.max(1,host.clientWidth), height=Math.max(1,host.clientHeight);
  camera.aspect=width/height;
  if (!$('sceneLegend').hidden) {
    const legendWidth=Math.max(0,$("sceneLegend").getBoundingClientRect().right-host.getBoundingClientRect().left);
    camera.setViewOffset(width,height,-Math.min(width*.25,legendWidth*.5),0,width,height);
  } else camera.clearViewOffset();
  camera.updateProjectionMatrix(); renderer.setSize(width,height,false);
  if(scene3d.borders)scene3d.borders.material.uniforms.uResolution.value.set(width,height);
}
function redrawSceneBorders() {
  if(!scene3d?.borders)return;
  scene3d.borders.material.uniforms.uColor.value.set(config?.display?.borderColor||"#626262");
  scene3d.borders.material.uniforms.uOpacity.value=config?.display?.borderOpacity??.85;
  scene3d.borders.material.uniforms.uHalfWidthPx.value=(config?.display?.borderThickness??1.1)/2;
}
function applyLayout() {
  if(!chapter())return;
  for(const id of ["sceneLegend","sceneMetrics","panel"]){
    const node=$(id),position=doc.chapterLayout?.[step().id]?.[id];
    node.style.left=position?`${position.x}%`:"";
    node.style.top=position?`${position.y}%`:"";
    node.style.right=position?"auto":"";
    node.style.bottom=position?"auto":"";
  }
}
function bindLayoutDrag() {
  document.addEventListener("pointerdown",event=>{
    const handle=event.target.closest("[data-drag]");
    if(!handle||event.target.closest("button,input,select,textarea,summary,a")||presentMode||event.button!==0||(!chapter()&&handle.dataset.drag!=="inspector"))return;
    const node=$(handle.dataset.drag),parent=node?.offsetParent||document.documentElement;
    if(!node||!parent)return;
    event.preventDefault();event.stopPropagation();
    const rect=node.getBoundingClientRect(),bounds=node.id==="inspector"?{left:0,top:0,width:innerWidth,height:innerHeight}:parent.getBoundingClientRect();
    const offsetX=event.clientX-rect.left,offsetY=event.clientY-rect.top;
    handle.setPointerCapture(event.pointerId);parent.classList.add("layoutDragging");
    let position=null;
    const move=e=>{
      const x=Math.max(0,Math.min(bounds.width-node.offsetWidth,e.clientX-bounds.left-offsetX));
      const minY=node.id==="inspector"?$("reviewBar").getBoundingClientRect().bottom+8:0;
      const maxY=Math.max(minY,bounds.height-node.offsetHeight-8);
      const y=Math.max(minY,Math.min(maxY,e.clientY-bounds.top-offsetY));
      position={x:Math.round(x/bounds.width*40)*2.5,y:Math.min(Math.floor(maxY/bounds.height*40)*2.5,Math.max(Math.ceil(minY/bounds.height*40)*2.5,Math.round(y/bounds.height*40)*2.5))};
      Object.assign(node.style,{left:`${position.x}%`,top:`${position.y}%`,right:"auto",bottom:"auto"});
      placePins();
    };
    const end=()=>{
      handle.removeEventListener("pointermove",move);handle.removeEventListener("pointerup",end);
      handle.removeEventListener("pointercancel",end);parent.classList.remove("layoutDragging");
      if(position){if(node.id==="inspector")doc.inspectorPosition=position;else{doc.chapterLayout[step().id]||={};doc.chapterLayout[step().id][node.id]=position;}
        saveDoc("Layout position saved; snapped to 2.5% grid").catch(error=>{$("saveStatus").textContent=error.message});}
    };
    handle.addEventListener("pointermove",move);handle.addEventListener("pointerup",end);handle.addEventListener("pointercancel",end);
  },true);
}
function linePoints(line, points, thickness=1) {
  if(points.length<2){line.visible=false;return;}
  if(line.userData.fade){
    if(performance.now()-(line.userData.lastBuild||0)<28&&line.geometry.attributes.position)return;
    line.userData.lastBuild=performance.now();line.geometry.dispose();line.geometry=fadingTrailGeometry(points);
    line.material.uniforms.uResolution.value.set(scene3d.host.clientWidth,scene3d.host.clientHeight);
    line.material.uniforms.uHalfWidthPx.value=Math.max(.05,thickness/2);
  } else if(line.userData.thick){
    const now=performance.now();
    if(now-(line.userData.lastBuild||0)<28&&line.geometry.attributes.position)return;
    line.userData.lastBuild=now;
    const {camera,controls,host}=scene3d;
    const worldPerPixel=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.distanceTo(controls.target)/Math.max(1,host.clientHeight)/camera.zoom;
    line.geometry.dispose();line.geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,false,"centripetal"),points.length-1,Math.max(.0001,thickness*worldPerPixel*.5),4,false);
  } else {line.geometry.dispose();line.geometry=new THREE.BufferGeometry().setFromPoints(points);}
  line.visible=true;
}
function cameraKey() { return beatCounts[step().id] ? `${step().id}-${beatIndex}` : step().id; }
function restoreCamera() {
  if (!scene3d || !chapter()) return;
  const {camera,controls} = scene3d, saved = doc.cameraViews[cameraKey()] || doc.cameraViews[step().id];
  if (saved && saved.mode === config.display.mode) {
    camera.position.set(...saved.position); camera.up.set(...saved.up); controls.target.set(...saved.target);
    camera.zoom = saved.zoom || 1; camera.updateProjectionMatrix(); controls.update(); customCamera = true; return;
  }
  if (config.display.mode === "eci") {
    const frame=orbitalFrame(engine.stateA(currentHour));
    const distance=Math.max(step().id==="tle"?5.8:4,3.4*(EARTH_KM+config.objectA.altitudeKm)/EARTH_KM);
    camera.position.copy(toScene(frame.normal,1).multiplyScalar(distance));
    camera.up.copy(Math.abs(camera.position.clone().normalize().y)>.9?toScene(frame.along,1):new THREE.Vector3(0,1,0));
    controls.target.set(0,0,0);
  } else if (["tle","uncertainty","neighbors"].includes(step().id)) {
    const distance=step().id==="uncertainty"&&beatIndex>=2?1.65:step().id==="uncertainty"?3.2:2.8;
    camera.position.set(distance*.67,distance*.24,distance*.70);
    controls.target.set(0,0,0);
  }
  else { camera.position.set(2.8,.7,2.5); controls.target.set(0,0,0); }
  if (config.display.mode !== "eci") camera.up.set(0,1,0); camera.zoom=1; camera.updateProjectionMatrix(); controls.update(); customCamera=false;
}
function updateScene() {
  if (!engine || !scene3d || !chapter()) return;
  const {earth,markerA,markerB,trailA,trailB,orbit,vector,velocityVector,ellipsoid,ellipsoidGrid,ellipsoidB,ellipsoidGridB,axes,camera,controls} = scene3d;
  scene3d.equator.visible=false;
  scene3d.ecliptic.visible=false;
  const state=engine.at(currentHour), originState=sceneOrigin === "B" ? state.B : state.A, frame=orbitalFrame(originState), relative=config.display.mode === "relative";
  const scale=relative ? 1000 : EARTH_KM;
  const transform = p => {
    if(!relative)return toScene(p,scale);
    const ric=relativeCoordinates(p,originState.r,frame);
    // Match the production GEO visualizers: along-track across the screen,
    // cross-track up, and radial depth toward the viewer.
    return new THREE.Vector3(-ric.z/scale,ric.y/scale,ric.x/scale);
  };
  earth.position.copy(transform({x:0,y:0,z:0})); earth.scale.setScalar(EARTH_KM/scale);
  // Globe coordinates are ECI-facing in ECI view. In the RIC view, rotate
  // the entire globe into the same reference frame as the spacecraft paths.
  const sidereal=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),window.satellite.gstime(new Date(EPOCH_MS+currentHour*3600000)));
  if(relative){
    const {radial:R,along:T,normal:N}=frame;
    const basis=new THREE.Matrix4().makeBasis(new THREE.Vector3(T.x,N.x,R.x),new THREE.Vector3(T.z,N.z,R.z),new THREE.Vector3(-T.y,-N.y,-R.y));
    earth.quaternion.setFromRotationMatrix(basis).multiply(sidereal);
  }else earth.quaternion.copy(sidereal);
  markerA.position.copy(transform(state.A.r)); markerB.position.copy(transform(state.B.r));
  const diameter=config.display.markerSizePx * 128/89 * 2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/(Math.max(1,scene3d.host.clientHeight)*camera.zoom);
  markerA.scale.setScalar(diameter); markerB.scale.setScalar(diameter); markerB.visible=visibility().objectB;
  const orbitHours=engine.periodHours;
  const referenceState = sceneOrigin === "B" ? engine.stateB : step().id === "tle" && beatIndex >= 2 ? engine.preManeuverA : engine.stateA;
  const orbitPoints=Array.from({length:240},(_,i)=>transform(referenceState(currentHour+orbitHours*i/239).r));
  const covarianceFocus = step().id === "uncertainty" && beatIndex >= 2;
  linePoints(orbit,orbitPoints,config.display.referenceThickness); orbit.visible=config.display.showOrbit;
  const trailStart=Math.max(config.display.startHour,currentHour-config.display.trailHours);
  const trailHours=Array.from({length:90},(_,i)=>trailStart+(currentHour-trailStart)*i/89);
  linePoints(trailA,trailHours.map(t=>transform(engine.stateA(t).r)),config.display.trailThickness);
  linePoints(trailB,trailHours.map(t=>transform(engine.stateB(t).r)),config.display.trailThickness);
  trailA.visible=config.display.showTrail; trailB.visible=config.display.showTrail&&visibility().objectB;
  const separationVector=new THREE.Vector3(state.B.r.x-state.A.r.x,state.B.r.y-state.A.r.y,state.B.r.z-state.A.r.z);
  const aVector=new THREE.Vector3(state.A.r.x,state.A.r.y,state.A.r.z);
  const closestFraction=THREE.MathUtils.clamp(-aVector.dot(separationVector)/Math.max(1e-9,separationVector.lengthSq()),0,1);
  const clearLineOfSight=aVector.addScaledVector(separationVector,closestFraction).length()>EARTH_KM;
  linePoints(vector,[markerA.position.clone(),markerB.position.clone()]); vector.visible=config.display.showVectors&&visibility().objectB && !covarianceFocus && (step().id!=="future-examples"||beatIndex!==1||clearLineOfSight);
  const velocityTip={x:state.B.r.x+state.dv.x*3600,y:state.B.r.y+state.dv.y*3600,z:state.B.r.z+state.dv.z*3600};
  linePoints(velocityVector,[markerB.position.clone(),transform(velocityTip)]); velocityVector.visible=config.display.showVectors&&visibility().objectB && !covarianceFocus && !(step().id==="future-examples"&&beatIndex===1);
  const projectedDirection=(satelliteState,direction)=>transform({x:satelliteState.r.x+direction.x*1000,y:satelliteState.r.y+direction.y*1000,z:satelliteState.r.z+direction.z*1000}).sub(transform(satelliteState.r)).normalize();
  // Illustrative TLE refreshes every six hours: uncertainty grows between
  // updates, then contracts when a new simulated element is issued.
  const epochIntervalHours=6;
  const epochAge=hour=>((hour-config.display.startHour)%epochIntervalHours+epochIntervalHours)%epochIntervalHours;
  const ageA=epochAge(currentHour);
  const ageB=epochAge(currentHour+2);
  const sizeA=Math.max(.001,config.display.uncertaintyKm*(1+ageA/epochIntervalHours*.8)/scale);
  const sizeB=Math.max(.001,config.display.uncertaintyKm*(1+ageB/epochIntervalHours*.8)/scale);
  ellipsoid.position.copy(markerA.position);
  const alongTrack=projectedDirection(state.A,orbitalFrame(state.A).along);
  ellipsoid.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),alongTrack);
  ellipsoid.scale.set(sizeA*.9,sizeA*2,sizeA*.7); ellipsoid.visible=(config.display.showUncertainty||visibility().uncertainty)&&visibility().uncertainty;
  ellipsoidGrid.position.copy(ellipsoid.position); ellipsoidGrid.scale.copy(ellipsoid.scale); ellipsoidGrid.visible=ellipsoid.visible;
  ellipsoidGrid.quaternion.copy(ellipsoid.quaternion);
  const frameB=orbitalFrame(state.B),alongB=projectedDirection(state.B,frameB.along);
  ellipsoidB.position.copy(markerB.position);ellipsoidB.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),alongB);
  ellipsoidB.scale.set(sizeB*.9,sizeB*2,sizeB*.7);ellipsoidB.visible=step().id==="covariance-examples"&&visibility().objectB;
  ellipsoidGridB.position.copy(ellipsoidB.position);ellipsoidGridB.quaternion.copy(ellipsoidB.quaternion);ellipsoidGridB.scale.copy(ellipsoidB.scale);ellipsoidGridB.visible=ellipsoidB.visible;
  axes.visible=false;
  if(scene3d.borders){scene3d.borders.material.uniforms.uColor.value.set(config.display.borderColor);scene3d.borders.material.uniforms.uOpacity.value=config.display.borderOpacity;}
  if (relative&&!customCamera) {
    if (["uncertainty","neighbors"].includes(step().id)) {
      const distance=step().id==="uncertainty"&&beatIndex>=2?1.65:step().id==="uncertainty"?3.2:2.8;
      const anchor=sceneOrigin==="B"?markerB.position:markerA.position;
      const desired=anchor.clone().add(new THREE.Vector3(distance*.67,distance*.24,distance*.70));
      controls.target.lerp(anchor,.18);camera.position.lerp(desired,.18);
    }
    else {
      const midpoint=markerA.position.clone().add(markerB.position).multiplyScalar(.5);
      const separation=markerA.position.distanceTo(markerB.position);
      const distance=Math.max(1.6,separation*4/Math.max(.55,camera.aspect));
      const direction=new THREE.Vector3(.74,.17,.65).normalize();
      controls.target.copy(midpoint);camera.position.copy(midpoint).addScaledVector(direction,distance);
    }
  }
  if (!relative&&!customCamera) {
    controls.target.set(0,0,0);
    const distance=Math.max(step().id==="tle"?5.8:4,3.4*(EARTH_KM+config.objectA.altitudeKm)/EARTH_KM);
    camera.position.copy(toScene(frame.normal,1).multiplyScalar(distance));camera.up.copy(Math.abs(camera.position.clone().normalize().y)>.9?toScene(frame.along,1):new THREE.Vector3(0,1,0));
  }
  controls.update();
  $("distanceValue").textContent=`${fmtNum(state.distanceKm)} km`;
  $("speedValue").textContent=`${fmtNum(state.relativeSpeedMs)} m/s`;
  $("rangeValue").textContent=`${state.rangeRateMs>=0?"+":""}${fmtNum(state.rangeRateMs)} m/s`;
  $("lineOfSightRow").hidden=!(step().id==="future-examples"&&beatIndex===1);
  $("lineOfSightValue").textContent=clearLineOfSight?"Clear":"Earth occluded";
  $("sceneMetricsText").textContent=`${fmtNum(state.distanceKm)} km  ·  ${fmtNum(state.relativeSpeedMs)} m/s${step().id==="future-examples"&&beatIndex===1?` · ${clearLineOfSight?"Clear line of sight":"Earth occluded"}`:""}`;
  $("timeText").textContent=fmtElapsed(currentHour);
  $("timeSlider").value=Math.round((currentHour-config.display.startHour)/(config.display.endHour-config.display.startHour)*1000);
}
function thresholdIntervals(samples, distanceThresholdKm, speedThresholdMs) {
  const result={distanceOnly:[],speedOnly:[],both:{intervals:[]}};
  for(let index=1;index<samples.length;index++){
    const before=samples[index-1],after=samples[index];
    if(!Number.isFinite(before.distanceKm)||!Number.isFinite(after.distanceKm)||!Number.isFinite(before.speedMs)||!Number.isFinite(after.speedMs))continue;
    const near=(before.distanceKm+after.distanceKm)/2<=distanceThresholdKm;
    const slow=(before.speedMs+after.speedMs)/2<=speedThresholdMs;
    const key=near&&slow?"both":near?"distanceOnly":slow?"speedOnly":null;
    if(!key)continue;
    const list=key==="both"?result.both.intervals:result[key],last=list.at(-1);
    if(last&&last.end===before.ms)last.end=after.ms;
    else list.push({start:before.ms,end:after.ms});
  }
  return result;
}
let lastChartDraw=-Infinity;
function drawCharts(force=false) {
  if (!series||!chapter()||!engine) return;
  if(!force&&performance.now()-lastChartDraw<85)return;
  lastChartDraw=performance.now();
  const samples=series.map(item=>({ms:EPOCH_MS+item.hour*3600000,distanceKm:item.distanceKm,speedMs:item.relativeSpeedMs,tleA:"synthetic",tleB:"synthetic"}));
  const state=engine.at(currentHour),currentMs=EPOCH_MS+currentHour*3600000;
  samples.push({ms:currentMs,distanceKm:state.distanceKm,speedMs:state.relativeSpeedMs,tleA:"synthetic",tleB:"synthetic"});
  samples.sort((a,b)=>a.ms-b.ms);
  const window={id:`${step().id}-${beatIndex}`,start:new Date(EPOCH_MS+config.display.startHour*3600000).toISOString(),end:new Date(EPOCH_MS+config.display.endHour*3600000).toISOString()};
  const qualifications=thresholdIntervals(samples,config.display.distanceThresholdKm,config.display.speedThresholdMs);
  if(step().id==="relative"){
    if(!geoChart)return;
    const fraction=Math.max(0,Math.min(1,(currentHour-config.display.startHour)/(config.display.endHour-config.display.startHour)));
    const index=Math.round(fraction*(geoChart.samples.length-1));
    const realSample=geoChart.samples[index],realMs=realSample.ms;
    const realQualifications=thresholdIntervals(geoChart.samples,config.display.distanceThresholdKm,config.display.speedThresholdMs);
    // These are the published model's chart renderer and the archived E-003
    // GEO pair, rather than measurements from the synthetic teaching scene.
    modelChartScales.set("distance",drawOrbitalChart($("modelDistanceChart"),geoChart.samples,"distanceKm",{window:geoChart.window,currentMs:realMs,threshold:config.display.distanceThresholdKm,title:"Separation distance (km)",maximum:50000,qualifications:realQualifications,fixedWindow:true,timeOnly:false}));
    modelChartScales.set("speed",drawOrbitalChart($("modelSpeedChart"),geoChart.samples,"speedMs",{window:geoChart.window,currentMs:realMs,threshold:config.display.speedThresholdMs,title:"Relative speed (m/s)",maximum:1000,qualifications:realQualifications,fixedWindow:true,timeOnly:false,speedUnit:"m/s"}));
    $("modelRangeStat").textContent=Number.isFinite(realSample.distanceKm)?`${fmtNum(realSample.distanceKm)} km`:"—";
    $("modelSpeedStat").textContent=Number.isFinite(realSample.speedMs)?`${fmtNum(realSample.speedMs)} m/s`:"—";
    const dwellMs=realQualifications.both.intervals.reduce((sum,interval)=>sum+interval.end-interval.start,0);
    $("modelDwellStat").textContent=fmtNum(dwellMs/3600000);
    $("modelDwellUnit").textContent="h";
  }else{
    drawOrbitalChart($("distanceChart"),samples,"distanceKm",{window,currentMs,threshold:config.display.distanceThresholdKm,title:"Separation distance (km)",maximum:50000,qualifications,fixedWindow:true,timeOnly:false});
    drawOrbitalChart($("speedChart"),samples,"speedMs",{window,currentMs,threshold:config.display.speedThresholdMs,title:"Relative speed (m/s)",maximum:1000,qualifications,fixedWindow:true,timeOnly:false,speedUnit:"m/s"});
  }
  $("dwellLabel").textContent=`Both thresholds: ${fmtNum(dwellHours(series,config.display.distanceThresholdKm,config.display.speedThresholdMs))} h cumulative dwell`;
}
function animate(now) {
  const dt=lastFrame?Math.min(.1,(now-lastFrame)/1000):0;lastFrame=now;
  if (chapter()&&playing&&engine) { currentHour+=dt*config.display.rateHoursPerSecond; if (currentHour>config.display.endHour) currentHour=config.display.startHour; updateScene(); drawCharts(); }
  if (["opening","closing"].includes(step().id) && openingArt) openingArt.render(now);
  if (!$("sectionArt").hidden && sectionArt) sectionArt.render(now);
  if (scene3d) scene3d.renderer.render(scene3d.scene,scene3d.camera);
  requestAnimationFrame(animate);
}
function setResearchArea(index) {
  for(const [i,node] of [...$("researchAreas").children].entries()){
    const active=i===index,video=node.querySelector("video");
    node.classList.toggle("active",active);node.setAttribute("aria-pressed",String(active));
    if(active&&!matchMedia("(prefers-reduced-motion: reduce)").matches) video.play().catch(()=>{});
    else {video.pause();video.currentTime=0;}
  }
}
function bind() {
  window.addEventListener("keydown",event=>{
    const active=document.activeElement;
    if (["INPUT","TEXTAREA","SELECT"].includes(active?.tagName)||active?.isContentEditable||event.altKey||event.ctrlKey||event.metaKey)return;
    if (["ArrowRight","PageDown"].includes(event.key)||event.key===" "||event.code === "Space") { event.preventDefault();event.stopPropagation();advance(1); }
    else if (["ArrowLeft","PageUp"].includes(event.key)) { event.preventDefault();event.stopPropagation();advance(-1); }
    else if(event.key==="Home"){event.preventDefault();go(0);}
    else if(event.key==="End"){event.preventDefault();go(doc.steps.length-1);}
  },true);
  $("slide").addEventListener("click",event=>{ if (!spotMode && !event.target.closest("a,button,[data-no-advance]") && !event.defaultPrevented) advance(1); });
  let scenePointer=null;
  $("scene").addEventListener("pointerdown",event=>{if(event.target===$("scene")||event.target===scene3d?.renderer.domElement)scenePointer={x:event.clientX,y:event.clientY};});
  $("scene").addEventListener("pointerup",event=>{if(!scenePointer||spotMode)return;const moved=Math.hypot(event.clientX-scenePointer.x,event.clientY-scenePointer.y);scenePointer=null;if(moved<5&&(event.target===$("scene")||event.target===scene3d?.renderer.domElement))advance(1);});
  $("closeProjectVisit").onclick=()=>advance(1);
  $("previousStep").onclick=()=>advance(-1);$("nextStep").onclick=()=>advance(1);
  $("stepJump").onchange=()=>go(Number($("stepJump").value));
  $("beatSelect").onchange=()=>{beatIndex=Number($("beatSelect").value);applyBeat();};
  $("exampleSelect").onchange=()=>{beatIndex=Number($("exampleSelect").value);applyBeat();};
  for(const id of ["legendA","legendB"])$(id).addEventListener("click",event=>{if(event.target===$(id))$(id).open=!$(id).open;});
  $("frameToggle").onclick=()=>{ change("display.mode",config.display.mode === "eci" ? "relative" : "eci"); applyBeat(false); };
  $("originToggle").onclick=()=>{ sceneOrigin = sceneOrigin === "A" ? "B" : "A"; customCamera=false;$("originToggle").title=`Center Object ${sceneOrigin === "A" ? "B" : "A"}`;$("originToggle").setAttribute("aria-label",$("originToggle").title);updateScene(); };
  for(const [id,factor] of [["zoomIn",.8],["zoomOut",1.25]])$(id).onclick=()=>{const {camera,controls}=scene3d;camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);customCamera=true;controls.update();};
  $("playButton").onclick=togglePlay;
  $("timeSlider").addEventListener("input",event=>{currentHour=config.display.startHour+Number(event.target.value)/1000*(config.display.endHour-config.display.startHour);updateScene();drawCharts(true);});
  for (const [id,path] of [["distanceThreshold","display.distanceThresholdKm"],["speedThreshold","display.speedThresholdMs"],["distanceThresholdRange","display.distanceThresholdKm"],["speedThresholdRange","display.speedThresholdMs"]]) $(id).addEventListener("input",event=>change(path,Number(event.target.value)));
  const setModelThreshold=(path,value)=>{
    config.display[path.split(".")[1]]=value;
    syncControls();drawCharts(true);
    $("saveStatus").textContent="Unsaved chapter changes";
  };
  for(const [kind,edgeId,chartId,path,maximum,stepSize] of [["distance","modelDistanceEdge","modelDistanceChart","display.distanceThresholdKm",50000,10],["speed","modelSpeedEdge","modelSpeedChart","display.speedThresholdMs",1000,.1]]){
    const edge=$(edgeId),canvas=$(chartId);
    const setAt=clientY=>{
      const scale=modelChartScales.get(kind);if(!scale)return;
      const rect=canvas.getBoundingClientRect();
      const chartY=(clientY-rect.top)*155/Math.max(1,rect.height);
      const value=Math.max(0,Math.min(maximum,(scale.bottom-chartY)/(scale.bottom-scale.top)*scale.max));
      setModelThreshold(path,Number((Math.round(value/stepSize)*stepSize).toFixed(stepSize<1?1:0)));
    };
    edge.addEventListener("pointerdown",event=>{edge.setPointerCapture(event.pointerId);setAt(event.clientY);});
    edge.addEventListener("pointermove",event=>{if(edge.hasPointerCapture(event.pointerId))setAt(event.clientY);});
    edge.addEventListener("keydown",event=>{
      if(!["ArrowUp","ArrowDown"].includes(event.key))return;
      event.preventDefault();setModelThreshold(path,Number(Math.max(0,Math.min(maximum,Number(config.display[path.split(".")[1]])+(event.key==="ArrowUp"?stepSize:-stepSize))).toFixed(stepSize<1?1:0)));
    });
  }
  $("presetSelect").onchange=()=>{ activePreset=$("presetSelect").value;config=clone(doc.presets[activePreset]);config.display={trailThickness:1.8,referenceThickness:1.2,borderThickness:1.1,borderOpacity:.7,borderColor:"#707070",...config.display};currentHour=config.display.startHour;syncControls();recalc();restoreCamera();redrawSceneBorders();$("saveStatus").textContent="Unsaved preset choice"; };
  $("savePreset").onclick=async()=>{const name=prompt("Preset name",doc.presets[activePreset]?.label||"My scenario");if(!name)return;const key=/^[a-z0-9-]+$/.test(activePreset)&&doc.presets[activePreset]?.label===name?activePreset:`custom-${Date.now()}`;doc.presets[key]={...clone(config),label:name};activePreset=key;buildPresets();$("presetSelect").value=key;await saveDoc("Preset saved on this computer");};
  $("saveChapter").onclick=async()=>{doc.chapterOverrides[beatCounts[step().id]?cameraKey():step().id]=clone(config);doc.chapterPresets[step().id]=activePreset;await saveDoc("Scenario saved for this chapter");};
  $("saveOpeningCamera").onclick=async()=>{doc.openingStyle.cameraView=openingArt.getCamera();await saveDoc("Opening camera saved locally");};
  $("saveSectionCamera").onclick=async()=>{doc.openingStyle.sectionCameraView=sectionArt.getCamera();await saveDoc("Section camera saved locally");};
  $("saveCamera").onclick=async()=>{const {camera,controls}=scene3d;doc.cameraViews[cameraKey()]={mode:config.display.mode,position:camera.position.toArray(),target:controls.target.toArray(),up:camera.up.toArray(),zoom:camera.zoom};await saveDoc("Camera saved for this moment");};
  $("saveCameraQuick").onclick=()=>$("saveCamera").click();
  $("resetCamera").onclick=async()=>{delete doc.cameraViews[cameraKey()];customCamera=false;restoreCamera();await saveDoc("Camera reset saved locally");};
  $("inspectorToggle").onclick=()=>{document.body.classList.toggle("inspectorCollapsed");const collapsed=document.body.classList.contains("inspectorCollapsed");$("inspectorToggle").textContent=collapsed?"Show controls":"Hide controls";$("inspectorToggle").setAttribute("aria-expanded",String(!collapsed));setTimeout(resizeScene,20);};
  $("spotButton").onclick=()=>{spotMode=!spotMode;document.body.classList.toggle("spotMode",spotMode);$("spotButton").setAttribute("aria-pressed",spotMode);};
  $("commentsButton").onclick=()=>{$("commentsDrawer").hidden=!$("commentsDrawer").hidden;};$("closeComments").onclick=()=>{$("commentsDrawer").hidden=true;};
  $("archivedToggle").onclick=()=>{showArchived=!showArchived;$("archivedToggle").setAttribute("aria-pressed",String(showArchived));renderComments();};
  $("cancelComment").onclick=()=>{$("commentForm").hidden=true;};
  $("commentForm").onsubmit=async event=>{event.preventDefault();try{const result=await request("/api/presentation-comments",{action:"add",comment:{...draft,text:$("commentText").value.trim()}});comments=result.comments;$("commentForm").hidden=true;$("commentText").value="";spotMode=false;document.body.classList.remove("spotMode");$("spotButton").setAttribute("aria-pressed","false");renderComments();}catch(error){alert(error.message);}};
  $("downloadComments").onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({schema:"presentation-comments-v1",comments},null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="presentation-comments.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  document.addEventListener("click",event=>{if(!spotMode||presentMode)return;const target=event.target.closest("[data-spot]")||event.target.closest("#slide")||event.target.closest("#playback");if(!target||event.target.closest("#commentsDrawer,#reviewBar"))return;event.preventDefault();event.stopPropagation();const rect=target.getBoundingClientRect();draft={stepId:step().id,stepTitle:step().title,element:target.dataset.spot||target.id||"Slide",x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height,atHour:chapter()?currentHour:null};$("commentLocation").textContent=`${step().title} · ${draft.element}`;$("commentsDrawer").hidden=false;$("commentForm").hidden=false;$("commentText").focus();},true);
  window.addEventListener("resize",()=>{resizeScene();openingArt?.resize();drawCharts();alignOpeningMetadata();clampInspector();placePins();}); window.addEventListener("hashchange",()=>{const index=doc.steps.findIndex(item=>item.id===location.hash.slice(1));if(index>=0){stepIndex=index;beatIndex=0;showStep();}});
}
function togglePlay(){playing=!playing;$("playButton").textContent=playing?"Ⅱ":"▶";$("playButton").setAttribute("aria-label",playing?"Pause playback":"Play playback");}
function renderComments() {
  const open=comments.filter(item=>item.status!=="archived"), archived=comments.filter(item=>item.status==="archived");
  $("commentCount").textContent=open.length;const host=$("commentList");host.replaceChildren();
  $("archivedToggle").textContent=`${showArchived?"Hide":"Show"} archived (${archived.length})`;
  if(!open.length){const p=document.createElement("p");p.textContent="No new comments yet.";host.append(p);}
  for(const item of [...open,...(showArchived?archived:[])]){
    const article=document.createElement("article");
    const jump=document.createElement("button");jump.textContent=`${item.stepTitle} · ${item.element}${item.status==="archived"?" · Archived":""}`;jump.onclick=()=>{const index=doc.steps.findIndex(step=>step.id===item.stepId);if(index>=0)go(index);if(Number.isFinite(item.atHour)&&chapter()){currentHour=item.atHour;updateScene();drawCharts();}};
    const p=document.createElement("p");p.textContent=item.text;article.append(jump,p);
    if(item.status!=="archived"){const archive=document.createElement("button");archive.textContent="Archive";archive.onclick=async()=>{comments=(await request("/api/presentation-comments",{action:"archive",id:item.id})).comments;renderComments();};article.append(archive);}
    host.append(article);
  }
  placePins();
}
function placePins(){if(!doc)return;const layer=$("spotPins");layer.replaceChildren();if(presentMode)return;let i=0;for(const item of comments){if(item.status==="archived"||item.stepId!==step().id)continue;i++;const target=[...document.querySelectorAll("[data-spot]")].find(node=>node.dataset.spot===item.element)||$(step().kind==="slide"?"slide":"scene");if(!target||target.hidden)continue;const rect=target.getBoundingClientRect();const pin=document.createElement("button");pin.className="pin";pin.textContent=i;pin.title=item.text;pin.style.left=`${rect.left+rect.width*item.x}px`;pin.style.top=`${rect.top+rect.height*item.y}px`;pin.onclick=()=>{$("commentsDrawer").hidden=false;};layer.append(pin);}}
