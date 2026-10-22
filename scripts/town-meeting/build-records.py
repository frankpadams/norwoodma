import json,re,collections,html,sys,hashlib
from pathlib import Path
REPO=Path(__file__).resolve().parents[2];SRC=Path(sys.argv[1]).resolve()
def norm(n):return re.sub('[^A-Z]','',n.upper())
def read(p):return json.loads(p.read_text())
latest=read(REPO/'data/town-meeting-2026-individual-votes.json');nov=read(REPO/'data/town-meeting-2025-november-individual-votes.json');att=read(SRC/'attendance-parsed.json')
registry={};aliases={};audit=[]
def parts(name):
 t=re.findall(r"[A-Za-z]+(?:[-'][A-Za-z]+)*",name.upper());suffix=[]
 if t and t[-1] in ['JR','III','II','IV']:suffix=[t.pop()]
 last=[t.pop()] if t else []
 if last==['PIERRE'] and t and t[-1]=='ST':last.insert(0,t.pop())
 return t,norm(' '.join(last+suffix))
def compatible(a,b):
 ga,sa=parts(a);gb,sb=parts(b)
 if sa!=sb or not ga or not gb or ga[0]!=gb[0]:return False
 return all(x==y or len(x)==1 and y.startswith(x) or len(y)==1 and x.startswith(y) for x,y in zip(ga[1:],gb[1:]))
def register(name):
 key=norm(name)
 if key in aliases:return aliases[key]
 candidates=[k for k,p in registry.items() if compatible(name,p['name'])]
 if len(candidates)==1:key=candidates[0]
 else:registry.setdefault(key,{'name':name,'aliases':[]})
 aliases[norm(name)]=key
 if name!=registry[key]['name'] and name not in registry[key]['aliases']:registry[key]['aliases'].append(name)
 return key
for p in latest['roster'].values():register(p['name'])
for group in nov['meetings'].values():
 for m in group:
  for ns in m['votes'].values():
   for name in ns:register(name)
spring=read(SRC/'2025 Annual and Special Town Meeting Results.parsed.json')
for table in spring['tables']:
 for col in table['cols']:
  for ns in col.values():
   for name in ns:register(name)
# Explicit OCR corrections, checked against repeated historical roster rows and full-name voting reports.
fixes={
 'JOSEPE S BARRETT':'JOSEPH S. BARRETT','IKKAREN L BRENNER':'KAREN L. BRENNER','JOHN JOSEPH CORCORAN ILL':'JOHN JOSEPH CORCORAN III','JOHN JOSEPH CORCORAN IIL':'JOHN JOSEPH CORCORAN III','JOHN JOSEPH CORCORAN IIT':'JOHN JOSEPH CORCORAN III',
 'EMILY F TOADLEY':'EMILY F. HOADLEY','RACHASL DELIA WEBBER':'RACHAEL DELIA WEBBER','KEVIN 2ICHARD BRODERICK':'KEVIN RICHARD BRODERICK','HERBERT JOSEPH DIAS IIT':'HERBERT JOSEPH DIAS III',
 'GEORGE T CURTIS IR':'GEORGE T. CURTIS JR.','SCOTT DAMIEN MAEFEL':'SCOTT DAMIEN MAFFEI','PAUL W EYSIE J':'PAUL W. EYSIE','EDWARD M LYNCH IR':'EDWARD M. LYNCH JR.','ANTOINETTE M BOSCO':'ANTOINETTE M. EOSCO',
 'JOHN J APREA UL':'JOHN J. APREA III','JOHNR HALL IR':'JOHN R. HALL JR.','EUGENE KOLODENRER':'EUGENE KOLODENKER','BAVANE MONAHAN':'EAVAN E MONAHAN','WILLIAM J BRUCKER II':'WILLIAM J. BRUCKER III','WILLIAM J BRUCKER I':'WILLIAM J. BRUCKER III','WILLIAM J BRUCKER IIT':'WILLIAM J. BRUCKER III',
 'GEORGE I HAWLEY':'GEORGE J. HAWLEY','JAMES 2 WEST':'JAMES R. WEST','DAVID HIERN JR':'DAVID HERN JR.','JAMES FRENCIT STROTHER':'JAMES FRENCH STROTHER','THOMAS JOSEPH GULOD':'THOMAS JOSEPH GUIOD','SCOTT NAMIEN MAFFEI':'SCOTT DAMIEN MAFFEI','JOSEPH 5 BARRETT':'JOSEPH S. BARRETT',
 'JOHN J APREA II':'JOHN J. APREA III','HENRY 2 GRAHAM':'HENRY R. GRAHAM','EMILY L CAILIE':'EMILY L. CAILLE','EMILY L CATLLE':'EMILY L. CAILLE','ELEANCR A BRADY':'ELEANOR A. BRADY','SARAH £ SULLIVAN':'SARAH E. SULLIVAN','JUDITH EB BROMLEY':'JUDITH E. BROMLEY','JOEN J APREA III':'JOHN J. APREA III','TRENE GOTOVICH':'IRENE GOTOVICH','MICHARL GERARD CHISHOLM':'MICHAEL GERARD CHISHOLM','NATALIE 8 FLYNN-SCHOFIELD':'NATALIE S. FLYNN-SCHOFIELD',
 'WILLIAM F COSTELLO IIL':'WILLIAM F. COSTELLO III','WILLIAM F COSTELLO UE':'WILLIAM F. COSTELLO III','WILLIAM F COSTELLO ML':'WILLIAM F. COSTELLO III','WILLIAM F COSTELLO II':'WILLIAM F. COSTELLO III',
}
fixes={norm(k):v for k,v in fixes.items()}
for date,report in att.items():
 for r in report['rows']:
  original=r['name'];name=fixes.get(norm(original),original);r['key']=register(name)
  if name!=original:audit.append({'date':date,'page':r['page'],'source_name':original,'corrected_name':name})
