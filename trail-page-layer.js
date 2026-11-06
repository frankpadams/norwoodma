/* Visitor trail map: one independent checkbox and layer per trail. */
(()=>{
'use strict';
const map=window.norwoodTrailMap;if(!map)return;
const select=document.getElementById('trailAreaSelect'),box=document.getElementById('trailCheckboxes');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const files={shattuck:'shattuck-park-approved',cooper:'bernie-cooper-review',germany:'germany-brook-approved',endean:'endean-hawes-review',meadow:'meadow-street-approved',vanderbilt:'vanderbilt-approved',pineforest:'pineforest-vanderbilt-approved',hennessey:'hennessey-review','ellis-pond':'ellis-pond-review','ellis-playground':'ellis-playground-review',ledgeview:'ledgeview-review',willett:'willett-tiot-approved'};
const docs={shattuck:'https://www.norwoodma.gov/document_center/Trails%20Committee/2023.03.24%20ShattuckPark_Trails_MAP_BROCHURE.pdf',germany:'https://www.norwoodma.gov/Trails/2023.03.24%20GermanyBk_MAP_BROCHURE.pdf',endean:'https://www.norwoodma.gov/document_center/Trails%20Committee/2023.02.21%20EndeanHawesBrTr_MAP_BROCHURE.pdf',meadow:'https://www.norwoodma.gov/Trails/Broc_MeadowStProp_D5Alt_20250807.pdf',cooper:'https://www.norwoodma.gov/Trails/Broc_Cooper_D1_20250812.pdf',vanderbilt:'https://www.norwoodma.gov/VanderbiltPTFInnerAndOuterLoops5KMap.pdf',pineforest:'https://www.norwoodma.gov/Planning/PineTreeForestVanderbiltAllLoopsMap.pdf',hennessey:'https://www.norwoodma.gov/document_center/Trails%20Committee/2023.03.24%20HennesseyField%20and%20MurphyPark_Trails_MAP_BROCHURE.pdf','ellis-pond':'https://www.norwoodma.gov/document_center/Trails%20Committee/2023.03.24%20EllisPond_Alevizos%20Park_MAP_BROCHURE.pdf','ellis-playground':'https://www.norwoodma.gov/Trails/2023.03.24%20EllisPlayground_%20MAP_BROCHURE.pdf',ledgeview:'https://www.norwoodma.gov/Trails/LedgeviewDriveMap.pdf',willett:'https://www.norwoodma.gov/Planning/trails/WillettTiotTrailLegMap.pdf'};
const bounds={shattuck:[[42.1908,-71.214],[42.1945,-71.2075]],cooper:[[42.170,-71.212],[42.181,-71.197]]};
const names=Object.fromEntries([...select.options].map(o=>[o.value,o.textContent]));
const layers={},checks={},requestVersion={};let sourcePromise;let selectingAll=false;let initialView=true;
const source=()=>sourcePromise||(sourcePromise=fetch('data/trails/norwood-source-paths.geojson').then(r=>r.json()));
function style(f,key){const p=f.properties||{},surf=(p.surface||'').toLowerCase();let color=p.route_color;
 if(!color)color=key==='cooper'?'#c8322a':key==='germany'||key==='endean'?(['asphalt','paved','concrete'].includes(surf)||p.source_layer==='Paved Footway'?'#202020':['gravel','fine_gravel','compacted'].includes(surf)?'#737373':'#387f38'):'#387f38';
 return {color,weight:4,opacity:1,smoothFactor:0,dashArray:p.line_pattern==='dots'?'1 12':p.line_pattern==='dashes'||p.seasonal==='yes'?'10 7':p.route_name==='Green–White'?'8 6':null};
}
function focus(){const g=L.featureGroup(Object.keys(layers).filter(k=>checks[k]?.checked).map(k=>layers[k]));if(g.getLayers().length&&g.getBounds().isValid())map.fitBounds(g.getBounds(),{padding:[28,28],maxZoom:17});}
function details(k){select.value=k;}
async function toggle(k){
 const cb=checks[k],request= requestVersion[k]=(requestVersion[k]||0)+1;
 if(!cb.checked){if(layers[k])map.removeLayer(layers[k]);return;}
 details(k);
 try{
 if(!layers[k]){
 let geo;
 if(files[k]){const r=await fetch('data/trails/'+files[k]+'.geojson?v=visitor-cooper-red3');if(!r.ok)throw Error('Could not load trail');geo=await r.json();}
 else {const all=await source(),b=L.latLngBounds(bounds[k]);geo={type:'FeatureCollection',features:all.features.filter(f=>f.properties?.in_norwood&&L.geoJSON(f).getBounds().intersects(b))};}
 if(request!==requestVersion[k]||!cb.checked)return;
 layers[k]=L.geoJSON(geo,{smoothFactor:0,style:f=>style(f,k),onEachFeature:(f,l)=>{
 const p=f.properties||{},section=p.route_name||p.local_name||p.name||'';
 let text=p.section_description||p.note||'';
 if(k==='ledgeview')text+=' Proposed access is contingent on land acquisition. Read the brochure for pools, trenches and high-water conditions.';
 l.bindTooltip(esc(names[k]),{sticky:true,direction:'top'});
 l.bindPopup('<strong>'+esc(names[k])+'</strong>'+(section?'<p>'+esc(section)+'</p>':'')+(text?'<p>'+esc(text)+'</p>':'')+'<a href="'+docs[k]+'" target="_blank" rel="noopener">Read the Town trail brochure ↗</a>'+(k==='ledgeview'?'<p><a href="https://waterdata.usgs.gov/monitoring-location/USGS-01105554/#dataTypeId=continuous-00065-0&amp;period=P7D" target="_blank" rel="noopener">Check river height ↗</a></p>':''));
 }});
 }
 if(cb.checked){layers[k].addTo(map);if(!selectingAll&&!initialView)focus();}
 }catch(e){if(request!==requestVersion[k]||!cb.checked)return;cb.checked=false;const err=document.getElementById('trailLoadError');if(err){err.hidden=false;err.textContent=names[k]+' could not load. Please try again.';}}
}
document.getElementById('trailLoading')?.remove();
const actions=document.createElement('div');actions.className='trail-actions';
const fit=document.createElement('button');fit.textContent='Fit selected trails';fit.type='button';fit.onclick=focus;
const clear=document.createElement('button');clear.textContent='Clear all';clear.type='button';clear.onclick=()=>{for(const k in checks){requestVersion[k]=(requestVersion[k]||0)+1;checks[k].checked=false;if(layers[k])map.removeLayer(layers[k]);}townCheck.checked=false;map.removeLayer(townOutline);};
const all=document.createElement('button');all.textContent='Select all';all.type='button';all.onclick=async()=>{selectingAll=true;try{await Promise.all(Object.keys(checks).map(k=>{checks[k].checked=true;return toggle(k);}));}finally{selectingAll=false;focus();}};
actions.append(all,clear,fit);box.append(actions);
const columnHead=document.createElement('div');columnHead.className='trail-column-head';columnHead.innerHTML='<span>Show trails</span><span>Brochures</span>';box.append(columnHead);
const townOutline=L.featureGroup().addTo(map);
const townLabel=document.createElement('label');townLabel.className='trail-choice';
const townCheck=document.createElement('input');townCheck.type='checkbox';townCheck.checked=true;
townCheck.addEventListener('change',()=>{if(townCheck.checked)townOutline.addTo(map);else map.removeLayer(townOutline);});
townLabel.append(townCheck,document.createTextNode('Town outline'));box.append(townLabel);
fetch('data/trails/norwood-boundary.geojson').then(r=>{if(!r.ok)throw Error('Boundary load failed');return r.json();}).then(geo=>L.geoJSON(geo,{interactive:false,style:{color:'#34495e',weight:2,opacity:.8,fill:false,dashArray:'5 5'}}).addTo(townOutline)).catch(()=>{townCheck.checked=false;townCheck.disabled=true;townLabel.append(document.createTextNode(' — unavailable'));});
for(const k of Object.keys(names)){if(!docs[k])continue;const label=document.createElement('label');label.className='trail-choice';const cb=document.createElement('input');cb.type='checkbox';cb.value=k;checks[k]=cb;cb.addEventListener('change',()=>toggle(k));cb.id='trail-choice-'+k;
const row=document.createElement('div');row.className='trail-choice-row';
const name=document.createElement('span');name.textContent=names[k];label.append(cb,name);
const brochure=document.createElement('a');brochure.className='trail-brochure-icon';brochure.href=docs[k];brochure.target='_blank';brochure.rel='noopener';brochure.title='Open '+names[k]+' brochure';brochure.setAttribute('aria-label',brochure.title);
brochure.innerHTML='<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z"/><path d="M9 3v16M15 5v16"/></svg>';
row.append(label,brochure);box.append(row);}
document.body.classList.add('trail-review-mode');
const aerial=L.tileLayer('https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/Massachusetts_Aerial_Imagery_2025/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,maxNativeZoom:19,attribution:'MassGIS · Massachusetts 2025 aerial imagery'});
L.control.layers({'OpenStreetMap':window.norwoodTrailBasemap,'Aerial imagery':aerial},null,{position:'topright'}).addTo(map);
map.fitBounds([[42.1515,-71.2355],[42.2265,-71.1505]],{padding:[20,20]});
initialView=false;
map.invalidateSize();
})();
