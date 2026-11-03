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
 {'landmark':'West-bank end of I-95 / Neponset River bridge','pixel':[807,537],'coordinate':[-71.1671699,42.1756245],'source':'https://www.openstreetmap.org/way/9279714'},
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

def build():
 matrix=np.array([[*c['pixel'],1] for c in CONTROLS]);target=np.array([c['coordinate'] for c in CONTROLS]);coeff=np.linalg.solve(matrix,target)
 def convert(p):return [round(float(v),8) for v in np.array([*p,1])@coeff]
 features=[]
 for ident,name,color,points in ROUTES:
  multi=ident=='green-white';geometry={'type':'MultiLineString' if multi else 'LineString','coordinates':[[convert(p) for p in line] for line in points] if multi else [convert(p) for p in points]}
  features.append({'type':'Feature','id':'meadow-'+ident,'properties':{'name':'Meadow Street — '+name,'route_name':name,'route_color':color,'source':'Town of Norwood brochure approximation','source_url':PDF,'status':'existing','in_norwood':True,'trail_system':'Meadow Street','approximation':True,'method':'Owner-authorized brochure approximation positioned using nearby roads and Neponset River landmarks','source_image_pixels':points},'geometry':geometry})
 checks=[]
 for check in CHECKS:
  predicted=convert(check['pixel']);delta=np.array(predicted)-np.array(check['coordinate']);meters=float(np.hypot(delta[0]*82400,delta[1]*111200));checks.append({**check,'predicted_coordinate':predicted,'residual_meters':round(meters,1)})
 output={'type':'FeatureCollection','source_url':PDF,'status':'approximate_for_owner_review','named_routes':7,'features':features}
 (ROOT/'data/trails/meadow-street-approximate.geojson').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
 registration={'authorization':'For this one, try to approximate trails based on proximity to nearby roads and the river.','date':'2026-11-02','source_pdf':PDF,'source_image_dimensions':[1056,816],'model':'Affine pixel-to-longitude/latitude transform; locally appropriate approximate alignment','controls':CONTROLS,'independent_landmark_checks':checks,'coefficients':coeff.tolist(),'interpretation':'Landmark residuals check image placement only. They are not a measurement of actual trail accuracy.','source_map_note':'Image positions were read from the actual Town map, including the river-side Blue branch and both Green–White branches; previous guessed trace JSON was not used.'}
 (ROOT/'data/trails/meadow-street-registration.json').write_text(json.dumps(registration,ensure_ascii=False,indent=2)+'\n')
 for trail in ['germany-brook','endean']:
  d=json.loads((ROOT/f'data/trails/{trail}-approved.geojson').read_text());lock=json.loads((ROOT/f'data/trails/{trail}-lock.json').read_text());g=[{'id':f['id'],'geometry':f['geometry']} for f in d['features']];assert hashlib.sha256(json.dumps(g,sort_keys=True,separators=(',',':')).encode()).hexdigest()==lock['geometry_sha256']
 print('Built 7 named routes in 8 features; landmark checks',[(c['landmark'],c['residual_meters']) for c in checks]);print('Locked Germany Brook and Endean geometry unchanged.')
if __name__=='__main__':build()
