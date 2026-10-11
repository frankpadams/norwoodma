(()=>{
'use strict';
const imageIds=["1LTFHiaNK-irpnXX7PVg-HnArK9QTTnVy","1o-znte0aru_y-Jwvi5SRsebiZTydrVxS","1SPPh5GLn_TRBuePsKxDdAa_FPSO8-bT7","11FxfLvFjTO0E3nOpumVntaSpMI4JteXB","1BCe24Nz1DxNpgWPwGkRJ9P4CBOEVhMyK","1iEKTbxJdFGfTxB0krAi0Er8sD5zUstXn","1ozIsPozZ4TpxKChqNiDCnO3CqQFK1Jfz","1HWFBoj6MPfAxLVhxtG_VfEptOUoktKTq","1eN7kzf_KgTZE9IAOg_zXxW1yHJu9mQMu","13K6uTc2sP-uCt7XovfgokIcAJtvaG1oH","1vhXsZz_7i16wuQ-nk_1d8Owf5WyM_nez"];
const hints={
'Meadow Street':'Look for the Meadow Street dead end, Fortune Drive, Neponset River bends, Traphole Brook and the railroad crossing. Prefer a street junction or bridge over a tree.',
'Bernie Cooper Riverfront Park':'Match Saint Joseph Avenue and the park entrances at Saint John and Saint Paul streets. The Neponset River and Hawes Brook help confirm orientation.',
'Vanderbilt / Pine Tree Forest':'Start at Vanderbilt Avenue. Look for the power-line corridor, nearby storage facility and sewer easement; choose stable crossings.',
'Shattuck Park':'Use the intersections around Winter, Nichols and Bond streets and the Bellevue Avenue parking access.',
'Germany Brook':'Find the Savage Center, Winter Street and Willett School. The landfill overlook is a secondary reference.',
'Ellis Playground':'Find Codman Road and the playground entrance; the boardwalk is useful as a secondary check.',
'Hennessey Field / Murphy Park':'Use Pleasant Street and Lenox Avenue, plus corners of athletic fields.',
'Ellis Pond / Alevizos Park':'Find Walpole Street, Nichols Street and the Ellis Pond dam. Use road intersections for A and B.',
'Endean Park / Hawes Brook':'Use Hawes Pool and its parking area, Washington Street and the middle-school grounds.',
'Ledgeview Drive':'Start at Ledgeview Drive access. Keep the existing blue trail separate from the proposed extension.',
'Willett / Tiot Trail':'Use Willett School and Westover Parkway. This leg may be planned rather than publicly open.'
};
const sites=[
['Meadow Street','meadow-street-brochure-trace.json','1u1MtJmXcGFB3NRXDAlsmGkPwTM53QUXF','Meadow Street, Norwood, Massachusetts'],
['Bernie Cooper Riverfront Park','bernie-cooper-brochure-trace.json','1m3gd8omNf9o07rn6RJQ4meeIz9Kc1Z9V','Saint Joseph Avenue, Norwood, Massachusetts'],
['Vanderbilt / Pine Tree Forest','vanderbilt-5k-brochure-trace.json','1vZ7KuQE0WHdan1lJJLNMbYqAdzj50iF0','Vanderbilt Avenue, Norwood, Massachusetts'],
['Shattuck Park','shattuck-park-brochure-trace.json','1glv3UMbXWVrsLtV4dnJAy4_3qkfwBXTw','Shattuck Park, Norwood, Massachusetts'],
['Germany Brook','germany-brook-brochure-trace.json','1X-mPJgOAaNFPAF_jxQHyPPiwcpqv9--1','Savage Center, Norwood, Massachusetts'],
['Ellis Playground','ellis-playground-brochure-trace.json','1x32aHzxdJrrcJvBEZbuB9H05Xaxtbkfp','Codman Road, Norwood, Massachusetts'],
['Hennessey Field / Murphy Park','hennessey-murphy-brochure-trace.json','1WePcy2c3Map2MZzt0i3PFl5hZNEprT-q','Lenox Avenue, Norwood, Massachusetts'],
['Ellis Pond / Alevizos Park','ellis-pond-brochure-trace.json','1nMBh4QI94dyM5U6xjmYX7CHpvKGr_6wX','Ellis Pond, Norwood, Massachusetts'],
['Endean Park / Hawes Brook','endean-hawes-brochure-trace.json','1WwtpOYWhmyOCY1-L9RdgvQ4v-Yj8J3Sz','Endean Park, Norwood, Massachusetts'],
['Ledgeview Drive','ledgeview-brochure-trace.json','1XtBbNiYSEFR1R6i1udUzjPr1Hv_mC20o','Ledgeview Drive, Norwood, Massachusetts'],
['Willett / Tiot Trail','willett-tiot-brochure-trace.json','1i3uG3TOsoQ2OeCiyV_-mpyKqjwjxlVKL','Westover Parkway, Norwood, Massachusetts']
];
const $=id=>document.getElementById(id),select=$('site'),img=$('brochure'),svg=$('pins'),msg=$('instruction'),pairsEl=$('pairs');
sites.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=s[0];select.append(o)});
const map=L.map('map',{scrollWheelZoom:false}).setView([42.184,-71.201],13);
const street=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
const aerial=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Imagery © Esri and providers'});
L.control.layers({'Street map':street,'Satellite imagery':aerial},null,{collapsed:false}).addTo(map);
let data=null,pairs=[],pending=null,markers=[],routeLayer=null,siteIndex=0,request=0;
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function download(obj,name){const url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200)}
function refresh(){
svg.replaceChildren();pairsEl.replaceChildren();const width=data?.imageWidth||data?.source?.renderWidth||img.naturalWidth||100,height=data?.imageHeight||data?.source?.renderHeight||img.naturalHeight||100;
svg.setAttribute('viewBox','0 0 '+width+' '+height);
const all=pending?[...pairs,{x:pending.x,y:pending.y}]:pairs;
all.forEach((p,i)=>{const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.setAttribute('cx',p.x);circle.setAttribute('cy',p.y);circle.setAttribute('r',Math.max(width,height)*.013);circle.setAttribute('fill','#f97316');circle.setAttribute('stroke','white');circle.setAttribute('stroke-width','3');svg.append(circle);const label=document.createElementNS('http://www.w3.org/2000/svg','text');label.setAttribute('x',p.x);label.setAttribute('y',p.y);label.setAttribute('text-anchor','middle');label.setAttribute('dominant-baseline','middle');label.setAttribute('font-size',Math.max(width,height)*.018);label.setAttribute('font-weight','bold');label.setAttribute('fill','white');label.textContent=alphabet[i];svg.append(label)});
pairs.forEach((p,i)=>{const chip=document.createElement('span');chip.textContent=alphabet[i]+' matched';pairsEl.append(chip)});
if(pending)msg.textContent='Point '+alphabet[pairs.length]+' selected on brochure. Now tap the matching point on the geographic map.';
else msg.textContent='Matched '+pairs.length+' point(s). '+(pairs.length<3?'Select '+alphabet[pairs.length]+' on the brochure, then '+alphabet[pairs.length]+' on the map.':'You can add more matching points, save the pairs, or export an approximate overlay.');
$('export').disabled=pairs.length<2;
if(routeLayer){map.removeLayer(routeLayer);routeLayer=null}
if(pairs.length>=2&&data){try{const geo=window.TrailRegistration.convert(data,pairs.slice(0,2));routeLayer=L.featureGroup().addTo(map);geo.features.forEach(f=>L.polyline(f.geometry.coordinates.map(p=>[p[1],p[0]]),{color:'#e11d48',weight:4,dashArray:'7 5'}).bindPopup((f.properties.name||f.properties.id)+' — UNVERIFIED registration').addTo(routeLayer));if(pairs.length>=3){const check=pairs[2],fake={trails:[{id:'check',points:[[check.x,check.y]]}]};const prediction=window.TrailRegistration.convert(fake,pairs.slice(0,2)).features[0].geometry.coordinates[0];const error=L.latLng(check.lat,check.lon).distanceTo(L.latLng(prediction[1],prediction[0]));msg.textContent+=' Third landmark error: '+error.toFixed(1)+' m.'}}catch(e){msg.textContent=e.message}}
}
function clear(){pairs=[];pending=null;markers.forEach(m=>map.removeLayer(m));markers=[];refresh()}
img.addEventListener('click',e=>{if(!data||pending)return;const rect=img.getBoundingClientRect(),w=data.imageWidth||data.source?.renderWidth||img.naturalWidth,h=data.imageHeight||data.source?.renderHeight||img.naturalHeight;pending={x:(e.clientX-rect.left)*w/rect.width,y:(e.clientY-rect.top)*h/rect.height};refresh()});
map.on('click',e=>{if(!pending)return;const p={...pending,lat:e.latlng.lat,lon:e.latlng.lng};pairs.push(p);pending=null;const mark=L.marker(e.latlng).addTo(map).bindTooltip(alphabet[pairs.length-1],{permanent:true,direction:'top'});markers.push(mark);refresh()});
$('reset').onclick=clear;
$('save').onclick=()=>download({system:sites[siteIndex][0],source:sites[siteIndex][1],created:new Date().toISOString(),controlPoints:pairs,warning:'Preliminary; verify against independent geographic landmarks before publication'},'trail-'+siteIndex+'-landmarks.json');
$('export').onclick=()=>{if(pairs.length<2||!data)return;const geo=window.TrailRegistration.convert(data,pairs.slice(0,2));geo.properties.controlPoints=pairs;geo.properties.thirdPointIsIndependentCheck=pairs.length>=3;window.TrailRegistration.download(geo,'trail-'+siteIndex+'-UNVERIFIED')};
async function load(){const id=++request;siteIndex=Number(select.value);const s=sites[siteIndex];clear();data=null;img.removeAttribute('src');img.alt='Loading '+s[0]+' official brochure map';$('source').href='https://drive.google.com/file/d/'+s[2]+'/view';msg.textContent='Loading '+s[0]+'…';$('clues').textContent=hints[s[0]]||'Choose fixed road intersections or bridges visible on both maps.';try{const r=await fetch('data/trails/'+s[1]);if(!r.ok)throw Error('Trace data unavailable');const d=await r.json();if(id!==request)return;data=d;refresh()}catch(e){msg.textContent=e.message}
img.src='https://drive.google.com/thumbnail?id='+encodeURIComponent(imageIds[siteIndex])+'&sz=w1800';
img.onerror=()=>{img.alt='The brochure image could not load. Open the source brochure link. Pin matching is unavailable until an image is hosted locally.';msg.textContent='Brochure image unavailable from Google Drive. Use source link; a locally hosted brochure image is needed for matching.'};
try{const r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(s[3]));const found=await r.json();if(id!==request)return;if(found.length){const p=[+found[0].lat,+found[0].lon];if(p[0]>42.14&&p[0]<42.24&&p[1]>-71.25&&p[1]<-71.14)map.setView(p,16)}}catch(e){}setTimeout(()=>map.invalidateSize(),100)}
select.onchange=load;load();
})();