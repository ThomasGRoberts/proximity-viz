import { episodeDescriptionIcon } from "../../shared/episode-description-icon.js";
/* Shared interactions for the eight episode control panels. */
const isDistance = group => group.id === "distanceChartGroup";
const thresholdSource = group => document.body.className.includes("-shared")
  ? document.getElementById(isDistance(group) ? "distanceThresholdSlider" : "speedThresholdSlider")
  : document.getElementById(isDistance(group) ? "distanceThreshold" : "speedThreshold");

function showThresholdEditor(group, edge) {
  group.querySelector(".thresholdEdit")?.remove();
  const source = thresholdSource(group);
  if (!source) return;
  const editor = document.createElement("label");
  editor.className = "thresholdEdit";
  editor.style.top = edge.style.top;
  editor.setAttribute("aria-label", `${isDistance(group) ? "Separation distance" : "Relative speed"} threshold`);
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.step = isDistance(group) ? "1" : "1";
  input.value = String(Math.round(Number(source.value)));
  const chart = group.querySelector("canvas");
  input.max = String(Math.round(Number(source.max) || Number(chart.dataset.chartMax || 100000) * Number(chart.dataset.chartFactor || 1)));
  editor.append(input, document.createTextNode(isDistance(group) ? "km" : "m/s"));
  group.append(editor);
  let settled = false;
  const close = commit => {
    if (settled) return;
    settled = true;
    if (commit && input.value !== "" && Number.isFinite(Number(input.value))) {
      const value = Math.max(0, Math.min(Number(input.max), Math.round(Number(input.value))));
      source.value = String(value);
      source.dispatchEvent(new Event("input", { bubbles: true }));
    }
    editor.remove();
    edge.focus({ preventScroll: true });
  };
  editor.addEventListener("pointerdown", event => event.stopPropagation());
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); close(true); }
    if (event.key === "Escape") { event.preventDefault(); close(false); }
  });
  input.addEventListener("blur", () => close(true));
  input.focus({ preventScroll: true });
  input.select();
}

function installThresholdEditor(group) {
  const edge = group.querySelector(".thresholdEdge"), chart = group.querySelector("canvas");
  if (!edge || !chart) return;
  let gesture = null;
  edge.title = "Drag to adjust; click to type a value";
  const stop = event => { event.preventDefault(); event.stopImmediatePropagation(); };
  edge.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    stop(event);
    gesture = { id: event.pointerId, y: event.clientY, value: Number(thresholdSource(group)?.value), moved: false };
    edge.setPointerCapture(event.pointerId);
  }, true);
  edge.addEventListener("pointermove", event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    stop(event);
    if (Math.abs(event.clientY - gesture.y) < 3 && !gesture.moved) return;
    gesture.moved = true;
    const source = thresholdSource(group), top = Number(chart.dataset.chartTop), bottom = Number(chart.dataset.chartBottom);
    const max = Number(chart.dataset.chartMax), factor = Number(chart.dataset.chartFactor || 1);
    if (!source || !(bottom > top) || !(max > 0)) return;
    const raw = gesture.value + (gesture.y - event.clientY) / (bottom - top) * max * factor;
    const step = isDistance(group) ? 1 : 1;
    const value = Math.max(0, Math.min(Number(source.max) || max * factor, Math.round(raw / step) * step));
    if (Number(source.value) !== value) {
      source.value = String(value);
      source.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, true);
  edge.addEventListener("pointerup", event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    stop(event);
    const clicked = !gesture.moved;
    gesture = null;
    if (edge.hasPointerCapture(event.pointerId)) edge.releasePointerCapture(event.pointerId);
    if (clicked) showThresholdEditor(group, edge);
  }, true);
  edge.addEventListener("pointercancel", event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    stop(event);
    gesture = null;
  }, true);
  edge.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    showThresholdEditor(group, edge);
  });
}

