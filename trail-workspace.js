(()=>{
'use strict';
// Experimental trail digitization only; never changes the public map.
const map=window.norwoodTrailMap;
if(!map)return;
const panel=document.getElementById('trailWorkspace');
if(!panel)return;
const layer=L.featureGroup().addTo(map);
let points=[],active=null;
const status=panel.querySelector('#trailStatus');
const name=panel.querySelector('#trailName');
const source=panel.querySelector('#trailSource');
const quality=panel.querySelector('#trailQuality');
const setStatus=s=>{status.textContent=s};
function paint(){
 if(active)layer.removeLayer(active);
 active=points.length>1?L.polyline(points,{color:'#c48c0b',weight:5,opacity:.95}).addTo(layer):null;
 panel.querySelector('#trailPoints').textContent=points.length+' vertices';
}
function addPoint(e){
 if(!panel.querySelector('#trailDraw').checked)return;
 points.push([e.latlng.lat,e.latlng.lng]);paint();
}
map.on('click',addPoint);
panel.querySelector('#trailUndo').onclick=()=>{points.pop();paint()};
panel.querySelector('#trailClear').onclick=()=>{points=[];paint();setStatus('Draft cleared')};
panel.querySelector('#trailExport').onclick=()=>{
 if(points.length<2){setStatus('Add at least two vertices first');return}
 const feature={type:'Feature',properties:{name:name.value.trim()||'Unnamed trail',source:source.value.trim(),confidence:quality.value,verification:'Unverified draft — do not use for navigation',createdFor:'Norwood.ma trail test workspace'},geometry:{type:'LineString',coordinates:points.map(([lat,lng])=>[lng,lat])}};
 const blob=new Blob([JSON.stringify({type:'FeatureCollection',features:[feature]},null,2)],{type:'application/geo+json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='norwood-trail-draft.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 setStatus('GeoJSON draft exported; geographic alignment has not been verified');
};
panel.querySelector('#trailImport').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
 const obj=JSON.parse(await file.text());
 const geo=L.geoJSON(obj,{style:{color:'#168052',weight:4,opacity:.9},onEachFeature:(f,l)=>l.bindPopup(String(f.properties?.name||'Imported trail'))});
 if(!geo.getLayers().length)throw Error('No geometry found');
 geo.addTo(layer);map.fitBounds(geo.getBounds().pad(.15));setStatus('Imported reference GeoJSON (not verified)');
 }catch(err){setStatus('Import failed: '+err.message)}
 e.target.value='';
});
setStatus('Ready. Click map to add draft vertices after enabling drawing.');
})();