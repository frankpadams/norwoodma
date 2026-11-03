"""Owner-authorized Meadow Street approximation from the Town's August 2025 map.
Pixel coordinates refer to the actual 1056x816 map image embedded in PDF page 2.
Position routes against nearby mapped roads and the Neponset River. These are
brochure approximations, not recorded GPS tracks. Never modify locked trails.
"""
import json,hashlib
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
PDF='https://cms5.revize.com/revize/norwoodma25/Trails/Broc_MeadowStProp_D5Alt_20250807.pdf?t=202603061503060'
CONTROLS=[
 {'landmark':'Eastern end of Meadow Street','pixel':[177,333],'coordinate':[-71.17355,42.17757],'source':'https://www.openstreetmap.org/way/9280491'},
 {'landmark':'I-95 bridge reference used for coarse map registration; Blue roadside leg corrected separately','pixel':[807,537],'coordinate':[-71.1671699,42.1756245],'source':'https://www.openstreetmap.org/way/9279714'},
 {'landmark':'Eastern bend of Neponset River','pixel':[862,245],'coordinate':[-71.1666493,42.1781577],'source':'https://www.openstreetmap.org/way/1013227546'}]
CHECKS=[
 {'landmark':'Upper river bend','pixel':[742,130],'coordinate':[-71.1680014,42.1790978],'source':'https://www.openstreetmap.org/way/815547162'},
 {'landmark':'Heather Drive / Meadow Street intersection','pixel':[75,334],'coordinate':[-71.17446,42.17755],'source':'https://www.openstreetmap.org/way/9279792'}]
ROUTES=[
 ('blue','Blue','#0070ff',[[177,333],[211,339],[239,350],[266,360],[287,357],[306,351],[314,345],[332,363],[350,356],[371,350],[395,355],[409,379],[432,411],[443,419],[462,415],[486,406],[490,417],[489,452],[494,471],[510,495],[483,510],[516,546],[555,587],[599,632],[641,672],[670,695],[681,704]]),
 ('blue-river','Blue — river-side branch','#0070ff',[[670,695],[687,687],[705,666],[731,638],[753,608],[776,574],[795,547],[807,537]]),
 ('black','Black','#171717',[[295,30],[294,70],[299,113],[301,163],[306,223],[309,252],[321,286],[331,308],[323,329],[314,345]]),
 ('green','Green','#758f3f',[[331,308],[362,302],[391,297],[421,291],[450,263],[473,235],[495,211],[530,184],[559,171],[585,160],[611,148],[642,131],[663,126],[675,118],[678,103],[690,102],[707,112],[724,122],[734,127]]),
 ('green-white','Green–White','#758f3f',[[[473,235],[490,241],[511,238],[527,226],[542,216],[535,196],[530,184]],[[530,184],[533,164],[539,150],[543,144],[559,137],[590,134],[606,113],[623,109],[651,110],[665,100],[678,103]]]),
 ('magenta','Magenta','#f000c0',[[301,163],[326,157],[349,165],[373,177],[389,193],[410,206],[423,205],[436,194],[449,193],[466,183],[491,175],[516,165],[533,164]]),
 ('orange','Orange','#e89b00',[[775,186],[772,204],[766,223],[774,239],[785,259],[787,271],[786,283]]),
 ('yellow','Yellow','#e3c500',[[510,495],[536,485],[551,490],[575,481],[613,468],[617,444],[627,425],[625,385],[628,348],[654,315],[668,286],[681,261],[703,242],[718,240],[740,261],[764,280],[778,285],[786,283],[803,279],[823,270],[839,279]])]

# Actual western I-95 carriageway, used solely as a parallel alignment guide.
I95_GUIDE=[[-71.1710621,42.1714153],[-71.168036,42.1746896],[-71.1672692,42.1755175],[-71.1671699,42.1756245]]
I95_SOURCE_WAYS=[1099197709,1099156880]
I95_OFFSET_METERS=45.0

def road_distance(point,guide):
 p=np.array(point)*[82400,111200];g=np.array(guide)*[82400,111200];best=float('inf')
 for a,b in zip(g,g[1:]):
  t=np.clip(np.dot(p-a,b-a)/np.dot(b-a,b-a),0,1);best=min(best,float(np.linalg.norm(p-(a+t*(b-a)))))
 return best

