"""Station identity and conservative fuel-report merging shared by both updaters."""
import json
import math
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path

OUT = Path('data/gas-prices.json')
STATUS = Path('data/gas-price-status.json')
FUELS = ('regular', 'midgrade', 'premium', 'diesel')

def station(name, number, street, city='Norwood', zip_code='02062', numbers=None):
    return dict(name=name,numbers=numbers or [str(number)],street=street,city=city,zip=zip_code)

STATIONS = [
    station('Norwood Gulf',707,'Neponset St'),
    station('Gulf — Broadway',145,'Broadway'),
    station("Mr. Frank's Food Mart",917,'Washington St'),
    station('Sunoco — Route 1',515,'Providence Hwy'),
    station('Route 1 Auto Services',305,'Providence Hwy'),
    station('Mobil — Route 1',971,'Providence Hwy'),
    station('Irving Oil / Rojo',69,'Providence Hwy'),
    station("BJ's Gas Station",1412,'Providence Hwy',numbers=['1412','1420','1412-1420']),
    station('CITGO',960,'Providence Hwy'),
    station('Shell — Walpole Street',491,'Walpole St'),
    station('Mobil / On the Run — Norwood Center',499,'Washington St'),
    station('Shell — Pleasant Street',238,'Pleasant St'),
    station('Costco Gas — Dedham',200,'Legacy Blvd','Dedham','02026'),
    station('Costco Gas — Sharon',160,'Old Post Rd','Sharon','02067'),
]

def now():
    return datetime.now(timezone.utc)

def stamp(value):
    try:
        if isinstance(value,(int,float)) and not isinstance(value,bool):
            return datetime.fromtimestamp(value/1000 if value>1e11 else value,timezone.utc)
        dt=datetime.fromisoformat(str(value).replace('Z','+00:00'))
        return dt.astimezone(timezone.utc) if dt.tzinfo else None
    except (TypeError,ValueError,OverflowError,OSError):
        return None

def iso(dt):
    return dt.isoformat().replace('+00:00','Z')

def norm(value):
    return re.sub(r'[^a-z0-9]+',' ',str(value).lower()).strip()

def street_key(value):
    value=norm(value)
    value=re.sub(r'\b(street|road|boulevard|highway|turnpike)\b',lambda m:{'street':'st','road':'rd','boulevard':'blvd','highway':'hwy','turnpike':'tpke'}[m[0]],value)
    return 'route1' if re.fullmatch(r'(?:boston )?providence (?:hwy|tpke)',value) else value

def address_matches(spec,line,city,region):
    match=re.fullmatch(r'\s*(\d+(?:[-–]\d+)?)\s+(.+?)\s*',str(line))
    return bool(match and match[1].replace('–','-') in spec['numbers']
                and street_key(match[2])==street_key(spec['street'])
                and norm(city)==norm(spec['city']) and norm(region) in ('ma','massachusetts'))

def google_address(place):
    parts={}
    for c in place.get('addressComponents',[]):
        for typ in c.get('types',[]):
            parts[typ]=c.get('shortText') or c.get('longText','')
    return (parts.get('street_number','')+' '+parts.get('route',''),
            parts.get('locality') or parts.get('postal_town',''),parts.get('administrative_area_level_1',''))

def usable_price(value,reported,at=None):
    at=at or now()
    dt=stamp(reported)
    return (isinstance(value,(int,float)) and not isinstance(value,bool) and math.isfinite(value)
            and 1<=value<=15 and dt is not None and timedelta(minutes=-5)<=at-dt<=timedelta(days=30))

def read(path,default):
    return json.loads(path.read_text()) if path.exists() else default

def write(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    temporary=path.with_suffix('.tmp')
    temporary.write_text(json.dumps(data,indent=2,ensure_ascii=False,sort_keys=True)+'\n')
    temporary.replace(path)

def fuel_meta(row,fuel):
    meta=row.get('fuel_reports',{}).get(fuel)
    if meta:
        return dict(meta)
    if fuel not in row:
        return {}
    return {'updated':row.get('updated') or row.get('reported_at') or row.get('checked'),
            'source':row.get('source','Legacy cached report')}

def merge(row,incoming):
    """Accept newer reports per grade; never refresh an unrelated grade's date."""
    result=dict(row)
    reports={f:fuel_meta(row,f) for f in FUELS if f in row}
    changed=[]
    for fuel,report in incoming.items():
        if fuel not in FUELS:
            continue
        date=report.get('observed_at') or report.get('updated')
        if not usable_price(report.get('price'),date):
            continue
        old=reports.get(fuel,{})
        old_time=stamp(old.get('observed_at') or old.get('updated'))
        if old_time and stamp(date)<=old_time:
            continue
        result[fuel]=report['price']
        reports[fuel]={k:v for k,v in report.items() if k!='price'}
        changed.append(fuel)
    if changed:
        result['fuel_reports']=reports
        regular=reports.get('regular',{})
        result['source']=regular.get('source','Mixed sources')
        for key in ('updated','observed_at'):
            if regular.get(key):result[key]=regular[key]
            else:result.pop(key,None)
        result['checked']=iso(now())
    return result,changed

def needs_fallback(row):
    meta=fuel_meta(row,'regular')
    dt=stamp(meta.get('observed_at') or meta.get('updated'))
    return not dt or now()-dt>timedelta(hours=48)
