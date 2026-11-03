"""Expand the three Germany Brook OSM seed ways through shared-node path connections.
Usage: python scripts/build-germany-connected-paths.py CACHE_DIRECTORY
The cache holds complete OSM /api/0.6/map XML cells. Preserve every coordinate;
follow branches recursively, without proximity-based joins or distance limits.
"""
import hashlib,json,sys,xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def build(cache):
    ways={}
    requested={}
    requested_ids={"9280147","806490984","806490992","1343590941"}
    for p in sorted(cache.glob('osm-*.xml')):
        root=ET.parse(p).getroot();nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in root.findall('node')}
        for w in root.findall('way'):
            tags={t.get('k'):t.get('v') for t in w.findall('tag')};refs=[n.get('ref') for n in w.findall('nd')]
            if w.get('id') in requested_ids and all(r in nodes for r in refs):requested[w.get('id')]=(tags,refs,[nodes[r] for r in refs])
            if tags.get('highway') in {'path','footway','steps','pedestrian','bridleway','track'} and all(r in nodes for r in refs):ways[w.get('id')]=(tags,refs,[nodes[r] for r in refs])
    seeds={'339612105','194823774','194823771'}
    assert seeds<=ways.keys(),'Missing Germany Brook seed geometry'
    index=defaultdict(set)
    for ident,(tags,refs,coords) in ways.items():
        if tags.get('access') in {'private','no'} or tags.get('foot') in {'private','no'} or tags.get('footway')=='sidewalk':continue
        for node in refs:index[node].add(ident)
    seen=set(seeds);queue=list(seeds);parent={k:None for k in seeds}
    while queue:
        ident=queue.pop()
        for node in ways[ident][1]:
            for other in sorted(index[node]-seen):
                parent[other]={'way':int(ident),'node':int(node)};seen.add(other);queue.append(other)
    original=json.loads((ROOT/'data/trails/germany-brook-review.geojson').read_text())
    features=[]
    for f in original['features']:
        f['id']='germany-original-route';f['properties']={**f['properties'],'source':'Norwood.ma existing route','source_url':'data/trails/germany-brook-review.geojson','status':'existing','in_norwood':True,'germany_role':'original-route'};features.append(f)
    for ident in sorted(seen,key=int):
        tags,refs,coords=ways[ident]
        features.append({'type':'Feature','id':'germany-osm-'+ident,'properties':{**tags,'source':'OpenStreetMap','source_url':'https://www.openstreetmap.org/way/'+ident,'osm_way_id':int(ident),'osm_node_ids':[int(n) for n in refs],'status':'existing','in_norwood':True,'germany_role':'seed' if ident in seeds else 'connected-branch','connected_from':parent[ident]},'geometry':{'type':'LineString','coordinates':coords}})
    # Owner-directed Savage Center / Father Mac's loop, using exact mapped nodes.
    legs=[('9280147','69631695','69683507'),('806490984','69683507','7541902870'),('806490992','7541902870','69624243'),('1343590941','69624243','2053294671')]
    leg_coords=[];leg_nodes=[]
    for ident,start,end in legs:
        tags,refs,coords=requested[ident];a,b=refs.index(start),refs.index(end)
        if a<=b:part=coords[a:b+1];ns=refs[a:b+1]
        else:part=list(reversed(coords[b:a+1]));ns=list(reversed(refs[b:a+1]))
        if leg_coords:
            assert leg_coords[-1]==part[0], 'Broken mapped connection'
            leg_coords.extend(part[1:]);leg_nodes.extend(ns[1:])
        else:leg_coords.extend(part);leg_nodes.extend(ns)
    assert leg_coords[0]==ways['194823771'][2][0]
    assert leg_coords[-1]==ways['194823771'][2][-1]
    features.append({'type':'Feature','id':'germany-father-macs-loop-leg','properties':{'name':"Savage Center to Father Mac’s parking lot and behind the pool",'source':'OpenStreetMap — owner-directed route','source_url':'https://www.openstreetmap.org/way/9280147','source_way_ids':[int(x[0]) for x in legs],'source_way_urls':['https://www.openstreetmap.org/way/'+x[0] for x in legs],'osm_node_ids':[int(n) for n in leg_nodes],'status':'existing','in_norwood':True,'germany_role':'added-leg'},'geometry':{'type':'LineString','coordinates':leg_coords}})
    included_legs={1343590948:'Germany Brook landfill spur',896399146:'Germany Brook western-end connection',156220165:'Germany Brook to Willett School past the baseball field'}
    for f in features:
        ident=f['properties'].get('osm_way_id')
        if ident in included_legs:
            f['properties']['germany_role']='included-leg'
            f['properties']['name']=included_legs[ident]
    output={'type':'FeatureCollection','attribution':'© OpenStreetMap contributors, ODbL 1.0; Norwood.ma existing route','seed_way_ids':sorted(map(int,seeds)),'connected_osm_way_count':len(seen),'connection_rule':'Recursive shared OSM nodes; source coordinates retained; no synthetic joins','features':features}
    lock_path=ROOT/'data/trails/germany-brook-lock.json'
    if lock_path.exists():
        lock=json.loads(lock_path.read_text())
        geometry=[{'id':f['id'],'geometry':f['geometry']} for f in output['features']]
        digest=hashlib.sha256(json.dumps(geometry,sort_keys=True,separators=(',',':')).encode()).hexdigest()
        if digest!=lock['geometry_sha256']:
            raise RuntimeError('Germany Brook geometry is approved and locked. Preserve the approved snapshot; route changes require an explicit owner request and an updated approval record.')
    (ROOT/'data/trails/germany-brook-connected.geojson').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
    print(len(seen),'OSM ways plus the preserved original route')
if __name__=='__main__':build(Path(sys.argv[1]))
