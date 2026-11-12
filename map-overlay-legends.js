/* Contextual map legends. Prefer original WMS GetLegendGraphic symbols over approximated swatches. */
(()=>{
 const root=document.getElementById('mapOverlayLegends'),items=document.getElementById('mapOverlayLegendItems');
 if(!root||!items)return;
 const geoserver='https://gis-prod.digital.mass.gov/geoserver/wms';
 const fema='https://hazards.fema.gov/arcgis/services/public/NFHLWMS/MapServer/WMSServer';
 const defs=[
  {id:'femaFloodToggle',title:'FEMA flood hazard zones',service:fema,layers:['28'],description:'FEMA flood hazard zone symbols. Click a shaded area for its zone designation.',link:'https://msc.fema.gov/portal/search',linkText:'FEMA official map'},
  {id:'massgisWetlands',title:'Wetlands & waterways',service:geoserver,layers:['massgis:GISDATA.WETLANDSDEP_POLY','massgis:GISDATA.MAJPOND_POLY','massgis:GISDATA.MAJSTRM_ARC']},
  {id:'massgisOpenSpace',title:'Conservation & open space',service:geoserver,layers:['massgis:GISDATA.OPENSPACE_POLY']},
  {id:'massgisParcels',title:'Property parcels',service:geoserver,layers:['massgis:GISDATA.L3_TAXPAR_POLY'],description:'Parcel outlines are informational, not a legal survey. Zoom in to see them.'},
  {id:'massgisHistoric',title:'Historic buildings & districts',service:geoserver,layers:['massgis:GISDATA.MHCINV_POLY','massgis:GISDATA.MHCINV_PT']},
  {id:'massgisWater',title:'Drinking-water protection',service:geoserver,layers:['massgis:GISDATA.ZONE2_POLY','massgis:GISDATA.IWPA_POLY','massgis:GISDATA.SWP_ZONES_POLY']},
  {id:'massgisAerial',title:'Historical aerial imagery',description:'Photographic basemap. The selected year is shown below; this layer does not use thematic shading.'},
  {id:'elementaryZones',title:'Elementary school attendance areas',colors:[['Prescott','#9d65ac'],['Willett','#4479b0'],['Balch','#e08b39'],['Oldham','#54995a'],['Callahan','#cc6177'],['Cleveland','#399b9a']]},
  {id:'votingPrecincts',title:'Voting precincts',description:'Nine numbered precinct boundaries. Select a precinct on the map for details.'}
 ];
 function legendUrl(service,layer){
  const q=new URLSearchParams({service:'WMS',request:'GetLegendGraphic',version:'1.1.1',format:'image/png',layer,transparent:'true'});
  return service+'?'+q.toString();
 }
 function make(def){
  const card=document.createElement('div');
  card.style.cssText='border:1px solid #dce4ea;border-radius:7px;padding:10px;min-width:0';
  const title=document.createElement('strong');title.textContent=def.title;card.append(title);
  if(def.id==='massgisAerial'){
   const year=document.getElementById('massgisAerialYear')?.selectedOptions[0]?.textContent||'Selected year';
   const p=document.createElement('p');p.textContent='Imagery: '+year;p.style.margin='6px 0';card.append(p);
  }
  if(def.colors){
   const list=document.createElement('div');list.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-top:8px';
   for(const [label,color] of def.colors){
    const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:6px;font-size:.85rem';
    const swatch=document.createElement('span');swatch.style.cssText='display:inline-block;width:16px;height:14px;flex:none;border:1px solid #54616b;background:'+color;
    row.append(swatch,document.createTextNode(label));list.append(row);
   }card.append(list);
  }
  if(def.layers){
   for(const layer of def.layers){
    const wrap=document.createElement('div');wrap.style.cssText='margin-top:7px;overflow-x:auto';
    const img=document.createElement('img');img.src=legendUrl(def.service,layer);img.alt='Official legend for '+layer;img.loading='lazy';img.style.cssText='display:block;max-width:100%;height:auto';
    img.onerror=()=>{
     wrap.replaceChildren();
     const msg=document.createElement('small');msg.textContent='Official legend graphic unavailable. Verify symbology in the source map.';wrap.append(msg);
    };
    wrap.append(img);card.append(wrap);
   }
  }
  if(def.description){const p=document.createElement('p');p.textContent=def.description;p.style.cssText='font-size:.82rem;margin:7px 0 0';card.append(p);}
  const a=document.createElement('a');a.href=def.link||'https://gis.data.mass.gov/';a.target='_blank';a.rel='noopener';a.textContent=def.linkText||'MassGIS source information ↗';a.style.cssText='display:inline-block;font-size:.82rem;margin-top:6px';card.append(a);
  return card;
 }
 function render(){
  items.replaceChildren();
  for(const def of defs){if(document.getElementById(def.id)?.checked)items.append(make(def));}
  root.hidden=!items.children.length;
 }
 document.addEventListener('change',e=>{
  if(defs.some(d=>d.id===e.target?.id)||e.target?.id==='massgisAerialYear')render();
 });
 render();
})();
