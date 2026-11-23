// The camera button shows the view a click will open, on both phone and desktop.
const button = document.getElementById("modeBtn");
if (button) {
  const icons = {
    relative: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17c3-8 9-11 17-10M4 20c5-6 10-8 17-8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="6" cy="16" r="2" fill="currentColor"/><circle cx="18" cy="9" r="2" fill="currentColor"/></svg>',
    eci: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 12h16M12 4c-3 3-3 13 0 16M12 4c3 3 3 13 0 16" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  };
  const sync = () => {
    const destination = /relative/i.test(button.getAttribute("aria-label") || button.title) ? "relative" : "eci";
    button.innerHTML = icons[destination];
    button.dataset.destination = destination;
  };
  new MutationObserver(sync).observe(button, { attributes: true, attributeFilter: ["aria-label"] });
  sync();
}
