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
      'tree lighting','menorah lighting','trunk or treat'
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
    """Keep events through seven days after they end, then purge them from generated data."""
    today=now_local().date()
    purge_before=today-timedelta(days=7)
    out=[]
    for e in events:
        if not e.get('publish_candidate',True): continue
        sd=e.get('start',{}).get('date'); ed=e.get('end',{}).get('date') or sd
        try: endd=date.fromisoformat(ed)
        except Exception: continue
        if endd < purge_before: continue
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

def events_from_newsletter_index(source):
    """Discover current Senior Center newsletter/calendar documents without inventing recurrences."""
    ing=source.get('ingestion',{}); url=ing.get('index_url') or source.get('url'); html=request(url).text
    out=[]
    # Some town newsletter indexes expose concrete event text directly.
    extracted,feeds=extract_jsonld_events(html,source); out.extend(extracted)
    if BeautifulSoup:
        soup=BeautifulSoup(html,'html.parser')
        docs=[]
        for a in soup.find_all('a',href=True):
            href=urljoin(url,a['href']); label=clean_text(a.get_text(' '))
            if any(href.lower().split('?')[0].endswith(x) for x in ['.pdf','.html','.htm']) or 'newsletter' in label.lower() or 'calendar' in label.lower():
                if href!=url: docs.append((href,label))
        # HTML issues can be parsed safely. PDFs remain health-checked/discovered
        # rather than guessed from snippets; a future PDF-text adapter can enrich them.
        for href,label in docs[:8]:
            if href.lower().split('?')[0].endswith(('.html','.htm')):
                try:
                    body=request(href).text; ev,_=extract_jsonld_events(body,source); out.extend(ev)
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

def events_from_clubrunner(source):
    """Discover ClubRunner calendar subscription feeds and structured events."""
    url=source.get('ingestion',{}).get('calendar_url') or source.get('url')
    html=request(url).text; out=[]
    extracted,feeds=extract_jsonld_events(html,source); out.extend(extracted)
    if BeautifulSoup:
        soup=BeautifulSoup(html,'html.parser')
        for a in soup.find_all('a',href=True):
            href=urljoin(url,a['href']); label=clean_text(a.get_text(' ')).lower()
            if any(k in href.lower() for k in ['ical','ics','calendarfeed']) or 'subscribe' in label:
                feeds.append(href)
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
                out.append({'id':event_id(title,day.isoformat(),None),'title':title,'start':{'date':day.isoformat(),'time':None},'end':{'date':day.isoformat(),'time':None},'venue':None,'address':None,'category':'community','source_id':source['id'],'source_url':source.get('url'),'cost':None,'public_access':'public','series':title,'publish_candidate':False,'verification_status':'recurrence_candidate','notes':'Date derived from a verified recurring schedule; venue/time should be confirmed from current listing.','discovered_by':'verified_recurrence'})
    return out

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
        out.append({'id':event_id(title,ds,source.get('name')),'title':title,'start':{'date':ds,'time':tm},'end':{'date':ds,'time':None},'venue':None,'address':None,'category':'sports','source_id':source['id'],'source_url':url,'cost':None,'public_access':'public','series':source.get('name'),'publish_candidate':True,'verification_status':'auto_primary_source','notes':'Youth sports schedule item; confirm with league for late changes.','discovered_by':'league_schedule_table'})
    return dedupe_events(out)

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
                for feed in feeds[:6]:
                    try: out.extend(events_from_ical(feed,source))
                    except Exception: pass
            except Exception: pass
    terms=[str(x).lower() for x in ing.get('keywords',[])]
    if terms: out=[e for e in out if any(t in ' '.join(str(e.get(k) or '') for k in ('title','notes','venue','series')).lower() for t in terms)]
    return dedupe_events(out)

