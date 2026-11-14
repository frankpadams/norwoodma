(function(){
'use strict';
const toggle=document.getElementById('norwoodNativeOutagesToggle');
const status=document.getElementById('norwoodNativeOutagesStatus');
const map=window.norwoodTrailMap;
if(!toggle||!status||!map||!window.L)return;
const source='data/norwood-utility-outages.geojson';
const layer=L.geoJSON(null,{
 pointToLayer:(feature,latlng)=>L.circleMarker(latlng,{radius:9,color:'#8d2b19',weight:2,fillColor:'#ed633f',fillOpacity:.8}),
 style:()=>({color:'#c44b2c',weight:2,fillColor:'#e97048',fillOpacity:.23}),
 onEachFeature:(feature,item)=>{
 const p=feature.properties||{}, el=document.createElement('div');
 const heading=document.createElement('strong');heading.textContent=p.title||'Utility service interruption';el.append(heading);
 for(const [label,key] of [['Provider','provider'],['Service','service'],['Customers affected','customers_affected'],['Reported','reported_at'],['Estimated restoration','estimated_restoration'],['Last updated','updated_at']]){
 if(p[key]===undefined||p[key]===null||p[key]==='')continue;
 const line=document.createElement('p');line.style.margin='4px 0';line.textContent=label+': '+p[key];el.append(line);
 }
 if(p.source_url&&/^https:\/\//i.test(p.source_url)){const a=document.createElement('a');a.href=p.source_url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Official outage details';el.append(a);}
 item.bindPopup(el);
 }
});
let timer=null,requestId=0;
async function refresh(){
 const id=++requestId;
 try{
 const response=await fetch(source+'?t='+Date.now(),{cache:'no-store'});
 if(!response.ok)throw new Error('Outage feed unavailable');
 const data=await response.json();
 if(id!==requestId||!toggle.checked)return;
 if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error('Invalid outage data');
 layer.clearLayers();
 const now=Date.now(),valid=data.features.filter(f=>f&&f.geometry&&f.properties&&(!f.properties.expires_at||Date.parse(f.properties.expires_at)>now));
 layer.addData({type:'FeatureCollection',features:valid});
 const updated=data.metadata&&data.metadata.updated_at;
 const stale=!updated||!Number.isFinite(Date.parse(updated))||now-Date.parse(updated)>30*60*1000;
 status.textContent=stale?'Live geographic outage feed not connected or is stale. Check Norwood Light directly.':valid.length?valid.length+' mapped outage area(s). Updated '+new Date(updated).toLocaleTimeString()+'.':'No mapped outages in the latest provider feed (not a guarantee of service).';
 }catch(e){if(id===requestId)status.textContent='Geographic outage data unavailable. Check Norwood Light’s official map.';}
}
function change(){
 if(timer){clearInterval(timer);timer=null;}
 if(toggle.checked){map.addLayer(layer);refresh();timer=setInterval(refresh,60000);}
 else{requestId++;map.removeLayer(layer);layer.clearLayers();status.textContent='Outage markers off.';}
}
toggle.addEventListener('change',change);
})();
