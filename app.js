const $=s=>document.querySelector(s);
const menu=$('#menu'),nav=$('#nav'); menu?.addEventListener('click',()=>{let o=nav.classList.toggle('open');menu.setAttribute('aria-expanded',o)}); nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function weather(){try{let p=await fetch('https://api.weather.gov/points/42.1945,-71.1995');let pj=await p.json();let f=await fetch(pj.properties.forecast);let j=await f.json(),n=j.properties.periods[0];$('#temp').textContent=`${n.temperature}° · ${n.shortForecast}`;$('#forecast').textContent=`${n.name} · ${n.windSpeed}`;}catch(e){$('#forecast').textContent='Live weather temporarily unavailable';}} weather();
let resources=[]; async function loadResources(){try{resources=await (await fetch('data/resources.json')).json();[...new Set(resources.map(r=>r.category))].sort().forEach(c=>$('#categoryFilter').insertAdjacentHTML('beforeend',`<option>${esc(c)}</option>`));renderResources();}catch(e){$('#resourceGrid').innerHTML='<p>Resource directory could not load.</p>';}}
function renderResources(){let q=$('#resourceSearch').value.trim().toLowerCase(),cat=$('#categoryFilter').value;let rows=resources.filter(r=>(!cat||r.category===cat)&&(!q||`${r.name} ${r.description} ${r.tags} ${r.category}`.toLowerCase().includes(q)));$('#resourceCount').textContent=`${rows.length} of ${resources.length} resources`;$('#noResources').hidden=!!rows.length;$('#resourceGrid').innerHTML=rows.map(r=>`<a class="resource-card" href="${r.url}" target="_blank" rel="noopener"><span class="cat">${esc(r.category.toUpperCase())}</span><b>${esc(r.name)}</b><p>${esc(r.description)}</p><span class="open">Open original site ↗</span></a>`).join('');}
$('#resourceSearch').addEventListener('input',renderResources);$('#categoryFilter').addEventListener('change',renderResources);loadResources();

async function news(){let items=[],live=false;try{let urls=['https://www.norwood.k12.ma.us/about/news/feed/rss','https://insidenorwood.com/feed/'];for(let u of urls){try{let r=await fetch('https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(u));let j=await r.json();if(j.status==='ok'){live=true;items.push(...j.items.slice(0,5).map(x=>({source:j.feed.title||'Local source',title:x.title,date:x.pubDate,url:x.link,summary:(x.description||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,180)})));}}catch(e){}}}catch(e){}
if(!items.length){items=await (await fetch('data/news.json')).json();}items.sort((a,b)=>new Date(b.date)-new Date(a.date));$('#feedHealth').textContent=live?'Live RSS · original sources linked':'Feed fallback · original sources linked';$('#newsFeed').innerHTML=items.slice(0,7).map(x=>`<article><a href="${x.url}" target="_blank" rel="noopener"><span class="source">${esc(x.source)}</span><h3>${esc(x.title)}</h3><p>${esc(x.summary||'Open the original source for the full item.')}</p></a></article>`).join('');}news();

const map=L.map('transitMap',{scrollWheelZoom:false}).setView([42.190,-71.198],14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
let vehicleLayer=L.layerGroup().addTo(map),stopLayer=L.layerGroup().addTo(map),shapeLayer=L.layerGroup().addTo(map);
const busIcon=L.divIcon({className:'',html:'<div class="vehicle bus">🚌</div>',iconSize:[30,30],iconAnchor:[15,15]});
const trainIcon=L.divIcon({className:'',html:'<div class="vehicle train">🚆</div>',iconSize:[30,30],iconAnchor:[15,15]});
async function mbta(){
try{
let [v34,vrail,stops,route]=await Promise.all([
fetch('https://api-v3.mbta.com/vehicles?filter[route]=34E').then(r=>r.json()),
fetch('https://api-v3.mbta.com/vehicles?filter[route]=CR-Franklin').then(r=>r.json()),
fetch('https://api-v3.mbta.com/stops?filter[route]=34E').then(r=>r.json()),
fetch('https://api-v3.mbta.com/shapes?filter[route]=34E').then(r=>r.json())
]);
vehicleLayer.clearLayers();stopLayer.clearLayers();shapeLayer.clearLayers();
let buses=(v34.data||[]).filter(v=>v.attributes.latitude&&v.attributes.longitude);
let trains=(vrail.data||[]).filter(v=>v.attributes.latitude&&v.attributes.longitude);
buses.forEach(v=>L.marker([v.attributes.latitude,v.attributes.longitude],{icon:busIcon}).bindPopup(`<b>34E bus</b><br>${esc(v.attributes.current_status||'Live vehicle')}<br>Updated ${new Date(v.attributes.updated_at).toLocaleTimeString()}`).addTo(vehicleLayer));
trains.forEach(v=>L.marker([v.attributes.latitude,v.attributes.longitude],{icon:trainIcon}).bindPopup(`<b>Franklin/Foxboro train</b><br>${esc(v.attributes.current_status||'Live vehicle')}`).addTo(vehicleLayer));
(stops.data||[]).filter(s=>s.attributes.latitude>42.15&&s.attributes.latitude<42.23&&s.attributes.longitude>-71.24&&s.attributes.longitude<-71.15).forEach(s=>L.circleMarker([s.attributes.latitude,s.attributes.longitude],{radius:4,color:'#003B71',weight:2,fillColor:'#fff',fillOpacity:1}).bindPopup(`<b>${esc(s.attributes.name)}</b><br>Route 34E stop`).addTo(stopLayer));
(route.data||[]).forEach(s=>{if(s.attributes.polyline){let pts=decodePolyline(s.attributes.polyline);L.polyline(pts,{color:'#003B71',weight:4,opacity:.72}).addTo(shapeLayer)}});
$('#busStatus').textContent=`${buses.length} live vehicle${buses.length===1?'':'s'} reported`;
$('#railStatus').textContent=`${trains.length} live train${trains.length===1?'':'s'} reported`;
$('#mapUpdated').textContent='LIVE · '+new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
}catch(e){$('#busStatus').textContent='Live MBTA data unavailable';$('#railStatus').textContent='Live MBTA data unavailable';$('#mapUpdated').textContent='MBTA CONNECTION ISSUE';}}
function decodePolyline(str){let index=0,lat=0,lng=0,coords=[];while(index<str.length){let b,shift=0,result=0;do{b=str.charCodeAt(index++)-63;result|=(b&0x1f)<<shift;shift+=5}while(b>=0x20);let dlat=(result&1)?~(result>>1):(result>>1);lat+=dlat;shift=0;result=0;do{b=str.charCodeAt(index++)-63;result|=(b&0x1f)<<shift;shift+=5}while(b>=0x20);let dlng=(result&1)?~(result>>1):(result>>1);lng+=dlng;coords.push([lat/1e5,lng/1e5])}return coords}
mbta();setInterval(mbta,20000);
