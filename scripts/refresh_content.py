#!/usr/bin/env python3
"""Refresh Norwood.ma event/news data for a static GitHub Pages site.

# Source registry changes can be force-refreshed by touching this script.
# 2026-09-22: refresh triggered after adding First Congregational Church events.

The script is deliberately failure-tolerant: one broken source never prevents the
site from keeping its last known-good, still-current data. Scheduled runs can be
performed by GitHub Actions; --offline rebuilds browser fallback JS from bundled
seed/current JSON without network access.
"""
from __future__ import annotations
import argparse, json, re, sys, hashlib, subprocess, shutil
from datetime import datetime, date, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse, urljoin, quote
from zoneinfo import ZoneInfo

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'
TZ=ZoneInfo('America/New_York')
UA='Norwood.ma community information bot/0.13.2 (+https://www.norwood.ma)'

try:
    import requests
except Exception:
    requests=None
try:
    from bs4 import BeautifulSoup
except Exception:
    BeautifulSoup=None
try:
    from dateutil import parser as dtparser
except Exception:
    dtparser=None
try:
    from icalendar import Calendar
except Exception:
    Calendar=None


def read_json(name, default):
    p=DATA/name
    try: return json.loads(p.read_text())
    except Exception: return default

def write_json(name, value):
    (DATA/name).write_text(json.dumps(value, indent=2, ensure_ascii=False)+"\n")

def write_js(name, var, value):
    (DATA/name).write_text(f"window.{var}="+json.dumps(value, ensure_ascii=False,separators=(',',':'))+";\n")

def now_local(): return datetime.now(TZ)

def clean_text(value):
    if value is None: return ''
    s=str(value)
    if BeautifulSoup:
        try: s=BeautifulSoup(s,'html.parser').get_text(' ')
        except Exception: pass
    s=re.sub(r'\s+',' ',s).strip()
    return s

def slug(s):
    x=re.sub(r'[^a-z0-9]+','-',clean_text(s).lower()).strip('-')[:70]
    return x or 'event'

def parse_dt(value):
    if value is None: return None
    if isinstance(value, datetime): return value if value.tzinfo else value.replace(tzinfo=TZ)
    if isinstance(value, date): return datetime(value.year,value.month,value.day,tzinfo=TZ)
    if dtparser:
        try:
            d=dtparser.parse(str(value))
            return d if d.tzinfo else d.replace(tzinfo=TZ)
        except Exception:
            pass
    try:
        d=datetime.fromisoformat(str(value).replace('Z','+00:00'))
        return d if d.tzinfo else d.replace(tzinfo=TZ)
    except Exception:
        return None

def date_parts(value):
    d=parse_dt(value)
    if not d: return {'date':None,'time':None}
    d=d.astimezone(TZ)
    # all-day inputs usually arrive without an explicit clock; caller can null it.
    return {'date':d.date().isoformat(),'time':d.strftime('%H:%M')}

def event_id(title, start_date, venue=''):
    raw=f"{start_date}|{title}|{venue}".encode('utf-8')
    return f"{start_date}-{slug(title)[:45]}-{hashlib.sha1(raw).hexdigest()[:7]}"

def local_enough(text, source):
    text=clean_text(text)
    if re.search(r'\bNorwood\b',text,re.I): return True
    coverage=source.get('coverage','')
    # Local primary sources are allowed to omit "Norwood" from every event card.
    return coverage.startswith('Norwood') and source.get('authority') in {'official','organization','business'}

def public_candidate(title, description=''):
    t=f"{title} {description}".lower()
    blocked=[
      'select board meeting','planning board meeting','conservation commission meeting',
      'school committee meeting','zoning board meeting','finance commission meeting',
      'practice','members only','member-only','private event'
    ]
    if any(x in t for x in blocked):
        return False

    # Vaccine policy: include special, dated public clinics but suppress routine
    # ongoing retail/pharmacy vaccination availability that would otherwise
    # flood the community calendar with effectively identical daily entries.
    vaccine_terms=('vaccine','vaccination','immunization','flu shot','covid shot','covid-19 shot')
    if any(x in t for x in vaccine_terms):
        routine_terms=('daily','every day','walk-in anytime','walk in anytime','available daily',
                       'appointments available','book an appointment','pharmacy hours',
                       'ongoing vaccination','vaccines available')
        special_terms=('clinic','town clinic','community clinic','school clinic','senior clinic',
                       'one-day','one day','pop-up','popup','drive-through','drive through')
        if any(x in t for x in routine_terms) and not any(x in t for x in special_terms):
            return False

    return True

def category_from(text):
    t=clean_text(text).lower()
    tests=[
      ('assistance',['food pantry','food distribution','free meal','community meal','soup kitchen','clothing giveaway','coat drive','diaper distribution','resource fair','benefits assistance','snap assistance','wic assistance']),
      ('fundraiser',['fundraiser','benefit','charity']),('market',['market','craft fair','vendor fair']),
      ('school_theatre',['school play','musical','theatre','theater']),('live_music',['concert','live music','band','open mic','jazz']),
      ('arts',['art','gallery','paint','craft','maker']),('food',['food','dinner','brunch','restaurant']),
      ('sports',['skating','race','5k','run ','fitness']),('workshop',['workshop','class','lesson']),
      ('community',['open house','festival','celebration','community','storytime','book club'])
    ]
    for cat, words in tests:
        if any(w in t for w in words): return cat
    return 'community'

def request(url, *, timeout=18):
    if not requests: raise RuntimeError('network dependencies unavailable')
    r=requests.get(url,headers={'User-Agent':UA,'Accept':'text/html,application/json,application/rss+xml,application/xml;q=0.9,*/*;q=0.8'},timeout=timeout)
    r.raise_for_status(); return r

def walk_jsonld(obj):
    if isinstance(obj,list):
        for x in obj: yield from walk_jsonld(x)
    elif isinstance(obj,dict):
        if '@graph' in obj: yield from walk_jsonld(obj['@graph'])
        yield obj

def location_text(loc):
    if isinstance(loc,str): return clean_text(loc),''
    if not isinstance(loc,dict): return '',''
    name=clean_text(loc.get('name'))
    a=loc.get('address')
    if isinstance(a,str): addr=clean_text(a)
    elif isinstance(a,dict):
        addr=', '.join(filter(None,[clean_text(a.get('streetAddress')),clean_text(a.get('addressLocality')),clean_text(a.get('addressRegion')),clean_text(a.get('postalCode'))]))
    else: addr=''
    return name,addr

def normalize_jsonld_event(obj, source):
    typ=obj.get('@type')
    types=typ if isinstance(typ,list) else [typ]
    if 'Event' not in types and not any(str(x).endswith('Event') for x in types if x): return None
    title=clean_text(obj.get('name'))
    start=parse_dt(obj.get('startDate'))
    if not title or not start: return None
    end=parse_dt(obj.get('endDate'))
    venue,address=location_text(obj.get('location'))
    desc=clean_text(obj.get('description'))
    geo=f"{title} {desc} {venue} {address}"
    if source.get('filters',{}).get('require_norwood_relevance') and not local_enough(geo,source): return None
    if not public_candidate(title,desc): return None
    startp=date_parts(start); endp=date_parts(end) if end else {'date':startp['date'],'time':None}
    url=obj.get('url') or source.get('url')
    offers=obj.get('offers'); cost=None
    if isinstance(offers,dict):
        price=offers.get('price'); currency=offers.get('priceCurrency')
        if price is not None: cost=f"{currency+' ' if currency else ''}{price}"
    return {
      'id':event_id(title,startp['date'],venue or address),'title':title,'start':startp,'end':endp,
      'venue':venue or source.get('organization') or source.get('name'),'address':address or None,
      'category':category_from(f"{title} {desc}"),'source_id':source['id'],'source_url':url,
      'cost':cost,'public_access':'public','series':None,'publish_candidate':True,
      'verification_status':'auto_primary_source','notes':desc[:240] or None,'discovered_by':'scheduled_jsonld'
    }

def extract_html_event_cards(html, source):
    """Conservative fallback for event lists that use semantic <time> markup."""
    if not BeautifulSoup: return []
    soup=BeautifulSoup(html,'html.parser'); out=[]
    for t in soup.find_all('time'):
        raw=t.get('datetime') or clean_text(t.get_text(' '))
        st=parse_dt(raw)
        if not st: continue
        card=t
        for _ in range(4):
            if card.parent is None: break
            card=card.parent
            if card.name in {'article','li','section'} or (card.get('class') and any('event' in str(c).lower() for c in card.get('class'))): break
        heading=card.find(['h1','h2','h3','h4']) if hasattr(card,'find') else None
        a=(heading.find('a',href=True) if heading else None) or (card.find('a',href=True) if hasattr(card,'find') else None)
        title=clean_text(heading.get_text(' ') if heading else (a.get_text(' ') if a else ''))
        if not title or len(title)>180: continue
        text=clean_text(card.get_text(' ')) if hasattr(card,'get_text') else title
        if not public_candidate(title,text): continue
        if source.get('filters',{}).get('require_norwood_relevance') and not local_enough(text,source): continue
        sp=date_parts(st); url=urljoin(source.get('url',''),a.get('href')) if a else source.get('url')
        out.append({'id':event_id(title,sp['date'],source.get('organization') or ''),'title':title,'start':sp,'end':{'date':sp['date'],'time':None},'venue':source.get('organization') or source.get('name'),'address':None,'category':category_from(text),'source_id':source['id'],'source_url':url,'cost':None,'public_access':'public','series':None,'publish_candidate':True,'verification_status':'auto_source_page','notes':None,'discovered_by':'scheduled_semantic_html'})
    return out

def extract_jsonld_events(html, source):
    if not BeautifulSoup: return []
    soup=BeautifulSoup(html,'html.parser'); out=[]
    for tag in soup.find_all('script',attrs={'type':'application/ld+json'}):
        try: payload=json.loads(tag.string or tag.get_text() or '{}')
        except Exception: continue
        for obj in walk_jsonld(payload):
            e=normalize_jsonld_event(obj,source)
            if e: out.append(e)
    # If a page exposes an iCal link, use it as a structured source too.
    ics=[]
    for a in soup.find_all('a',href=True):
        href=urljoin(source.get('url',''),a['href'])
        if '.ics' in href.lower() or 'ical' in href.lower(): ics.append(href)
    out.extend(extract_html_event_cards(html,source))
    return out, list(dict.fromkeys(ics))[:4]

def events_from_ical(url,source):
    if not Calendar: return []
    cal=Calendar.from_ical(request(url).content); out=[]
    for c in cal.walk('VEVENT'):
        title=clean_text(c.get('summary'))
        start_raw=c.decoded('dtstart',None)
        if not title or start_raw is None: continue
        start=parse_dt(start_raw); end=parse_dt(c.decoded('dtend',None))
        loc=clean_text(c.get('location')); desc=clean_text(c.get('description'))
        geo=f"{title} {loc} {desc}"
        if source.get('filters',{}).get('require_norwood_relevance') and not local_enough(geo,source): continue
        if not public_candidate(title,desc): continue
        sp=date_parts(start); ep=date_parts(end) if end else {'date':sp['date'],'time':None}
        # Preserve all-day semantics.
        if isinstance(start_raw,date) and not isinstance(start_raw,datetime): sp['time']=None
        if isinstance(c.decoded('dtend',None),date) and not isinstance(c.decoded('dtend',None),datetime): ep['time']=None
        url_prop=clean_text(c.get('url')) or source.get('url')
        out.append({'id':event_id(title,sp['date'],loc),'title':title,'start':sp,'end':ep,'venue':loc or source.get('organization') or source.get('name'),'address':loc or None,'category':category_from(f"{title} {desc}"),'source_id':source['id'],'source_url':url_prop,'cost':None,'public_access':'public','series':None,'publish_candidate':True,'verification_status':'auto_primary_source','notes':desc[:240] or None,'discovered_by':'scheduled_ical'})
    return out

