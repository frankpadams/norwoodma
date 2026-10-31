(()=>{'use strict';
const map=window.norwoodTrailReviewMap;
const picker=document.getElementById('trailSystemSelect');
const status=document.getElementById('trailSystemSelectionStatus');
if(!map||!picker)return;
let routeLayer=null;
fetch('data/trails/germany-brook-review.geojson?v=20261031-osm1')
 .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
 .then(data=>{
  routeLayer=L.geoJSON(data,{style:()=>({color:'#a85b00',weight:6,opacity:.95}),onEachFeature:(f,l)=>{
   const p=f.properties||{};
   l.bindPopup('<strong>'+p.name+'</strong><br>Continuous Willett-to-Savage Center route following existing OpenStreetMap paths along Germany Brook and behind Father Mac\'s pool. Approximately 1.13 miles. The short gravel loop and Vernon Street branch are separate.');
  }}).addTo(map);
  const sync=()=>{
   if(!routeLayer)return;
   if(picker.value==='germany'||picker.value==='all')routeLayer.addTo(map);
   else map.removeLayer(routeLayer);
   if(picker.value==='germany'||picker.value==='all'){
    const base=status?.textContent||'';
    if(status)status.textContent=base+' Germany Brook: continuous Willett-to-Savage Center route, about 1.13 miles, following mapped OSM paths. Short loop kept separate.';
   }
  };
  picker.addEventListener('change',sync);
  sync();
 })
 .catch(e=>{if(status)status.textContent+=' Germany Brook draft line could not load: '+e.message+'.';});
})();
