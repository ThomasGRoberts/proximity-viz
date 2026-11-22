/* Add after the People page block. Keep every research-card author on one line. */
(() => {
  const root = document.getElementById('espl-people-page');
  if (!root || document.getElementById('espl-people-author-row-style')) return;
  const style = document.createElement('style');
  style.id = 'espl-people-author-row-style';
  style.textContent = `
    @media(min-width:900px){#studentOverlay .publication-card{grid-template-columns:minmax(0,1fr) minmax(360px,38%)}}
    #studentOverlay .publication-card .knowledge-output-media{min-width:0;overflow:hidden}
    #studentOverlay .publication-card .knowledge-slide__people{display:flex;flex-flow:row nowrap;justify-content:flex-start;align-items:center;gap:6px;width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin}
    #studentOverlay .publication-card .knowledge-person-row{display:flex;flex:0 0 auto;width:auto;gap:6px}
    #studentOverlay .publication-card .knowledge-person__photo{width:clamp(32px,3.2vw,46px);height:clamp(32px,3.2vw,46px)}
  `;
  root.prepend(style);
  const stage = document.getElementById('publicationStage');
  if (!stage) return;
  const flatten = () => {
    for (const people of stage.querySelectorAll('.publication-card .knowledge-slide__people')) {
      const rows = [...people.querySelectorAll(':scope > .knowledge-person-row')];
      if (rows.length < 2) continue;
      for (const row of rows.slice(1)) { rows[0].append(...row.childNodes); row.remove(); }
    }
  };
  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; flatten(); });
  }).observe(stage, { childList: true, subtree: true });
  flatten();
})();