def events_from_norwood_food_pantry(source):
    """Build the rolling Saturday pantry schedule from the pantry's published service hours."""
    out=[]
    start=now_local().date()
    end=start+timedelta(days=56)
    d=start
    while d.weekday()!=5:
        d+=timedelta(days=1)
    while d<=end:
        ds=d.isoformat()
        out.append({
          'id':event_id('Norwood Food Pantry — Food Assistance',ds,'Norwood Food Pantry'),
          'title':'Norwood Food Pantry — Food Assistance',
          'start':{'date':ds,'time':'09:00'},
          'end':{'date':ds,'time':'11:40'},
          'venue':'Norwood Food Pantry',
          'address':'150 Chapel Street, Norwood, MA 02062',
          'category':'assistance',
          'source_id':source['id'],
          'source_url':source['url'],
          'cost':'Free',
          'public_access':'eligibility_applies',
          'series':'Norwood Food Pantry Saturday Hours',
          'publish_candidate':True,
          'verification_status':'official_schedule',
          'notes':'Food assistance for eligible Norwood and Westwood residents; new clients may register during pantry hours.',
          'discovered_by':'scheduled_recurring_service'
        })
        d+=timedelta(days=7)
    return out

def events_from_tribe(source):
    base=f"{urlparse(source['url']).scheme}://{urlparse(source['url']).netloc}"
    start=now_local().date().isoformat(); end=(now_local().date()+timedelta(days=180)).isoformat()
    api=f"{base}/wp-json/tribe/events/v1/events?start_date={start}&end_date={end}&per_page=100"
    j=request(api).json(); out=[]
    for x in j.get('events',[]):
        title=clean_text(x.get('title')); st=parse_dt(x.get('start_date')); en=parse_dt(x.get('end_date'))
        if not title or not st: continue
        venue=x.get('venue') or {}; venue_name=clean_text(venue.get('venue') if isinstance(venue,dict) else venue)
        address=''
        if isinstance(venue,dict):
            address=', '.join(filter(None,[clean_text(venue.get('address')),clean_text(venue.get('city')),clean_text(venue.get('state')),clean_text(venue.get('zip'))]))
        desc=clean_text(x.get('description'))
        if source.get('filters',{}).get('require_norwood_relevance') and not local_enough(f"{title} {venue_name} {address} {desc}",source): continue
        if not public_candidate(title,desc): continue
        sp=date_parts(st); ep=date_parts(en) if en else {'date':sp['date'],'time':None}
        out.append({'id':event_id(title,sp['date'],venue_name or address),'title':title,'start':sp,'end':ep,'venue':venue_name or source.get('organization') or source.get('name'),'address':address or None,'category':category_from(f"{title} {desc}"),'source_id':source['id'],'source_url':x.get('url') or source.get('url'),'cost':clean_text(x.get('cost')) or None,'public_access':'public','series':None,'publish_candidate':True,'verification_status':'auto_primary_source','notes':desc[:240] or None,'discovered_by':'scheduled_tribe_api'})
    return out



def normalize_community_submission(obj, source):
    """Normalize one moderator-approved record from the privacy-safe Apps Script feed."""
    if not isinstance(obj, dict): return None
    title=clean_text(obj.get('title')); sd=clean_text(obj.get('date'))
    if not title or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', sd): return None
    try: date.fromisoformat(sd)
    except Exception: return None
    st=clean_text(obj.get('startTime')) or None; et=clean_text(obj.get('endTime')) or None
    def valid_time(x): return bool(x and re.fullmatch(r'(?:[01]\d|2[0-3]):[0-5]\d', x))
    if st and not valid_time(st): st=None
    if et and not valid_time(et): et=None
    venue=clean_text(obj.get('venue')); address=clean_text(obj.get('address')); town=clean_text(obj.get('town'))
    desc=clean_text(obj.get('description')); extra=clean_text(obj.get('additionalInformation'))
    notes=' '.join(x for x in [desc, extra] if x).strip()[:500] or None
    source_url=clean_text(obj.get('sourceUrl') or obj.get('registrationUrl')) or source.get('url')
    category_raw=clean_text(obj.get('category'))
    category_map={
      'arts & music':'arts','community':'community','food & drink':'food','government & civic':'government',
      'kids & families':'family','schools':'school','sports & recreation':'sports','fundraiser / benefit':'fundraiser',
      'seasonal / holiday':'community','other':'community'
    }
    category=category_map.get(category_raw.lower()) or category_from(f"{category_raw} {title} {desc}")
    event={
      'id':clean_text(obj.get('id')) or event_id(title,sd,venue or address),
      'title':title,'start':{'date':sd,'time':st},'end':{'date':sd,'time':et},
      'venue':venue or None,'address':address or None,'town':town or None,'category':category,
      'source_id':source['id'],'source_url':source_url,'registration_url':clean_text(obj.get('registrationUrl')) or None,
      'cost':clean_text(obj.get('cost')) or None,'accessibility':clean_text(obj.get('accessibility')) or None,
      'organizer':clean_text(obj.get('organizer')) or None,'recurrence':clean_text(obj.get('recurrence')) or None,
      'recurrence_details':clean_text(obj.get('recurrenceDetails')) or None,'public_access':'public','series':None,
      'publish_candidate':True,'verification_status':'moderator_approved_submission','notes':notes,
      'last_verified':clean_text(obj.get('lastVerified')) or None,'discovered_by':'community_submission_feed'
    }
    return event

def events_from_community_submission_feed(source):
    payload=request(source['url']).json()
    if not isinstance(payload,dict) or not isinstance(payload.get('events'),list):
        raise ValueError('community submission endpoint did not return an events array')
    out=[]
    for obj in payload['events']:
        e=normalize_community_submission(obj,source)
        if e: out.append(e)
    return out

def canonical_title(s):
    s=clean_text(s).lower()
    s=re.sub(r'\b(the|a|an)\b',' ',s)
    s=re.sub(r'\b20\d{2}\b',' ',s)
    return re.sub(r'[^a-z0-9]+',' ',s).strip()

def dedupe_events(events):
    # Reject scraper artifacts before deduplication. Generic recurrence labels are not real event titles.
    events=[e for e in events if canonical_title(e.get('title','')) not in {'recurring','recurrence','all events'}]
    chosen={}
    def score(e):
        v=0
        if str(e.get('verification_status','')).startswith('web_verified'): v+=5
        if str(e.get('verification_status','')).startswith('auto_primary'): v+=4
        if e.get('address'): v+=1
        if e.get('start',{}).get('time'): v+=1
        return v
    for e in events:
        title=canonical_title(e.get('title',''))
        # Normalize source-added prefixes so the same event is not published twice.
        title=re.sub(r'^(live in person|live|in person)\s+','',title).strip()
        # Same-day near-identical titles are duplicates even when one source omits/varies the venue.
        key=(title,e.get('start',{}).get('date'))
        if key not in chosen or score(e)>score(chosen[key]): chosen[key]=e
    vals=list(chosen.values())
    # Collapse a one-day auto occurrence into a verified multi-day parent when titles substantially match.
    verified=[e for e in vals if str(e.get('verification_status','')).startswith('web_verified')]
    out=[]
    for e in vals:
        if e in verified: out.append(e); continue
        et=canonical_title(e.get('title','')); ed=e.get('start',{}).get('date')
        covered=False
        for v in verified:
            vt=canonical_title(v.get('title','')); vs=v.get('start',{}).get('date'); ve=v.get('end',{}).get('date') or vs
            if ed and vs and ve and vs<=ed<=ve and (et==vt or et in vt or vt in et): covered=True; break
        if not covered: out.append(e)
    return out

def current_events(events):
    today=now_local().date()
    out=[]
    for e in events:
        if not e.get('publish_candidate',True): continue
        sd=e.get('start',{}).get('date'); ed=e.get('end',{}).get('date') or sd
        try: endd=date.fromisoformat(ed)
        except Exception: continue
        if endd < today: continue
        out.append(e)
    out.sort(key=lambda e:(e.get('start',{}).get('date') or '9999',e.get('start',{}).get('time') or '99:99',e.get('title','')))
    return out



def ncm_cablecast_schedule(site, day=None):
    """Read NCM's underlying Cablecast Internet Channel schedule, bypassing the JS-only wrapper."""
    day=day or now_local().date()
    url=f"https://reflect-npa.cablecast.tv/internetchannel/?channel=1&site={int(site)}&currentDay={day.isoformat()}"
    html=request(url).text
    if not BeautifulSoup:return []
    soup=BeautifulSoup(html,'html.parser'); out=[]
    time_pat=re.compile(r'\\b(\\d{1,2}):(\\d{2})\\s*(AM|PM)\\b',re.I)
    for node in soup.find_all(['li','tr','article','div']):
        text=clean_text(node.get_text(' '))
        m=time_pat.search(text)
        if not m or len(text)>350: continue
        title=clean_text(text[m.end():])
        title=re.sub(r'\\s+(Watch|Details|More Info).*$', '', title, flags=re.I).strip(' -–—')
        if not title or len(title)>180: continue
        tm=_time_from_text(m.group(0))
        out.append({'date':day.isoformat(),'time':tm,'title':title,'url':url})
    chosen={}
    for x in out: chosen[(x['time'],canonical_title(x['title']))]=x
    return sorted(chosen.values(),key=lambda x:x['time'] or '99:99')


def ncm_upcoming_live_broadcasts(days=14):
    today=now_local().date(); out=[]
    for site,label in ((3,'government'),(2,'school')):
        for offset in range(days+1):
            d=today+timedelta(days=offset)
            try: rows=ncm_cablecast_schedule(site,d)
            except Exception: continue
            for row in rows:
                row=dict(row); row['site']=site; row['kind']=label
                out.append(row)
    return out


def events_from_ncm_school_broadcasts(source):
    """Publish dated Schools & Sports schedule entries as events with a direct live-view link."""
    live_url='https://norwoodcommunitymedia.org/programs/site/school-2/broadcast/'
    out=[]; today=now_local().date()
    for offset in range(121):
        d=today+timedelta(days=offset)
        try: rows=ncm_cablecast_schedule(2,d)
        except Exception: continue
        for row in rows:
            text=clean_text(row.get('title'))
            low=text.lower()
            if not any(k in low for k in ('nhs','norwood high','mustang','school','sports')): continue
            title=text[:180]
            if not title: continue
            ds=d.isoformat()
            out.append({
              'id':event_id(title,ds,'Norwood Community Media'),
              'title':title,'start':{'date':ds,'time':row.get('time')},'end':{'date':ds,'time':None},
              'venue':'Norwood Community Media — Schools & Sports','address':None,'category':'school',
              'source_id':source['id'],'source_url':live_url,'registration_url':live_url,'cost':'Free',
              'public_access':'public','series':'NCM Schools & Sports Live Broadcasts','publish_candidate':True,
              'verification_status':'auto_primary_source',
              'notes':'Scheduled live school broadcast. Watch online via Norwood Community Media.',
              'discovered_by':'scheduled_ncm_school_broadcast'
            })
    return dedupe_events(out)


