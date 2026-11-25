/* Paste through a Custom HTML block after the existing ESPL project-page block.
   Special cards are reconciled after the page's own archive renderer runs. */
(() => {
  const slug = document.currentScript?.dataset.esplProject;
  if (!['sbi', 'proximity', 'lunar'].includes(slug)) return;
  const projectRoot = document.getElementById('espl-project-page');
  if (!projectRoot || projectRoot.dataset.esplProjectUpdates === 'ready') return;
  projectRoot.dataset.esplProjectUpdates = 'ready';

  const styles = document.createElement('style');
  styles.textContent = `
    ${slug === 'proximity' ? `
    /* Match SBI's back-link placement and side-member hover cards. */
    #espl-project-page .espl-project-back--banner{top:9px!important}
    @media(max-width:767px){#espl-project-page .espl-project-back--mobile{top:-25px!important}}
    #espl-project-page .project-people{gap:10px 2px}
    #espl-project-page .project-person{box-sizing:border-box;align-self:start;gap:0!important;min-width:0;padding:4px 2px 8px;border:1px solid transparent;border-radius:12px;background:transparent;color:inherit;text-decoration:none!important;transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease,background-color .2s ease}
    #espl-project-page .project-person:hover,#espl-project-page .project-person:focus-visible{transform:translateY(-3px);background:#fff;border-color:#e4e0d7;box-shadow:0 10px 27px #00000012;text-decoration:none!important}
    #espl-project-page .project-person:focus-visible{outline:2px solid #a4925a;outline-offset:3px}
    #espl-project-page .project-person img{width:min(100%,112px);border-radius:8px;margin-bottom:10px;transition:none!important}
    #espl-project-page .project-person:hover img,#espl-project-page .project-person:focus-visible img{transform:none!important}
    #espl-project-page .project-person strong{color:#252525;font-family:Roboto,'Helvetica Neue',Arial,sans-serif;font-size:14px!important;font-weight:700!important;line-height:1.4!important;text-decoration:none!important}
    #espl-project-page .project-person:hover strong,#espl-project-page .project-person:focus-visible strong{text-decoration:none!important}
    #espl-project-page .project-person span{margin-top:10px!important;color:#333!important;font-size:12px!important;line-height:1.4!important;white-space:pre-line!important}
    ` : ''}
    #espl-project-page .project-person:hover,#espl-project-page .project-person:focus-visible{border-color:transparent!important;box-shadow:0 0 0 8px #fff,0 13px 30px #00000018!important}
    #espl-project-page .project-publications:not([data-espl-publications-ready="true"]){visibility:hidden}
    #espl-project-page .espl-project-publication-pager{display:flex;align-items:center;justify-content:flex-end;gap:.5rem;margin:16px 0 0;font-size:12px;color:#6b7280}
    #espl-project-page .espl-project-publication-pager[hidden]{display:none!important}
    #espl-project-page .espl-project-publication-pager button{border:1px solid #e3e5e7;background:#fff;padding:.3rem .55rem;border-radius:.4rem;cursor:pointer;color:#252525!important;font:inherit;text-decoration:none!important;min-width:30px}
    #espl-project-page .espl-project-publication-pager button:hover,#espl-project-page .espl-project-publication-pager button:focus-visible{background:#f7f7f7}
    #espl-project-page .espl-project-publication-pager button[disabled]{opacity:.5;cursor:not-allowed;background:#fff}
    #espl-project-page .espl-project-publication-pager button[aria-current="page"]{background:#fff3d6;border-color:#f1d188;font-weight:700}
    #espl-project-page .project-outputs .espl-special-card{grid-template-columns:minmax(0,1fr) 414px!important}
    #espl-project-page .espl-special-card .model-output-media{display:flex;align-items:center;justify-content:flex-start;gap:14px;min-height:90px;padding:16px!important}
    #espl-project-page .espl-special-card .model-polyhedron-link,
    #espl-project-page .espl-special-card .espl-table-icon-link{display:block;flex:0 0 76px;width:76px;height:76px;border-radius:8px;text-decoration:none!important}
    #espl-project-page .espl-special-card .model-polyhedron-canvas,
    #espl-project-page .espl-special-card .espl-table-icon{display:block;width:76px;height:76px;opacity:.9;transition:transform 260ms cubic-bezier(.34,1.56,.64,1),opacity .2s ease}
    #espl-project-page .espl-special-card:is(:hover,:focus-within) :is(.model-polyhedron-canvas,.espl-table-icon),#espl-project-page .espl-special-card :is(.model-polyhedron-link,.espl-table-icon-link):is(:hover,:focus-visible) :is(.model-polyhedron-canvas,.espl-table-icon){transform:translateY(-2px) scale(1.055);opacity:1}
    #espl-project-page .espl-special-card .model-text-link{display:inline-flex;align-items:center;gap:8px;min-width:0;color:#666;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:clamp(11px,1.05vw,15px);font-weight:400;line-height:normal;white-space:nowrap}
    #espl-project-page .espl-special-card .model-text-link:hover,#espl-project-page .espl-special-card .model-text-link:focus-visible{color:#666;text-decoration:none}
    #espl-project-page .espl-special-card .model-link-arrow{display:inline-block;transition:transform .22s ease}
    #espl-project-page .espl-special-card:is(:hover,:focus-within) .model-link-arrow{transform:translateX(4px);animation:espl-data-link-nudge .7s ease}
    #espl-project-page .espl-special-card .knowledge-slide__summary{max-width:60ch}
    /* SBI's Research Updates card geometry, applied to both project pages. */
    #espl-project-page .project-outputs .publication-card{grid-template-columns:minmax(0,1fr) 414px!important}
    #espl-project-page .project-outputs .publication-card.no-portraits{grid-template-columns:1fr}
    #espl-project-page .project-outputs .publication-card .knowledge-output-media{justify-content:flex-start;padding:16px!important}
    #espl-project-page .publication-card .espl-author-name,#espl-project-page .publication-card .espl-author-name:visited,#espl-project-page .publication-card .espl-author-name:hover{color:#252525;text-decoration:underline;text-decoration-color:#252525;text-underline-offset:2px}
    #espl-project-page .knowledge-output-card .espl-author-name,#espl-project-page .knowledge-output-card .espl-author-name:is(:visited,:hover,:focus-visible){color:#252525!important;text-decoration:underline!important;text-decoration-color:#252525!important;text-underline-offset:2px;transition:none!important}
    #espl-project-page .espl-mobile-special-summary,#espl-project-page .espl-mobile-special-people{display:none!important}
    #espl-project-page .espl-mobile-portraits{display:none!important}
    #espl-project-page .project-outputs .publication-card .knowledge-slide__people{display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start;flex-wrap:nowrap;gap:7px;width:100%;max-width:100%}
    #espl-project-page .project-outputs .publication-card .knowledge-person-row{display:flex;align-items:center;justify-content:flex-start;gap:8px;width:100%}
    #espl-project-page .project-outputs .publication-card[data-portraits] .knowledge-person__photo{display:grid;place-items:center;width:70px;height:70px;border-radius:50%;background:#efebe1;color:#615b50;font-weight:700}
    #espl-project-page .espl-author-overflow{display:grid;place-items:center;flex:0 0 70px;width:70px;height:70px;border-radius:50%;background:#e8e5df;color:#555;font-weight:700}
    #espl-project-page .espl-table-icon .table-scan{opacity:.25;transform:translateY(0)}
    #espl-project-page .data-repository-card:is(:hover,:focus-within) .table-scan{opacity:.8;animation:espl-table-scan-bounce 1.15s ease-in-out 1}
    @keyframes espl-data-link-nudge{0%,100%{transform:translateX(0)}45%{transform:translateX(4px)}70%{transform:translateX(-1px)}}
    @keyframes espl-table-scan-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(25px)}}
    @media(max-width:999px){#espl-project-page .project-outputs .publication-card,.project-outputs .espl-special-card{grid-template-columns:1fr!important}#espl-project-page .project-outputs .publication-card .knowledge-output-media{justify-content:flex-start;min-height:0;padding:0 1.65rem 1.25rem}}
    @media(max-width:767px){#espl-project-page .project-outputs .espl-special-card{display:block!important;max-width:100%;min-width:0}#espl-project-page .espl-special-card .knowledge-output-main{width:100%!important;min-width:0!important;box-sizing:border-box}#espl-project-page .espl-special-card .model-output-media{display:none!important}#espl-project-page .espl-special-card .espl-mobile-special-summary{display:block!important}#espl-project-page .espl-special-card .espl-mobile-special-people{display:flex!important;width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box;min-height:0;padding:0 1.2rem 1.2rem;overflow-x:auto}#espl-project-page .espl-mobile-special-people .knowledge-slide__people{width:100%;max-width:none;justify-content:flex-start}#espl-project-page .espl-mobile-special-people .knowledge-person-row{display:flex;flex-wrap:nowrap;justify-content:flex-start;gap:8px;width:max-content}#espl-project-page .espl-mobile-special-people .knowledge-person__photo{width:70px;height:70px}#espl-project-page .project-outputs .publication-card .knowledge-output-media{padding:0 1.2rem 1.2rem;overflow-x:auto}#espl-project-page .project-outputs .publication-card[data-portraits] .knowledge-person__photo{width:70px;height:70px}}
    @media(max-width:767px){
      #espl-project-page .project-outputs .publication-card .knowledge-output-media,#espl-project-page .espl-special-card .espl-mobile-special-people{container-type:inline-size;--espl-mobile-circle-size:min(70px,calc((100cqw - 18px)/4));overflow:visible!important}
      #espl-project-page .project-outputs .publication-card .knowledge-output-media{padding:0 1.2rem 1.2rem!important}
      #espl-project-page .publication-card .espl-desktop-portraits{display:none!important}
      #espl-project-page .publication-card .espl-mobile-portraits{display:flex!important;width:100%!important;max-width:100%!important}
      #espl-project-page .espl-special-card .espl-mobile-special-people{display:flex!important;width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box}
      #espl-project-page .espl-special-card .espl-mobile-special-portraits{width:100%!important;max-width:100%!important}
      #espl-project-page :is(.espl-mobile-portraits,.espl-mobile-special-portraits) .knowledge-person-row{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:6px!important;width:100%!important;max-width:100%!important}
      #espl-project-page :is(.espl-mobile-portraits,.espl-mobile-special-portraits)[data-visible-count="1"] .knowledge-person-row,#espl-project-page :is(.espl-mobile-portraits,.espl-mobile-special-portraits)[data-visible-count="2"] .knowledge-person-row,#espl-project-page :is(.espl-mobile-portraits,.espl-mobile-special-portraits)[data-visible-count="3"] .knowledge-person-row{justify-content:flex-start!important}
      #espl-project-page :is(.espl-mobile-portraits,.espl-mobile-special-portraits) .knowledge-person{flex:0 0 var(--espl-mobile-circle-size)!important;width:var(--espl-mobile-circle-size)!important;height:var(--espl-mobile-circle-size)!important;min-width:0!important;max-width:70px!important}
      #espl-project-page :is(.espl-mobile-portraits,.espl-mobile-special-portraits) .knowledge-person__photo{display:grid!important;place-items:center!important;width:100%!important;height:100%!important}
    }
    @media(max-width:380px){#espl-project-page .espl-special-card .model-output-media{flex-wrap:wrap}#espl-project-page .espl-special-card .model-text-link{width:100%;font-size:11px}}
    @media(prefers-reduced-motion:reduce){#espl-project-page .espl-special-card :is(.model-polyhedron-canvas,.espl-table-icon,.model-link-arrow,.table-scan){animation:none!important;transition:none!important}}
  `;
  projectRoot.prepend(styles);

  const rowField = (row, name) => String(row?.[name] || '').trim();
  const typeOf = row => rowField(row, 'Type').toLowerCase();
  const special = row => /^(model|data repository)$/.test(typeOf(row));
  const publicationsCSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRN6Pc85vfaqu_XEU4MQC9HTGckmU9k5AXtSXuy8iOp5uPUcOrbJdI1Lmklqtqp4IpAdQoO3TtrEZuR/pub?output=csv';
  const projectsCSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT08-Yg6ATv7mk2BiEScmxTdevWRbNiJydlaR2WOdI-QOxtBsj-zeLdvSLmh4zNGNZIPYqjGSQu-gEg/pub?output=csv';
  const projectName = {sbi:'Space-based Interceptors and Strategic Stability',proximity:'How Close is Too Close',lunar:'Lunar Surface Coordination'}[slug];
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

  // Names and aliases for students come only from the published ESPL Students tabs.
  const authorKey = name => String(name || '').normalize('NFKD').replace(/\p{M}/gu,'').trim().toLowerCase();
  const authorPhoto = {
    [authorKey('Thomas G. Roberts')]:['biography','https://sites.gatech.edu/thomas-test-website/files/2026/01/ThomasGonzalezRoberts_yellow.jpg'],
  };
  const rosterBase='https://docs.google.com/spreadsheets/d/e/2PACX-1vREf4bo6ZknVw_ITND5Rtfe8RJufodwkihs9GZBf5p_7tlE5wwgDPcPd9jFjFa2wF4WJP296jhPuApz/pub?output=csv';
  async function loadAuthorRoster(){
    await Promise.all(['','&gid=466308581&single=true'].map(async suffix=>{
      const response=await fetch(`${rosterBase}${suffix}&refresh=${Date.now()}`,{cache:'no-store'});
      if(!response.ok)throw new Error(`Student roster returned ${response.status}`);
      for(const row of parseCSV(await response.text(),['Name','Anchor Name','Photo File'])){
        const anchor=rowField(row,'Anchor Name'),photo=rowField(row,'Photo File');
        if(!anchor||!photo)continue;
        const record=[anchor,new URL(photo.replace(/^\//,''),'https://sites.gatech.edu/thomas-test-website/').href];
        for(const name of [rowField(row,'Name'),...rowField(row,'Alternate Name(s)').split(/[,;]+/).map(x=>x.trim())])if(name)authorPhoto[authorKey(name)]=record;
      }
    }));
  }
  const safeURL = raw => { try { const url = new URL(String(raw || '').trim()); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch { return ''; } };
  const projectKey = value => String(value || '').normalize('NFKD').replace(/\p{M}/gu,'').trim().toLowerCase();
  const projectMatch = row => rowField(row,'Project(s)').split(/[,;\n]/).some(name => projectKey(name) === projectKey(projectName));
  const dateNumber = raw => {
    const value = String(raw || '').trim();
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
    if (m) return Date.UTC(Number(m[3]), Number(m[1])-1, Number(m[2]));
    const n = Date.parse(value);
    return Number.isFinite(n) ? n : -Infinity;
  };
  const formattedDate = raw => {
    const time = dateNumber(raw);
    return Number.isFinite(time) ? new Intl.DateTimeFormat('en-US',{timeZone:'UTC',year:'numeric',month:'long',day:'numeric'}).format(time) : String(raw || '').trim();
  };
  const externalIcon = () => '<span class="external-link-icon" aria-hidden="true"><svg viewBox="0 0 18 18"><path class="external-link-icon__box" d="M7.25 4.25H4.5A1.75 1.75 0 0 0 2.75 6v7.5a1.75 1.75 0 0 0 1.75 1.75H12a1.75 1.75 0 0 0 1.75-1.75v-2.75"/><g class="external-link-icon__arrow"><path d="M9.25 2.75h6v6"/><path d="m8 10 7.25-7.25"/></g></svg></span>';
  const documentIcon = '<svg viewBox="0 0 24 24"><path d="M6.5 3.5h8l3 3v14h-11z"/><path d="M14.5 3.5v3h3"/><path d="M9.5 11h5M9.5 14h5M9.5 17h3.5"/></svg>';
  const astronautPhoto = 'https://sites.gatech.edu/thomas-test-website/files/2026/09/Astronaut_gray.jpg';
  function parseCSV(text,required=['Title','Authors','Date','Type','URL','Project(s)','Featured']) {
    const rows=[]; let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i];
      if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
      else if(!quoted&&ch===','){row.push(cell);cell=''}
      else if(!quoted&&(ch==='\n'||ch==='\r')){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(value=>value.trim()))rows.push(row);row=[];cell=''}
      else cell+=ch;
    }
    row.push(cell);if(row.some(value=>value.trim()))rows.push(row);
    const [headers,...values]=rows;
    if (!headers || !required.every(name=>headers.includes(name))) throw new Error('Published sheet headers changed');
    return values.map((cells,index)=>({...Object.fromEntries(headers.map((name,i)=>[name.trim(),cells[i]||''])),_sheetOrder:index}));
  }
  function categoryNode(row) {
    const category=document.createElement('p');category.className='knowledge-slide__category';
    const icon=document.createElement('span');icon.className='knowledge-slide__category-icon';icon.setAttribute('aria-hidden','true');
    icon.innerHTML=typeOf(row)==='model'?'<svg viewBox="0 0 24 24"><path d="M4 3.5 19 12l-7 1.2-2.5 6.3z"/><path d="m12 13.2 3.4 6"/></svg>':typeOf(row)==='data repository'?'<svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M3.5 9h17M3.5 14h17M9 9v11M15 9v11"/></svg>':documentIcon;
    const label=typeOf(row)==='model'?'Interactive Model':typeOf(row)==='data repository'?'Data Repository':rowField(row,'Type');
    category.append(icon,document.createTextNode(label));return category;
  }
  function summaryNode(row,href) {
    const summary=document.createElement('div');summary.className='knowledge-slide__summary';
    const venue=rowField(row,'Publication or Venue');
    const authors=rowField(row,'Authors').replace(/,?\s+and\s+/gi,',').split(',').map(name=>name.trim()).filter(Boolean);
    if(venue||authors.length){
      const p=document.createElement('p');if(venue)p.append(document.createTextNode(venue));
      if(venue&&authors.length)p.append(document.createTextNode(' · '));
      authors.forEach((name,index)=>{
        if(index)p.append(document.createTextNode(index===authors.length-1?(authors.length>2?', and ':' and '):', '));
        const info=authorPhoto[authorKey(name)];
        if(info){const a=document.createElement('a');a.href=`https://espl.ae.gatech.edu/people/#${info[0]}`;a.textContent=name;a.className='espl-author-name';p.append(a)}
        else p.append(document.createTextNode(name));
      });
      summary.append(p);
    }
    const date=rowField(row,'Date');
    if(date){const link=document.createElement('a');link.className='external-metadata-link';link.href=href;link.textContent=formattedDate(date);link.insertAdjacentHTML('beforeend',externalIcon());summary.append(link)}
    return summary;
  }
  function portraitsNode(row) {
    const names=rowField(row,'Authors').replace(/,?\s+and\s+/gi,',').split(',').map(name=>name.trim()).filter(Boolean);
    const people=document.createElement('div');people.className='knowledge-slide__people espl-desktop-portraits';people.dataset.authorCount=String(names.length);
    const holder=document.createElement('div');holder.className='knowledge-person-row';
    const selected=names.length>5?names.slice(0,4):names.slice();
    if(names.length>5){
      const thomas=names.find(name=>authorKey(name)==='thomas g. roberts'||authorKey(name)==='thomas gonzalez roberts');
      if(thomas&&!selected.includes(thomas)){selected.pop();selected.push(thomas)}
    }
    for(const name of selected){
      const info=authorPhoto[authorKey(name)];
      const a=document.createElement(info?'a':'span');a.className='knowledge-person';if(info)a.href=`https://espl.ae.gatech.edu/people/#${info[0]}`;a.title=name;
      if(info){const img=document.createElement('img');img.className='knowledge-person__photo';img.src=info[1];img.alt=name;img.loading='lazy';a.append(img)}
      else{const initials=document.createElement('span');initials.className='knowledge-person__photo';initials.textContent=name.split(/\s+/).map(part=>part[0]).slice(0,2).join('');initials.setAttribute('aria-label',name);a.append(initials)}
      holder.append(a);
    }
    if(names.length>5){const more=document.createElement('span');more.className='knowledge-person espl-author-overflow';more.title=names.filter(name=>!selected.includes(name)).join(', ');more.textContent=`+${names.length-selected.length}`;holder.append(more)}
    if(!holder.childElementCount)return null;
    people.append(holder);return people;
  }
  function mobilePortraitsNode(row,kind='espl-mobile-portraits'){
    const names=rowField(row,'Authors').replace(/,?\s+and\s+/gi,',').split(',').map(name=>name.trim()).filter(Boolean);
    if(!names.length)return null;
    const indices=names.length>4?[0,1,2]:names.map((_,index)=>index);
    const thomasIndex=names.findIndex(name=>/^(thomas g\.? roberts|thomas gonzalez roberts)$/.test(authorKey(name)));
    const firstTwoHaveStudent=names.slice(0,2).some(name=>{
      const photo=authorPhoto[authorKey(name)];return photo&&photo[0]!=='biography';
    });
    if(names.length>4&&thomasIndex>2&&!firstTwoHaveStudent)indices[2]=thomasIndex;
    const hidden=names.filter((_,index)=>!indices.includes(index));
    const people=document.createElement('div');people.className=`knowledge-slide__people ${kind}`;people.dataset.authorCount=String(names.length);people.dataset.visibleCount=String(indices.length+(hidden.length?1:0));
    const holder=document.createElement('div');holder.className='knowledge-person-row';
    for(const index of indices){
      const name=names[index];
      const info=authorPhoto[authorKey(name)],person=document.createElement(info?'a':'span');
      person.className='knowledge-person'+(info?'':' knowledge-person--fallback');person.title=name;
      if(info)person.href=`https://espl.ae.gatech.edu/people/#${info[0]}`;
      const photo=document.createElement('img');photo.className='knowledge-person__photo';photo.src=info?.[1]||astronautPhoto;photo.alt=name;photo.loading='lazy';person.append(photo);holder.append(person);
    }
    if(hidden.length){const more=document.createElement('span');more.className='knowledge-person espl-author-overflow';more.title=hidden.join(', ');more.textContent=`+${hidden.length}`;holder.append(more)}
    people.append(holder);return people;
  }
  function mobileSpecialPortraitsNode(row){
    const people=mobilePortraitsNode(row,'espl-mobile-special-portraits');
    if(!people)return null;
    const media=document.createElement('div');media.className='knowledge-output-media espl-mobile-special-people';media.append(people);return media;
  }
  function makeCard(row) {
    const href=safeURL(rowField(row,'URL')),isSpecial=special(row),model=typeOf(row)==='model';
    if(!href)return null;
    const card=document.createElement('article');
    card.className=`knowledge-output-card ${isSpecial?'model-card espl-special-card '+(model?'archive-model-card':'data-repository-card'):'publication-card'} is-clickable`;
    card.dataset.publicationSource='published-sheet';
    if(isSpecial)card.dataset.archiveType=model?'model':'data-repository';
    const main=document.createElement('div');main.className='knowledge-output-main';
    const title=document.createElement('h3');title.className='knowledge-slide__title';
    const titleLink=document.createElement('a');titleLink.className='knowledge-slide__title-link';titleLink.href=href;titleLink.textContent=rowField(row,'Title');title.append(titleLink);
    main.append(categoryNode(row),title);
    if(isSpecial){const summary=summaryNode(row,href);summary.classList.add('espl-mobile-special-summary');main.append(summary)}
    else main.append(summaryNode(row,href));
    card.append(main);
    if(isSpecial){
      const media=document.createElement('div');media.className='knowledge-output-media model-output-media';
      const iconLink=document.createElement('a');iconLink.href=href;iconLink.className=model?'model-polyhedron-link':'espl-table-icon-link';
      iconLink.setAttribute('aria-label',model?'Explore the interactive model':'Explore the data');
      if(model){const canvas=document.createElement('canvas');canvas.className='model-polyhedron-canvas';canvas.setAttribute('aria-hidden','true');iconLink.append(canvas);mountPolyhedron(canvas)}
      else iconLink.innerHTML=tableIcon();
      const action=document.createElement('a');action.href=href;action.className='model-text-link';
      const label=document.createElement('span');label.className='model-link-label-text';label.textContent=model?'Explore the interactive model':'Explore the data';
      const arrow=document.createElement('span');arrow.className='model-link-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='→';
      action.append(label,arrow);media.append(iconLink,action);card.append(media);
      const mobilePeople=mobileSpecialPortraitsNode(row);if(mobilePeople)card.append(mobilePeople);
      if(model){
        card.addEventListener('mouseenter',()=>iconLink.dispatchEvent(new Event('mouseenter')));
        card.addEventListener('mouseleave',()=>iconLink.dispatchEvent(new Event('mouseleave')));
        card.addEventListener('focusin',()=>iconLink.dispatchEvent(new Event('focusin')));
        card.addEventListener('focusout',()=>iconLink.dispatchEvent(new Event('focusout')));
      }
    } else {
      const portraits=portraitsNode(row);
      if(portraits){const media=document.createElement('div');media.className='knowledge-output-media';media.append(portraits);const mobilePortraits=mobilePortraitsNode(row);if(mobilePortraits)media.append(mobilePortraits);card.dataset.portraits=portraits.querySelectorAll('img').length;card.append(media)}
      else card.classList.add('no-portraits');
    }
    card.addEventListener('click',event=>{if(event.target.closest('a,button')||String(getSelection()||''))return;location.href=href});
    return card;
  }
  let featuredRow=null;
  const frames=()=>[...projectRoot.querySelectorAll('.espl-sbi-banner-embed iframe,.espl-sbi-mobile-cta iframe,.espl-proximity-banner-embed iframe,.moon-banner-embed iframe')];
  function updateHeroFrame(frame) {
    let doc;try{doc=frame.contentDocument}catch{return}
    if(!doc?.body)return;
    for(const old of doc.querySelectorAll('#espl-proximity-table-link')) old.remove();
    const native=doc.querySelector('.model-link');
    doc.getElementById('espl-featured-hero-link')?.remove();
    if(!featuredRow){native?.remove();return;}
    const href=safeURL(rowField(featuredRow,'URL'));if(!href)return;
    const model=typeOf(featuredRow)==='model',repository=typeOf(featuredRow)==='data repository';
    const label=model?'Explore the interactive model':repository?'Explore the data':'Read the publication';
    if(native&&model){native.href=href;native.setAttribute('aria-label',label);native.style.removeProperty('visibility');native.dispatchEvent(new doc.defaultView.Event('mouseleave'));native.classList.remove('is-arrived','is-open');doc.defaultView.setTimeout(()=>{native.classList.add('is-arrived');native.dispatchEvent(new doc.defaultView.Event('mouseenter'));doc.defaultView.setTimeout(()=>native.dispatchEvent(new doc.defaultView.Event('mouseleave')),4800)},250);return}
    native?.remove();
    const banner=doc.querySelector('main.banner,.banner')||doc.body;
    if(!doc.getElementById('espl-featured-hero-style')){
      const style=doc.createElement('style');style.id='espl-featured-hero-style';style.textContent=`
        #espl-featured-hero-link{position:absolute;left:max(6%,calc((100% - 1080px)/2 + 28px));bottom:10px;z-index:9;display:flex;align-items:center;width:max-content;max-width:calc(100% - 12%);height:46px;pointer-events:auto;color:#555;text-decoration:none;visibility:hidden;opacity:0;transform:translateY(72px);transition:transform .7s cubic-bezier(.16,1,.3,1),opacity .25s ease}
        #espl-featured-hero-link.is-arrived{visibility:visible;opacity:1;transform:translateY(0)}
        #espl-featured-hero-link .featured-icon{display:grid;place-items:center;width:46px;height:46px;flex:none}
        #espl-featured-hero-link .featured-icon :is(svg,canvas){display:block;width:46px;height:46px}
        #espl-featured-hero-link .featured-icon .table-scan{opacity:.25}
        #espl-featured-hero-link:is(:hover,:focus-visible,.is-open) .table-scan{opacity:.8;animation:espl-featured-scan 1.15s ease-in-out 1}
        #espl-featured-hero-link .featured-label{display:flex;align-items:center;min-width:0;height:46px;padding-left:10px;white-space:nowrap;opacity:0;clip-path:inset(0 100% 0 0);color:#666;font:400 clamp(11px,1.05vw,15px)/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;transition:clip-path .5s cubic-bezier(.2,.8,.2,1),opacity .25s ease}
        #espl-featured-hero-link:is(:hover,:focus-visible,.is-open) .featured-label{opacity:1;clip-path:inset(0)}
        #espl-featured-hero-link .featured-arrow{display:inline-block;margin-left:7px;transition:transform .25s ease}
        #espl-featured-hero-link:is(:hover,:focus-visible) .featured-arrow{animation:espl-featured-arrow-nudge .7s ease}
        #espl-featured-hero-link:focus-visible{outline:2px solid rgba(180,145,35,.9);outline-offset:4px}
        @keyframes espl-featured-scan{0%,100%{transform:translateY(0)}50%{transform:translateY(25px)}}
        @keyframes espl-featured-arrow-nudge{0%,100%{transform:translateX(0)}45%{transform:translateX(4px)}70%{transform:translateX(-1px)}}
        @media(max-width:767px){#espl-featured-hero-link:not(.is-mobile-cta){display:none}}
        @media(prefers-reduced-motion:reduce){#espl-featured-hero-link,#espl-featured-hero-link .featured-label,#espl-featured-hero-link .table-scan{animation:none!important;transition:none!important}}
      `;doc.head.append(style);
    }
    const link=doc.createElement('a');link.id='espl-featured-hero-link';link.href=href;link.target='_top';link.setAttribute('aria-label',label);
    if(frame.closest('.espl-sbi-mobile-cta')){link.classList.add('is-mobile-cta');link.style.top='10px';link.style.bottom='auto';link.style.left='6px'}
    const icon=doc.createElement('span');icon.className='featured-icon';icon.setAttribute('aria-hidden','true');
    if(model){const canvas=doc.createElement('canvas');canvas.className='model-polyhedron-canvas';icon.append(canvas);mountPolyhedron(canvas)}
    else if(repository)icon.innerHTML=tableIcon();
    else icon.innerHTML=documentIcon;
    const text=doc.createElement('span');text.className='featured-label';text.append(doc.createTextNode(label));const arrow=doc.createElement('span');arrow.className='featured-arrow';arrow.textContent='→';text.append(arrow);
    link.append(icon,text);banner.append(link);
    const position=()=>{
      if(frame.closest('.espl-sbi-mobile-cta'))return;
      const rect=frame.getBoundingClientRect();
      let bottom=window.visualViewport?.height||window.innerHeight;
      if(window.frameElement){const outer=window.frameElement.getBoundingClientRect();bottom=Math.min(bottom,window.parent.innerHeight-outer.top)}
      link.style.top=`${Math.max(10,Math.min(rect.height-56,bottom-rect.top-56))}px`;
      link.style.bottom='auto';
    };
    position();
    frame._esplHeroCleanup?.();
    window.addEventListener('scroll',position,{passive:true});window.addEventListener('resize',position);
    frame._esplHeroCleanup=()=>{window.removeEventListener('scroll',position);window.removeEventListener('resize',position)};
    const reduced=doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reveal=()=>{link.classList.add('is-open');icon.dispatchEvent(new doc.defaultView.Event('mouseenter'));};
    const retract=()=>{if(link.matches(':hover')||doc.activeElement===link)return;link.classList.remove('is-open');icon.dispatchEvent(new doc.defaultView.Event('mouseleave'))};
    link.addEventListener('mouseenter',reveal);link.addEventListener('focusin',reveal);link.addEventListener('mouseleave',retract);link.addEventListener('focusout',retract);
    doc.defaultView.setTimeout(()=>{link.classList.add('is-arrived');if(!reduced)doc.defaultView.setTimeout(()=>{reveal();doc.defaultView.setTimeout(retract,4800)},180)},250);
    const timer=doc.defaultView.setInterval(()=>{if(reduced||doc.hidden||link.classList.contains('is-open'))return;reveal();doc.defaultView.setTimeout(retract,4200)},16000);
    frame._esplHeroTimer&&doc.defaultView.clearInterval(frame._esplHeroTimer);frame._esplHeroTimer=timer;
  }
  function installHeroAction(row) {
    featuredRow=row;
    for(const frame of frames()){
      if(!frame.dataset.esplFeaturedBound){frame.dataset.esplFeaturedBound='true';frame.addEventListener('load',()=>updateHeroFrame(frame))}
      updateHeroFrame(frame);
    }
  }
  function installProjectNavigation(){
    if(projectRoot.querySelector('.espl-project-nav'))return;
    const fallback=[
      {slug:'sbi',title:'Space-based Interceptors and Strategic Stability'},
      {slug:'lunar',title:'Lunar Surface Coordination'},
      {slug:'proximity',title:'How Close is Too Close'}
    ];
    const nav=document.createElement('nav');nav.className='espl-project-nav theme-nav';nav.setAttribute('aria-label','Other projects');
    const link=(project,direction)=>{const a=document.createElement('a');a.className=`theme-${direction}`;a.href=project.url||`https://espl.ae.gatech.edu/research/projects/${project.slug}/`;const full=document.createElement('span');full.className='theme-label-full';full.textContent=project.title;const short=document.createElement('span');short.className='theme-label-short';short.textContent=direction==='prev'?'Previous':'Next';if(direction==='prev')a.append('← ',full,short);else a.append(full,short,' →');return a};
    const setLinks=projects=>{const index=projects.findIndex(project=>project.slug===slug);if(index<0||projects.length<2)return;nav.replaceChildren(link(projects[(index+projects.length-1)%projects.length],'prev'),link(projects[(index+1)%projects.length],'next'))};
    const style=document.createElement('style');style.textContent=`
      #espl-project-page .espl-project-nav{display:flex;justify-content:space-between;max-width:1080px;margin:0 auto 56px;padding:24px 28px 0;border-top:1px solid #e6e6e6;font-family:Roboto,system-ui,-apple-system,Segoe UI,'Helvetica Neue',Arial,sans-serif;flex-wrap:wrap;gap:1rem}
      #espl-project-page .espl-project-nav a{display:inline-flex;align-items:center;gap:.35em;text-decoration:none!important;font-size:16px;color:#a4925a!important;padding:.5rem 1rem;transition:background-color .2s ease,color .2s ease;border-radius:999px;white-space:nowrap}
      #espl-project-page .espl-project-nav a:hover,#espl-project-page .espl-project-nav a:focus-visible{background-color:#f0f0f0;color:#000!important;text-decoration:none!important}
      #espl-project-page .espl-project-nav .theme-next{margin-left:auto}
      #espl-project-page .espl-project-nav .theme-label-short{display:none}
      @media(max-width:767px){#espl-project-page .espl-project-nav{padding:20px 24px 0;gap:.5rem}#espl-project-page .espl-project-nav a{font-size:13px;white-space:normal;max-width:48%}#espl-project-page .espl-project-nav .theme-label-full{display:none}#espl-project-page .espl-project-nav .theme-label-short{display:inline}}
    `;
    projectRoot.append(style,nav);
    setLinks(fallback);
    fetch(`${projectsCSV}&refresh=${Date.now()}`,{cache:'no-store',credentials:'omit'})
      .then(response=>{if(!response.ok)throw new Error(`Projects sheet returned ${response.status}`);return response.text()})
      .then(text=>{
        const projects=parseCSV(text,['Slug','Title','Fallback Image'])
          .filter(row=>rowField(row,'Fallback Image')&&/^[a-z0-9-]+$/.test(rowField(row,'Slug'))&&rowField(row,'Title'))
          .map(row=>({slug:rowField(row,'Slug'),title:rowField(row,'Title'),url:safeURL(rowField(row,'Project URL')||rowField(row,'URL')||rowField(row,'Link'))}));
        setLinks(projects);
      }).catch(error=>console.warn('Project navigation order unavailable; using the last published order.',error));
  }
  async function installResearchCards() {
    const container=projectRoot.querySelector('.project-publications');
    if(!container)return;
    let desired=[];
    let allCards=[],page=0;
    const pageSize=5;
    const pager=document.createElement('nav');pager.className='espl-project-publication-pager';pager.setAttribute('aria-label','Research updates pages');pager.hidden=true;container.after(pager);
    const showPage=()=>{
      const pages=Math.max(1,Math.ceil(allCards.length/pageSize));page=Math.max(0,Math.min(page,pages-1));
      desired=allCards.slice(page*pageSize,(page+1)*pageSize);reconcile();
      pager.hidden=pages<=1;pager.replaceChildren();
      if(pages<=1)return;
      const button=(label,target,disabled=false,current=false)=>{const control=document.createElement('button');control.type='button';control.textContent=label;control.disabled=disabled;if(current)control.setAttribute('aria-current','page');control.addEventListener('click',()=>{page=target;showPage();container.scrollIntoView({block:'start',behavior:'smooth'})});return control};
      pager.append(button('Prev',page-1,page===0));
      for(let number=0;number<pages;number++)pager.append(button(String(number+1),number,false,number===page));
      pager.append(button('Next',page+1,page===pages-1));
    };
    let queued=false;
    const reconcile=()=>{
      if(desired.length!==container.children.length||desired.some((node,index)=>container.children[index]!==node))container.replaceChildren(...desired);
      const group=container.closest('.project-publications-group');if(group)group.hidden=!desired.length;
    };
    new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(()=>{queued=false;reconcile()})}}).observe(container,{childList:true});
    container.removeAttribute('data-espl-publications-ready');
    container.replaceChildren();
    installHeroAction(null);
    let records;
    try{
      const response=await fetch(`${publicationsCSV}&refresh=${Date.now()}`,{cache:'no-store',credentials:'omit'});
      if(!response.ok)throw new Error(`Publications sheet returned ${response.status}`);
      records=parseCSV(await response.text());
      try{await loadAuthorRoster()}catch(error){console.warn('Student author photos unavailable.',error)}
    }catch(error){
      console.warn('Project research updates could not load from the published Publications sheet.',error);
      const notice=document.createElement('p');notice.textContent='Research updates are temporarily unavailable.';allCards=[notice];showPage();
      container.dataset.esplPublicationsReady='true';
      return;
    }
    const relevant=records.filter(row=>projectMatch(row)&&safeURL(rowField(row,'URL'))&&rowField(row,'Title'));
    const byDate=(a,b)=>dateNumber(rowField(b,'Date'))-dateNumber(rowField(a,'Date'))||a._sheetOrder-b._sheetOrder;
    const featured=relevant.filter(row=>/^(true|yes|1)$/i.test(rowField(row,'Featured'))).sort(byDate)[0]||null;
    const ordered=[...(featured?[featured]:[]),...relevant.filter(row=>row!==featured).sort(byDate)];
    allCards=ordered.map(makeCard).filter(Boolean);
    showPage();
    container.dataset.esplPublicationsReady='true';
    installHeroAction(featured);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installProjectNavigation();installResearchCards()},{once:true});
  else {installProjectNavigation();installResearchCards()}
})();
