/* E-002 development adapter: the E-001 page supplies the panel, charts,
   thresholds, and playback; the vetted E-002 scene supplies orbital states. */
import { spaceTrackHistoryUrl } from "../../shared/tle-provenance.js?v=2";

const $ = id => document.getElementById(id);
const episode = await fetch(new URL("../dev/e002/episode.json", import.meta.url)).then(response => response.json());
const names = Object.fromEntries(episode.participants.map(item => [item.slot, item.name]));
const cospar = Object.fromEntries(episode.participants.map(item => [item.slot, item.cospar]));
const norad = Object.fromEntries(episode.participants.map(item => [item.slot, item.norad]));
const pairs = episode.pairOptions;
let pair = pairs[0], series = [], lastWindow = "", lastPair = "";
const icon = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M7.25 4.25H4.5A1.75 1.75 0 0 0 2.75 6v7.5a1.75 1.75 0 0 0 1.75 1.75H12a1.75 1.75 0 0 0 1.75-1.75v-2.75"/><path d="M9.25 2.75h6v6M8 10l7.25-7.25"/></svg>';
const formatTime = ms => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(new Date(ms)) + " UTC";
const sourceLabel = tle => tle?.source === "space-track" ? "Space-Track.org" : tle ? "Amateur observers" : "No nearby element";

document.body.classList.add("e002-shared");
document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="episode-e002.css?v=3">');
const scene = document.createElement("div"); scene.id = "scene"; document.body.prepend(scene);
const labels = document.createElement("div"); labels.id = "labels"; document.body.append(labels);
const scaffold = document.createElement("div"); scaffold.className = "e002-player-scaffold";
for (const id of ["play", "timeline", "frameMode", "autoFrame", "timestamp", "startLabel", "endLabel", "coverageRows"]) {
  const element = document.createElement(["play", "frameMode", "autoFrame"].includes(id) ? "button" : id === "timeline" ? "input" : "div");
  element.id = id; if (id === "timeline") element.type = "range"; scaffold.append(element);
}
document.body.append(scaffold);
const status = document.createElement("div"); status.id = "sceneStatus"; status.className = "e002-scene-status"; status.textContent = "Loading E-002 dated elements…"; document.body.append(status);
const note = $("dataStatusSection"); note.hidden = false;
note.replaceChildren();
const windowLabel = document.createElement("label"); windowLabel.textContent = "Supported reconstruction window";
const moment = document.createElement("select"); moment.id = "moment"; windowLabel.append(moment);
const momentNote = document.createElement("p"); momentNote.id = "momentNote"; momentNote.className = "methodNote";
const pairLabel = document.createElement("label"); pairLabel.textContent = "Statistics for pair";
const pairSelect = document.createElement("select"); pairSelect.id = "e002Pair";
for (const [first, second] of pairs) { const option = document.createElement("option"); option.value = `${first}-${second}`; option.textContent = `${names[first]} / ${names[second]}`; pairSelect.append(option); }
pairLabel.append(pairSelect);
const periodNote = document.createElement("p"); periodNote.className = "methodNote"; periodNote.textContent = "Historical episode: November 2019–February 2020. Charts cover only the selected short reconstruction window.";
note.append(windowLabel, momentNote, pairLabel, periodNote);
$("episodeTitle").textContent = `${episode.episodeId} · ${episode.title}`;
$("viewNote").textContent = "Development reconstruction · Dated elements are propagated with SGP4; separation and speed are estimates, not measured encounters.";
$("separationTitle").hidden = false;
$("thresholdRangeNote").textContent = "Sampled dwell is reported only for the selected supported window and selected pair.";
$("dwellLabel").textContent = "Sampled dwell in window";

for (const slot of ["A", "B", "C"]) {
  const card = document.createElement("details"); card.className = "satCard"; card.dataset.slot = slot; card.dataset.cospar = cospar[slot];
  const summary = document.createElement("summary"); summary.className = "satCardName";
  const dot = document.createElement("span"); dot.className = `sourceDot slot${slot}`;
  const name = document.createElement("span"); name.className = "satName"; name.textContent = names[slot];
  const source = document.createElement("span"); source.className = "sourceSummary"; source.textContent = "Data Source: CelesTrak SATCAT"; source.insertAdjacentHTML("beforeend", icon);
  const chevron = document.createElement("span"); chevron.className = "satChevron"; chevron.setAttribute("aria-hidden", "true"); chevron.innerHTML = '<span class="disclosureGlyph">‹</span>';
  summary.append(dot, name, source, chevron);
  const metadata = document.createElement("div"); metadata.className = "satMetaDetails";
  card.append(summary, metadata); $("identity").append(card);
}
$("nowSummary").textContent = "Three spacecraft";