def refresh_events(offline=False):
    seeds=read_json('events-seed.json',[])
    registry=read_json('source-registry.json',[])
    events=list(seeds); status=[]
    if not offline:
        for src in [x for x in registry if x.get('active_monitor') and 'events' in x.get('produces',[])]:
            method=src.get('ingestion',{}).get('method'); got=[]; note=''
            try:
                if method=='ncm_school_broadcasts': got=events_from_ncm_school_broadcasts(src)
                elif method=='community_submission_json': got=events_from_community_submission_feed(src)
                elif method=='recurring_service_schedule' and src.get('id')=='norwood-food-pantry-hours': got=events_from_norwood_food_pantry(src)
                elif method=='tribe_events': got=events_from_tribe(src)
                elif method=='ical':
                    feed=src.get('ingestion',{}).get('feed_url')
                    if not feed and src.get('id')=='nps-district-ical': feed='https://www.norwood.k12.ma.us/about/calendar/feed/ical.ics'
                    if feed: got=events_from_ical(feed,src)
                    else: note='no direct feed_url configured'
                elif method in {'html_calendar','html_list','html_hub','html_page','embedded_calendar','club_calendar','secondary_discovery'}:
                    if '/events/list' in src.get('url',''):
                        try: got.extend(events_from_tribe(src))
                        except Exception: pass
                    html=request(src['url']).text
                    extracted,ics=extract_jsonld_events(html,src); got.extend(extracted)
                    for u in ics[:2]:
                        try: got.extend(events_from_ical(u,src))
                        except Exception: pass
                    if not got: note='page checked; no machine-readable Event/ICS found'
                else: note=f'method {method} requires discovery/manual adapter'
                events.extend(got)
                status.append({'source_id':src['id'],'ok':True,'method':method,'found':len(got),'note':note})
            except Exception as ex:
                status.append({'source_id':src['id'],'ok':False,'method':method,'found':0,'note':str(ex)[:180]})
    events=current_events(dedupe_events(events))
    write_json('events.json',events); write_js('events-data.js','NORWOOD_EVENTS',events)
    return events,status

def parse_rss(xml_text, source_name):
    import xml.etree.ElementTree as ET
    out=[]
    root=ET.fromstring(xml_text)
    for item in root.findall('.//item')[:40]:
        def txt(tag):
            n=item.find(tag); return clean_text(n.text if n is not None else '')
        title=txt('title'); link=txt('link'); pub=txt('pubDate'); desc=txt('description')
        d=parse_dt(pub)
        if title and link and d:
            out.append({'source':source_name,'title':title,'date':d.astimezone(TZ).isoformat(),'url':link,'summary':desc[:220],'localVerified':True,'discovered_by':'scheduled_rss'})
    return out

def news_from_jsonld(html, source_name, source_url):
    if not BeautifulSoup:return []
    soup=BeautifulSoup(html,'html.parser'); out=[]
    for tag in soup.find_all('script',attrs={'type':'application/ld+json'}):
        try: payload=json.loads(tag.string or tag.get_text() or '{}')
        except Exception: continue
        for o in walk_jsonld(payload):
            typ=o.get('@type'); types=typ if isinstance(typ,list) else [typ]
            if not any(x in {'NewsArticle','Article','BlogPosting'} for x in types): continue
            title=clean_text(o.get('headline') or o.get('name')); d=parse_dt(o.get('datePublished') or o.get('dateModified')); url=o.get('url') or source_url; desc=clean_text(o.get('description'))
            if title and d and url: out.append({'source':source_name,'title':title,'date':d.astimezone(TZ).isoformat(),'url':url,'summary':desc[:220],'localVerified':True,'discovered_by':'scheduled_jsonld'})
    return out

def news_from_html_cards(html, source_name, source_url):
    """Conservative article-list fallback: requires a dated semantic <time> element."""
    if not BeautifulSoup:return []
    soup=BeautifulSoup(html,'html.parser'); out=[]
    for card in soup.find_all(['article','li']):
        t=card.find('time')
        if not t: continue
        d=parse_dt(t.get('datetime') or clean_text(t.get_text(' ')))
        if not d: continue
        h=card.find(['h1','h2','h3','h4']); a=(h.find('a',href=True) if h else None) or card.find('a',href=True)
        title=clean_text(h.get_text(' ') if h else (a.get_text(' ') if a else ''))
        if not title or len(title)>220 or not a: continue
        url=urljoin(source_url,a.get('href')); desc=''
        p=card.find('p')
        if p: desc=clean_text(p.get_text(' '))[:220]
        out.append({'source':source_name,'title':title,'date':d.astimezone(TZ).isoformat(),'url':url,'summary':desc,'localVerified':True,'discovered_by':'scheduled_semantic_html'})
    return out

def news_from_visible_cards(html, source_name, source_url):
    """Fallback for local pages whose dates are visible text rather than <time>."""
    if not BeautifulSoup:return []
    soup=BeautifulSoup(html,'html.parser'); out=[]
    date_re=re.compile(r'\b(January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sep|Sept|October|Oct|November|Nov|December|Dec)\s+\d{1,2},\s+20\d{2}\b',re.I)
    for h in soup.find_all(['h2','h3','h4','h5']):
        title=clean_text(h.get_text(' '))
        if not title or len(title)<8 or len(title)>220: continue
        a=h.find('a',href=True) or (h.parent.find('a',href=True) if h.parent else None)
        if not a: continue
        card=h
        text=''
        for _ in range(5):
            if not getattr(card,'parent',None): break
            card=card.parent; text=clean_text(card.get_text(' '))
            if date_re.search(text): break
        m=date_re.search(text)
        if not m: continue
        d=parse_dt(m.group(0))
        if not d: continue
        url=urljoin(source_url,a.get('href'))
        summary=''
        ptag=card.find('p') if hasattr(card,'find') else None
        if ptag: summary=clean_text(ptag.get_text(' '))[:220]
        out.append({'source':source_name,'title':title,'date':d.astimezone(TZ).isoformat(),'url':url,'summary':summary,'localVerified':True,'discovered_by':'scheduled_visible_date'})
    return out

def news_from_link_dates(html, source_name, source_url):
    """Generic fallback for pages that put dates in link text, nearby text, or YYYY/MM/DD URLs."""
    if not BeautifulSoup:return []
    soup=BeautifulSoup(html,'html.parser'); out=[]
    textual=re.compile(r'\b(?:January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sep|Sept|October|Oct|November|Nov|December|Dec)\s+\d{1,2},\s+20\d{2}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM))?\b',re.I)
    numeric=re.compile(r'\b(?:0?[1-9]|1[0-2])[./-](?:0?[1-9]|[12]\d|3[01])[./-](?:20\d{2}|\d{2})\b')
    url_date=re.compile(r'/((?:20\d{2})/(?:0[1-9]|1[0-2])/(?:0[1-9]|[12]\d|3[01]))(?:/|$)')
    for a in soup.find_all('a',href=True):
        title=clean_text(a.get_text(' '))
        if len(title)<8 or len(title)>220: continue
        href=urljoin(source_url,a.get('href'))
        if not href.startswith(('http://','https://')): continue
        # Prefer a date carried by the link itself or the URL; otherwise inspect a small nearby container.
        nearby=' '.join(filter(None,[title,clean_text(a.parent.get_text(' ')) if a.parent else '']))[:800]
        m=textual.search(nearby) or numeric.search(nearby)
        d=parse_dt(m.group(0)) if m else None
        if not d:
            um=url_date.search(href)
            if um: d=parse_dt(um.group(1).replace('/','-'))
        if not d: continue
        # Strip a leading date from official-town link labels while keeping the actual headline.
        clean_title=textual.sub('',title,count=1).strip(' ·-|:')
        clean_title=numeric.sub('',clean_title,count=1).strip(' ·-|:')
        if len(clean_title)<8: continue
        out.append({'source':source_name,'title':clean_title,'date':d.astimezone(TZ).isoformat(),'url':href,'summary':'','localVerified':True,'discovered_by':'scheduled_link_date'})
    return out

def summarize_article(url, fallback=''):
    """Fetch a direct publisher article and derive a short factual 2–3 sentence blurb."""
    if not url or 'news.google.com' in url: return clean_text(fallback)[:420]
    try:
        html=request(url,timeout=12).text
        soup=BeautifulSoup(html,'html.parser') if BeautifulSoup else None
        if not soup: return clean_text(fallback)[:420]
        for sel in [('meta',{'name':'description'}),('meta',{'property':'og:description'})]:
            tag=soup.find(sel[0],attrs=sel[1])
            val=clean_text(tag.get('content')) if tag else ''
            if len(val)>=70: return val[:420]
        paras=[clean_text(p.get_text(' ')) for p in soup.find_all('p')]
        paras=[p for p in paras if len(p)>=70 and not re.search(r'cookie|subscribe|sign up|advertis',p,re.I)]
        if paras: return ' '.join(paras[:2])[:420]
    except Exception: pass
    return clean_text(fallback)[:420]

def parse_google_news_rss(xml_text, query):
    """Google News RSS is used as broad discovery for exact Norwood, Massachusetts variants."""
    import xml.etree.ElementTree as ET
    out=[]; root=ET.fromstring(xml_text)
    wrong=re.compile(r'Norwood,?\s*(Ohio|OH|New Jersey|NJ|Pennsylvania|PA|Colorado|CO|North Carolina|NC|New York|NY|Georgia|GA|Louisiana|LA|Missouri|MO)',re.I)
    for item in root.findall('.//item')[:100]:
        def txt(tag):
            n=item.find(tag); return clean_text(n.text if n is not None else '')
        title=txt('title'); link=txt('link'); pub=txt('pubDate'); desc=txt('description')
        src_node=item.find('source'); source=clean_text(src_node.text if src_node is not None else '') or 'Google News discovery'
        d=parse_dt(pub); combined=f'{title} {desc} {source}'
        if not title or not link or not d or wrong.search(combined): continue
        # The exact-location queries are the main relevance guard. Retain publisher attribution from RSS.
        out.append({'source':source,'title':title,'date':d.astimezone(TZ).isoformat(),'url':link,'summary':'','localVerified':True,'discovered_by':'scheduled_google_news','discovery_query':query})
    return out

def canonical_news_title(title):
    """Normalize publisher suffixes/casing/punctuation so syndicated copies collapse."""
    s=clean_text(title).lower()
    # Google News commonly appends the publisher after a final dash.
    s=re.sub(r'\s+[\-–—]\s+[^\-–—]{2,60}$','',s)
    s=s.replace('’',"'")
    s=re.sub(r"'s\b",'',s)
    s=re.sub(r'\b(?:the|a|an)\b',' ',s)
    s=re.sub(r'[^a-z0-9]+',' ',s)
    return re.sub(r'\s+',' ',s).strip()

