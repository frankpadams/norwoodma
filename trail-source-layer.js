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
 meadow:{name:'Meadow Street',bounds:[[42.1738,-71.1750],[42.1808,-71.1658]]},
 cooper:{name:'Bernie Cooper Park',bounds:[[42.170,-71.212],[42.181,-71.197]]},
 vanderbilt:{name:'Vanderbilt / Pine Tree Forest',bounds:[[42.163,-71.191],[42.171,-71.181]]},
 hennessey:{name:'Hennessey Field / Murphy Park',bounds:[[42.183,-71.201],[42.1905,-71.190]]},
 'ellis-pond':{name:'Ellis Pond / Alevizos Park',bounds:[[42.1778,-71.2242],[42.1845,-71.2187]]},
 'ellis-playground':{name:'Ellis Playground',bounds:[[42.2045,-71.1915],[42.2072,-71.1855]]},
 ledgeview:{name:'Ledgeview Drive (proposed)',bounds:[[42.1652,-71.1841],[42.1691,-71.1765]]},
 willett:{name:'Willett / Tiot',bounds:[[42.1918,-71.2242],[42.1969,-71.2197]]}
};
const group=L.featureGroup().addTo(map),boundary=L.featureGroup().addTo(map);
let data=null,germany=null,endean=null,meadow=null,vanderbilt=null,hennessey=null,ellisPond=null,ellisPlayground=null,ledgeview=null,willett=null,meadowTrailhead=null,selected='all',preview=false;
const selectedFeatures=()=>{
 if(selected==='willett'&&preview)return willett?.features||[];
 if(selected==='ledgeview')return ledgeview?.features||[];
 if(selected==='ellis-playground')return ellisPlayground?.features||[];
 if(selected==='ellis-pond')return ellisPond?.features||[];
 if(selected==='hennessey')return hennessey?.features||[];
 if(selected==='vanderbilt')return vanderbilt?.features||[];
 if(selected==='meadow')return meadow?.features||[];
 if(selected==='germany')return germany?.features||[];
 if(selected==='endean')return endean?.features||[];
 const features=data?.features||[];
 if(!preview||selected==='all')return features;
 const bounds=L.latLngBounds(areas[selected].bounds);
 return features.filter(f=>f.properties?.in_norwood&&L.geoJSON(f).getBounds().intersects(bounds));
};
function previewControls(){
 if($('ledgeviewBrochureNotice'))$('ledgeviewBrochureNotice').hidden=selected!=='ledgeview';
 if($('trailDownload')){const link=$('trailDownload');link.hidden=false;link.href=selected==='willett'?'data/trails/willett-tiot-review.geojson':selected==='ledgeview'?'data/trails/ledgeview-review.geojson':selected==='ellis-playground'?'data/trails/ellis-playground-review.geojson':selected==='ellis-pond'?'data/trails/ellis-pond-review.geojson':selected==='hennessey'?'data/trails/hennessey-review.geojson':selected==='vanderbilt'?'data/trails/vanderbilt-approved.geojson':selected==='meadow'?'data/trails/meadow-street-approved.geojson':selected==='germany'?'data/trails/germany-brook-approved.geojson':selected==='endean'?'data/trails/endean-approved.geojson':'data/trails/norwood-source-paths.geojson';}
 $('trailPreviewButton').textContent=preview?'Return to source comparison':selected==='all'?'Choose a trail to preview':'Preview '+areas[selected].name;
 $('trailPreviewButton').disabled=selected==='all';
 $('trailToggleLabel').textContent=preview?areas[selected].name+' trail':'Show trail overlays';
}
function allowed(f){if(preview)return true;const p=f.properties||{};if(!$('trailNearby').checked&&!p.in_norwood)return false;if(p.source==='OpenStreetMap')return $('trailOsm').checked;if(p.status==='planned'||p.status==='proposed')return $('trailPlanned').checked;return $('trailMapc').checked;}
const brochureGuides={
 ledgeview:{id:'1XtBbNiYSEFR1R6i1udUzjPr1Hv_mC20o',text:'PROPOSED — the August 2026 source map makes this potential loop contingent on land acquisition. Blue: future Tiot leg. Green: proposed loop. Red: pipe-gate approach. Black dots: pool-side section shown in the source. Approximate alignment; this map does not confirm public access.'},
 'ellis-playground':{id:'1x32aHzxdJrrcJvBEZbuB9H05Xaxtbkfp',text:'Olive green: primary natural paths. Green: secondary natural paths. Olive dashes: seasonal natural path through the wet area. Green dots: playground connectors. Access is from Codman Road and Madelyn Road.'},
 'ellis-pond':{id:'1nMBh4QI94dyM5U6xjmYX7CHpvKGr_6wX',text:'Olive green: primary natural paths at the northern launch and eastern shore. Gray: the gravel dam crossing. Black: the paved west-dam approach from Walpole Street. The northern launch is a separate access route.'},
 shattuck:{id:'1glv3UMbXWVrsLtV4dnJAy4_3qkfwBXTw',text:'Green: natural woodland paths, matching the Town brochure.'},
 cooper:{id:'1m3gd8omNf9o07rn6RJQ4meeIz9Kc1Z9V',text:'Tan: the park path network, matching the brochure. Paths connect the Saint John, Saint Joseph and Saint Paul Avenue entrances with the riverfront.'},
 germany:{id:'1X-mPJgOAaNFPAF_jxQHyPPiwcpqv9--1',text:'Olive green: the main natural trail. Green: natural branches. Black: paved sections where identified in the mapped data. Seasonal natural sections use a dashed line where identified.'},
 endean:{id:'1WwtpOYWhmyOCY1-L9RdgvQ4v-Yj8J3Sz',text:'Black: mapped paved sections. Gray: mapped gravel sections. Green: natural paths and connecting sections. The brochure also distinguishes primary, secondary and seasonal natural trails; sections without that detail in the stored data retain green.'},
 meadow:{id:'1u1MtJmXcGFB3NRXDAlsmGkPwTM53QUXF',text:'Blue, black, green, magenta, orange and yellow follow the brochure’s named routes. The Green–White route uses a green dashed line. Blue includes the western riverbank connection.'}
};
function brochureStyle(f){
 const p=f.properties||{},surface=(p.surface||'').toLowerCase();
 if(p.route_color)return {color:p.route_color,weight:6,opacity:1,dashArray:p.line_pattern==='dots'?'1 12':p.line_pattern==='dashes'?'10 9':p.route_name==='Green–White'?'8 6':null};
 if(!preview)return null;
 if(selected==='shattuck')return {color:'#387f38',weight:6,opacity:1};
 if(selected==='cooper')return {color:'#c5bb96',weight:6,opacity:1};
 if(selected==='germany'||selected==='endean'){
  const paved=['asphalt','paved','concrete'].includes(surface)||p.source_layer==='Paved Footway';
  const gravel=['gravel','fine_gravel','compacted'].includes(surface);
  return {color:paved?'#202020':gravel?'#737373':selected==='germany'&&p.germany_role==='original-route'?'#758f3f':'#387f38',weight:6,opacity:1,dashArray:p.seasonal==='yes'?'10 7':null};
 }
 return null;
}
function style(f){const matched=brochureStyle(f);if(matched)return matched;if(preview)return {color:'#087f46',weight:6,opacity:1,dashArray:['planned','proposed'].includes(f.properties?.status)?'10 7':null};const p=f.properties;if(p.approximation)return {color:p.route_color||'#087f46',weight:5,opacity:1,dashArray:p.line_pattern==='dots'?'1 12':p.line_pattern==='dashes'?'10 9':p.route_name==='Green–White'?'8 6':null};if(['original-route','added-leg','included-leg'].includes(p.germany_role))return {color:'#087f46',weight:8,opacity:.95};if(p.status==='planned'||p.status==='proposed')return {color:'#c56500',weight:6,opacity:.95,dashArray:'10 7'};return p.source==='OpenStreetMap'?{color:'#1267b0',weight:4,opacity:.9,dashArray:'4 3'}:{color:'#087f46',weight:7,opacity:.9};}
function render(){
 if(!data)return;group.clearLayers();const features=selectedFeatures().filter(allowed);
 L.geoJSON({type:'FeatureCollection',features},{style,onEachFeature:(f,l)=>{
  const p=f.properties;const name=p.local_name||p.prop_name||p.name||p.reg_name||'Mapped path';
  if(selected==='vanderbilt'||selected==='hennessey'||selected==='ellis-pond'||selected==='ellis-playground'||selected==='ledgeview'||(selected==='willett'&&preview)){l.bindTooltip(esc(p.route_name||name));l.bindPopup('<strong>'+esc(name)+'</strong><p>'+(selected==='vanderbilt'?'Approved brochure alignment. Inner and outer loops together form the 5K route.':esc(p.trail_type)+': '+esc(p.section_description))+'</p><a href="'+esc(p.brochure_url)+'" target="_blank" rel="noopener">Town trail brochure ↗</a>'+(selected==='ledgeview'?'<p><strong>Read the brochure before visiting.</strong> It contains important information about proposed access, low-lying pools, trenches and high water. It notes that conditions are typically best at a river height of 10 feet or less.</p><p><a href="https://waterdata.usgs.gov/monitoring-location/USGS-01105554/#dataTypeId=continuous-00065-0&amp;period=P7D" target="_blank" rel="noopener">Check Neponset River height at the USGS gauge ↗</a></p>':''));return;}
  if(preview&&brochureGuides[selected]){const guide=brochureGuides[selected];l.bindPopup('<strong>'+esc(areas[selected].name)+' trail</strong><p>'+esc(name==='Mapped path'?'Connecting path':name)+'</p><p>'+esc(guide.text)+'</p><a href="https://drive.google.com/file/d/'+guide.id+'/view" target="_blank" rel="noopener">Town trail brochure ↗</a>');return;}
  if(preview){l.bindPopup('<strong>'+esc(areas[selected].name)+' trail</strong><p>'+esc(name==='Mapped path'?'Connected trail path':name)+(p.approximation?' — approximate Town-map route':'')+'</p>');return;}
  const sourceId=p.osm_way_id||p.objectid;
  l.bindPopup('<strong>'+esc(name)+'</strong><p>'+esc(p.source)+' · '+esc(p.status)+'<br>'+esc(p.source_layer||p.highway||'')+(p.surface?' · '+esc(p.surface):'')+'</p><p>Source feature '+esc(sourceId)+(p.acc_status?'<br>Source access: '+esc(p.acc_status):'')+'</p><a href="'+esc(p.source_url)+'" target="_blank" rel="noopener">View source geometry ↗</a>');
 }}).addTo(group);
 if(selected==='meadow'&&meadowTrailhead){
  L.circleMarker([meadowTrailhead.latitude,meadowTrailhead.longitude],{radius:9,color:'#17384d',weight:3,fillColor:'#f2c100',fillOpacity:1}).bindTooltip('Meadow Street trail starting point').bindPopup('<strong>Meadow Street trail starting point</strong><p>Eastern end of Meadow Street, beside Norwood Memorial Airport.</p><a href="'+esc(meadowTrailhead.google_maps_url)+'" target="_blank" rel="noopener">Google Maps ↗</a><br><a href="'+esc(meadowTrailhead.brochure_url)+'" target="_blank" rel="noopener">Town trail brochure ↗</a>').addTo(group);
 }
 updateCount();
}
function updateCount(){
 if(!data)return;if(preview&&selected==='willett'){status.textContent=$('trailLayerToggle').checked?'Willett / Tiot: red dashed — planned 0.37-mile leg behind Willett School, from the easement to Westover Parkway. Approximate brochure alignment; click the line for the brochure.':'Willett / Tiot trail hidden.';return;}if((preview||selected==='ellis-pond'||selected==='ellis-playground'||selected==='ledgeview')&&brochureGuides[selected]){status.textContent=$('trailLayerToggle').checked?areas[selected].name+' — '+brochureGuides[selected].text:areas[selected].name+' trails hidden.';return;}if(selected==='hennessey'){status.textContent=$('trailLayerToggle').checked?'Hennessey Field / Murphy Park — Gray: primary gravel paths between Cross Street and Lenox Avenue, including the eastern branch. Green: natural woodland loop and short northern offshoot. Colors match the Town brochure. Click a section for details and the brochure.':'Hennessey Field / Murphy Park trails hidden.';return;}if(selected==='vanderbilt'){status.textContent='Vanderbilt / Pine Tree Forest: inner and outer loops approximated from the Town brochure using Vanderbilt Avenue, Morgan Drive and the power-line corridor. Both loops together form the 5K route. Click a loop for the brochure.';return;}if(selected==='meadow'){status.textContent=$('trailLayerToggle').checked?'Meadow Street: seven brochure routes. Blue, black, green, magenta, orange and yellow match the Town map; Green–White is shown as a green dashed line.':'Meadow Street trails hidden.';return;}if(preview){status.textContent=$('trailLayerToggle').checked?areas[selected].name+' trail preview — all displayed paths grouped under one trail control.':areas[selected].name+' trail hidden.';return;}const bounds=map.getBounds();let count=0;
 group.eachLayer(g=>g.eachLayer(l=>{if(l.getBounds&&bounds.intersects(l.getBounds()))count++;}));
 const shown=selectedFeatures().filter(allowed).length;
 status.textContent=selected==='germany'?'Germany Brook: green includes the main route, Father Mac’s pool loop, landfill spur and western-end connection past the baseball field to Willett School. Blue: other connected OSM offshoots.':count+' source segments in view · '+shown+' displayed overall. Area: '+areas[selected].name+'. Lines use the stored source coordinates.';
}
function focus(){const area=areas[selected];map.fitBounds((preview&&selected==='germany'||selected==='meadow'||selected==='vanderbilt'||selected==='hennessey'||selected==='ellis-pond'||selected==='ellis-playground'||selected==='ledgeview'||(preview&&selected==='willett'))&&group.getLayers().length?group.getBounds():area.bounds,{padding:[22,22]});$('trailLayerFocus').textContent='Zoom to '+area.name;}
function setPreview(value){
 preview=value&&selected!=='all';
 if(preview){$('trailLayerToggle').checked=true;group.addTo(map);}
 $('trailSourceControls').style.display=preview?'none':'flex';
 previewControls();
 $('trailPreviewButton').setAttribute('aria-pressed',String(preview));

 render();focus();if(preview)$('prototypeMap').scrollIntoView({behavior:'smooth',block:'start'});
}
$('trailPreviewButton').addEventListener('click',()=>setPreview(!preview));
$('trailAreaSelect').addEventListener('change',e=>{selected=e.target.value;setPreview(preview);});
$('trailLayerFocus').addEventListener('click',focus);
['trailMapc','trailOsm','trailPlanned','trailNearby'].forEach(id=>$(id).addEventListener('change',render));
$('trailLayerToggle').addEventListener('change',e=>{if(e.target.checked){group.addTo(map);boundary.addTo(map);render();}else{map.removeLayer(group);map.removeLayer(boundary);status.textContent=preview?areas[selected].name+' trail hidden.':'Trail overlays hidden.';}});
map.on('moveend',()=>{if($('trailLayerToggle').checked)updateCount();});
window.addEventListener('norwood:show-trails',()=>{$('trailLayerToggle').checked=true;group.addTo(map);boundary.addTo(map);focus();});
const reviewLayout=()=>{document.body.classList.toggle('trail-review-mode',['','trails'].includes($('mapCategory')?.value||''));map.invalidateSize();};
$('mapCategory')?.addEventListener('change',reviewLayout);reviewLayout();
const params=new URLSearchParams(location.search);if(areas[params.get('trail')])selected=params.get('trail');$('trailAreaSelect').value=selected;previewControls();
const aerial=L.tileLayer('https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/Massachusetts_Aerial_Imagery_2025/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,maxNativeZoom:19,attribution:'MassGIS · Massachusetts 2025 aerial imagery'});
map.removeLayer(window.norwoodTrailBasemap);aerial.addTo(map);
L.control.layers({'OpenStreetMap':window.norwoodTrailBasemap,'MassGIS 2025 aerial':aerial},null,{position:'topright'}).addTo(map);
map.attributionControl.addAttribution('Trail lines: MAPC; © OpenStreetMap contributors, ODbL');
(async()=>{
 try{
  const response=await fetch('data/trails/norwood-source-paths.geojson?v=20261102');if(!response.ok)throw Error('Path data HTTP '+response.status);data=await response.json();if(!Array.isArray(data.features))throw Error('Invalid path data');
  const meadowResponse=await fetch('data/trails/meadow-street-trailhead.json?v=20261102-google1');if(!meadowResponse.ok)throw Error('Meadow Street trailhead HTTP '+meadowResponse.status);meadowTrailhead=await meadowResponse.json();
  const meadowRoutesResponse=await fetch('data/trails/meadow-street-approved.geojson?v=20261102-locked1');if(!meadowRoutesResponse.ok)throw Error('Meadow Street routes HTTP '+meadowRoutesResponse.status);meadow=await meadowRoutesResponse.json();
  const additionsResponse=await fetch('data/trails/endean-connections.geojson?v=20261102-coakley1');if(!additionsResponse.ok)throw Error('Endean connection HTTP '+additionsResponse.status);const additions=await additionsResponse.json();data.features.push(...additions.features);
  const endeanResponse=await fetch('data/trails/endean-approved.geojson?v=20261102-locked1');if(!endeanResponse.ok)throw Error('Endean approved paths HTTP '+endeanResponse.status);endean=await endeanResponse.json();
  const ledgeviewResponse=await fetch('data/trails/ledgeview-review.geojson?v=20261103-1');if(!ledgeviewResponse.ok)throw Error('Ledgeview paths HTTP '+ledgeviewResponse.status);ledgeview=await ledgeviewResponse.json();
  const willettResponse=await fetch('data/trails/willett-tiot-review.geojson?v=20261104-building2');if(!willettResponse.ok)throw Error('Willett / Tiot paths HTTP '+willettResponse.status);willett=await willettResponse.json();
  const ellisPlaygroundResponse=await fetch('data/trails/ellis-playground-review.geojson?v=20261103-1');if(!ellisPlaygroundResponse.ok)throw Error('Ellis Playground paths HTTP '+ellisPlaygroundResponse.status);ellisPlayground=await ellisPlaygroundResponse.json();
  const ellisPondResponse=await fetch('data/trails/ellis-pond-review.geojson?v=20261103-2');if(!ellisPondResponse.ok)throw Error('Ellis Pond paths HTTP '+ellisPondResponse.status);ellisPond=await ellisPondResponse.json();
  const hennesseyResponse=await fetch('data/trails/hennessey-review.geojson?v=20261103-colors1');if(!hennesseyResponse.ok)throw Error('Hennessey paths HTTP '+hennesseyResponse.status);hennessey=await hennesseyResponse.json();
  const vanderbiltResponse=await fetch('data/trails/vanderbilt-approved.geojson?v=20261103-1');if(!vanderbiltResponse.ok)throw Error('Vanderbilt loops HTTP '+vanderbiltResponse.status);vanderbilt=await vanderbiltResponse.json();
  const networkResponse=await fetch('data/trails/germany-brook-approved.geojson?v=20261102-locked1');if(!networkResponse.ok)throw Error('Germany Brook network HTTP '+networkResponse.status);germany=await networkResponse.json();if(params.get('preview')==='1')setPreview(true);else{render();focus();}
 }catch(e){status.textContent='Trail lines could not load: '+e.message;}
 try{
  const response=await fetch('data/trails/norwood-boundary.geojson');if(!response.ok)return;const geo=await response.json();L.geoJSON(geo,{style:{color:'#34495e',weight:2,opacity:.75,fill:false,dashArray:'3 5'},interactive:false}).addTo(boundary);
 }catch(_){}
})();
})();
