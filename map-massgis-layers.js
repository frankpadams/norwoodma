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
