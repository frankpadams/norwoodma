/* Optional public MassGIS layers for Explore Norwood. Sources:
 * https://www.mass.gov/info-details/guide-to-adding-data-from-massgiss-geoserver-to-gis-software
 * https://www.mass.gov/info-details/massgis-data-layer-names-and-descriptions
 * https://directory.spatineo.com/service/2230/
 * https://www.mass.gov/info-details/massgis-data-1990s-aerial-imagery
 * https://www.mass.gov/info-details/massgis-data-2023-aerial-imagery
 * https://www.mass.gov/info-details/massgis-data-2025-aerial-imagery
 */
(()=>{
 'use strict';
 const map=window.norwoodTrailMap, status=document.getElementById('massgisStatus');
 if(!map||!window.L||!status)return;
 const wms='https://gis-prod.digital.mass.gov/geoserver/wms';
 const definitions={
  massgisWetlands:{label:'Wetlands & waterways',layers:'massgis:GISDATA.WETLANDSDEP_POLY,massgis:GISDATA.MAJPOND_POLY,massgis:GISDATA.MAJSTRM_ARC',opacity:.62},
  massgisOpenSpace:{label:'Conservation & open space',layers:'massgis:GISDATA.OPENSPACE_POLY',opacity:.62},
  massgisParcels:{label:'Property parcels',layers:'massgis:GISDATA.L3_TAXPAR_POLY',opacity:.77,minZoom:15},
  massgisHistoric:{label:'Historic inventory',layers:'massgis:GISDATA.MHCINV_POLY,massgis:GISDATA.MHCINV_PT',opacity:.8},
  massgisWater:{label:'Drinking-water protection',layers:'massgis:GISDATA.ZONE2_POLY,massgis:GISDATA.IWPA_POLY,massgis:GISDATA.SWP_ZONES_POLY',opacity:.56}
 };
 const layers={},errors=new Set(),enabled=new Set();
 const aerialYear=document.getElementById('massgisAerialYear');
 const aerialServices={
  '1990s':'BW_Orthos_Tile_Package',
  '2023':'orthos2023',
  '2025':'Massachusetts_Aerial_Imagery_2025'
 };
 const tileRoot='https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/';
 function aerialLayer(){
  const service=aerialServices[aerialYear.value];
  return L.tileLayer(tileRoot+service+'/MapServer/tile/{z}/{y}/{x}',{
   attribution:'Aerial imagery © MassGIS',maxNativeZoom:aerialYear.value==='1990s'?19:20,
   maxZoom:22,opacity:1
  });
 }
 function note(message){status.textContent=message;}
 function errorFor(id){
  if(errors.has(id))return;
  errors.add(id);
  const label=definitions[id]?.label||'Aerial imagery';
  note(label+' could not load from the public MassGIS service. Try again later or use the MassGIS Data Hub linked below.');
 }
 function buildWms(id,def){
  const layer=L.tileLayer.wms(wms,{
   layers:def.layers,format:'image/png',transparent:true,version:'1.1.1',
   opacity:def.opacity,attribution:'© MassGIS / MassDEP / MHC'
  });
  layer.on('tileerror',()=>{if(enabled.has(id))errorFor(id);});
  return layer;
 }
 for(const [id,def] of Object.entries(definitions)){
  const input=document.getElementById(id);
  if(!input)continue;
  input.addEventListener('change',()=>{
   errors.delete(id);
   if(input.checked){
    enabled.add(id);
    if(def.minZoom&&map.getZoom()<def.minZoom){
     note('Zoom in to level '+def.minZoom+' or closer to display property parcels.');
    }else note('Loading '+def.label+' from MassGIS…');
    layers[id] ||= buildWms(id,def);
    if(!def.minZoom||map.getZoom()>=def.minZoom)layers[id].addTo(map);
   }else{
    enabled.delete(id);
    if(layers[id])map.removeLayer(layers[id]);
    note('Layer hidden. Data are informational; see MassGIS for source details.');
   }
  });
 }
 map.on('zoomend',()=>{
  const id='massgisParcels',layer=layers[id];
  if(!layer||!enabled.has(id))return;
  if(map.getZoom()>=definitions[id].minZoom){
   if(!map.hasLayer(layer)){layer.addTo(map);note('Loading parcel boundaries…');}
  }else{
   if(map.hasLayer(layer))map.removeLayer(layer);
   note('Zoom in to level 15 or closer to display property parcels.');
  }
 });
 // Query the official WMS at the clicked location, rather than treating the historic markers as decorative.
 let historicRequest=0;
 const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function historicFeatureInfo(e){
  if(!enabled.has('massgisHistoric'))return;
  const request=++historicRequest;
  const point=map.latLngToContainerPoint(e.latlng),size=map.getSize(),b=map.getBounds();
  const bbox=[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()].join(',');
  const layerNames=definitions.massgisHistoric.layers;
  const query=new URLSearchParams({
   SERVICE:'WMS',VERSION:'1.1.1',REQUEST:'GetFeatureInfo',SRS:'EPSG:4326',
   BBOX:bbox,WIDTH:String(Math.round(size.x)),HEIGHT:String(Math.round(size.y)),
   X:String(Math.round(point.x)),Y:String(Math.round(point.y)),
   LAYERS:layerNames,QUERY_LAYERS:layerNames,STYLES:'',
   INFO_FORMAT:'application/json',FEATURE_COUNT:'5',BUFFER:'8',RADIUS:'8'
  });
  const popup=L.popup().setLatLng(e.latlng).setContent('Looking up historic inventory details…').openOn(map);
  try{
   const response=await fetch(wms+'?'+query.toString(),{mode:'cors'});
   if(!response.ok)throw Error('Service error '+response.status);
   const data=await response.json();
   if(request!==historicRequest||!enabled.has('massgisHistoric'))return;
   const features=data.features||[];
   if(!features.length){
    popup.setContent('<strong>Historic inventory</strong><p>No inventory record was returned at this location. Try clicking closer to a marker.</p><a target="_blank" rel="noopener" href="https://mhc-macris.net/">Search the official MACRIS inventory ↗</a>');
    return;
   }
   const blocks=features.slice(0,5).map(feature=>{
    const p=feature.properties||{};
    const field=(...names)=>{for(const name of names){const key=Object.keys(p).find(k=>k.toLowerCase()===name.toLowerCase());if(key&&p[key]!=null&&String(p[key]).trim())return String(p[key]);}return '';};
    const name=field('historic_name','resource_name','name','property_name','histname','site_name','inv_name','building_name')||'Historic inventory record';
    const address=field('address','street_address','street','location','addr','streetname');
    const town=field('town','municipality','city');
    const inventory=field('mhc_id','mhc_no','mhc_number','inventory_no','macris_id','mhcnum');
    const description=field('description','historic_use','significance','resource_type','type','style','period','year_built','date');
    const lines=['<strong>'+escapeHtml(name)+'</strong>'];
    if(address)lines.push('<div>'+escapeHtml(address)+(town?', '+escapeHtml(town):'')+'</div>');
    if(inventory)lines.push('<div>Inventory ID: '+escapeHtml(inventory)+'</div>');
    if(description)lines.push('<div>'+escapeHtml(description)+'</div>');
    // If a service returns different field names, still expose meaningful source attributes.
    if(!address&&!inventory&&!description){
     for(const [key,value] of Object.entries(p).filter(([k,v])=>v!=null&&String(v).trim()&&!/shape|geom|objectid|globalid|length|area/i.test(k)).slice(0,6)){
      lines.push('<div><small>'+escapeHtml(key.replace(/_/g,' '))+': '+escapeHtml(value)+'</small></div>');
     }
    }
    return '<div style="padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid #ddd">'+lines.join('')+'</div>';
   });
   popup.setContent('<div style="max-height:280px;overflow:auto"><b>Massachusetts historic inventory</b>'+blocks.join('')+'<a target="_blank" rel="noopener" href="https://mhc-macris.net/">Verify records in MACRIS ↗</a><p><small>Inventory listing does not necessarily indicate protected historic designation.</small></p></div>');
  }catch(error){
   if(request!==historicRequest||!enabled.has('massgisHistoric'))return;
   popup.setContent('<strong>Historic inventory</strong><p>Details could not be retrieved from the MassGIS service.</p><a href="https://mhc-macris.net/" target="_blank" rel="noopener">Search the official MACRIS inventory ↗</a>');
  }
 }
 map.on('click',historicFeatureInfo);
 const aerialToggle=document.getElementById('massgisAerial');
 let aerial;
 function updateAerial(){
  if(aerial)map.removeLayer(aerial);
  aerial=null;
  if(!aerialToggle.checked){enabled.delete('massgisAerial');note('Historical aerial imagery hidden.');return;}
  enabled.add('massgisAerial');errors.delete('massgisAerial');
  aerial=aerialLayer();
  aerial.on('tileerror',()=>{if(enabled.has('massgisAerial'))errorFor('massgisAerial');});
  aerial.addTo(map);
  aerial.bringToBack();
  note('Loading '+aerialYear.value+' MassGIS aerial imagery. Map features remain above the imagery.');
 }
 aerialToggle?.addEventListener('change',updateAerial);
 aerialYear?.addEventListener('change',()=>{if(aerialToggle.checked)updateAerial();});
})();