def dedupe_news(items):
    """Collapse exact, syndicated, and near-identical headline variants."""
    chosen=[]
    def score(x):
        u=x.get('url',''); v=0
        if 'news.google.com' not in u: v+=4
        if x.get('discovered_by')=='seed_web_verified': v+=3
        if x.get('summary'): v+=1
        if x.get('source')=='The Norwood Record': v+=1
        return v
    def same_story(a,b):
        ua=(a.get('url') or '').split('?')[0].rstrip('/')
        ub=(b.get('url') or '').split('?')[0].rstrip('/')
        if ua and ub and ua==ub: return True
        ca,cb=canonical_news_title(a.get('title','')),canonical_news_title(b.get('title',''))
        if not ca or not cb: return False
        if ca==cb: return True
        ta,tb=set(ca.split()),set(cb.split())
        if len(ta)<4 or len(tb)<4: return False
        overlap=len(ta & tb)/max(1,len(ta | tb))
        da,db=parse_dt(a.get('date')),parse_dt(b.get('date'))
        close=bool(da and db and abs((da-db).total_seconds()) <= 3*24*3600)
        return close and overlap>=0.78
    for x in sorted(items,key=lambda z:z.get('date',''),reverse=True):
        hit=None
        for i,cur in enumerate(chosen):
            if same_story(x,cur):
                hit=i
                break
        if hit is None:
            chosen.append(x)
        elif score(x)>score(chosen[hit]):
            chosen[hit]=x
    return sorted(chosen,key=lambda z:z.get('date',''),reverse=True)

def news_is_obituary(x):
    text=' '.join(str(x.get(k) or '') for k in ('title','summary','source','url')).lower()
    source=str(x.get('source') or '').lower()
    obituary_sources=('legacy obituary','funeral home','funerals','cremation','dignity memorial','currentobituary')
    if any(s in source for s in obituary_sources):
        return True
    patterns=[
      r'\bobituar(?:y|ies)\b', r'\bin memoriam\b', r'\bpassed away\b',
      r'\bfuneral (?:home|service|services)\b', r'\bvisitation\b',
      r'\bcelebration of life\b', r'\bdeath notice\b'
    ]
    return any(re.search(p,text,re.I) for p in patterns)

def current_news(items):
    cutoff=now_local()-timedelta(days=120)
    latest=now_local()+timedelta(days=1)
    out=[]
    for x in items:
        d=parse_dt(x.get('date'))
        if not d:
            continue
        d=d.astimezone(TZ)
        if cutoff <= d <= latest and not news_is_obituary(x):
            out.append(x)
    return dedupe_news(out)[:120]

def refresh_news(offline=False):
    old=read_json('news.json',[])
    # Explicit source endpoints are kept separate from browser code; failures are harmless.
    feeds=[
      ('Norwood Public Schools','https://www.norwood.k12.ma.us/about/news/feed/rss'),
      ('Inside Norwood','https://insidenorwood.com/feed/'),
      ('Norwood Community Media','https://norwoodcommunitymedia.org/feed/'),
      ('Friends of Norwood Center','https://www.norwoodcenter.org/feed/'),
      ('Norwood Town News','https://www.norwoodtownnews.com/feed/')]
    pages=[
      ('The Norwood Record','https://www.norwoodrecord.com/news'),
      ('The Norwood Record — Latest','https://www.norwoodrecord.com/latest'),
      ('Town of Norwood','https://www.norwoodma.gov/'),
      ('Norwood Community Media','https://norwoodcommunitymedia.org/'),
      ('Norwood Public Schools','https://www.norwood.k12.ma.us/about/news'),
      ('Inside Norwood','https://insidenorwood.com/'),
      ('Norwood Town News','https://www.norwoodtownnews.com/')]
    google_queries=['"norwood, ma"','"norwood ma"','norwoodma','"norwood, massachusetts"']
    items=list(old); status=[]
    if not offline:
      for name,url in feeds:
        try:
            got=parse_rss(request(url).text,name); items.extend(got); status.append({'source':name,'url':url,'ok':True,'found':len(got),'method':'rss'})
        except Exception as ex: status.append({'source':name,'url':url,'ok':False,'found':0,'method':'rss','note':str(ex)[:180]})
      for q in google_queries:
        url=f"https://news.google.com/rss/search?q={quote(q+' when:90d')}&hl=en-US&gl=US&ceid=US:en"
        try:
            got=parse_google_news_rss(request(url).text,q); items.extend(got); status.append({'source':'Google News','url':url,'ok':True,'found':len(got),'method':'google_news_rss','query':q})
        except Exception as ex: status.append({'source':'Google News','url':url,'ok':False,'found':0,'method':'google_news_rss','query':q,'note':str(ex)[:180]})
      for name,url in pages:
        try:
            html=request(url).text; got=news_from_jsonld(html,name,url); got.extend(news_from_html_cards(html,name,url)); got.extend(news_from_visible_cards(html,name,url)); got.extend(news_from_link_dates(html,name,url)); items.extend(got); status.append({'source':name,'url':url,'ok':True,'found':len(dedupe_news(got)),'method':'jsonld+semantic_html+visible_dates'})
        except Exception as ex: status.append({'source':name,'url':url,'ok':False,'found':0,'method':'page_parsers','note':str(ex)[:180]})
    items=current_news(items)
    # Enrich thin cards from direct publisher pages. Discovery text is never shown as a summary.
    for x in items:
        s=clean_text(x.get('summary'))
        if not s or s.startswith('Discovered through Google News'):
            x['summary']=summarize_article(x.get('url'), '')
        elif len(s)<70 and 'news.google.com' not in x.get('url',''):
            x['summary']=summarize_article(x.get('url'), s)
    
    source_counts={}
    for x in items: source_counts[x.get('source','Unknown')]=source_counts.get(x.get('source','Unknown'),0)+1
    diversity_ok=len(source_counts)>=4 and (max(source_counts.values())/max(1,len(items)))<=0.85
    status.append({'source':'queue_health','ok':len(items)>=50,'found':len(items),'method':'minimum_queue_check','target':50,'note':None if len(items)>=50 else 'Fewer than 50 current items were discoverable; updater preserves real items only and never fabricates filler.'})
    status.append({'source':'source_diversity_health','ok':diversity_ok,'found':len(source_counts),'method':'source_diversity_check','target_sources':4,'source_counts':source_counts,'note':None if diversity_ok else 'News queue is too concentrated in one publisher; discovery should continue rather than treating volume alone as healthy.'})
    for x in items: x['localVerified']=bool(x.get('localVerified',True))
    write_json('news.json',items); write_js('news-data.js','NORWOOD_NEWS',items)
    return items,status


IMPORTANT_MEETING_RE=re.compile(r'\b(Board of Selectmen|Finance Commission|School Committee|Town Meeting|Planning Board|Zoning Board(?: of Appeals)?|Conservation Commission|Board of Health|Community Preservation Committee|Budget Balancing Committee|Middle School Building Committee)\b',re.I)
MONTH_DATE_RE=re.compile(r'\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(20\d{2}))?\b',re.I)
SLASH_DATE_RE=re.compile(r'\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b')
TIME_RE=re.compile(r'\b(\d{1,2}):(\d{2})\s*(AM|PM)\b',re.I)

def _date_from_text(text):
    m=SLASH_DATE_RE.search(text)
    if m:
        try:return date(int(m.group(3)),int(m.group(1)),int(m.group(2)))
        except Exception:return None
    m=MONTH_DATE_RE.search(text)
    if m:
        year=int(m.group(3) or now_local().year)
        try:return datetime.strptime(f"{m.group(1)} {m.group(2)} {year}",'%B %d %Y').date()
        except Exception:
            try:return datetime.strptime(f"{m.group(1)} {m.group(2)} {year}",'%b %d %Y').date()
            except Exception:return None
    return None

def _time_from_text(text):
    m=TIME_RE.search(text)
    if not m:return None
    h=int(m.group(1)); minute=int(m.group(2)); ap=m.group(3).upper()
    if ap=='PM' and h!=12:h+=12
    if ap=='AM' and h==12:h=0
    return f"{h:02d}:{minute:02d}"

def _town_calendar_data():
    """Fetch the Revize calendar's underlying public data endpoint directly."""
    url=('https://www.norwoodma.gov/_assets_/plugins/revizeCalendar/calendar_data_handler.php'
         '?webspace=norwoodma25&relative_revize_url=//cms5.revize.com&protocol=https:')
    try:
        r=request(url)
        data=r.json()
    except Exception:
        return []

    rows=[]
    def walk(v):
        if isinstance(v,list):
            for x in v: walk(x)
        elif isinstance(v,dict):
            # Revize/FullCalendar payloads expose event-ish dictionaries; keep any
            # object that has a recognizable title plus a start/date value.
            title=v.get('title') or v.get('summary') or v.get('name')
            start=v.get('start') or v.get('start_date') or v.get('date') or v.get('event_start')
            if title and start: rows.append(v)
            for x in v.values():
                if isinstance(x,(list,dict)): walk(x)
    walk(data)
    return rows

def civic_meetings_from_town_data(days=185):
    """Convert Revize's structured Master-calendar feed into civic meeting notices."""
    today=now_local().date(); out=[]; seen=set()
    endpoint=('https://www.norwoodma.gov/_assets_/plugins/revizeCalendar/calendar_data_handler.php'
              '?webspace=norwoodma25&relative_revize_url=//cms5.revize.com&protocol=https:')
    for row in _town_calendar_data():
        raw_title=clean_text(row.get('title') or row.get('summary') or row.get('name'))
        m=IMPORTANT_MEETING_RE.search(raw_title or '')
        if not m: continue
        raw_start=row.get('start') or row.get('start_date') or row.get('date') or row.get('event_start')
        raw_end=row.get('end') or row.get('end_date') or row.get('event_end')
        try:
            dt=dtparser.parse(str(raw_start)) if dtparser else datetime.fromisoformat(str(raw_start).replace('Z','+00:00'))
            if dt.tzinfo: dt=dt.astimezone(TZ)
        except Exception:
            continue
        d=dt.date()
        if d < today-timedelta(days=1) or d > today+timedelta(days=days): continue
        st=dt.strftime('%H:%M')
        et=None
        if raw_end:
            try:
                ed=dtparser.parse(str(raw_end)) if dtparser else datetime.fromisoformat(str(raw_end).replace('Z','+00:00'))
                if ed.tzinfo: ed=ed.astimezone(TZ)
                et=ed.strftime('%H:%M')
            except Exception: pass
        title=m.group(1)
        key=(title.lower(),d.isoformat(),st)
        if key in seen: continue
        seen.add(key)
        href=row.get('url') or row.get('link') or endpoint
        out.append({'kind':'meeting','title':title,'date':d.isoformat(),'start_time':st,'end_time':et,
                    'url':href,'source':'Town of Norwood Master Calendar'})
    return out

