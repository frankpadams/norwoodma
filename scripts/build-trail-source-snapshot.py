"""Build review GeoJSON from downloaded MAPC ArcGIS layers and OSM map XML.
Usage: python scripts/build-trail-source-snapshot.py CACHE_DIRECTORY
Inputs: layer-4.json ... layer-11.json, meta-*.json, town.geojson, osm-*.xml.
MAPC: https://geo.mapc.org/server/rest/services/TrailMap_map_svc_v01/MapServer
Layers queried with an EPSG:4326 envelope (-71.2355,42.1515,-71.1505,42.2265),
outFields=*, outSR=4326, f=geojson. OSM: /api/0.6/map in .02-degree cells.
No image registration, line simplification, snapping or synthetic joins are applied.
"""
import json,sys,xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime,timezone

ROOT=Path(__file__).resolve().parents[1]

def inside(p,ring):
    x,y=p; result=False
    for a,b in zip(ring,ring[1:]+ring[:1]):
        if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:result=not result
    return result

def crossing(a,b,c,d):
    def cross(p,q,r):return (q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0])
    return cross(a,b,c)*cross(a,b,d)<0 and cross(c,d,a)*cross(c,d,b)<0

def intersects(line,polygons):
    for poly in polygons:
        if any(inside(p,poly[0]) and not any(inside(p,h) for h in poly[1:]) for p in line):return True
        if any(crossing(a,b,c,d) for a,b in zip(line,line[1:]) for ring in poly for c,d in zip(ring,ring[1:]+ring[:1])):return True
    return False

def build(cache):
    boundary=json.loads((cache/'town.geojson').read_text())
    geometry=boundary['features'][0]['geometry'];polygons=geometry['coordinates'] if geometry['type']=='MultiPolygon' else [geometry['coordinates']]
    features={}
    for p in sorted(cache.glob('layer-*.json')):
        layer=int(p.stem.split('-')[1]);meta=json.loads((cache/f'meta-{layer}.json').read_text())
        data=json.loads(p.read_text());assert not data.get('exceededTransferLimit'), 'Incomplete MAPC response'
        for f in data.get('features',[]):
            a=f['properties'];key='mapc-'+str(a.get('globalid') or a['objectid'])
            if key in features:continue
            lines=f['geometry']['coordinates'];lines=[lines] if f['geometry']['type']=='LineString' else lines
            f['properties']={**a,'source':'MAPC','source_layer':meta['name'],'source_url':f'https://geo.mapc.org/server/rest/services/TrailMap_map_svc_v01/MapServer/{layer}/query?objectIds={a["objectid"]}&outFields=*&outSR=4326&f=geojson','status':{1:'existing',2:'planned',3:'proposed'}.get(a.get('fac_stat'),'unspecified'),'in_norwood':any(intersects(line,polygons) for line in lines)}
            f['id']=key;features[key]=f
    ways={}
    for p in sorted(cache.glob('osm-*.xml')):
        xml=ET.parse(p).getroot();nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in xml.findall('node')}
        for w in xml.findall('way'):
            tags={t.get('k'):t.get('v') for t in w.findall('tag')};refs=[n.get('ref') for n in w.findall('nd')]
            if all(r in nodes for r in refs):ways[w.get('id')]=(tags,[nodes[r] for r in refs])
    cemeteries=[[line] for tags,line in ways.values() if (tags.get('landuse')=='cemetery' or tags.get('amenity')=='grave_yard') and len(line)>3]
    for ident,(tags,line) in ways.items():
        highway=tags.get('highway')
        if highway not in {'path','footway','steps','bridleway','track'}:continue
        if highway=='track' and tags.get('foot') not in {'yes','designated','permissive'} and 'trail' not in tags.get('name','').lower():continue
        if tags.get('footway') in {'sidewalk','crossing'}:continue
        if tags.get('access') in {'private','no'} or tags.get('foot') in {'private','no'}:continue
        if len(line)<2 or not intersects(line,polygons) or intersects(line,cemeteries):continue
        features['osm-'+ident]={'type':'Feature','id':'osm-'+ident,'properties':{**tags,'source':'OpenStreetMap','source_url':'https://www.openstreetmap.org/way/'+ident,'osm_way_id':int(ident),'status':'existing','in_norwood':True},'geometry':{'type':'LineString','coordinates':line}}
    output={'type':'FeatureCollection','attribution':'MAPC; © OpenStreetMap contributors, ODbL 1.0','snapshot_date':datetime.now(timezone.utc).date().isoformat(),'features':list(features.values())}
    path=ROOT/'data/trails/norwood-source-paths.geojson';path.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n')
    (ROOT/'data/trails/norwood-boundary.geojson').write_text(json.dumps(boundary,separators=(',',':'))+'\n')
    summary={'snapshot_date':output['snapshot_date'],'coordinate_system':'EPSG:4326','geometry_changes':'none','mapc_features':sum(f['properties']['source']=='MAPC' for f in features.values()),'mapc_intersecting_norwood':sum(f['properties']['source']=='MAPC' and f['properties']['in_norwood'] for f in features.values()),'osm_features':sum(f['properties']['source']=='OpenStreetMap' for f in features.values()),'planned_or_proposed_in_norwood':sum(f['properties']['in_norwood'] and f['properties']['status'] in {'planned','proposed'} for f in features.values()),'osm_map_cells':len(list(cache.glob('osm-*.xml')))}
    (ROOT/'data/trails/source-snapshot-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
if __name__=='__main__':build(Path(sys.argv[1]))
