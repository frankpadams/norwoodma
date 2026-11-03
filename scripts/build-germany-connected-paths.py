"""Expand the three Germany Brook OSM seed ways through shared-node path connections.
Usage: python scripts/build-germany-connected-paths.py CACHE_DIRECTORY
The cache holds complete OSM /api/0.6/map XML cells. Preserve every coordinate;
follow branches recursively, without proximity-based joins or distance limits.
"""
import json,sys,xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def build(cache):
    ways={}
    for p in sorted(cache.glob('osm-*.xml')):
        root=ET.parse(p).getroot();nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in root.findall('node')}
        for w in root.findall('way'):
            tags={t.get('k'):t.get('v') for t in w.findall('tag')};refs=[n.get('ref') for n in w.findall('nd')]
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
    output={'type':'FeatureCollection','attribution':'© OpenStreetMap contributors, ODbL 1.0; Norwood.ma existing route','seed_way_ids':sorted(map(int,seeds)),'connected_osm_way_count':len(seen),'connection_rule':'Recursive shared OSM nodes; source coordinates retained; no synthetic joins','features':features}
    (ROOT/'data/trails/germany-brook-connected.geojson').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
    print(len(seen),'OSM ways plus the preserved original route')
if __name__=='__main__':build(Path(sys.argv[1]))