def west_parallel_leg(original_junction):
 scale=np.array([82400,111200]);g=np.array(I95_GUIDE)*scale;p=np.array(original_junction)*scale;candidates=[]
 for i,(a,b) in enumerate(zip(g,g[1:])):
  t=np.clip(np.dot(p-a,b-a)/np.dot(b-a,b-a),0,1);q=a+t*(b-a);candidates.append((np.linalg.norm(p-q),i,q))
 _,index,start=min(candidates,key=lambda v:v[0]);line=np.vstack([start,g[index+1:]]);shifted=[]
 for i,point in enumerate(line):
  direction=line[min(i+1,len(line)-1)]-line[max(i-1,0)];direction=direction/np.linalg.norm(direction)
  # Guide runs north-east; its left normal points toward the woods, west of I-95.
  normal=np.array([-direction[1],direction[0]]);shifted.append([round(float(v),8) for v in (point+normal*I95_OFFSET_METERS)/scale])
 assert all(road_distance(c,I95_GUIDE)>44 for c in shifted)
 return shifted

# Western shoreline from OSM water polygons 1325519385 and 1325521005.
WEST_BANK=[[-71.167202,42.1757645],[-71.1675239,42.1762257],[-71.1675078,42.176496],[-71.1674112,42.1767663],[-71.1672208,42.1771758],[-71.1669123,42.1776528],[-71.1667487,42.1780404],[-71.1666951,42.1781517],[-71.1667648,42.1783207],[-71.1669847,42.1785592],[-71.1674622,42.1786685],[-71.167843,42.1787659],[-71.1680791,42.1790382],[-71.168004,42.1792708]]

def riverbank_extension(features,parallel):
 scale=np.array([82400,111200]);shore=np.array(WEST_BANK)*scale;land=[]
 for i,p in enumerate(shore):
  direction=shore[min(i+1,len(shore)-1)]-shore[max(i-1,0)];direction/=np.linalg.norm(direction);land.append(p+np.array([-direction[1],direction[0]])*10)
 land=np.array(land)
 start=np.array(parallel[-1])*scale
 road=np.array([[-71.1671699,42.1756245],[-71.1668297,42.1759906]])*scale
 direction=road[1]-road[0];direction/=np.linalg.norm(direction);end=road[1]+np.array([-direction[1],direction[0]])*I95_OFFSET_METERS
 def cross(a,b):return a[0]*b[1]-a[1]*b[0]
 intersections=[]
 for i,(a,b) in enumerate(zip(land,land[1:])):
  r=end-start;v=b-a;den=cross(r,v)
  if abs(den)<1e-9:continue
  t=cross(a-start,v)/den;u=cross(a-start,r)/den
  if 0<=t<=1 and 0<=u<=1:intersections.append((t,i+u,start+t*r))
 assert intersections,'Road-parallel extension must meet the western-bank path'
 _,entry,join=min(intersections,key=lambda x:x[0]);byid={f['id']:f for f in features};connections=[]
 for ident,which in [('meadow-yellow',-1),('meadow-orange',0),('meadow-green',-1)]:
  old=byid[ident]['geometry']['coordinates'][which];point=np.array(old)*scale;candidates=[]
  for i,(a,b) in enumerate(zip(land,land[1:])):
   t=np.clip(np.dot(point-a,b-a)/np.dot(b-a,b-a),0,1);q=a+t*(b-a);candidates.append((np.linalg.norm(q-point),i+t,q))
  distance,position,q=min(candidates,key=lambda x:x[0]);assert distance<30,'Riverside endpoint adjustment too large'
  coordinate=[round(float(v),8) for v in q/scale];byid[ident]['geometry']['coordinates'][which]=coordinate
  connections.append({'route_id':ident,'old_endpoint':old,'endpoint':coordinate,'adjustment_meters':round(float(distance),1),'bank_position':float(position)})
 last=max(c['bank_position'] for c in connections);points=[(entry,[round(float(v),8) for v in join/scale])]
 points.extend((float(i),[round(float(v),8) for v in q/scale]) for i,q in enumerate(land) if entry<i<last)
 points.extend((c['bank_position'],c['endpoint']) for c in connections)
 points.sort(key=lambda x:x[0]);result=list(parallel)
 for _,coordinate in points:
  if coordinate!=result[-1]:result.append(coordinate)
 byid['meadow-blue-river']['geometry']['coordinates']=result
 byid['meadow-blue-river']['properties']['riverbank_extension']='Continue northeast to the western bank, then north along the bank to Yellow, Orange and Green endpoints.'
 byid['meadow-blue-river']['properties']['shoreline_source_osm_ways']=[1325519385,1325521005]
 for c in connections:
  assert c['endpoint'] in result
 return {'shoreline_source_osm_ways':[1325519385,1325521005],'shoreline_coordinates':WEST_BANK,'landward_offset_meters':10,'connections':connections,'method':'Continue the off-highway corridor northeast to its intersection with a landward offset of the mapped western shoreline; follow the bank to the riverside endpoints.'}

