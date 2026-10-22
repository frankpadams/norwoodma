"""Keep every member-record article and procedural motion intelligible without opening its destination."""
from pathlib import Path
import re,json,html
ROOT=Path(__file__).resolve().parents[2];page=(ROOT/'town-meeting-archive.html').read_text();descriptions={}
for match in re.finditer(r'<tr\b[^>]*id="([^"]+)"[^>]*>(.*?)</tr>',page,re.S):
 cells=re.findall(r'<td[^>]*>(.*?)</td>',match[2],re.S)
 if len(cells)>1:descriptions[match[1]]=html.unescape(re.sub('<[^>]*>','',cells[1])).strip()
path=ROOT/'data/town-meeting-member-records.json';data=json.loads(path.read_text());bare=re.compile(r'^(?:STM(?: #[12])?|ATM) \d+(?: · Motion \d+)?$')
for period in data['meetings']:
 for motion in period['motions']:
  description=descriptions[motion['article_target']];assert description,(period['id'],motion['label']);motion['description']=description
  subject=description.split(';')[0].rstrip('.')
  if bare.fullmatch(motion['label']):motion['label']+=' — '+subject
  elif re.search(r'Move the question|Motion to amend| — Amendment| — As amended|indefinitely postpone|postponement',motion['label'],re.I) and subject not in motion['label']:motion['label']+=' — '+subject
path.write_text(json.dumps(data,separators=(',',':'))+'\n')
print('Descriptive text verified for',sum(len(p['motions']) for p in data['meetings']),'motions')