def events_from_pma_hub(source):
    """Discover embedded Google/ICS Fine Arts calendars from the PMA calendar hub."""
    ing=source.get('ingestion',{}); urls=[ing.get('hub_url') or source.get('url')]
    for child in ing.get('child_calendars',[]):
        if isinstance(child,dict) and child.get('url'): urls.append(child['url'])
    out=[]
    for u in [x for x in urls if x]:
        try: html=request(u).text
        except Exception: continue
        extracted,feeds=extract_jsonld_events(html,source); out.extend(extracted)
        if BeautifulSoup:
            soup=BeautifulSoup(html,'html.parser')
            for tag in soup.find_all(['iframe','a'],src=True)+soup.find_all('a',href=True):
                raw=tag.get('src') or tag.get('href')
                if not raw: continue
                href=urljoin(u,raw)
                # Google Calendar embeds expose src=<calendar id>; convert public IDs to ICS.
                if 'calendar.google.com' in href and 'src=' in href:
                    from urllib.parse import urlparse,parse_qs,unquote
                    q=parse_qs(urlparse(href).query); cid=(q.get('src') or [None])[0]
                    if cid:
                        feeds.append('https://calendar.google.com/calendar/ical/'+unquote(cid)+'/public/basic.ics')
        for feed in list(dict.fromkeys(feeds))[:12]:
            try: out.extend(events_from_ical(feed,source))
            except Exception: pass
    return dedupe_events(out)

def events_from_schoolnow(source):
    """Discover SchoolNow subscription feeds from an official calendar page."""
    root=source.get('ingestion',{}).get('calendar_root') or source.get('url')
    html=request(root).text
    if not BeautifulSoup:return []
    soup=BeautifulSoup(html,'html.parser'); feeds=[]
    for a in soup.find_all('a',href=True):
        href=urljoin(root,a['href'])
        label=clean_text(a.get_text(' ')).lower()
        if ('ical' in href.lower() or href.lower().endswith('.ics') or 'subscribe' in label) and href not in feeds:
            feeds.append(href)
    # Canonical SchoolNow sites commonly expose /calendar/feed/ical.ics.
    if '/calendar' in root:
        guess=root.split('/calendar')[0]+'/calendar/feed/ical.ics'
        if guess not in feeds: feeds.append(guess)
    out=[]
    for feed in feeds[:8]:
        try: out.extend(events_from_ical(feed,source))
        except Exception: pass
    return dedupe_events(out)

def events_from_assabet(source):
    """Parse Assabet calendar pages, following month/event links and filtering when configured."""
    url=source.get('ingestion',{}).get('calendar_url') or source.get('url')
    html=request(url).text
    extracted,ics=extract_jsonld_events(html,source); out=list(extracted)
    for feed in ics[:6]:
        try: out.extend(events_from_ical(feed,source))
        except Exception: pass
    if BeautifulSoup:
        soup=BeautifulSoup(html,'html.parser')
        for a in soup.find_all('a',href=True):
            href=urljoin(url,a['href']); label=clean_text(a.get_text(' '))
            if '/event/' not in href and '/calendar/' not in href: continue
            d=_date_from_text(label+' '+clean_text(a.parent.get_text(' ') if a.parent else ''))
            if not d: continue
            title=label or clean_text(a.parent.get_text(' ') if a.parent else '')
            if len(title)<3: continue
            out.append({'id':event_id(title,d.isoformat(),'Morrill Memorial Library'),'title':title,'start':{'date':d.isoformat(),'time':_time_from_text(clean_text(a.parent.get_text(' ') if a.parent else ''))},'end':{'date':d.isoformat(),'time':None},'venue':'Morrill Memorial Library','address':'33 Walpole St, Norwood, MA 02062','category':'library','source_id':source['id'],'source_url':href,'cost':None,'public_access':'public','series':'Morrill Memorial Library','publish_candidate':True,'verification_status':'auto_primary_source','notes':None,'discovered_by':'assabet_calendar'})
    terms=[str(x).lower() for x in source.get('ingestion',{}).get('match',[])]
    if terms:
        out=[e for e in out if any(t in ' '.join(str(e.get(k) or '') for k in ('title','notes','venue','series')).lower() for t in terms)]
    return dedupe_events(out)

