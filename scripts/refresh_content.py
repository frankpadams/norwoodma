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
import argparse, json, re, sys, hashlib, subprocess, shutil, os
from datetime import datetime, date, timedelta, timezone
from pathlib import Path
from io import BytesIO
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
try:
    from pypdf import PdfReader
except Exception:
    PdfReader=None


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

    # Castle Island publishes Norwood and South Boston events on one calendar.
    # For this source, require explicit evidence that the individual event is
    # at the Norwood taproom; source-level Norwood coverage is not sufficient.
    if source.get('id') == 'castle-island-calendar':
        if re.search(r'\b(South Boston|Southie|Old Colony(?: Avenue| Ave)?|02127)\b', text, re.I):
            return False
        return bool(re.search(r'\b(Norwood(?: Taproom)?|31\s+Astor(?: Avenue| Ave)?|02062)\b', text, re.I))

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


def infer_public_access(event, source=None):
    """Classify who may attend. Price/registration do not make a public event private."""
    source=source or {}
    explicit=clean_text(event.get('public_access')).lower().replace('-','_').replace(' ','_')
    restricted={'private','private_invite_only','invite_only','members_only','member_only','staff_only','employee_only','team_only','restricted'}
    public={'public','confirmed_public','inferred_public','paid','registration_required','limited_capacity','free'}
    if explicit in restricted:
        return {'status':'confirmed_restricted','access_type':explicit,'evidence':'explicit event access field'}
    text=clean_text(' '.join(str(event.get(k) or '') for k in ('title','notes','series','venue'))).lower()
    restricted_terms=[
      'members only','member-only','members-only','member meeting','members meeting',
      'staff only','employees only','employee only','coworker','company outing',
      'invite only','invitation only','private event','private rental',
      'team only','players only','practice','rehearsal'
    ]
    if any(x in text for x in restricted_terms):
        return {'status':'inferred_restricted','access_type':'restricted','evidence':'restricted-attendance language'}
    public_terms=[
      'open to the public','all are welcome','all welcome','everyone welcome',
      'tickets','ticketed','register','registration','rsvp','fundraiser','raffle',
      'fair','festival','concert','performance','workshop','open house','blood drive',
      'food drive','community event','farmers market',"farmer's market",'public event'
    ]
    if explicit in public:
        return {'status':'confirmed_public','access_type':explicit if explicit!='public' else ('paid' if event.get('cost') else 'public'),'evidence':'explicit event access field'}
    if event.get('registration_url') or event.get('ticket_url') or event.get('cost') or any(x in text for x in public_terms):
        return {'status':'inferred_public','access_type':('paid' if event.get('cost') else 'registration_required' if event.get('registration_url') else 'public'),'evidence':'public attendance/registration signal'}
    default_public=bool(source.get('filters',{}).get('public_events_only') or source.get('ingestion',{}).get('public_events_only'))
    if default_public:
        return {'status':'inferred_public','access_type':'public','evidence':'source is configured as public-events-only'}
    return {'status':'unknown','access_type':'unknown','evidence':'no reliable attendance evidence'}

def apply_public_access(event, source=None):
    result=infer_public_access(event,source)
    event['public_access_status']=result['status']
    event['access_type']=result['access_type']
    event['public_access_evidence']=result['evidence']
    # Unknown/restricted events remain useful in the broad conflict dataset but
    # must not enter What's Happening automatically.
    if result['status'] in {'unknown','inferred_restricted','confirmed_restricted'}:
        event['publish_candidate']=False
    return event

def service_org_public_candidate(text):
    """Keep public-facing service/scouting events; reject routine internal/member activity."""
    t=clean_text(text).lower()
    internal=[
      'club meeting','lodge meeting','troop meeting','pack meeting','scout meeting',
      'business meeting','board meeting','committee meeting','monthly meeting',
      'member meeting','members only','member-only','private event','rehearsal'
    ]
    if any(x in t for x in internal): return False
    public_signals=[
      'fundraiser','raffle','meat raffle','bingo','blood drive','food drive','toy drive',
      'coat drive','collection drive','car wash','garage sale','yard sale','tag sale',
      'bake sale','cookie sale','cookie booth','popcorn sale','pancake breakfast',
      'breakfast','dinner','dance','fair','festival','craft fair','open house',
      'community event','public event','tournament','5k','road race','walkathon',
      'benefit','scholarship','memorial day','veterans day','flag retirement',
      'trunk or treat','santa','holiday party','community service'
    ]
    return any(x in t for x in public_signals)

def local_news_event_candidate(text):
    """Prevent ordinary news headlines from being misread as calendar events."""
    t=clean_text(text).lower()
    reject=[
      'lottery prize','winning ticket','jackpot','patch am:','police log',
      'breaking news','obituary','real estate','home sold','weather forecast'
    ]
    if any(x in t for x in reject): return False
    signals=[
      'fundraiser','fundraising','benefit','raffle','bingo','car wash','craft fair',
      'vendor fair','fair','festival','concert','performance','show','open house',
      'blood drive','food drive','toy drive','coat drive','yard sale','tag sale',
      'bake sale','cookie sale','pancake breakfast','dinner','dance','5k','road race',
      'walkathon','workshop','class','storytime','book club','farmers market',
      "farmer's market",'community event','public event','celebration','parade',
      'tree lighting','menorah lighting','trunk or treat','demonstration','demo'
    ]
    return any(x in t for x in signals)

def source_allows_event(source, title, description=''):
    if not public_candidate(title,description): return False
    filters=source.get('filters',{})
    if filters.get('public_facing_service_events_only'):
        return service_org_public_candidate(f"{title} {description}")
    if filters.get('require_explicit_event_signal'):
        return local_news_event_candidate(f"{title} {description}")
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
    kwargs={'headers':{'User-Agent':UA,'Accept':'text/html,application/json,application/rss+xml,application/xml;q=0.9,*/*;q=0.8'},'timeout':timeout}
    # Scoped compatibility exception for the NPS SchoolNow host only.
    if urlparse(url).hostname=='www.norwood.k12.ma.us': kwargs['verify']=False
    r=requests.get(url,**kwargs)
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
    if not source_allows_event(source,title,desc): return None
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
        if not source_allows_event(source,title,text): continue
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
        if not source_allows_event(source,title,desc): continue
        sp=date_parts(start); ep=date_parts(end) if end else {'date':sp['date'],'time':None}
        # Preserve all-day semantics. RFC 5545 DTEND for an all-day event is
        # exclusive, so DTSTART 9/24 + DTEND 9/25 means the event occurs only
        # on 9/24. Convert the exclusive boundary to an inclusive display date.
        end_raw=c.decoded('dtend',None)
        all_day=isinstance(start_raw,date) and not isinstance(start_raw,datetime)
        if all_day: sp['time']=None
        if isinstance(end_raw,date) and not isinstance(end_raw,datetime):
            ep['time']=None
            if end_raw > start_raw:
                ep['date']=(end_raw-timedelta(days=1)).isoformat()
        url_prop=clean_text(c.get('url')) or source.get('url')
        category='sports' if source.get('ingestion',{}).get('parent_source_id')=='nps-athletics' or str(source.get('id','')).startswith('nps-athletics-arbiter-') else category_from(f"{title} {desc}")
        out.append({'id':event_id(title,sp['date'],loc),'title':title,'start':sp,'end':ep,'venue':loc or source.get('organization') or source.get('name'),'address':loc or None,'category':category,'source_id':source['id'],'source_url':url_prop,'cost':None,'organizer':source.get('organization') or source.get('name'),'public_access':'public','series':source.get('ingestion',{}).get('series_label'),'publish_candidate':True,'verification_status':'auto_primary_source','notes':desc[:240] or None,'discovered_by':'scheduled_ical'})
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

def events_from_vfw_meat_raffle():
    """Generate the established Norwood VFW Post 2452 Saturday meat raffle season (Sep-May)."""
    today=now_local().date(); out=[]
    d=today-timedelta(days=1)
    d+=timedelta(days=(5-d.weekday())%7)  # Saturday=5
    horizon=today+timedelta(days=180)
    while d<=horizon:
        if d.month in {9,10,11,12,1,2,3,4,5}:
            ds=d.isoformat()
            out.append({
              'id':event_id('VFW Post 2452 Meat Raffle',ds,'14:00'),
              'title':'VFW Post 2452 Meat Raffle',
              'start':{'date':ds,'time':'14:00'},'end':{'date':ds,'time':'17:00'},
              'venue':'Norwood VFW Post 2452','address':'193 Dean St, Norwood, MA 02062',
              'category':'community','source_id':'vfw-post-2452-meat-raffle',
              'source_url':'https://www.norwoodtownnews.com/2026/04/28/570769/calendar-may-2026',
              'cost':'$2 per drawing; $20 pre-buy','public_access':'public',
              'series':'VFW Post 2452 Meat Raffle','publish_candidate':True,
              'verification_status':'established_recurring_schedule',
              'notes':'Open to the public. Established weekly Saturday raffle, 2-5 p.m., during the September-May season.',
              'discovered_by':'scheduled_recurring_series'
            })
        d+=timedelta(days=7)
    return out


def events_from_tribe(source):
    base=f"{urlparse(source['url']).scheme}://{urlparse(source['url']).netloc}"
    start=now_local().date().isoformat(); end=(now_local().date()+timedelta(days=180)).isoformat()
    api=f"{base}/wp-json/tribe/events/v1/events?start_date={start}&end_date={end}&per_page=100"
    out=[]
    try:
        r=request(api); j=r.json()
        if not isinstance(j,dict) or 'events' not in j: raise ValueError('Tribe REST response missing events')
    except Exception:
        # Tribe sites often expose a public iCal endpoint even when the REST API is blocked.
        for feed in [source.get('ingestion',{}).get('feed_url'), source.get('url').rstrip('/')+'/?ical=1', base+'/events/?ical=1']:
            if not feed: continue
            try:
                rows=events_from_ical(feed,source)
                if rows: return dedupe_events(rows)
            except Exception: pass
        # Last fallback: parse structured event data from the public listing page.
        html=request(source.get('url')).text
        extracted,feeds=extract_jsonld_events(html,source)
        for feed in feeds:
            try: extracted.extend(events_from_ical(feed,source))
            except Exception: pass
        return dedupe_events(extracted)
    # A successful but empty REST response can coexist with a populated public iCal feed.
    if not j.get('events'):
        for feed in [source.get('ingestion',{}).get('feed_url'), source.get('url').rstrip('/')+'/?ical=1', base+'/events/?ical=1']:
            if not feed: continue
            try:
                rows=events_from_ical(feed,source)
                if rows: return dedupe_events(rows)
            except Exception: pass
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
        # Civic sources often describe the same item as either "Airport Commission"
        # or "Airport Commission Meeting". Ignore generic meeting labels when
        # comparing government/civic entries, while retaining the fuller display title.
        civic=(
            e.get('category') in {'government','civic_meeting'} or
            'civic' in str(e.get('source_id','')).lower() or
            'board' in str(e.get('series','')).lower()
        )
        if civic:
            title=re.sub(r'\b(meeting|hearing|session)\b',' ',title)
            title=re.sub(r'\s+',' ',title).strip()
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
    """Publish current/upcoming events; retain recently ended items only outside What's Happening data."""
    today=now_local().date()
    out=[]
    for e in events:
        if not e.get('publish_candidate',True): continue
        sd=e.get('start',{}).get('date'); ed=e.get('end',{}).get('date') or sd
        try:
            startd=date.fromisoformat(sd)
            endd=date.fromisoformat(ed)
        except Exception: continue
        # A multi-day event remains current through its explicit end date. Once it
        # has ended, remove it from the public What's Happening dataset immediately.
        # This prevents old start dates from lingering merely because an event had
        # a long date range (e.g. a fundraiser/order window).
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



def _urls_in_calendar_row(row):
    """Collect public links embedded anywhere in a Revize calendar row."""
    urls=[]
    def walk(v):
        if isinstance(v,dict):
            for x in v.values(): walk(x)
        elif isinstance(v,list):
            for x in v: walk(x)
        elif isinstance(v,str):
            text=v.replace('\\/','/')
            if BeautifulSoup and '<' in text and '>' in text:
                try:
                    for a in BeautifulSoup(text,'html.parser').find_all('a',href=True):
                        urls.append(urljoin('https://www.norwoodma.gov/',a['href']))
                except Exception:
                    pass
            for m in re.findall(r'https?://[^\s"<>\']+|(?:/[^\\s"<>\']+\.pdf(?:\?[^\\s"<>\']*)?)',text,re.I):
                urls.append(urljoin('https://www.norwoodma.gov/',m.rstrip(').,;')))
    walk(row)
    return list(dict.fromkeys(urls))


def _pdf_text(url):
    if not PdfReader or '.pdf' not in url.lower(): return ''
    try:
        data=request(url,timeout=25).content
        reader=PdfReader(BytesIO(data))
        return '\n'.join((p.extract_text() or '') for p in reader.pages[:80])
    except Exception:
        return ''


def _selectmen_document_links(row):
    """Find agenda/minutes/packet PDFs attached to a Board of Selectmen calendar event."""
    links=_urls_in_calendar_row(row)
    # A Revize event may link to a detail page that contains the actual attachments.
    for u in list(links):
        if '.pdf' in u.lower(): continue
        try:
            html=request(u,timeout=18).text
            if BeautifulSoup:
                soup=BeautifulSoup(html,'html.parser')
                for a in soup.find_all('a',href=True):
                    href=urljoin(u,a['href'])
                    label=clean_text(a.get_text(' '))
                    if '.pdf' in href.lower() and re.search(r'\b(agenda|packet|minutes|consent)\b',f'{label} {href}',re.I):
                        links.append(href)
        except Exception:
            pass
    return list(dict.fromkeys(links))


