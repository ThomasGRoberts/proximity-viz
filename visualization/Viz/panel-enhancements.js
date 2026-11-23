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

// SBI's disclosure tab remains outside the scrolling panel so it is usable
// after the panel is hidden. E-002 has the same tab in its own panel shell.
if (!document.body.classList.contains("e002-shared") && !document.getElementById("episodePanelToggle")) {
  const button = document.createElement("button");
  button.id = "episodePanelToggle";
  button.type = "button";
  button.setAttribute("aria-controls", "ui");
  button.setAttribute("aria-expanded", "true");
  button.setAttribute("aria-label", "Hide control panel");
  button.title = "Hide control panel";
  button.textContent = "‹";
  const panel = document.getElementById("ui");
  const placeButton = () => {
    if (!panel) return;
    const sticky = panel.querySelector('#e001PairSticky');
    button.style.top = `${panel.offsetTop + (sticky && !sticky.hidden ? sticky.offsetHeight - 1 : 32)}px`;
    button.style.left = document.body.classList.contains("episode-panel-collapsed") ? "0px" : `${panel.offsetLeft + panel.offsetWidth - 1}px`;
  };
  button.addEventListener("click", () => {
    const collapsed = document.body.classList.toggle("episode-panel-collapsed");
    button.setAttribute("aria-expanded", String(!collapsed));
    button.setAttribute("aria-label", collapsed ? "Show control panel" : "Hide control panel");
    button.title = collapsed ? "Show control panel" : "Hide control panel";
    button.textContent = collapsed ? "›" : "‹";
    if (collapsed) button.style.left = "0px";
    else placeButton();
  });
  document.body.append(button);
  requestAnimationFrame(placeButton);
  window.addEventListener("resize", placeButton);
  new ResizeObserver(placeButton).observe(panel);
  new MutationObserver(placeButton).observe(document.body, { attributes: true, attributeFilter: ["class"] });
}

// Keep the chapter-length explanation current when a chapter changes. Each
// episode renderer owns its thresholds; this layer only updates the prose.
const dwellKey = document.querySelector('#dwellMetric .dwellKey');
const timeline = document.getElementById('timelineSlider');
if (dwellKey && timeline) {
  const refreshDwellCopy = () => {
    const hours = (Number(timeline.max) - Number(timeline.min)) / 3600000;
    if (!(hours >= .25)) return;
    const rounded = Math.round(hours * 10) / 10;
    const duration = Number.isInteger(rounded / 168) && rounded >= 168 ? `${rounded / 168}-week`
      : Number.isInteger(rounded / 24) && rounded >= 48 ? `${rounded / 24}-day` : `${rounded}-hour`;
    const copy = `The dwell time cannot exceed the ${duration} duration of this chapter, and is a function of the selected separation distance and relative speed thresholds. These thresholds can be adjusted on the charts above.`;
    // Compare the full text: glossary wrappers may split it into several nodes.
    if (dwellKey.textContent !== copy) dwellKey.replaceChildren(copy);
  };
  new MutationObserver(refreshDwellCopy).observe(dwellKey, { childList: true });
  new MutationObserver(refreshDwellCopy).observe(timeline, { attributes: true, attributeFilter: ['min', 'max'] });
  refreshDwellCopy();
}

