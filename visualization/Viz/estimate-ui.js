const caveat = "Positions and velocities are estimated by propagating publicly available orbital element sets. Covariance information is unavailable for these reconstructions, so we cannot quantify the uncertainty of the displayed separation and relative speed. Numerical precision does not establish physical accuracy.";
const dateText = ms => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(ms);

export function renderEstimatedMinimum(target, { episodeId, metric, value, unit, ms, onJump }) {
  if (!Number.isFinite(value) || !Number.isFinite(ms)) {
    target.textContent = "Minimum this chapter: unavailable";
    return;
  }
  const caption = document.createElement("span"); caption.className = "estimateCaption"; caption.textContent = "Minimum this chapter:";
  const strong = document.createElement("strong"); strong.textContent = `${Math.round(value).toLocaleString("en-US")} ${unit}`;
  const link = document.createElement("a"); link.href = "#playbackDock";
  const label = document.createElement("span"); label.textContent = dateText(ms);
  link.append(label);
  link.insertAdjacentHTML("beforeend", '<svg class="minimumCalendar" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3.5h10v10H3zM3 6h10"/><path class="calendarPage" d="M6.1 8.4h3.8l-2.4 3.6"/></svg>');
  link.title = `Jump playback to ${new Date(ms).toISOString()}`;
  link.setAttribute("aria-label", `Jump playback to ${new Date(ms).toISOString()} for estimated minimum ${metric === "separationKm" ? "separation" : "relative speed"}`);
  link.addEventListener("click", event => { event.preventDefault(); onJump(ms); });
  const info = document.createElement("details"); info.className = "estimateInfo";
  const summary = document.createElement("summary"); summary.setAttribute("aria-label", "About the uncertainty of these estimates"); summary.textContent = "i";
  const explanation = document.createElement("p"); explanation.setAttribute("role", "tooltip"); explanation.textContent = caveat;
  info.append(summary, explanation);
  target.replaceChildren(caption, document.createTextNode(" "), strong, document.createTextNode(" on "), link, info);
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") document.querySelectorAll(".estimateInfo[open]").forEach(item => { item.open = false; item.querySelector("summary")?.focus(); });
});