def events_from_myrec_facilities(source):
    """Parse MyRec facility-area reservation tables into conflict-calendar events."""
    if not BeautifulSoup: return []
    root=source.get('url') or source.get('ingestion',{}).get('facility_root') or 'https://norwoodma.myrec.com/info/facilities/default.aspx'
    html=request(root).text
    soup=BeautifulSoup(html,'html.parser')
    links=[]
    for a in soup.find_all('a',href=True):
        href=urljoin(root,a['href'])
        if 'area_info.aspx' in href and href not in links:
            links.append(href)
    out=[]
    for url in links[:80]:
        try:
            page=request(url).text
            ps=BeautifulSoup(page,'html.parser')
        except Exception:
            continue
        h=ps.find(['h1','h2'])
        venue=clean_text(h.get_text(' ')) if h else 'Norwood Recreation facility'
        address=None
        for textnode in ps.stripped_strings:
            if re.search(r'\\bNorwood,\\s*MA\\s*02062\\b',textnode,re.I):
                address=clean_text(textnode)
                break
        for tr in ps.find_all('tr'):
            cells=[clean_text(x.get_text(' ')) for x in tr.find_all(['td','th'])]
            if len(cells)<3: continue
            row=' | '.join(cells)
            dm=re.search(r'\\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\s+([A-Z][a-z]+\\s+\\d{1,2},\\s+20\\d{2})\\b',row)
            if not dm: continue
            d=parse_dt(dm.group(1))
            if not d: continue
            tm=re.search(r'\\b(\\d{1,2}:\\d{2}\\s*[AP]M)\\s*-\\s*(\\d{1,2}:\\d{2}\\s*[AP]M)\\b',row,re.I)
            title=next((c for c in cells if c and not re.search(r'^(Program|Event|Teams|Date|Time)$',c,re.I) and not re.search(r'\\b20\\d{2}\\b',c) and not re.fullmatch(r'\\d{1,2}:\\d{2}.*',c)),None)
            if not title: continue
            def nt(v):
                try: return datetime.strptime(v.upper(),'%I:%M %p').strftime('%H:%M')
                except Exception: return None
            ds=d.date().isoformat()
            out.append({'id':event_id(title,ds,venue),'title':title,'start':{'date':ds,'time':nt(tm.group(1)) if tm else None},'end':{'date':ds,'time':nt(tm.group(2)) if tm else None},'venue':venue,'address':address,'category':'facility_reservation','source_id':source['id'],'source_url':url,'cost':None,'public_access':'public','series':'Norwood Recreation facility reservations','publish_candidate':True,'verification_status':'auto_primary_source','notes':'Facility reservation/activity block; included for conflict checking.','discovered_by':'myrec_facility_table'})
    return dedupe_events(out)

def source_allows_master_event(e, source=None):
    """Master dataset is intentionally broad; presentation layers decide what is shown by default."""
    if not e or not e.get('start',{}).get('date'): return False
    access=str(e.get('public_access') or 'public').lower()
    if access in {'private','members_only','member_only'}: return False
    title=clean_text(e.get('title'))
    if not title or canonical_title(title) in {'recurring','recurrence','all events'}: return False
    return True