def _render_town_calendar_month(d):
    """Render a Revize calendar month when its event data is populated client-side."""
    url=f'https://www.norwoodma.gov/calendar.php?view=month&month={d.month:02d}&day=01&year={d.year}'
    chrome=next((p for p in ('google-chrome','google-chrome-stable','chromium','chromium-browser') if shutil.which(p)),None)
    if not chrome:return url,''
    try:
        cp=subprocess.run([chrome,'--headless','--disable-gpu','--no-sandbox',
                           '--virtual-time-budget=8000','--dump-dom',url],
                          capture_output=True,text=True,timeout=30)
        return url,cp.stdout if cp.returncode==0 else ''
    except Exception:
        return url,''

def civic_meetings_from_town_calendar(months=6):
    """Read the Town's Revize Master calendar, including its JS-rendered event layer."""
    direct=civic_meetings_from_town_data(days=185)
    if direct:return direct
    if not BeautifulSoup:return []
    today=now_local().date(); out=[]; seen=set()
    for offset in range(months):
        y=today.year+(today.month-1+offset)//12
        m=(today.month-1+offset)%12+1
        first=date(y,m,1)
        url=f'https://www.norwoodma.gov/calendar.php?view=month&month={m:02d}&day=01&year={y}'
        try: html=request(url).text
        except Exception: html=''
        # The Revize page ships an empty #calendar and fills it with JS. Use Chrome on
        # GitHub's runner when the raw response contains no rendered FullCalendar events.
        if 'fc-event' not in html:
            _,rendered=_render_town_calendar_month(first)
            if rendered:html=rendered
        if not html:continue
        soup=BeautifulSoup(html,'html.parser')
        event_nodes=soup.select('.fc-event, [class*="fc-event"]')
        for node in event_nodes:
            text=clean_text(node.get_text(' '))
            mm=IMPORTANT_MEETING_RE.search(text or '')
            if not mm:continue
            day=node.find_parent(attrs={'data-date':True})
            ds=day.get('data-date') if day else None
            try:d=date.fromisoformat(ds) if ds else _date_from_text(text)
            except Exception:d=None
            if not d or d < today-timedelta(days=1) or d > today+timedelta(days=185):continue
            tmnode=node.select_one('.fc-time')
            tm=_time_from_text(clean_text(tmnode.get_text(' '))) if tmnode else _time_from_text(text)
            title=mm.group(1)
            key=(title.lower(),d.isoformat(),tm)
            if key in seen:continue
            seen.add(key)
            out.append({'kind':'meeting','title':title,'date':d.isoformat(),'start_time':tm,'end_time':None,
                        'url':url,'source':'Town of Norwood Master Calendar'})
    return out


def civic_meetings_from_ncm_live_schedule(days=60):
    """Cross-check upcoming government broadcasts directly against NCM/Cablecast."""
    out=[]
    today=now_local().date()
    for offset in range(days+1):
        d=today+timedelta(days=offset)
        try: rows=ncm_cablecast_schedule(3,d)
        except Exception: continue
        for row in rows:
            m=IMPORTANT_MEETING_RE.search(row.get('title',''))
            if not m: continue
            out.append({'kind':'meeting','title':m.group(1),'date':d.isoformat(),
                        'start_time':row.get('time'),'end_time':None,
                        'url':'https://norwoodcommunitymedia.org/programs/site/government-3/broadcast/',
                        'source':'Norwood Community Media / Cablecast Government schedule'})
    return out


def election_notices_from_news(news):
    out=[];today=now_local().date();seen=set()
    for x in news:
        if x.get('source')!='Town of Norwood':continue
        text=clean_text((x.get('title') or '')+' '+(x.get('summary') or ''))
        if 'election' not in text.lower() or re.search(r'\b(results?|unofficial|official results)\b',text,re.I):continue
        d=_date_from_text(text)
        if not d or d < today or d > today+timedelta(days=370):continue
        key=d.isoformat()
        if key in seen:continue
        seen.add(key)
        out.append({'kind':'election','title':clean_text(x.get('title')) or f'Election Day — {d.strftime("%B %-d")}', 'election_date':d.isoformat(),'show_from':(d-timedelta(days=5)).isoformat(),'url':x.get('url') or 'https://www.norwoodma.gov/','source':'Town of Norwood'})
    return out

def refresh_civic_notices(news,offline=False):
    seed=read_json('civic-notices-seed.json',[])
    notices=list(seed)+election_notices_from_news(news)
    if not offline:
        try:notices.extend(civic_meetings_from_town_calendar())
        except Exception:pass
        try:notices.extend(civic_meetings_from_ncm_live_schedule())
        except Exception:pass
    chosen={}
    for n in notices:
        k=(n.get('kind'),n.get('date') or n.get('election_date'),clean_text(n.get('title')).lower())
        chosen[k]=n
    notices=list(chosen.values())
    notices.sort(key=lambda n:(n.get('date') or n.get('election_date') or '9999',n.get('start_time') or '99:99',n.get('title') or ''))
    write_json('civic-notices.json',notices)
    return notices



def civic_meetings_to_events(notices):
    """Promote every verified civic meeting notice into the public events/calendar feed."""
    out=[]
    for n in notices or []:
        if n.get('kind')!='meeting' or not n.get('date'): continue
        ds=n['date']; title=clean_text(n.get('title')) or 'Town Meeting'
        out.append({
            'id':event_id(title,ds,'Norwood civic meeting'),
            'title':title,
            'start':{'date':ds,'time':n.get('start_time')},
            'end':{'date':ds,'time':n.get('end_time')},
            'venue':'Town of Norwood',
            'address':None,
            'category':'government',
            'source_id':'norwood-civic-meetings',
            'source_url':n.get('url') or 'https://www.norwoodma.gov/',
            'registration_url':None,
            'cost':'Free',
            'public_access':'public',
            'series':'Norwood Boards & Committees',
            'publish_candidate':True,
            'verification_status':'verified_civic_source',
            'notes':'Public board/committee meeting. At meeting time, return to Norwood.ma for a Watch Live link when Norwood Community Media confirms a live broadcast.',
            'discovered_by':'civic_meeting_monitor'
        })
    return out


def coverage(registry):
    program={'community_submission_json','tribe_events','ical','html_calendar','html_list','html_hub','html_page','embedded_calendar','club_calendar','secondary_discovery'}
    active=[x for x in registry if x.get('active_monitor') and 'events' in x.get('produces',[])]
    attempted=[x for x in active if x.get('ingestion',{}).get('method') in program]
    discovery=[x for x in active if x.get('ingestion',{}).get('method')=='discovery_search']
    other=[x for x in active if x not in attempted and x not in discovery]
    return {'generated_at':now_local().isoformat(),'active_event_sources':len(active),'programmatically_checked_each_run':len(attempted),'search_discovery_sources_requiring_search_provider':len(discovery),'other_manual_or_special_adapter_sources':len(other),'note':'Programmatically checked means the updater attempts the source. Some HTML sources may expose no machine-readable events until a source-specific adapter is added.'}


def ics_escape(value):
    return str(value or '').replace('\\','\\\\').replace('\n','\\n').replace(',','\\,').replace(';','\\;')

def ics_stamp():
    return datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')

def event_matches_selector(e, selector):
    selector=selector or {}
    if selector.get('all'): return True
    cat=str(e.get('category') or '').lower()
    text=' '.join(str(e.get(k) or '') for k in ('title','notes','venue','category')).lower()
    if cat in [str(x).lower() for x in selector.get('categories',[])]: return True
    if any(str(x).lower() in cat for x in selector.get('category_contains',[])): return True
    if any(str(x).lower() in text for x in selector.get('keywords',[])): return True
    return False

def event_ics_lines(e):
    start=e.get('start') or {}; end=e.get('end') or {}; sd=start.get('date')
    if not sd: return []
    uid=f"{e.get('id') or event_id(e.get('title','event'),sd,e.get('venue',''))}@norwood.ma"
    lines=['BEGIN:VEVENT',f'UID:{ics_escape(uid)}',f'DTSTAMP:{ics_stamp()}']
    if not start.get('time'):
        lines.append(f"DTSTART;VALUE=DATE:{sd.replace('-','')}")
        ed=end.get('date') or sd
        try: next_day=date.fromisoformat(ed)+timedelta(days=1)
        except Exception: next_day=date.fromisoformat(sd)+timedelta(days=1)
        lines.append(f"DTEND;VALUE=DATE:{next_day.strftime('%Y%m%d')}")
    else:
        def local_dt(d,t): return d.replace('-','')+'T'+t.replace(':','')+'00'
        lines.append(f"DTSTART;TZID=America/New_York:{local_dt(sd,start['time'])}")
        if end.get('time'): lines.append(f"DTEND;TZID=America/New_York:{local_dt(end.get('date') or sd,end['time'])}")
    lines.append(f"SUMMARY:{ics_escape(e.get('title'))}")
    loc=' — '.join(x for x in [e.get('venue'),e.get('address')] if x)
    if loc: lines.append(f"LOCATION:{ics_escape(loc)}")
    desc='\n'.join(x for x in [e.get('notes'), f"Cost: {e.get('cost')}" if e.get('cost') else None, f"Source: {e.get('source_url')}" if e.get('source_url') else None] if x)
    if desc: lines.append(f"DESCRIPTION:{ics_escape(desc)}")
    if e.get('source_url'): lines.append(f"URL:{ics_escape(e.get('source_url'))}")
    lines.append('END:VEVENT'); return lines

def write_calendar_feeds(events):
    defs=read_json('calendar-sources.json',[])
    feeds_dir=ROOT/'feeds'; feeds_dir.mkdir(exist_ok=True)
    manifest=[]
    for src in defs:
        if src.get('kind')!='generated_live' or not src.get('feed_url'): continue
        chosen=[e for e in events if event_matches_selector(e,src.get('selector'))]
        chosen.sort(key=lambda e:(e.get('start',{}).get('date') or '9999',e.get('start',{}).get('time') or '99:99',e.get('title','')))
        lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Norwood.ma//Community Calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',f"X-WR-CALNAME:{ics_escape(src.get('name'))}",f"X-WR-CALDESC:{ics_escape(src.get('description'))}"]
        for e in chosen: lines.extend(event_ics_lines(e))
        lines.append('END:VCALENDAR')
        rel=src['feed_url']; target=ROOT/rel
        target.parent.mkdir(parents=True,exist_ok=True); target.write_text('\r\n'.join(lines)+'\r\n')
        manifest.append({'id':src['id'],'name':src['name'],'path':rel,'events':len(chosen),'generated_at':now_local().isoformat()})
    write_json('calendar-feed-status.json',manifest)
    return manifest