def attendance(dates):
 roster={}
 for date in dates:
  for r in att[date]['rows']:
   p=roster.setdefault(r['key'],{'name':registry[r['key']]['name'],'dates':{}})
   assert date not in p['dates'],(date,r)
   p['dates'][date]={k:r[k] for k in ['district','status','term']}
 return roster
def aggregate(parsed,lo,hi,offset):
 tables=[t for t in parsed['tables'] if lo<=t['page']<=hi];n=len(tables[0]['cols']);result=[]
 for i in range(n):
  summary=parsed['summary'][offset+i];votes={c:[name for t in tables for name in t['cols'][i][c]] for c in ['Yes','No','Abs']};result.append({'totals':summary['totals'],'votes':votes,'source_label':summary['label']})
 return result
meetings=[]
def meeting(id,title,dates,roster,sources,motions):
 result={'id':id,'title':title,'dates':dates,'roster':roster,'sources':sources,'motions':motions};meetings.append(result);return result
meeting('2026-may',latest['meeting']['title'],latest['meeting']['dates'],{register(p['name']):p for p in latest['roster'].values()},[latest['source'],*latest['attendance_sources'].values()],latest['motions'])
labels_nov=[
('STM 1–3 — Motion to form consent agenda','1-3'),('STM 1–3 — Consent agenda','1-3'),('STM 4 — MWRA study borrowing','4'),('STM 5 — Move the question','5'),('STM 5 — Amendment to indefinitely postpone','5'),('STM 5 — Move the question on original motion','5'),('STM 5 — Special Education Reserve transfer','5'),('STM 6 — Move the question','6'),('STM 6 — Capital Stabilization transfer','6'),('STM 7 — Move the question','7'),('STM 7 — Cofsky Farm acquisition','7'),('STM 8 — Move the question','8-amendment'),('STM 8 — Amendment','8-amendment'),('STM 8 — Main acquisition motion','8-main-motion'),
('STM 9 · Motion 1 — Move the question','9-motion-1'),('STM 9 · Motion 1 — Indefinite postponement amendment','9-motion-1-amendments'),('STM 9 · Motion 1 — Separate-vote amendment','9-motion-1-amendments'),('STM 9 · Motion 1 — Move the question on original motion','9-motion-1'),('STM 9 · Motion 1 — Free-cash capital plan','9-motion-1'),('STM 9 · Motion 2 — Borrowing for sidewalks, school roof and library','9-motion-2'),('STM 9 · Motion 3 — Water improvements','9-motion-3'),('STM 9 · Motion 4 — Route 1 water main design','9-motion-4')]
nov_motions=[]
for date,ms in nov['meetings'].items():
 for m in ms:nov_motions.append({**m,'date':date})
