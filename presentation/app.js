import * as THREE from "../visualization/Viz/vendor/three/three.module.js";
import { OrbitControls } from "../visualization/Viz/vendor/three/addons/controls/OrbitControls.js";
import { feature } from "../visualization/Viz/vendor/topojson/topojson-client.js";
import { dotTexture } from "../visualization/Viz/relative-rendering.js";
import { createEngine, EPOCH_MS, EARTH_KM, orbitalFrame, relativeCoordinates, dwellHours } from "./orbit-engine.js";
import { mountOpeningArt } from "./opening-art.js";

const $ = id => document.getElementById(id);
const clone = value => structuredClone(value);
const chapterIds = ["tle", "uncertainty", "neighbors", "relative", "time-series", "conjunction", "thresholds", "shadowing"];
const initialVisibility = {
  tle: { objectB:false, tle:false, uncertainty:false, metrics:false, charts:false, thresholds:false, maneuvers:false },
  uncertainty: { objectB:false, tle:false, uncertainty:false, metrics:false, charts:false, thresholds:false, maneuvers:false },
  neighbors: { objectB:false, tle:false, uncertainty:false, metrics:false, charts:false, thresholds:false, maneuvers:false },
  relative: { objectB:true, tle:false, uncertainty:false, metrics:true, charts:false, thresholds:false, maneuvers:true },
  "time-series": { objectB:true, tle:false, uncertainty:false, metrics:true, charts:true, thresholds:false, maneuvers:true },
  conjunction: { objectB:true, tle:false, uncertainty:false, metrics:true, charts:true, thresholds:false, maneuvers:false },
  thresholds: { objectB:true, tle:false, uncertainty:false, metrics:true, charts:true, thresholds:true, maneuvers:false },
  shadowing: { objectB:true, tle:false, uncertainty:false, metrics:true, charts:true, thresholds:true, maneuvers:true }
};
const controlGroups = {
  openingControls: [
    ["openingStyle.markerSizePx", "Satellite dot size", 8, 64, 1, "px"],
    ["openingStyle.earthScale", "Earth size", .25, 1.5, .01, "×"],
    ["openingStyle.artScale", "Artwork scale", .4, 1.6, .01, "×"],
    ["openingStyle.sectionEarthScale", "Section Earth size", .2, 1.4, .01, "×"],
    ["openingStyle.sectionArtScale", "Section scene scale", .3, 1.4, .01, "×"],
    ["openingStyle.extraChasers", "Additional chasers", 0, 3, 1, ""],
    ["openingStyle.animationRate", "Animation speed", 10, 1000, 10, "×"],
    ["openingStyle.trailHours", "Chaser trail length", .1, 3.2, .1, "h"],
    ["openingStyle.trailThickness", "Chaser trail thickness", .5, 12, .1, "px"],
    ["openingStyle.referenceThickness", "Reference orbit thickness", .5, 10, .1, "px"],
    ["openingStyle.borderThickness", "Country border thickness", .4, 4, .1, "px"],
    ["openingStyle.borderOpacity", "Country border opacity", 0, 1, .01, ""],
    ["openingStyle.borderColor", "Country border color", "color"],
    ["openingStyle.earthColor", "Earth color", "color"]
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
    ["display.trailHours", "Trail length", 0, 96, .5, "h"], ["display.markerSizePx", "Marker size", 5, 25, 1, "px"],
    ["display.showOrbit", "Reference orbit", "check"], ["display.showTrail", "Trails", "check"],
    ["display.showVectors", "Relative vector", "check"], ["display.showUncertainty", "Hypothetical ellipsoid", "check"],
    ["display.uncertaintyKm", "Ellipsoid scale", 1, 1000, 1, "km"],
    ["display.trailThickness", "Trail thickness", .5, 8, .1, "px"],
    ["display.referenceThickness", "Orbit thickness", .5, 8, .1, "px"],
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
const fmtNum = value => Number.isFinite(value) ? new Intl.NumberFormat("en-US", {maximumFractionDigits: value < 10 ? 2 : 0}).format(value) : "—";
function fillElementList(host, values, epoch) {
  host.replaceChildren();
  for(const [name,value] of [["Semi-major axis",`${(EARTH_KM+values.altitudeKm).toFixed(1)} km`],["Eccentricity",Number(values.eccentricity).toFixed(5)],["Inclination",`${Number(values.inclinationDeg).toFixed(2)}°`],["RAAN",`${Number(values.raanDeg).toFixed(2)}°`],["Argument of perigee",`${Number(values.argPerigeeDeg).toFixed(2)}°`],["Mean anomaly",`${Number(values.meanAnomalyDeg).toFixed(2)}°`],["Epoch",epoch.replace("T"," ").replace(".000Z"," UTC")]]){
    const row=document.createElement("div"),dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=name;dd.textContent=value;row.append(dt,dd);host.append(row);
  }
}
function elementsFromTle(tle) {
  const line=tle.line2, meanMotion=Number(line.slice(52,63));
  return {altitudeKm:Math.cbrt(398600.4418/(meanMotion*2*Math.PI/86400)**2)-EARTH_KM,
    inclinationDeg:Number(line.slice(8,16)),raanDeg:Number(line.slice(17,25)),eccentricity:Number(`0.${line.slice(26,33)}`),
    argPerigeeDeg:Number(line.slice(34,42)),meanAnomalyDeg:Number(line.slice(43,51))};
}
const beatCounts = { "statements-shadow":6, "statements-focus":2, tle:3, uncertainty:3, neighbors:3 };
const beatLabels = {
  "statements-shadow":["United Kingdom","China","Australia","European Union","Netherlands","United States"],
  "statements-focus":["An unusual approach","The broader concern"],
  tle:["Orbit elements","Orbit in motion","Updated elements"],
  uncertainty:["Estimated orbit","Relative view","Uncertainty region"],
  neighbors:["Object A","Introduce Object B","Relative view"]
};
const statementCards = {
  "statements-shadow": [
    { flag:"🇬🇧", country:"United Kingdom", date:"9 July 2026", quote:"Unsolicited rendezvous and proximity operations can introduce safety risks through <strong>excessively close approaches</strong> that may result in physical interference or accidents potentially involving strategic space assets.", source:"UK delegation · OEWG on PAROS, third substantive session", url:"https://conf.unog.ch/digitalrecordings/en/clients/12.1266/meetings/6D062758-D961-4805-BF6F-B39345439672/10h14/en?position=5935" },
    { flag:"🇨🇳", country:"China", date:"8 July 2026", quote:"Sometimes the distance [between non-cooperative satellites] is merely <strong>10 kilometers</strong> ... Sometimes it was only <strong>12 kilometers</strong>.", source:"Chinese delegation · OEWG on PAROS, third substantive session · English transcription; referring to TJS 15, 16, and 17", url:"https://conf.unog.ch/digitalrecordings/en/clients/12.1266/meetings/44A60FEA-18CA-4F46-AF6F-4B6236CAF19B/15h07/en?position=8499" },
    { flag:"🇦🇺", country:"Australia", date:"9 July 2026", quote:"Nonconsensual proximity operations including close approach or <strong>so-called shadowing</strong> may be perceived as interference with the state's control over its space object or as coercive signaling.", source:"Australian delegation · OEWG on PAROS, third substantive session", url:"https://conf.unog.ch/digitalrecordings/en/clients/12.1266/meetings/6D062758-D961-4805-BF6F-B39345439672/10h14/en?position=5363" },
    { flag:"🇪🇺", country:"European Union", date:"9 July 2026", quote:"Unfortunately, we continue to witness examples of unfriendly and even aggressive operations, including <strong>satellites being shadowed by other ones</strong> ...", source:"European Union delegation · OEWG on PAROS, third substantive session", url:"https://conf.unog.ch/digitalrecordings/en/clients/12.1266/meetings/6D062758-D961-4805-BF6F-B39345439672/10h14/en?position=88" },
    { flag:"🇳🇱", country:"Netherlands", date:"9 July 2026", quote:"The risks increase when such operations interfere with another space object or <strong>force it to perform an evasive maneuver</strong>.", source:"Dutch delegation · OEWG on PAROS, third substantive session", url:"https://conf.unog.ch/digitalrecordings/en/clients/12.1266/meetings/6D062758-D961-4805-BF6F-B39345439672/10h14/en?position=8206" },
    { flag:"🇺🇸", country:"United States", date:"February 2020", quote:"This is <strong>unusual and disturbing behavior</strong> and has the potential to create a dangerous situation in space.", source:"General John W. Raymond · CBS News, 12 February 2020 · About USA 245", url:"https://www.cbsnews.com/news/russian-satellites-fly-near-us-government-satellite-activity-unusual-disturbing-space-command/" }
  ],
  "statements-focus": [
    { flag:"🇺🇸", country:"United States", date:"February 2020", quote:"This is <strong>unusual and disturbing behavior</strong>", source:"General John W. Raymond · CBS News, 12 February 2020 · About USA 245", url:"https://www.cbsnews.com/news/russian-satellites-fly-near-us-government-satellite-activity-unusual-disturbing-space-command/" },
    { flag:"🇺🇸", country:"United States", date:"February 2020", quote:"and has the potential to create a <strong>dangerous situation in space</strong>.", source:"General John W. Raymond · CBS News, 12 February 2020 · About USA 245", url:"https://www.cbsnews.com/news/russian-satellites-fly-near-us-government-satellite-activity-unusual-disturbing-space-command/" }
  ],
};
let doc, stepIndex = 0, beatIndex = 0, config, engine, series, currentHour = 0, playing = true, lastFrame = 0, spotMode = false, draft = null, comments = [], showArchived = false, activePreset = "neighbors", customCamera = false, scene3d, sceneOrigin = "A", openingArt, sectionArt, saveStyleTimer, saveWordingTimer, saveTeachingTimer;

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
  doc.openingStyle.artScale ??= 1;
  doc.openingStyle.sectionEarthScale ??= .55;
  doc.openingStyle.sectionArtScale ??= .8;
  doc.chapterLayout ||= {};
  doc.chapterLabels ||= {};
  stepIndex = Math.max(0, doc.steps.findIndex(step => step.id === location.hash.slice(1)));
  buildStepNav(); buildControls(); buildWordingControls(); buildVisibility(); buildPresets(); setupScene();
  openingArt = mountOpeningArt($("openingArt"),doc.openingStyle);
  sectionArt = mountOpeningArt($("sectionArt"),{...doc.openingStyle,sectionMode:true,markerSizePx:Math.max(10,doc.openingStyle.markerSizePx*.6),animationRate:85,earthScale:doc.openingStyle.sectionEarthScale??.55,artScale:doc.openingStyle.sectionArtScale??.8});
  bind(); bindLayoutDrag(); showStep(); animate(0); renderComments();
  if(doc.inspectorPosition){Object.assign($("inspector").style,{left:`${doc.inspectorPosition.x}%`,top:`${doc.inspectorPosition.y}%`,right:"auto",bottom:"auto"});}
}
function step() { return doc.steps[stepIndex]; }
function chapter() { return step().kind === "chapter"; }
function visibility() {
  const show = { ...initialVisibility[step().id], ...doc.chapterVisibility[step().id] };
  if (step().id === "tle") Object.assign(show, { objectB:false, tle:false, uncertainty:false, metrics:false, charts:false, thresholds:false, maneuvers:false });
  if (step().id === "uncertainty") Object.assign(show, { objectB:false, tle:false, uncertainty:beatIndex >= 2, metrics:false, charts:false, thresholds:false, maneuvers:false });
  if (step().id === "neighbors") Object.assign(show, { objectB:beatIndex >= 1, tle:false, uncertainty:false, metrics:false, charts:false, thresholds:false, maneuvers:false });
  return show;
}
function buildStepNav() {
  $("steps").replaceChildren();
  doc.steps.forEach((item, index) => {
    const button = document.createElement("button"); button.type = "button";
    button.textContent = item.kind === "chapter" ? `${chapterIds.indexOf(item.id) + 1}. ${item.title}` : item.title;
    button.title = item.title; button.addEventListener("click", () => go(index)); $("steps").append(button);
  });
}
function buildWordingControls() {
  const details=document.createElement("details"),summary=document.createElement("summary");
  summary.textContent="On-screen wording";details.append(summary);
  for(const [key,label,multiline] of [["title","Chapter title",false],["subtitle","Eyebrow",false],["body","Chapter description",true],["A","Object A label",false],["B","Object B label",false]]){
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
function applyWording() {
  const item=step(),labels=doc.chapterLabels[item.id]||{A:"Object A",B:"Object B"};
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
  const node = chapter() ? $("episode") : $("slide");
  node.classList.remove("entering"); void node.offsetWidth; node.classList.add("entering");
}
function renderQuoteCards(id) {
  const cards = statementCards[id] || [], host = $("quoteCards"); host.replaceChildren();
  host.hidden = !cards.length; host.classList.toggle("two", cards.length === 2);
  for (const item of cards) {
    const card = document.createElement("article"); card.className = "quoteCard";
    const head = document.createElement("div"); head.className = "quoteHead";
    const name = document.createElement("strong"); name.textContent = `${item.flag} ${item.country}`;
    const date = document.createElement("time"); date.textContent = item.date;
    head.append(name, date);
    const quote = document.createElement("blockquote"); quote.innerHTML = `“${item.quote}”`;
    const source = document.createElement("p"); source.textContent = item.source;
    source.title=item.url;
    card.append(head, quote, source); host.append(card);
  }
}
function showStep() {
  const item = step();
  [...$("steps").children].forEach((node, index) => index === stepIndex ? node.setAttribute("aria-current", "step") : node.removeAttribute("aria-current"));
  $("steps").children[stepIndex]?.scrollIntoView({block:"nearest",inline:"nearest"});
  document.body.dataset.step = item.id;
  document.body.classList.toggle("chapterActive", chapter());
  $("slide").hidden = chapter(); $("episode").hidden = !chapter();
  $("inspector").hidden = presentMode || (!chapter() && !["opening","statements-close"].includes(item.id));
  $("openingControlsSection").hidden = !["opening","statements-close"].includes(item.id);
  $("chapterControlsSection").hidden = !chapter();
  $("inspectorTitle").textContent=item.id==="opening"?"Opening artwork":item.id==="statements-close"?"Section artwork":"Scenario design";
  if (!chapter()) {
    if(item.id==="opening"){
      document.body.classList.add("inspectorCollapsed");$("inspectorToggle").textContent="Show controls";$("inspectorToggle").setAttribute("aria-expanded","false");syncControls();
    }
    $("slideTitle").textContent = item.title; $("slideEyebrow").textContent = item.subtitle||"";
    $("slideBody").textContent = item.body||"";
    $("slideBody").hidden=Boolean(statementCards[item.id]);
    if(item.id==="opening")$("slideTitle").innerHTML="How Close Is<br>Too Close?";
    if(item.id==="statements-close")$("slideTitle").innerHTML="<em>Close approaches</em> and <em>shadowing</em>";
    $("openingArt").hidden = item.id !== "opening"; $("labIntro").hidden = item.id !== "lab"; $("slideCopy").hidden = item.id === "lab";
    $("sectionArt").hidden = !["statements-close","library","limitations","future"].includes(item.id);
    $("slidePrompt").hidden = item.id!=="statements-focus";
    $("slidePrompt").textContent = item.body || "";
    renderQuoteCards(item.id); applyBeat(); enterStep(); updateProgress(); placePins(); return;
  }
  activePreset = doc.chapterPresets[item.id] || "neighbors";
  config = clone(doc.chapterOverrides[item.id] || doc.presets[activePreset]);
  config.display={trailThickness:1.8,referenceThickness:1.2,borderThickness:1.1,borderOpacity:.7,borderColor:"#707070",...config.display};
  const teaching = ["uncertainty","neighbors"].includes(item.id);
  document.body.classList.toggle("inspectorCollapsed", teaching && !presentMode);
  $("inspectorToggle").textContent = teaching && !presentMode ? "Show controls" : "Hide controls";
  $("inspectorToggle").setAttribute("aria-expanded",String(!teaching || presentMode));
  setTimeout(resizeScene, 30);
  if (item.id === "conjunction") config.display.mode = "relative";
  if (item.id === "tle") config.display.mode = "eci";
  if (item.id === "tle" && beatIndex >= 2) config.teachingPlaneChange = { hour:8, dvMs:60 };
  if (item.id === "tle" && beatIndex < 2) delete config.teachingPlaneChange;
  if (item.id === "neighbors") config.display.mode = "relative";
  if (item.id === "neighbors" && !doc.chapterOverrides[item.id]) config.objectB.relativeLongitudeDeg = 1.2;
  if (item.id === "uncertainty") config.display.mode = beatIndex ? "relative" : "eci";
  if (item.id === "uncertainty" && !doc.chapterOverrides[item.id]) config.display.uncertaintyKm = 150;
  currentHour = config.display.startHour; customCamera = false;
  if (["tle","uncertainty","neighbors"].includes(item.id)) { playing = true; $("playButton").textContent = "Pause"; }
  sceneOrigin = "A";
  syncWordingControls();
  $("presetSelect").value = activePreset;
  syncControls(); updateVisibility(); recalc(); redrawSceneBorders(); restoreCamera(); applyBeat(false); applyLayout(); enterStep(); updateProgress(); placePins();
}
function applyBeat(rebuild = true) {
  const id = step().id;
  document.body.dataset.beat = String(beatIndex);
  if (!chapter()) {
    if(statementCards[id]) [...$("quoteCards").children].forEach((node,index)=>{node.classList.toggle("pending",index>beatIndex);node.classList.toggle("revealed",index===beatIndex);});
    updateProgress();placePins();return;
  }
  if (id === "tle") {
    const changed = (beatIndex >= 2) !== Boolean(config.teachingPlaneChange);
    if (beatIndex >= 2) { config.teachingPlaneChange = { hour:8, dvMs:60 }; if (changed) currentHour = 8; }
    else delete config.teachingPlaneChange;
    if (changed && rebuild) recalc();
    $("legendA").open = beatIndex >= 1;
  }
  if (id === "uncertainty") {
    const mode = beatIndex >= 1 ? "relative" : "eci";
    if (config.display.mode !== mode) { config.display.mode = mode; customCamera = false; if (rebuild) { syncControls(); recalc(); restoreCamera(); } }
    config.display.showUncertainty = beatIndex >= 2;
    $("legendA").open = false;
  }
  if (id === "neighbors") { $("legendB").open = beatIndex >= 1; }
  $("sceneLegend").hidden = id === "uncertainty";
  $("panel").hidden = ["tle", "neighbors"].includes(id) || (id === "uncertainty" && beatIndex < 2);
  $("teachingIntro").hidden=id!=="tle";
  $("playback").hidden = ["uncertainty", "neighbors"].includes(id);
  $("sceneMetrics").hidden = ["tle", "uncertainty", "neighbors"].includes(id);
  $("frameTools").hidden = id === "neighbors" ? beatIndex < 2 : id === "uncertainty" || config.display.mode !== "relative";
  $("frameToggle").textContent = config.display.mode === "eci" ? "ECI frame" : "Local frame";
  $("originToggle").textContent = `Origin · Object ${sceneOrigin}`;
  $("originToggle").hidden = config.display.mode !== "relative";
  if (rebuild && doc.cameraViews[cameraKey()]?.mode === config.display.mode) restoreCamera();
  updateVisibility(); updateScene();
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
    const source=input.dataset.path.startsWith("openingStyle.")?doc:config;
    if (!source) return;
    const value = atPath(source, input.dataset.path);
    if (input.type === "checkbox") input.checked = Boolean(value); else input.value = value;
  });
  if(config){
    $("distanceThreshold").value = config.display.distanceThresholdKm;
    $("speedThreshold").value = config.display.speedThresholdMs;
  }
}
function change(path, value) {
  if (path.startsWith("openingStyle.")) {
    setPath(doc,path,value);openingArt?.setOptions(doc.openingStyle);
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
  $("epochText").textContent = displayedA.epochUtc.replace(".000Z", " UTC").replace("T", " ");
  $("aElements").textContent = `${engine.tleAfterA && step().id === "tle" && beatIndex >= 2 ? "Updated synthetic TLE" : "Synthetic TLE"} · ${(EARTH_KM + config.objectA.altitudeKm).toFixed(0)} km semi-major axis`;
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
    const borders=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,3),new THREE.MeshBasicMaterial({color:0x707070,transparent:true,opacity:.7,depthWrite:false}),positions.length/6);
    borders.frustumCulled=false;earth.add(borders);
    scene3d.borders=borders;scene3d.borderSegments=positions;redrawSceneBorders();
  }).catch(console.warn);
  const markerA = new THREE.Sprite(new THREE.SpriteMaterial({map:dotTexture("#eaaa00"),sizeAttenuation:false,transparent:true,depthTest:true,depthWrite:false}));
  const markerB = new THREE.Sprite(new THREE.SpriteMaterial({map:dotTexture("#a9a9a9"),sizeAttenuation:false,transparent:true,depthTest:true,depthWrite:false}));
  for (const marker of [markerA,markerB]) { marker.renderOrder = 10; scene.add(marker); }
  const line = (color, opacity=1, thick=false) => {
    const object=thick?new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false}))
      :new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false}));
    object.userData.thick=thick;return object;
  };
  const orbit = line(0x555555,.72,true), trailA = line(0xeaaa00,.76,true), trailB = line(0x777777,.78,true), vector = line(0x8d6d11,.78), velocityVector = line(0x7890a5,.86);
  for (const item of [orbit,trailA,trailB,vector,velocityVector]) scene.add(item);
  const ringPoints=Array.from({length:241},(_,i)=>{const a=i*2*Math.PI/240;return new THREE.Vector3(1.34*Math.cos(a),0,1.34*Math.sin(a));});
  const equator=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ringPoints),new THREE.LineBasicMaterial({color:0xd3b968,transparent:true,opacity:.56,depthWrite:false}));
  const ecliptic=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ringPoints),new THREE.LineBasicMaterial({color:0x8f9da6,transparent:true,opacity:.6,depthWrite:false}));
  ecliptic.rotation.x=THREE.MathUtils.degToRad(23.44);scene.add(equator,ecliptic);
  const ellipsoid = new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:0xe9c977,transparent:true,opacity:.22,depthWrite:false})); scene.add(ellipsoid);
  const ellipsoidGrid = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(1.002,16,10)),new THREE.LineBasicMaterial({color:0xa77e17,transparent:true,opacity:.48,depthWrite:false})); scene.add(ellipsoidGrid);
  const axes = new THREE.Group();
  for (const [direction,color] of [[new THREE.Vector3(1,0,0),0xb58820],[new THREE.Vector3(0,-1,0),0x727b82],[new THREE.Vector3(0,0,-1),0x9d8672]]) axes.add(new THREE.ArrowHelper(direction,new THREE.Vector3(),1.7,color,.25,.12));
  axes.visible=false;
  scene.add(axes);
  scene3d = {host,scene,camera,renderer,controls,earth,markerA,markerB,orbit,trailA,trailB,vector,velocityVector,ellipsoid,ellipsoidGrid,axes,equator,ecliptic};
  new ResizeObserver(resizeScene).observe(host);
}
function resizeScene() {
  if (!scene3d) return; const {host,camera,renderer} = scene3d; const width = Math.max(1,host.clientWidth), height=Math.max(1,host.clientHeight);
  camera.aspect=width/height; camera.updateProjectionMatrix(); renderer.setSize(width,height,false);
}
function redrawSceneBorders() {
  if(!scene3d?.borders||!scene3d.borderSegments)return;
  const {borders,borderSegments}=scene3d,up=new THREE.Vector3(0,1,0),object=new THREE.Object3D();
  const thickness=.0034*Number(config?.display?.borderThickness||1.1);
  for(let i=0,j=0;i<borderSegments.length;i+=6,j++){
    const a=new THREE.Vector3(borderSegments[i],borderSegments[i+1],borderSegments[i+2]);
    const b=new THREE.Vector3(borderSegments[i+3],borderSegments[i+4],borderSegments[i+5]);
    const direction=b.clone().sub(a),length=direction.length();
    if(length<1e-9){object.scale.set(0,0,0);object.updateMatrix();borders.setMatrixAt(j,object.matrix);continue;}
    object.position.copy(a).add(b).multiplyScalar(.5);
    object.quaternion.setFromUnitVectors(up,direction.normalize());
    object.scale.set(thickness,length,thickness);object.updateMatrix();borders.setMatrixAt(j,object.matrix);
  }
  borders.instanceMatrix.needsUpdate=true;
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
    const handle=event.target.closest(".dragHandle[data-drag]");
    if(!handle||presentMode||event.button!==0||(!chapter()&&handle.dataset.drag!=="inspector"))return;
    const node=$(handle.dataset.drag),parent=node?.offsetParent||document.documentElement;
    if(!node||!parent)return;
    event.preventDefault();event.stopPropagation();
    const rect=node.getBoundingClientRect(),bounds=node.id==="inspector"?{left:0,top:0,width:innerWidth,height:innerHeight}:parent.getBoundingClientRect();
    const offsetX=event.clientX-rect.left,offsetY=event.clientY-rect.top;
    handle.setPointerCapture(event.pointerId);parent.classList.add("layoutDragging");
    let position=null;
    const move=e=>{
      const x=Math.max(0,Math.min(bounds.width-node.offsetWidth,e.clientX-bounds.left-offsetX));
      const y=Math.max(0,Math.min(bounds.height-node.offsetHeight,e.clientY-bounds.top-offsetY));
      position={x:Math.round(x/bounds.width*40)*2.5,y:Math.round(y/bounds.height*40)*2.5};
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
  if(line.userData.thick){
    const now=performance.now();
    if(now-(line.userData.lastBuild||0)<65&&line.geometry.attributes.position)return;
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
    camera.up.copy(toScene(frame.along,1));controls.target.set(0,0,0);
  } else if (["tle","uncertainty","neighbors"].includes(step().id)) {
    camera.position.set(18,4,7);controls.target.set(-14,0,0);
  }
  else { camera.position.set(0,1.2,3.8); controls.target.set(0,0,0); }
  if (config.display.mode !== "eci") camera.up.set(0,1,0); camera.zoom=1; camera.updateProjectionMatrix(); controls.update(); customCamera=false;
}
function updateScene() {
  if (!engine || !scene3d || !chapter()) return;
  const {earth,markerA,markerB,trailA,trailB,orbit,vector,velocityVector,ellipsoid,ellipsoidGrid,axes,camera,controls} = scene3d;
  scene3d.equator.visible=step().id==="tle"&&config.display.mode==="eci";
  scene3d.ecliptic.visible=scene3d.equator.visible;
  const state=engine.at(currentHour), originState=sceneOrigin === "B" ? state.B : state.A, frame=orbitalFrame(originState), relative=config.display.mode === "relative";
  const scale=relative ? 1000 : EARTH_KM;
  const transform = p => relative ? toScene(relativeCoordinates(p,originState.r,frame),scale) : toScene(p,scale);
  earth.position.copy(transform({x:0,y:0,z:0})); earth.scale.setScalar(EARTH_KM/scale);
  // Earth and its border map rotate with sidereal time in ECI.
  earth.rotation.y = window.satellite.gstime(new Date(EPOCH_MS+currentHour*3600000));
  markerA.position.copy(transform(state.A.r)); markerB.position.copy(transform(state.B.r));
  const diameter=config.display.markerSizePx * 128/89 * 2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/(Math.max(1,scene3d.host.clientHeight)*camera.zoom);
  markerA.scale.setScalar(diameter); markerB.scale.setScalar(diameter); markerB.visible=visibility().objectB;
  const orbitHours=engine.periodHours;
  const referenceState = sceneOrigin === "B" ? engine.stateB : step().id === "tle" && beatIndex >= 2 ? engine.preManeuverA : engine.stateA;
  const orbitPoints=Array.from({length:240},(_,i)=>transform(referenceState(currentHour+orbitHours*i/239).r));
  const covarianceFocus = step().id === "uncertainty" && beatIndex >= 2;
  linePoints(orbit,orbitPoints,config.display.referenceThickness); orbit.visible=config.display.showOrbit && !covarianceFocus;
  const trailStart=Math.max(config.display.startHour,currentHour-config.display.trailHours);
  const trailHours=Array.from({length:90},(_,i)=>trailStart+(currentHour-trailStart)*i/89);
  linePoints(trailA,trailHours.map(t=>transform(engine.stateA(t).r)),config.display.trailThickness);
  linePoints(trailB,trailHours.map(t=>transform(engine.stateB(t).r)),config.display.trailThickness);
  trailA.visible=config.display.showTrail && !covarianceFocus; trailB.visible=config.display.showTrail&&visibility().objectB && !covarianceFocus;
  linePoints(vector,[markerA.position.clone(),markerB.position.clone()]); vector.visible=config.display.showVectors&&visibility().objectB && !covarianceFocus;
  const velocityTip={x:state.B.r.x+state.dv.x*3600,y:state.B.r.y+state.dv.y*3600,z:state.B.r.z+state.dv.z*3600};
  linePoints(velocityVector,[markerB.position.clone(),transform(velocityTip)]); velocityVector.visible=config.display.showVectors&&visibility().objectB && !covarianceFocus;
  ellipsoid.position.copy(markerA.position); const size=Math.max(.001,config.display.uncertaintyKm/scale);
  const alongTrack=toScene(frame.along,1).normalize();
  ellipsoid.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),alongTrack);
  ellipsoid.scale.set(size*.9,size*2,size*.7); ellipsoid.visible=(config.display.showUncertainty||visibility().uncertainty)&&visibility().uncertainty;
  ellipsoidGrid.position.copy(ellipsoid.position); ellipsoidGrid.scale.copy(ellipsoid.scale); ellipsoidGrid.visible=ellipsoid.visible;
  ellipsoidGrid.quaternion.copy(ellipsoid.quaternion);
  axes.visible=false;
  if(scene3d.borders){scene3d.borders.material.color.set(config.display.borderColor);scene3d.borders.material.opacity=config.display.borderOpacity;}
  if (relative&&!customCamera) {
    if (step().id === "uncertainty" && beatIndex >= 2) { controls.target.copy(markerA.position); camera.position.copy(markerA.position).add(new THREE.Vector3(1.3,.4,.8)); }
    else if (["uncertainty","neighbors"].includes(step().id)) { controls.target.set(-14,0,0); camera.position.set(18,4,7); }
    else {
      const midpoint=markerA.position.clone().add(markerB.position).multiplyScalar(.5);
      const separation=markerA.position.distanceTo(markerB.position);
      const distance=Math.max(1.6,separation*4/Math.max(.55,camera.aspect));
      const direction=new THREE.Vector3(.42,.68,.6).normalize();
      controls.target.copy(midpoint);camera.position.copy(midpoint).addScaledVector(direction,distance);
    }
  }
  if (!relative&&!customCamera) {
    controls.target.set(0,0,0);
    const distance=Math.max(step().id==="tle"?5.8:4,3.4*(EARTH_KM+config.objectA.altitudeKm)/EARTH_KM);
    camera.position.copy(toScene(frame.normal,1).multiplyScalar(distance));camera.up.copy(toScene(frame.along,1));
  }
  controls.update();
  $("distanceValue").textContent=`${fmtNum(state.distanceKm)} km`;
  $("speedValue").textContent=`${fmtNum(state.relativeSpeedMs)} m/s`;
  $("rangeValue").textContent=`${state.rangeRateMs>=0?"+":""}${fmtNum(state.rangeRateMs)} m/s`;
  $("sceneMetricsText").textContent=`${fmtNum(state.distanceKm)} km  ·  ${fmtNum(state.relativeSpeedMs)} m/s`;
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
  if (step().id === "opening" && openingArt) openingArt.render(now);
  if (!$("sectionArt").hidden && sectionArt) sectionArt.render(now);
  if (scene3d) scene3d.renderer.render(scene3d.scene,scene3d.camera);
  requestAnimationFrame(animate);
}
function bind() {
  document.addEventListener("keydown",event=>{
    const active=document.activeElement;
    if (["INPUT","TEXTAREA","SELECT"].includes(active?.tagName)||active?.isContentEditable||event.altKey||event.ctrlKey||event.metaKey)return;
    if (["ArrowRight","PageDown"].includes(event.key)||event.code === "Space") { event.preventDefault(); advance(1); }
    if (["ArrowLeft","PageUp"].includes(event.key)) { event.preventDefault(); advance(-1); }
  });
  $("slide").addEventListener("click",event=>{ if (!spotMode && !event.target.closest("a,button,[data-no-advance]") && !event.defaultPrevented) advance(1); });
  $("researchAreas").addEventListener("click",event=>{const node=event.target.closest(".researchArea");if(!node)return;const active=node.classList.toggle("active");node.setAttribute("aria-pressed",String(active));const video=node.querySelector("video");if(active&&!matchMedia("(prefers-reduced-motion: reduce)").matches)video.play().catch(()=>{});else{video.pause();video.currentTime=0;}});
  $("previousStep").onclick=()=>advance(-1);$("nextStep").onclick=()=>advance(1);
  $("beatSelect").onchange=()=>{beatIndex=Number($("beatSelect").value);applyBeat();};
  $("frameToggle").onclick=()=>{ change("display.mode",config.display.mode === "eci" ? "relative" : "eci"); applyBeat(false); };
  $("originToggle").onclick=()=>{ sceneOrigin = sceneOrigin === "A" ? "B" : "A"; $("originToggle").textContent = `Origin · Object ${sceneOrigin}`; updateScene(); };
  $("playButton").onclick=togglePlay;
  $("timeSlider").addEventListener("input",event=>{currentHour=config.display.startHour+Number(event.target.value)/1000*(config.display.endHour-config.display.startHour);updateScene();drawCharts();});
  for (const [id,path] of [["distanceThreshold","display.distanceThresholdKm"],["speedThreshold","display.speedThresholdMs"]]) $(id).addEventListener("input",event=>change(path,Number(event.target.value)));
  $("presetSelect").onchange=()=>{ activePreset=$("presetSelect").value;config=clone(doc.presets[activePreset]);config.display={trailThickness:1.8,referenceThickness:1.2,borderThickness:1.1,borderOpacity:.7,borderColor:"#707070",...config.display};currentHour=config.display.startHour;syncControls();recalc();restoreCamera();redrawSceneBorders();$("saveStatus").textContent="Unsaved preset choice"; };
  $("savePreset").onclick=async()=>{const name=prompt("Preset name",doc.presets[activePreset]?.label||"My scenario");if(!name)return;const key=/^[a-z0-9-]+$/.test(activePreset)&&doc.presets[activePreset]?.label===name?activePreset:`custom-${Date.now()}`;doc.presets[key]={...clone(config),label:name};activePreset=key;buildPresets();$("presetSelect").value=key;await saveDoc("Preset saved on this computer");};
  $("saveChapter").onclick=async()=>{doc.chapterOverrides[step().id]=clone(config);doc.chapterPresets[step().id]=activePreset;await saveDoc("Scenario saved for this chapter");};
  $("saveCamera").onclick=async()=>{const {camera,controls}=scene3d;doc.cameraViews[cameraKey()]={mode:config.display.mode,position:camera.position.toArray(),target:controls.target.toArray(),up:camera.up.toArray(),zoom:camera.zoom};await saveDoc("Camera saved for this moment");};
  $("resetCamera").onclick=()=>{delete doc.cameraViews[cameraKey()];customCamera=false;restoreCamera();$("saveStatus").textContent="Camera reset; save the chapter to keep this change";};
  $("inspectorToggle").onclick=()=>{document.body.classList.toggle("inspectorCollapsed");const collapsed=document.body.classList.contains("inspectorCollapsed");$("inspectorToggle").textContent=collapsed?"Show controls":"Hide controls";$("inspectorToggle").setAttribute("aria-expanded",String(!collapsed));setTimeout(resizeScene,20);};
  $("spotButton").onclick=()=>{spotMode=!spotMode;document.body.classList.toggle("spotMode",spotMode);$("spotButton").setAttribute("aria-pressed",spotMode);};
  $("commentsButton").onclick=()=>{$("commentsDrawer").hidden=!$("commentsDrawer").hidden;};$("closeComments").onclick=()=>{$("commentsDrawer").hidden=true;};
  $("archivedToggle").onclick=()=>{showArchived=!showArchived;$("archivedToggle").setAttribute("aria-pressed",String(showArchived));renderComments();};
  $("cancelComment").onclick=()=>{$("commentForm").hidden=true;};
  $("commentForm").onsubmit=async event=>{event.preventDefault();try{const result=await request("/api/presentation-comments",{action:"add",comment:{...draft,text:$("commentText").value.trim()}});comments=result.comments;$("commentForm").hidden=true;$("commentText").value="";spotMode=false;document.body.classList.remove("spotMode");$("spotButton").setAttribute("aria-pressed","false");renderComments();}catch(error){alert(error.message);}};
  $("downloadComments").onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({schema:"presentation-comments-v1",comments},null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="presentation-comments.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  document.addEventListener("click",event=>{if(!spotMode||presentMode)return;const target=event.target.closest("[data-spot]")||event.target.closest("#slide")||event.target.closest("#playback");if(!target||event.target.closest("#commentsDrawer,#reviewBar"))return;event.preventDefault();event.stopPropagation();const rect=target.getBoundingClientRect();draft={stepId:step().id,stepTitle:step().title,element:target.dataset.spot||target.id||"Slide",x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height,atHour:chapter()?currentHour:null};$("commentLocation").textContent=`${step().title} · ${draft.element}`;$("commentsDrawer").hidden=false;$("commentForm").hidden=false;$("commentText").focus();},true);
  window.addEventListener("resize",()=>{resizeScene();openingArt?.resize();drawCharts();placePins();}); window.addEventListener("hashchange",()=>{const index=doc.steps.findIndex(item=>item.id===location.hash.slice(1));if(index>=0){stepIndex=index;beatIndex=0;showStep();}});
}
function togglePlay(){playing=!playing;$("playButton").textContent=playing?"Pause":"Play";}
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