def acknowledge_published_submissions():
    """Tell the private moderation sheet which community submissions reached events.json.

    The shared secret is supplied only by GitHub Actions. The public Apps Script
    GET feed remains read-only and privacy-safe. Missing configuration is treated
    as a hard failure so the Actions log makes a broken feedback loop visible.
    """
    import os
    if not requests:
        raise RuntimeError('network dependencies unavailable')
    secret=os.environ.get('NORWOOD_EVENT_ACK_SECRET','').strip()
    if not secret:
        raise RuntimeError('NORWOOD_EVENT_ACK_SECRET GitHub Actions secret is not configured')
    registry=read_json('source-registry.json',[])
    src=next((x for x in registry if x.get('ingestion',{}).get('method')=='community_submission_json'),None)
    if not src or not src.get('url'):
        raise RuntimeError('community submission source endpoint is not configured')
    records=[]
    for e in read_json('events.json',[]):
        if e.get('source_id')==src.get('id') and str(e.get('id','')).startswith('submission-'):
            records.append({'id':e['id'],'title':e.get('title'),'date':(e.get('start') or {}).get('date'),'venue':e.get('venue')})
    payload={
      'action':'ackPublished',
      'secret':secret,
      'events':records,
      'verifiedAt':now_local().isoformat(),
      'publisher':'norwood.ma-github-actions'
    }
    r=requests.post(src['url'],json=payload,headers={'User-Agent':UA,'Accept':'application/json'},timeout=18)
    r.raise_for_status()
    try: result=r.json()
    except Exception: raise RuntimeError('publication acknowledgment endpoint did not return JSON')
    if not result.get('ok'):
        raise RuntimeError('publication acknowledgment rejected: '+clean_text(result.get('error') or result))
    print(json.dumps({'acknowledged':result.get('updated',0),'events':[x['id'] for x in records]},indent=2))
    return result

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--offline',action='store_true'); ap.add_argument('--ack-published',action='store_true'); args=ap.parse_args()
    if args.ack_published:
        acknowledge_published_submissions(); return
    events,ev_status=refresh_events(args.offline); news,nw_status=refresh_news(args.offline); civic_notices=refresh_civic_notices(news,args.offline); events=current_events(dedupe_events(events+civic_meetings_to_events(civic_notices))); write_json('events.json',events); write_js('events-data.js','NORWOOD_EVENTS',events); calendar_feeds=write_calendar_feeds(events)
    registry=read_json('source-registry.json',[])
    cov=coverage(registry); write_json('automation-coverage.json',cov)
    report={'generated_at':now_local().isoformat(),'offline':args.offline,'events_published':len(events),'news_published':len(news),'civic_notices':len(civic_notices),'calendar_feeds':calendar_feeds,'event_sources':ev_status,'news_sources':nw_status}
    write_json('refresh-status.json',report)
    print(json.dumps({'events':len(events),'news':len(news),'civic_notices':len(civic_notices),'coverage':cov},indent=2))
if __name__=='__main__': main()
,'',title,flags=re.I).strip(' -–—')
        if not title or len(title)>180: continue
        tm=_time_from_text(m.group(0))
        out.append({'date':day.isoformat(),'time':tm,'title':title,'url':url})
    # Deduplicate nested markup.
    chosen={}
    for x in out: chosen[(x['time'],canonical_title(x['title']))]=x
    return sorted(chosen.values(),key=lambda x:x['time'] or '99:99')

def ncm_upcoming_live_broadcasts(days=14):
    """Return future NCM items explicitly marked LIVE; site 3=government, site 2=schools."""
    today=now_local().date(); out=[]
    for offset in range(days+1):
        d=today+timedelta(days=offset)
        for site,kind in ((3,'government'),(2,'school')):
            try:
                for x in ncm_cablecast_schedule(site,d):
                    if re.search(r'\bLIVE\b',x['title'],re.I):
                        x['kind']=kind; out.append(x)
            except Exception:
                pass
    return out


def events_from_ncm_school_broadcasts(source):
    """Publish dated Schools & Sports schedule entries as events with a direct live-view link."""
    html=request(source['url']).text
    if not BeautifulSoup:return []
    soup=BeautifulSoup(html,'html.parser'); out=[]
    live_url='https://norwoodcommunitymedia.org/programs/site/school-2/broadcast/'
    # Cablecast schedule markup varies; accept schedule rows/cards only when a real date/time is present.
    for node in soup.find_all(['article','li','tr','div']):
        text=clean_text(node.get_text(' '))
        if not text or len(text)>600: continue
        low=text.lower()
        if not any(k in low for k in ('nhs','norwood high','mustang','school','sports')): continue
        d=_date_from_text(text)
        tm=_time_from_text(text)
        if not d or d < now_local().date()-timedelta(days=1) or d > now_local().date()+timedelta(days=120): continue
        h=node.find(['h1','h2','h3','h4','strong'])
        title=clean_text(h.get_text(' ') if h else text)
        title=re.sub(r'\s+',' ',title)[:180]
        if not title: continue
        ds=d.isoformat()
        out.append({
          'id':event_id(title,ds,'Norwood Community Media'),
          'title':title,'start':{'date':ds,'time':tm},'end':{'date':ds,'time':None},
          'venue':'Norwood Community Media — Schools & Sports','address':None,'category':'school',
          'source_id':source['id'],'source_url':live_url,'registration_url':live_url,'cost':'Free',
          'public_access':'public','series':'NCM Schools & Sports Live Broadcasts','publish_candidate':True,
          'verification_status':'auto_primary_source','notes':'Scheduled live school broadcast. Watch online via Norwood Community Media.',
          'discovered_by':'scheduled_ncm_school_broadcast'
        })
    return dedupe_events(out)


def refresh_events(offline=False):
    seeds=read_json('events-seed.json',[])
    registry=read_json('source-registry.json',[])
    events=list(seeds); status=[]
    if not offline:
        for src in [x for x in registry if x.get('active_monitor') and 'events' in x.get('produces',[])]:
            method=src.get('ingestion',{}).get('method'); got=[]; note=''
            try:
                if method=='ncm_school_broadcasts': got=events_from_ncm_school_broadcasts(src)
                elif method=='community_submission_json': got=events_from_community_submission_feed(src)
                elif method=='recurring_service_schedule' and src.get('id')=='norwood-food-pantry-hours': got=events_from_norwood_food_pantry(src)
                elif method=='tribe_events': got=events_from_tribe(src)
                elif method=='ical':
                    feed=src.get('ingestion',{}).get('feed_url')
                    if not feed and src.get('id')=='nps-district-ical': feed='https://www.norwood.k12.ma.us/about/calendar/feed/ical.ics'
                    if feed: got=events_from_ical(feed,src)
                    else: note='no direct feed_url configured'
                elif method in {'html_calendar','html_list','html_hub','html_page','embedded_calendar','club_calendar','secondary_discovery'}:
                    if '/events/list' in src.get('url',''):
                        try: got.extend(events_from_tribe(src))
                        except Exception: pass
                    html=request(src['url']).text
                    extracted,ics=extract_jsonld_events(html,src); got.extend(extracted)
                    for u in ics[:2]:
                        try: got.extend(events_from_ical(u,src))
                        except Exception: pass
                    if not got: note='page checked; no machine-readable Event/ICS found'
                else: note=f'method {method} requires discovery/manual adapter'
                events.extend(got)
                status.append({'source_id':src['id'],'ok':True,'method':method,'found':len(got),'note':note})
            except Exception as ex:
                status.append({'source_id':src['id'],'ok':False,'method':method,'found':0,'note':str(ex)[:180]})
    events=current_events(dedupe_events(events))
    write_json('events.json',events); write_js('events-data.js','NORWOOD_EVENTS',events)
    return events,status

def parse_rss(xml_text, source_name):
    import xml.etree.ElementTree as ET
    out=[]
    root=ET.fromstring(xml_text)
    for item in root.findall('.//item')[:40]:
        def txt(tag):
            n=item.find(tag); return clean_text(n.text if n is not None else '')
        title=txt('title'); link=txt('link'); pub=txt('pubDate'); desc=txt('description')
        d=parse_dt(pub)
        if title and link and d:
            out.append({'source':source_name,'title':title,'date':d.astimezone(TZ).isoformat(),'url':link,'summary':desc[:220],'localVerified':True,'discovered_by':'scheduled_rss'})
    return out

def news_from_jsonld(html, source_name, source_url):
    if not BeautifulSoup:return []
    soup=BeautifulSoup(html,'html.parser'); out=[]
    for tag in soup.find_all('script',attrs={'type':'application/ld+json'}):
        try: payload=json.loads(tag.string or tag.get_text() or '{}')
        except Exception: continue
        for o in walk_jsonld(payload):
            typ=o.get('@type'); types=typ if isinstance(typ,list) else [typ]
            if not any(x in {'NewsArticle','Article','BlogPosting'} for x in types): continue
            title=clean_text(o.get('headline') or o.get('name')); d=parse_dt(o.get('datePublished') or o.get('dateModified')); url=o.get('url') or source_url; desc=clean_text(o.get('description'))
            if title and d and url: out.append({'source':source_name,'title':title,'date':d.astimezone(TZ).isoformat(),'url':url,'summary':desc[:220],'localVerified':True,'discovered_by':'scheduled_jsonld'})
    return out

def news_from_html_cards(html, source_name, source_url):
    """Conservative article-list fallback: requires a dated semantic <time> element."""
    if not BeautifulSoup:return []
    soup=BeautifulSoup(html,'html.parser'); out=[]
    for card in soup.find_all(['article','li']):
        t=card.find('time')
        if not t: continue
        d=parse_dt(t.get('datetime') or clean_text(t.get_text(' ')))
        if not d: continue
        h=card.find(['h1','h2','h3','h4']); a=(h.find('a',href=True) if h else None) or card.find('a',href=True)
        title=clean_text(h.get_text(' ') if h else (a.get_text(' ') if a else ''))
        if not title or len(title)>220 or not a: continue
        url=urljoin(source_url,a.get('href')); desc=''
        p=card.find('p')
        if p: desc=clean_text(p.get_text(' '))[:220]
        out.append({'source':source_name,'title':title,'date':d.astimezone(TZ).isoformat(),'url':url,'summary':desc,'localVerified':True,'discovered_by':'scheduled_semantic_html'})
    return out

def news_from_visible_cards(html, source_name, source_url):
    """Fallback for local pages whose dates are visible text rather than <time>."""
    if not BeautifulSoup:return []
    soup=BeautifulSoup(html,'html.parser'); out=[]
    date_re=re.compile(r'\b(January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sep|Sept|October|Oct|November|Nov|December|Dec)\s+\d{1,2},\s+20\d{2}\b',re.I)
    for h in soup.find_all(['h2','h3','h4','h5']):
        title=clean_text(h.get_text(' '))
        if not title or len(title)<8 or len(title)>220: continue
        a=h.find('a',href=True) or (h.parent.find('a',href=True) if h.parent else None)
        if not a: continue
        card=h
        text=''
        for _ in range(5):
            if not getattr(card,'parent',None): break
            card=card.parent; text=clean_text(card.get_text(' '))
            if date_re.search(text): break
        m=date_re.search(text)
        if not m: continue
        d=parse_dt(m.group(0))
        if not d: continue
        url=urljoin(source_url,a.get('href'))
        summary=''
        ptag=card.find('p') if hasattr(card,'find') else None
        if ptag: summary=clean_text(ptag.get_text(' '))[:220]
        out.append({'source':source_name,'title':title,'date':d.astimezone(TZ).isoformat(),'url':url,'summary':summary,'localVerified':True,'discovered_by':'scheduled_visible_date'})
    return out

