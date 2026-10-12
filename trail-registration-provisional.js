/* Provisional brochure-image registration. Two control points give a similarity transform only;
   do not treat exported lines as surveyed or independently verified. */
window.TrailRegistration={
 convert(data,anchors){
  if(!Array.isArray(anchors)||anchors.length<2)throw Error('At least two control points required');
  const a=anchors[0];
  const lat0=anchors.reduce((s,p)=>s+p.lat,0)/anchors.length,lon0=anchors.reduce((s,p)=>s+p.lon,0)/anchors.length;
  const metersPerLat=111132,metersPerLon=111320*Math.cos(lat0*Math.PI/180);
  const cx=anchors.reduce((s,p)=>s+p.x,0)/anchors.length,cy=anchors.reduce((s,p)=>s+p.y,0)/anchors.length;
  const ce=anchors.reduce((s,p)=>s+(p.lon-lon0)*metersPerLon,0)/anchors.length,cn=anchors.reduce((s,p)=>s+(p.lat-lat0)*metersPerLat,0)/anchors.length;
  let norm=0,dot=0,cross=0;
  anchors.forEach(p=>{const x=p.x-cx,y=p.y-cy,e=(p.lon-lon0)*metersPerLon-ce,n=(p.lat-lat0)*metersPerLat-cn;norm+=x*x+y*y;dot+=e*x+n*y;cross+=n*x-e*y});
  if(norm<100)throw Error('Source control points too close');
  const u=dot/norm,v=cross/norm;
  const map=p=>{const x=p[0]-cx,y=p[1]-cy;return [+(lon0+(ce+u*x-v*y)/metersPerLon).toFixed(7),+(lat0+(cn+v*x+u*y)/metersPerLat).toFixed(7)]};
  const residualMeters=anchors.map(p=>{const predicted=map([p.x,p.y]);return Math.hypot((predicted[0]-p.lon)*metersPerLon,(predicted[1]-p.lat)*metersPerLat)});
  const rmsErrorMeters=Math.sqrt(residualMeters.reduce((s,e)=>s+e*e,0)/residualMeters.length);
  return {type:'FeatureCollection',properties:{source:data.source||null,status:'unverified-least-squares-similarity-registration',warning:'NOT field verified. Do not use for navigation.',anchors,rmsErrorMeters,residualMeters},features:data.trails.map(t=>({type:'Feature',properties:{id:t.id,name:t.name,status:t.status||'unverified',registration:'approximate-best-fit-similarity'},geometry:{type:'LineString',coordinates:t.points.map(map)}}))};
 },
 download(geojson,name){const blob=new Blob([JSON.stringify(geojson,null,2)],{type:'application/geo+json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name+'.geojson';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
};