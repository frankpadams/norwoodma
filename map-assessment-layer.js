/* Property Cards / Assessments — shared FY2025 address records. */
(()=>{
 const map=window.norwoodTrailMap,records=window.norwoodAssessmentRecords;
 const toggle=document.getElementById('assessmentCardsToggle'),tools=document.getElementById('assessmentMapTools');
 const search=document.getElementById('assessmentMapSearch'),matches=document.getElementById('assessmentMapMatches'),status=document.getElementById('assessmentMapStatus');
 if(!map||!window.L||!toggle||!Array.isArray(records))return;
 const group=L.layerGroup(),minimumZoom=16;
 let selected=null;
 function officialUrl(pid){return 'https://gis.vgsi.com/norwoodma/Parcel.aspx?pid='+encodeURIComponent(pid)}
 function markerFor(r){
  const marker=L.circleMarker([r[2],r[3]],{radius:5,color:'#003b71',weight:1,fillColor:'#e6b74a',fillOpacity:.85});
  const node=document.createElement('div'),name=document.createElement('strong'),p=document.createElement('p'),a=document.createElement('a');
  name.textContent=r[0];a.textContent='Open official assessment card ↗';a.href=officialUrl(r[1]);a.target='_blank';a.rel='noopener noreferrer';
  p.append(a);node.append(name,p);marker.bindPopup(node);
  return marker;
 }
 function render(){
  group.clearLayers();
  if(!toggle.checked)return;
  if(map.getZoom()<minimumZoom){status.textContent='Zoom in to level 16 to display assessment markers. '+records.length.toLocaleString()+' records available.';return;}
  const bounds=map.getBounds();let count=0;
  for(const r of records){
   if(!bounds.contains([r[2],r[3]]))continue;
   const marker=markerFor(r).addTo(group);count++;
   if(r===selected)marker.openPopup();
  }
  status.textContent=count.toLocaleString()+' addresses in view; '+records.length.toLocaleString()+' mapped townwide.';
 }
 toggle.addEventListener('change',()=>{
  tools.hidden=!toggle.checked;
  if(toggle.checked){group.addTo(map);render();}
  else{group.remove();matches.replaceChildren();}
 });
 map.on('moveend zoomend',render);
 search.addEventListener('input',()=>{
  matches.replaceChildren();
  const q=search.value.trim().toUpperCase().replace(/\s+/g,' ');
  if(q.length<2)return;
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
