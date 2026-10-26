(()=>{
'use strict';
const map=window.norwoodTrailMap;
const L=window.L;
const toggle=document.getElementById('mbtaToggle');
const status=document.getElementById('mbtaStatus');
if(!map||!L||!toggle||!status)return;
const API='https://api-v3.mbta.com/';
const layer=L.layerGroup();
const routeLayer=L.layerGroup(),stopLayer=L.layerGroup(),vehicleLayer=L.layerGroup();
layer.addLayer(routeLayer);layer.addLayer(stopLayer);layer.addLayer(vehicleLayer);
const localBounds={minLat:42.15,maxLat:42.23,minLng:-71.24,maxLng:-71.15};
const railNames=/Norwood Central|Norwood Depot|Windsor Gardens/i;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const request=(url,options)=>fetch(API+url,options||{}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()});
function decodePolyline(str){
 let i=0,lat=0,lng=0,coords=[];
 while(i<str.length){
  let b,shift=0,result=0;
  do{b=str.charCodeAt(i++)-63;result|=(b&31)<<shift;shift+=5}while(b>=32);
  lat+=(result&1)?~(result>>1):(result>>1);
  shift=0;result=0;
  do{b=str.charCodeAt(i++)-63;result|=(b&31)<<shift;shift+=5}while(b>=32);
  lng+=(result&1)?~(result>>1):(result>>1);
  coords.push([lat/1e5,lng/1e5]);
 }
 return coords;
}
function timeLabel(value){
 const d=new Date(value||'');
 return Number.isNaN(d.getTime())?'time unavailable':d.toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'});
}
function vehicleStatus(value){
 return String(value||'Live vehicle').toLowerCase().replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
}
function vehicleIcon(kind,bearing){
 const degrees=Number.isFinite(Number(bearing))?Number(bearing):0;
 const emoji=kind==='bus'?'🚌':'🚆';
 const background=kind==='bus'?'#f2c100':'#785a91';
 const html='<div style="position:relative;width:36px;height:36px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 5px #3338;background:'+background+';display:grid;place-items:center;transform:rotate('+degrees+'deg);font-size:18px"><span style="transform:rotate('+(-degrees)+'deg)">'+emoji+'</span><i style="position:absolute;top:-4px;left:13px;color:#153b56;font-size:11px;font-style:normal">▲</i></div>';
 return L.divIcon({className:'',html:html,iconSize:[36,36],iconAnchor:[18,18]});
}
function directionName(route,vehicle){
 const id=Number(vehicle.attributes.direction_id);
 const a=route?.attributes||{};
 return a.direction_destinations?.[id]||a.direction_names?.[id]||(id===0?'Inbound':'Outbound');
}
function nearestStop(vehicle,stops){
 let best='',bestDistance=Infinity;
 for(const stop of stops){
  const a=stop.attributes||{};
  if(!Number.isFinite(a.latitude)||!Number.isFinite(a.longitude))continue;
  const d=(a.latitude-vehicle.attributes.latitude)**2+(a.longitude-vehicle.attributes.longitude)**2;
  if(d<bestDistance){bestDistance=d;best=a.name||''}
 }
 return best;
}
let staticPromise=null,refreshTimer=null,refreshing=false,generation=0;
async function loadStatic(){
 if(staticPromise)return staticPromise;
 staticPromise=Promise.all([
  request('routes/34E'),request('routes/CR-Franklin'),
  request('stops?filter[route]=34E'),request('stops?filter[route]=CR-Franklin'),
  request('shapes?filter[route]=34E'),request('shapes?filter[route]=CR-Franklin')
 ]).then(([busRoute,railRoute,busStops,railStops,busShapes,railShapes])=>{
  const localBus=(busStops.data||[]).filter(s=>{
   const a=s.attributes||{};
   return a.latitude>=localBounds.minLat&&a.latitude<=localBounds.maxLat&&a.longitude>=localBounds.minLng&&a.longitude<=localBounds.maxLng;
  });
  localBus.forEach(s=>{
   const a=s.attributes||{};
   L.circleMarker([a.latitude,a.longitude],{radius:4,color:'#003b71',weight:2,fillColor:'#fff',fillOpacity:1})
    .bindPopup('<b>'+esc(a.name||'34E stop')+'</b><br>MBTA 34E bus stop').addTo(stopLayer);
  });
  (railStops.data||[]).filter(s=>railNames.test(s.attributes?.name||'')).forEach(s=>{
   const a=s.attributes||{};
   if(!Number.isFinite(a.latitude)||!Number.isFinite(a.longitude))return;
   L.circleMarker([a.latitude,a.longitude],{radius:7,color:'#785a91',weight:3,fillColor:'#fff',fillOpacity:1})
    .bindTooltip(esc(a.name),{permanent:true,direction:'top',className:'station-label',offset:[0,-8]})
    .bindPopup('<b>🚆 '+esc(a.name)+'</b><br>Franklin/Foxboro Line').addTo(stopLayer);
  });
  (busShapes.data||[]).forEach(s=>{
   const encoded=s.attributes?.polyline;
   if(encoded)L.polyline(decodePolyline(encoded),{color:'#003b71',weight:4,opacity:.78}).bindPopup('MBTA 34E bus route').addTo(routeLayer);
  });
  (railShapes.data||[]).forEach(s=>{
   const encoded=s.attributes?.polyline;
   if(encoded)L.polyline(decodePolyline(encoded),{color:'#785a91',weight:4,opacity:.74,dashArray:'8 6'}).bindPopup('Franklin/Foxboro Line').addTo(routeLayer);
  });
  return {busRoute:(busRoute.data||{}),railRoute:(railRoute.data||{}),busStops:localBus,railStops:(railStops.data||[]).filter(s=>railNames.test(s.attributes?.name||''))};
 }).catch(error=>{staticPromise=null;throw error});
 return staticPromise;
}
async function refreshVehicles(token){
 if(refreshing||!toggle.checked||token!==generation)return;
 refreshing=true;
 try{
  const [busResult,railResult,info]=await Promise.all([
   request('vehicles?filter[route]=34E',{cache:'no-store'}),
   request('vehicles?filter[route]=CR-Franklin',{cache:'no-store'}),
   loadStatic()
  ]);
  if(!toggle.checked||token!==generation)return;
  vehicleLayer.clearLayers();
  let buses=0,trains=0;
  const busStops=info.busStops||[];
  (busResult.data||[]).filter(v=>Number.isFinite(v.attributes?.latitude)&&Number.isFinite(v.attributes?.longitude)).forEach(v=>{
   const a=v.attributes,near=nearestStop(v,busStops),loc=near?'<br>Near '+esc(near):'';
   const detail='<b>MBTA 34E bus · '+esc(a.current_status||'In service')+'</b>'+loc+'<br>Direction: '+esc(a.direction_id===0?'Inbound → Forest Hills':'Outbound → Walpole')+'<br>Updated: '+esc(timeLabel(a.updated_at));
   L.marker([a.latitude,a.longitude],{icon:vehicleIcon('bus',a.bearing),title:'Live MBTA 34E bus'}).bindPopup(detail).addTo(vehicleLayer);
   buses++;
  });
  (railResult.data||[]).filter(v=>Number.isFinite(v.attributes?.latitude)&&Number.isFinite(v.attributes?.longitude)).forEach(v=>{
   const a=v.attributes,dest=directionName(info.railRoute,v);
   const detail='<b>Franklin/Foxboro Line train</b><br>Toward: '+esc(dest)+'<br>'+esc(vehicleStatus(a.current_status))+'<br>Updated: '+esc(timeLabel(a.updated_at));
   L.marker([a.latitude,a.longitude],{icon:vehicleIcon('train',a.bearing),title:'Live Franklin/Foxboro Line train'}).bindPopup(detail).addTo(vehicleLayer);
   trains++;
  });
  status.textContent='Live MBTA layer · '+buses+' bus(es) · '+trains+' train(s) · updated '+timeLabel(new Date());
 }catch(error){
  if(toggle.checked&&token===generation)status.textContent='Live MBTA refresh is temporarily unavailable. The layer will retry in 30 seconds.';
  console.warn('Live MBTA map layer failed',error);
 }finally{refreshing=false}
}
toggle.addEventListener('change',async()=>{
 const token=++generation;
 if(!toggle.checked){
  if(refreshTimer){clearInterval(refreshTimer);refreshTimer=null}
  map.removeLayer(layer);
  status.textContent='Live MBTA layer is off. Vehicle locations load only while this layer is on.';
  return;
 }
 layer.addTo(map);
 status.textContent='Loading live MBTA vehicles, routes and Norwood stops…';
 try{
  await loadStatic();
  if(!toggle.checked||token!==generation)return;
  await refreshVehicles(token);
  if(toggle.checked&&token===generation&&!refreshTimer)refreshTimer=setInterval(()=>refreshVehicles(token),30000);
 }catch(error){
  if(toggle.checked&&token===generation)status.textContent='Live MBTA layer is temporarily unavailable. Please try again later.';
  console.warn('Live MBTA map layer could not initialize',error);
 }
});
status.textContent='Show 34E buses, Franklin/Foxboro Line trains, route paths and Norwood stops. Live vehicle positions from the MBTA V3 API refresh every 30 seconds while this layer is on.';
})();