for m,(label,target) in zip(nov_motions,labels_nov):m.update(label=label,article_target='tm-2025-november-'+target)
meeting('2025-november','November 13 & 17, 2025 · Special Town Meeting',['2025-11-13','2025-11-17'],attendance(['2025-11-13','2025-11-17']),['11-13-2025 Electronic Voting Results.pdf','11-17-2025 Electronic Voting Results.pdf',att['2025-11-13']['source'],att['2025-11-17']['source']],nov_motions)
spring_motions=aggregate(spring,8,10,0)+aggregate(spring,11,12,17)+aggregate(spring,13,15,46)
spring_labels=[]
def add(label,target):spring_labels.append((label,target))
for article,extra in [(1,''),(2,' — Move the question on amendment'),(2,' — Amendment'),(2,''),(3,''),(4,''),(5,''),(6,''),(6,' — Move the question on amendment'),(7,' — Amendment to delay'),(7,' — Move the question'),(7,''),(8,''),(9,''),(10,''),(11,''),(12,'')]:add('STM #1 '+str(article)+extra,'stm1-'+str(article))
for a in range(1,4):add('ATM '+str(a),'atm-'+str(a))
for label,target in [('ATM 4 · Motion 1 — Move the question','atm-4-motion-1'),('ATM 4 · Motion 1 — General Government','atm-4-motion-1'),('ATM 4 · Motion 2 — Public Safety','atm-4-motion-2'),('ATM 4 · Motion 3 — Move the question','atm-4-motion-3'),('ATM 4 · Motion 3 — Infrastructure','atm-4-motion-3'),('ATM 4 · Motion 4 — Health & Human Services','atm-4-motion-4'),('ATM 4 · Motion 5 — Culture & Recreation','atm-4-motion-5'),('ATM 4 · Motion 6 — Facilities','atm-4-motion-6'),('ATM 4 · Motion 7 — Shared Costs','atm-4-motion-7'),('ATM 4 · Motion 8 — Move the question on amendment','atm-4-motion-8'),('ATM 4 · Motion 8 — Amendment to increase school budget','atm-4-motion-8'),('ATM 4 · Motion 8 — Move the question','atm-4-motion-8'),('ATM 4 · Motion 8 — Education','atm-4-motion-8'),('ATM 4 · Motion 9 — Water/Sewer','atm-4-motion-9'),('ATM 6 — CPC reserves','atm-6'),('ATM 7 — CPC administration','atm-7')]:add(label,target)
for a,extra in [(1,''),(2,''),(3,' — Move the question'),(3,''),(4,' — Move the question'),(4,''),(5,' — Move the question'),(5,''),(6,''),(7,'')]:add('ATM 8 · Motion '+str(a)+extra,'atm-8-motion-'+str(a))
add('STM #2 1 — Appoint temporary moderator','stm2-1')
for a,extra in [(1,' — Move the question'),(1,''),(2,' — Move the question'),(2,''),(3,' — Move the question'),(3,''),(4,''),(5,''),(6,''),(7,''),(8,' — Move the question'),(8,''),(9,''),(10,' — Move the question'),(10,'')]:add('STM #2 '+str(a)+extra,'stm2-'+str(a))
assert len(spring_labels)==len(spring_motions)==62
for m,(label,target) in zip(spring_motions,spring_labels):m.update(label=label,article_target='tm-2025-may-'+target)
dates=['2025-05-12','2025-05-15','2025-05-19'];meeting('2025-may','May 12, 15 & 19, 2025 · Annual & Special Town Meetings',dates,attendance(dates),['2025 Annual and Special Town Meeting Results.pdf',*[att[d]['source'] for d in dates]],spring_motions)
historical_matches=[]
def historical_votes(name,date):
 parsed=read(SRC/(name+'.parsed.json'));pages=(SRC/(name+'.txt')).read_text().split('\f');source_rows=[]
 token=re.compile(r'\b(?:Yes|No|Abs|YES|NO|ABS)\b|(?<!\S)[123](?!\S)')
 for table in parsed['tables']:
  centers=table['centers']
  for line in pages[table['page']-1].splitlines():
   label=line[:int(centers[0]-4)].strip()
   if not label or not re.fullmatch(r"[A-Z][A-Z .,'\-]+",label):continue
   choices={}
   for m in token.finditer(line):
    mid=(m.start()+m.end())/2;i=min(range(len(centers)),key=lambda i:abs(centers[i]-mid))
    if abs(centers[i]-mid)>5:continue
    choices[i]={'1':'Yes','2':'No','3':'Abs','YES':'Yes','NO':'No','ABS':'Abs'}.get(m.group(),m.group())
   source_rows.append({'name':label,'choices':choices,'page':table['page']})
 roster=att[date]['rows'];candidates=[];fix={'DOBBHLS':'DOBBELS','WRITTEN':'WRISTEN'}
 for row in source_rows:
  label=fix.get(row['name'],row['name']);initial=''
  if '-' in label and len(label.split('-')[0])<=2:initial,label=label.split('-',1)
  options=[]
  for pos,r in enumerate(roster):
   given,surname=parts(registry[r['key']]['name'])
   if (norm(label)==surname or norm(label)==norm(r['last'])) and (not initial or given[0].startswith(initial) or norm(r['first']).startswith(initial)):options.append(pos)
  candidates.append(options)
 matched={i:cs[0] for i,cs in enumerate(candidates) if len(cs)==1};methods={i:'unique surname/initial in historical roster' for i in matched}
 for _ in range(3):
  for i,cs in enumerate(candidates):
   if i in matched or not cs:continue
   prev=next((matched[j] for j in range(i-1,-1,-1) if j in matched),-1);following=next((matched[j] for j in range(i+1,len(source_rows)) if j in matched),len(roster))
   eligible=[p for p in cs if prev<p<following]
   if len(eligible)==1:matched[i]=eligible[0];methods[i]='surname/initial plus surrounding matched rows in historical roster order'
 result=[{'totals':s['totals'],'votes':{'Yes':[],'No':[],'Abs':[]}} for s in parsed['summary']]
 for i,row in enumerate(source_rows):
  key=roster[matched[i]]['key'] if i in matched else None
  display=registry[key]['name'] if key else row['name']+' (unmatched report row '+str(i+1)+')'
  historical_matches.append({'date':date,'report_page':row['page'],'report_row':i+1,'source_name':row['name'],'member':key,'method':methods.get(i,'unresolved')})
  for index,choice in row['choices'].items():result[index]['votes'][choice].append(display)
 print(date,'historical rows matched',len(matched),'/',len(source_rows),'unmatched',[(i+1,source_rows[i]['name']) for i in range(len(source_rows)) if i not in matched])
 return result[2:]
