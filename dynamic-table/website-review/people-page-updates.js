/* Add after the People page block. Keep every research-card author on one line. */
(() => {
  const root = document.getElementById('espl-people-page');
  if (!root || document.getElementById('espl-people-author-row-style')) return;
  const style = document.createElement('style');
  style.id = 'espl-people-author-row-style';
  style.textContent = `
    @media(max-width:700px){
      #espl-people-page #studentOverlay.overlay{--biocard-inset:max(16px,env(safe-area-inset-top),env(safe-area-inset-bottom));top:0;bottom:auto;height:100vh;height:100dvh;min-height:0;box-sizing:border-box;padding:var(--biocard-inset) 8px!important}
      #espl-people-page #studentOverlay .overlay-content{width:100%;max-height:100%;min-height:0;overflow-y:auto}
      #espl-people-page #studentOverlay .overlay-controls{top:0;z-index:6;background:#fff}
    }
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

/* Student bio contacts come from the published Students tab, columns I–K. */
(() => {
  const root = document.getElementById('espl-people-page');
  const overlay = document.getElementById('studentOverlay');
  const nameNode = document.getElementById('overlayName');
  const titleNode = document.getElementById('overlayTitle');
  if (!root || !overlay || !nameNode || !titleNode) return;

  const style = document.createElement('style');
  style.textContent = `
    #espl-people-page #studentOverlay .profile-head .profile-photo{flex:0 0 var(--espl-student-photo-size,218px)!important;width:var(--espl-student-photo-size,218px)!important;height:var(--espl-student-photo-size,218px)!important}
    #espl-people-page #studentOverlay .profile-head{align-items:stretch}
    #espl-people-page #studentOverlay .profile-head-copy{display:flex;flex-direction:column;align-items:flex-start;min-height:var(--espl-student-photo-size,218px);padding-top:36px}
    #espl-people-page #studentOverlay .espl-student-socials{display:flex;gap:9px;margin:auto 0 0;padding:14px 0 0;list-style:none}
    #espl-people-page #studentOverlay .espl-student-socials li{margin:0;padding:0;list-style:none}
    #espl-people-page #studentOverlay .student-bio a,#espl-people-page #studentOverlay .student-bio a:visited,#espl-people-page #studentOverlay .student-bio a:hover,#espl-people-page #studentOverlay .student-bio a:focus-visible{color:#252525!important;text-decoration:underline!important;text-decoration-color:#252525!important;text-underline-offset:2px}
    #espl-people-page #studentOverlay .knowledge-slide__summary a[href*="/people/"],#espl-people-page #studentOverlay .knowledge-slide__summary a[href*="/people/"]:is(:visited,:hover,:focus-visible){color:#252525!important;text-decoration:underline!important;text-decoration-color:#252525!important;text-underline-offset:2px;transition:none!important}
    @media(max-width:700px){
      #espl-people-page #studentOverlay .profile-head{display:grid!important;grid-template-columns:minmax(0,1fr)!important;justify-items:center!important;align-items:start!important;gap:12px!important;text-align:center!important}
      #espl-people-page #studentOverlay .profile-head .profile-photo{flex:none!important;width:var(--espl-student-photo-size,218px)!important;height:var(--espl-student-photo-size,218px)!important;margin:0 auto!important}
      #espl-people-page #studentOverlay .profile-head-copy{width:100%!important;min-height:0!important;align-items:center!important;padding-top:0!important;text-align:center!important}
      #espl-people-page #studentOverlay .espl-student-socials{justify-content:center!important;margin:12px auto 0!important;padding-top:0!important}
    }
  `;
  root.prepend(style);

  function parseCSV(text) {
    const rows=[]; let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i];
      if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
      else if(!quoted&&ch===','){row.push(cell);cell=''}
      else if(!quoted&&(ch==='\n'||ch==='\r')){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(value=>value.trim()))rows.push(row);row=[];cell=''}
      else cell+=ch;
    }
    row.push(cell);if(row.some(value=>value.trim()))rows.push(row);
    return rows;
  }
  const records = new Map();
  const facultyIcons = Object.fromEntries(['Email','Website','LinkedIn'].map(kind=>[kind,root.querySelector(`.faculty-socials a[title="${kind}"] svg`)]));
  const webURL = raw => {try{const url=new URL(String(raw||'').trim());return /^https?:$/.test(url.protocol)?url.href:''}catch{return ''}};
  function contactIcon(kind,href,name){
    const item=document.createElement('li'),link=document.createElement('a');
    link.href=href;link.title=kind;link.setAttribute('aria-label',`${kind==='Email'?'Email':kind==='Website'?'Visit the website of':'Visit the LinkedIn profile of'} ${name}`);
    if(kind!=='Email'){link.target='_blank';link.rel='noopener noreferrer'}
    const icon=facultyIcons[kind];if(icon)link.append(icon.cloneNode(true));
    item.append(link);return item;
  }
  function sync(){
    const name=nameNode.textContent.trim();
    if(!name)return;
    const row=records.get(name.toLowerCase());
    const card=[...root.querySelectorAll('.student-card')].find(item=>item.querySelector('.student-name')?.textContent.trim()===name);
    const cardPhoto=card?.querySelector('.student-photo');
    if(cardPhoto){const size=cardPhoto.getBoundingClientRect().width;overlay.style.setProperty('--espl-student-photo-size',`${Math.round(size)}px`)}
    titleNode.parentElement.querySelector('.espl-student-socials')?.remove();
    if(!row)return;
    const list=document.createElement('ul');list.className='faculty-socials wp-block-social-links espl-student-socials';list.setAttribute('aria-label',`${name} contact links`);
    const email=String(row['GT Email']||'').trim().replace(/^mailto:/i,'');
    if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))list.append(contactIcon('Email',`mailto:${email}`,name));
    const website=webURL(row['Personal Website or Other Web Link']);
    if(website)list.append(contactIcon('Website',website,name));
    const linkedin=webURL(row['LinkedIn Profile']);
    if(linkedin)list.append(contactIcon('LinkedIn',linkedin,name));
    if(list.childElementCount)titleNode.after(list);
  }
  new MutationObserver(sync).observe(nameNode,{childList:true,characterData:true,subtree:true});
  addEventListener('resize',sync);
  const roster='https://docs.google.com/spreadsheets/d/e/2PACX-1vREf4bo6ZknVw_ITND5Rtfe8RJufodwkihs9GZBf5p_7tlE5wwgDPcPd9jFjFa2wF4WJP296jhPuApz/pub?output=csv';
  for(const suffix of ['', '&gid=466308581&single=true']){
    fetch(`${roster}${suffix}&refresh=${Date.now()}`,{cache:'no-store'})
      .then(response=>{if(!response.ok)throw new Error(`Student sheet returned ${response.status}`);return response.text()})
      .then(text=>{
        const [header,...rows]=parseCSV(text);
        for(const values of rows){const row=Object.fromEntries(header.map((key,i)=>[key.trim(),values[i]||'']));const name=String(row.Name||'').trim().toLowerCase();if(name)records.set(name,row)}
        sync();
      }).catch(error=>console.warn('Student contact links unavailable.',error));
  }
})();
