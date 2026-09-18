const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const sources=window.NORWOOD_CALENDAR_SOURCES||[];
const events=window.NORWOOD_EVENTS||[];
const selectable=sources.filter(x=>x.feed_url && x.kind!=='browse_only');
const byId=new Map(sources.map(x=>[x.id,x]));
const storageKey='norwoodCalendarSelectionsV1';
const canonicalBase='https://norwood.ma/';
let selected=new Set();

function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function absoluteFeed(src){
  if(/^https?:\/\//i.test(src.feed_url)) return src.feed_url;
  if(location.protocol==='http:'||location.protocol==='https:') return new URL(src.feed_url,location.href).href;
  return new URL(src.feed_url,canonicalBase).href;
}
function webcal(url){return url.replace(/^https?:/i,'webcal:');}
function readSelection(){
  const qs=new URLSearchParams(location.search).get('c');
  if(qs){selected=new Set(qs.split(',').map(x=>x.trim()).filter(x=>byId.has(x)&&byId.get(x).feed_url));return;}
  try{selected=new Set(JSON.parse(localStorage.getItem(storageKey)||'[]').filter(x=>byId.has(x)&&byId.get(x).feed_url));}catch(e){selected=new Set();}
}
function saveSelection(){try{localStorage.setItem(storageKey,JSON.stringify([...selected]));}catch(e){}}
function sourceCard(src){
  return `<label class="calendar-choice ${selected.has(src.id)?'selected':''}" data-calendar-id="${esc(src.id)}"><input type="checkbox" value="${esc(src.id)}" ${selected.has(src.id)?'checked':''}><span class="calendar-check" aria-hidden="true">✓</span><span class="calendar-choice-copy"><b>${esc(src.name)}</b><small>${esc(src.description)}</small><span class="calendar-source-line">${src.kind==='generated_live'?'Norwood.ma live feed':'Official live feed'} · ${esc(src.provider)}</span></span></label>`;
}
function browseCard(src){return `<a class="calendar-browse-card" href="${esc(src.view_url)}" target="_blank" rel="noopener"><span><b>${esc(src.name)}</b><small>${esc(src.description)}</small></span><strong>View calendar ↗</strong></a>`;}
function directoryCard(src){
  const status=src.feed_url?'<span class="calendar-live-badge">Live subscription available</span>':'<span class="calendar-browse-badge">Browse online</span>';
  return `<a class="calendar-directory-card" href="${esc(src.view_url||'events.html')}" ${/^https?:/i.test(src.view_url||'')?'target="_blank" rel="noopener"':''}><span><b>${esc(src.name)}</b><small>${esc(src.description)}</small></span>${status}<strong>Open calendar ${/^https?:/i.test(src.view_url||'')?'↗':'→'}</strong></a>`;
}
function renderDirectory(){
  const groups=[['#calendarDirectorySchools','schools'],['#calendarDirectoryCommunity','community'],['#calendarDirectoryMore','more']];
  groups.forEach(([sel,group])=>{const el=$(sel);if(el)el.innerHTML=sources.filter(x=>x.group===group).map(directoryCard).join('');});
}
function renderChoices(){
  const schools=$('#schoolCalendarChoices'),community=$('#communityCalendarChoices');
  if(schools)schools.innerHTML=sources.filter(x=>x.group==='schools').map(sourceCard).join('');
  if(community)community.innerHTML=sources.filter(x=>x.group==='community').map(sourceCard).join('');
  $$('.calendar-choice input').forEach(input=>input.addEventListener('change',()=>{input.checked?selected.add(input.value):selected.delete(input.value);saveSelection();renderChoices();renderSelection();}));
}
function selectedSourceRows(){
  return selectable.filter(x=>selected.has(x.id));
}
function renderSelection(){
  const rows=selectedSourceRows();
  $('#selectionHeading').textContent=rows.length?`${rows.length} calendar${rows.length===1?'':'s'} selected`:'Nothing selected yet';
  $('#selectionSummary').textContent=rows.length?'These subscriptions stay separate in your calendar app, so you can turn each one on or off later.':'Choose calendars on the left. Your selections are saved on this device.';
  $('#calendarActions').hidden=!rows.length;
  $('#selectedCalendars').innerHTML=rows.map(src=>{const url=absoluteFeed(src);return `<article class="selected-calendar"><div><b>${esc(src.name)}</b><small>${src.kind==='generated_live'?'Updated by Norwood.ma twice daily':'Updates directly from '+esc(src.provider)}</small></div><div class="selected-calendar-actions"><a href="${esc(webcal(url))}">Subscribe</a><button type="button" data-copy-feed="${esc(src.id)}">Copy URL</button></div></article>`;}).join('');
  $$('[data-copy-feed]').forEach(btn=>btn.addEventListener('click',async()=>{const src=byId.get(btn.dataset.copyFeed);await copyText(absoluteFeed(src));status(`Copied ${src.name}.`);}));
}
async function copyText(text){
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return;}
  const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
}
function status(message){const el=$('#calendarActionStatus');el.textContent=message;clearTimeout(status.t);status.t=setTimeout(()=>el.textContent='',4500);}