def _car_wash_items_from_text(text, source_url, meeting_date):
    """Extract municipal-lot fundraising car washes from an official BOS document."""
    if not text or not re.search(r'\bcar\s*wash\b',text,re.I) or not re.search(r'\bmunicipal\s+lot\b',text,re.I):
        return []
    flat=re.sub(r'\s+',' ',text)
    doc_hint=source_url.lower()
    is_minutes=bool(re.search(r'minute',doc_hint))
    out=[]
    # Headings used by the Board have varied between "Car Wash - X" and
    # "Car Wash Request: X". Limit the organization capture before request prose.
    pat=re.compile(r'\bCar\s*Wash(?:\s*Request)?\s*[:\-]\s*(?P<org>.{2,100}?)\s+(?=(?:Submitting|Requesting|Request\s+from|For\s+approval|Approval|Consent|$))',re.I)
    for m in pat.finditer(flat):
        org=clean_text(m.group('org')).strip(' -:;,.')
        if not org: continue
        window=flat[m.start():m.start()+700]
        if not re.search(r'\bmunicipal\s+lot\b',window,re.I): continue
        dm=re.search(r'\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?\s*,?\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(20\d{2})\b',window,re.I)
        if not dm: continue
        try:
            d=datetime.strptime(f"{dm.group(1)} {dm.group(2)} {dm.group(3)}","%B %d %Y").date()
        except Exception:
            continue
        if d < now_local().date()-timedelta(days=1): continue
        tm=re.search(r'\bfrom\s+(\d{1,2}(?::\d{2})?\s*[AP]\.?M\.?)\s+(?:until|to|-)\s+(\d{1,2}(?::\d{2})?\s*[AP]\.?M\.?)',window,re.I)
        def norm_time(v):
            if not v:return None
            v=v.replace('.','').upper().replace(' ','')
            for fmt in ('%I:%M%p','%I%p'):
                try:return datetime.strptime(v,fmt).strftime('%H:%M')
                except Exception:pass
            return None
        denied=bool(re.search(r'\b(denied|declined|withdrawn|tabled|postponed|not approved)\b',window,re.I))
        approved=bool(re.search(r'\b(approved|approve|voted|motion\s+(?:carried|passed)|consent\s+agenda\s+(?:approved|passed))\b',window,re.I))
        confirmed=(is_minutes or approved) and not denied
        title=f"Municipal Lot Car Wash Fundraiser: {org}" + ("" if confirmed else " - Tentative")
        out.append({
          'id':event_id(f"Municipal Lot Car Wash Fundraiser: {org}",d.isoformat(),'Norwood Municipal Lot'),
          'title':title,
          'start':{'date':d.isoformat(),'time':norm_time(tm.group(1)) if tm else None},
          'end':{'date':d.isoformat(),'time':norm_time(tm.group(2)) if tm else None},
          'venue':'Norwood Municipal Lot',
          'address':'Norwood, MA 02062',
          'category':'fundraiser',
          'source_id':'town-selectmen-car-washes',
          'source_url':source_url,
          'cost':None,
          'public_access':'public',
          'series':'Municipal Lot Car Wash Fundraisers',
          'publish_candidate':True,
          'verification_status':'approved_minutes' if confirmed else 'tentative_agenda',
          'notes':'Approved by the Board of Selectmen.' if confirmed else 'Tentative; listed on a Board of Selectmen agenda and subject to Board approval.',
          'discovered_by':'selectmen_agenda_minutes_monitor',
          '_meeting_date':meeting_date.isoformat() if meeting_date else None,
          '_confirmed':confirmed
        })
    return out


def events_from_selectmen_car_washes(source):
    """Use BOS agendas for early notice and minutes as the later approval check."""
    candidates={}
    today=now_local().date()
    for row in _town_calendar_data():
        title=clean_text(row.get('title') or row.get('summary') or row.get('name'))
        if not re.search(r'\b(Board\s+of\s+Selectmen|Selectmen)\b',title,re.I): continue
        raw_start=row.get('start') or row.get('start_date') or row.get('date') or row.get('event_start')
        try:
            md=parse_dt(raw_start).astimezone(TZ).date()
        except Exception:
            md=None
        # Look back far enough for recently posted minutes while also scanning
        # upcoming meetings whose agendas may contain future fundraiser dates.
        if md and (md < today-timedelta(days=120) or md > today+timedelta(days=185)): continue
        for u in _selectmen_document_links(row):
            if '.pdf' not in u.lower(): continue
            doc=_pdf_text(u)
            for e in _car_wash_items_from_text(doc,u,md):
                key=e['id']
                old=candidates.get(key)
                # Confirmed minutes always replace an earlier tentative agenda item.
                if not old or (e.get('_confirmed') and not old.get('_confirmed')):
                    candidates[key]=e
    out=[]
    for e in candidates.values():
        e.pop('_meeting_date',None);e.pop('_confirmed',None);out.append(e)
    return sorted(out,key=lambda e:(e['start']['date'],e['start'].get('time') or '99:99',e['title']))



def events_from_home_depot_kids_workshops(source):
    """Publish the Norwood Home Depot's free first-Saturday Kids Workshops."""
    local_url=source.get('url') or 'https://www.homedepot.com/l/Norwood/MA/Norwood/02062/2681'
    national_url=source.get('ingestion',{}).get('national_url') or 'https://www.homedepot.com/c/kids-workshop'
    local_text=''; national_text=''
    try: local_text=clean_text(request(local_url).text)
    except Exception: pass
    try: national_text=clean_text(request(national_url).text)
    except Exception: pass

    # Require current official evidence that the program is active. The national
    # page supplies the recurring rule; the Norwood store page anchors the event
    # to store #2681 rather than assuming participation at an unrelated location.
    recurring=bool(re.search(r'first\s+Saturday\s+of\s+every\s+month',national_text,re.I))
    local_confirmed=bool(re.search(r'Home\s+Depot\s+Kids\s+Workshop|Kids\s+Workshop',local_text,re.I))
    if not recurring or not local_confirmed:
        return []

    today=now_local().date()
    out=[]
    # Keep a short rolling horizon. Each refresh re-validates both official pages.
    y,m=today.year,today.month
    for _ in range(4):
        first=date(y,m,1)
        d=first+timedelta(days=(5-first.weekday())%7)  # Saturday=5
        if d >= today-timedelta(days=1):
            ds=d.isoformat()
            out.append({
              'id':event_id('Home Depot Kids Workshop',ds,'The Home Depot — Norwood #2681'),
              'title':'Home Depot Kids Workshop',
              'start':{'date':ds,'time':'09:00'},
              'end':{'date':ds,'time':'12:00'},
              'venue':'The Home Depot — Norwood #2681',
              'address':'1415 Boston Providence Hwy, Norwood, MA 02062',
              'category':'family',
              'source_id':source['id'],
              'source_url':local_url,
              'registration_url':national_url,
              'cost':'Free',
              'public_access':'public',
              'series':'Home Depot Kids Workshops',
              'publish_candidate':True,
              'verification_status':'official_recurring_schedule',
              'notes':'Free in-store kids workshop. Home Depot states Kids Workshops are held from 9:00 AM to noon on the first Saturday of every month, while supplies last.',
              'discovered_by':'scheduled_home_depot_kids_workshop'
            })
        if m==12:y,m=y+1,1
        else:m+=1
    return out









def events_from_social_mirror(source):
    """Extract only concrete, Norwood-specific dated events from a public social mirror."""
    url=source.get('url'); html=request(url).text
    if not BeautifulSoup:return []
    soup=BeautifulSoup(html,'html.parser'); out=[]; now=now_local().date()
    for node in soup.find_all(['article','div','li']):
        text=clean_text(node.get_text(' '))
        if len(text)<25 or len(text)>1800: continue
        if 'norwood' not in text.lower(): continue
        d=_date_from_text(text)
        if not d or d < now-timedelta(days=7): continue
        tm=_time_from_text(text)
        title=source.get('name','Community event').replace(' — Public event/social feed','')
        # Prefer a concise event-like sentence over the mirror page title.
        sentences=re.split(r'(?<=[.!?])\s+',text)
        candidate=next((x for x in sentences if 8<len(x)<160 and any(k in x.lower() for k in ['join','celebrat','event','festival','dinner','lunch','night','day','sadya'])),None)
        if candidate:title=candidate
        ds=d.isoformat()
        out.append({'id':event_id(title,ds,'Norwood'),'title':title,'start':{'date':ds,'time':tm},'end':{'date':ds,'time':None},'venue':'Norwood, MA','address':None,'category':'community','source_id':source['id'],'source_url':url,'cost':None,'public_access':'public','series':source.get('name'),'publish_candidate':True,'verification_status':'public_social_mirror','notes':'Dated Norwood-specific public event discovered from a public social mirror; prefer first-party event details when available.','discovered_by':'social_mirror'})
    return dedupe_events(out)

def _events_from_newsletter_pdf(content, source, source_url):
    """Conservatively extract explicitly dated items from a newsletter PDF."""
    if not PdfReader: return []
    try:
        reader=PdfReader(BytesIO(content))
        pages=[(p.extract_text() or '') for p in reader.pages]
    except Exception:
        return []
    out=[]; now=now_local().date()
    month_re=r'(January|February|March|April|May|June|July|August|September|October|November|December)'
    # Require a spelled-out month + day. Bare calendar-grid numbers are intentionally
    # ignored because they cannot safely be associated with a program.
    date_re=re.compile(r'\\b'+month_re+r'\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,\\s*(20\\d{2}))?\\b',re.I)
    time_re=re.compile(r'\\b(\\d{1,2})(?::(\\d{2}))?\\s*(a\\.?m\\.?|p\\.?m\\.?)\\b',re.I)
    for page in pages:
        lines=[clean_text(x) for x in page.splitlines() if clean_text(x)]
        for idx,line in enumerate(lines):
            m=date_re.search(line)
            if not m: continue
            mon=m.group(1); day=int(m.group(2)); year=int(m.group(3) or now.year)
            try: d=datetime.strptime(f'{mon} {day} {year}','%B %d %Y').date()
            except Exception: continue
            if d < now-timedelta(days=7) or d > now+timedelta(days=150): continue
            context=' '.join(lines[max(0,idx-1):min(len(lines),idx+2)])
            # A usable event needs descriptive text beyond the date itself.
            title=date_re.sub('',line).strip(' -–—:|')
            if len(title)<4 and idx>0: title=lines[idx-1].strip(' -–—:|')
            if len(title)<4 or title.lower().startswith(('page ','september 2026','october 2026')): continue
            tm=time_re.search(context); time_value=None
            if tm:
                h=int(tm.group(1)); minute=int(tm.group(2) or 0); ap=tm.group(3).lower().replace('.','')
                if ap=='pm' and h<12:h+=12
                if ap=='am' and h==12:h=0
                time_value=f'{h:02d}:{minute:02d}'
            ds=d.isoformat()
            out.append({'id':event_id(title,ds,'Norwood Senior Center'),'title':title,'start':{'date':ds,'time':time_value},'end':{'date':ds,'time':None},'venue':'Norwood Senior Center','address':None,'category':'community','source_id':source['id'],'source_url':source_url,'cost':None,'public_access':'public','series':source.get('name'),'publish_candidate':True,'verification_status':'official_newsletter_pdf','notes':'Explicitly dated item extracted from the official Senior Center newsletter. Confirm registration requirements with the Senior Center.','discovered_by':'newsletter_pdf'})
    return dedupe_events(out)

def events_from_newsletter_index(source):
    """Discover the newest Senior Center newsletter and extract explicit dated events."""
    ing=source.get('ingestion',{}); url=ing.get('index_url') or source.get('url'); html=request(url).text
    out=[]; debug={'index_url':url,'documents':[],'selected':[]}
    extracted,feeds=extract_jsonld_events(html,source); out.extend(extracted)
    if BeautifulSoup:
        soup=BeautifulSoup(html,'html.parser'); docs=[]
        for a in soup.find_all('a',href=True):
            href=urljoin(url,a['href']); label=clean_text(a.get_text(' '))
            # Revize emits document links relative to the department page even when
            # the real public file lives at the Town root. Normalize duplicated
            # department prefixes before requesting the document.
            parsed=urlparse(href)
            path=parsed.path
            marker='/departments/council_on_aging/document_center/'
            if marker in path:
                path='/document_center/'+path.split(marker,1)[1]
                href=parsed._replace(path=path).geturl()
            marker2='/departments/council_on_aging/SeniorCenter/'
            if marker2 in path:
                path='/SeniorCenter/'+path.split(marker2,1)[1]
                href=parsed._replace(path=path).geturl()
            if href==url: continue
            if any(href.lower().split('?')[0].endswith(x) for x in ['.pdf','.html','.htm']) or 'newsletter' in label.lower() or 'calendar' in label.lower():
                # Prefer current-year/month documents. The town index is newest-first,
                # so order is retained as the tie-breaker.
                score=0; low=(label+' '+href).lower()
                if str(now_local().year) in low: score+=10
                if now_local().strftime('%B').lower() in low: score+=5
                docs.append((score,href,label)); debug['documents'].append({'score':score,'url':href,'label':label})
        docs.sort(key=lambda x:x[0],reverse=True)
        # Process only the two strongest current documents; avoid years of archives.
        for score,href,label in docs[:2]:
            item={'score':score,'url':href,'label':label,'events':0}
            try:
                before=len(out)
                if href.lower().split('?')[0].endswith('.pdf'):
                    try:
                        r=request(href)
                    except Exception:
                        # Some legacy SeniorCenter files remain under the department
                        # path; retry the Town-root document center form when possible.
                        p=urlparse(href)
                        if '/SeniorCenter/' in p.path:
                            alt=p._replace(path='/departments/council_on_aging'+p.path).geturl()
                            r=request(alt); href=alt; item['url']=alt
                        else: raise
                    item['bytes']=len(r.content); out.extend(_events_from_newsletter_pdf(r.content,source,href))
                else:
                    body=request(href).text; ev,_=extract_jsonld_events(body,source); out.extend(ev)
                item['events']=len(out)-before
            except Exception as ex:
                item['error']=str(ex)[:180]
            debug['selected'].append(item)
    try: (DATA/'senior-newsletter-discovery.json').write_text(json.dumps(debug,indent=2)+'\\n')
    except Exception: pass
    return dedupe_events(out)