def refresh_events(offline=False):
    seeds=read_json('events-seed.json',[])
    registry=read_json('source-registry.json',[])
    events=list(seeds); status=[]
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
                elif method=='tribe_events': got=events_from_tribe(src)\n                elif method=='schoolnow_calendar': got=events_from_schoolnow(src)\n                elif method=='assabet_calendar': got=events_from_assabet(src)\n                elif method=='assabet_filtered_calendar': got=events_from_assabet(src)\n                elif method=='myrec_facility_calendar': got=events_from_myrec_facilities(src)
                elif method=='ical':
                    feed=src.get('ingestion',{}).get('feed_url')
                    if not feed and src.get('id')=='nps-district-ical': feed='https://www.norwood.k12.ma.us/about/calendar/feed/ical.ics'
                    if feed: got=events_from_ical(feed,src)
                    else: note='no direct feed_url configured'
                elif method in {'html_calendar','html_list','html_hub','html_page','embedded_calendar','club_calendar','secondary_discovery','church_events_calendar','squarespace_events','growthzone_calendar','organization_event_discovery','town_department_event_discovery','school_parent_org_composite','secondary_org_event_discovery','multi_source_org_discovery','seasonal_org_event_discovery','derived_verified_series','clubrunner_calendar','league_schedule_table','local_town_pages_calendar' ,'multi_source_calendar','newsletter_calendar','pma_calendar_hub','recurring_org_schedule','schoolnow_calendar','secondary_recurring_discovery','social_mirror','sportsconnect_schedule'}:
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
                        for page_url in urls[:6]:
                            if '/events/list' in page_url:
                                try:
                                    temp=dict(src); temp['url']=page_url; got.extend(events_from_tribe(temp))
                                except Exception: pass
                            html=request(page_url).text
                            temp=dict(src); temp['url']=page_url
                            extracted,ics=extract_jsonld_events(html,temp)
                            if terms:
                                extracted=[e for e in extracted if any(t in ' '.join(str(e.get(k) or '') for k in ('title','notes','venue','series')).lower() for t in terms)]
                            got.extend(extracted)
                            for u in ics[:4]:
                                try:
                                    rows=events_from_ical(u,temp)
                                    if terms: rows=[e for e in rows if any(t in ' '.join(str(e.get(k) or '') for k in ('title','notes','venue','series')).lower() for t in terms)]
                                    got.extend(rows)
                                except Exception: pass
                    got=dedupe_events(got)
                    if not got: note='configured pages checked; no matching machine-readable Event/ICS found'
                else: note=f'method {method} requires discovery/manual adapter'
                got=[e for e in got if source_allows_master_event(e,src)]
                events.extend(got)
                status.append({'source_id':src['id'],'ok':True,'method':method,'found':len(got),'note':note})
            except Exception as ex:
                status.append({'source_id':src['id'],'ok':False,'method':method,'found':0,'note':str(ex)[:180]})
    events=current_events(dedupe_events(events))
    write_json('events.json',events); write_js('events-data.js','NORWOOD_EVENTS',events)
    if not offline:
        health=[]
        by_id={x.get('id'):x for x in registry}
        for row in status:
            sid=row.get('source_id'); src=by_id.get(sid,{})
            if not src.get('health_policy',{}).get('track_last_checked'): continue
            prev=previous_health.get(sid,{})
            ok=bool(row.get('ok')); found=int(row.get('found') or 0)
            # A successful HTTP/parse check with zero upcoming events is healthy, but it is not a content update.
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
            health.append({'source_id':sid,'last_checked':checked_at,'last_healthy_check':last_healthy_check,'last_successful_update':last_success,'consecutive_failures':failures,'last_found':found,'ok':ok,'stale':stale,'stale_reason':stale_reason,'note':row.get('note') or None})
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

BLOCKED_NEWS_SOURCES={'maxpreps'}

def news_source_blocked(source):
    return clean_text(source).lower() in BLOCKED_NEWS_SOURCES

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
    program={'community_submission_json','tribe_events','ical','html_calendar','html_list','html_hub','html_page','embedded_calendar','club_calendar','secondary_discovery','church_events_calendar','squarespace_events','growthzone_calendar','organization_event_discovery','town_department_event_discovery','school_parent_org_composite','secondary_org_event_discovery','multi_source_org_discovery','seasonal_org_event_discovery','derived_verified_series','assabet_calendar','assabet_filtered_calendar','clubrunner_calendar','league_schedule_table','local_town_pages_calendar','multi_source_calendar','myrec_facility_calendar','newsletter_calendar','pma_calendar_hub','recurring_org_schedule','schoolnow_calendar','secondary_recurring_discovery','social_mirror','sportsconnect_schedule','selectmen_car_washes','home_depot_kids_workshops'}
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