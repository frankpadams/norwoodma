(()=>{'use strict';
const map=window.norwoodTrailMap,L=window.L,toggle=document.getElementById('workZoneToggle'),status=document.getElementById('workZoneStatus');
if(!map||!L||!toggle||!status)return;
const FEED='data/work-zones.json';
const nearNorwood=L.latLngBounds([[42.12,-71.29],[42.27,-71.10]]);
let layer=L.geoJSON(null,{filter:activeNearNorwood,style:f=>({color:Date.parse(f.properties.start_date)>Date.now()?'#7456a3':'#c2410c',weight:6,opacity:.9,dashArray:Date.parse(f.properties.start_date)>Date.now()?'8 5':null}),onEachFeature:(f,featureLayer)=>{
 const p=f.properties||{},core=p.core_details||{},roads=(core.road_names||[]).filter(Boolean).join(', ')||core.name||'Road work';
 const start=p.start_date?new Date(p.start_date):null,end=p.end_date?new Date(p.end_date):null;
 const fmt=d=>d&&!Number.isNaN(d.getTime())?d.toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'not listed';
 const impact=p.vehicle_impact?String(p.vehicle_impact).replaceAll('-',' '):'not specified';
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 featureLayer.bindPopup('<div class="map-popup"><h3>🚧 '+escape(roads)+'</h3><p>Active work zone'+(core.direction&&core.direction!=='undefined'?' · '+escape(core.direction):'')+'</p><p>Traffic impact: '+escape(impact)+'</p><p>Until: '+escape(fmt(end))+'</p><p><a href="https://feed.massdot-swzm.com/" target="_blank" rel="noopener">MassDOT work-zone feed ↗</a></p></div>');
 featureLayer.bindTooltip('🚧 '+escape(roads),{sticky:true});
}});
function coordsNear(geometry){if(!geometry?.coordinates)return false;let found=false;const walk=c=>{if(found)return;if(Array.isArray(c)&&c.length>=2&&typeof c[0]==='number'&&typeof c[1]==='number'){if(nearNorwood.contains([c[1],c[0]]))found=true;return}if(Array.isArray(c))c.forEach(walk)};walk(geometry.coordinates);return found}
function activeNearNorwood(feature){const p=feature?.properties||{},start=Date.parse(p.start_date||''),end=Date.parse(p.end_date||''),now=Date.now();return (!Number.isFinite(start)||start<=now+86400000)&&(!Number.isFinite(end)||end>=now)&&coordsNear(feature?.geometry)}
let timer=null,loading=false,sequence=0;
async function refresh(token){if(loading||!toggle.checked||token!==sequence)return;loading=true;try{const response=await fetch(FEED,{cache:'no-store'});if(!response.ok)throw Error(response.status);const data=await response.json();if(!toggle.checked||token!==sequence)return;layer.clearLayers();layer.addData(data);const n=layer.getLayers().length;status.innerHTML=n?'Live MassDOT feed · '+n+' active or upcoming work zone'+(n===1?'':'s')+' near Norwood · orange: active; purple: scheduled within 24 hours. <a href="https://feed.massdot-swzm.com/" target="_blank" rel="noopener">Source ↗</a>':'No active or upcoming work zones listed near Norwood within 24 hours. <a href="https://feed.massdot-swzm.com/" target="_blank" rel="noopener">Source ↗</a>';const stamp=data.feed_info?.update_date;if(stamp)status.append(' Feed updated '+new Date(stamp).toLocaleString('en-US',{timeZone:'America/New_York'})+' ET.')}catch(error){if(toggle.checked&&token===sequence)status.textContent='MassDOT work-zone data is temporarily unavailable. It will retry in 60 seconds.';console.warn('MassDOT work-zone layer failed',error)}finally{loading=false}}
toggle.addEventListener('change',()=>{const token=++sequence;if(!toggle.checked){if(timer){clearInterval(timer);timer=null}map.removeLayer(layer);status.textContent='Work-zone layer is off.';return}layer.addTo(map);status.textContent='Loading active MassDOT work zones near Norwood…';refresh(token);timer=setInterval(()=>refresh(token),60000)});
status.textContent='MassDOT work zones near Norwood, active or scheduled within 24 hours.';
})();