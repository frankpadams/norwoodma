"""Add October 2024 with voting-derived attendance, explicitly authorized by the site owner."""
from pathlib import Path
import json,re,sys,collections
REPO=Path(__file__).resolve().parents[2];SRC=Path(sys.argv[1]).resolve()
def norm(x):return re.sub('[^A-Z]','',x.upper())
path=REPO/'data/town-meeting-member-records.json';data=json.loads(path.read_text());audit_path=REPO/'data/town-meeting-member-match-audit.json';audit=json.loads(audit_path.read_text())
rows=json.loads((SRC/'october-2024/parsed.json').read_text());prior=[r for r in audit['historical_matches'] if r['date']=='2024-05-13'];assert len(rows)==len(prior)==280
ocr_fixes={norm(k):norm(v) for k,v in {'MAFFE!':'MAFFEI','CORCORAN It':'CORCORAN III','A-EQSCO':'A-EOSCO','NOUM!':'NOUMI','APREA Ill':'APREA III','COSTELLO II!':'COSTELLO III','BRUCKER I!':'BRUCKER III','DIAS iff':'DIAS III'}.items()}
totals=[[149,4,0],[152,4,1],[142,13,1],[149,7,0],[138,20,2],[157,5,0],[157,4,0],[121,33,4],[116,41,3],[133,9,2],[131,9,3],[136,6,0],[135,5,1],[137,9,1]]
labels=[('STM 1 — Police body-worn cameras','1'),('STM 2 — Stabilization Fund transfer','2'),('STM 3 — Compensated Absences Fund transfer','3'),('STM 4 · Motion 1 — Road repairs from Forbes proceeds','4-motion-1'),('STM 4 · Motion 2 — Free-cash capital projects','4-motion-2'),('STM 4 · Motion 3 — Borrowing and rates capital projects','4-motion-3'),('STM 4 · Motion 4 — MWRA water main cleaning and lining','4-motion-4'),('STM 5 — Move the question','5'),('STM 5 — Affordable veterans housing at 20 Vernon Street','5'),('STM 6 — Coakley School Verizon easement','6'),('STM 7 — Retired special police officers','7'),('STM 8 — Weights and measures fees','8'),('STM 8 — Move the question','8'),('STM 9 — Local marijuana sales tax','9')]
motions=[{'id':'2024-october-motion-'+str(i+1),'label':label,'date':'2024-10-24','article_target':'tm-2024-october-'+target,'totals':totals[i],'named_totals':totals[i],'members':{},'unresolved':[]} for i,(label,target) in enumerate(labels)]
may=next(p for p in data['meetings'] if p['id']=='2024-may');roster={};match_audit=[]
for index,(row,reference) in enumerate(zip(rows,prior),1):
 actual=norm(row['source_label']);expected=norm(reference['source_name']);assert ocr_fixes.get(actual,actual)==expected,(index,row['source_label'],reference['source_name'])
 key=reference['member'];assert key in data['members'];choices=row['choices'];assert all(c in ['Yes','No','Abs'] for c in choices.values())
 entry=may['roster'][key]['dates']['2024-05-13'];roster[key]={'name':data['members'][key]['name'],'dates':{'2024-10-24':{'district':entry['district'],'district_source_date':'2024-05-13','status':'PRESENT' if choices else 'ABSENT','attendance_basis':'voting-record','recorded_votes':len(choices)}}}
 for column,choice in choices.items():motions[int(column)]['members'][key]=choice
 match_audit.append({'date':'2024-10-24','report_page':row['page'],'report_row':index,'source_name':row['source_label'],'member':key,'method':'surname/initial and complete 280-row sequence verified against May 2024 report; OCR differences explicitly reviewed'})
for m in motions:assert [sum(v==c for v in m['members'].values()) for c in ['Yes','No','Abs']]==m['totals'],m['id']
period={'id':'2024-october','title':'October 24, 2024 · Special Town Meeting','dates':['2024-10-24'],'roster':roster,'sources':['Special Town Meeting Results.pdf'],'attendance_basis':'voting-record','attendance_note':'Attendance is inferred from the electronic voting report: at least one Yes, No or Abstain vote means present; no recorded votes means absent. This is not an official attendance checklist. Districts use the May 13, 2024 official roster.','motions':motions}
data['meetings']=[p for p in data['meetings'] if p['id']!='2024-october']+[period];data['meetings'].sort(key=lambda p:p['dates'][0],reverse=True)
data['coverage_note']='Official attendance checklists are used where supplied. October 24, 2024 attendance is inferred from voting records under the stated rule. Clicker tests are excluded; a blank cell on one motion does not establish absence.'
path.write_text(json.dumps(data,separators=(',',':'))+'\n');audit['october_2024_matches']=match_audit;audit['october_2024_attendance_rule']=period['attendance_note'];audit_path.write_text(json.dumps(audit,indent=2)+'\n')
print('October 2024:',len(roster),'members',collections.Counter(p['dates']['2024-10-24']['status'] for p in roster.values()),len(motions),'motions; all 14 official totals reconciled')
