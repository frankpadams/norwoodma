/* Property Cards / Assessments — shared FY2025 address records. */
(()=>{
 const map=window.norwoodTrailMap;
 let records=window.norwoodAssessmentRecords, pending=null;
 function loadRecords(){
  if(Array.isArray(records))return Promise.resolve(records);
  if(!pending)pending=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='data/assessment-map-records.js?v=20261112-1948';
   script.onload=()=>{if(Array.isArray(window.norwoodAssessmentRecords)){records=window.norwoodAssessmentRecords;resolve(records);}else{script.remove();reject(new Error('Assessment records unavailable'));}};
   script.onerror=()=>{script.remove();reject(new Error('Assessment records could not be loaded'));};document.head.append(script);
  }).catch(err=>{pending=null;throw err;});
  return pending;
 }
 const toggle=document.getElementById('assessmentCardsToggle'),tools=document.getElementById('assessmentMapTools');
 const search=document.getElementById('assessmentMapSearch'),matches=document.getElementById('assessmentMapMatches'),status=document.getElementById('assessmentMapStatus');
 if(!map||!window.L||!toggle)return;
 const group=L.layerGroup(),minimumZoom=15;
 let selected=null;
 function officialUrl(pid){return 'https://gis.vgsi.com/norwoodma/Parcel.aspx?pid='+encodeURIComponent(pid)}
 function markerFor(r){
  const marker=L.circleMarker([r[2],r[3]],{radius:6,color:'#003b71',weight:2,fillColor:'#e6b74a',fillOpacity:1,interactive:true});
  const node=document.createElement('div'),name=document.createElement('strong'),p=document.createElement('p'),a=document.createElement('a');
  name.textContent=r[0];a.textContent='Open official assessment card ↗';a.href=officialUrl(r[1]);a.target='_blank';a.rel='noopener noreferrer';
  p.append(a);node.append(name,p);marker.bindPopup(node);
  return marker;
 }
 function render(){
  group.clearLayers();
  if(!toggle.checked||!Array.isArray(records))return;
  if(map.getZoom()<minimumZoom){status.textContent='Zoom in to level '+minimumZoom+' to display assessment markers. '+records.length.toLocaleString()+' records available.';return;}
  const bounds=map.getBounds();let count=0;
  for(const r of records){
   if(!bounds.contains([r[2],r[3]]))continue;
   const marker=markerFor(r).addTo(group);count++;
   if(r===selected)marker.openPopup();
  }
  status.textContent=count.toLocaleString()+' clickable property markers in view; '+records.length.toLocaleString()+' mapped townwide. Select a gold dot for its official property card.';
 }
 let generation=0;
 async function toggleLayer(){
  const token=++generation;tools.hidden=!toggle.checked;
  if(!toggle.checked){group.remove();group.clearLayers();matches.replaceChildren();selected=null;search.disabled=false;return;}
  status.textContent='Loading property assessment records…';search.disabled=true;
  try{await loadRecords();if(token!==generation||!toggle.checked)return;search.disabled=false;group.addTo(map);render();if(search.value.trim())search.dispatchEvent(new Event('input'));}
  catch(err){if(token!==generation||!toggle.checked)return;search.disabled=true;status.textContent='Assessment records could not be loaded. Turn the layer off and on to retry.';}
 }
 toggle.addEventListener('change',toggleLayer);
 if(toggle.checked)toggleLayer();
 map.on('moveend zoomend',render);
 search.addEventListener('input',()=>{
  matches.replaceChildren();
  const q=search.value.trim().toUpperCase().replace(/\s+/g,' ');
  if(q.length<2||!Array.isArray(records)||!toggle.checked)return;
  const found=records.filter(r=>r[0].toUpperCase().includes(q)).slice(0,30);
  for(const r of found){
   const button=document.createElement('button');button.type='button';button.textContent=r[0];
   button.style.cssText='display:block;width:100%;text-align:left;padding:6px;background:white;border:0;border-bottom:1px solid #ddd;cursor:pointer';
   button.addEventListener('click',()=>{
    selected=r;search.value=r[0];matches.replaceChildren();map.setView([r[2],r[3]],18);
    render();
  });matches.append(button);
  }
 });
})();
