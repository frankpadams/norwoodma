/* Optional MassDEP tier-classified cleanup sites. Loaded only on demand.
 * Source: MassGIS C21E_PT, mirrored by public ArcGIS feature service.
 * Coverage is incomplete; locations are approximate and not field verified.
 */
(()=>{
'use strict';
const map=window.norwoodTrailMap, toggle=document.getElementById('environmentCleanupToggle');
if(!map||!toggle||!window.L)return;
const service='https://services7.arcgis.com/vZE8iWev3YlXRRXa/arcgis/rest/services/NRWA_RDG_Feature_Datasets/FeatureServer/1/query';
const group=L.layerGroup();let loaded=false,loading=false;
const note=document.createElement('div');note.style.cssText='font-size:.72rem;line-height:1.4;color:#526675;padding:3px 0 8px 24px';note.hidden=true;
toggle.closest('label').after(note);
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[x]));
function show(message){note.textContent=message;}
toggle.addEventListener('change',async()=>{
 note.hidden=!toggle.checked;
 if(!toggle.checked){map.removeLayer(group);return;}
 group.addTo(map);
 if(loaded){show('Orange dots: tier-classified sites. Approximate, incomplete MassDEP data (MassGIS update: August 2025).');return;}
 if(loading)return;
 loading=true;show('Loading MassDEP cleanup sites…');
 try{
  // Query the documented TOWN field directly; ArcGIS services may reject UPPER().
  // Use native ArcGIS JSON instead of GeoJSON, which is not supported by every layer.
  const params=new URLSearchParams({where:"TOWN = 'NORWOOD'",outFields:'*',returnGeometry:'true',outSR:'4326',f:'json'});
  const response=await fetch(service+'?'+params);
  if(!response.ok)throw Error('Service unavailable (HTTP '+response.status+')');
  const data=await response.json();
  if(data.error)throw Error(data.error.message||'ArcGIS query failed');
  if(!Array.isArray(data.features))throw Error('Invalid response');
  for(const feature of data.features){
   const lng=feature.geometry?.x,lat=feature.geometry?.y;
   if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
   const p=feature.attributes||{};
   const get=k=>p[k]??p[k.toUpperCase()]??p[k.toLowerCase()]??'';
   const rtn=get('rtn'),name=get('name')||'MassDEP cleanup site',address=get('address'),status=get('status');
   const source=get('site_info');
   const link=typeof source==='string'&&/^https:\/\//i.test(source)?source:null;
   const html='<div class="map-popup"><h3>'+esc(name)+'</h3><p>'+esc(address)+'</p><p><b>Release tracking number:</b> '+esc(rtn||'Not supplied')+'</p><p><b>Recorded status:</b> '+esc(status||'Not supplied')+'</p>'+(link?'<p><a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">View this MassDEP case record ↗</a></p>':'<p>Direct case link unavailable in source data.</p>')+'<p><small>MassGIS tier-classified sites only; not a complete inventory. Locations approximate. Verify current status with MassDEP.</small></p></div>';
   L.circleMarker([lat,lng],{radius:7,color:'#8c490d',weight:2,fillColor:'#f39a32',fillOpacity:.85}).bindPopup(html).addTo(group);
  }
  loaded=true;
  const count=group.getLayers().length;
  show(count?'Orange dots: '+count+' tier-classified sites. Approximate, incomplete MassDEP data (MassGIS update: August 2025).':'No tier-classified cleanup sites returned for Norwood by this dataset. This does not mean there are no reported releases; check the MassDEP Waste Site Cleanup Portal.');
  if(count)map.fitBounds(group.getBounds?group.getBounds():L.featureGroup(group.getLayers()).getBounds(),{padding:[35,35],maxZoom:14});
 }catch(error){console.warn('MassDEP cleanup layer:',error);show('Cleanup-site data could not be loaded from the source. Check MassDEP directly or try again later.');}
 finally{loading=false;}
});
})();
