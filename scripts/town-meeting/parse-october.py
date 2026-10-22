import csv,re,json,collections,sys
from pathlib import Path
ROOT=Path(sys.argv[1]).resolve()/'october-2024'
all_rows=[]
for page in range(2,9):
 words=[w for w in csv.DictReader((ROOT/('clean-'+str(page)+'.tsv')).open(),delimiter='\t',quoting=csv.QUOTE_NONE) if w['text'].strip()]
 for w in words:
  for k in ['left','top','width','height']:w[k]=int(w[k])
  w['choice']={'YES':'Yes','NO':'No','ABS':'Abs','VES':'Yes','YESS':'Yes'}.get(re.sub('[^A-Z]','',w['text'].upper()))
 votes=[w for w in words if w['choice'] and w['left']>400]
 points=sorted(w['left']+w['width']/2 for w in votes);clusters=[]
 for x in points:
  if not clusters or x-clusters[-1][0]>50:clusters.append([x])
  else:clusters[-1].append(x)
 centers=[sum(c)/len(c) for c in clusters if len(c)>1];assert len(centers)==14,(page,centers)
 cutoff=centers[0]-100;min_y=next((w['top']+40 for w in words if w['text']=='Last' and w['left']<cutoff),min(w['top'] for w in votes)-80)
 groups={}
 for w in words:
  if w['left']<cutoff and w['top']>=min_y and re.search('[A-Za-z]',w['text']):groups.setdefault((w['block_num'],w['par_num'],w['line_num']),[]).append(w)
 rows=[]
 for ws in groups.values():
  label=' '.join(w['text'] for w in ws);y=sum(w['top']+w['height']/2 for w in ws)/len(ws);rows.append({'source_label':label,'y':y,'page':page,'choices':{},'boxes':[]})
 rows.sort(key=lambda r:r['y'])
 for w in votes:
  mid=w['top']+w['height']/2;index=min(range(len(rows)),key=lambda i:abs(rows[i]['y']-mid));x=w['left']+w['width']/2;col=min(range(14),key=lambda i:abs(centers[i]-x))
  if abs(rows[index]['y']-mid)>30:raise ValueError(('row',page,w))
  if col in rows[index]['choices']:raise ValueError(('duplicate',page,index,col,w))
  rows[index]['choices'][col]=w['choice'];rows[index]['boxes'].append({**{k:w[k] for k in ['left','top','width','height','text']},'column':col})
 all_rows+=rows;print('PAGE',page,'rows',len(rows),'votes',len(votes))
print('TOTAL ROWS',len(all_rows));print('COUNTS',[[sum(r['choices'].get(c)==v for r in all_rows) for v in ['Yes','No','Abs']] for c in range(14)])
(ROOT/'parsed.json').write_text(json.dumps(all_rows,indent=2))