old1=historical_votes('Town Meeting Night 1 Results','2024-05-13');old2=historical_votes('Town Meeting Night 2 Results (2)','2024-05-16')
oldlabels=[]
for a,extra in [(1,''),(2,''),(3,' — Move the question'),(3,''),(4,''),(5,''),(6,''),(7,''),(8,''),(9,' — Move the question'),(9,''),(10,''),(11,''),(12,'')]:oldlabels.append(('STM '+str(a)+extra,'stm-'+str(a)))
for a in range(1,4):oldlabels.append(('ATM '+str(a),'atm-'+str(a)))
for extra in [' — Move the question on amendment',' — Amendment',' — As amended']:oldlabels.append(('ATM 4 · Motion 1'+extra,'atm-4-motion-1'))
for a in range(2,10):oldlabels.append(('ATM 4 · Motion '+str(a),'atm-4-motion-'+str(a)))
for a in [6,7]:oldlabels.append(('ATM '+str(a),'atm-'+str(a)))
for a,extra in [(1,' — Move the question'),(1,''),(2,' — Move the question'),(2,''),(3,''),(4,''),(5,''),(6,''),(7,''),(8,''),(9,''),(10,''),(11,' — Move the question'),(11,'')]:oldlabels.append(('ATM 8 · Motion '+str(a)+extra,'atm-8-motion-'+str(a)))
assert len(oldlabels)==len(old1+old2)==44
older_motions=old1+old2
for i,(m,(label,target)) in enumerate(zip(older_motions,oldlabels)):m.update(label=label,article_target='tm-2024-may-'+target,date='2024-05-13' if i<len(old1) else '2024-05-16')
dates=['2024-05-13','2024-05-16'];older=meeting('2024-may','May 13 & 16, 2024 · Special & Annual Town Meetings',dates,attendance(dates),['Town Meeting Night 1 Results.pdf','Town Meeting Night 2 Results (2).pdf',*[att[d]['source'] for d in dates]],older_motions)
# Resolve the historical report's surname/initial labels against that night's roster only.
unmatched=[];source_name_fixes={'DOBBHLS':'DOBBELS','WRITTEN':'WRISTEN'}
def older_key(label,date):
 if norm(label) in aliases:return aliases[norm(label)]
 label=source_name_fixes.get(label,label);initial=''
 if '-' in label and len(label.split('-')[0])<=2:initial,label=label.split('-',1)
 candidates=[]
 for r in att[date]['rows']:
  canonical=registry[r['key']]['name'];given,surname=parts(canonical)
  if (norm(label)==surname or norm(label)==norm(r['last'])) and (not initial or given[0].startswith(initial) or re.sub('[^A-Z]','',r['first'].upper()).startswith(initial)):candidates.append(r['key'])
 candidates=list(set(candidates))
 if len(candidates)==1:return candidates[0]
 unmatched.append({'date':date,'name':label,'initial':initial,'candidates':candidates});return None