const { episodeModel: model } = await import("../dev/e002/player.js?v=13");
function validSample(ms) {
  // The 36-hour display gate admits geometry; statistics need both elements
  // within the stricter 12-hour gate, including the A/C deployment window.
  if (pair.some(slot => Math.abs(ms - Date.parse(model.selected[slot]?.epoch)) > episode.maximumStatisticTleAgeHours * 3600000)) return null;
  return model.samplePair(...pair, ms);
}
function updateCards() {
  for (const slot of ["A", "B", "C"]) {
    const card = $("identity").querySelector(`[data-slot="${slot}"]`), tle = model.selected[slot];
    card.dataset.norad = norad[slot]; card.dataset.epoch = tle?.epoch || "";
    const ageHours = tle ? Math.floor(Math.abs(model.current - Date.parse(tle.epoch)) / 3600000) : 0;
    const days = Math.floor(ageHours / 24), hours = ageHours % 24;
    const amount = days ? `${days} ${days === 1 ? "day" : "days"}${hours ? ` ${hours} ${hours === 1 ? "hour" : "hours"}` : ""}` : `${ageHours} ${ageHours === 1 ? "hour" : "hours"}`;
    card.dataset.tleAge = tle ? `${amount} ${model.current >= Date.parse(tle.epoch) ? "after" : "before"} epoch` : "Unavailable";
    card.dataset.tleLine2 = tle?.line2 || "";
    card.dataset.sourceData = sourceLabel(tle);
    card.dataset.sourceQueryHref = tle?.source === "space-track" ? spaceTrackHistoryUrl(norad[slot], tle.epoch) : "";
    card.dataset.sourceHref = tle?.sourceUrl || "";
    card.dispatchEvent(new Event("tlechange", { bubbles: true }));
    const age = card.querySelector(".tleAgeValue"); if (age && age.textContent !== card.dataset.tleAge) age.textContent = card.dataset.tleAge;
  }
}
function buildSeries() {
  const start = Date.parse(model.window.start), end = Date.parse(model.window.end);
  series = []; for (let ms = start; ms <= end; ms += 60000) series.push({ ms, ...validSample(ms) });
  if (series.at(-1).ms !== end) series.push({ ms: end, ...validSample(end) });
  const valid = series.filter(item => Number.isFinite(item.distanceKm) && Number.isFinite(item.speedMs));
  const enough = valid.length >= 2;
  for (const [id, key, unit] of [["distanceMinimum", "distanceKm", "km"], ["speedMinimum", "speedMs", "m/s"]]) {
    const node = $(id); node.replaceChildren();
    if (!enough) { node.textContent = "Unavailable for this pair and window"; continue; }
    const minimum = valid.reduce((best, item) => item[key] < best[key] ? item : best, valid[0]);
    node.append(document.createTextNode(`Minimum sampled in this window: ${minimum[key].toFixed(1)} ${unit} on `));
    const jump = document.createElement("a"); jump.href = "#"; jump.textContent = formatTime(minimum.ms); jump.title = "Jump playback to this sampled time";
    jump.addEventListener("click", event => { event.preventDefault(); model.setTime(minimum.ms); }); node.append(jump);
  }
  updateCharts();
}
function drawChart(id, key, threshold, current) {
  const canvas = $(id), context = canvas.getContext("2d"), width = Math.max(200, canvas.clientWidth), height = Math.max(90, canvas.clientHeight);
  const ratio = devicePixelRatio || 1; canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height); context.fillStyle = "#fff"; context.fillRect(0, 0, width, height);
  const left = 36, right = width - 6, top = 8, bottom = height - 20;
  context.strokeStyle = "#e6e6e6"; context.lineWidth = 1; context.beginPath(); context.moveTo(left, bottom); context.lineTo(right, bottom); context.stroke();
  const valid = series.filter(item => Number.isFinite(item[key]));
  if (valid.length < 2) { context.fillStyle = "#999"; context.font = "11px sans-serif"; context.fillText("Unavailable in this window", left + 5, (top + bottom) / 2); return; }
  const start = Date.parse(model.window.start), end = Date.parse(model.window.end);
  const max = Math.max(threshold * 1.2, ...valid.map(item => item[key])) * 1.08;
  const x = ms => left + (ms - start) / (end - start) * (right - left), y = value => bottom - value / max * (bottom - top);
  context.setLineDash([3, 3]); context.strokeStyle = "#b8a875"; context.beginPath(); context.moveTo(left, y(threshold)); context.lineTo(right, y(threshold)); context.stroke(); context.setLineDash([]);
  context.strokeStyle = key === "distanceKm" ? "#c39722" : "#767676"; context.lineWidth = 1.6; context.beginPath();
  let drawing = false; series.forEach(item => { if (!Number.isFinite(item[key])) { drawing = false; return; } if (drawing) context.lineTo(x(item.ms), y(item[key])); else context.moveTo(x(item.ms), y(item[key])); drawing = true; }); context.stroke();
  context.fillStyle = "#777"; context.font = "9px sans-serif"; context.fillText("0", 18, bottom + 2); context.fillText(Math.round(max).toLocaleString(), 3, top + 6);
  context.fillStyle = "#666"; context.fillText(formatTime(start).replace(" UTC", ""), left, height - 5);
  context.textAlign = "right"; context.fillText(formatTime(end).replace(" UTC", ""), right, height - 5); context.textAlign = "left";
  context.strokeStyle = "#555"; context.beginPath(); context.moveTo(x(current), top); context.lineTo(x(current), bottom); context.stroke();
}
function updateCharts() {
  drawChart("separationChart", "distanceKm", Number($("distanceThresholdSlider").value), model.current);
  drawChart("speedChart", "speedMs", Number($("speedThresholdSlider").value), model.current);
  const distance = Number($("distanceThresholdSlider").value), speed = Number($("speedThresholdSlider").value);
  $("distanceThresholdOutput").textContent = `${distance} km`; $("speedThresholdOutput").textContent = `${speed} m/s`;
  $("thresholdSummary").textContent = `${distance} km · ${speed} m/s`;
  const valid = series.filter(item => Number.isFinite(item.distanceKm) && Number.isFinite(item.speedMs));
  const qualifying = valid.filter(item => item.distanceKm <= distance && item.speedMs <= speed);
  $("dwellStat").textContent = valid.length < 2 ? "—" : String(qualifying.length);
  $("dwellUnit").textContent = "sampled min";
  $("dwellMetric").querySelector(".dwellKey").textContent = "One-minute samples meeting both thresholds in this supported window. This is an approximate duration.";
}
function tick() {
  if (!model.ready) { setTimeout(tick, 250); return; }
  const key = `${model.window.id}:${pair.join("")}`;
  if (key !== lastWindow + ":" + lastPair) { lastWindow = model.window.id; lastPair = pair.join(""); buildSeries(); }
  const start = Date.parse(model.window.start), end = Date.parse(model.window.end), current = model.current;
  const slider = $("timelineSlider"); slider.min = String(start); slider.max = String(end); slider.value = String(current); slider.step = "1000";
  $("sliderNow").textContent = formatTime(current); $("timeDisplay").textContent = formatTime(current);
  const currentValue = validSample(current);
  $("rangeStat").textContent = currentValue ? `${currentValue.distanceKm.toFixed(1)} km` : "Unavailable";
  $("speedStat").textContent = currentValue ? `${currentValue.speedMs.toFixed(1)} m/s` : "Unavailable";
  $("playBtn").setAttribute("aria-label", model.playing ? "Pause" : "Play");
  updateCards(); updateCharts(); setTimeout(tick, 500);
}
pairSelect.addEventListener("change", () => { pair = pairSelect.value.split("-"); $("separationTitle").textContent = `Separation between ${pair[0]} and ${pair[1]}`; buildSeries(); });
for (const id of ["distanceThresholdSlider", "speedThresholdSlider"]) $(id).addEventListener("input", updateCharts);
$("timelineSlider").addEventListener("input", event => model.setTime(Number(event.target.value)));
$("playBtn").addEventListener("click", () => model.setPlaying(!model.playing));
$("modeBtn").addEventListener("click", () => model.toggleFrame());
$("resetBtn").hidden = false; $("resetBtn").addEventListener("click", () => model.resetCamera());
$("zoomInBtn").addEventListener("click", () => model.zoom(1.12));
$("zoomOutBtn").addEventListener("click", () => model.zoom(1 / 1.12));
$("speedDownBtn").hidden = $("speedUpBtn").hidden = true;
$("cameraControls").append(makeCameraEditor(model));
tick();

