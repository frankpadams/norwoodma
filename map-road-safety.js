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

/* MassDOT traffic-count station locations (not live traffic volumes). */
(()=>{
 const map=window.norwoodTrailMap,toggle=document.getElementById('roadSafetyCounts'),status=document.getElementById('roadSafetyStatus');
 if(!map||!toggle||!window.L)return;
 const layer=L.layerGroup();let loaded=false,busy=false;
 const clean=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 toggle.addEventListener('change',async()=>{
  if(!toggle.checked){map.removeLayer(layer);return;}
  layer.addTo(map);if(loaded||busy)return;busy=true;status.textContent='Loading MassDOT traffic count stations…';
  try{
   const base='https://gisstg.massdot.state.ma.us/arcgis/rest/services/Roads/TrafficCountLocations/MapServer/0/query';
   const p=new URLSearchParams({where:"TOWN = 'Norwood'",outFields:'ROUTE_STREET,STATION_NUMBER,STATION_LOC,COUNT_YR_CYCLE,NUM_OF_LANES,STA_TYPE,STA_STATUS,TOWN',returnGeometry:'true',outSR:'4326',f:'geojson',resultRecordCount:'1000'});
   const response=await fetch(base+'?'+p);if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();if(data.error)throw Error(data.error.message);
   for(const feature of data.features||[]){const coords=feature.geometry?.coordinates;if(feature.geometry?.type!=='Point'||!coords)continue;
    const [lng,lat]=coords;if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<42.12||lat>42.26||lng< -71.30||lng> -71.10)continue;
    const a=feature.properties||{};const parts=['<strong>MassDOT traffic count station</strong>',clean(a.ROUTE_STREET||'Road not specified'),a.STATION_LOC?clean(a.STATION_LOC):'',a.STATION_NUMBER!=null?'Station #'+clean(a.STATION_NUMBER):'',a.COUNT_YR_CYCLE?'Count cycle: '+clean(a.COUNT_YR_CYCLE):'',a.NUM_OF_LANES?'Lanes: '+clean(a.NUM_OF_LANES):''].filter(Boolean);
    L.circleMarker([lat,lng],{radius:6,color:'#fff',weight:1.5,fillColor:'#7542a2',fillOpacity:.9}).bindPopup(parts.map((x,i)=>i?'<div>'+x+'</div>':x).join('')+'<small>Station location only; not a live count or current traffic volume. <a href="https://www.mass.gov/traffic-volume-and-classification-in-massachusetts" target="_blank" rel="noopener">Look up traffic counts at MassDOT</a>.</small>').addTo(layer);
   }
   loaded=true;status.textContent='MassDOT traffic count stations: '+layer.getLayers().length+' mapped. These are monitoring locations, not current traffic-volume readings.';
  }catch(e){console.warn('Traffic count layer',e);status.textContent='MassDOT traffic count stations could not load. See MassDOT’s official traffic-volume map for count values.';}
  finally{busy=false;}
 });
})();