function installBandTooltip(group) {
  const canvas = group.querySelector("canvas");
  if (!canvas) return;
  const tooltip = document.createElement("div");
  tooltip.className = "chartBandTip";
  tooltip.hidden = true;
  tooltip.setAttribute("role", "tooltip");
  group.append(tooltip);
  const distance = isDistance(group);
  const message = () => {
    const gold = document.createElement("strong"), gray = document.createElement("strong");
    gold.className = "both"; gold.textContent = "gold";
    gray.className = "single"; gray.textContent = "gray";
    tooltip.replaceChildren("Periods in ", gold, " represent dwell time. Periods in ", gray,
      ` represent periods when only the ${distance ? "separation distance" : "relative speed"} threshold is met.`);
  };
  message();
  canvas.addEventListener("pointermove", event => {
    const bandY = Number(canvas.dataset.bandY), bandEndY = Number(canvas.dataset.bandEndY || bandY + 5);
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    if (!Number.isFinite(bandY) || y < bandY - 3 || y > bandEndY + 3 || x < 0 || x >= rect.width) { tooltip.hidden = true; return; }
    const pixelX = Math.max(0, Math.min(canvas.width - 1, Math.round(x * canvas.width / rect.width)));
    const pixelY = Math.max(0, Math.min(canvas.height - 1, Math.round(y * canvas.height / rect.height)));
    let pixel;
    try { pixel = canvas.getContext("2d").getImageData(pixelX, pixelY, 1, 1).data; }
    catch { tooltip.hidden = true; return; }
    const gold = Math.abs(pixel[0] - 234) < 30 && Math.abs(pixel[1] - 170) < 30 && pixel[2] < 45;
    const gray = Math.abs(pixel[0] - 169) < 25 && Math.abs(pixel[1] - 169) < 25 && Math.abs(pixel[2] - 169) < 25;
    tooltip.hidden = !gold && !gray;
    // The same explanation works on both markings, preserving their colors.
  });
  canvas.addEventListener("pointerleave", () => { tooltip.hidden = true; });
}

function fitMinimumLines(minima) {
  for (const host of minima) {
    const lines = host.querySelectorAll(".e002-minimum-line");
    for (const line of lines.length ? lines : [host]) {
      let size = 9;
      line.style.fontSize = `${size}px`;
      while (line.clientWidth && line.scrollWidth > line.clientWidth + 1 && size > 7) {
        size -= .25;
        line.style.fontSize = `${size}px`;
      }
    }
  }
}
export function installPanelEnhancements() {
  const area = document.getElementById("metricArea");
  if (!area || area.dataset.enhanced) return;
  area.dataset.enhanced = "1";
  for (const id of ["distanceChartGroup", "speedChartGroup"]) {
    const group = document.getElementById(id);
    if (group) { installThresholdEditor(group); installBandTooltip(group); }
  }
  const minima = [document.getElementById("distanceMinimum"), document.getElementById("speedMinimum")].filter(Boolean);
  const scheduleFit = () => requestAnimationFrame(() => fitMinimumLines(minima));
  for (const host of minima) new MutationObserver(scheduleFit).observe(host, { childList: true, characterData: true, subtree: true });
  new ResizeObserver(scheduleFit).observe(document.getElementById("ui"));
  scheduleFit();
}

export function installEpisodeDescriptionToggle(description) {
  if (!description || description.dataset.toggleInstalled) return null;
  description.dataset.toggleInstalled = "1";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "episode-story-toggle episode-info-toggle";
  toggle.setAttribute("aria-controls", description.id);
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Show episode description");
  toggle.title = "Show episode description";
  toggle.hidden = true;
  toggle.innerHTML = '<span class="episode-info-glyph" aria-hidden="true">i</span>';
  description.before(toggle);
  description.classList.add("story-collapsed");
  const header = description.closest(".episodeHeader");
  const placeInFocus = () => {
    const focus = header?.querySelector(".episode-focus");
    if (!focus) return false;
    focus.append(description, toggle);
    return true;
  };
  if (!placeInFocus() && header) {
    const observer = new MutationObserver(() => { if (placeInFocus()) observer.disconnect(); });
    observer.observe(header, { childList: true, subtree: true });
  }
  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.setAttribute("aria-label", expanded ? "Hide episode description" : "Show episode description");
    toggle.title = expanded ? "Hide episode description" : "Show episode description";
    toggle.querySelector(".episode-info-glyph").textContent = expanded ? "×" : "i";
    description.classList.toggle("story-collapsed", !expanded);
    description.classList.toggle("story-expanded", expanded);
  });
  return toggle;
}

installPanelEnhancements();