discrepancies=[]
for period in meetings:
 for index,m in enumerate(period['motions']):
  m['id']=period['id']+'-motion-'+str(index+1);members={};unresolved=[]
  for choice,names in m['votes'].items():
   for n in names:
    key=older_key(n,m['date']) if period['id']=='2024-may' else register(n)
    if not key:unresolved.append({'name':n,'choice':choice,'candidates':unmatched[-1]['candidates']});continue
    assert key not in members,(period['id'],index,n,key)
    members[key]=choice
  m['members']=members;m['unresolved']=unresolved;m['named_totals']=[len(m['votes'][c]) for c in ['Yes','No','Abs']]
  if m['named_totals']!=m['totals']:discrepancies.append({'meeting':period['id'],'motion':m['label'],'official':m['totals'],'named':m['named_totals']})
  del m['votes']
  if 'source_label' in m:del m['source_label']
# Keep registry entries that occur in a roster or a recorded vote.
used={k for period in meetings for k in period['roster']}|{k for period in meetings for m in period['motions'] for k in m['members']}
registry={k:v for k,v in registry.items() if k in used}
result={'schema_version':1,'members':registry,'aliases':{k:v for k,v in aliases.items() if v in used},'meetings':meetings,'coverage_note':'Only uploaded meeting cycles with both electronic voting and attendance reports are included. Test clicker polls are excluded. Missing votes do not establish absence.','source_discrepancies':discrepancies}
(REPO/'data/town-meeting-member-records.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
(REPO/'data/town-meeting-member-match-audit.json').write_text(json.dumps({'ocr_corrections':audit,'historical_matches':historical_matches,'unmatched_2024':unmatched,'source_discrepancies':discrepancies,'source_sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in SRC.glob('*.pdf')}},indent=2))
print('Members',len(registry),'meetings',[(p['id'],len(p['roster']),len(p['motions'])) for p in meetings]);print('Unmatched 2024',list({(r['date'],r['name'],r['initial']) for r in unmatched}));print('Source discrepancies',discrepancies)