def events_from_secondary_listing(source):
    """Extract only concrete dated occurrences from a configured secondary community listing."""
    ing=source.get('ingestion',{}); url=ing.get('discovery_url') or source.get('url'); html=request(url).text
    if not BeautifulSoup:return []
    soup=BeautifulSoup(html,'html.parser'); terms=[str(x).lower() for x in ing.get('match',[])]
    out=[]
    for node in soup.find_all(['article','li','tr','p','div']):
        text=clean_text(node.get_text(' '))
        if not text or not any(t in text.lower() for t in terms): continue
        d=_date_from_text(text)
        if not d: continue
        tm=_time_from_text(text); title=next((x for x in ing.get('match',[]) if str(x).lower() in text.lower()),source.get('name'))
        ds=d.isoformat()
        out.append({'id':event_id(title,ds,None),'title':source.get('name') or title,'start':{'date':ds,'time':tm},'end':{'date':ds,'time':None},'venue':None,'address':None,'category':'community','source_id':source['id'],'source_url':url,'cost':None,'public_access':'public','series':source.get('name'),'publish_candidate':True,'verification_status':'secondary_dated_listing','notes':'Concrete dated occurrence found in configured community listing.','discovered_by':'secondary_recurring_discovery'})
    return dedupe_events(out)

def events_from_dated_event_pages(source):
    """Extract dated events from an official listing and its linked detail pages."""
    url=source.get('url'); html=request(url).text
    if not BeautifulSoup: return []
    soup=BeautifulSoup(html,'html.parser'); out=[]; links=[]
    for a in soup.find_all('a',href=True):
        href=urljoin(url,a['href'])
        if href.startswith(url.split('/shows-events')[0]) and href not in links: links.append(href)
    for page in [url]+links[:80]:
        try:
            ph=html if page==url else request(page).text
            ps=BeautifulSoup(ph,'html.parser'); txt=clean_text(ps.get_text(' '))
            d=_date_from_text(txt)
            if not d: continue
            title=''
            h=ps.find(['h1','h2'])
            if h: title=clean_text(h.get_text(' '))
            if not title or title.lower() in {'shows & events','events'}:
                hs=ps.find_all(['h1','h2','h3'])
                title=next((clean_text(x.get_text(' ')) for x in hs if clean_text(x.get_text(' ')).lower() not in {'shows & events','events'}),'')
            if not title: continue
            ds=d.isoformat()
            out.append({'id':event_id(title,ds,None),'title':title,'start':{'date':ds,'time':_time_from_text(txt)},'end':{'date':ds,'time':None},'venue':source.get('organization') or source.get('name'),'address':None,'category':'arts','source_id':source['id'],'source_url':page,'cost':None,'public_access':'public','series':source.get('name'),'publish_candidate':True,'verification_status':'official_dated_event_page','notes':'Dated event from the official venue site.','discovered_by':'official_event_page'})
        except Exception: pass
    return dedupe_events(out)

def events_from_clubrunner(source):
    """Discover ClubRunner calendar subscription feeds and structured events."""
    url=source.get('ingestion',{}).get('calendar_url') or source.get('url')
    html=request(url).text; out=[]
    extracted,feeds=extract_jsonld_events(html,source); out.extend(extracted)
    if BeautifulSoup:
        soup=BeautifulSoup(html,'html.parser')
        for a in soup.find_all('a',href=True):
            href=urljoin(url,a['href']); label=clean_text(a.get_text(' ')).lower()
            if any(k in href.lower() for k in ['ical','ics','calendarfeed','calendar-feed','subscribe']) or 'subscribe' in label:
                feeds.append(href)
        # ClubRunner frequently stores the subscription URL in onclick/data attributes rather than href.
        for tag in soup.find_all(True):
            for attr in ['onclick','data-url','data-href','data-calendar-url']:
                raw=tag.get(attr)
                if raw:
                    for m in re.findall(r'https?://[^\\s\"\'<>]+',str(raw)):
                        if any(k in m.lower() for k in ['ical','ics','calendar','subscribe']): feeds.append(m.replace('&amp;','&'))
    for feed in list(dict.fromkeys(feeds))[:10]:
        try: out.extend(events_from_ical(feed,source))
        except Exception: pass
    return dedupe_events(out)

def recurring_candidates(source, months=5):
    """Generate bounded recurring candidates only for explicitly verified recurrence rules."""
    rec=source.get('ingestion',{}).get('recurrence') or {}; out=[]
    if rec.get('frequency')!='monthly': return out
    weekdays={'MO':0,'TU':1,'WE':2,'TH':3,'FR':4,'SA':5,'SU':6}; wd=weekdays.get(rec.get('byweekday'))
    if wd is None:return out
    now=now_local().date()
    for add in range(months+1):
        y=now.year+(now.month-1+add)//12; m=(now.month-1+add)%12+1
        first=date(y,m,1); days=[]
        d=first
        while d.month==m:
            if d.weekday()==wd: days.append(d)
            d+=timedelta(days=1)
        for ordinal in rec.get('ordinal',[]):
            if ordinal>0 and len(days)>=ordinal:
                day=days[ordinal-1]
                if day<now-timedelta(days=7): continue
                title=source.get('name')
                out.append({'id':event_id(title,day.isoformat(),None),'title':title,'start':{'date':day.isoformat(),'time':None},'end':{'date':day.isoformat(),'time':None},'venue':None,'address':None,'category':'community','source_id':source['id'],'source_url':ing.get('revalidation_url') or source.get('url'),'cost':None,'public_access':'public','series':title,'publish_candidate':False,'verification_status':'recurrence_candidate','notes':'Date derived from a verified recurring schedule; venue/time should be confirmed from current listing.','discovered_by':'verified_recurrence'})
    return out

def _verified_recurrence_page_check(source):
    """Confirm recurrence against its configured authority, with a narrow newspaper fallback."""
    ing=source.get('ingestion',{}); rec=ing.get('recurrence') or {}
    url=ing.get('revalidation_url') or source.get('url')
    if not url: raise RuntimeError('verified recurrence has no authoritative source URL')
    try:
        html=request(url).text
    except Exception as ex:
        # Local newspaper calendars can be authoritative evidence while still blocking
        # GitHub-hosted automated clients. Permit only recent, explicitly newspaper-
        # verified schedules, and only for access-denied responses. Other failures
        # continue to fail closed.
        note=str(ex)
        ver=source.get('verification',{})
        status=str(ver.get('status') or '').lower()
        verified=parse_dt(ver.get('verified_at'))
        recent=bool(verified and now_local()-verified.astimezone(TZ)<=timedelta(days=45))
        newspaper=('newspaper' in status or 'secondary_source' in status) and recent
        blocked=bool(re.search(r'\\b(?:401|403)\\b|forbidden|unauthorized',note,re.I))
        if newspaper and blocked:
            return 'recent_authoritative_newspaper_verification'
        raise
    text=clean_text(html).lower()
    # Require identifying language plus the configured weekday/time. This deliberately
    # fails closed: a redesigned/ambiguous page stops future generation instead of
    # silently extending stale dates.
    terms=[str(x).lower() for x in (ing.get('validation_terms') or []) if x]
    if terms and not all(t in text for t in terms):
        raise RuntimeError('authoritative page no longer contains required schedule identity terms')
    day_names={'MO':['monday','mondays'],'TU':['tuesday','tuesdays'],'WE':['wednesday','wednesdays'],'TH':['thursday','thursdays'],'FR':['friday','fridays'],'SA':['saturday','saturdays'],'SU':['sunday','sundays']}
    wd=rec.get('byweekday')
    if wd and not any(x in text for x in day_names.get(wd,[])):
        raise RuntimeError('authoritative page no longer confirms configured weekday')
    def time_tokens(t):
        if not t:return []
        h,m=map(int,t.split(':')); ap='am' if h<12 else 'pm'; hh=h%12 or 12
        return [f"{hh}:{m:02d} {ap}",f"{hh}:{m:02d}{ap}",f"{hh} {ap}",f"{hh}{ap}"] if m==0 else [f"{hh}:{m:02d} {ap}",f"{hh}:{m:02d}{ap}"]
    st=ing.get('start_time')
    if st and not any(tok in text for tok in time_tokens(st)):
        raise RuntimeError('authoritative page no longer confirms configured start time')
    # Explicit cancellation/hiatus language near a source is safer treated as stale.
    if re.search(r'\b(cancelled|canceled|suspended|on hiatus|no longer meeting|discontinued)\b',text,re.I):
        raise RuntimeError('authoritative page indicates cancellation or hiatus')
    return True