def news_from_link_dates(html, source_name, source_url):
    """Generic fallback for pages that put dates in link text, nearby text, or YYYY/MM/DD URLs."""
    if not BeautifulSoup:return []
    soup=BeautifulSoup(html,'html.parser'); out=[]
    textual=re.compile(r'\b(?:January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sep|Sept|October|Oct|November|Nov|December|Dec)\s+\d{1,2},\s+20\d{2}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM))?\b',re.I)
    numeric=re.compile(r'\b(?:0?[1-9]|1[0-2])[./-](?:0?[1-9]|[12]\d|3[01])[./-](?:20\d{2}|\d{2})\b')
    url_date=re.compile(r'/((?:20\d{2})/(?:0[1-9]|1[0-2])/(?:0[1-9]|[12]\d|3[01]))(?:/|$)')
    for a in soup.find_all('a',href=True):
        title=clean_text(a.get_text(' '))
        if len(title)<8 or len(title)>220: continue
        href=urljoin(source_url,a.get('href'))
        if not href.startswith(('http://','https://')): continue
        # Prefer a date carried by the link itself or the URL; otherwise inspect a small nearby container.
        nearby=' '.join(filter(None,[title,clean_text(a.parent.get_text(' ')) if a.parent else '']))[:800]
        m=textual.search(nearby) or numeric.search(nearby)
        d=parse_dt(m.group(0)) if m else None
        if not d:
            um=url_date.search(href)
            if um: d=parse_dt(um.group(1).replace('/','-'))
        if not d: continue
        # Strip a leading date from official-town link labels while keeping the actual headline.
        clean_title=textual.sub('',title,count=1).strip(' ·-|:')
        clean_title=numeric.sub('',clean_title,count=1).strip(' ·-|:')
        if len(clean_title)<8: continue
        out.append({'source':source_name,'title':clean_title,'date':d.astimezone(TZ).isoformat(),'url':href,'summary':'','localVerified':True,'discovered_by':'scheduled_link_date'})
    return out

def summarize_article(url, fallback=''):
    """Fetch a direct publisher article and derive a short factual 2–3 sentence blurb."""
    if not url or 'news.google.com' in url: return clean_text(fallback)[:420]
    try:
        html=request(url,timeout=12).text
        soup=BeautifulSoup(html,'html.parser') if BeautifulSoup else None
        if not soup: return clean_text(fallback)[:420]
        for sel in [('meta',{'name':'description'}),('meta',{'property':'og:description'})]:
            tag=soup.find(sel[0],attrs=sel[1])
            val=clean_text(tag.get('content')) if tag else ''
            if len(val)>=70: return val[:420]
        paras=[clean_text(p.get_text(' ')) for p in soup.find_all('p')]
        paras=[p for p in paras if len(p)>=70 and not re.search(r'cookie|subscribe|sign up|advertis',p,re.I)]
        if paras: return ' '.join(paras[:2])[:420]
    except Exception: pass
    return clean_text(fallback)[:420]

def parse_google_news_rss(xml_text, query):
    """Google News RSS is used as broad discovery for exact Norwood, Massachusetts variants."""
    import xml.etree.ElementTree as ET
    out=[]; root=ET.fromstring(xml_text)
    wrong=re.compile(r'Norwood,?\s*(Ohio|OH|New Jersey|NJ|Pennsylvania|PA|Colorado|CO|North Carolina|NC|New York|NY|Georgia|GA|Louisiana|LA|Missouri|MO)',re.I)
    for item in root.findall('.//item')[:100]:
        def txt(tag):
            n=item.find(tag); return clean_text(n.text if n is not None else '')
        title=txt('title'); link=txt('link'); pub=txt('pubDate'); desc=txt('description')
        src_node=item.find('source'); source=clean_text(src_node.text if src_node is not None else '') or 'Google News discovery'
        d=parse_dt(pub); combined=f'{title} {desc} {source}'
        if not title or not link or not d or wrong.search(combined): continue
        # The exact-location queries are the main relevance guard. Retain publisher attribution from RSS.
        out.append({'source':source,'title':title,'date':d.astimezone(TZ).isoformat(),'url':link,'summary':'','localVerified':True,'discovered_by':'scheduled_google_news','discovery_query':query})
    return out

def canonical_news_title(title):
    """Normalize publisher suffixes/casing/punctuation so syndicated copies collapse."""
    s=clean_text(title).lower()
    # Google News commonly appends the publisher after a final dash.
    s=re.sub(r'\s+[\-–—]\s+[^\-–—]{2,60}$','',s)
    s=s.replace('’',"'")
    s=re.sub(r"'s\b",'',s)
    s=re.sub(r'\b(?:the|a|an)\b',' ',s)
    s=re.sub(r'[^a-z0-9]+',' ',s)
    return re.sub(r'\s+',' ',s).strip()

def dedupe_news(items):
    """Collapse exact, syndicated, and near-identical headline variants."""
    chosen=[]
    def score(x):
        u=x.get('url',''); v=0
        if 'news.google.com' not in u: v+=4
        if x.get('discovered_by')=='seed_web_verified': v+=3
        if x.get('summary'): v+=1
        if x.get('source')=='The Norwood Record': v+=1
        return v
    def same_story(a,b):
        ua=(a.get('url') or '').split('?')[0].rstrip('/')
        ub=(b.get('url') or '').split('?')[0].rstrip('/')
        if ua and ub and ua==ub: return True
        ca,cb=canonical_news_title(a.get('title','')),canonical_news_title(b.get('title',''))
        if not ca or not cb: return False
        if ca==cb: return True
        ta,tb=set(ca.split()),set(cb.split())
        if len(ta)<4 or len(tb)<4: return False
        overlap=len(ta & tb)/max(1,len(ta | tb))
        da,db=parse_dt(a.get('date')),parse_dt(b.get('date'))
        close=bool(da and db and abs((da-db).total_seconds()) <= 3*24*3600)
        return close and overlap>=0.78
    for x in sorted(items,key=lambda z:z.get('date',''),reverse=True):
        hit=None
        for i,cur in enumerate(chosen):
            if same_story(x,cur):
                hit=i
                break
        if hit is None:
            chosen.append(x)
        elif score(x)>score(chosen[hit]):
            chosen[hit]=x
    return sorted(chosen,key=lambda z:z.get('date',''),reverse=True)

def news_is_obituary(x):
    text=' '.join(str(x.get(k) or '') for k in ('title','summary','source','url')).lower()
    source=str(x.get('source') or '').lower()
    obituary_sources=('legacy obituary','funeral home','funerals','cremation','dignity memorial','currentobituary')
    if any(s in source for s in obituary_sources):
        return True
    patterns=[
      r'\bobituar(?:y|ies)\b', r'\bin memoriam\b', r'\bpassed away\b',
      r'\bfuneral (?:home|service|services)\b', r'\bvisitation\b',
      r'\bcelebration of life\b', r'\bdeath notice\b'
    ]
    return any(re.search(p,text,re.I) for p in patterns)

def current_news(items):
    cutoff=now_local()-timedelta(days=120)
    latest=now_local()+timedelta(days=1)
    out=[]
    for x in items:
        d=parse_dt(x.get('date'))
        if not d:
            continue
        d=d.astimezone(TZ)
        if cutoff <= d <= latest and not news_is_obituary(x):
            out.append(x)
    return dedupe_news(out)[:120]

def refresh_news(offline=False):
    old=read_json('news.json',[])
    # Explicit source endpoints are kept separate from browser code; failures are harmless.
    feeds=[
      ('Norwood Public Schools','https://www.norwood.k12.ma.us/about/news/feed/rss'),
      ('Inside Norwood','https://insidenorwood.com/feed/'),
      ('Norwood Community Media','https://norwoodcommunitymedia.org/feed/'),
      ('Friends of Norwood Center','https://www.norwoodcenter.org/feed/'),
      ('Norwood Town News','https://www.norwoodtownnews.com/feed/')]
    pages=[
      ('The Norwood Record','https://www.norwoodrecord.com/news'),
      ('The Norwood Record — Latest','https://www.norwoodrecord.com/latest'),
      ('Town of Norwood','https://www.norwoodma.gov/'),
      ('Norwood Community Media','https://norwoodcommunitymedia.org/'),
      ('Norwood Public Schools','https://www.norwood.k12.ma.us/about/news'),
      ('Inside Norwood','https://insidenorwood.com/'),
      ('Norwood Town News','https://www.norwoodtownnews.com/')]
    google_queries=['"norwood, ma"','"norwood ma"','norwoodma','"norwood, massachusetts"']
    items=list(old); status=[]
    if not offline:
      for name,url in feeds:
        try:
            got=parse_rss(request(url).text,name); items.extend(got); status.append({'source':name,'url':url,'ok':True,'found':len(got),'method':'rss'})
        except Exception as ex: status.append({'source':name,'url':url,'ok':False,'found':0,'method':'rss','note':str(ex)[:180]})
      for q in google_queries:
        url=f"https://news.google.com/rss/search?q={quote(q+' when:90d')}&hl=en-US&gl=US&ceid=US:en"
        try:
            got=parse_google_news_rss(request(url).text,q); items.extend(got); status.append({'source':'Google News','url':url,'ok':True,'found':len(got),'method':'google_news_rss','query':q})
        except Exception as ex: status.append({'source':'Google News','url':url,'ok':False,'found':0,'method':'google_news_rss','query':q,'note':str(ex)[:180]})
      for name,url in pages:
        try:
            html=request(url).text; got=news_from_jsonld(html,name,url); got.extend(news_from_html_cards(html,name,url)); got.extend(news_from_visible_cards(html,name,url)); got.extend(news_from_link_dates(html,name,url)); items.extend(got); status.append({'source':name,'url':url,'ok':True,'found':len(dedupe_news(got)),'method':'jsonld+semantic_html+visible_dates'})
        except Exception as ex: status.append({'source':name,'url':url,'ok':False,'found':0,'method':'page_parsers','note':str(ex)[:180]})
    items=current_news(items)
    # Enrich thin cards from direct publisher pages. Discovery text is never shown as a summary.
    for x in items:
        s=clean_text(x.get('summary'))
        if not s or s.startswith('Discovered through Google News'):
            x['summary']=summarize_article(x.get('url'), '')
        elif len(s)<70 and 'news.google.com' not in x.get('url',''):
            x['summary']=summarize_article(x.get('url'), s)
    
    source_counts={}
    for x in items: source_counts[x.get('source','Unknown')]=source_counts.get(x.get('source','Unknown'),0)+1
    diversity_ok=len(source_counts)>=4 and (max(source_counts.values())/max(1,len(items)))<=0.85
    status.append({'source':'queue_health','ok':len(items)>=50,'found':len(items),'method':'minimum_queue_check','target':50,'note':None if len(items)>=50 else 'Fewer than 50 current items were discoverable; updater preserves real items only and never fabricates filler.'})
    status.append({'source':'source_diversity_health','ok':diversity_ok,'found':len(source_counts),'method':'source_diversity_check','target_sources':4,'source_counts':source_counts,'note':None if diversity_ok else 'News queue is too concentrated in one publisher; discovery should continue rather than treating volume alone as healthy.'})
    for x in items: x['localVerified']=bool(x.get('localVerified',True))
    write_json('news.json',items); write_js('news-data.js','NORWOOD_NEWS',items)
    return items,status


