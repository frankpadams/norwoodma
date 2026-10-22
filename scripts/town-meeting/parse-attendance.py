from pathlib import Path
import csv,re,json,collections,sys
ROOT=Path(sys.argv[1]).resolve()
FILES={'2024 5 13 ATM STM ATTENDANCE RECORDS':'2024-05-13','2024 5 16 ATM ATTENDANCE RECORDS':'2024-05-16','TM Attendance 5-12-2025':'2025-05-12','TM Attendance 5-15-2025':'2025-05-15','TM Attendance 5-19-2025':'2025-05-19','11-13-2025 Town Meeting Attendance':'2025-11-13','11-17-2025 Town Meeting Attendance':'2025-11-17'}
all_rows={};diagnostics=[]
for name,date in FILES.items():
 rows=[]
 for p in sorted((ROOT/'ocr'/name).glob('ocr-*.tsv'),key=lambda p:int(p.stem.split('-')[-1])):
  n=int(p.stem.split('-')[-1]);district=str(n) if n<10 else 'ATL';groups={}
  for w in csv.DictReader(p.open(),delimiter='\t',quoting=csv.QUOTE_NONE):
   if w['text'].strip():groups.setdefault((w['block_num'],w['par_num'],w['line_num']),[]).append(w)
  lines=list(groups.values());header=next((ws for ws in lines if 'First' in [w['text'] for w in ws] and 'Term' in [w['text'] for w in ws]),None)
  if not header:diagnostics.append((date,n,'missing header'));continue
  first_x=int(next(w['left'] for w in header if w['text']=='First'))-10;status_x=int(next(w['left'] for w in header if w['text']=='Status'))-15;term_x=int(next(w['left'] for w in header if w['text']=='Term'))-10
  page_rows=[]
  for ws in lines:
   text=' '.join(w['text'] for w in ws);status=re.search(r'\b(PRESENT|ABSENT)\b',text);term=re.search(r'\b(2[.,]?02[.,]?[0-9])\b',text)
   if not status or not term:continue
   last=' '.join(w['text'] for w in ws if int(w['left'])+int(w['width'])/2<first_x);first=' '.join(w['text'] for w in ws if first_x<=int(w['left'])+int(w['width'])/2<status_x)
   last=last.strip(' |_,');first=first.strip(' |_,');name_full=first+' '+last
   if not first or not last:diagnostics.append((date,n,'missing name',text));continue
   record={'name':name_full,'first':first,'last':last,'district':int(district) if district.isdigit() else district,'status':status[1],'term':int(re.sub('[^0-9]','',term[1])),'page':n};page_rows.append(record);rows.append(record)
  header_text=' '.join(' '.join(w['text'] for w in ws) for ws in lines[:5]);counts=re.search(r'District\s*:?\s*(?:\d|ATL).*?Present\s*:?\s*(\d+).*?Absent\s*:?\s*(\d+)',header_text,re.I)
  if counts:
   expected=list(map(int,counts.groups()));actual=[sum(r['status']==s for r in page_rows) for s in ['PRESENT','ABSENT']]
   if actual!=expected:diagnostics.append((date,n,'count mismatch',actual,expected))
 all_rows[date]={'source':name+'.pdf','rows':rows}
 print(date,len(rows),collections.Counter(r['status'] for r in rows))
(ROOT/'attendance-parsed.json').write_text(json.dumps(all_rows,indent=2));print('DIAGNOSTICS',diagnostics)