// Mobile episodes keep the selected pair visible above the full-width globe.
if (!document.documentElement.classList.contains('mini-scene')) {
  const header = document.createElement('div');
  header.id = 'mobileEpisodeHeader';
  header.setAttribute('aria-label', 'Current episode and spacecraft');
  header.innerHTML = '<span class="mobile-episode-intro">Current Episode:</span><span class="mobile-episode-pair"><span class="mobile-episode-name mobile-chaser-choice"><i class="mobile-dot chaser"></i><b class="mobile-chaser"></b></span><span>+</span><span class="mobile-episode-name mobile-target-choice"><i class="mobile-dot target"></i><b class="mobile-target"></b></span></span><div class="mobile-episode-menu" hidden></div>';
  document.body.append(header);
  const identity = document.getElementById('identity');
  const menu = header.querySelector('.mobile-episode-menu');
  const chaserChoice = header.querySelector('.mobile-chaser-choice');
  const targetChoice = header.querySelector('.mobile-target-choice');
  let selectedMobileSlot = 'A';
  const closeMenu = () => { menu.hidden = true; header.querySelector('[aria-expanded]')?.setAttribute('aria-expanded', 'false'); };
  document.addEventListener('click', event => { if (!header.contains(event.target)) closeMenu(); });
  const refreshMobileHeader = () => {
    const cards = [...(identity?.querySelectorAll('.satCard[data-slot]') || [])];
    const names = Object.fromEntries(cards.map(card => [card.dataset.slot, card.querySelector('.satName')?.textContent?.trim()]).filter(([, name]) => name));
    const threeObjects = cards.length > 2;
    const alternateTargets = document.body.classList.contains('e005-shared');
    const switchable = alternateTargets ? targetChoice : chaserChoice;
    const fixed = alternateTargets ? chaserChoice : targetChoice;
    const choices = alternateTargets ? ['B', 'C'] : ['A', 'C'];
    const activeButton = identity?.querySelector('.e005-chaser-options button.active');
    if (threeObjects) {
      if (alternateTargets) selectedMobileSlot = activeButton?.dataset.slot || (selectedMobileSlot === 'A' ? 'B' : selectedMobileSlot);
      else selectedMobileSlot = window.__e002EpisodeModel?.activeChaser || selectedMobileSlot;
    }
    const chaser = alternateTargets ? names.A : threeObjects ? names[selectedMobileSlot] : names.A;
    const target = alternateTargets ? names[selectedMobileSlot] : names.B;
    header.querySelector('.mobile-chaser').textContent = chaser || document.getElementById('nameA')?.textContent?.trim() || 'Chaser';
    header.querySelector('.mobile-target').textContent = target || document.getElementById('nameB')?.textContent?.trim() || 'Target';
    fixed.classList.remove('is-switchable'); fixed.removeAttribute('role'); fixed.removeAttribute('tabindex'); fixed.removeAttribute('aria-expanded');
    switchable.classList.toggle('is-switchable', threeObjects);
    if (threeObjects) { switchable.setAttribute('role', 'button'); switchable.tabIndex = 0; switchable.setAttribute('aria-expanded', String(!menu.hidden)); }
    else { switchable.removeAttribute('role'); switchable.removeAttribute('tabindex'); switchable.removeAttribute('aria-expanded'); closeMenu(); }
    const key = `${alternateTargets ? 'target' : 'chaser'}:${choices.map(slot => `${slot}:${names[slot]}`).join('|')}`;
    if (threeObjects && menu.dataset.key !== key) {
      menu.dataset.key = key; menu.replaceChildren();
      for (const slot of choices) {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.slot = slot; button.textContent = names[slot] || `Object ${slot}`;
        button.addEventListener('click', () => {
          selectedMobileSlot = slot; closeMenu();
          if (alternateTargets) identity?.querySelector(`.e005-chaser-options button[data-slot="${slot}"]`)?.click();
          else window.__e002EpisodeModel?.setActiveChaser(slot);
          refreshMobileHeader();
        });
        menu.append(button);
      }
    }
    [...menu.children].forEach(button => button.setAttribute('aria-pressed', String(button.dataset.slot === selectedMobileSlot)));
  };
  header.addEventListener('click', event => {
    const choice = event.target.closest('.mobile-episode-name.is-switchable');
    if (!choice || event.target.closest('.mobile-episode-menu')) return;
    menu.hidden = !menu.hidden; choice.setAttribute('aria-expanded', String(!menu.hidden));
  });
  header.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.mobile-episode-name.is-switchable')) { event.preventDefault(); event.target.click(); }
    if (event.key === 'Escape') closeMenu();
  });
  refreshMobileHeader();
  if (identity) {
    const loadingNames = new MutationObserver(refreshMobileHeader);
    loadingNames.observe(identity, {childList:true, subtree:true});
    identity.addEventListener('click', () => setTimeout(refreshMobileHeader, 0));
  }
}
