/* Community-mapped accessibility clues for Norwood and nearby streets.
   OpenStreetMap coverage is incomplete; missing tags do not indicate lack of access. */
(()=>{
 const map=window.norwoodTrailMap;
 const L=window.L;
 const ids={places:'accessibilityPlacesToggle',paths:'accessibilityPathsToggle'};
 if(!map||!L)return;
 const status=document.getElementById('accessibilityStatus');
 const checkboxes=Object.fromEntries(Object.entries(ids).map(([k,id])=>[k,document.getElementById(id)]));
 if(!status||Object.values(checkboxes).some(x=>!x))return;
 const bbox='42.14,-71.26,42.23,-71.15';
 const overpass=[
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
 ];
 const queries={
  places:`[out:json][timeout:25];(nwr["wheelchair"]["amenity"](\${bbox});nwr["wheelchair"]["shop"](\${bbox});nwr["wheelchair"]["tourism"](\${bbox});nwr["wheelchair"]["leisure"](\${bbox});nwr["wheelchair"]["healthcare"](\${bbox});nwr["wheelchair"]["office"](\${bbox}););out center;`,
  paths:`[out:json][timeout:25];(
   way["highway"~"^(footway|pedestrian|path)$"]["wheelchair"~"^(yes|designated|limited)$"](\${bbox});
   nwr["kerb"~"^(lowered|flush|rolled|raised|no)$"](\${bbox});
   nwr["tactile_paving"="yes"](\${bbox});
  );out center geom;`
 };
 const cache={places:null,paths:null},layers={places:null,paths:null};
 const osm='https://www.openstreetmap.org/copyright';
 const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const titleOf=e=>e.tags?.name||e.tags?.amenity||e.tags?.shop||e.tags?.tourism||e.tags?.leisure||e.tags?.highway||'Mapped accessibility feature';
 function pointFor(e){
  if(e.type==='node'&&Number.isFinite(e.lat)&&Number.isFinite(e.lon))return [e.lat,e.lon];
  if(e.center&&Number.isFinite(e.center.lat)&&Number.isFinite(e.center.lon))return [e.center.lat,e.center.lon];
  if(Array.isArray(e.geometry)&&e.geometry.length){
   const pts=e.geometry.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon));
   if(pts.length)return [pts.reduce((n,p)=>n+p.lat,0)/pts.length,pts.reduce((n,p)=>n+p.lon,0)/pts.length];
  }
  return null;
 }
 async function load(key){
  if(cache[key])return cache[key];
  const query=queries[key].replaceAll('${bbox}',bbox);
  let lastError;
  for(const endpoint of overpass){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
   try{
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams({data:query}),signal:controller.signal});
    if(!response.ok)throw Error('OpenStreetMap query returned '+response.status);
    const data=await response.json();
    if(!Array.isArray(data.elements))throw Error('Unexpected OpenStreetMap response');
    cache[key]=data.elements;
    clearTimeout(timer);
    return cache[key];
   }catch(error){lastError=error;clearTimeout(timer);}
  }
  throw lastError||Error('OpenStreetMap data is unavailable');
 }
 function popup(e,key){
  const t=e.tags||{},rows=[];
  if(t.wheelchair)rows.push('<strong>Wheelchair access:</strong> '+safe(t.wheelchair));
  if(t.kerb)rows.push('<strong>Curb:</strong> '+safe(t.kerb));
  if(t.tactile_paving)rows.push('<strong>Tactile paving:</strong> '+safe(t.tactile_paving));
  if(t.highway)rows.push('<strong>Path type:</strong> '+safe(t.highway));
  if(t.footway)rows.push('<strong>Footway:</strong> '+safe(t.footway));
  return '<strong>'+safe(titleOf(e))+'</strong><p>'+rows.join('<br>')+'</p><small>Community-contributed OpenStreetMap data. Verify conditions on site.</small><br><a href="'+osm+'" target="_blank" rel="noopener">OpenStreetMap contributors ↗</a>';
 }
 function makePlaces(elements){
  const group=L.layerGroup();
  const colors={yes:'#18834b',designated:'#18834b',limited:'#d18a00',no:'#bd3434'};
  let count=0;
  for(const e of elements){
   const coords=pointFor(e),value=String(e.tags?.wheelchair||'').toLowerCase().trim();
   if(!coords||!value)continue;
   const color=colors[value]||'#687983';
   const marker=L.circleMarker(coords,{radius:7,color:'#fff',weight:2,fillColor:color,fillOpacity:.95});
   marker.bindPopup(popup(e,'places'));marker.bindTooltip(titleOf(e));marker.addTo(group);count++;
  }
  return {layer:group,count};
 }
 function makePaths(elements){
  const group=L.layerGroup();let count=0;
  for(const e of elements){
   const t=e.tags||{};
   const isPath=e.type==='way'&&/^(footway|pedestrian|path)$/.test(t.highway||'')&&/^(yes|designated|limited)$/.test(t.wheelchair||'');
   const hasAccessDetail=!!(t.kerb||t.tactile_paving==='yes');
   if(isPath&&Array.isArray(e.geometry)&&e.geometry.length>1){
    const coords=e.geometry.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)).map(p=>[p.lat,p.lon]);
    if(coords.length>1){
     const color=t.wheelchair==='limited'?'#d18a00':'#18834b';
     L.polyline(coords,{color,weight:5,opacity:.82}).bindPopup(popup(e,'paths')).bindTooltip((t.wheelchair==='limited'?'Limited wheelchair access · ':'Wheelchair access tagged · ')+titleOf(e)).addTo(group);count++;
    }
   }else if(hasAccessDetail){
    const coords=pointFor(e);if(!coords)continue;
    const tactile=t.tactile_paving==='yes',lowered=/^(lowered|flush|rolled)$/.test(t.kerb||'');
    const color=tactile?'#7547a8':lowered?'#2470a8':t.kerb?'#bd3434':'#687983';
    L.circleMarker(coords,{radius:6,color:'#fff',weight:2,fillColor:color,fillOpacity:.95}).bindPopup(popup(e,'paths')).bindTooltip(tactile?'Tactile paving':lowered?'Lowered/flush curb':'Curb detail').addTo(group);count++;
   }
  }
  return {layer:group,count};
 }
 const builders={places:makePlaces,paths:makePaths};
 async function toggle(key){
  const input=checkboxes[key];
  if(!input.checked){if(layers[key])map.removeLayer(layers[key].layer);return;}
  status.textContent=key==='places'?'Loading wheelchair access information…':'Loading accessible paths and crossing details…';
  try{
   const result=builders[key](await load(key));layers[key]=result;
   if(!input.checked)return;
   result.layer.addTo(map);
   const count=result.count;
   status.textContent=key==='places'
    ?count+' mapped place or feature'+(count===1?'':'s')+' with wheelchair information. OpenStreetMap data are community contributed and may be incomplete.'
    :count+' mapped path or crossing feature'+(count===1?'':'s')+'. Tagged paths do not guarantee an accessible route; curb and tactile details may be incomplete.';
  }catch(error){
   if(input.checked)status.textContent='Accessibility data could not be loaded right now. Try again later or view the OpenStreetMap map.';
   console.warn('Accessibility map layer could not load',error);
  }
 }
 for(const [key,input] of Object.entries(checkboxes))input.addEventListener('change',()=>toggle(key));
})();
