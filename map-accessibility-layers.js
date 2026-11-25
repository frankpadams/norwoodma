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
 const overpass=['https://overpass.private.coffee/api/interpreter','https://ovp.dresel.systems/api-na/interpreter','https://overpass-api.de/api/interpreter'];
 const queries={
  places:`[out:json][timeout:20];(nwr["wheelchair"]["amenity"](\${bbox});nwr["wheelchair"]["shop"](\${bbox});nwr["wheelchair"]["tourism"](\${bbox});nwr["wheelchair"]["leisure"](\${bbox});nwr["wheelchair"]["healthcare"](\${bbox});nwr["wheelchair"]["office"](\${bbox}););out center;`,
  paths:`[out:json][timeout:20];(way["highway"~"^(footway|pedestrian|path)$"]["wheelchair"~"^(yes|designated|limited)$"](\${bbox});nwr["kerb"~"^(lowered|flush|rolled|raised|no)$"](\${bbox});nwr["tactile_paving"="yes"](\${bbox}););out center geom;`
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
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
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
 const inventorySource='https://www.norwoodma.gov/Planning/AppendixB_ADAEval_v2.pdf';
 const inventorySites=[
 ["Alevizos Park", 42.18009, -71.21997, 11, "The Town recorded picnic tables designed for wheelchair access, a route across mown grass, and no marked accessible parking near the entrances.", "Evaluate a route to the planned pavilion."],
 ["Ellis Pond", 42.1801, -71.2195, 13, "The Town recorded accessible parking on Nichols Street and a stone-dust path to the water. Some stretches near the pond trail were short and steep."],
 ["Endean Conservation Land", 42.173604, -71.212938, 13, "The Town described mown-grass paths that could be hard to navigate. Survey respondents reported overgrowth.", "Maintain the paths more frequently."],
 ["Hawes Recreation Area", 42.17079, -71.21004, 14, "The Town recorded a rebuilt accessible bathhouse and two accessible parking spaces. Tree roots obstructed the playground opening.", "Relocate the opening and install poured rubber surfacing."],
 ["Bond Street Playground", 42.189592, -71.20452, 15, "The inventory listed wood chips as the play surface.", "Install a poured rubber play surface and an accessible walkway."],
 ["Father McAleer Recreation Area", 42.19901, -71.21231, 16, "The Town recorded a pool lift and an accessible portable restroom. It reported a parking approach obstructed by stone markers, a bathhouse with access barriers, and railroad ties around the play area.", "Improve the parking approach, playground entry and surface, and bathhouse access."],
 ["Pleasant Street Park", 42.185155, -71.195943, 17, "The Town recorded railroad ties blocking access to the play area, no accessible parking, and a portable restroom with access barriers.", "Create a playground opening and add accessible parking and a replacement restroom."],
 ["Wilson Street Playground", 42.17843, -71.22561, 18, "The Town recorded railroad ties around the playground, a slanted accessible picnic table, and no designated accessible parking.", "Improve playground entry, level the picnic table, and designate a parking space."],
 ["Doherty Field", 42.15591, -71.19725, 19, "The Town recorded a height gap between the path and its footbridge from the parking area. One side of the wood-chip play area was open.", "Level the bridge approaches and upgrade the play surface, restroom, and picnic seating."],
 ["Charles Eliot Park / Lower Balch", 42.176499, -71.203798, 20, "The inventory listed wood chips and recorded deteriorating restroom and storage buildings.", "Rehabilitate the park with an accessible ramp and combine the restroom and storage in an accessible building."],
 ["Willett Babe Ruth Baseball Field", 42.19364, -71.22185, 21, "The inventory listed two accessible parking spaces near the school and recorded a portable restroom with access barriers.", "Replace the portable restroom with an accessible unit."],
 ["Norwood Civic Center", 42.19443, -71.19893, 22, "The Town recorded a step-free main approach, automatic doors, four accessible parking spaces, and an elevator. It also reported elevator controls without Braille and an emergency intercom that required voice communication."]
];
 const inventoryToggle=document.getElementById('townAccessInventoryToggle');
 let inventoryLayer;
 inventoryToggle?.addEventListener('change',()=>{
  if(!inventoryToggle.checked){
   if(inventoryLayer)map.removeLayer(inventoryLayer);
   return;
  }
  if(!inventoryLayer){
   inventoryLayer=L.layerGroup();
   for(const [name,lat,lng,page,observed,proposed] of inventorySites){
    const content='<strong>'+safe(name)+'</strong><p><b>Town inventory observations (2020)</b><br>'+safe(observed)+'</p>'
     +(proposed?'<p><b>Proposed in the 2020 plan</b><br>'+safe(proposed)+'</p>':'')
     +'<p>Pin marks the site. Check current conditions before visiting.</p>'
     +'<a href="'+inventorySource+'#page='+page+'" target="_blank" rel="noopener">Town accessibility inventory ↗</a>';
    L.circleMarker([lat,lng],{radius:8,color:'#fff',weight:2,fillColor:'#154d79',fillOpacity:1})
     .bindTooltip(name+' · Town inventory (2020)').bindPopup(content).addTo(inventoryLayer);
   }
  }
  inventoryLayer.addTo(map);
 });
 const builders={places:makePlaces,paths:makePaths};
 function updateStatus(){
  const places=checkboxes.places.checked&&layers.places?layers.places.count:null;
  const paths=checkboxes.paths.checked&&layers.paths?layers.paths.count:null;
  if(places===null&&paths===null){status.textContent='Accessibility layers use community-contributed OpenStreetMap data around Norwood. Missing information does not mean a place or route is inaccessible. Verify access details before travel.';return;}
  const placeText=places===null?'':places+' mapped place'+(places===1?'':'s')+' with wheelchair information';
  const pathText=paths===null?'':paths+' mapped path or crossing feature'+(paths===1?'':'s');
  status.textContent=[placeText,pathText].filter(Boolean).join('; ')+'. Community-contributed details may be incomplete; tagged paths do not establish a continuous accessible route.';
 }
 async function toggle(key){
  const input=checkboxes[key];
  if(!input.checked){if(layers[key])map.removeLayer(layers[key].layer);updateStatus();return;}
  status.textContent=key==='places'?'Loading wheelchair access information…':'Loading accessible paths and crossing details…';
  try{
   const result=builders[key](await load(key));layers[key]=result;
   if(!input.checked)return;
   result.layer.addTo(map);
   updateStatus();
  }catch(error){
   if(input.checked)status.textContent='Accessibility data could not be loaded right now. Try again later or view the OpenStreetMap map.';
   console.warn('Accessibility map layer could not load',error);
  }
 }
 for(const [key,input] of Object.entries(checkboxes))input.addEventListener('change',()=>toggle(key));
})();