$$('[data-select-group]').forEach(btn=>btn.addEventListener('click',()=>{
  const ids=sources.filter(x=>x.group===btn.dataset.selectGroup&&x.feed_url).map(x=>x.id);
  const all=ids.every(id=>selected.has(id));ids.forEach(id=>all?selected.delete(id):selected.add(id));saveSelection();renderChoices();renderSelection();
}));

$('#copyCalendarUrls')?.addEventListener('click',async()=>{const rows=selectedSourceRows();await copyText(rows.map(x=>absoluteFeed(x)).join('\n'));status(`Copied ${rows.length} subscription URL${rows.length===1?'':'s'}.`);});
$('#clearCalendarSet')?.addEventListener('click',()=>{selected.clear();saveSelection();history.replaceState(null,'',location.pathname);renderChoices();renderSelection();status('Calendar selections cleared.');});
$('#shareCalendarSet')?.addEventListener('click',async()=>{const u=(location.protocol==='http:'||location.protocol==='https:')?new URL(location.href):new URL('calendars.html',canonicalBase);u.searchParams.set('c',[...selected].join(','));await copyText(u.href);status('Shareable calendar-selection link copied.');});

function matchesSelector(event,selector){
  if(selector?.all)return true;
  const cat=String(event.category||'').toLowerCase();
  const text=[event.title,event.notes,event.venue,event.category].filter(Boolean).join(' ').toLowerCase();
  if((selector?.categories||[]).includes(cat))return true;
  if((selector?.category_contains||[]).some(x=>cat.includes(String(x).toLowerCase())))return true;
  if((selector?.keywords||[]).some(x=>text.includes(String(x).toLowerCase())))return true;
  return false;
}
function icsEscape(s=''){return String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');}
function icsDate(d){return String(d||'').replaceAll('-','');}
function icsDateTime(date,time){return icsDate(date)+'T'+String(time||'09:00').replace(':','')+'00';}
function eventToIcs(e){
  const allDay=!e.start?.time;let lines=['BEGIN:VEVENT',`UID:${icsEscape(e.id)}@norwood.ma`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`];
  if(allDay){lines.push(`DTSTART;VALUE=DATE:${icsDate(e.start?.date)}`);const end=e.end?.date||e.start?.date;let dt=new Date(end+'T12:00:00');dt.setDate(dt.getDate()+1);lines.push(`DTEND;VALUE=DATE:${dt.toISOString().slice(0,10).replaceAll('-','')}`);}else{lines.push(`DTSTART;TZID=America/New_York:${icsDateTime(e.start?.date,e.start?.time)}`);if(e.end?.time)lines.push(`DTEND;TZID=America/New_York:${icsDateTime(e.end?.date||e.start?.date,e.end.time)}`);}
  lines.push(`SUMMARY:${icsEscape(e.title)}`);if(e.venue||e.address)lines.push(`LOCATION:${icsEscape([e.venue,e.address].filter(Boolean).join(' — '))}`);const desc=[e.notes,e.cost?`Cost: ${e.cost}`:'',e.source_url?`Source: ${e.source_url}`:''].filter(Boolean).join('\n');if(desc)lines.push(`DESCRIPTION:${icsEscape(desc)}`);if(e.source_url)lines.push(`URL:${icsEscape(e.source_url)}`);lines.push('END:VEVENT');return lines.join('\r\n');
}
$('#downloadCalendarSnapshot')?.addEventListener('click',()=>{
  const community=selectedSourceRows().filter(x=>x.kind==='generated_live');
  if(!community.length){status('Select at least one Norwood.ma community feed to create a current-event snapshot.');return;}
  const chosen=new Map();community.forEach(src=>events.filter(e=>matchesSelector(e,src.selector)).forEach(e=>chosen.set(e.id,e)));
  const cal=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Norwood.ma//Build My Calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:My Norwood.ma events',...([...chosen.values()].sort((a,b)=>(a.start?.date||'').localeCompare(b.start?.date||'')).map(eventToIcs)),'END:VCALENDAR'].join('\r\n');
  const blob=new Blob([cal],{type:'text/calendar;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='my-norwood-calendar.ics';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);status(`Downloaded ${chosen.size} current community event${chosen.size===1?'':'s'} as an .ics snapshot.`);
});

readSelection();renderDirectory();renderChoices();renderSelection();