IMPORTANT_MEETING_RE=re.compile(r'\b(Board of Selectmen|Finance Commission|School Committee|Town Meeting|Planning Board|Zoning Board(?: of Appeals)?|Conservation Commission|Board of Health|Community Preservation Committee|Budget Balancing Committee|Middle School Building Committee)\b',re.I)
MONTH_DATE_RE=re.compile(r'\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(20\d{2}))?\b',re.I)
SLASH_DATE_RE=re.compile(r'\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b')
TIME_RE=re.compile(r'\b(\d{1,2}):(\d{2})\s*(AM|PM)\b',re.I)

def _date_from_text(text):
    m=SLASH_DATE_RE.search(text)
    if m:
        try:return date(int(m.group(3)),int(m.group(1)),int(m.group(2)))
        except Exception:return None
    m=MONTH_DATE_RE.search(text)
    if m:
        year=int(m.group(3) or now_local().year)
        try:return datetime.strptime(f"{m.group(1)} {m.group(2)} {year}",'%B %d %Y').date()
        except Exception:
            try:return datetime.strptime(f"{m.group(1)} {m.group(2)} {year}",'%b %d %Y').date()
            except Exception:return None
    return None

def _time_from_text(text):
    m=TIME_RE.search(text)
    if not m:return None
    h=int(m.group(1)); minute=int(m.group(2)); ap=m.group(3).upper()
    if ap=='PM' and h!=12:h+=12
    if ap=='AM' and h==12:h=0
    return f"{h:02d}:{minute:02d}"

def civic_meetings_from_town_calendar():
    if not BeautifulSoup:return []
    url='https://www.norwoodma.gov/calendar.php'
    html=request(url).text;soup=BeautifulSoup(html,'html.parser');out=[];seen=set()
    for node in soup.find_all(['article','li','tr','a','div']):
        text=clean_text(node.get_text(' '))
        if not text or len(text)>700 or not IMPORTANT_MEETING_RE.search(text):continue
        d=_date_from_text(text)
        if not d or d < now_local().date()-timedelta(days=1) or d > now_local().date()+timedelta(days=120):continue
        mm=IMPORTANT_MEETING_RE.search(text); title=mm.group(1)
        key=(title.lower(),d.isoformat(),_time_from_text(text))
        if key in seen:continue
        seen.add(key)
        a=node if getattr(node,'name',None)=='a' and node.get('href') else node.find('a',href=True)
        href=urljoin(url,a.get('href')) if a else url
        out.append({'kind':'meeting','title':title,'date':d.isoformat(),'start_time':_time_from_text(text),'end_time':None,'url':href,'source':'Town of Norwood Meetings Calendar'})
    return out

def election_notices_from_news(news):
    out=[];today=now_local().date();seen=set()
    for x in news:
        if x.get('source')!='Town of Norwood':continue
        text=clean_text((x.get('title') or '')+' '+(x.get('summary') or ''))
        if 'election' not in text.lower() or re.search(r'\b(results?|unofficial|official results)\b',text,re.I):continue
        d=_date_from_text(text)
        if not d or d < today or d > today+timedelta(days=370):continue
        key=d.isoformat()
        if key in seen:continue
        seen.add(key)
        out.append({'kind':'election','title':clean_text(x.get('title')) or f'Election Day — {d.strftime("%B %-d")}', 'election_date':d.isoformat(),'show_from':(d-timedelta(days=5)).isoformat(),'url':x.get('url') or 'https://www.norwoodma.gov/','source':'Town of Norwood'})
    return out

def refresh_civic_notices(news,offline=False):
    seed=read_json('civic-notices-seed.json',[])
    notices=list(seed)+election_notices_from_news(news)
    if not offline:
        try:notices.extend(civic_meetings_from_town_calendar())
        except Exception:pass
    chosen={}
    for n in notices:
        k=(n.get('kind'),n.get('date') or n.get('election_date'),clean_text(n.get('title')).lower())
        chosen[k]=n
    notices=list(chosen.values())
    notices.sort(key=lambda n:(n.get('date') or n.get('election_date') or '9999',n.get('start_time') or '99:99',n.get('title') or ''))
    write_json('civic-notices.json',notices)
    return notices


def coverage(registry):
    program={'community_submission_json','tribe_events','ical','html_calendar','html_list','html_hub','html_page','embedded_calendar','club_calendar','secondary_discovery'}
    active=[x for x in registry if x.get('active_monitor') and 'events' in x.get('produces',[])]
    attempted=[x for x in active if x.get('ingestion',{}).get('method') in program]
    discovery=[x for x in active if x.get('ingestion',{}).get('method')=='discovery_search']
    other=[x for x in active if x not in attempted and x not in discovery]
    return {'generated_at':now_local().isoformat(),'active_event_sources':len(active),'programmatically_checked_each_run':len(attempted),'search_discovery_sources_requiring_search_provider':len(discovery),'other_manual_or_special_adapter_sources':len(other),'note':'Programmatically checked means the updater attempts the source. Some HTML sources may expose no machine-readable events until a source-specific adapter is added.'}


def ics_escape(value):
    return str(value or '').replace('\\','\\\\').replace('\n','\\n').replace(',','\\,').replace(';','\\;')

def ics_stamp():
    return datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')

def event_matches_selector(e, selector):
    selector=selector or {}
    if selector.get('all'): return True
    cat=str(e.get('category') or '').lower()
    text=' '.join(str(e.get(k) or '') for k in ('title','notes','venue','category')).lower()
    if cat in [str(x).lower() for x in selector.get('categories',[])]: return True
    if any(str(x).lower() in cat for x in selector.get('category_contains',[])): return True
    if any(str(x).lower() in text for x in selector.get('keywords',[])): return True
    return False

def event_ics_lines(e):
    start=e.get('start') or {}; end=e.get('end') or {}; sd=start.get('date')
    if not sd: return []
    uid=f"{e.get('id') or event_id(e.get('title','event'),sd,e.get('venue',''))}@norwood.ma"
    lines=['BEGIN:VEVENT',f'UID:{ics_escape(uid)}',f'DTSTAMP:{ics_stamp()}']
    if not start.get('time'):
        lines.append(f"DTSTART;VALUE=DATE:{sd.replace('-','')}")
        ed=end.get('date') or sd
        try: next_day=date.fromisoformat(ed)+timedelta(days=1)
        except Exception: next_day=date.fromisoformat(sd)+timedelta(days=1)
        lines.append(f"DTEND;VALUE=DATE:{next_day.strftime('%Y%m%d')}")
    else:
        def local_dt(d,t): return d.replace('-','')+'T'+t.replace(':','')+'00'
        lines.append(f"DTSTART;TZID=America/New_York:{local_dt(sd,start['time'])}")
        if end.get('time'): lines.append(f"DTEND;TZID=America/New_York:{local_dt(end.get('date') or sd,end['time'])}")
    lines.append(f"SUMMARY:{ics_escape(e.get('title'))}")
    loc=' — '.join(x for x in [e.get('venue'),e.get('address')] if x)
    if loc: lines.append(f"LOCATION:{ics_escape(loc)}")
    desc='\n'.join(x for x in [e.get('notes'), f"Cost: {e.get('cost')}" if e.get('cost') else None, f"Source: {e.get('source_url')}" if e.get('source_url') else None] if x)
    if desc: lines.append(f"DESCRIPTION:{ics_escape(desc)}")
    if e.get('source_url'): lines.append(f"URL:{ics_escape(e.get('source_url'))}")
    lines.append('END:VEVENT'); return lines

def write_calendar_feeds(events):
    defs=read_json('calendar-sources.json',[])
    feeds_dir=ROOT/'feeds'; feeds_dir.mkdir(exist_ok=True)
    manifest=[]
    for src in defs:
        if src.get('kind')!='generated_live' or not src.get('feed_url'): continue
        chosen=[e for e in events if event_matches_selector(e,src.get('selector'))]
        chosen.sort(key=lambda e:(e.get('start',{}).get('date') or '9999',e.get('start',{}).get('time') or '99:99',e.get('title','')))
        lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Norwood.ma//Community Calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',f"X-WR-CALNAME:{ics_escape(src.get('name'))}",f"X-WR-CALDESC:{ics_escape(src.get('description'))}"]
        for e in chosen: lines.extend(event_ics_lines(e))
        lines.append('END:VCALENDAR')
        rel=src['feed_url']; target=ROOT/rel
        target.parent.mkdir(parents=True,exist_ok=True); target.write_text('\r\n'.join(lines)+'\r\n')
        manifest.append({'id':src['id'],'name':src['name'],'path':rel,'events':len(chosen),'generated_at':now_local().isoformat()})
    write_json('calendar-feed-status.json',manifest)
    return manifest


def acknowledge_published_submissions():
    """Tell the private moderation sheet which community submissions reached events.json.

    The shared secret is supplied only by GitHub Actions. The public Apps Script
    GET feed remains read-only and privacy-safe. Missing configuration is treated
    as a hard failure so the Actions log makes a broken feedback loop visible.
    """
    import os
    if not requests:
        raise RuntimeError('network dependencies unavailable')
    secret=os.environ.get('NORWOOD_EVENT_ACK_SECRET','').strip()
    if not secret:
        raise RuntimeError('NORWOOD_EVENT_ACK_SECRET GitHub Actions secret is not configured')
    registry=read_json('source-registry.json',[])
    src=next((x for x in registry if x.get('ingestion',{}).get('method')=='community_submission_json'),None)
    if not src or not src.get('url'):
        raise RuntimeError('community submission source endpoint is not configured')
    records=[]
    for e in read_json('events.json',[]):
        if e.get('source_id')==src.get('id') and str(e.get('id','')).startswith('submission-'):
            records.append({'id':e['id'],'title':e.get('title'),'date':(e.get('start') or {}).get('date'),'venue':e.get('venue')})
    payload={
      'action':'ackPublished',
      'secret':secret,
      'events':records,
      'verifiedAt':now_local().isoformat(),
      'publisher':'norwood.ma-github-actions'
    }
    r=requests.post(src['url'],json=payload,headers={'User-Agent':UA,'Accept':'application/json'},timeout=18)
    r.raise_for_status()
    try: result=r.json()
    except Exception: raise RuntimeError('publication acknowledgment endpoint did not return JSON')
    if not result.get('ok'):
        raise RuntimeError('publication acknowledgment rejected: '+clean_text(result.get('error') or result))
    print(json.dumps({'acknowledged':result.get('updated',0),'events':[x['id'] for x in records]},indent=2))
    return result

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--offline',action='store_true'); ap.add_argument('--ack-published',action='store_true'); args=ap.parse_args()
    if args.ack_published:
        acknowledge_published_submissions(); return
    events,ev_status=refresh_events(args.offline); news,nw_status=refresh_news(args.offline); civic_notices=refresh_civic_notices(news,args.offline); calendar_feeds=write_calendar_feeds(events)
    registry=read_json('source-registry.json',[])
    cov=coverage(registry); write_json('automation-coverage.json',cov)
    report={'generated_at':now_local().isoformat(),'offline':args.offline,'events_published':len(events),'news_published':len(news),'civic_notices':len(civic_notices),'calendar_feeds':calendar_feeds,'event_sources':ev_status,'news_sources':nw_status}
    write_json('refresh-status.json',report)
    print(json.dumps({'events':len(events),'news':len(news),'civic_notices':len(civic_notices),'coverage':cov},indent=2))
if __name__=='__main__': main()
