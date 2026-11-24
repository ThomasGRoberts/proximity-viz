/* Paste through a Custom HTML block after the existing ESPL project-page block.
   Special cards are reconciled after the page's own archive renderer runs. */
(() => {
  const slug = document.currentScript?.dataset.esplProject;
  if (!['sbi', 'proximity'].includes(slug)) return;
  const projectRoot = document.getElementById('espl-project-page');
  if (!projectRoot) return;

  const styles = document.createElement('style');
  styles.textContent = `
    #espl-project-page .espl-special-card{grid-template-columns:minmax(0,1fr) minmax(400px,41%)}
    #espl-project-page .espl-special-card .model-output-media{display:flex;align-items:center;justify-content:flex-start;gap:0;min-height:90px;padding:16px 12px}
    #espl-project-page .espl-special-card .model-polyhedron-link,
    #espl-project-page .espl-special-card .espl-table-icon-link{display:block;flex:0 0 76px;width:76px;height:76px;border-radius:8px;text-decoration:none!important}
    #espl-project-page .espl-special-card .model-polyhedron-canvas,
    #espl-project-page .espl-special-card .espl-table-icon{display:block;width:76px;height:76px;opacity:.9;transition:transform 260ms cubic-bezier(.34,1.56,.64,1),opacity .2s ease}
    #espl-project-page .espl-special-card :is(.model-polyhedron-link,.espl-table-icon-link):is(:hover,:focus-visible) :is(.model-polyhedron-canvas,.espl-table-icon){transform:translateY(-2px) scale(1.055);opacity:1}
    #espl-project-page .espl-special-card .model-text-link{display:inline-flex;align-items:center;gap:8px;min-width:0;color:#666;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:clamp(11px,1.05vw,15px);font-weight:400;line-height:normal;white-space:nowrap}
    #espl-project-page .espl-special-card .model-text-link:hover,#espl-project-page .espl-special-card .model-text-link:focus-visible{color:#666;text-decoration:none}
    #espl-project-page .espl-special-card .model-link-arrow{display:inline-block}
    #espl-project-page .espl-special-card:is(:hover,:focus-within) .model-link-arrow{animation:espl-data-link-nudge .7s ease}
    #espl-project-page .espl-special-card .knowledge-slide__summary{max-width:60ch}
    /* SBI's Research Updates card geometry, applied to both project pages. */
    #espl-project-page .project-outputs .publication-card{grid-template-columns:minmax(0,1fr) minmax(350px,34%)}
    #espl-project-page .project-outputs .publication-card.no-portraits{grid-template-columns:1fr}
    #espl-project-page .project-outputs .publication-card .knowledge-output-media{justify-content:flex-start;padding:16px 12px}
    #espl-project-page .project-outputs .publication-card .knowledge-slide__people{flex-direction:column;align-items:flex-start;justify-content:flex-start;flex-wrap:nowrap;gap:7px;width:max-content;max-width:100%}
    #espl-project-page .project-outputs .publication-card .knowledge-person-row{display:flex;align-items:center;justify-content:flex-start;gap:8px;width:100%}
    #espl-project-page .project-outputs .publication-card[data-portraits] .knowledge-person__photo{width:70px;height:70px}
    #espl-project-page .espl-table-icon .table-scan{opacity:.25;transform:translateY(0)}
    #espl-project-page .data-repository-card:is(:hover,:focus-within) .table-scan{opacity:.8;animation:espl-table-scan-bounce 1.15s ease-in-out 1}
    @keyframes espl-data-link-nudge{0%,100%{transform:translateX(0)}45%{transform:translateX(4px)}70%{transform:translateX(-1px)}}
    @keyframes espl-table-scan-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(25px)}}
    @media(max-width:999px){#espl-project-page .project-outputs .publication-card{grid-template-columns:1fr}#espl-project-page .project-outputs .publication-card .knowledge-output-media{justify-content:flex-start;min-height:0;padding:0 1.65rem 1.25rem}}
    @media(max-width:767px){#espl-project-page .espl-special-card{grid-template-columns:1fr}#espl-project-page .espl-special-card .model-output-media{min-height:0;padding:0 1.2rem 1.2rem;gap:8px}#espl-project-page .espl-special-card .model-text-link{gap:5px;white-space:nowrap;font-size:10.5px}#espl-project-page .project-outputs .publication-card .knowledge-output-media{padding:0 1.2rem 1.2rem}#espl-project-page .project-outputs .publication-card[data-portraits] .knowledge-person__photo{width:56px;height:56px}}
    @media(max-width:380px){#espl-project-page .espl-special-card .model-output-media{flex-wrap:wrap}#espl-project-page .espl-special-card .model-text-link{width:100%;font-size:11px}}
    @media(prefers-reduced-motion:reduce){#espl-project-page .espl-special-card :is(.model-polyhedron-canvas,.espl-table-icon,.model-link-arrow,.table-scan){animation:none!important;transition:none!important}}
  `;
  projectRoot.prepend(styles);

  const rowField = (row, name) => String(row?.[name] || '').trim();
  const typeOf = row => rowField(row, 'Type').toLowerCase();
  const special = row => /^(model|data repository)$/.test(typeOf(row));
  const archiveURL = 'https://docs.google.com/spreadsheets/d/1eW3y9Rsp1vj4Jop-LcUEFNGY-7c2FZzXHDOzUpAGl-o/gviz/tq?tqx=out:json&gid=1886090417';
  const projectName = slug === 'sbi' ? 'Space-based Interceptors and Strategic Stability' : 'How Close is Too Close';
  const tableIcon = () => `
    <svg class="espl-table-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect x="8" y="9" width="32" height="8" rx="2" fill="#edcc73"/>
      <rect class="table-scan" x="8" y="19" width="32" height="8" rx="1" fill="#eaaa00" opacity=".34"/>
      <path d="M8 17h32M8 28h32M8 39h32M20 17v22M30 17v22M8 17v22h32V17" fill="none" stroke="#76664b" stroke-width="1.3"/>
    </svg>`;

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

  function makeSpecialCard(row) {
    const model = typeOf(row) === 'model', href = rowField(row,'URL'), title = rowField(row,'Title');
    const detail = model
      ? slug === 'sbi' ? 'Explore how different missile threats shape the interceptor constellations needed for boost-phase defense.' : 'See and understand the inter-spacecraft dynamics of satellite proximity episodes that have concerned state actors in recent history'
      : 'Browse documented satellite proximity episodes, orbital reconstructions, and linked source records.';
    const card = document.createElement('article');
    card.className = `knowledge-output-card model-card espl-special-card ${model?'archive-model-card':'data-repository-card'} is-clickable`;
    card.dataset.archiveType = model ? 'model' : 'data-repository';
    const main=document.createElement('div');main.className='knowledge-output-main';
    const category=document.createElement('p');category.className='knowledge-slide__category';
    const categoryIcon=document.createElement('span');categoryIcon.className='knowledge-slide__category-icon';categoryIcon.setAttribute('aria-hidden','true');
    categoryIcon.innerHTML=model?'<svg viewBox="0 0 24 24"><path d="M4 3.5 19 12l-7 1.2-2.5 6.3z"/><path d="m12 13.2 3.4 6"/></svg>':'<svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M3.5 9h17M3.5 14h17M9 9v11M15 9v11"/></svg>';
    category.append(categoryIcon,document.createTextNode(model?'Interactive model':'Data repository'));
    const heading=document.createElement('h3');heading.className='knowledge-slide__title';
    const headingLink=document.createElement('a');headingLink.className='knowledge-slide__title-link';headingLink.href=href;headingLink.textContent=title;heading.append(headingLink);
    const summary=document.createElement('div');summary.className='knowledge-slide__summary';
    const description=document.createElement('p');description.textContent=detail;summary.append(description);
    main.append(category,heading,summary);card.append(main);
    const media=document.createElement('div');media.className='knowledge-output-media model-output-media';
    const iconLink=document.createElement('a');iconLink.href=href;iconLink.className=model?'model-polyhedron-link':'espl-table-icon-link';
    iconLink.setAttribute('aria-label',model?'Explore the interactive model':'Explore the data');
    if(model){const canvas=document.createElement('canvas');canvas.className='model-polyhedron-canvas';canvas.setAttribute('aria-hidden','true');iconLink.append(canvas);mountPolyhedron(canvas)}
    else iconLink.innerHTML=tableIcon();
    const action=document.createElement('a');action.href=href;action.className='model-text-link';
    const label=document.createElement('span');label.className='model-link-label-text';label.textContent=model?'Explore the interactive model':'Explore the data';
    const arrow=document.createElement('span');arrow.className='model-link-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='→';
    action.append(label,arrow);media.append(iconLink,action);card.append(media);
    card.addEventListener('click',event=>{if(event.target.closest('a,button')||String(getSelection()||''))return;location.href=href});
    return card;
  }

  function installHeroAction() {
    const frame=projectRoot.querySelector('.espl-proximity-banner-embed iframe');
    if(!frame) return;
    const apply=()=>{
      let doc;try{doc=frame.contentDocument}catch{return}
      const banner=doc?.querySelector('main.banner');if(!banner)return;
      const placeLink=link=>{
        // The published WordPress block may still load an earlier copy first.
        // Inline overrides keep the existing link in the same viewport position as SBI.
        link.style.setProperty('left','6px','important');
        link.style.setProperty('top','10px','important');
        link.style.setProperty('bottom','auto','important');
        link.style.setProperty('display','flex','important');
      };
      const existing=doc.getElementById('espl-proximity-table-link');
      if(existing){placeLink(existing);return}
      const style=doc.createElement('style');style.textContent=`
        .espl-table-hero-link{position:absolute;left:6px;top:10px;bottom:auto;z-index:3;display:flex;align-items:center;width:46px;height:46px;color:#555;text-decoration:none;visibility:hidden;opacity:0;transform:translateY(72px);pointer-events:none;transition:transform .7s cubic-bezier(.16,1,.3,1),opacity .25s ease}
        .espl-table-hero-link.is-arrived{visibility:visible;opacity:1;transform:translateY(0);pointer-events:auto}
        .espl-table-hero-icon{position:relative;z-index:2;width:46px;height:46px;flex:0 0 46px}
        .espl-table-hero-icon svg{position:absolute;top:-6px;left:-6px;display:block;width:58px;height:58px;opacity:.9;transition:opacity .24s ease}
        .espl-table-hero-icon .table-scan{opacity:.25;transform:translateY(0)}
        .espl-table-hero-link.is-open .table-scan{opacity:.8;animation:espl-table-scan-bounce 1.15s ease-in-out 1}
        .espl-table-hero-label{position:absolute;top:0;left:46px;height:46px;display:flex;align-items:center;white-space:nowrap;padding-left:10px;opacity:0;clip-path:inset(0 100% 0 0);color:#666;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:clamp(11px,1.05vw,15px);font-weight:400;line-height:normal;transition:clip-path .5s cubic-bezier(.2,.8,.2,1),opacity .25s ease}
        .espl-table-hero-link:is(.is-open,:hover,:focus-visible) .espl-table-hero-label{opacity:1;clip-path:inset(0)}
        .espl-table-hero-link:focus-visible{outline:2px solid rgba(180,145,35,.9);outline-offset:4px}
        .espl-table-hero-link.is-nudging .espl-table-hero-label{animation:espl-data-link-nudge .7s ease}
        @keyframes espl-data-link-nudge{0%,100%{transform:translateX(0)}45%{transform:translateX(4px)}70%{transform:translateX(-1px)}}
        @keyframes espl-table-scan-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(25px)}}
        @media(max-aspect-ratio:1.2/1){.espl-table-hero-label{font-size:13px}}
        @media(max-width:767px){.espl-table-hero-link{display:none}}
        @media(prefers-reduced-motion:reduce){.espl-table-hero-link,.espl-table-hero-label,.espl-table-hero-icon .table-scan{animation:none!important;transition:none!important}}
      `;doc.head.append(style);
      const link=doc.createElement('a');link.id='espl-proximity-table-link';link.className='espl-table-hero-link';
      link.href='https://espl.ae.gatech.edu/research/tables/proximity';link.target='_top';
      link.setAttribute('aria-label','Explore the data');
      link.innerHTML=`<span class="espl-table-hero-icon" aria-hidden="true">${tableIcon()}</span><span class="espl-table-hero-label">Explore the data&nbsp; →</span>`;
      banner.append(link);
      placeLink(link);
      const reduced=doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)');let open=false;
      const reveal=()=>{if(!open){open=true;link.classList.add('is-open')}};
      const retract=()=>{if(open&&!link.matches(':hover')&&doc.activeElement!==link){open=false;link.classList.remove('is-open')}};
      link.addEventListener('mouseenter',reveal);link.addEventListener('focusin',reveal);
      link.addEventListener('mouseleave',retract);link.addEventListener('focusout',retract);
      doc.defaultView.setTimeout(()=>{link.classList.add('is-arrived');if(reduced.matches)return;doc.defaultView.setTimeout(()=>{reveal();doc.defaultView.setTimeout(retract,2600)},700)},1100);
      doc.defaultView.setInterval(()=>{if(open||reduced.matches||doc.hidden)return;link.classList.add('is-nudging');reveal();doc.defaultView.setTimeout(()=>{link.classList.remove('is-nudging');retract()},2200)},18000);
    };
    frame.addEventListener('load',apply);
    if(frame.contentDocument?.readyState==='complete') apply();
  }

  async function installResearchCards() {
    let records;
    try {
      const response=await fetch(archiveURL,{cache:'no-store'});
      if(!response.ok) throw new Error(`Archive returned ${response.status}`);
      const text=await response.text(),payload=JSON.parse(text.slice(text.indexOf('{'),text.lastIndexOf('}')+1));
      if(payload.status!=='ok') throw new Error('Archive query failed');
      records=payload.table.rows.map(row=>Object.fromEntries(payload.table.cols.map((column,i)=>[column.label,row.c?.[i]?.f??row.c?.[i]?.v??''])));
    } catch(error){console.warn('Special project cards could not load from the publications archive.',error);return}
    const rows=records.filter(row=>special(row)&&rowField(row,'Project(s)').split(/[,;]/).some(name=>name.trim().toLowerCase()===projectName.toLowerCase()))
      .sort((a,b)=>(typeOf(a)==='data repository'?0:1)-(typeOf(b)==='data repository'?0:1));
    if(!rows.length) return;
    const cards=rows.map(makeSpecialCard),urls=new Set(rows.map(row=>rowField(row,'URL').replace(/\/$/,''))),titles=new Set(rows.map(row=>rowField(row,'Title').toLowerCase()));
    const container=projectRoot.querySelector('.project-publications');if(!container)return;
    let queued=false;
    const reconcile=()=>{
      queued=false;
      for(const card of [...container.children]){
        if(card.classList.contains('espl-special-card')) continue;
        const link=card.querySelector('.knowledge-slide__title-link'),url=link?.href?.replace(/\/$/,'')||'',title=card.querySelector('.knowledge-slide__title')?.textContent?.trim().toLowerCase()||'';
        const category=card.querySelector('.knowledge-slide__category,.knowledge-output-category,.knowledge-slide__eyebrow')?.textContent?.trim().toLowerCase()||'';
        // Older page blocks contain a hand-written model card. Once the live
        // archive supplies that card, keep only the archive-driven version.
        if(urls.has(url)||titles.has(title)||/^(interactive )?model$|^data repository$/.test(category)) card.remove();
      }
      if(cards.some((card,index)=>container.children[index]!==card)) container.prepend(...cards);
      alignIcons();
    };
    const alignIcons=()=>{
      const portrait=container.querySelector('.publication-card .knowledge-person__photo');
      if(!portrait)return;
      const targetLeft=portrait.getBoundingClientRect().left;
      for(const media of container.querySelectorAll('.espl-special-card .model-output-media')){
        media.style.translate='';
        const icon=media.querySelector('.model-polyhedron-link, .espl-table-icon-link');
        if(!icon)continue;
        const delta=targetLeft-icon.getBoundingClientRect().left;
        media.style.translate=`${Math.round(delta)}px 0`;
      }
    };
    window.addEventListener('resize',alignIcons,{passive:true});
    new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(reconcile)}}).observe(container,{childList:true});
    reconcile();
  }

  if(slug==='proximity') installHeroAction();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>installResearchCards(),{once:true});
  else installResearchCards();
})();
