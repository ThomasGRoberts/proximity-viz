// The repository table keeps its own border when embedded in the lab website.
if (new URLSearchParams(location.search).get("embed") === "1" && window.parent !== window) {
  window.__esplTableEmbedded = true;
  window.addEventListener("message", event => {
    if (event.source === window.parent && event.data?.type === "espl-table-scroll-bridge") window.__esplTableScrollBridge = true;
  });
  window.addEventListener("wheel", event => {
    if (!window.__esplTableScrollBridge || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    window.parent.postMessage({ type: "espl-table-wheel", deltaY: event.deltaY }, "*");
  }, { passive: false });
  const content = document.querySelector(".component-wrap");
  document.documentElement.style.overflowY = "hidden";
  document.body.style.overflowY = "hidden";
  let frame = 0, previousHeight = 0;
  const measure = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const height = Math.ceil(content.getBoundingClientRect().bottom + window.scrollY) + 2;
      if (height === previousHeight) return;
      previousHeight = height;
      window.parent.postMessage({ type: "espl-table-height", height }, "*");
    });
  };
  new ResizeObserver(measure).observe(content);
  window.addEventListener("load", measure);
  window.addEventListener("message", event => { if (event.data?.type === "espl-table-measure") measure(); });
  document.fonts?.ready.then(measure);
  measure();
}
