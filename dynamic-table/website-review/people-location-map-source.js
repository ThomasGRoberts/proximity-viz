/* Read-only city locator using the SBI threat-detail map's projection,
   geographic fit, boundary treatment, marker and coordinate conventions. */
function createESPLScenarioMarker(parent,x,y){
  const ns='http://www.w3.org/2000/svg',marker=document.createElementNS(ns,'g');
  marker.setAttribute('class','scenarioMapMarker is-selected');marker.setAttribute('transform',`translate(${x} ${y})`);
  for(const [name,radius] of [['scenarioMapMarkerPulse',7],['scenarioMapMarkerCore',2.3]]){
    const circle=document.createElementNS(ns,'circle');circle.setAttribute('class',name);circle.setAttribute('r',String(radius));marker.append(circle);
  }
  parent.append(marker);return marker;
}
function createESPLScenarioLocator(svg,geo,options={}){
  const {geoMercator,geoPath,geoCircle}=geo;
  const width=291,height=176;
  const ns='http://www.w3.org/2000/svg';
  const node=(name,attributes={})=>{const e=document.createElementNS(ns,name);Object.entries(attributes).forEach(([key,value])=>e.setAttribute(key,String(value)));return e;};
  const key=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  let aliases=[];
  const featureMatchesThreatRegion=name=>aliases.includes(key(name));
function collectCoordinatesFromGeometry(geometry, longitudes, latitudes = null) {
  if (!geometry) return;
  if (geometry.type === "GeometryCollection") {
    geometry.geometries?.forEach(item => collectCoordinatesFromGeometry(item, longitudes, latitudes));
    return;
  }

  const visit = coordinates => {
    if (!Array.isArray(coordinates)) return;
    if (typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
      longitudes.push(coordinates[0]);
      latitudes?.push(coordinates[1]);
      return;
    }
    coordinates.forEach(visit);
  };
  visit(geometry.coordinates);
}

function getCircularLongitudeStats(features) {
  const longitudes = [];
  features.forEach(feature => collectCoordinatesFromGeometry(feature.geometry, longitudes));
  if (longitudes.length === 0) return { center: 0, span: 0 };

  const values = [...new Set(longitudes.map(longitude => ((longitude % 360) + 360) % 360))]
    .sort((a, b) => a - b);
  if (values.length === 1) {
    return { center: values[0] > 180 ? values[0] - 360 : values[0], span: 0 };
  }

  let largestGap = -1;
  let arcStart = values[0];
  values.forEach((value, index) => {
    const next = index === values.length - 1 ? values[0] + 360 : values[index + 1];
    const gap = next - value;
    if (gap > largestGap) {
      largestGap = gap;
      arcStart = next % 360;
    }
  });

  const span = 360 - largestGap;
  const center = (arcStart + span / 2) % 360;
  return { center: center > 180 ? center - 360 : center, span };
}

function getBoundaryDetailSelection(worldFeatures, threatRegion) {
  const focusFeatures = worldFeatures.filter(feature =>
    featureMatchesThreatRegion(feature.properties?.name || "", threatRegion)
  );
  if (focusFeatures.length === 0) return { detail: "standard", effectiveSpan: Infinity };

  const longitudes = [];
  const latitudes = [];
  focusFeatures.forEach(feature => {
    collectCoordinatesFromGeometry(feature.geometry, longitudes, latitudes);
  });
  if (latitudes.length === 0) return { detail: "standard", effectiveSpan: Infinity };
  const { span: longitudeSpan } = getCircularLongitudeStats(focusFeatures);
  const minimumLatitude = Math.min(...latitudes);
  const maximumLatitude = Math.max(...latitudes);
  const latitudeSpan = maximumLatitude - minimumLatitude;
  const middleLatitude = (minimumLatitude + maximumLatitude) / 2;
  const latitudeAdjustedWidth = longitudeSpan * Math.cos(middleLatitude * Math.PI / 180);
  const effectiveSpan = Math.max(latitudeAdjustedWidth, latitudeSpan);

  return {
    detail: effectiveSpan <= 25 ? "detailed" : "standard",
    effectiveSpan
  };
}


  function render(location,label,countryAliases,worldFeatures){
    aliases=countryAliases.map(key);
    const focusFeatures=worldFeatures.filter(feature=>featureMatchesThreatRegion(feature.properties?.name||''));
    const selection=getBoundaryDetailSelection(worldFeatures,'');
    // Large countries use a city-centered regional extent; small countries
    // retain the complete threat-map country outline with surrounding context.
    const regional=selection.effectiveSpan>25||!focusFeatures.length;
    const fitFeatures=regional?[{type:'Feature',geometry:geoCircle().center([location.lon,location.lat]).radius(9).precision(2)()}]:focusFeatures;
    const centralLongitude=getCircularLongitudeStats(fitFeatures).center;
    const projection=geoMercator().rotate([-centralLongitude,0]);
    projection.fitExtent([[16,14],[width-16,height-14]],{type:'FeatureCollection',features:fitFeatures});
    // Center the actual city and, if necessary, reduce scale enough to retain
    // the complete small-country outline inside the SBI map's inner margins.
    function centerCity(){const point=projection([location.lon,location.lat]),translate=projection.translate();projection.translate([translate[0]+width/2-point[0],translate[1]+height/2-point[1]]);}
    centerCity();
    if(!regional){
      const bounds=geoPath(projection).bounds({type:'FeatureCollection',features:fitFeatures});
      const cx=width/2,cy=height/2;
      const ratio=Math.min(1,(cx-16)/Math.max(.001,cx-bounds[0][0]),(width-16-cx)/Math.max(.001,bounds[1][0]-cx),(cy-14)/Math.max(.001,cy-bounds[0][1]),(height-14-cy)/Math.max(.001,bounds[1][1]-cy));
      projection.scale(projection.scale()*ratio);centerCity();
    }
    projection.clipExtent([[0,0],[width,height]]);
    const path=geoPath(projection);
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    svg.setAttribute('role','img');svg.setAttribute('aria-label','Map centered on '+label);svg.setAttribute('aria-hidden','true');
    svg.replaceChildren();
    const defs=node('defs'),clip=node('clipPath',{id:'facultyScenarioMapClip'});clip.append(node('rect',{width,height}));defs.append(clip);svg.append(defs);
    const boundaryLayer=node('g',{class:'scenarioMapBoundaries','clip-path':'url(#facultyScenarioMapClip)'});
    const orderedFeatures=[...worldFeatures.filter(feature=>!featureMatchesThreatRegion(feature.properties?.name||'')),...focusFeatures];
    const visibleFeatures=[];
    for(const feature of orderedFeatures){
      const isFocus=featureMatchesThreatRegion(feature.properties?.name||'');
      const bounds=path.bounds(feature);
      if(!isFocus&&(bounds[1][0]<-6||bounds[0][0]>width+6||bounds[1][1]<-6||bounds[0][1]>height+6))continue;
      const d=path(feature);if(!d)continue;
      const shape=node('path',{d});if(isFocus)shape.classList.add('scenarioMapFocusCountry');boundaryLayer.append(shape);visibleFeatures.push(feature);
    }
    svg.append(boundaryLayer);
    // Keep actual geographic reference lines in the local map, including at
    // country-scale zooms where a global ten-degree grid would disappear.
    const corners=[[0,0],[width,height]].map(point=>projection.invert(point));
    const unwrap=lon=>{while(lon-location.lon>180)lon-=360;while(lon-location.lon < -180)lon+=360;return lon;};
    const west=Math.min(...corners.map(point=>unwrap(point[0]))),east=Math.max(...corners.map(point=>unwrap(point[0])));
    const south=Math.min(...corners.map(point=>point[1])),north=Math.max(...corners.map(point=>point[1]));
    const step=[.05,.1,.25,.5,1,2,5,10,15,30].find(value=>value>=(east-west)/8)||30;
    const graticule=geo.geoGraticule().extent([[west-step,Math.max(-85,south-step)],[east+step,Math.min(85,north+step)]]).step([step,step]).precision(Math.min(2.5,step/2))();
    svg.append(node('path',{class:'location-flat-grid',d:path(graticule)||'','clip-path':'url(#facultyScenarioMapClip)'}));
    const [x,y]=projection([location.lon,location.lat]);
    const coordinates=node('g',{class:'scenarioMapCoordinates','pointer-events':'none'});
    coordinates.append(node('path',{class:'scenarioMapLocator',d:`M${x-19},${y}h13m12,0h13M${x},${y-19}v13m0,12v13`}));svg.append(coordinates);
    if(!options.externalMarker)createESPLScenarioMarker(svg,x,y);
    return {projection,focusFeatures,visibleFeatures,graticule,marker:[x,y],width,height,regional,selection,isFocus:feature=>featureMatchesThreatRegion(feature.properties?.name||'')};
  }
  function activate(){svg.querySelector('.scenarioMapMarker')?.classList.add('is-selected');svg.querySelector('.scenarioMapLocator')?.classList.add('is-selected');svg.setAttribute('aria-hidden','false');}
  return {render,activate};
}

