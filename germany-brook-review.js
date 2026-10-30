(()=>{'use strict';
const map=window.norwoodTrailReviewMap;
const picker=document.getElementById('trailSystemSelect');
const status=document.getElementById('trailSystemSelectionStatus');
if(!map||!picker)return;
let routeLayer=null;
fetch('data/trails/germany-brook-review.geojson')
 .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
 .then(data=>{
  routeLayer=L.geoJSON(data,{style:()=>({color:'#a85b00',weight:6,opacity:.95}),onEachFeature:(f,l)=>{
   const p=f.properties||{};
   l.bindPopup('<strong>'+p.name+'</strong><br>Candidate trail records joined for review. The joined line ends at Father Mac\'s; the remaining connection to Savage Center is not included yet. The short 0.2-mile loop is separate.');
  }}).addTo(map);
  const sync=()=>{
   if(!routeLayer)return;
   if(picker.value==='germany'||picker.value==='all')routeLayer.addTo(map);
   else map.removeLayer(routeLayer);
   if(picker.value==='germany'||picker.value==='all'){
    const base=status?.textContent||'';
    if(status)status.textContent=base+' Germany Brook review line added: Willett to Father Mac\'s; separate short loop excluded.';
   }
  };
  picker.addEventListener('change',sync);
  sync();
 })
 .catch(e=>{if(status)status.textContent+=' Germany Brook draft line could not load: '+e.message+'.';});
})();
