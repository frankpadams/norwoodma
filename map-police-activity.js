/* Plot dated police reports at approximate public street locations. */
(()=>{'use strict';
const toggle=document.getElementById('policeActivityToggle'),panel=document.getElementById('policeActivityPanel'),range=document.getElementById('policeActivityDays'),count=document.getElementById('policeActivityCount'),coverage=document.getElementById('policeActivityCoverage');
if(!toggle||!panel||!range)return;
let records=[],group=null,loaded=false,coverageStart,coverageEnd;
const map=()=>window.norwoodTrailMap;
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
 panel.hidden=!toggle.checked;
 if(!toggle.checked){if(group&&map()?.removeLayer)map().removeLayer(group);return;}
 if(!window.L||!map()){coverage.textContent='Map is still loading';return;}
 if(!group)group=L.markerClusterGroup?L.markerClusterGroup():L.layerGroup();
 group.clearLayers();
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const end=Date.parse(today);
 const cutoff=end-(Number(range.value)-1)*86400000;
 const visible=records.filter(r=>{const t=Date.parse(r.date);return Number.isFinite(t)&&t>=cutoff&&t<=end&&Number.isFinite(r.lat)&&Number.isFinite(r.lng)&&r.location_precision!=='exact'&&r.sensitive!==true});
 visible.forEach(r=>{
  const details=[r.date, r.report_time?new Date(r.date+'T'+r.report_time+':00Z').toLocaleTimeString('en-US',{timeZone:'UTC',hour:'numeric',minute:'2-digit'}):''].filter(Boolean).join(' · ');
  const location=r.logged_location||r.location||'Approximate location';
  const entry=r.log_excerpt?'<br><strong>Police log:</strong> '+safe(r.log_excerpt):'';
  const outcome=r.log_status?'<br><strong>Disposition:</strong> '+safe(r.log_status):'';
  const source=/^https:\/\/txsqobtbxahbmcdvcdjm\.supabase\.co\/storage\/v1\/object\/public\/e-editions\/{1,2}[A-Za-z0-9_]+\.pdf#page=\d+$/.test(r.source_url||'')
   ?'<br><a href="'+safe(r.source_url)+'" target="_blank" rel="noopener">Read the original police log ↗</a>':'';
  L.marker([r.lat,r.lng]).bindPopup('<strong>'+safe(r.category||'Police activity')+'</strong><br>'+safe(details)+'<br>'+safe(location)+entry+outcome+(r.description?'<br>'+safe(r.description):'')+source).addTo(group);
 });
 if(!map().hasLayer(group))group.addTo(map());
 count.textContent=visible.length+' mapped incident'+(visible.length===1?'':'s')+' in the last '+range.value+' days';
 coverage.textContent=records.length?'Partial coverage · mapped reports from '+coverageStart+' through '+coverageEnd:'No verified incidents loaded yet; coverage is incomplete';
}
async function load(){if(loaded)return;loaded=true;try{const response=await fetch('data/police-activity.json',{cache:'no-store'});if(!response.ok)throw Error('Unavailable');const data=await response.json();records=Array.isArray(data.incidents)?data.incidents:[];coverageStart=data.coverage_start;coverageEnd=data.coverage_end;}catch(e){records=[];}render();}
function update(){if(toggle.checked)load();render()}
toggle.addEventListener('change',update);
update();
range.addEventListener('input',()=>{document.getElementById('policeActivityDaysValue').textContent=range.value;render()});
document.querySelectorAll('[data-police-days]').forEach(b=>b.addEventListener('click',()=>{range.value=b.dataset.policeDays;document.getElementById('policeActivityDaysValue').textContent=range.value;render()}));
})();
