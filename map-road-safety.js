/* Optional MassDOT crash locations. Official geocoded crash reports, not a live feed. */
(()=>{
 'use strict';
 const map=window.norwoodTrailMap, toggle=document.getElementById('roadSafetyCrashes'),status=document.getElementById('roadSafetyStatus');
 if(!map||!window.L||!toggle||!status)return;
 const layer=L.layerGroup(), years=[2024,2025];
 let loaded=false,loading=false;
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const say=s=>{status.textContent=s;};
 async function getYear(year){
  const endpoint='https://gis.crashdata.dot.mass.gov/arcgis/rest/services/MassDOT/MASSDOT_ODP_OPEN_'+year+'/FeatureServer/0/query';
  const q=new URLSearchParams({where:"CITY_TOWN_NAME = 'NORWOOD'",outFields:'CRASH_DATE_TEXT,CRASH_SEVERITY_DESCR,RDWY,NEAR_INT_RDWY,YEAR,OBJECTID',returnGeometry:'true',outSR:'4326',f:'geojson',resultRecordCount:'2000'});
  const res=await fetch(endpoint+'?'+q,{mode:'cors'});
  if(!res.ok)throw Error('MassDOT '+year+': '+res.status);
  const json=await res.json();
  if(json.error)throw Error(json.error.message||'MassDOT service error');
  return json.features||[];
 }
 toggle.addEventListener('change',async()=>{
  if(!toggle.checked){map.removeLayer(layer);return;}
  layer.addTo(map);
  if(loaded||loading)return;
  loading=true;say('Loading Norwood crash locations from MassDOT…');
  try{
   const results=await Promise.allSettled(years.map(getYear));
   const features=results.filter(x=>x.status==='fulfilled').flatMap(x=>x.value);
   if(!features.length&&results.some(x=>x.status==='rejected'))throw Error('MassDOT crash service unavailable');
   for(const f of features){
    if(f.geometry?.type!=='Point')continue;
    const [lon,lat]=f.geometry.coordinates||[];
    if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
    const p=f.properties||{};
    const severity=String(p.CRASH_SEVERITY_DESCR||'').toLowerCase();
    const color=severity.includes('fatal')?'#9f2330':severity.includes('injur')?'#dc8426':'#376b9b';
    const marker=L.circleMarker([lat,lon],{radius:5,color:'#fff',weight:1,fillColor:color,fillOpacity:.82});
    marker.bindPopup('<strong>Reported traffic crash</strong><div>'+escape(p.CRASH_DATE_TEXT||p.YEAR||'Date unavailable')+'</div><div>'+escape(p.CRASH_SEVERITY_DESCR||'Severity not specified')+'</div><div>'+escape([p.RDWY,p.NEAR_INT_RDWY].filter(Boolean).join(' near '))+'</div><small>Source: MassDOT crash records; locations may be approximate.</small>');
    layer.addLayer(marker);
   }
   loaded=true;
   const failed=results.filter(x=>x.status==='rejected').length;
   say('MassDOT reported crash locations (2024–2025): '+layer.getLayers().length+' mapped'+(failed?'; one year could not load':'')+'. Reports may be incomplete or approximately located.');
  }catch(err){say('Crash locations could not load from MassDOT. Please try again later.');console.warn('Norwood road safety layer',err);}
  finally{loading=false;}
 });
})();
