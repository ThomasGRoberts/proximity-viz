/* Share portrait geometry and author overflow across project mini cards. */
(() => {
  const root=document.querySelector('#espl-research-projects,#espl-people-page,#espl-area-page,#espl-project-page');
  if(!root||root.dataset.esplMiniAuthors==='ready')return;
  root.dataset.esplMiniAuthors='ready';
  const style=document.createElement('style');
  style.textContent=`
    #espl-research-projects .project-tile .people-list,#espl-people-page .project-tile .people-list,#espl-area-page .project-tile .people-list,#espl-project-page .project-tile .people-list{display:flex!important;flex-wrap:nowrap!important;align-items:center!important;width:100%!important;gap:8px!important}
    #espl-research-projects .project-tile .people-list[data-full-slate="true"],#espl-people-page .project-tile .people-list[data-full-slate="true"],#espl-area-page .project-tile .people-list[data-full-slate="true"],#espl-project-page .project-tile .people-list[data-full-slate="true"]{justify-content:space-evenly!important;gap:0!important}
    #espl-research-projects .project-tile .people-block,#espl-people-page .project-tile .people-block,#espl-area-page .project-tile .people-block,#espl-project-page .project-tile .people-block{width:100%!important;min-height:calc(var(--espl-mini-photo,70px) + 4px)!important}
    #espl-research-projects .project-tile .portrait-link,#espl-people-page .project-tile .portrait-link,#espl-area-page .project-tile .portrait-link,#espl-project-page .project-tile .portrait-link{flex:0 0 var(--espl-mini-photo)!important;width:var(--espl-mini-photo)!important;height:var(--espl-mini-photo)!important}
    #espl-research-projects .project-tile .portrait-link img,#espl-people-page .project-tile .portrait-link img,#espl-area-page .project-tile .portrait-link img,#espl-project-page .project-tile .portrait-link img{width:100%!important;height:100%!important}
    .project-tile .espl-mini-author-overflow{display:grid;place-items:center;flex:0 0 var(--espl-mini-photo);width:var(--espl-mini-photo);height:var(--espl-mini-photo);border-radius:50%;background:radial-gradient(circle closest-side,#d9d9d9 calc(100% - 4px),transparent calc(100% - 3px));color:#4e4e4e;font:700 11px/1 Roboto,Arial,sans-serif;transform:translateY(3px)}
    @media(max-width:767px){#espl-people-page #studentOverlay .project-tile .people-block{margin-top:12px!important}}
  `;
  document.head.append(style);
  const observer=new ResizeObserver(entries=>entries.forEach(entry=>fit(entry.target)));
  function fit(list){
    if(!list.isConnected)return;
    if(!list._esplOriginalAuthors)list._esplOriginalAuthors=[...list.children].filter(node=>node.classList.contains('portrait-link'));
    const authors=list._esplOriginalAuthors;
    if(!authors.length)return;
    const mobile=matchMedia('(max-width:767px)').matches;
    const fourOnMobile=Boolean(list.closest('#studentOverlay,#espl-area-page,#espl-project-page'));
    const slots=mobile&&fourOnMobile?4:5;
    const width=list.getBoundingClientRect().width;
    if(width<40)return;
    const size=Math.min(70,Math.max(32,(width-8*(slots-1))/slots));
    list.style.setProperty('--espl-mini-photo',`${size}px`);
    const visible=authors.length>slots?slots-1:Math.min(authors.length,slots);
    const key=`${slots}:${visible}:${Math.round(width)}`;
    if(list.dataset.esplMiniFit===key)return;
    list.dataset.esplMiniFit=key;
    list.replaceChildren(...authors.slice(0,visible));
    const omitted=authors.length-visible;
    if(omitted){const more=document.createElement('span');more.className='espl-mini-author-overflow';more.textContent=`+${omitted}`;more.setAttribute('aria-label',`${omitted} more contributors`);list.append(more)}
    list.dataset.fullSlate=String(authors.length>=slots);
  }
  function scan(){
    root.querySelectorAll('.project-tile .people-list').forEach(list=>{
      if(!list._esplObserved){list._esplObserved=true;observer.observe(list)}
      fit(list);
    });
  }
  let scheduled=false;
  new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;scan()})}}).observe(root,{childList:true,subtree:true});
  window.addEventListener('resize',scan);
  scan();
})();
