// A guided, local-only tour of every chapter, chaser, and relative-frame origin.
// The playback bar supplies every intervening minute; stops invite camera examples.
const STORAGE_KEY = "espl-e002-camera-workshop-v2";
const $ = id => document.getElementById(id);
const utc = ms => new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC", month: "short", day: "numeric", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false,
}).format(new Date(ms)) + " UTC";

export function createCameraWorkshop({ windows, names, seekRoute, setMinute, pausePlayback, useLearnedPath, saveView, getViews, beforeOpen }) {
  const routes = windows.flatMap(window => ["A", "C"].flatMap(slot => ["target", "chaser"].map(reference => ({ window, slot, reference }))));
  const duration = route => Math.round((Date.parse(route.window.end) - Date.parse(route.window.start)) / 60000);
  const allowedIntervals = ["key", 60, 120, 360];
  let interval = "key", cursor = { route: 0, minute: 0 }, active = false, busy = false, playing = false, frame = null;
  const saved = (() => {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      const data = JSON.parse(current || localStorage.getItem("espl-e002-camera-workshop-v1") || "null");
      if (!data || !Number.isInteger(data.route) || data.route < 0 || data.route >= routes.length || !Number.isFinite(data.minute)) return null;
      return { route: data.route, minute: Math.max(0, Math.min(duration(routes[data.route]), data.minute)), interval: current && allowedIntervals.includes(data.interval) ? data.interval : "key" };
    } catch { return null; }
  })();
  if (saved) { cursor = { route: saved.route, minute: saved.minute }; interval = saved.interval; }
  $("workshopInterval").value = String(interval);

  const routeName = route => `${route.window.chapterShort || route.window.id} · ${names[route.slot]} · ${route.reference === "target" ? names.B : names[route.slot]} centered`;
  const routeSelect = $("workshopRouteSelect");
  routes.forEach((route, index) => {
    const option = document.createElement("option"); option.value = String(index); option.textContent = routeName(route); routeSelect.append(option);
  });

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cursor, interval })); } catch { /* The tour still works without storage. */ }
  }
  function status(text) { $("workshopStatus").textContent = text; }
  function stopPlaying() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null; playing = false; busy = false;
  }
  function stops(route) {
    const end = duration(route), start = Date.parse(route.window.start);
    if (interval !== "key") {
      const minutes = [];
      for (let minute = 0; minute < end; minute += interval) minutes.push(minute);
      minutes.push(end); return minutes;
    }
    const minutes = [0, Math.round((Date.parse(route.window.anchor || route.window.start) - start) / 60000), end];
    const views = getViews().filter(view => view.windowId === route.window.id && view.selected === route.slot && view.referenceMode === route.reference)
      .sort((a, b) => Date.parse(a.timeUtc) - Date.parse(b.timeUtc));
    for (let index = 1; index < views.length; index++) if (views[index].mode !== views[index - 1].mode) {
      minutes.push(Math.round((Date.parse(views[index].timeUtc) - start) / 60000));
    }
    return [...new Set(minutes.map(minute => Math.max(0, Math.min(end, minute))))].sort((a, b) => a - b);
  }
  function coverage() {
    const views = getViews();
    let covered = 0, total = 0;
    for (const route of routes) {
      const reviewMinutes = stops(route), start = Date.parse(route.window.start);
      const matches = views.filter(view => view.windowId === route.window.id && view.selected === route.slot && view.referenceMode === route.reference);
      for (const minute of reviewMinutes) {
        total++;
        if (matches.some(view => Math.abs(Date.parse(view.timeUtc) - (start + minute * 60000)) <= (interval === "key" ? 60 : interval / 2) * 60000)) covered++;
      }
    }
    return { covered, total };
  }
  function render() {
    const route = routes[cursor.route], end = duration(route);
    $("cameraWorkshop").classList.toggle("has-started", active);
    $("workshopRoute").textContent = `Run ${cursor.route + 1} of ${routes.length} · ${routeName(route)}`;
    $("workshopTime").textContent = `${utc(Date.parse(route.window.start) + cursor.minute * 60000)} · ${Math.floor(cursor.minute)} of ${end} minutes`;
    const { covered, total } = coverage();
    const adjusted = getViews().filter(view => view.auto === false).length;
    $("workshopProgress").textContent = `${adjusted} adjusted camera views · ${total} optional review stops`;
    $("workshopProgress").title = `${covered} stops have a saved view within the review window`;
    $("workshopMinute").max = String(end);
    $("workshopMinute").value = String(Math.floor(cursor.minute));
    routeSelect.value = String(cursor.route);
    $("workshopPrevious").disabled = !active || busy || (cursor.route === 0 && cursor.minute === 0);
    for (const id of ["workshopNext", "workshopPlayRun", "workshopSavePlay", "workshopMinute", "workshopRouteSelect", "workshopInterval"]) $(id).disabled = !active || busy;
    $("workshopPlay").disabled = !active || (busy && !playing);
    $("workshopStart").disabled = busy;
    $("workshopResume").disabled = busy || (!active && !saved && !localStorage.getItem(STORAGE_KEY));
    $("workshopPlay").textContent = playing ? "Pause here" : "Play to next stop";
  }
  function open() {
    beforeOpen?.();
    $("cameraWorkshop").hidden = false;
    $("workshopToggle").setAttribute("aria-expanded", "true");
    document.body.classList.add("workshop-open");
    render();
  }
  function close() {
    stopPlaying(); pausePlayback();
    $("cameraWorkshop").hidden = true;
    $("workshopToggle").setAttribute("aria-expanded", "false");
    document.body.classList.remove("workshop-open");
  }
  async function seek(next, forceRoute = false) {
    if (busy) return;
    stopPlaying(); pausePlayback(); busy = true; render();
    const route = routes[next.route], minute = Math.max(0, Math.min(duration(route), next.minute));
    status("Moving to the next camera review point…");
    try {
      if (forceRoute || !active || next.route !== cursor.route) await seekRoute(route, minute);
      else setMinute(minute, true);
      cursor = { route: next.route, minute }; active = true; persist();
      status("Watch the learned path. Adjust and save only where the framing needs correction; Play whole run continues without stops.");
    } catch (error) { status(`Could not open this view: ${error.message}`); }
    finally { busy = false; render(); }
  }
  function nextCursor() {
    const route = routes[cursor.route], end = duration(route);
    const next = stops(route).find(minute => minute > cursor.minute + .001);
    if (next !== undefined) return { route: cursor.route, minute: next };
    return cursor.route < routes.length - 1 ? { route: cursor.route + 1, minute: 0 } : null;
  }
  function previousCursor() {
    if (cursor.minute > 0) return { route: cursor.route, minute: stops(routes[cursor.route]).filter(minute => minute < cursor.minute - .001).at(-1) ?? 0 };
    return cursor.route > 0 ? { route: cursor.route - 1, minute: duration(routes[cursor.route - 1]) } : null;
  }
  async function playToNext(fullRun = false) {
    if (!active || busy) return;
    const next = fullRun ? { route: cursor.route, minute: duration(routes[cursor.route]) } : nextCursor();
    if (!next) { status("All chapter and camera configurations are complete. You can revisit any run with the configuration menu."); return; }
    if (next.route === cursor.route && next.minute <= cursor.minute) { status("This run is complete. Choose another configuration or Skip to next."); return; }
    if (next.route !== cursor.route) { await seek(next, true); return; }
    pausePlayback(); useLearnedPath();
    playing = true; busy = true; status(fullRun ? "Playing this entire configuration. Choose Pause here at any moment to save an angle." : "Playing the full interval to the next review point…"); render();
    let previous = 0, lastPaint = 0;
    const tick = now => {
      if (!playing) return;
      if (previous) cursor.minute = Math.min(next.minute, cursor.minute + Math.min(100, now - previous) * 20 / 1000);
      previous = now;
      const reached = cursor.minute >= next.minute;
      setMinute(cursor.minute, reached || now - lastPaint > 100);
      if (reached || now - lastPaint > 100) { render(); lastPaint = now; }
      if (reached) {
        stopPlaying(); cursor = next; persist(); render();
        status(fullRun ? "End of this run. Save only if this view needs a correction, or choose the next configuration." : "Review point reached. Save a correction if needed, or continue.");
      } else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }

  $("workshopToggle").disabled = false;
  $("workshopToggle").addEventListener("click", () => $("cameraWorkshop").hidden ? open() : close());
  $("workshopClose").addEventListener("click", close);
  $("workshopStart").addEventListener("click", () => void seek({ route: 0, minute: 0 }, true));
  $("workshopResume").addEventListener("click", () => void seek({ ...cursor }, true));
  $("workshopPrevious").addEventListener("click", () => { const previous = previousCursor(); if (previous) void seek(previous); });
  $("workshopNext").addEventListener("click", () => { const next = nextCursor(); if (next) void seek(next); else status("All configurations complete."); });
  $("workshopPlay").addEventListener("click", () => {
    if (playing) {
      stopPlaying(); setMinute(cursor.minute, true); persist(); render();
      status("Paused at this minute. Save a camera correction if needed, then continue.");
    } else void playToNext();
  });
  $("workshopPlayRun").addEventListener("click", () => void playToNext(true));
  $("workshopSavePlay").addEventListener("click", async () => {
    if (!active || busy) return;
    busy = true; render();
    const success = await saveView(false);
    busy = false; render();
    if (success) await playToNext();
  });
  $("workshopMinute").addEventListener("input", event => {
    if (!active || busy) return;
    cursor.minute = Number(event.target.value); setMinute(cursor.minute, true); persist(); render();
    status("At this exact minute, adjust and save only if the framing needs correction.");
  });
  routeSelect.addEventListener("change", () => { if (active && !busy) void seek({ route: Number(routeSelect.value), minute: 0 }, true); });
  $("workshopInterval").addEventListener("change", event => {
    interval = event.target.value === "key" ? "key" : Number(event.target.value); persist(); render();
  });
  render();
  return { refresh: render, close };
}
