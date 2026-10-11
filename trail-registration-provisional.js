/* Provisional brochure-image registration. Two control points give a similarity transform only;
   do not treat exported lines as surveyed or independently verified. */
window.TrailRegistration={
 convert(data,anchors){
  if(!Array.isArray(anchors)||anchors.length!==2)throw Error('Two control points required');
  const [a,b]=anchors,dx=b.x-a.x,dy=b.y-a.y;
  const norm=dx*dx+dy*dy;if(norm<100)throw Error('Source control points too close');
  const lat0=(a.lat+b.lat)/2,lon0=(a.lon+b.lon)/2;
  const metersPerLat=111132,metersPerLon=111320*Math.cos(lat0*Math.PI/180);
  const ex=(b.lon-a.lon)*metersPerLon,ey=(b.lat-a.lat)*metersPerLat;
  const u=(ex*dx+ey*dy)/norm,v=(ey*dx-ex*dy)/norm;
  const map=p=>{const x=p[0]-a.x,y=p[1]-a.y;return [+(a.lon+(u*x-v*y)/metersPerLon).toFixed(7),+(a.lat+(v*x+u*y)/metersPerLat).toFixed(7)]};
  return {type:'FeatureCollection',properties:{source:data.source||null,status:'unverified-two-anchor-approximate-registration',warning:'NOT field verified. Do not use for navigation.',anchors},features:data.trails.map(t=>({type:'Feature',properties:{id:t.id,name:t.name,status:t.status||'unverified',registration:'approximate-two-point'},geometry:{type:'LineString',coordinates:t.points.map(map)}}))};
 },
 download(geojson,name){const blob=new Blob([JSON.stringify(geojson,null,2)],{type:'application/geo+json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name+'.geojson';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
};