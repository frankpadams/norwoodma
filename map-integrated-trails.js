/* Integrated trail overlays for Explore Norwood map. */
(()=>{'use strict';
const map=window.norwoodTrailMap,root=document.getElementById('mapTrailChoices');if(!map||!root)return;
const trails=[
['shattuck','Shattuck Park','shattuck-park-approved','1glv3UMbXWVrsLtV4dnJAy4_3qkfwBXTw'],
['cooper','Bernie Cooper Park','bernie-cooper-review','1m3gd8omNf9o07rn6RJQ4meeIz9Kc1Z9V'],
['germany','Germany Brook','germany-brook-approved','1X-mPJgOAaNFPAF_jxQHyPPiwcpqv9--1'],
['endean','Endean / Hawes Brook','endean-hawes-review','1WwtpOYWhmyOCY1-L9RdgvQ4v-Yj8J3Sz'],
['meadow','Meadow Street','meadow-street-approved','1u1MtJmXcGFB3NRXDAlsmGkPwTM53QUXF'],
['vanderbilt','Vanderbilt','vanderbilt-approved','1vZ7KuQE0WHdan1lJJLNMbYqAdzj50iF0'],
['pineforest','Pine Tree Forest','pineforest-vanderbilt-approved','1X_ULmRhJYLmzNekIgRJkOggoqfcJYaNv'],
['hennessey','Hennessey / Murphy','hennessey-review','1WePcy2c3Map2MZzt0i3PFl5hZNEprT-q'],
['ellis-pond','Ellis Pond','ellis-pond-review','1nMBh4QI94dyM5U6xjmYX7CHpvKGr_6wX'],
['ellis-playground','Ellis Playground','ellis-playground-review','1x32aHzxdJrrcJvBEZbuB9H05Xaxtbkfp'],
['ledgeview','Ledgeview Drive','ledgeview-review','1XtBbNiYSEFR1R6i1udUzjPr1Hv_mC20o'],
['willett','Willett / Tiot Trail','willett-tiot-approved','1i3uG3TOsoQ2OeCiyV_-mpyKqjwjxlVKL']
];
const layers=new Map(),checks=new Map(),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const status=document.createElement('p');status.setAttribute('aria-live','polite');status.style.fontSize='.75rem';root.after(status);
function fit(){const group=L.featureGroup([...layers].filter(([k])=>checks.get(k)?.checked).map(([,v])=>v));if(group.getLayers().length&&group.getBounds().isValid())map.fitBounds(group.getBounds(),{padding:[25,25],maxZoom:17});}
async function toggle(item,checked){const [key,name,file,doc]=item;const cb=checks.get(key);
if(!checked){if(layers.has(key))map.removeLayer(layers.get(key));return;}
try{if(!layers.has(key)){status.textContent='Loading '+name+'…';const r=await fetch('data/trails/'+file+'.geojson');if(!r.ok)throw Error('HTTP '+r.status);const geo=await r.json();const layer=L.geoJSON(geo,{style:f=>{const p=f.properties||{};return {color:p.route_color||(key==='cooper'?'#c8322a':'#387f38'),weight:4,opacity:1,dashArray:p.line_pattern==='dots'?'1 12':p.line_pattern==='dashes'?'10 7':null}},onEachFeature:(f,l)=>{const p=f.properties||{};l.bindTooltip(name,{sticky:true});l.bindPopup('<div class="map-popup"><h3>'+escape(name)+'</h3>'+(p.section_description?'<p>'+escape(p.section_description)+'</p>':'')+'<p><a href="https://drive.google.com/file/d/'+doc+'/view" target="_blank" rel="noopener">Town trail brochure ↗</a></p><p><a href="trails.html">Explore Norwood trails →</a></p></div>')}});layers.set(key,layer);}
if(cb.checked){layers.get(key).addTo(map);fit();}status.textContent='';
}catch(err){cb.checked=false;status.textContent=name+' could not be loaded. Try again.';console.warn('Trail overlay',key,err)}}
for(const item of trails){const [key,name,,doc]=item;const label=document.createElement('label');label.className='trail-layer-entry';const cb=document.createElement('input');cb.type='checkbox';cb.setAttribute('aria-label','Show '+name+' trail');checks.set(key,cb);cb.addEventListener('change',()=>toggle(item,cb.checked));const span=document.createElement('span');span.textContent=name;const a=document.createElement('a');a.href='https://drive.google.com/file/d/'+doc+'/view';a.target='_blank';a.rel='noopener';a.textContent='Brochure ↗';label.append(cb,span,a);root.append(label);}
document.getElementById('trailFit')?.addEventListener('click',fit);
document.getElementById('trailClear')?.addEventListener('click',()=>{for(const [key,cb] of checks){cb.checked=false;if(layers.has(key))map.removeLayer(layers.get(key));}status.textContent='Trail overlays cleared.'});
})();