/* People locator: offline city lookup and the SBI tools’ cached world geometry. */
(() => {
  'use strict';
  const note = document.getElementById('where-is-roberts');
  const figure = document.getElementById('facultyLocationMap');
  if (!note || !figure) return;
  const details = note.closest('details');
  const fallback = {name:'Atlanta',country:'US',region:'Georgia',lat:33.749,lon:-84.388,status:'default'};
  let noteText = '', datasetPromise, revision = 0;
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const contains = (text, phrase) => phrase && (' ' + text + ' ').includes(' ' + normalize(phrase) + ' ');
  async function dataset() {
    if (!datasetPromise) datasetPromise = (async () => {
      const bytes = Uint8Array.from(atob(document.getElementById('espl-people-city-data').textContent.trim()), character => character.charCodeAt(0));
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      const data = JSON.parse(await new Response(stream).text());
      data.lookup = new Map();
      data.maxWords = 1;
      data.cities.forEach((city, id) => city[5].forEach(alias => {
        const key = normalize(alias);
        if (!key || key.length < 3) return;
        data.maxWords = Math.max(data.maxWords, key.split(' ').length);
        const ids = data.lookup.get(key) || [];
        if (!ids.includes(id)) ids.push(id);
        data.lookup.set(key, ids);
      }));
      let displayNames;
      try { displayNames = new Intl.DisplayNames(['en'], {type:'region'}); } catch {}
      for (const [code, country] of Object.entries(data.countries)) {
        if (!/^[A-Z]{2}$/.test(code)) continue;
        const localized = displayNames?.of(code);
        if (localized) country[1].push(localized);
      }
      return data;
    })();
    return datasetPromise;
  }
  function resolve(text, data) {
    if (!String(text || '').trim()) return {...fallback};
    const plain = normalize(text);
    // The no-travel note can contain a city alias in ordinary prose: "Come" is
    // also an alias for Como. Keep the default Atlanta location for this note.
    if (plain.includes('does not have any scheduled travel this week or next week')) return {...fallback};
    const flags = new Set((String(text).match(/\p{Regional_Indicator}{2}/gu) || []).map(flag => [...flag].map(character => String.fromCharCode(character.codePointAt(0) - 0x1f1e6 + 65)).join('')));
    // Token windows allow full multiword city names without substring matches.
    const tokens = plain.split(' '), hits = [];
    for (let start = 0; start < tokens.length; start++) {
      for (let size = 1; size <= data.maxWords && start + size <= tokens.length; size++) {
        const phrase = tokens.slice(start, start + size).join(' ');
        const ids = data.lookup.get(phrase);
        if (ids) hits.push({start,end:start+size,ids});
      }
    }
    // "York" within "New York" is one location, not two competing matches.
    const complete = hits.filter(hit => !hits.some(other => other !== hit && other.start <= hit.start && other.end >= hit.end && other.end-other.start > hit.end-hit.start));
    let ids = [...new Set(complete.flatMap(hit => hit.ids))];
    // Ignore flags such as the United Nations emblem when they do not identify a candidate country.
    const matchingFlags = [...flags].filter(code => ids.some(id => data.cities[id][1] === code));
    if (matchingFlags.length) ids = ids.filter(id => matchingFlags.includes(data.cities[id][1]));
    if (!ids.length) return {...fallback};
    // Explicit administrative areas disambiguate e.g. Portland, Maine/Oregon.
    const regional = ids.filter(id => contains(plain, data.cities[id][2]));
    if (regional.length) ids = regional;
    if (!matchingFlags.length) {
      const countries = Object.entries(data.countries).filter(([, country]) => country[1].some(name => name.length > 3 && contains(plain, name))).map(([code]) => code);
      const abbreviations = {US:/\b(?:USA|U\.S\.(?:A\.)?)\b/,GB:/\b(?:UK|U\.K\.)\b/,AE:/\bUAE\b/};
      for (const [code, pattern] of Object.entries(abbreviations)) if (pattern.test(text)) countries.push(code);
      // "Georgia" can be either a country or a US state; the state wins when
      // it explicitly matches a candidate's administrative area.
      const relevant = countries.filter(code => ids.some(id => data.cities[id][1] === code));
      if (relevant.length) ids = ids.filter(id => relevant.includes(data.cities[id][1]));
    }
    // Accept each unambiguous city independently, including several places in one note.
    const matched = [...new Set(complete.map(hit => hit.ids.filter(id => ids.includes(id))).filter(group => group.length === 1).map(group => group[0]))];
    if (!matched.length) return {...fallback};
    const locations = matched.map(id => {const [name,country,region,lat,lon] = data.cities[id];return {name,country,region,lat,lon,status:'matched'};});
    return {...locations[0],locations};
  }
  // Reuses the SBI scenario maps' world-atlas/topojson/d3-geo pipeline.
  // The camera approach, neutral sphere and highlighted location follow the
  // SBI globe; this locator has no controls or scroll-driven calculations.
  let globePromise, globe, visible=false;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  async function createGlobe() {
    const [geo,topo,world]=await Promise.all([
      import('https://cdn.jsdelivr.net/npm/d3-geo@3.1.1/+esm'),
      import('https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm'),
      fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',{cache:'force-cache'}).then(response=>{if(!response.ok)throw new Error('World map HTTP '+response.status);return response.json();})
    ]);
    const land=topo.feature(world,world.objects.land),boundaries=topo.mesh(world,world.objects.countries);
    const countries=topo.feature(world,world.objects.countries).features,graticule=geo.geoGraticule10();
    const stage=figure.querySelector('.location-visual'),ns='http://www.w3.org/2000/svg';
    const canvas=document.createElement('canvas');canvas.className='location-globe';canvas.setAttribute('role','img');canvas.tabIndex=-1;
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas unavailable');
    const markerSvg=document.createElementNS(ns,'svg');markerSvg.classList.add('location-marker-overlay');markerSvg.setAttribute('viewBox','0 0 291 176');markerSvg.setAttribute('aria-hidden','true');
    const surfaceMarker=createESPLScenarioMarker(markerSvg,145.5,88);
    markerSvg.style.visibility='hidden';
    const flatSvg=document.createElementNS(ns,'svg');flatSvg.classList.add('location-flat-map');flatSvg.setAttribute('viewBox','0 0 291 176');
    stage.append(canvas,markerSvg,flatSvg);
    const projection=geo.geoOrthographic().clipAngle(90).precision(0),path=geo.geoPath(projection,ctx);
    const DURATION=1650;
    let location={...fallback},focus=null,width=1,height=1,dpr=1,elapsed=0,previous=0,lastPaint=0,raf=0,frames=0;
    const clamp=value=>Math.max(0,Math.min(1,value));
    const ease=t=>1-Math.pow(1-t,3);
    function size(){
      width=Math.max(1,figure.clientWidth);height=width*176/291;
      dpr=Math.min(devicePixelRatio||1,matchMedia('(max-width:700px)').matches?1.5:2);
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);render();
    }
    function render(){
      if(width<2)return;
      frames++;
      const turn=ease(motion.matches?1:clamp(elapsed/DURATION));
      const lon=location.lon-30*(1-turn),lat=location.lat-10*(1-turn);
      const radius=height*(.68+.36*turn),cx=width*.5,cy=height*.52;
      projection.translate([cx,cy]).scale(radius).rotate([-lon,-lat,0]);
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
      ctx.save();ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.clip();
      const ocean=ctx.createRadialGradient(cx-radius*.32,cy-radius*.37,radius*.08,cx,cy,radius*1.12);
      ocean.addColorStop(0,'#fcfcfc');ocean.addColorStop(.69,'#f3f5f5');ocean.addColorStop(1,'#dfe4e5');ctx.fillStyle=ocean;ctx.fillRect(0,0,width,height);
      ctx.beginPath();path(graticule);ctx.strokeStyle='rgba(177,186,191,.30)';ctx.lineWidth=.55;ctx.stroke();
      ctx.beginPath();path(land);ctx.fillStyle='#e6e9e9';ctx.fill();
      if(focus){ctx.beginPath();path(focus);ctx.fillStyle='#d9dfe0';ctx.fill();}
      ctx.beginPath();path(boundaries);ctx.strokeStyle='rgba(151,161,167,.67)';ctx.lineWidth=.65;ctx.stroke();
      if(focus){ctx.beginPath();path(focus);ctx.strokeStyle='rgba(127,138,145,.8)';ctx.lineWidth=.9;ctx.stroke();}
      const limb=ctx.createRadialGradient(cx-radius*.23,cy-radius*.28,radius*.25,cx,cy,radius);
      limb.addColorStop(0,'rgba(255,255,255,.30)');limb.addColorStop(.7,'rgba(255,255,255,0)');limb.addColorStop(1,'rgba(95,108,118,.13)');ctx.fillStyle=limb;ctx.fillRect(0,0,width,height);
      ctx.restore();
      ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.strokeStyle='rgba(151,161,167,.45)';ctx.lineWidth=.65;ctx.stroke();
      const point=projection([location.lon,location.lat]),k=width/291;
      surfaceMarker.setAttribute('transform',`translate(${point[0]/k} ${point[1]/k})`);
      figure.dataset.mapPhase=turn>=.999?'settled':'approach';
    }
    function tick(now){
      raf=0;if(!details.open||!visible||document.hidden||motion.matches)return;
      if(previous)elapsed=Math.min(DURATION,elapsed+Math.min(80,now-previous));previous=now;
      if(now-lastPaint>=30||elapsed>=DURATION){render();lastPaint=now;}
      if(elapsed<DURATION)raf=requestAnimationFrame(tick);
    }
    function stop(){if(raf)cancelAnimationFrame(raf);raf=0;previous=0;}
    function play(){stop();if(motion.matches){elapsed=DURATION;render();return;}if(details.open&&visible&&!document.hidden&&elapsed<DURATION)raf=requestAnimationFrame(tick);}
    function renderFlat(locations,label){
      const projection=geo.geoEqualEarth().fitExtent([[8,8],[283,168]],{type:'Sphere'}),draw=geo.geoPath(projection);
      const element=(name,attributes={})=>{const item=document.createElementNS(ns,name);for(const [key,value] of Object.entries(attributes))item.setAttribute(key,String(value));return item;};
      flatSvg.replaceChildren(element('rect',{width:291,height:176,fill:'#f2f4f4'}));
      flatSvg.append(element('path',{d:draw(land),fill:'#e6e9e9',stroke:'#bcc4c7','stroke-width':'.35'}));
      flatSvg.append(element('path',{d:draw(boundaries),fill:'none',stroke:'#9da8ad','stroke-width':'.35'}));
      for(const city of locations){const [x,y]=projection([city.lon,city.lat]);createESPLScenarioMarker(flatSvg,x,y);}
      flatSvg.setAttribute('role','img');flatSvg.setAttribute('aria-label','Map highlighting '+label);
      figure.classList.add('is-flat-map','is-globe-ready');markerSvg.style.visibility='hidden';stop();
    }
    function setLocation(value,label,data){
      if(value.locations?.length>1){renderFlat(value.locations,label);return;}
      figure.classList.remove('is-flat-map');
      location={...value};elapsed=0;previous=0;
      const aliases=(data.countries[value.country]?.[1]||[]).map(normalize);
      focus=countries.find(feature=>aliases.includes(normalize(feature.properties?.name)));
      canvas.setAttribute('aria-label','3D location globe centered on '+label);
      size();markerSvg.style.visibility='';figure.classList.add('is-globe-ready');play();
    }
    new ResizeObserver(size).observe(figure);motion.addEventListener('change',play);
    return {setLocation,play,stop,inspect:()=>({frames,elapsed,playing:Boolean(raf),phase:elapsed>=DURATION?'settled':'approach',latitude:location.lat,longitude:location.lon,projection:figure.classList.contains('is-flat-map')?'Equal Earth':'Orthographic'})};
  }
  function prepareGlobe(){
    if(!globePromise)globePromise=createGlobe().then(value=>{globe=value;return value;}).catch(error=>{globePromise=null;throw error;});
    return globePromise;
  }
  function syncPlayback(){const active=details.open&&visible&&!document.hidden;figure.classList.toggle('is-location-visible',active);if(active&&!figure.classList.contains('is-flat-map'))globe?.play();else globe?.stop();}
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncPlayback();},{threshold:.01}).observe(figure);
  else visible=true;
  document.addEventListener('visibilitychange',syncPlayback);
  async function update() {
    if(!details.open){revision++;figure.classList.remove('is-location-visible');globe?.stop();return;}
    figure.classList.toggle('is-location-visible',visible&&!document.hidden);
    const token=++revision;
    try{
      const data=await dataset(),location=resolve(noteText,data);
      if(token!==revision||!details.open)return;
      let country=data.countries[location.country]?.[0]||location.country;
      try {country=new Intl.DisplayNames(['en'],{type:'region'}).of(location.country)||country;} catch {}
      const nameOf=place=>{let name=data.countries[place.country]?.[0]||place.country;try{name=new Intl.DisplayNames(['en'],{type:'region'}).of(place.country)||name}catch{}return place.name+', '+name;};
      const label=(location.locations||[location]).map(nameOf).join('; ');
      figure.querySelector('#facultyLocationMapLabel').textContent=label;
      figure.dataset.locationStatus=location.status;figure.dataset.latitude=String(location.lat);figure.dataset.longitude=String(location.lon);figure.dataset.locationCount=String(location.locations?.length||1);
      const engine=await prepareGlobe();
      if(token===revision&&details.open)engine.setLocation(location,label,data);
    }catch(error){console.warn('Location globe unavailable; retaining the Atlanta fallback.',error);}
  }
  function setNote(html) {
    // Keep the existing text/emphasis/breaks while stripping source link markup.
    const source=document.createElement('template');source.innerHTML=String(html||'');
    const safe=document.createDocumentFragment();
    const copy=(node,parent)=>{
      if(node.nodeType===Node.TEXT_NODE){parent.append(document.createTextNode(node.textContent));return;}
      if(node.nodeType!==Node.ELEMENT_NODE||node.matches('script,style,iframe'))return;
      let target=parent;
      if(node.matches('br,em,i,strong,b,p')){target=document.createElement(node.tagName.toLowerCase().replace(/^i$/,'em').replace(/^b$/,'strong'));parent.append(target);}
      node.childNodes.forEach(child=>copy(child,target));
    };
    source.content.childNodes.forEach(child=>copy(child,safe));
    note.replaceChildren(safe);
    if(!note.textContent.trim())note.textContent='No travel location is currently specified.';
    noteText=note.innerHTML.replace(/<br\s*\/?\s*>|<\/p>/gi,' ').replace(/<[^>]+>/g,' ');
    // Decode any entities before matching city and flag names.
    const plain=document.createElement('textarea');plain.innerHTML=noteText;noteText=plain.value;
    update();
  }
  function firstCell(text) {
    const source=String(text||'').replace(/^\uFEFF/,'');let value='',quoted=false;
    for(let i=0;i<source.length;i++){
      const c=source[i];
      if(c==='"'){if(quoted&&source[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
      else if(!quoted&&(c===','||c==='\n'||c==='\r'))break;
      else value+=c;
    }
    return value.trim();
  }
  details.addEventListener('toggle',update);
  if('requestIdleCallback' in window)requestIdleCallback(()=>prepareGlobe().catch(()=>{}),{timeout:1800});
  update();
  window.ESPLFacultyLocationMap={setNote,resolve:async text=>resolve(text,await dataset()),inspect:()=>globe?.inspect()||{frames:0,playing:false,phase:'loading'}};
  note.textContent='Loading travel information…';
  fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vS8X6CshzRsEGYjxxl4SUIlhIzrsiJ0-8gJ8usPD8mOkLdR3hJ8LIecVLJH8kJxKQdYgy8OAxKuPbr1/pub?gid=1967848851&single=true&output=csv')
    .then(response=>{if(!response.ok)throw new Error('Travel note HTTP '+response.status);return response.text();})
    .then(text=>setNote(firstCell(text)))
    .catch(()=>{setNote('Travel information is temporarily unavailable.');});
})();
