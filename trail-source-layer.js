/* Stored geospatial linework for the unlinked map-test page. */
(()=>{
'use strict';
const map=window.norwoodTrailMap;if(!map)return;
const $=id=>document.getElementById(id),status=$('trailLayerStatus');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const areas={
 all:{name:'All Norwood',bounds:[[42.1515,-71.2355],[42.2265,-71.1505]]},
 shattuck:{name:'Shattuck Park',bounds:[[42.1908,-71.214],[42.1945,-71.2075]]},
 germany:{name:'Germany Brook',bounds:[[42.1905,-71.227],[42.207,-71.207]]},
 endean:{name:'Endean / Hawes Brook',bounds:[[42.169,-71.223],[42.184,-71.207]]},
 meadow:{name:'Meadow Street',bounds:[[42.171,-71.215],[42.182,-71.192]]},
 cooper:{name:'Bernie Cooper Park',bounds:[[42.170,-71.212],[42.181,-71.197]]},
 vanderbilt:{name:'Vanderbilt / Pine Tree Forest',bounds:[[42.157,-71.216],[42.174,-71.195]]},
 hennessey:{name:'Hennessey Field / Murphy Park',bounds:[[42.183,-71.201],[42.1905,-71.190]]},
 'ellis-pond':{name:'Ellis Pond / Alevizos Park',bounds:[[42.184,-71.222],[42.194,-71.208]]},
 'ellis-playground':{name:'Ellis Playground',bounds:[[42.181,-71.227],[42.19,-71.214]]},
 ledgeview:{name:'Ledgeview Drive',bounds:[[42.154,-71.201],[42.167,-71.184]]},
 willett:{name:'Willett / Tiot',bounds:[[42.186,-71.231],[42.198,-71.215]]}
};
const group=L.featureGroup().addTo(map),boundary=L.featureGroup().addTo(map);
let data=null,germany=null,selected='all';
const selectedFeatures=()=>selected==='germany'?(germany?.features||[]):(data?.features||[]);
function allowed(f){const p=f.properties||{};if(!$('trailNearby').checked&&!p.in_norwood)return false;if(p.source==='OpenStreetMap')return $('trailOsm').checked;if(p.status==='planned'||p.status==='proposed')return $('trailPlanned').checked;return $('trailMapc').checked;}
function style(f){const p=f.properties;if(p.germany_role==='original-route')return {color:'#087f46',weight:8,opacity:.95};if(p.status==='planned'||p.status==='proposed')return {color:'#c56500',weight:6,opacity:.95,dashArray:'10 7'};return p.source==='OpenStreetMap'?{color:'#1267b0',weight:4,opacity:.9,dashArray:'4 3'}:{color:'#087f46',weight:7,opacity:.9};}
function render(){
 if(!data)return;group.clearLayers();const features=selectedFeatures().filter(allowed);
 L.geoJSON({type:'FeatureCollection',features},{style,onEachFeature:(f,l)=>{
  const p=f.properties;const name=p.local_name||p.prop_name||p.name||p.reg_name||'Mapped path';
  const sourceId=p.osm_way_id||p.objectid;
  l.bindPopup('<strong>'+esc(name)+'</strong><p>'+esc(p.source)+' · '+esc(p.status)+'<br>'+esc(p.source_layer||p.highway||'')+(p.surface?' · '+esc(p.surface):'')+'</p><p>Source feature '+esc(sourceId)+(p.acc_status?'<br>Source access: '+esc(p.acc_status):'')+'</p><a href="'+esc(p.source_url)+'" target="_blank" rel="noopener">View source geometry ↗</a>');
 }}).addTo(group);updateCount();
}
function updateCount(){
 if(!data)return;const bounds=map.getBounds();let count=0;
 group.eachLayer(g=>g.eachLayer(l=>{if(l.getBounds&&bounds.intersects(l.getBounds()))count++;}));
 const shown=selectedFeatures().filter(allowed).length;
 status.textContent=selected==='germany'?'Germany Brook: original route plus '+(germany?.connected_osm_way_count||0)+' connected OSM segments and their offshoots. Green: original route. Blue: connected OSM paths.':count+' source segments in view · '+shown+' displayed overall. Area: '+areas[selected].name+'. Lines use the stored source coordinates.';
}
function focus(){const area=areas[selected];map.fitBounds(area.bounds,{padding:[22,22]});$('trailLayerFocus').textContent='Zoom to '+area.name;}
$('trailAreaSelect').addEventListener('change',e=>{selected=e.target.value;render();focus();});
$('trailLayerFocus').addEventListener('click',focus);
['trailMapc','trailOsm','trailPlanned','trailNearby'].forEach(id=>$(id).addEventListener('change',render));
$('trailLayerToggle').addEventListener('change',e=>{if(e.target.checked){group.addTo(map);boundary.addTo(map);render();}else{map.removeLayer(group);map.removeLayer(boundary);status.textContent='Trail overlays hidden.';}});
map.on('moveend',()=>{if($('trailLayerToggle').checked)updateCount();});
window.addEventListener('norwood:show-trails',()=>{$('trailLayerToggle').checked=true;group.addTo(map);boundary.addTo(map);focus();});
const reviewLayout=()=>{document.body.classList.toggle('trail-review-mode',['','trails'].includes($('mapCategory')?.value||''));map.invalidateSize();};
$('mapCategory')?.addEventListener('change',reviewLayout);reviewLayout();
const params=new URLSearchParams(location.search);if(areas[params.get('trail')])selected=params.get('trail');$('trailAreaSelect').value=selected;
const aerial=L.tileLayer('https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/Massachusetts_Aerial_Imagery_2025/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,maxNativeZoom:19,attribution:'MassGIS · Massachusetts 2025 aerial imagery'});
map.removeLayer(window.norwoodTrailBasemap);aerial.addTo(map);
L.control.layers({'OpenStreetMap':window.norwoodTrailBasemap,'MassGIS 2025 aerial':aerial},null,{position:'topright'}).addTo(map);
map.attributionControl.addAttribution('Trail lines: MAPC; © OpenStreetMap contributors, ODbL');
(async()=>{
 try{
  const response=await fetch('data/trails/norwood-source-paths.geojson?v=20261102');if(!response.ok)throw Error('Path data HTTP '+response.status);data=await response.json();if(!Array.isArray(data.features))throw Error('Invalid path data');
  const networkResponse=await fetch('data/trails/germany-brook-connected.geojson?v=20261102-connected1');if(!networkResponse.ok)throw Error('Germany Brook network HTTP '+networkResponse.status);germany=await networkResponse.json();render();focus();
 }catch(e){status.textContent='Trail lines could not load: '+e.message;}
 try{
  const response=await fetch('data/trails/norwood-boundary.geojson');if(!response.ok)return;const geo=await response.json();L.geoJSON(geo,{style:{color:'#34495e',weight:2,opacity:.75,fill:false,dashArray:'3 5'},interactive:false}).addTo(boundary);
 }catch(_){}
})();
})();
