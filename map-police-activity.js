/* Optional preview layer. No incidents are fabricated; populate data/police-activity.json only from verified public records. */
(()=>{'use strict';
const toggle=document.getElementById('policeActivitySecret'),panel=document.getElementById('policeActivityPanel'),range=document.getElementById('policeActivityDays'),count=document.getElementById('policeActivityCount'),coverage=document.getElementById('policeActivityCoverage');
if(!toggle||!panel||!range)return;
let enabled=false,records=[],group=null,loaded=false;
const map=()=>window.norwoodTrailMap;
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
 panel.hidden=!enabled;toggle.setAttribute('aria-pressed',String(enabled));
 if(!enabled){if(group&&map()?.removeLayer)map().removeLayer(group);return;}
 if(!window.L||!map()){coverage.textContent='Map is still loading';return;}
 if(!group)group=L.markerClusterGroup?L.markerClusterGroup():L.layerGroup();
 group.clearLayers();
 const cutoff=Date.now()-Number(range.value)*86400000;
 const visible=records.filter(r=>{const t=Date.parse(r.date);return Number.isFinite(t)&&t>=cutoff&&t<=Date.now()&&Number.isFinite(Number(r.lat))&&Number.isFinite(Number(r.lng))&&r.location_precision!=='exact'&&r.sensitive!==true});
 visible.forEach(r=>L.marker([Number(r.lat),Number(r.lng)]).bindPopup('<strong>'+safe(r.category||'Police activity')+'</strong><br>'+safe(r.date)+'<br>'+safe(r.location||'Approximate location')+(r.description?'<br>'+safe(r.description):'')).addTo(group));
 if(!map().hasLayer(group))group.addTo(map());
 count.textContent=visible.length+' mapped incident'+(visible.length===1?'':'s')+' in the last '+range.value+' days';
 coverage.textContent=records.length?'Partial records — latest incident: '+records.map(r=>r.date).filter(Boolean).sort().at(-1):'No verified incidents loaded yet; coverage is incomplete';
}
async function load(){if(loaded)return;loaded=true;try{const response=await fetch('data/police-activity.json',{cache:'no-store'});if(!response.ok)throw Error('Unavailable');const data=await response.json();records=Array.isArray(data.incidents)?data.incidents:[];}catch(e){records=[];}render();}
toggle.addEventListener('click',()=>{enabled=!enabled;if(enabled)load();render()});
range.addEventListener('input',()=>{document.getElementById('policeActivityDaysValue').textContent=range.value;render()});
document.querySelectorAll('[data-police-days]').forEach(b=>b.addEventListener('click',()=>{range.value=b.dataset.policeDays;document.getElementById('policeActivityDaysValue').textContent=range.value;render()}));
})();
