/* Apply the project-page model and data-repository card treatment to People and research-area updates. */
(() => {
  const root = document.querySelector('#espl-people-page #studentOverlay, #espl-area-page');
  if (!root || root.querySelector('#espl-special-output-style')) return;
  const style = document.createElement('style');
  style.id = 'espl-special-output-style';
  style.textContent = `
    #espl-area-page .project-publications .publication-card,#espl-area-page .espl-special-card{grid-template-columns:minmax(0,1fr) 414px!important}
    #espl-area-page .project-publications .publication-card .knowledge-output-media{justify-content:flex-start!important;padding:16px!important}
    #espl-area-page .project-publications .publication-card .knowledge-slide__people{width:100%!important;max-width:none!important}
    #espl-area-page .project-publications .publication-card .knowledge-person-row{display:flex!important;flex-wrap:nowrap!important;justify-content:flex-start!important;gap:8px!important;width:100%!important}
    #espl-area-page .project-publications .publication-card .knowledge-person__photo{width:70px!important;height:70px!important;flex:0 0 70px!important}
    #espl-area-page .espl-author-overflow{display:grid;place-items:center;flex:0 0 70px;width:70px;height:70px;border-radius:50%;background:#e8e5df;color:#555;font-weight:700}
    #studentOverlay .espl-special-card .model-output-media, #espl-area-page .espl-special-card .model-output-media{display:flex;align-items:center!important;align-self:stretch;height:100%;box-sizing:border-box;justify-content:flex-start;gap:14px;min-height:90px;padding:16px}
    #studentOverlay .espl-special-card .model-polyhedron-link, #studentOverlay .espl-special-card .espl-table-icon-link,
    #espl-area-page .espl-special-card .model-polyhedron-link, #espl-area-page .espl-special-card .espl-table-icon-link{display:block;flex:0 0 76px;width:76px;height:76px;border-radius:8px;text-decoration:none!important}
    #studentOverlay .espl-special-card .model-polyhedron-canvas, #studentOverlay .espl-special-card .espl-table-icon,
    #espl-area-page .espl-special-card .model-polyhedron-canvas, #espl-area-page .espl-special-card .espl-table-icon{display:block;width:76px;height:76px;opacity:.9;transition:transform 260ms cubic-bezier(.34,1.56,.64,1),opacity .2s ease}
    #studentOverlay .espl-special-card :is(.model-polyhedron-link,.espl-table-icon-link):is(:hover,:focus-visible) :is(.model-polyhedron-canvas,.espl-table-icon),
    #espl-area-page .espl-special-card :is(.model-polyhedron-link,.espl-table-icon-link):is(:hover,:focus-visible) :is(.model-polyhedron-canvas,.espl-table-icon){transform:translateY(-2px) scale(1.055);opacity:1}
    #studentOverlay .espl-special-card .model-text-link, #espl-area-page .espl-special-card .model-text-link{display:inline-flex;align-items:center;gap:8px;min-width:0;color:#666;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:clamp(11px,1.05vw,15px);font-weight:400;line-height:normal;white-space:nowrap}
    #studentOverlay .espl-special-card .model-text-link:hover, #espl-area-page .espl-special-card .model-text-link:hover{color:#666;text-decoration:none}
    #studentOverlay .espl-special-card .model-link-arrow, #espl-area-page .espl-special-card .model-link-arrow{display:inline-block}
    #studentOverlay .espl-special-card:is(:hover,:focus-within) .model-link-arrow, #espl-area-page .espl-special-card:is(:hover,:focus-within) .model-link-arrow{animation:espl-special-link-nudge .7s ease}
    #studentOverlay .espl-special-card .knowledge-slide__category-icon, #espl-area-page .espl-special-card .knowledge-slide__category-icon{display:inline-grid;flex:0 0 1rem;width:1rem;height:1rem;place-items:center}
    #studentOverlay .espl-special-card .knowledge-slide__category-icon svg, #espl-area-page .espl-special-card .knowledge-slide__category-icon svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    #studentOverlay .espl-special-card .espl-table-icon .table-scan, #espl-area-page .espl-special-card .espl-table-icon .table-scan{opacity:.25;transform:translateY(0)}
    #studentOverlay .data-repository-card:is(:hover,:focus-within) .table-scan, #espl-area-page .data-repository-card:is(:hover,:focus-within) .table-scan{opacity:.8;animation:espl-special-table-scan-bounce 1.15s ease-in-out 1}
    @keyframes espl-special-link-nudge{0%,100%{transform:translateX(0)}45%{transform:translateX(4px)}70%{transform:translateX(-1px)}}
    @keyframes espl-special-table-scan-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(25px)}}
    @media(max-width:999px){#espl-area-page .project-publications .publication-card,#espl-area-page .espl-special-card{grid-template-columns:1fr!important}}
    @media(max-width:767px){#studentOverlay .espl-special-card,#espl-area-page .espl-special-card{grid-template-columns:minmax(0,1fr)!important}#studentOverlay .espl-special-card .model-output-media,#espl-area-page .espl-special-card .model-output-media{min-height:0;padding:0 1.2rem 1.2rem;overflow-x:auto}}
    @media(prefers-reduced-motion:reduce){#studentOverlay .espl-special-card :is(.model-polyhedron-canvas,.espl-table-icon,.model-link-arrow,.table-scan),#espl-area-page .espl-special-card :is(.model-polyhedron-canvas,.espl-table-icon,.model-link-arrow,.table-scan){animation:none!important;transition:none!important}}
  `;
  root.prepend(style);
  const tableIcon = () => `<svg class="espl-table-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><rect x="8" y="9" width="32" height="8" rx="2" fill="#edcc73"/><rect class="table-scan" x="8" y="19" width="32" height="8" rx="1" fill="#eaaa00" opacity=".34"/><path d="M8 17h32M8 28h32M8 39h32M20 17v22M30 17v22M8 17v22h32V17" fill="none" stroke="#76664b" stroke-width="1.3"/></svg>`;
  function mountPolyhedron(canvas) {
    if (typeof window.mountModelPolyhedron === 'function') {
      window.mountModelPolyhedron(canvas);
      return;
    }
    // The SBI page's 80-facet canvas motif, with its 950 ms reveal and 700 ms return.
    const dpr = Math.min(devicePixelRatio || 1, 2), size = 76, ctx = canvas.getContext('2d');
    canvas.width = size * dpr; canvas.height = size * dpr; ctx.scale(dpr, dpr);
    const phi = (1 + Math.sqrt(5)) / 2;
    const normal = p => { const n = Math.hypot(...p); return p.map(v => v / n); };
    const vertices = [[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]].map(normal);
    const faces = [[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
    const triangles = [];
    for (const [a,b,c] of faces) {
      const A = vertices[a], B = vertices[b], C = vertices[c];
      const AB = normal(A.map((v,i) => (v+B[i])/2)), BC = normal(B.map((v,i) => (v+C[i])/2)), CA = normal(C.map((v,i) => (v+A[i])/2));
      triangles.push([A,AB,CA],[B,BC,AB],[C,CA,BC],[AB,BC,CA]);
    }
    const rx = (p,r) => [p[0],p[1]*Math.cos(r)-p[2]*Math.sin(r),p[1]*Math.sin(r)+p[2]*Math.cos(r)];
    const ry = (p,r) => [p[0]*Math.cos(r)+p[2]*Math.sin(r),p[1],-p[0]*Math.sin(r)+p[2]*Math.cos(r)];
    const rz = (p,r) => [p[0]*Math.cos(r)-p[1]*Math.sin(r),p[0]*Math.sin(r)+p[1]*Math.cos(r),p[2]];
    const rotate = (p,y) => rx(ry(p,y),.45);
    const light = normal([1.35,1.65,2.4]);
    const orbit = Array.from({length:361},(_,i) => {
      const a = i/360*Math.PI*2;
      return rz(ry(rx(ry(rx([Math.cos(a)*1.12,Math.sin(a)*1.12,0],64*Math.PI/180),22*Math.PI/180),29*Math.PI/180),15*Math.PI/180),14*Math.PI/180);
    });
    const project = p => { const scale = 4.3/(4.3-p[2]); return [38+p[0]*29*scale,38-p[1]*29*scale]; };
    let frame = 0, angle = .65, orbitProgress = 0, open = false;
    const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    function orbitStroke(front) {
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      const end = Math.floor(Math.max(0,Math.min(1,orbitProgress))*360);
      for(let i=1;i<=end;i++) {
        const a=orbit[i-1],b=orbit[i]; if (((a[2]+b[2])/2>=0)!==front) continue;
        const A=project(a),B=project(b); ctx.beginPath();ctx.moveTo(...A);ctx.lineTo(...B);ctx.stroke();
      }
    }
    function draw() {
      ctx.clearRect(0,0,size,size);orbitStroke(false);
      const facets=triangles.map(triangle => {
        const points=triangle.map(p=>rotate(p,angle)),u=points[1].map((v,i)=>v-points[0][i]),v=points[2].map((w,i)=>w-points[0][i]),n=normal(cross(u,v));
        return {points,z:points.reduce((sum,p)=>sum+p[2],0)/3,brightness:Math.max(0,n.reduce((sum,v,i)=>sum+v*light[i],0))};
      }).sort((a,b)=>a.z-b.z);
      for(const facet of facets){const i=.58+.42*facet.brightness,r=Math.round(244*i),g=Math.round(186*i),b=Math.round(24*i);
        ctx.beginPath();facet.points.forEach((p,j)=>{const [x,y]=project(p);j?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fill();}
      orbitStroke(true);
    }
    const reduced=matchMedia('(prefers-reduced-motion: reduce)'),ease=t=>t*t*(3-2*t),rest=.65;
    function motion(close=false){cancelAnimationFrame(frame);const target=rest+(close?0:1.05),targetOrbit=close?0:1;
      if(reduced.matches){angle=target;orbitProgress=targetOrbit;draw();return}
      const from=angle,fromOrbit=orbitProgress,start=performance.now(),duration=close?700:950;
      function tick(now){const t=Math.min(1,(now-start)/duration),e=ease(t);angle=from+(target-from)*e;orbitProgress=fromOrbit+(targetOrbit-fromOrbit)*e;draw();if(t<1)frame=requestAnimationFrame(tick)}
      frame=requestAnimationFrame(tick);
    }
    const link=canvas.parentElement;
    link.addEventListener('mouseenter',()=>{if(!open){open=true;motion()}});
    link.addEventListener('mouseleave',()=>{if(open){open=false;motion(true)}});
    link.addEventListener('focusin',()=>{if(!open){open=true;motion()}});
    link.addEventListener('focusout',()=>{if(open){open=false;motion(true)}});
    draw();
  }

  function updateAreaAuthors(card){
    if(card.dataset.esplAuthorsAligned)return;
    const people=card.querySelector('.knowledge-slide__people'),rows=[...card.querySelectorAll('.knowledge-person-row')];
    if(!people||!rows.length)return;
    const all=rows.flatMap(row=>[...row.querySelectorAll('.knowledge-person')]);
    if(!all.length)return;
    card.dataset.esplAuthorsAligned='true';
    const first=rows[0];for(const row of rows.slice(1))row.remove();first.replaceChildren();
    const chosen=all.length>5?all.slice(0,4):all.slice();
    if(all.length>5){const thomas=all.find(node=>/thomas (?:g\.|gonz[aá]lez) roberts/i.test(node.title||node.querySelector('img')?.alt||''));if(thomas&&!chosen.includes(thomas)){chosen.pop();chosen.push(thomas)}}
    first.append(...chosen);
    if(all.length>5){const more=document.createElement('span');more.className='knowledge-person espl-author-overflow';more.textContent=`+${all.length-chosen.length}`;more.title=all.filter(node=>!chosen.includes(node)).map(node=>node.title||node.querySelector('img')?.alt).join(', ');first.append(more)}
  }
  function update() {
    if(root.id==='studentOverlay')return;
    for (const card of root.querySelectorAll('.project-publications .publication-card')) {
      updateAreaAuthors(card);
      if (card.dataset.esplSpecialReady) continue;
      const category = card.querySelector('.knowledge-slide__category');
      const kind = category?.textContent.trim().toLowerCase();
      if (!/^(interactive )?model$|^data repository$/.test(kind || '')) continue;
      const href = card.querySelector('.knowledge-slide__title-link[href], .knowledge-slide__title a[href], .external-metadata-link[href]')?.href;
      if (!href) continue;
      card.dataset.esplSpecialReady = 'true';
      const model = kind !== 'data repository';
      card.classList.add('espl-special-card', model ? 'archive-model-card' : 'data-repository-card');
      card.classList.remove('no-portraits');
      card.removeAttribute('data-portraits');
      const categoryIcon = category.querySelector('.knowledge-slide__category-icon') || document.createElement('span');
      categoryIcon.className = 'knowledge-slide__category-icon';
      categoryIcon.setAttribute('aria-hidden', 'true');
      categoryIcon.innerHTML = model ? '<svg viewBox="0 0 24 24"><path d="M4 3.5 19 12l-7 1.2-2.5 6.3z"/><path d="m12 13.2 3.4 6"/></svg>' : '<svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M3.5 9h17M3.5 14h17M9 9v11M15 9v11"/></svg>';
      category.replaceChildren(categoryIcon, document.createTextNode(model ? 'Interactive model' : 'Data repository'));
      card.querySelector('.knowledge-slide__summary')?.remove();
      const media = card.querySelector('.knowledge-output-media') || document.createElement('div');
      media.className = 'knowledge-output-media model-output-media';
      const iconLink = document.createElement('a');
      iconLink.href = href;
      iconLink.className = model ? 'model-polyhedron-link' : 'espl-table-icon-link';
      iconLink.setAttribute('aria-label', model ? 'Explore the interactive model' : 'Explore the data');
      if (model) {
        const canvas = document.createElement('canvas');
        canvas.className = 'model-polyhedron-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        iconLink.append(canvas);
        mountPolyhedron(canvas);
      } else iconLink.innerHTML = tableIcon();
      const action = document.createElement('a');
      action.href = href;
      action.className = 'model-text-link';
      const label = document.createElement('span');
      label.className = 'model-link-label-text';
      label.textContent = model ? 'Explore the interactive model' : 'Explore the data';
      const arrow = document.createElement('span');
      arrow.className = 'model-link-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      action.append(label, arrow);
      media.replaceChildren(iconLink, action);
      if (!media.isConnected) card.append(media);
    }
  }
  let pending = false;
  new MutationObserver(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; update(); });
  }).observe(root, { childList: true, subtree: true });
  update();
})();