def build():
 matrix=np.array([[*c['pixel'],1] for c in CONTROLS]);target=np.array([c['coordinate'] for c in CONTROLS]);coeff=np.linalg.solve(matrix,target)
 def convert(p):return [round(float(v),8) for v in np.array([*p,1])@coeff]
 features=[]
 for ident,name,color,points in ROUTES:
  multi=ident=='green-white';geometry={'type':'MultiLineString' if multi else 'LineString','coordinates':[[convert(p) for p in line] for line in points] if multi else [convert(p) for p in points]}
  features.append({'type':'Feature','id':'meadow-'+ident,'properties':{'name':'Meadow Street — '+name,'route_name':name,'route_color':color,'source':'Town of Norwood brochure approximation','source_url':PDF,'status':'existing','in_norwood':True,'trail_system':'Meadow Street','approximation':True,'method':'Owner-authorized brochure approximation positioned using nearby roads and Neponset River landmarks','source_image_pixels':points},'geometry':geometry})
 by_id={f['id']:f for f in features}
 main=by_id['meadow-blue'];east=by_id['meadow-blue-river']
 parallel=west_parallel_leg(east['geometry']['coordinates'][0])
 # Share the new junction; remove the previous short spur toward the carriageway.
 main['geometry']['coordinates']=main['geometry']['coordinates'][:-2]+[parallel[0]]
 east['geometry']['coordinates']=parallel
 for f in [main,east]:
  f['properties']['alignment_correction']='Eastern Blue leg parallel to I-95 on its western woodland side; removed highway-reaching spur.'
 east['properties']['alignment_guide_osm_ways']=I95_SOURCE_WAYS
 east['properties']['offset_from_western_carriageway_center_meters']=I95_OFFSET_METERS
 assert main['geometry']['coordinates'][-1]==east['geometry']['coordinates'][0]
 for a,b in zip(east['geometry']['coordinates'],east['geometry']['coordinates'][1:]):
  for t in np.linspace(0,1,21):assert road_distance(np.array(a)+(np.array(b)-a)*t,I95_GUIDE)>44
 bank_registration=riverbank_extension(features,parallel)
 checks=[]
 for check in CHECKS:
  predicted=convert(check['pixel']);delta=np.array(predicted)-np.array(check['coordinate']);meters=float(np.hypot(delta[0]*82400,delta[1]*111200));checks.append({**check,'predicted_coordinate':predicted,'residual_meters':round(meters,1)})
 output={'type':'FeatureCollection','source_url':PDF,'status':'approximate_for_owner_review','named_routes':7,'features':features}
 lock_path=ROOT/'data/trails/meadow-street-lock.json'
 if lock_path.exists():
  lock=json.loads(lock_path.read_text());geometry=[{'id':f['id'],'geometry':f['geometry']} for f in output['features']]
  digest=hashlib.sha256(json.dumps(geometry,sort_keys=True,separators=(',',':')).encode()).hexdigest()
  if digest!=lock['geometry_sha256']:raise RuntimeError('Meadow Street is approved and locked. Preserve the approved snapshot; alignment changes require an explicit owner request and updated approval record.')
 (ROOT/'data/trails/meadow-street-approximate.geojson').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
 registration={'authorization':'For this one, try to approximate trails based on proximity to nearby roads and the river.','date':'2026-11-02','source_pdf':PDF,'source_image_dimensions':[1056,816],'model':'Affine pixel-to-longitude/latitude transform; locally appropriate approximate alignment','controls':CONTROLS,'independent_landmark_checks':checks,'coefficients':coeff.tolist(),'interpretation':'Landmark residuals check image placement only. They are not a measurement of actual trail accuracy.','riverbank_extension':bank_registration,'i95_correction':{'instruction':'Eastern Blue leg must run parallel to I-95, not on it.','guide_source_way_ids':I95_SOURCE_WAYS,'guide_coordinates':I95_GUIDE,'offset_meters':I95_OFFSET_METERS,'side':'western woodland side of western carriageway','minimum_checked_distance_from_guide_meters':44,'note':'Offset is an approximate placement guide, not a surveyed trail setback.'},'source_map_note':'Image positions were read from the actual Town map, including the river-side Blue branch and both Green–White branches; previous guessed trace JSON was not used.'}
 (ROOT/'data/trails/meadow-street-registration.json').write_text(json.dumps(registration,ensure_ascii=False,indent=2)+'\n')
 for trail in ['germany-brook','endean']:
  d=json.loads((ROOT/f'data/trails/{trail}-approved.geojson').read_text());lock=json.loads((ROOT/f'data/trails/{trail}-lock.json').read_text());g=[{'id':f['id'],'geometry':f['geometry']} for f in d['features']];assert hashlib.sha256(json.dumps(g,sort_keys=True,separators=(',',':')).encode()).hexdigest()==lock['geometry_sha256']
 print('Built 7 named routes in 8 features; landmark checks',[(c['landmark'],c['residual_meters']) for c in checks]);print('Locked Germany Brook and Endean geometry unchanged.')
if __name__=='__main__':build()