function makeCameraEditor(model) {
  const button = document.createElement("button"); button.className = "cameraBtn e002-dev-toggle"; button.type = "button"; button.textContent = "◧"; button.title = "Camera keyframes · development";
  if (new URLSearchParams(location.search).get("dev") !== "1") { button.hidden = true; return button; }
  const panel = $("cameraDevTools"); panel.replaceChildren(); panel.classList.add("e002-camera-editor");
  const heading = document.createElement("strong"); heading.textContent = "Camera keyframes · E-002 development";
  const name = document.createElement("input"); name.placeholder = "Keyframe name"; name.value = "New view";
  const time = document.createElement("input"); time.type = "datetime-local"; time.step = "60";
  const frame = document.createElement("select"); for (const mode of ["inertial", "relative"]) { const option = document.createElement("option"); option.value = mode; option.textContent = `${mode} reference`; frame.append(option); }
  const presets = document.createElement("select"); presets.setAttribute("aria-label", "Saved camera preset");
  const playback = document.createElement("button"); playback.textContent = "Pause / play";
  const save = document.createElement("button"); save.textContent = "Capture keyframe";
  const preview = document.createElement("button"); preview.textContent = "Preview saved view";
  const restore = document.createElement("button"); restore.textContent = "Restore auto camera";
  const exportButton = document.createElement("button"); exportButton.textContent = "Export JSON";
  const message = document.createElement("p"); message.className = "methodNote"; message.textContent = "Drag to orbit; scroll to zoom. Captures include the episode and UTC time.";
  const saved = JSON.parse(localStorage.getItem("espl-e002-camera-keyframes") || "[]");
  function refresh() { presets.replaceChildren(); for (const [index, view] of saved.entries()) { const option = document.createElement("option"); option.value = String(index); option.textContent = `${view.name} · ${view.momentId}`; presets.append(option); } }
  refresh();
  fetch(new URL("../dev/e002/camera-examples.json", import.meta.url)).then(response => response.json()).then(data => {
    saved.unshift(...data.views.filter(view => model.windows.some(window => window.id === view.momentId)).map(view => ({
      ...view, episodeId: "E-002", timestampUtc: view.timestamp, frameMode: "inertial", up: [0,1,0]
    })));
    refresh();
  }).catch(() => {});
  button.addEventListener("click", () => { panel.hidden = !panel.hidden; if (!panel.hidden) { model.setPlaying(false); time.value = new Date(model.current).toISOString().slice(0,16); frame.value = model.frameMode; } });
  time.addEventListener("change", () => model.setTime(Date.parse(`${time.value}:00Z`)));
  frame.addEventListener("change", () => { if (frame.value !== model.frameMode) model.toggleFrame(); });
  playback.addEventListener("click", () => model.setPlaying(!model.playing));
  save.addEventListener("click", () => { const view = model.captureCamera(name.value.trim() || "Untitled view"); saved.push(view); localStorage.setItem("espl-e002-camera-keyframes", JSON.stringify(saved.filter(item => !item.coordinateFrame))); refresh(); presets.value = String(saved.length - 1); message.textContent = `Captured ${view.name} at ${view.timestampUtc}.`; });
  preview.addEventListener("click", () => { const view = saved[Number(presets.value)]; if (!view) return; model.selectWindow(view.momentId); model.setTime(Date.parse(view.timestampUtc)); model.previewCameraTransition(view); message.textContent = `Previewing transition to ${view.name}.`; });
  restore.addEventListener("click", () => model.resetCamera());
  exportButton.addEventListener("click", () => { const url = URL.createObjectURL(new Blob([JSON.stringify({ episodeId: "E-002", views: saved }, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = "e002-camera-keyframes.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
  panel.append(heading, name, time, frame, playback, presets, save, preview, restore, exportButton, message);
  return button;
}
