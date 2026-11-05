/* Integrated trail overlays for Explore Norwood map. */
(()=>{'use strict';
const map=window.norwoodTrailMap,root=document.getElementById('mapTrailChoices');if(!map||!root)return;
const trails=[
['shattuck','Shattuck Park','shattuck-park-approved','https://www.norwoodma.gov/document_center/Trails%20Committee/2023.03.24%20ShattuckPark_Trails_MAP_BROCHURE.pdf'],
['cooper','Bernie Cooper Park','bernie-cooper-review','https://www.norwoodma.gov/Trails/Broc_Cooper_D1_20250812.pdf'],
['germany','Germany Brook','germany-brook-approved','https://www.norwoodma.gov/Trails/2023.03.24%20GermanyBk_MAP_BROCHURE.pdf'],
['endean','Endean / Hawes Brook','endean-hawes-review','https://www.norwoodma.gov/document_center/Trails%20Committee/2023.02.21%20EndeanHawesBrTr_MAP_BROCHURE.pdf'],
['meadow','Meadow Street','meadow-street-approved','https://www.norwoodma.gov/Trails/Broc_MeadowStProp_D5Alt_20250807.pdf'],
['vanderbilt','Vanderbilt','vanderbilt-approved','https://www.norwoodma.gov/VanderbiltPTFInnerAndOuterLoops5KMap.pdf'],
['pineforest','Pine Tree Forest','pineforest-vanderbilt-approved','https://www.norwoodma.gov/Planning/PineTreeForestVanderbiltAllLoopsMap.pdf'],
['hennessey','Hennessey / Murphy','hennessey-review','https://www.norwoodma.gov/document_center/Trails%20Committee/2023.03.24%20HennesseyField%20and%20MurphyPark_Trails_MAP_BROCHURE.pdf'],
['ellis-pond','Ellis Pond','ellis-pond-review','https://www.norwoodma.gov/document_center/Trails%20Committee/2023.03.24%20EllisPond_Alevizos%20Park_MAP_BROCHURE.pdf'],
['ellis-playground','Ellis Playground','ellis-playground-review','https://www.norwoodma.gov/Trails/2023.03.24%20EllisPlayground_%20MAP_BROCHURE.pdf'],
['ledgeview','Ledgeview Drive','ledgeview-review','https://www.norwoodma.gov/Trails/LedgeviewDriveMap.pdf'],
['willett','Willett / Tiot Trail','willett-tiot-approved','https://www.norwoodma.gov/Planning/trails/WillettTiotTrailLegMap.pdf']
];
const layers=new Map(),checks=new Map(),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const status=document.createElement('p');status.setAttribute('aria-live','polite');status.style.fontSize='.75rem';root.after(status);
function fit(){const group=L.featureGroup([...layers].filter(([k])=>checks.get(k)?.checked).map(([,v])=>v));if(group.getLayers().length&&group.getBounds().isValid())map.fitBounds(group.getBounds(),{padding:[25,25],maxZoom:17});}
async function toggle(item,checked){const [key,name,file,doc]=item;const cb=checks.get(key);
if(!checked){if(layers.has(key))map.removeLayer(layers.get(key));return;}
try{if(!layers.has(key)){status.textContent='Loading '+name+'…';const r=await fetch('data/trails/'+file+'.geojson');if(!r.ok)throw Error('HTTP '+r.status);const geo=await r.json();const layer=L.geoJSON(geo,{style:f=>{const p=f.properties||{};return {color:p.route_color||(key==='cooper'?'#c8322a':'#387f38'),weight:4,opacity:1,dashArray:p.line_pattern==='dots'?'1 12':p.line_pattern==='dashes'?'10 7':null}},onEachFeature:(f,l)=>{const p=f.properties||{};l.bindTooltip(name,{sticky:true});l.bindPopup('<div class="map-popup"><h3>'+escape(name)+'</h3>'+(p.section_description?'<p>'+escape(p.section_description)+'</p>':'')+'<p><a href="'+doc+'" target="_blank" rel="noopener">Town trail brochure ↗</a></p><p><a href="trails.html">Explore Norwood trails →</a></p></div>')}});layers.set(key,layer);}
if(cb.checked){layers.get(key).addTo(map);fit();}status.textContent='';
}catch(err){cb.checked=false;status.textContent=name+' could not be loaded. Try again.';console.warn('Trail overlay',key,err)}}
for(const item of trails){const [key,name,,doc]=item;const label=document.createElement('label');label.className='trail-layer-entry';const cb=document.createElement('input');cb.type='checkbox';cb.setAttribute('aria-label','Show '+name+' trail');checks.set(key,cb);cb.addEventListener('change',()=>toggle(item,cb.checked));const span=document.createElement('span');span.textContent=name;const a=document.createElement('a');a.href=doc;a.target='_blank';a.rel='noopener';a.textContent='Brochure ↗';label.append(cb,span,a);root.append(label);}
document.getElementById('trailFit')?.addEventListener('click',fit);
document.getElementById('trailClear')?.addEventListener('click',()=>{for(const [key,cb] of checks){cb.checked=false;if(layers.has(key))map.removeLayer(layers.get(key));}status.textContent='Trail overlays cleared.'});
})();