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
 // Explain every active thematic layer on click using the government's own feature attributes.
 const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={
  massgisWetlands:'Wetlands & waterways',
  massgisOpenSpace:'Conservation & open space',
  massgisParcels:'Property parcels',
  massgisHistoric:'Historic buildings & districts',
  massgisWater:'Drinking-water protection'
 };
 const sourceLinks={
  massgisHistoric:['https://mhc-macris.net/','Official MACRIS inventory'],
  massgisWetlands:['https://www.mass.gov/info-details/massgis-data-massdep-wetlands-2005','MassDEP wetlands data'],
  massgisOpenSpace:['https://www.mass.gov/info-details/massgis-data-protected-and-recreational-openspace','MassGIS open space data'],
  massgisParcels:['https://www.mass.gov/info-details/massgis-data-property-tax-parcels','MassGIS parcel data'],
  massgisWater:['https://www.mass.gov/info-details/massgis-data-layers','MassGIS source data']
 };
 const priority=['massgisHistoric','massgisWetlands','massgisOpenSpace','massgisWater','massgisParcels'];
 let lookupSerial=0;
 async function queryLayer(id,latlng){
  const point=map.latLngToContainerPoint(latlng),size=map.getSize(),b=map.getBounds();
  const names=definitions[id].layers;
  const q=new URLSearchParams({
   SERVICE:'WMS',VERSION:'1.1.1',REQUEST:'GetFeatureInfo',SRS:'EPSG:4326',
   BBOX:[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()].join(','),
   WIDTH:String(Math.round(size.x)),HEIGHT:String(Math.round(size.y)),
   X:String(Math.round(point.x)),Y:String(Math.round(point.y)),
   LAYERS:names,QUERY_LAYERS:names,STYLES:'',INFO_FORMAT:'application/json',
   FEATURE_COUNT:'4',BUFFER:'8'
  });
  const response=await fetch(wms+'?'+q.toString(),{mode:'cors'});
  if(!response.ok)throw Error('WMS '+response.status);
  const json=await response.json();
  return Array.isArray(json.features)?json.features:[];
 }
 function featureHtml(feature){
  const props=feature.properties||{};
  const entries=Object.entries(props).filter(([k,v])=>v!==null&&v!==undefined&&String(v).trim()&&String(v).toLowerCase()!=='null'&&!/^(objectid|fid|shape|geom|globalid|ogc_fid|the_geom|shape_length|shape_area)$/i.test(k));
  const preferred=/name|address|street|town|type|class|zone|district|status|protection|use|wetland|resource|inventory|mhc|parcel|map_par_id|owner|description|acres/i;
  entries.sort((a,b)=>Number(preferred.test(b[0]))-Number(preferred.test(a[0])));
  if(!entries.length)return '<p>Mapped feature found, but the service did not provide descriptive attributes.</p>';
  return '<dl style="margin:5px 0">'+entries.slice(0,9).map(([key,value])=>
   '<div style="margin:3px 0"><dt style="display:inline;font-weight:600">'+escapeHtml(key.replace(/_/g,' '))+': </dt><dd style="display:inline;margin:0">'+escapeHtml(value)+'</dd></div>'
  ).join('')+'</dl>';
 }
 map.on('click',async e=>{
  const active=priority.filter(id=>enabled.has(id)&&(!definitions[id].minZoom||map.getZoom()>=definitions[id].minZoom));
  if(!active.length)return;
  // FEMA has a separate official identify popup. Avoid competing popups when it is selected.
  if(document.getElementById('femaFloodToggle')?.checked)return;
  const seq=++lookupSerial;
  const popup=L.popup({maxWidth:360}).setLatLng(e.latlng).setContent('Looking up mapped features…').openOn(map);
  const results=await Promise.all(active.map(async id=>{
   try{return {id,features:await queryLayer(id,e.latlng)}}
   catch(error){return {id,error:true,features:[]}}
  }));
  if(seq!==lookupSerial)return;
  const matches=results.filter(r=>r.features.length);
  if(!matches.length){
   const failed=results.some(r=>r.error);
   popup.setContent('<strong>Map information</strong><p>'+(failed?'The map service could not return details at this location.':'No mapped feature was identified at this point. Try clicking closer to a shaded area or marker.')+'</p>');
   return;
  }
  let html='<div style="max-height:310px;overflow-y:auto"><strong>Map information</strong>';
  for(const result of matches){
   html+='<section style="border-top:1px solid #ddd;margin-top:8px;padding-top:7px"><b>'+escapeHtml(labels[result.id])+'</b>';
   for(const feature of result.features.slice(0,3))html+='<div style="margin:5px 0">'+featureHtml(feature)+'</div>';
   const link=sourceLinks[result.id];
   html+='<a target="_blank" rel="noopener" href="'+link[0]+'">'+escapeHtml(link[1])+' ↗</a></section>';
  }
  html+='<p style="font-size:.8em">Informational GIS data; verify with the relevant authority for legal or property decisions.</p></div>';
  popup.setContent(html);
 });
 const aerialToggle=document.getElementById('massgisAerial');
 const basemapChoice=document.getElementById('mapBasemapChoice');
 const basemapStatus=document.getElementById('mapBasemapStatus');
 const street=window.norwoodTrailBasemap;
 let imagery=null;
 const aerialLabels={'esri':'Esri World Imagery','1990s':'1990s historical aerial','2023':'2023 aerial','2025':'2025 satellite / aerial'};
 function setBackground(value){
  if(imagery){map.removeLayer(imagery);imagery=null;}
  if(value==='street'){
   if(street&&!map.hasLayer(street))street.addTo(map);
   if(basemapStatus)basemapStatus.textContent='Street map';
   return;
  }
  // Remove the opaque street tiles: otherwise aerial images are hidden underneath.
  if(street&&map.hasLayer(street))map.removeLayer(street);
  if(value!=='esri')aerialYear.value=value;
  imagery=value==='esri'?L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:22,maxNativeZoom:19,attribution:'Tiles © Esri, Maxar, Earthstar Geographics, and the GIS User Community'}):aerialLayer();
  imagery.on('tileerror',()=>{if(basemapStatus)basemapStatus.textContent='Aerial tiles failed to load. Try another year or street map.';});
  imagery.addTo(map);
  imagery.bringToBack();
  if(basemapStatus)basemapStatus.textContent='Loading '+aerialLabels[value]+' from MassGIS…';
 }
 function syncAerialControl(){
  if(!basemapChoice)return;
  const value=basemapChoice.value;
  if(aerialToggle)aerialToggle.checked=value!=='street'&&value!=='esri';
  if(value!=='street'&&value!=='esri')aerialYear.value=value;
  setBackground(value);
  document.dispatchEvent(new Event('change',{bubbles:false}));
 }
 basemapChoice?.addEventListener('change',syncAerialControl);
 aerialToggle?.addEventListener('change',()=>{
  if(!basemapChoice)return;
  basemapChoice.value=aerialToggle.checked?aerialYear.value:'street';
  setBackground(basemapChoice.value);
 });
 aerialYear?.addEventListener('change',()=>{
  if(!basemapChoice)return;
  if(aerialToggle?.checked){
   basemapChoice.value=aerialYear.value;
   setBackground(basemapChoice.value);
  }
 });
})();
