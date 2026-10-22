import re,json,collections,sys
from pathlib import Path
ROOT=Path(sys.argv[1]).resolve()
VOTE=re.compile(r'\b(?:Yes|No|Abs|YES|NO|ABS)\b|(?<!\S)[123](?!\S)')
TOTAL=re.compile(r'(?:YES|Yes)\s*\((\d+)\)\s*(?:NO|No)\s*\((\d+)\)\s*(?:ABS|Abs)\s*\((\d+)\)')
def parse(name):
 pages=(ROOT/(name+'.txt')).read_text().split('\f');summary=[];tables=[]
 for page_no,page in enumerate(pages,1):
  totals=list(TOTAL.finditer(page))
  if totals:
   prev=0
   for m in totals:
    label=' '.join(page[prev:m.start()].split());label=re.sub(r'^(Results by Article )?Topics (Result Voting Rule )?(Subtotals )?','',label)
    label=re.sub(r'\s+[PF]\s+(SM|2/3|90.0%)\s*$','',label)
    summary.append({'label':label,'totals':list(map(int,m.groups()))});prev=m.end()
   continue
  lines=page.splitlines();rows=[]
  for line in lines:
   if re.search(r'ARTICLE|Article|First Name|Last Name|CLICKERS|Championship|Question',line):continue
   matches=list(VOTE.finditer(line))
   if not matches:continue
   prefix=line[:matches[0].start()].strip()
   if not re.search('[A-Z]',prefix) or not re.fullmatch(r"[A-Za-z .,'’\-]+",prefix):continue
   rows.append((line,matches))
  if not rows:continue
  points=sorted((m.start()+m.end())/2 for _,ms in rows for m in ms);clusters=[]
  for point in points:
   if not clusters or point-clusters[-1][0]>4:clusters.append([point])
   else:clusters[-1].append(point)
  centers=[sum(c)/len(c) for c in clusters if len(c)>=max(1,len(rows)*.08)]
  cols=[{'Yes':[],'No':[],'Abs':[]} for _ in centers]
  for line,ms in rows:
   name=' '.join(line[:int(centers[0]-4)].split())
   if not name:raise ValueError(line)
   for m in ms:
    mid=(m.start()+m.end())/2;index=min(range(len(centers)),key=lambda i:abs(centers[i]-mid))
    if abs(centers[index]-mid)>5:raise ValueError(('column',m.group(),name))
    choice={'1':'Yes','2':'No','3':'Abs','YES':'Yes','NO':'No','ABS':'Abs'}.get(m.group(),m.group())
    cols[index][choice].append(name)
  tables.append({'page':page_no,'rows':len(rows),'cols':cols,'centers':centers})
 return summary,tables
if __name__=='__main__':
 for name in ['Town Meeting Night 1 Results','Town Meeting Night 2 Results (2)','2025 Annual and Special Town Meeting Results']:
  summary,tables=parse(name);print(name,'summary',len(summary),'tables',[(x['page'],x['rows'],len(x['cols'])) for x in tables]);(ROOT/(name+'.parsed.json')).write_text(json.dumps({'summary':summary,'tables':tables},indent=2))
