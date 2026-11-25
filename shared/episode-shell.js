/* Shared panel and playback geometry for every full episode, including E-002. */
const GAP = 14;
const panel = () => document.getElementById("ui");
const dock = () => document.getElementById("playbackDock");
let dockObserver;
let dockMutationObserver;
let activeDock;
let frame = 0;

function update() {
  frame = 0;
  const ui = panel(), playback = dock();
  if (!ui || !playback) return;
  if (playback !== activeDock) {
    dockObserver?.disconnect();
    dockMutationObserver?.disconnect();
    activeDock = playback;
    dockObserver = new ResizeObserver(schedule);
    dockObserver.observe(playback);
    dockMutationObserver = new MutationObserver(schedule);
    dockMutationObserver.observe(playback, { childList: true, subtree: true });
  }

  const chapters = playback.querySelector(".chapter-switch, .e001-chapters, [class$='-chapters']");
  if (chapters) {
    const single = chapters.querySelectorAll("button").length === 1;
    document.body.classList.toggle("episode-single-chapter", single);
    if (chapters.hidden !== single) chapters.hidden = single;
  }

  if (innerWidth <= 760) {
    ui.style.removeProperty("max-height");
    ui.style.removeProperty("min-height");
    return;
  }
  const top = ui.getBoundingClientRect().top;
  const inFlow = ui.parentElement === playback.parentElement && getComputedStyle(playback).position !== "fixed";
  const available = inFlow
    ? innerHeight - top - playback.offsetHeight - 18 - GAP
    : playback.getBoundingClientRect().top - top - GAP;
  const next = `${Math.max(120, Math.floor(available))}px`;
  if (ui.style.maxHeight !== next) ui.style.setProperty("max-height", next, "important");
  if (document.body.classList.contains("episode-single-chapter")) {
    if (ui.style.minHeight !== next) ui.style.setProperty("min-height", next, "important");
  } else ui.style.removeProperty("min-height");
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(update);
}

const attach = setInterval(() => {
  if (!panel() || !dock()) return;
  clearInterval(attach);
  schedule();
}, 100);
addEventListener("resize", schedule);
schedule();
