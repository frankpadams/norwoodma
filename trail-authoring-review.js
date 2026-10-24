(()=>{'use strict';
const map=window.norwoodTrailReviewMap, picker=document.getElementById('trailSystemSelect');
if(!map||!picker)return;
const style=document.createElement('style');
style.textContent='.trail-edit{max-width:1180px;margin:0 auto 14px;padding:14px;border:1px solid #b8c8d1;border-radius:12px;background:#fff}.trail-edit h2{font-size:1.1rem;margin:0 0 6px}.trail-edit p{font-size:.9rem;line-height:1.4;color:#536d7b}.trail-edit .row{display:flex;flex-wrap:wrap;gap:8px;align-items:end}.trail-edit label{font-weight:700;font-size:.82rem}.trail-edit select,.trail-edit button{min-height:40px;border:1px solid #31566d;border-radius:7px;padding:7px;background:#fff;color:#173e56}.trail-edit button{font-weight:700;cursor:pointer}.trail-edit .primary{background:#003b71;color:#fff}.trail-edit .candidate-field{display:grid;gap:4px;min-width:230px;flex:1}.trail-edit #teStatus{min-height:1.3em;margin-bottom:0}.trail-edit .fine{font-size:.76rem;color:#735b00}.te-handle{width:18px;height:18px;border:2px solid #173e56;border-radius:50%;background:#ffd33d;box-shadow:0 1px 4px #0008}@media(max-width:620px){.trail-edit{margin:0 8px 12px}.trail-edit .candidate-field{flex-basis:100%;min-width:100%}.trail-edit button{flex:1 1 40%}}';
document.head.appendChild(style);
const panel=document.createElement('section');panel.className='trail-edit';panel.innerHTML='<h2>Trail editor — test page</h2><p>Choose a visible candidate, load an editable draft copy, then add an anchor directly on the gold line and drag it to reshape the route. The reference line stays unchanged.</p><div class="row"><div class="candidate-field"><label for="teCandidate">Candidate line</label><select id="teCandidate"><option value="">Loading lines…</option></select></div><button id="teLoad" class="primary" type="button">Load draft copy</button><button id="teAdd" type="button" aria-pressed="false">Add anchor on line</button><button id="teUndo" type="button">Undo</button><button id="teRedo" type="button">Redo</button><button id="teDelete" type="button">Delete draft</button><button id="teExport" type="button">Download GeoJSON</button></div><p id="teStatus" role="status" aria-live="polite">Waiting for candidate overlays…</p><p class="fine">Draft only; not published. Changes autosave in this browser. All routes remain provisional and unverified.</p>';
document.querySelector('.map-shell')?.insertAdjacentElement('beforebegin',panel);
const el=id=>panel.querySelector('#'+id), status=el('teStatus'), select=el('teCandidate');
const pane=map.createPane('trailEditDraft');pane.style.zIndex=450;
const draftLayer=L.featureGroup().addTo(map),handles=L.featureGroup().addTo(map);
const key='norwood-trail-editor-draft-v1';let draft=null,placing=false,undo=[],redo=[],candidates=[],timer;
try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&Array.isArray(saved.coords)&&saved.coords.length>1)draft=saved}catch(_){}
const clone=x=>x?JSON.parse(JSON.stringify(x)):null;
function save(){try{draft?localStorage.setItem(key,JSON.stringify(draft)):localStorage.removeItem(key)}catch(_){status.textContent='Browser could not save this draft. Download the GeoJSON before leaving.'}}
function snapshot(){undo.push(clone(draft));if(undo.length>50)undo.shift();redo=[];buttons()}
function buttons(){el('teUndo').disabled=!undo.length;el('teRedo').disabled=!redo.length;el('teAdd').disabled=!draft;el('teDelete').disabled=!draft;el('teExport').disabled=!draft}
function textOf(l){let c;try{c=l.getPopup()?.getContent?.()||''}catch(_){}return typeof c==='string'?c:(c?.textContent||'')}
function paths(a){if(!Array.isArray(a)||!a.length)return[];if(a[0]&&Number.isFinite(a[0].lat)&&Number.isFinite(a[0].lng))return[a];return a.flatMap(paths)}
function scan(){
 const out=[],seen=new Set();
 function visit(l){
  if(l!==map&&l instanceof L.Polyline&&!(l instanceof L.Polygon)){
   const t=textOf(l),p=l.feature?.properties||{},nm=p.TRAIL_NAME||p.ALT_NAME||p.SITE_NAME||'';
   if(/trail|candidate|provisional|brochure|massgis|footpath|way id/i.test(t+' '+nm)){
    paths(l.getLatLngs()).forEach((line,n)=>{if(line.length<2)return;const coords=line.map(q=>[q.lat,q.lng]),label=String(nm||t.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,80)||'Unlabeled candidate')+(paths(l.getLatLngs()).length>1?' — part '+(n+1):''),id=label+'|'+coords[0].join(',')+'|'+coords[coords.length-1].join(',');if(!seen.has(id)){seen.add(id);out.push({label,coords})}});
   }
  }
  if(l?.eachLayer)l.eachLayer(visit);
 }
 map.eachLayer(visit);candidates=out;
 const old=select.value;select.replaceChildren();
 if(!out.length){const o=document.createElement('option');o.value='';o.textContent='No visible candidate lines';select.append(o)}
 else{const o=document.createElement('option');o.value='';o.textContent='Choose a candidate line…';select.append(o);out.forEach((c,i)=>{const q=document.createElement('option');q.value=String(i);q.textContent=c.label;select.append(q)});if(out[Number(old)])select.value=old}
 if(out.length)status.textContent=out.length+' candidate lines detected. Choose one to create a separate draft copy.';
 buttons()
}
function queue(){clearTimeout(timer);timer=setTimeout(scan,150)}
function paint(){
 draftLayer.clearLayers();handles.clearLayers();
 if(draft){
  L.polyline(draft.coords,{pane:'trailEditDraft',color:'#b56d00',weight:6,opacity:.95,dashArray:'8 5'}).bindPopup('<strong>Editable draft copy</strong><br>Not published.').addTo(draftLayer);
  draft.coords.forEach((c,i)=>{const m=L.marker(c,{pane:'trailEditDraft',draggable:true,keyboard:true,title:'Drag anchor '+(i+1),icon:L.divIcon({className:'',html:'<span class="te-handle"></span>',iconSize:[18,18],iconAnchor:[9,9]})}).addTo(handles);m.on('dragstart',snapshot);m.on('dragend',e=>{const q=e.target.getLatLng();draft.coords[i]=[q.lat,q.lng];save();paint();status.textContent='Anchor moved. Draft autosaved; Undo is available.'})});
 }
 save();buttons()
}
function restore(from,to){if(!from.length)return;to.push(clone(draft));draft=from.pop();placing=false;el('teAdd').setAttribute('aria-pressed','false');paint();status.textContent=draft?'Draft restored.':'Draft copy removed; source line remains.'}
el('teLoad').addEventListener('click',()=>{const c=candidates[Number(select.value)];if(!c){status.textContent='Choose a candidate line first.';return}snapshot();draft={name:c.label,coords:c.coords.map(p=>p.slice()),status:'draft-unverified'};paint();status.textContent='Draft copy loaded. The candidate reference remains unchanged.'});
el('teAdd').addEventListener('click',()=>{if(!draft)return;placing=!placing;el('teAdd').setAttribute('aria-pressed',String(placing));status.textContent=placing?'Click directly on the gold draft line to insert an anchor; then drag the new point.':'Anchor placement cancelled.'});
function nearest(ll){const pts=draft.coords.map(c=>map.latLngToLayerPoint(c)),q=map.latLngToLayerPoint(ll);let best={d:Infinity,i:-1,p:null};for(let i=0;i<pts.length-1;i++){const p=L.LineUtil.closestPointOnSegment(q,pts[i],pts[i+1]),d=q.distanceTo(p);if(d<best.d)best={d,i,p:map.layerPointToLatLng(p)}}return best}
map.on('click',e=>{if(!placing||!draft)return;const n=nearest(e.latlng);if(n.d>28){status.textContent='Click closer to the gold draft line.';return}snapshot();draft.coords.splice(n.i+1,0,[n.p.lat,n.p.lng]);placing=false;el('teAdd').setAttribute('aria-pressed','false');paint();status.textContent='Anchor inserted. Drag the gold point to reshape the line; Undo restores the previous shape.'});
el('teUndo').addEventListener('click',()=>restore(undo,redo));el('teRedo').addEventListener('click',()=>restore(redo,undo));
el('teDelete').addEventListener('click',()=>{if(!draft)return;snapshot();draft=null;paint();status.textContent='Draft deleted. The candidate reference remains unchanged.'});
el('teExport').addEventListener('click',()=>{if(!draft)return;const f={type:'Feature',properties:{name:draft.name,status:draft.status},geometry:{type:'LineString',coordinates:draft.coords.map(c=>[c[1],c[0]])}},b=new Blob([JSON.stringify({type:'FeatureCollection',features:[f]},null,2)],{type:'application/geo+json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='norwood-trail-draft.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);status.textContent='Draft GeoJSON downloaded; nothing was published.'});
map.on('layeradd',queue);map.on('layerremove',queue);
if(picker.value!=='all'){picker.value='all';picker.dispatchEvent(new Event('change',{bubbles:true}))}
setTimeout(scan,500);setTimeout(scan,1800);paint();
})();