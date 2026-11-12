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
  {id:'massgisTreeCanopy',title:'Tree canopy & land cover (2016)',service:geoserver,layers:['massgis:GISDATA.LANDCOVER_LANDUSE_POLY'],description:'2016 land-cover classification. Look for forest/tree-cover classes in the official legend. This map also contains non-tree land-cover categories; colors are not a measure of canopy percentage.',link:'https://www.mass.gov/info-details/massgis-data-2016-land-coverland-use',linkText:'MassGIS 2016 land-cover classification'},
  {id:'massgisParcels',title:'Property parcels',service:geoserver,layers:['massgis:GISDATA.L3_TAXPAR_POLY'],description:'Parcel outlines are informational, not a legal survey. Zoom in to see them.'},
  {id:'massgisHistoric',title:'Historic buildings & districts',service:geoserver,layers:['massgis:GISDATA.MHCINV_POLY','massgis:GISDATA.MHCINV_PT']},
  {id:'massgisWater',title:'Drinking-water protection',service:geoserver,layers:['massgis:GISDATA.ZONE2_POLY','massgis:GISDATA.IWPA_POLY','massgis:GISDATA.SWP_ZONES_POLY'],description:'These are water-supply protection boundaries, NOT flood-risk zones. Each map symbol is supplied by MassGIS. Click a shaded area to inspect available feature attributes.',waterGuide:true,link:'https://www.mass.gov/info-details/massgis-data-massdep-wellhead-protection-areas-zone-ii-zone-i-iwpa',linkText:'MassDEP wellhead definitions'},
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
  if(def.waterGuide){
   const guide=document.createElement('div');guide.style.cssText='font-size:.86rem;line-height:1.45;margin-top:8px';
   const rows=[
    ['Zone II — groundwater','Modeled recharge area contributing water to a public drinking-water well.'],
    ['IWPA — interim groundwater','Estimated protection area around a public well where an approved Zone II has not been established.'],
    ['Zone A — surface water','Land closest to a public drinking-water reservoir or its tributaries; generally within 400 ft of the waterbody or 200 ft of a tributary.'],
    ['Zone B — surface water','Surrounding area extending up to one-half mile from a public water-supply waterbody, or to the watershed edge.'],
    ['Zone C — surface water','Remaining watershed land outside Zones A and B.']
   ];
   const intro=document.createElement('p');intro.textContent='How to interpret the mapped categories:';intro.style.margin='4px 0 6px';guide.append(intro);
   const list=document.createElement('dl');list.style.margin='0';
   for(const [name,meaning] of rows){
    const dt=document.createElement('dt');dt.textContent=name;dt.style.cssText='font-weight:650;margin-top:7px';
    const dd=document.createElement('dd');dd.textContent=meaning;dd.style.margin='2px 0 0 0';
    list.append(dt,dd);
   }
   guide.append(list);
   const note=document.createElement('p');note.textContent='Colors are defined by the official legend images below; a color alone does not indicate water quality, contamination, or relative risk. Some zones overlap.';note.style.cssText='margin:9px 0 4px';guide.append(note);
   const source=document.createElement('a');source.href='https://www.mass.gov/info-details/massgis-data-surface-water-supply-protection-areas-zone-a-b-c';source.target='_blank';source.rel='noopener';source.textContent='MassDEP surface-water Zone A/B/C definitions ↗';guide.append(source);
   card.append(guide);
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
