// A dated GEO pair for the relative-motion chart. The presentation's editable
// globe remains a synthetic teaching model; this chart uses archived E-003 TLEs.
const start=Date.parse("2020-04-28T15:24:00Z");
const end=Date.parse("2020-04-30T03:24:00Z");
const archiveBase="../visualization/dev/e003/data/";
const norm=vector=>Math.hypot(vector.x,vector.y,vector.z);
function nearest(records,ms){
  let low=0,high=records.length-1;
  while(low<high){const mid=(low+high)>>1;if(Date.parse(records[mid].epoch)<ms)low=mid+1;else high=mid;}
  if(low>0&&ms-Date.parse(records[low-1].epoch)<Date.parse(records[low].epoch)-ms)low--;
  return records[low];
}
export async function loadGeoChart(){
  if(!window.satellite?.twoline2satrec)throw new Error("Bundled SGP4 is unavailable");
  const [first,second]=await Promise.all(["41745.json","44910.json"].map(async name=>{
    const response=await fetch(archiveBase+name);
    if(!response.ok)throw new Error(`Archived GEO TLE data unavailable: ${name}`);
    return (await response.json()).tles.sort((a,b)=>Date.parse(a.epoch)-Date.parse(b.epoch));
  }));
  const state=(record,ms)=>{
    record.satrec ||= window.satellite.twoline2satrec(record.line1,record.line2);
    return window.satellite.propagate(record.satrec,new Date(ms));
  };
  const samples=[];
  for(let ms=start;ms<=end;ms+=5*60000){
    const a=nearest(first,ms),b=nearest(second,ms),A=state(a,ms),B=state(b,ms);
    const valid=A.position&&B.position&&A.velocity&&B.velocity;
    samples.push({ms,tleA:a.epoch,tleB:b.epoch,
      ageAHours:(ms-Date.parse(a.epoch))/3600000,ageBHours:(ms-Date.parse(b.epoch))/3600000,
      distanceKm:valid?norm({x:A.position.x-B.position.x,y:A.position.y-B.position.y,z:A.position.z-B.position.z}):null,
      speedMs:valid?1000*norm({x:A.velocity.x-B.velocity.x,y:A.velocity.y-B.velocity.y,z:A.velocity.z-B.velocity.z}):null});
  }
  return {window:{id:"E-003-Apr-29",start:new Date(start).toISOString(),end:new Date(end).toISOString()},samples};
}