def events_from_verified_recurrence(source, months=6):
    """Generate bounded occurrences only after live revalidation of the source page."""
    validation=_verified_recurrence_page_check(source)
    ing=source.get('ingestion',{}); rec=ing.get('recurrence') or {}; out=[]
    freq=rec.get('frequency'); weekdays={'MO':0,'TU':1,'WE':2,'TH':3,'FR':4,'SA':5,'SU':6}
    wd=weekdays.get(rec.get('byweekday')); now=now_local().date()
    allowed_months={int(x) for x in (rec.get('months') or []) if str(x).isdigit()}
    if wd is None or freq not in {'weekly','monthly'}: return out
    end=(now+timedelta(days=31*months))
    d=now-timedelta(days=7)
    while d<=end:
        if d.weekday()==wd:
            include=freq=='weekly'
            if freq=='monthly':
                ords=rec.get('ordinal') or []
                occurrence=((d.day-1)//7)+1
                include=occurrence in ords
            if include and allowed_months and d.month not in allowed_months:
                include=False
            if include:
                title=ing.get('event_title') or source.get('name')
                st=ing.get('start_time'); et=ing.get('end_time')
                out.append({'id':event_id(title,d.isoformat(),ing.get('venue')),'title':title,'start':{'date':d.isoformat(),'time':st},'end':{'date':d.isoformat(),'time':et},'venue':ing.get('venue'),'address':ing.get('address'),'category':ing.get('category') or 'community','source_id':source['id'],'source_url':ing.get('display_url') or ing.get('organization_url') or ing.get('revalidation_url') or source.get('url'),'verification_url':ing.get('revalidation_url') or source.get('url'),'cost':ing.get('cost'),'public_access':'public','series':ing.get('series_label') or title,'publish_candidate':bool(ing.get('publish_candidate',True)),'verification_status':('recent_authoritative_newspaper_verification' if validation=='recent_authoritative_newspaper_verification' else 'live_revalidated_recurrence'),'notes':ing.get('notes'),'virtual':ing.get('virtual'),'discovered_by':'scheduled_verified_recurrence'})
        d+=timedelta(days=1)
    return out

def events_from_nys_practice_pdf(url, source, gender=None):
    """Parse NYS travel-practice PDFs and expand weekly rows through the current fall season."""
    if not PdfReader: return []
    raw=request(url).content
    reader=PdfReader(BytesIO(raw))
    text='\n'.join((p.extract_text() or '') for p in reader.pages)
    out=[]; today=now_local().date()
    weekdays={'monday':0,'tuesday':1,'wednesday':2,'thursday':3,'friday':4,'saturday':5,'sunday':6}
    season_start=date(today.year,8,31); season_end=date(today.year,11,15)
    row_re=re.compile(r'^\s*(\d(?:\s*/\s*\d)?)\s+(.+?)\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2}:\d{2})\s*-\s*(?:(\d{1,2}:\d{2})|dusk)\s+(.+?)\s*$',re.I)
    for line in text.splitlines():
        m=row_re.match(clean_text(line))
        if not m: continue
        grade=clean_text(m.group(1)).replace(' ',''); team=clean_text(m.group(2)); wd=weekdays[m.group(3).lower()]
        start_time=m.group(4); end_time=m.group(5); field=clean_text(m.group(6))
        d=season_start
        while d.weekday()!=wd: d+=timedelta(days=1)
        while d<=season_end:
            if d>=today-timedelta(days=7):
                label=('Boys ' if gender=='boys' else 'Girls ' if gender=='girls' else '')+('Grades '+grade if '/' in grade else 'Grade '+grade)
                out.append({'id':event_id(f'{team} practice',d.isoformat(),field),'title':f'{team} practice','start':{'date':d.isoformat(),'time':start_time},'end':{'date':d.isoformat(),'time':end_time},'venue':field,'field':field,'address':None,'category':'youth_sports','source_id':source['id'],'source_url':url,'cost':None,'public_access':'public','series':'Norwood Youth Soccer','publish_candidate':False,'curated_default':False,'verification_status':'official_nys_practice_pdf','notes':'Recurring Fall 2026 practice from the official NYS practice schedule. Check field status for weather-related changes.','discovered_by':'nys_practice_pdf','team':team,'grade':label,'gender':gender,'program':'Travel','activity':'practice','field_status_url':'https://norwoodsoccer.com/fields'})
            d+=timedelta(days=7)
    return dedupe_events(out)


def events_from_nys_multi_schedule(source):
    """Ingest Norwood Youth Soccer's current team/schedule pages and linked public schedule documents."""
    ing=source.get('ingestion',{}); urls=[ing.get('schedule_url'),ing.get('team_directory_url')]; out=[]; feeds=[]
    for url in [u for u in urls if u]:
        html=request(url).text
        temp=dict(source); temp['url']=url
        extracted,ics=extract_jsonld_events(html,temp); out.extend(extracted); feeds.extend(ics)
        if BeautifulSoup:
            soup=BeautifulSoup(html,'html.parser')
            for a in soup.find_all('a',href=True):
                href=urljoin(url,a.get('href')); label=clean_text(a.get_text(' '))
                low=(href+' '+label).lower()
                if any(k in low for k in ['schedule','practice','game','calendar','.ics','.pdf']) and ('norwoodsoccer.com' in href or 'bays.org' in href):
                    try:
                        if href.lower().split('?')[0].endswith('.ics'):
                            out.extend(events_from_ical(href,temp))
                        elif href.lower().split('?')[0].endswith('.pdf'):
                            gender='boys' if 'boys' in low else ('girls' if 'girls' in low else None)
                            if gender: out.extend(events_from_nys_practice_pdf(href,temp,gender))
                        else:
                            page=request(href).text; rows,_=extract_jsonld_events(page,temp); out.extend(rows)
                    except Exception:
                        pass
    bays=ing.get('travel_league_url')
    if bays:
        try:
            temp=dict(source); temp['url']=bays
            out.extend(events_from_league_schedule(temp))
        except Exception:
            pass
    for e in out:
        e['source_id']=source['id']; e['category']='youth_sports'; e['publish_candidate']=False
        e['curated_default']=False; e['discovered_by']=e.get('discovered_by') or 'nys_multi_schedule'
        e['field_status_url']=e.get('field_status_url') or 'https://norwoodsoccer.com/fields'
        if e.get('venue') and not e.get('field'): e['field']=e.get('venue')
    return dedupe_events(out)


def events_from_league_schedule(source):
    """Parse public youth-league schedule tables/cards with dates and matchup metadata."""
    url=source.get('url'); html=request(url).text
    if not BeautifulSoup:return []
    soup=BeautifulSoup(html,'html.parser'); out=[]
    nodes=soup.find_all(['tr','li','article','div'])
    for node in nodes:
        text=clean_text(node.get_text(' '))
        if len(text)<8 or len(text)>600: continue
        d=_date_from_text(text)
        if not d: continue
        tm=_time_from_text(text)
        title=None
        cells=node.find_all(['td','th'])
        if cells:
            vals=[clean_text(c.get_text(' ')) for c in cells]
            title=' — '.join(v for v in vals if v and not re.search(r'\b20\d{2}\b',v) and not re.fullmatch(r'\d{1,2}:\d{2}.*',v,re.I))[:180]
        if not title:
            h=node.find(['h2','h3','h4','strong']); title=clean_text(h.get_text(' ')) if h else text[:180]
        if not title: continue
        ds=d.isoformat()
        field=None
        # Preserve the published field/site when the league table provides one.
        for v in (vals if cells else [text]):
            m=re.search(r'(?:field|location|site)\s*[:\-]?\s*([^|;]{2,80})',v,re.I)
            if m: field=clean_text(m.group(1)); break
        out.append({'id':event_id(title,ds,field or source.get('name')),'title':title,'start':{'date':ds,'time':tm},'end':{'date':ds,'time':None},'venue':field,'field':field,'address':None,'category':'sports','source_id':source['id'],'source_url':url,'cost':None,'public_access':'public','series':source.get('name'),'publish_candidate':True,'verification_status':'auto_primary_source','notes':'Youth sports schedule item; confirm with league for late changes.','discovered_by':'league_schedule_table'})
    return dedupe_events(out)

def discover_embedded_calendar_feeds(page_url, html):
    """Find public ICS feeds, including Google Calendar embeds, on a calendar hub."""
    feeds=[]
    if not BeautifulSoup: return feeds
    soup=BeautifulSoup(html,'html.parser')
    for tag in soup.find_all(['iframe','a']):
        raw=tag.get('src') or tag.get('href')
        if not raw: continue
        href=urljoin(page_url,raw)
        low=href.lower()
        if (low.endswith('.ics') or 'ical' in low) and href not in feeds:
            feeds.append(href)
        if 'calendar.google.com' in low:
            try:
                from urllib.parse import urlparse,parse_qs,unquote,quote
                import base64
                qs=parse_qs(urlparse(href).query)
                cid=(qs.get('src') or qs.get('cid') or [None])[0]
                if cid:
                    cid=unquote(cid)
                    # Calendar share links commonly use cid=<base64 calendar id>,
                    # while embeds use src=<plain calendar id>.
                    if '@' not in cid:
                        try:
                            cid=base64.b64decode(cid + '='*((4-len(cid)%4)%4)).decode('utf-8')
                        except Exception:
                            pass
                    if '@' in cid:
                        feed='https://calendar.google.com/calendar/ical/'+quote(cid,safe='')+'/public/basic.ics'
                        if feed not in feeds: feeds.append(feed)
            except Exception: pass
    # Some WordPress/calendar builders emit calendar URLs only inside script
    # data rather than as clickable anchors/iframes. Inspect the raw document too.
    try:
        from urllib.parse import unquote,quote
        import base64
        raw=html.replace('\\/','/')
        candidates=re.findall(r"https?[^\\\"'<>\\\\s]+",raw)
        for candidate in candidates:
            href=unquote(candidate.replace('\\u0026','&').replace('\\u003d','='))
            low=href.lower()
            if ('.ics' in low or '/ical/' in low) and href not in feeds:
                feeds.append(href)
            if 'calendar.google.com' in low:
                try:
                    qs=parse_qs(urlparse(href).query)
                    cid=(qs.get('src') or qs.get('cid') or [None])[0]
                    if cid:
                        cid=unquote(cid)
                        if '@' not in cid:
                            try: cid=base64.b64decode(cid + '='*((4-len(cid)%4)%4)).decode('utf-8')
                            except Exception: pass
                        if '@' in cid:
                            feed='https://calendar.google.com/calendar/ical/'+quote(cid,safe='')+'/public/basic.ics'
                            if feed not in feeds: feeds.append(feed)
                except Exception: pass
        # Also catch bare Google calendar IDs serialized by page builders.
        for cid in re.findall(r'([A-Za-z0-9_.%+\\-]+%40(?:group\\.)?calendar\\.google\\.com|[A-Za-z0-9_.+\\-]+@(?:group\\.)?calendar\\.google\\.com)',raw,re.I):
            cid=unquote(cid)
            feed='https://calendar.google.com/calendar/ical/'+quote(cid,safe='')+'/public/basic.ics'
            if feed not in feeds: feeds.append(feed)
    except Exception:
        pass
    return feeds

def events_from_multi_source_calendar(source):
    """Merge direct ICS and calendar hubs, then apply configured topic keywords."""
    ing=source.get('ingestion',{}); out=[]
    for u in ing.get('sources',[]):
        if str(u).lower().endswith('.ics') or 'ical' in str(u).lower():
            try: out.extend(events_from_ical(u,source))
            except Exception: pass
        else:
            try:
                html=request(u).text; extracted,feeds=extract_jsonld_events(html,source); out.extend(extracted)
                feeds.extend(discover_embedded_calendar_feeds(u,html))
                for feed in list(dict.fromkeys(feeds))[:12]:
                    try: out.extend(events_from_ical(feed,source))
                    except Exception: pass
            except Exception: pass
    terms=[str(x).lower() for x in ing.get('keywords',[])]
    if terms: out=[e for e in out if any(t in ' '.join(str(e.get(k) or '') for k in ('title','notes','venue','series')).lower() for t in terms)]
    return dedupe_events(out)

def events_from_visible_dated_page(url, source, category='community', series=None):
    """Conservative fallback for official/organization pages that render dated event cards as HTML."""
    if not BeautifulSoup: return []
    html=request(url).text
    soup=BeautifulSoup(html,'html.parser'); out=[]; today=now_local().date()
    # Prefer semantic/card-sized containers. Reject giant wrapper/navigation blocks.
    nodes=soup.find_all(['article','li','tr','section','div'])
    for node in nodes:
        text=clean_text(node.get_text(' '))
        if not text or len(text)<8 or len(text)>1200: continue
        d=_date_from_text(text)
        if not d or d < today-timedelta(days=7) or d > today+timedelta(days=370): continue
        # Avoid wrappers containing several different dates; child cards will be parsed separately.
        dates=set(re.findall(r'\\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+\\d{1,2}\\b',text,re.I))
        if len(dates)>1: continue
        h=node.find(['h1','h2','h3','h4','h5','strong'])
        title=clean_text(h.get_text(' ')) if h else ''
        if not title:
            # Use text before the date when it is a compact event-card label.
            dm=re.search(r'\\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?[,]?\\s*(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\\s+\\d{1,2}',text,re.I)
            title=clean_text(text[:dm.start()].strip(' -–—:|')) if dm else ''
        if not title or len(title)<3 or len(title)>180: continue
        if title.lower() in {'events','calendar','upcoming events','event calendar'}: continue
        tm=_time_from_text(text); ds=d.isoformat()
        link=node.find('a',href=True)
        source_url=urljoin(url,link['href']) if link else url
        venue=None
        # Keep location prose when a card labels it explicitly.
        vm=re.search(r'(?:location|where|venue)\\s*[:\\-]\\s*([^|]{3,120})',text,re.I)
        if vm: venue=clean_text(vm.group(1))
        out.append({'id':event_id(title,ds,venue),'title':title,'start':{'date':ds,'time':tm},'end':{'date':ds,'time':None},'venue':venue,'address':None,'category':category,'source_id':source['id'],'source_url':source_url,'cost':None,'public_access':'public','series':series or source.get('name'),'publish_candidate':True,'verification_status':'official_visible_event_page','notes':text[:500],'discovered_by':'visible_dated_page'})
    return dedupe_events(out)


def events_from_pma_hub(source):
    """Ingest PMA/Fine Arts events, preferring the private BAND WebCal subscription."""
    ing=source.get('ingestion',{}); hub=ing.get('hub_url') or source.get('url'); urls=[hub,ing.get('events_url')]
    debug={'hub_url':hub,'pages':[],'feeds':[],'events_by_feed':{},'band_secret_configured':False,'band_events':0}
    # BAND subscription is stored only in GitHub Actions secrets. Never persist
    # the token-bearing URL in diagnostics, source metadata, or generated events.
    band_url=os.environ.get('BAND_PMA_ICAL_URL','').strip()
    out=[]
    if band_url:
        debug['band_secret_configured']=True
        if band_url.startswith('webcal://'):
            band_url='https://'+band_url[len('webcal://'):]
        try:
            band_events=events_from_ical(band_url,source)
            for e in band_events:
                e['source_id']='pma-marching-band'
                e['source_url']=source.get('url')
                e['series']='PMA / Fine Arts — Marching Band'
                e['discovered_by']='band_private_ical'
                e['verification_status']='auto_primary_band_calendar'
            out.extend(band_events)
            debug['band_events']=len(band_events)
        except Exception as ex:
            debug['band_error']=type(ex).__name__+': '+str(ex).split('?',1)[0][:120]
    children=ing.get('child_calendars',[])
    for child in children:
        if isinstance(child,dict) and child.get('url'): urls.append(child['url'])
    # The PMA hub links to school-level Fine Arts calendar pages. Discover those
    # links by their configured names so a site redesign/URL change does not
    # require hard-coding every child URL.
    if hub and BeautifulSoup:
        try:
            hs=BeautifulSoup(request(hub).text,'html.parser')
            wanted=[clean_text(x.get('name')).lower() for x in children if isinstance(x,dict) and x.get('discover_from_hub') and x.get('name')]
            for a in hs.find_all('a',href=True):
                label=clean_text(a.get_text(' ')).lower()
                if any(name in label or label in name for name in wanted if label):
                    href=urljoin(hub,a['href'])
                    if href not in urls: urls.append(href)
        except Exception:
            pass
    events_url=ing.get('events_url') or source.get('url')
    # PMA publishes an Upcoming Events block on its homepage as well as /events.
    # Merge both so a redesign/outage of either presentation does not zero the calendar.
    for fallback_url in [events_url, 'https://norwoodpma.org/']:
        if not fallback_url: continue
        try:
            out.extend(events_from_visible_dated_page(fallback_url,source,category='performance',series='Norwood Parent Music Association'))
        except Exception: pass
    if events_url:
        try:
            out.extend(events_from_visible_dated_page(events_url,source,category='performance',series='Norwood Parent Music Association'))
            # PMA's event list may render date and title in sibling blocks rather than
            # one semantic card. Walk headings/links and use their nearest compact
            # parent text as a second, source-specific fallback.
            if BeautifulSoup:
                ps=BeautifulSoup(request(events_url).text,'html.parser'); today=now_local().date()
                for node in ps.find_all(['h1','h2','h3','h4','a','strong']):
                    title=clean_text(node.get_text(' '))
                    if not title or len(title)<4 or len(title)>180: continue
                    if title.lower() in {'events','calendar','read more','learn more'}: continue
                    parent=node
                    found=None
                    for _ in range(5):
                        parent=parent.parent if parent else None
                        if not parent: break
                        txt=clean_text(parent.get_text(' '))
                        if len(txt)>1400: break
                        d=_date_from_text(txt)
                        if d: found=(d,txt); break
                    if not found: continue
                    d,txt=found
                    if d < today-timedelta(days=7) or d > today+timedelta(days=370): continue
                    tm=_time_from_text(txt); ds=d.isoformat()
                    href=urljoin(events_url,node.get('href')) if node.name=='a' and node.get('href') else events_url
                    out.append({'id':event_id(title,ds,None),'title':title,'start':{'date':ds,'time':tm},'end':{'date':ds,'time':None},'venue':None,'address':None,'category':'performance','source_id':source['id'],'source_url':href,'cost':None,'public_access':'public','series':'Norwood Parent Music Association','publish_candidate':True,'verification_status':'pma_visible_events_page','notes':txt[:500],'discovered_by':'pma_events_page'})
        except Exception: pass
    for u in list(dict.fromkeys(x for x in urls if x)):
        page={'url':u,'feeds':[],'jsonld_events':0}
        try: html=request(u).text
        except Exception as ex:
            page['error']=str(ex)[:180]; debug['pages'].append(page); continue
        extracted,feeds=extract_jsonld_events(html,source); out.extend(extracted); page['jsonld_events']=len(extracted)
        feeds.extend(discover_embedded_calendar_feeds(u,html))
        feeds=list(dict.fromkeys(feeds))[:12]; page['feeds']=feeds
        for feed in feeds:
            if feed not in debug['feeds']: debug['feeds'].append(feed)
            try:
                got=events_from_ical(feed,source); out.extend(got)
                debug['events_by_feed'][feed]=len(got)
            except Exception as ex:
                debug['events_by_feed'][feed]={'error':str(ex)[:180]}
        debug['pages'].append(page)
    result=dedupe_events(out)
    debug['events_total']=len(result)
    try: (DATA/'pma-calendar-discovery.json').write_text(json.dumps(debug,indent=2)+'\\n')
    except Exception: pass
    return result

def events_from_miaa_committed_pdf(url, source):
    """Extract Norwood's dated varsity opponents from an MIAA committed-schedule grid PDF.

    MIAA's final commitment PDFs are generated from Arbiter. They omit some live
    details (notably later time/location changes), so this is a fallback only.
    """
    if not PdfReader: return []
    raw=request(url).content
    reader=PdfReader(BytesIO(raw)); out=[]
    sport='Athletics'
    low=url.lower()
    for key,label in [('field-hockey','Field Hockey'),('football','Football'),('fall-golf','Golf'),
                      ('boys-soccer','Boys Soccer'),('girls-soccer','Girls Soccer'),
                      ('fall-volleyball','Girls Volleyball')]:
        if key in low: sport=label; break
    for page in reader.pages:
        try: text=page.extract_text(extraction_mode='layout') or ''
        except TypeError: text=page.extract_text() or ''
        lines=text.splitlines()
        # In the four-column MIAA grid, locate the horizontal span belonging to
        # the Norwood heading, then read only date/opponent pairs in that column.
        header_i=None; start_col=None; end_col=None
        for i,line in enumerate(lines):
            pos=line.find('Norwood High School')
            if pos>=0:
                header_i=i; start_col=pos
                # Estimate this grid column's right edge from the next school heading.
                tail=line[pos+len('Norwood High School'):]
                m=re.search(r'\s{2,}\S',tail)
                end_col=(pos+len('Norwood High School')+m.start()+2) if m else pos+38
                break
        if header_i is None: continue
        # Schedule rows normally precede or follow the heading depending on the
        # page break. Scan the whole page but only the Norwood column slice.
        for line in lines:
            seg=line[start_col:max(end_col,start_col+28)]
            m=re.search(r'(?<!\d)(\d{1,2})/(\d{1,2})\s+(.+)',seg)
            if not m: continue
            month,day=int(m.group(1)),int(m.group(2))
            opponent=clean_text(re.split(r'\s{2,}',m.group(3))[0]).strip(' #!^')
            if not opponent or opponent.lower() in {'tba','(tba)'}: continue
            try: d=date(2026,month,day)
            except ValueError: continue
            ds=d.isoformat(); title=f"Norwood {sport} vs. {opponent}"
            out.append({
              'id':event_id(title,ds,'Norwood High School Athletics'),
              'title':title,'start':{'date':ds,'time':None},'end':{'date':ds,'time':None},
              'venue':'Norwood High School Athletics','address':None,'category':'sports',
              'source_id':source['id'],'source_url':url,'cost':None,
              'organizer':'Norwood High School Athletics','public_access':'public',
              'series':'Norwood High School Athletics','publish_candidate':True,
              'verification_status':'official_committed_schedule',
              'notes':'MIAA final committed schedule; check the live athletics schedule for time, location, and late changes.',
              'discovered_by':'miaa_committed_schedule'
            })
    return dedupe_events(out)

def events_from_arbiterlive(source):
    """Extract Norwood athletic contests from the school-directed ArbiterLive entity page."""
    url=source.get('url'); html=request(url).text
    out=[]; extracted,feeds=extract_jsonld_events(html,source); out.extend(extracted)
    debug={'entity_url':url,'scripts':[],'calendar_candidates':[],'schedule_candidates':[]}
    # ArbiterLive is client-rendered. Inspect its public script bundles for
    # calendar/schedule URLs that are not present in the initial HTML.
    if BeautifulSoup:
        root_soup=BeautifulSoup(html,'html.parser')
        for tag in root_soup.find_all('script',src=True)[:20]:
            try:
                asset=urljoin(url,tag.get('src')); js=request(asset,timeout=12).text
                debug['scripts'].append(asset)
            except Exception:
                continue
            for raw in re.findall(r'https?://[^"\\s<>]+',js,re.I):
                candidate=raw.replace('\\/','/').rstrip('),;')
                low=candidate.lower()
                if ('ical' in low or '.ics' in low) and candidate not in feeds:
                    feeds.append(candidate); debug['calendar_candidates'].append(candidate)
                if any(k in low for k in ['getgames','getevents','getteams','/api/']):
                    debug['schedule_candidates'].append(candidate)
    if BeautifulSoup:
        soup=BeautifulSoup(html,'html.parser')
        # Arbiter pages can expose team/schedule links and calendar subscriptions client-side.
        links=[]
        for a in soup.find_all('a',href=True):
            href=urljoin(url,a['href']); label=clean_text(a.get_text(' '))
            low=(href+' '+label).lower()
            if any(k in low for k in ['schedule','calendar','ical','.ics','team']) and href not in links:
                links.append(href)
            if ('ical' in low or '.ics' in low) and href not in feeds: feeds.append(href)
        for feed in list(dict.fromkeys(feeds))[:20]:
            try: out.extend(events_from_ical(feed,source))
            except Exception: pass
        # Follow a bounded set of official team/schedule pages and parse structured event data.
        for page in links[:30]:
            try:
                ph=request(page).text; rows,pfeeds=extract_jsonld_events(ph,source); out.extend(rows)
                for feed in pfeeds[:4]:
                    try: out.extend(events_from_ical(feed,source))
                    except Exception: pass
            except Exception: pass
    try:
        Path('data/arbiter-discovery.json').write_text(json.dumps(debug,indent=2) + '\\n')
    except Exception:
        pass
    # Prefer direct Arbiter records. If Arbiter is not machine-readable, use
    # MIAA's final committed schedules (generated from Arbiter) before giving up.
    if not out:
        for fb in source.get('ingestion',{}).get('fallback_sources',[]):
            try:
                if str(fb).lower().endswith('.pdf') and 'miaa.net/' in str(fb):
                    out.extend(events_from_miaa_committed_pdf(fb,source))
                elif 'miaa.net/group/' in str(fb):
                    fh=request(fb).text
                    rows,feds=extract_jsonld_events(fh,source); out.extend(rows)
                    for feed in feds[:8]:
                        try: out.extend(events_from_ical(feed,source))
                        except Exception: pass
            except Exception: pass
    for e in out:
        e['category']='sports'; e['series']='Norwood Public Schools Athletics'
    return dedupe_events(out)

def events_from_schoolnow(source):
    """Discover SchoolNow events and subscription feeds, including selectable calendars."""
    root=source.get('ingestion',{}).get('calendar_root') or source.get('url')
    html=request(root).text
    if not BeautifulSoup:return []
    soup=BeautifulSoup(html,'html.parser'); feeds=[]; out=[]
    extracted,xfeeds=extract_jsonld_events(html,source); out.extend(extracted); feeds.extend(xfeeds)
    for tag in soup.find_all(True):
        vals=[]
        if tag.name=='a' and tag.get('href'): vals.append(tag.get('href'))
        for attr in ['data-url','data-feed','data-ical','data-calendar-url','value','onclick']:
            if tag.get(attr): vals.append(str(tag.get(attr)))
        for raw in vals:
            for candidate in re.findall(r'https?://[^\\s\"\'<>]+|/[^\\s\"\'<>]+',raw):
                href=urljoin(root,candidate.replace('&amp;','&'))
                low=href.lower()
                if any(k in low for k in ['ical','ics','calendar/feed','calendarfeed']) and href not in feeds: feeds.append(href)
    # Search scripts/source for feed URLs not represented as clickable anchors.
    for raw in re.findall(r'[^\"\']*(?:ical|ics|calendar/feed)[^\"\']*',html,re.I):
        raw=raw.strip()
        if raw.startswith(('http','/')):
            href=urljoin(root,raw.replace('\\/','/').replace('&amp;','&'))
            if href not in feeds: feeds.append(href)
    if '/calendar' in root:
        guess=root.split('/calendar')[0]+'/calendar/feed/ical.ics'
        if guess not in feeds: feeds.append(guess)
    for feed in feeds[:30]:
        try: out.extend(events_from_ical(feed,source))
        except Exception: pass
    return dedupe_events(out)

def events_from_assabet(source):
    """Use Assabet's structured event records only; page-card scraping created duplicate junk titles."""
    url=source.get('ingestion',{}).get('calendar_url') or source.get('url')
    html=request(url).text
    extracted,ics=extract_jsonld_events(html,source); out=list(extracted)
    for feed in ics[:6]:
        try: out.extend(events_from_ical(feed,source))
        except Exception: pass
    # Event detail pages contain repeated date/time/location CTA cards ("Learn More",
    # "Monday, September...") that are not event titles. Do not turn those anchors
    # into separate events. The JSON-LD/ICS record is canonical.
    terms=[str(x).lower() for x in source.get('ingestion',{}).get('match',[])]
    if terms:
        out=[e for e in out if any(t in ' '.join(str(e.get(k) or '') for k in ('title','notes','venue','series')).lower() for t in terms)]
    return dedupe_events(out)

def classify_recreation_program(section='', title='', description=''):
    text=clean_text(' '.join([section,title,description])).lower()
    if any(x in text for x in ('special event','one day hit','paint night','camp out','recital','ticket')): return 'special_events'
    if 'drop in' in text or 'drop-in' in text: return 'drop_in'
    if any(x in text for x in ('vacation','summer program','summer playground','extended care','camp')): return 'camps_vacation'
    if any(x in text for x in ('sport','pickleball','softball','basketball','soccer','field hockey','volleyball','tennis','golf','swim','wrestling','cheer')): return 'sports_leagues'
    if any(x in text for x in ('fitness','zumba','yoga','kettlebell','spin class','moms who run')): return 'adult_fitness'
    if any(x in text for x in ('adult program','21y and up','18y and up')): return 'adult_programs'
    if any(x in text for x in ('tot program','youth','preschool','pre-school','kids','children','grades','karate','theater')): return 'youth_programs'
    if 'drop in' in text or 'drop-in' in text: return 'drop_in'
    return 'programs'

def recreation_programs_from_myrec(source):
    """Index MyRec program rows, including weekdays and published no-class dates."""
    if not BeautifulSoup: return []
    root=source.get('url') or 'https://norwoodma.myrec.com/info/activities/default.aspx'
    soup=BeautifulSoup(request(root).text,'html.parser')
    links=[]; section=''
    for node in soup.find_all(['h1','h2','h3','h4','a']):
        if node.name!='a':
            section=clean_text(node.get_text(' ')); continue
        href=urljoin(root,node.get('href',''))
        if 'program_details.aspx' in href and href not in [x[0] for x in links]: links.append((href,section))
    guides=read_json('recreation-guides.json',[])
    guide_url=(guides[-1].get('url') if guides and isinstance(guides[-1],dict) else None)
    out=[]
    for url,section in links[:250]:
        try: ps=BeautifulSoup(request(url).text,'html.parser')
        except Exception: continue
        h=ps.find('h1'); program=clean_text(h.get_text(' ')) if h else clean_text(ps.title.get_text(' ') if ps.title else '')
        table=ps.find('table'); page_text=clean_text(ps.get_text(' '))
        desc=''
        # MyRec repeats its entire navigation around each program. Prefer the
        # actual prose between "View Cart" and the activity table, then fall
        # back to nearby paragraph/div text only when that boundary is absent.
        prose_match=re.search(r'View Cart\s+(.*?)\s+Register Activity\b',page_text,re.I)
        if prose_match:
            desc=clean_text(prose_match.group(1))[:1800]
        elif table:
            chunks=[]
            for x in table.find_all_previous(['p','div'],limit=20):
                t=clean_text(x.get_text(' '))
                if t and t not in chunks and len(t)>25: chunks.append(t)
            desc=' '.join(reversed(chunks[-4:]))[:1800]
        category=classify_recreation_program(section,program,desc)
        # MyRec often publishes exclusions in prose: "No class ... 10/24, 11/21".
        excluded=[]
        exm=re.search(r'no\s+class(?:es)?[^.]{0,160}',page_text,re.I)
        if exm:
            for mm,dd,yy in re.findall(r'\b(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?\b',exm.group(0)):
                try:
                    year=int(yy) if yy else None
                    if year is not None and year<100: year+=2000
                    excluded.append((int(mm),int(dd),year))
                except Exception: pass
        rows=[]
        if table:
            headers=[]
            for tr in table.find_all('tr'):
                cells=[clean_text(x.get_text(' ')) for x in tr.find_all(['td','th'])]
                low=[x.lower() for x in cells]
                if 'activity' in low and 'days' in low:
                    headers=low; continue
                joined=' | '.join(cells)
                dm=re.search(r'(\d{2}/\d{2}/20\d{2})(?:\s*-\s*(\d{2}/\d{2}/20\d{2}))?',joined)
                tm=re.search(r'(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)',joined,re.I)
                if not dm: continue
                def iso(v):
                    try:return datetime.strptime(v,'%m/%d/%Y').date().isoformat()
                    except:return None
                def clock(v):
                    try:return datetime.strptime(v.upper(),'%I:%M %p').strftime('%H:%M')
                    except:return None
                start,end=iso(dm.group(1)),iso(dm.group(2) or dm.group(1))
                activity=program; days=None; ages=None; grades=None; fees=None
                if headers and len(cells)>=len(headers):
                    vals=dict(zip(headers,cells))
                    activity=vals.get('activity') or program; days=vals.get('days'); ages=vals.get('ages'); grades=vals.get('grades'); fees=vals.get('fees')
                if not days: days=next((x for x in cells if re.fullmatch(r'(?:M|Tu|W|Th|F|Sa|Su)(?:\s*[,/&]\s*(?:M|Tu|W|Th|F|Sa|Su))*',x,re.I)),None)
                if not ages: ages=next((x for x in cells if re.search(r'\d+y|and up|months?',x,re.I)),None)
                if not fees: fees=next((x for x in cells if '$' in x),None)
                venue=next((x for x in cells if re.search(r'Civic Center|Park|Pool|Court|Field|School|Center|Street|Ave|Road|Pond',x,re.I) and '$' not in x),None)
                if venue:
                    venue=re.sub(r'^.*?\\b(?:AM|PM)\\s+','',venue,flags=re.I).strip()
                    venue=re.sub(r'^\\d{1,2}/\\d{1,2}/\\d{4}\\s+','',venue).strip()
                session_based=bool(end and start and end>start)
                drop_in=bool(re.search(r'\bdrop[ -]?in\b',program+' '+activity+' '+desc,re.I))
                rows.append({'id':'rec-'+hashlib.sha1((url+'|'+activity+'|'+str(start)).encode()).hexdigest()[:12],
                  'name':activity or program,'program':program,'subcategory':category,'section':section,'description':desc,
                  'ages':ages,'grades':grades,'days':days,'start_date':start,'end_date':end,'start_time':clock(tm.group(1)) if tm else None,'end_time':clock(tm.group(2)) if tm else None,
                  'venue':venue,'fees':fees,'registration_url':url,'guide_url':guide_url,'session_based':session_based,'drop_in':drop_in,
                  'excluded_dates':excluded,'session_notice':('This activity is part of a multi-week Recreation session. The session may already be underway, and advance registration may be required. Check MyRec for current availability before attending.' if session_based and not drop_in else None),
                  'source':'Norwood Recreation Department','searchable':True})
        if rows: out.extend(rows)
        else: out.append({'id':'rec-'+hashlib.sha1(url.encode()).hexdigest()[:12],'name':program,'program':program,'subcategory':category,'section':section,'description':desc,'registration_url':url,'guide_url':guide_url,'session_based':False,'drop_in':bool(re.search(r'\bdrop[ -]?in\b',program+' '+desc,re.I)),'source':'Norwood Recreation Department','searchable':True})
    return out

def recreation_program_events(programs):
    """Expand MyRec session ranges onto their published weekdays, honoring no-class dates."""
    daymap={'m':0,'mo':0,'tu':1,'tue':1,'w':2,'we':2,'th':3,'thu':3,'f':4,'fr':4,'sa':5,'sat':5,'su':6,'sun':6}
    out=[]
    for r in programs or []:
        start=r.get('start_date'); end=r.get('end_date') or start
        if not start: continue
        try: a=date.fromisoformat(start); b=date.fromisoformat(end)
        except Exception: continue
        raw=clean_text(r.get('days'))
        tokens=re.findall(r'Tu|Th|Sa|Su|Mo|We|Fr|M|W|F',raw,re.I)
        weekdays={daymap[t.lower()] for t in tokens if t.lower() in daymap}
        dates=[]
        if weekdays:
            d=a
            while d<=b:
                if d.weekday() in weekdays: dates.append(d)
                d+=timedelta(days=1)
        else: dates=[a] if a==b else []
        excluded=set()
        for mm,dd,yy in r.get('excluded_dates') or []:
            years=[yy] if yy else list(range(a.year,b.year+1))
            for year in years:
                try: excluded.add(date(year,int(mm),int(dd)))
                except Exception: pass
        for d in dates:
            if d in excluded: continue
            ds=d.isoformat()
            out.append({'id':'rec-occurrence-'+str(r.get('id') or slug(r.get('name')))+'-'+ds,'title':r.get('name') or r.get('program'),
              'start':{'date':ds,'time':r.get('start_time')},'end':{'date':ds,'time':r.get('end_time')},
              'venue':r.get('venue'),'category':r.get('subcategory') or 'programs','source_id':'town-recreation-programs',
              'source_url':r.get('registration_url'),'registration_url':r.get('registration_url'),'guide_url':r.get('guide_url'),
              'organizer':'Norwood Recreation Department','cost':r.get('fees'),'public_access':'registration_required',
              'publish_candidate':True,'curated_default':False,'session_based':bool(r.get('session_based')),'drop_in':bool(r.get('drop_in')),
              'session_start':start,'session_end':end,'days':raw,'notes':r.get('session_notice') or r.get('description'),
              'rec_program_id':r.get('id'),'verification_status':'auto_primary_source','discovered_by':'myrec_program_weekday_expansion'})
    return out

def discover_recreation_guides(source):
    """Discover current/future seasonal Recreation guides without hard-coded edition URLs."""
    if not BeautifulSoup: return []
    ing=source.get('ingestion',{})
    pages=ing.get('guide_discovery_pages') or [
        'https://norwoodma.myrec.com/info/default.aspx',
        'https://norwoodma.myrec.com/info/activities/default.aspx'
    ]
    terms=('program guide','recreation guide','activity guide','seasonal guide','spring/summer','fall/winter')
    found=[]
    for page in pages:
        try: soup=BeautifulSoup(request(page).text,'html.parser')
        except Exception: continue
        for a in soup.find_all('a',href=True):
            label=clean_text(a.get_text(' '))
            href=urljoin(page,a['href'])
            hay=(label+' '+href).lower()
            if not any(t in hay for t in terms): continue
            if not href.startswith(('http://','https://')): continue
            season=None
            for token in ('spring/summer','fall/winter','spring','summer','fall','winter'):
                if token in hay:
                    season=token; break
            years=re.findall(r'20\\d{2}',hay)
            found.append({'title':label or 'Norwood Recreation seasonal guide','url':href,'season':season,'years':years[-2:],'discovered_from':page})
    chosen={}
    for x in found: chosen[x['url']]=x
    return list(chosen.values())

def events_from_myrec_facilities(source):
    """Parse MyRec facility-area reservation tables into conflict-calendar events."""
    if not BeautifulSoup: return []
    root=source.get('ingestion',{}).get('facility_root') or source.get('url') or 'https://norwoodma.myrec.com/info/facilities/default.aspx'
    soup=BeautifulSoup(request(root).text,'html.parser')
    links=list(source.get('ingestion',{}).get('seed_area_urls') or [])
    for a in soup.find_all('a',href=True):
        href=urljoin(root,a['href'])
        if ('area_info.aspx' in href or 'facilities/details.aspx' in href) and href not in links: links.append(href)
    expanded=[]
    for u in links[:100]:
        if 'area_info.aspx' in u:
            if u not in expanded: expanded.append(u)
        else:
            try:
                fs=BeautifulSoup(request(u).text,'html.parser')
                for a in fs.find_all('a',href=True):
                    href=urljoin(u,a['href'])
                    if 'area_info.aspx' in href and href not in expanded: expanded.append(href)
            except Exception: pass
    out=[]
    for url in expanded[:200]:
        try: ps=BeautifulSoup(request(url).text,'html.parser')
        except Exception: continue
        h=ps.find(['h1','h2']); venue=clean_text(h.get_text(' ')) if h else 'Norwood Recreation facility'
        for tr in ps.find_all('tr'):
            cells=[clean_text(x.get_text(' ')) for x in tr.find_all(['td','th'])]
            if len(cells)<3: continue
            row=' | '.join(cells)
            dm=re.search(r'\\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\s+([A-Z][a-z]+\\s+\\d{1,2},?\\s+20\\d{2})\\b',row)
            if not dm: continue
            d=parse_dt(dm.group(1))
            if not d: continue
            tm=re.search(r'\\b(\\d{1,2}:\\d{2}\\s*[AP]M)\\s*-\\s*(\\d{1,2}:\\d{2}\\s*[AP]M)\\b',row,re.I)
            di=next((i for i,c in enumerate(cells) if re.search(r'\\b20\\d{2}\\b',c)),len(cells))
            candidates=[c for c in cells[:di] if c and not re.fullmatch(r'(Program|Event|Teams|Date|Time)',c,re.I)]
            title=candidates[-1] if candidates else None
            if not title: continue
            def nt(v):
                try: return datetime.strptime(v.upper(),'%I:%M %p').strftime('%H:%M')
                except Exception: return None
            ds=d.date().isoformat()
            out.append({'id':event_id(title,ds,venue),'title':title,'start':{'date':ds,'time':nt(tm.group(1)) if tm else None},'end':{'date':ds,'time':nt(tm.group(2)) if tm else None},'venue':venue,'address':None,'category':'facility_reservation','source_id':source['id'],'source_url':url,'cost':None,'public_access':'unspecified','series':'Norwood Recreation facility reservations','publish_candidate':False,'verification_status':'auto_primary_source','notes':'Facility reservation/activity block; included for conflict checking, not presumed open to the public.','discovered_by':'myrec_facility_table'})
    return dedupe_events(out)

def source_allows_master_event(e, source=None):
    """Master dataset is intentionally broad; presentation layers decide what is shown by default."""
    if not e or not e.get('start',{}).get('date'): return False
    # The master pool powers conflict checking as well as public presentation,
    # so restricted/unknown reservations may remain here. publish_candidate and
    # the access classifier control What's Happening visibility instead.
    title=clean_text(e.get('title'))
    if not title or canonical_title(title) in {'recurring','recurrence','all events'}: return False
    return True

def legacy_expanded_calendar_events():
    """Carry forward the broader scheduling dataset into the master event pool.

    possible-conflicts.json predates the unified source registry. Normalize its
    records here so Check All / Conflict Contraption / search do not lose that
    coverage while source-specific live adapters replace the legacy records.
    """
    raw=read_json('possible-conflicts.json',{})
    rows=raw.get('events',[]) if isinstance(raw,dict) else (raw if isinstance(raw,list) else [])
    out=[]
    for old in rows:
        if not isinstance(old,dict): continue
        start=old.get('start'); end=old.get('end')
        if isinstance(start,str):
            if 'T' in start: sd,st=start.split('T',1); st=st[:5]
            else: sd,st=start,None
            start={'date':sd,'time':st}
        if isinstance(end,str):
            if 'T' in end: ed,et=end.split('T',1); et=et[:5]
            else: ed,et=end,None
            end={'date':ed,'time':et}
        if not isinstance(start,dict) or not start.get('date'): continue
        e={
          'id':old.get('id') or event_id(old.get('title','event'),start.get('date'),old.get('location','')),
          'title':old.get('title'), 'start':start, 'end':end or {'date':start.get('date'),'time':None},
          'venue':old.get('venue') or old.get('location'), 'address':old.get('address'),
          'category':old.get('category') or 'scheduling', 'source_id':old.get('source_id') or 'expanded-calendar-legacy',
          'source_url':old.get('source_url'), 'registration_url':old.get('registration_url'),
          'cost':old.get('cost'), 'public_access':old.get('public_access') or 'unspecified',
          'series':old.get('organization'), 'publish_candidate':bool(old.get('main_calendar_eligible',False)),
          'curated_default':bool(old.get('main_calendar_eligible',False)),
          'verification_status':old.get('verification_status') or 'legacy_verified',
          'notes':old.get('notes'), 'discovered_by':'expanded_calendar_legacy'
        }
        if source_allows_master_event(e): out.append(e)
    return out


def refresh_events(offline=False):
    seeds=read_json('events-seed.json',[])
    registry=read_json('source-registry.json',[])
    events=list(seeds)+events_from_vfw_meat_raffle(); status=[]
    previous_health={x.get('source_id'):x for x in read_json('calendar-source-health.json',[]) if isinstance(x,dict)}
    checked_at=now_local().isoformat()
    if not offline:
        event_outputs={'events','school_events','sports_events','fundraisers'}
        for src in [x for x in registry if x.get('active_monitor') and event_outputs.intersection(x.get('produces',[]))]:
            method=src.get('ingestion',{}).get('method'); got=[]; note=''
            try:
                if method=='home_depot_kids_workshops': got=events_from_home_depot_kids_workshops(src)
                elif method=='selectmen_car_washes': got=events_from_selectmen_car_washes(src)
                elif method=='ncm_school_broadcasts': got=events_from_ncm_school_broadcasts(src)
                elif method=='community_submission_json': got=events_from_community_submission_feed(src)
                elif method=='recurring_service_schedule' and src.get('id')=='norwood-food-pantry-hours': got=events_from_norwood_food_pantry(src)
                elif method=='tribe_events': got=events_from_tribe(src)
                elif method=='schoolnow_calendar': got=events_from_schoolnow(src)
                elif method=='arbiterlive_schedule': got=events_from_arbiterlive(src)
                elif method=='pma_calendar_hub': got=events_from_pma_hub(src)
                elif method=='multi_source_calendar': got=events_from_multi_source_calendar(src)
                elif method=='newsletter_calendar': got=events_from_newsletter_index(src)
                elif method=='clubrunner_calendar': got=events_from_clubrunner(src)
                elif method=='dated_event_pages': got=events_from_dated_event_pages(src)
                elif method=='verified_recurring_schedule': got=events_from_verified_recurrence(src)
                elif method=='nys_multi_schedule': got=events_from_nys_multi_schedule(src)
                elif method=='league_schedule_table': got=events_from_league_schedule(src)
                elif method=='local_town_pages_calendar': got=events_from_secondary_listing(src)
                elif method=='social_mirror': got=events_from_social_mirror(src)
                elif method=='assabet_calendar': got=events_from_assabet(src)
                elif method=='assabet_filtered_calendar': got=events_from_assabet(src)
                elif method=='myrec_facility_calendar': got=events_from_myrec_facilities(src)
                elif method=='ical':
                    feed=src.get('ingestion',{}).get('feed_url')
                    if not feed and src.get('id')=='nps-district-ical': feed='https://www.norwood.k12.ma.us/about/calendar/feed/ical.ics'
                    if feed: got=events_from_ical(feed,src)
                    else: note='no direct feed_url configured'
                elif method in {'html_calendar','html_list','html_hub','html_page','embedded_calendar','club_calendar','secondary_discovery','church_events_calendar','squarespace_events','growthzone_calendar','organization_event_discovery','event_platform_discovery','structured_registration_discovery','ticketing_calendar','town_department_event_discovery','school_parent_org_composite','secondary_org_event_discovery','multi_source_org_discovery','seasonal_org_event_discovery','derived_verified_series','local_town_pages_calendar' ,'recurring_org_schedule','schoolnow_calendar','secondary_recurring_discovery','sportsconnect_schedule'}:
                    ing=src.get('ingestion',{})
                    # Common adapter metadata uses several URL field names. Feed all
                    # public page URLs through the conservative Event/ICS discovery
                    # path so configured sources are actually checked every refresh.
                    urls=[]
                    for candidate in [src.get('url'),ing.get('calendar_url'),ing.get('primary_url'),ing.get('root_url'),ing.get('team_directory'),ing.get('schedule_url'),ing.get('program_url'),ing.get('facility_root'),ing.get('hub_url')]+list(ing.get('discovery_urls') or [])+list(ing.get('secondary_urls') or [])+list(ing.get('sources') or [])+list(ing.get('child_calendars') or []):
                        if candidate and candidate not in urls: urls.append(candidate)
                    source_ids=ing.get('parent_source_ids') or []
                    if method=='derived_verified_series' and source_ids:
                        parents=set(source_ids); terms=[str(x).lower() for x in ing.get('match',[])]
                        for existing in events:
                            text=' '.join(str(existing.get(k) or '') for k in ('title','series','notes','venue')).lower()
                            if existing.get('source_id') in parents and (not terms or any(t in text for t in terms)):
                                copy=dict(existing); copy['source_id']=src['id']; copy['discovered_by']='derived_verified_series'
                                got.append(copy)
                    else:
                        terms=[str(x).lower() for x in ing.get('match',[])]
                        page_errors=[]
                        pages_checked=0
                        for page_url in urls[:6]:
                            try:
                                if '/events/list' in page_url:
                                    try:
                                        temp=dict(src); temp['url']=page_url; got.extend(events_from_tribe(temp))
                                    except Exception:
                                        pass
                                html=request(page_url).text
                                pages_checked += 1
                                temp=dict(src); temp['url']=page_url
                                extracted,ics=extract_jsonld_events(html,temp)
                                if method=='town_department_event_discovery' and not extracted:
                                    try: extracted.extend(events_from_visible_dated_page(page_url,temp,category='community',series=src.get('name')))
                                    except Exception: pass
                                if terms:
                                    extracted=[e for e in extracted if any(t in ' '.join(str(e.get(k) or '') for k in ('title','notes','venue','series')).lower() for t in terms)]
                                got.extend(extracted)
                                for u in ics[:4]:
                                    try:
                                        rows=events_from_ical(u,temp)
                                        if terms: rows=[e for e in rows if any(t in ' '.join(str(e.get(k) or '') for k in ('title','notes','venue','series')).lower() for t in terms)]
                                        got.extend(rows)
                                    except Exception:
                                        pass
                            except Exception as page_ex:
                                page_errors.append(f"{page_url}: {str(page_ex)[:100]}")
                        if pages_checked==0 and page_errors:
                            raise RuntimeError('all configured pages failed: '+' | '.join(page_errors[:3]))
                        if page_errors:
                            note=f"{len(page_errors)} configured page(s) unavailable; remaining sources checked"
                    got=dedupe_events(got)
                    if not got: note='configured pages checked; no matching machine-readable Event/ICS found'
                else: note=f'method {method} requires discovery/manual adapter'
                got=[apply_public_access(e,src) for e in got]
                got=[e for e in got if source_allows_master_event(e,src)]
                events.extend(got)
                status.append({'source_id':src['id'],'ok':True,'method':method,'found':len(got),'note':note})
            except Exception as ex:
                status.append({'source_id':src['id'],'ok':False,'method':method,'found':0,'note':str(ex)[:180]})
    events=current_events(dedupe_events(events+legacy_expanded_calendar_events()+([] if offline else town_master_calendar_events())))
    write_json('events.json',events); write_js('events-data.js','NORWOOD_EVENTS',events)
    if not offline:
        health=[]
        by_id={x.get('id'):x for x in registry}
        for row in status:
            sid=row.get('source_id'); src=by_id.get(sid,{})
            if not src.get('health_policy',{}).get('track_last_checked'): continue
            prev=previous_health.get(sid,{})
            ok=bool(row.get('ok')); found=int(row.get('found') or 0)
            policy=src.get('health_policy',{})
            access_limited=False
            # A source can be live but intentionally reject automated clients (401/403).
            # When the registry explicitly opts into this policy, report that condition
            # separately instead of aging a valid source into a false "stale" failure.
            if not ok and policy.get('blocked_fetch_is_failure') is False:
                note_text=str(row.get('note') or '')
                if re.search(r'\\b(?:401|403)\\b|forbidden|unauthorized',note_text,re.I):
                    ok=True
                    access_limited=True
                    row['note']=(note_text+'; automated access blocked — source remains active/limited').strip('; ')
            # Some seasonal sources (notably athletics) are expected to be non-empty
            # while school is in session. Treat an empty parse as an ingestion failure
            # when the registry explicitly says zero is a failure.
            if ok and found==0 and policy.get('empty_result_is_failure'):
                ok=False
                row['note']=(row.get('note') or 'source returned zero events')+'; zero events is configured as a failure'
            successful=ok and found>0
            failures=0 if ok else int(prev.get('consecutive_failures') or 0)+1
            last_success=checked_at if successful else prev.get('last_successful_update')
            last_healthy_check=checked_at if ok else prev.get('last_healthy_check')
            stale=False; stale_reason=None
            if failures>=3:
                stale=True; stale_reason=f'{failures} consecutive refresh failures'
            elif last_success:
                d=parse_dt(last_success)
                if d and now_local()-d.astimezone(TZ)>timedelta(days=30):
                    stale=True; stale_reason='no successful update in 30 days'
            health.append({'source_id':sid,'last_checked':checked_at,'last_healthy_check':last_healthy_check,'last_successful_update':last_success,'consecutive_failures':failures,'last_found':found,'ok':ok,'access_limited':access_limited,'stale':stale,'stale_reason':stale_reason,'note':row.get('note') or None})
        # Preserve tracked sources that were not attempted in this run so one
        # partial adapter failure does not erase their historical health record.
        attempted_ids={x.get('source_id') for x in health}
        for sid,prev in previous_health.items():
            if sid not in attempted_ids and sid in by_id and by_id[sid].get('active_monitor'):
                health.append(prev)
        health.sort(key=lambda x:str(x.get('source_id') or ''))
        write_json('calendar-source-health.json',health)
        write_js('calendar-source-health-data.js','NORWOOD_CALENDAR_SOURCE_HEALTH',health)
    return events,status

def usable_news_image(url, base_url=''):
    """Return an absolute http(s) image URL, rejecting tiny/data/icon assets."""
    url=clean_text(url)
    if not url or url.startswith(('data:','blob:')): return None
    url=urljoin(base_url,url)
    if not url.startswith(('http://','https://')): return None
    low=url.lower()
    if re.search(r'(favicon|logo|sprite|avatar|icon)(?:[._/-]|$)',low): return None
    return url

def image_from_soup(soup, base_url=''):
    """Prefer publisher social/article metadata, then article JSON-LD imagery."""
    if not soup: return None
    for attrs in ({'property':'og:image'},{'property':'og:image:url'},{'name':'twitter:image'},{'name':'twitter:image:src'}):
        tag=soup.find('meta',attrs=attrs)
        img=usable_news_image(tag.get('content') if tag else '',base_url)
        if img: return img
    for tag in soup.find_all('script',attrs={'type':'application/ld+json'}):
        try: payload=json.loads(tag.string or tag.get_text() or '{}')
        except Exception: continue
        for o in walk_jsonld(payload):
            if not isinstance(o,dict): continue
            raw=o.get('image')
            candidates=raw if isinstance(raw,list) else [raw]
            for candidate in candidates:
                if isinstance(candidate,dict): candidate=candidate.get('url') or candidate.get('contentUrl')
                img=usable_news_image(candidate,base_url)
                if img: return img
    return None

def image_from_card(card, base_url=''):
    if not card or not hasattr(card,'find'): return None
    img=card.find('img')
    if not img: return None
    raw=img.get('src') or img.get('data-src') or img.get('data-lazy-src') or img.get('data-original')
    if not raw and img.get('srcset'):
        raw=img.get('srcset').split(',')[-1].strip().split(' ')[0]
    return usable_news_image(raw,base_url)

def enrich_article_image(url):
    """Fetch a direct publisher page and return its primary article/social image."""
    if not url or 'news.google.com' in url: return None
    try:
        html=request(url,timeout=12).text
        soup=BeautifulSoup(html,'html.parser') if BeautifulSoup else None
        return image_from_soup(soup,url)
    except Exception:
        return None

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
            image=None
            enc=item.find('enclosure')
            if enc is not None and str(enc.get('type') or '').startswith('image/'):
                image=usable_news_image(enc.get('url'),link)
            if not image:
                for child in list(item):
                    tag=str(child.tag).lower()
                    if tag.endswith('thumbnail') or tag.endswith('content'):
                        candidate=child.get('url')
                        if candidate and (tag.endswith('thumbnail') or str(child.get('medium') or '').lower()=='image' or str(child.get('type') or '').lower().startswith('image/')):
                            image=usable_news_image(candidate,link)
                            if image: break
            row={'source':source_name,'title':title,'date':d.astimezone(TZ).isoformat(),'url':link,'summary':desc[:220],'localVerified':True,'discovered_by':'scheduled_rss'}
            if image: row['image']=image
            out.append(row)
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
            if title and d and url:
                row={'source':source_name,'title':title,'date':d.astimezone(TZ).isoformat(),'url':url,'summary':desc[:220],'localVerified':True,'discovered_by':'scheduled_jsonld'}
                raw=o.get('image'); candidates=raw if isinstance(raw,list) else [raw]
                for candidate in candidates:
                    if isinstance(candidate,dict): candidate=candidate.get('url') or candidate.get('contentUrl')
                    image=usable_news_image(candidate,url)
                    if image: row['image']=image; break
                out.append(row)
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
        row={'source':source_name,'title':title,'date':d.astimezone(TZ).isoformat(),'url':url,'summary':desc,'localVerified':True,'discovered_by':'scheduled_semantic_html'}
        image=image_from_card(card,source_url)
        if image: row['image']=image
        out.append(row)
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
        row={'source':source_name,'title':title,'date':d.astimezone(TZ).isoformat(),'url':url,'summary':summary,'localVerified':True,'discovered_by':'scheduled_visible_date'}
        image=image_from_card(card,source_url)
        if image: row['image']=image
        out.append(row)
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
        row={'source':source_name,'title':clean_title,'date':d.astimezone(TZ).isoformat(),'url':href,'summary':'','localVerified':True,'discovered_by':'scheduled_link_date'}
        image=image_from_card(a.parent if a.parent else a,source_url)
        if image: row['image']=image
        out.append(row)
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

BLOCKED_NEWS_SOURCES={'maxpreps','maxpreps.com'}

def news_source_blocked(source):
    """Block publishers by normalized name/domain, including Google News attribution variants."""
    s=clean_text(source).lower().strip()
    s=re.sub(r'^https?://','',s).split('/')[0]
    s=s[4:] if s.startswith('www.') else s
    return s in BLOCKED_NEWS_SOURCES or s.endswith('.maxpreps.com')

def news_is_routine_game_listing(x):
    text=' '.join(str(x.get(k) or '') for k in ('title','summary','source')).lower()
    # Routine single-game schedule/result cards are not Norwood.ma news.
    sports=['soccer','football','basketball','baseball','softball','hockey','volleyball','lacrosse','field hockey','wrestling','tennis','golf']
    matchup=bool(re.search(r'\b(?:@|vs\.?|versus)\b', text))
    levels=bool(re.search(r'\b(?:varsity|jv|junior varsity|freshman)\b', text))
    return matchup and levels and any(sp in text for sp in sports)

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
        if not title or not link or not d or wrong.search(combined) or news_source_blocked(source): continue
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
        if x.get('image'): v+=1
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
        if cutoff <= d <= latest and not news_is_obituary(x) and not news_source_blocked(x.get('source')) and not news_is_routine_game_listing(x):
            out.append(x)
    return dedupe_news(out)[:120]


def events_from_local_news(items, offline=False):
    """Conservatively promote clearly future, public local-event reporting into the calendar."""
    if offline: return []
    out=[]; today=now_local().date()
    for x in items:
        title=clean_text(x.get('title')); summary=clean_text(x.get('summary')); url=x.get('url') or ''
        if not title or not url or not local_news_event_candidate(f"{title} {summary}"): continue
        # Only direct publisher pages are eligible; discovery/aggregator redirects are not authoritative enough.
        if 'news.google.com' in url: continue
        try:
            html=request(url).text
            if not BeautifulSoup: continue
            soup=BeautifulSoup(html,'html.parser')
            for n in soup(['script','style','nav','footer','header']): n.decompose()
            body=clean_text(soup.get_text(' '))
        except Exception:
            continue
        text=f"{title} {summary} {body}"
        d=_date_from_text(text); tm=_time_from_text(text)
        if not d or d < today or d > today+timedelta(days=180) or not tm: continue
        low=text.lower()
        # Require an explicit public-event signal and Norwood context before promotion.
        if 'norwood' not in low: continue
        venue='Norwood, MA'
        venue_patterns=[
          r'\bat (?:the )?(Old Parish Cemetery)\b',
          r'\bat (?:the )?(Town Common)\b',
          r'\bat (?:the )?(Morrill Memorial Library)\b',
          r'\bat (?:the )?(Norwood Senior Center)\b'
        ]
        for pat in venue_patterns:
            m=re.search(pat,text,re.I)
            if m: venue=clean_text(m.group(1)); break
        event_title=title
        # News-style headlines should become concise event labels.
        if 'stonecut' in low and ('demo' in low or 'demonstration' in low):
            event_title='Stonecutting Demonstration & Talk'
        ds=d.isoformat()
        out.append({
          'id':event_id(event_title,ds,venue),'title':event_title,
          'start':{'date':ds,'time':tm},'end':{'date':ds,'time':None},
          'venue':venue,'address':None,'category':category_from(text),
          'source_id':'local-news-event-discovery','source_url':url,'cost':None,
          'public_access':'public','series':x.get('source'),'publish_candidate':True,
          'curated_default':True,'verification_status':'reported_future_public_event',
          'notes':'Future public event reported by a local news source; follow the linked article for details.',
          'discovered_by':'local_news_future_event'
        })
    return dedupe_events(out)


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
        # Backfill thumbnails for existing direct-publisher stories as well as new ones.
        if not x.get('image') and 'news.google.com' not in x.get('url',''):
            image=enrich_article_image(x.get('url'))
            if image: x['image']=image
    
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

def town_master_calendar_events(days=185):
    """Ingest every public event exposed by the Town's shared Revize Master Calendar.

    Individual Town departments can then be selected/filtered without maintaining
    separate page scrapers when they publish into the same Town calendar backend.
    """
    today=now_local().date(); out=[]
    endpoint=('https://www.norwoodma.gov/_assets_/plugins/revizeCalendar/calendar_data_handler.php'
              '?webspace=norwoodma25&relative_revize_url=//cms5.revize.com&protocol=https:')
    for row in _town_calendar_data():
        title=clean_text(row.get('title') or row.get('summary') or row.get('name'))
        raw_start=row.get('start') or row.get('start_date') or row.get('date') or row.get('event_start')
        if not title or not raw_start: continue
        try:
            dt=dtparser.parse(str(raw_start)) if dtparser else datetime.fromisoformat(str(raw_start).replace('Z','+00:00'))
            if dt.tzinfo: dt=dt.astimezone(TZ)
        except Exception: continue
        d=dt.date()
        if d < today-timedelta(days=7) or d > today+timedelta(days=days): continue
        all_day=not bool(re.search(r'T\\d{1,2}:\\d{2}',str(raw_start)))
        st=None if all_day else dt.strftime('%H:%M')
        et=None; edate=d.isoformat()
        raw_end=row.get('end') or row.get('end_date') or row.get('event_end')
        if raw_end:
            try:
                ed=dtparser.parse(str(raw_end)) if dtparser else datetime.fromisoformat(str(raw_end).replace('Z','+00:00'))
                if ed.tzinfo: ed=ed.astimezone(TZ)
                edate=ed.date().isoformat(); et=None if all_day else ed.strftime('%H:%M')
            except Exception: pass
        blob=' '.join(clean_text(str(row.get(k) or '')) for k in ('department','category','calendar','group','description','location','venue','title')).lower()
        dept='Town of Norwood'
        for needle,label in [('senior','Norwood Senior Center'),('council on aging','Norwood Senior Center'),('recreation','Norwood Recreation'),('police','Norwood Police Department'),('fire','Norwood Fire Department'),('veteran','Norwood Veterans Services'),('public works','Norwood DPW'),('dpw','Norwood DPW'),('conservation','Norwood Conservation'),('library','Morrill Memorial Library')]:
            if needle in blob: dept=label; break
        href=row.get('url') or row.get('link') or endpoint
        out.append({'id':event_id(title,d.isoformat(),dept),'title':title,'start':{'date':d.isoformat(),'time':st},'end':{'date':edate,'time':et},
                    'venue':clean_text(row.get('location') or row.get('venue')) or None,'address':None,'category':'government' if IMPORTANT_MEETING_RE.search(title) else 'community',
                    'source_id':'town-master-calendar','source_url':href,'registration_url':None,'cost':None,'public_access':'public','series':dept,
                    'publish_candidate':True,'verification_status':'verified_town_master_calendar','notes':clean_text(row.get('description')) or None,'discovered_by':'town_revize_master_calendar'})
    return dedupe_events(out)


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
        for idx,row in enumerate(rows):
            m=IMPORTANT_MEETING_RE.search(row.get('title',''))
            if not m: continue
            # If Cablecast shows a later, distinct program on the Government channel,
            # that transition is positive evidence that this meeting broadcast ended.
            # Missing/ambiguous schedule data is never treated as an early end.
            broadcast_end=None
            for later in rows[idx+1:]:
                if not later.get('time') or later.get('time') <= (row.get('time') or ''):
                    continue
                if canonical_title(later.get('title','')) == canonical_title(row.get('title','')):
                    continue
                broadcast_end=later.get('time')
                break
            out.append({'kind':'meeting','title':m.group(1),'date':d.isoformat(),
                        'start_time':row.get('time'),'end_time':None,
                        'broadcast_end_time':broadcast_end,
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
        # Calendar entries should be self-explanatory: commission/committee/board
        # names are meetings, not generic events. Preserve titles that already
        # say meeting/hearing/session to avoid awkward duplication.
        if not re.search(r'\b(meeting|hearing|session)\b', title, re.I):
            title=f"{title} Meeting"
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
    program={'community_submission_json','tribe_events','ical','html_calendar','html_list','html_hub','html_page','embedded_calendar','club_calendar','secondary_discovery','church_events_calendar','squarespace_events','growthzone_calendar','organization_event_discovery','town_department_event_discovery','school_parent_org_composite','secondary_org_event_discovery','multi_source_org_discovery','seasonal_org_event_discovery','derived_verified_series','assabet_calendar','assabet_filtered_calendar','clubrunner_calendar','league_schedule_table','multi_source_calendar','myrec_facility_calendar','newsletter_calendar','pma_calendar_hub','recurring_org_schedule','schoolnow_calendar','secondary_recurring_discovery','social_mirror','sportsconnect_schedule','selectmen_car_washes','home_depot_kids_workshops','verified_recurring_schedule','nys_multi_schedule'}
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
    sid=str(e.get('source_id') or '').lower()
    if sid in [str(x).lower() for x in selector.get('source_ids',[])]: return True
    if any(sid.startswith(str(x).lower()) for x in selector.get('source_id_prefixes',[])): return True
    cat=str(e.get('category') or '').lower()
    text=' '.join(str(e.get(k) or '') for k in ('title','notes','venue','category','organizer','source_id')).lower()
    if cat in [str(x).lower() for x in selector.get('categories',[])]: return True
    if any(str(x).lower() in cat for x in selector.get('category_contains',[])): return True
    if any(str(x).lower() in text for x in selector.get('keywords',[])): return True
    return False

def event_is_curated_default(e):
    """Match the normal What's Happening default without making broad calendar tags do browser-side inference."""
    if e.get('curated_default') is True or e.get('whats_happening_default') is True: return True
    sid=str(e.get('source_id') or '').lower()
    if sid in ('library-assabet-calendar','library-cfce'): return True
    access=str(e.get('public_access') or 'public').lower()
    if access in ('private','members_only'): return False
    cat=str(e.get('category') or '').lower()
    text=' '.join(str(e.get(k) or '') for k in ('title','series','notes')).lower()
    if re.search(r'practice|routine meeting|member meeting|board meeting',text): return False
    if sid=='recovery-aa' or sid.startswith('recovery-'): return True
    return cat in ('community','family','arts','festival','fundraiser','government','school','holiday','market','workshop','live_music','performance','comedy','wellness','games_social','music_community') or bool(re.search(r'farmers market|concert|festival|norwood day|tree lighting|menorah|parade|blood drive|5k|open house|town common',text))

def assign_calendar_ids(events):
    """Precompute multi-calendar membership once during refresh; browser filtering becomes set intersection."""
    defs=read_json('calendar-sources.json',[])
    selectable=[s for s in defs if s.get('id')!='norwood-community' and s.get('selector')]
    for e in events:
        ids=set(str(x) for x in (e.get('calendar_ids') or []) if x)
        if event_is_curated_default(e): ids.add('norwood-community')
        for s in selectable:
            if event_matches_selector(e,s.get('selector')): ids.add(str(s.get('id')))
        sid=str(e.get('source_id') or '').lower()
        cat=str(e.get('category') or '').lower()
        if sid in ('town-recreation-programs','norwood-recreation'):
            ids.add('rec-all')
            rec_map={'special_events':'rec-special-events','youth_programs':'rec-youth','adult_fitness':'rec-adult-fitness','sports_leagues':'rec-sports','drop_in':'rec-drop-in','camps_vacation':'rec-camps'}
            if cat in rec_map: ids.add(rec_map[cat])
        if sid=='resource-norwood-youth-soccer':
            team=str(e.get('team') or '').strip(); grade=str(e.get('grade') or '').strip()
            if team:
                key=re.sub(r'[^a-z0-9]+','-',(grade+'|'+team).lower()).strip('-')
                ids.add('nys-team-'+key)
        e['calendar_ids']=sorted(ids)
    return events

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
    events,ev_status=refresh_events(args.offline)
    news,nw_status=refresh_news(args.offline)
    news_events=events_from_local_news(news,args.offline)
    civic_notices=refresh_civic_notices(news,args.offline)
    registry=read_json('source-registry.json',[])
    guide_source=next((x for x in registry if x.get('id')=='town-recreation-programs'),None)
    rec_programs=[]
    if guide_source and not args.offline:
        try: rec_programs=recreation_programs_from_myrec(guide_source)
        except Exception as ex: print('Recreation program ingestion warning:',str(ex)[:180])
    elif args.offline:
        rec_programs=read_json('recreation-programs.json',[])
    # Preserve the last successful MyRec snapshot before expanding occurrences;
    # otherwise a transient empty response would erase Recreation events for a run.
    if not rec_programs:
        rec_programs=read_json('recreation-programs.json',[])
    rec_occurrences=recreation_program_events(rec_programs)
    # The generic source adapter does not generate MyRec program rows itself.
    # Reconcile source health with the dedicated program generator so the health
    # report reflects the actual ingestion result instead of misleadingly saying 0.
    for status in ev_status:
        if status.get('source_id')=='town-recreation-programs':
            status['ok']=bool(rec_programs)
            status['method']='myrec_programs'
            status['found']=len(rec_programs)
            status['note']=f"{len(rec_occurrences)} calendar occurrences generated" if rec_programs else 'No Recreation programs available; last successful snapshot unavailable'
    events=current_events(dedupe_events(events+civic_meetings_to_events(civic_notices)+rec_occurrences+news_events))
    events=assign_calendar_ids(events)
    write_json('events.json',events); write_js('events-data.js','NORWOOD_EVENTS',events); calendar_feeds=write_calendar_feeds(events)
    if guide_source and guide_source.get('ingestion',{}).get('discover_seasonal_guides'):
        try:
            found=discover_recreation_guides(guide_source); previous=read_json('recreation-guides.json',[])
            by_url={x.get('url'):dict(x) for x in previous if isinstance(x,dict) and x.get('url')}
            nowstamp=now_local().isoformat()
            for g in found:
                old=by_url.get(g.get('url'),{})
                g['first_seen']=old.get('first_seen') or nowstamp; g['last_seen']=nowstamp; by_url[g.get('url')]=g
            guides=list(by_url.values())
            write_json('recreation-guides.json',guides); write_js('recreation-guides-data.js','NORWOOD_RECREATION_GUIDES',guides)
        except Exception as ex: print('Recreation guide discovery warning:',str(ex)[:180])
    # Always publish the Recreation artifacts so pages never reference a missing file.
    # If a live MyRec fetch temporarily returns no programs, preserve the last known
    # successful snapshot instead of deleting the calendar/search data.
    if not rec_programs:
        rec_programs=read_json('recreation-programs.json',[])
    write_json('recreation-programs.json',rec_programs); write_js('recreation-programs-data.js','NORWOOD_RECREATION_PROGRAMS',rec_programs)
    cov=coverage(registry); write_json('automation-coverage.json',cov)
    report={'generated_at':now_local().isoformat(),'offline':args.offline,'events_published':len(events),'news_published':len(news),'civic_notices':len(civic_notices),'calendar_feeds':calendar_feeds,'recreation_programs':len(rec_programs),'recreation_occurrences':len([e for e in events if e.get('source_id')=='town-recreation-programs']),'event_sources':ev_status,'news_sources':nw_status}
    write_json('refresh-status.json',report)
    print(json.dumps({'events':len(events),'news':len(news),'civic_notices':len(civic_notices),'recreation_programs':len(rec_programs),'coverage':cov},indent=2))
if __name__=='__main__': main()
