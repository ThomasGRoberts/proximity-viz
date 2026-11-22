// The repository table keeps its own border when embedded in the lab website.
if (new URLSearchParams(location.search).get("embed") === "1" && window.parent !== window) {
  const content = document.querySelector(".component-wrap");
  let frame = 0, previousHeight = 0;
  const measure = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const height = Math.ceil(content.getBoundingClientRect().height) + 2;
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
