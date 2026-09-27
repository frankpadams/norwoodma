(()=>{
const KEY='norwoodSelectedCalendarsV1';
const EXCLUDE_KEY='norwoodExcludedDefaultCalendarsV1';
const sources=()=>Array.isArray(window.NORWOOD_CALENDAR_SOURCES)?window.NORWOOD_CALENDAR_SOURCES:[];
const curatedIds=['norwood-community'];
let selected;
try{selected=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
if(!Array.isArray(selected)||!selected.length)selected=curatedIds.slice();
let excludedDefaults=[];
try{excludedDefaults=JSON.parse(localStorage.getItem(EXCLUDE_KEY)||'[]')}catch(e){}
if(!Array.isArray(excludedDefaults))excludedDefaults=[];
const selectedSet=()=>new Set(selected);
const excludedSet=()=>new Set(excludedDefaults);
let expandedSourcesCache=null;
let defaultSourceIdsCache=null;
function groupLabel(g){return ({schools:'Schools','school-athletics':'School Athletics — choose all or individual sports',sports:'Youth & Local Sports',faith:'Faith Organizations',support:'Support Groups',parents:'Parents, Babies & Young Children',disability:'Disability & Neurodiversity',recovery:'Recovery & Addiction',seniors:'Older Adults & Caregivers',artsclasses:'Arts, Classes & Makers',clubs:'Clubs & Community Organizations',fitness:'Fitness & Recreation',volunteer:'Volunteer & Civic Opportunities',nearby:'Near Norwood',community:'Community calendars',recreation:'Norwood Recreation',possible_conflicts:'Conflict & facility schedules',more:'Official Town Calendars'}[g]||g);}
function matchesSelector(e,s){if(!s.selector)return false;if(s.dynamic_selector==='nys_team'&&s.team_key){const blob=[e.team,e.title,e.series,e.notes,e.grade,e.gender,e.program].filter(Boolean).join(' ').toLowerCase();return blob.includes(String(s.team_key).toLowerCase());}if(s.selector.all)return true;const sid=String(e.source_id||'').toLowerCase();if((s.selector.source_ids||[]).some(x=>sid===String(x).toLowerCase()))return true;if((s.selector.source_id_prefixes||[]).some(x=>sid.startsWith(String(x).toLowerCase())))return true;const cat=String(e.category||'').toLowerCase(),text=[e.title,e.notes,e.venue,e.category,e.organizer,e.source_id].filter(Boolean).join(' ').toLowerCase();if((s.selector.categories||[]).includes(cat))return true;if((s.selector.category_contains||[]).some(x=>cat.includes(x)))return true;if((s.selector.keywords||[]).some(x=>text.includes(x)))return true;return false;}
function matchesSource(e,s){if(s.selector)return matchesSelector(e,s);const id=String(e.source_id||'').trim().toLowerCase();const aliases={'nps-district':['nps-district'],'nps-nhs':['nps-nhs'],'nps-coakley':['nps-coakley'],'nps-balch':['nps-balch'],'nps-callahan':['nps-callahan'],'nps-cleveland':['nps-cleveland'],'nps-oldham':['nps-oldham'],'nps-prescott':['nps-prescott'],'nps-willett':['nps-willett'],'nps-athletics':['nps-athletics','norwood-high-athletics'],'nps-academics':['nps-academics'],'nps-extended-day':['nps-extended-day'],'library-calendar':['library-assabet-calendar','library-cfce'],'town-meetings':['town-civic'],'recreation-calendar':['town-recreation-programs','norwood-rec-sports'],'senior-calendar':['town-senior-newsletter','friends-coa-dances']};return (aliases[s.id]||[String(s.id||'').toLowerCase()]).includes(id);}
function isCuratedDefault(e){if(e.curated_default===true||e.whats_happening_default===true)return true;const sourceId=String(e.source_id||'').toLowerCase();if(sourceId==='library-assabet-calendar'||sourceId==='library-cfce')return true;const access=String(e.public_access||'public').toLowerCase();if(access==='private'||access==='members_only')return false;const cat=String(e.category||'').toLowerCase();const text=[e.title,e.series,e.notes].filter(Boolean).join(' ').toLowerCase();if(/practice|routine meeting|member meeting|board meeting/.test(text))return false;if(sourceId==='recovery-aa'||sourceId.startsWith('recovery-'))return true;return ['community','family','arts','festival','fundraiser','government','school','holiday','market','workshop','live_music','performance','comedy','wellness','games_social','music_community'].includes(cat)||/farmers market|concert|festival|norwood day|tree lighting|menorah|parade|blood drive|5k|open house|town common/.test(text);}function eventCalendarIds(e){return Array.isArray(e.calendar_ids)?e.calendar_ids:[];}
function defaultSourceIds(){
 if(defaultSourceIdsCache)return defaultSourceIdsCache;
 const ids=new Set();
 (Array.isArray(window.NORWOOD_EVENTS)?window.NORWOOD_EVENTS:[]).forEach(e=>{
   const tags=eventCalendarIds(e);
   if(tags.includes('norwood-community'))tags.forEach(id=>{if(id!=='norwood-community')ids.add(id);});
 });
 defaultSourceIdsCache=ids;
 return defaultSourceIdsCache;
}
function filtered(items){
 const set=selectedSet(),excluded=excludedSet();
 if(!set.size)return [];
 return items.filter(e=>{
   const tags=eventCalendarIds(e);
   // Compatibility fallback for an old/cached event artifact during deployment only.
   if(!tags.length){
     const all=expandedSources(),chosen=all.filter(s=>set.has(s.id)&&s.id!=='norwood-community');
     if(chosen.some(s=>matchesSource(e,s)))return true;
     if(!set.has('norwood-community')||!isCuratedDefault(e))return false;
     return !all.some(s=>s.id!=='norwood-community'&&excluded.has(s.id)&&matchesSource(e,s));
   }
   // Source-strict calendars must not trust a stale/keyword-generated calendar_id.
   // Revalidate against the event source before admitting the event.
   const strictIds=new Set(['town-police-events','town-fire-events']);
   for(const id of tags){
     if(id==='norwood-community'||!set.has(id))continue;
     if(strictIds.has(id)){
       const src=expandedSources().find(s=>s.id===id);
       if(src&&matchesSource(e,src))return true;
       continue;
     }
     return true;
   }
   if(!set.has('norwood-community')||!tags.includes('norwood-community'))return false;
   return !tags.some(id=>id!=='norwood-community'&&excluded.has(id));
 });
}
window.NORWOOD_CALENDAR_FILTER=filtered;
function fmtTime(v){if(!v)return '';try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(v));}catch(e){return v;}}
function detailHtml(s,health){
 const feed=s.feed_url||''; const absolute=feed?(new URL(feed,location.href)).href:'';
 const google=absolute?'https://calendar.google.com/calendar/r?cid='+encodeURIComponent(absolute.replace(/^https:/,'webcal:')):'';
 const apple=absolute?absolute.replace(/^https?:/,'webcal:'):'';
 const updated=health&&health.last_successful_update?fmtTime(health.last_successful_update):'No successful event update recorded yet';
 const checked=health&&health.last_checked?fmtTime(health.last_checked):'Not available';
 return `<div class="calendar-info-panel" id="info-${s.id}" hidden><p>${s.description||''}</p><dl class="calendar-info-meta"><div><dt>Last updated</dt><dd>${updated}</dd></div><div><dt>Last checked</dt><dd>${checked}</dd></div></dl><div class="calendar-info-actions">${absolute?`<a class="button secondary-button" href="${google}" target="_blank" rel="noopener">Add to Google Calendar ↗</a><a class="button secondary-button" href="${apple}">Add to Apple Calendar</a><button type="button" class="calendar-copy-feed" data-url="${absolute}">Copy subscription URL</button>`:''}${s.view_url?`<a class="calendar-org-link" href="${s.view_url}" target="_blank" rel="noopener">Visit ${s.provider||'calendar source'} ↗</a>`:''}</div>${!absolute?'<p class="muted small">Norwood.ma monitors this source and builds its calendar from published event data; the source does not provide a direct subscription feed.</p>':''}</div>`;
}
function healthForSource(s){
 const health=window.NORWOOD_CALENDAR_SOURCE_HEALTH||[];
 const ids=new Set([s.id,...(s.health_source_ids||[])].map(x=>String(x).toLowerCase()));
 const prefixes=(s.health_source_prefixes||[]).map(x=>String(x).toLowerCase());
 const matches=health.filter(h=>ids.has(String(h.source_id||'').toLowerCase())||prefixes.some(p=>String(h.source_id||'').toLowerCase().startsWith(p)));
 if(!matches.length)return null;
 const useful=matches.filter(h=>h.ok&&(Number(h.last_found||0)>0||!!h.last_successful_update));
 if(useful.length)return useful.sort((a,b)=>Number(b.last_found||0)-Number(a.last_found||0))[0];
 return matches.find(h=>h.ok)||matches[0];
}
function sourceAvailable(s,health){
 // A calendar choice represents a filter Norwood.ma knows how to apply. Its checkbox
 // must not disappear merely because the current refresh returned zero events or a
 // monitored website is temporarily unhealthy. Source health is diagnostic metadata.
 // Only explicitly discovery-only/nonselectable entries are disabled.
 if(s.selectable===false||s.discovery_only===true)return false;
 if(s.selector||s.feed_url||s.kind==='generated'||s.kind==='generated_live'||s.kind==='internal'||s.data_available===true)return true;
 // Monitor entries without a selector cannot filter the combined calendar reliably.
 return false;
}
function recreationSelectorSources(){
 const defs=[
  ['rec-all','All Norwood Recreation',null,'All Recreation program and event calendar entries.'],
  ['rec-special-events','Special Events','special_events','One-time and special Recreation events.'],
  ['rec-youth','Youth Programs & Classes','youth_programs','Youth, preschool and tot programs and classes.'],
  ['rec-adult-fitness','Adult Programs & Fitness','adult_fitness','Adult programs, exercise and fitness sessions.'],
  ['rec-sports','Sports & Leagues','sports_leagues','Recreation sports, leagues, clinics and lessons.'],
  ['rec-drop-in','Drop-In Recreation','drop_in','Programs explicitly offered for drop-in participation.'],
  ['rec-camps','Camps / School-Vacation Programs','camps_vacation','Camps, summer programs and school-vacation activities.']
 ];
 return defs.map(([id,name,cat,description])=>({id,group:'recreation',name,description,provider:'Norwood Recreation Department',view_url:'https://norwoodma.myrec.com/info/activities/default.aspx',kind:'internal',data_available:true,selector:cat?{source_ids:['town-recreation-programs','norwood-recreation'],categories:[cat]}:{source_ids:['town-recreation-programs','norwood-recreation']}}));
}
function expandedSources(){if(expandedSourcesCache)return expandedSourcesCache;const base=sources().filter(s=>!['recreation-calendar','norwood-youth-soccer','bays-norwood-soccer'].includes(s.id)).filter(s=>s.group!=='possible_conflicts').filter(s=>sourceAvailable(s,healthForSource(s))).concat(recreationSelectorSources());const ev=Array.isArray(window.NORWOOD_EVENTS)?window.NORWOOD_EVENTS:[];const soccer=ev.filter(e=>{const sid=String(e.source_id||'').toLowerCase();return sid==='resource-norwood-youth-soccer'||sid.includes('bays')||sid.includes('norwood-youth-soccer');});const grades=new Map();soccer.forEach(e=>{const grade=String(e.grade||'').trim();if(!grade)return;if(!grades.has(grade))grades.set(grade,new Set());const team=String(e.team||'').trim();if(team)grades.get(grade).add(team);});[...grades.keys()].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).forEach(grade=>{const gid='nys-grade-'+grade.toLowerCase().replace(/[^a-z0-9]+/g,'-');base.push({id:gid,group:'sports',name:'Norwood Youth Soccer — '+grade,description:'All Norwood Youth Soccer games and practices for '+grade+'.',provider:'Norwood Youth Soccer',view_url:'https://norwoodsoccer.com/schedules',kind:'internal',data_available:true,selector:{source_ids:['resource-norwood-youth-soccer'],source_id_prefixes:['bays','norwood-youth-soccer'],keywords:[grade]}});[...grades.get(grade)].sort((a,b)=>a.localeCompare(b)).forEach(team=>{const key=(grade+'|'+team).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');base.push({id:'nys-team-'+key,group:'sports',name:'↳ '+team+' — '+grade,description:'Only '+team+' games and practices ('+grade+').',provider:'Norwood Youth Soccer',view_url:'https://norwoodsoccer.com/schedules',kind:'internal',data_available:true,dynamic_selector:'nys_team',team_key:team,selector:{source_ids:['resource-norwood-youth-soccer'],source_id_prefixes:['bays','norwood-youth-soccer'],keywords:[team]}});});});expandedSourcesCache=base;return expandedSourcesCache;}function build(){const host=document.querySelector('#calendarFeedChoices');if(!host)return;const groups={};expandedSources().forEach(s=>(groups[s.group]||(groups[s.group]=[])).push(s));host.innerHTML=Object.entries(groups).map(([g,list])=>`<details class="calendar-feed-group" ${list.some(s=>selected.includes(s.id))?'open':''}><summary><strong>${groupLabel(g)}</strong><span>${list.filter(s=>selected.includes(s.id)).length?`${list.filter(s=>selected.includes(s.id)).length} selected`: `${list.length} calendars`}</span></summary>${(g==='sports'||g==='school-athletics')?'<div class="calendar-schedule-note"><strong>Schedule note:</strong> Youth and school sports schedules can change due to weather, field conditions, or league updates. Confirm with your team or league before heading out. <a href="https://norwoodma.myrec.com/info/facilities/default.aspx" target="_blank" rel="noopener" class="calendar-field-status">Check Norwood Field Status</a></div>':''}${list.map(s=>{const health=healthForSource(s);const available=sourceAvailable(s,health);const href=s.view_url||s.feed_url||'#';return available?`<div class="calendar-feed-option calendar-feed-available"><input type="checkbox" id="feed-${s.id}" value="${s.id}" ${(selected.includes(s.id)||(selected.includes('norwood-community')&&defaultSourceIds().has(s.id)&&!excludedSet().has(s.id)))?'checked':''}><label for="feed-${s.id}"><strong>${s.name}</strong><span>${s.description||''}</span></label><button type="button" class="calendar-feed-info" data-info-id="${s.id}" aria-expanded="false" aria-controls="info-${s.id}" aria-label="Information and subscription options for ${s.name}" title="Calendar details / subscribe">i</button>${detailHtml(s,health)}</div>`:`<div class="calendar-feed-option calendar-feed-unavailable"><input type="checkbox" class="calendar-unavailable-check" id="feed-${s.id}" data-feed-id="${s.id}"><label for="feed-${s.id}"><strong>${s.name}</strong><span>${s.description||''}</span></label><div class="calendar-unavailable-detail" id="feed-detail-${s.id}" hidden><strong>No live calendar feed is available to Norwood.ma yet.</strong><span>These events cannot currently be added to your combined Norwood.ma calendar.</span><a class="calendar-feed-source" href="${href}" target="_blank" rel="noopener">${/schedule|calendar/i.test(href)?'View schedules / calendar':'Visit '+(s.provider||'organization website')} ↗</a></div></div>`}).join('')}</details>`).join('');}
function parentChildMap(){
 const map=new Map();
 map.set('rec-all',['rec-special-events','rec-youth','rec-adult-fitness','rec-sports','rec-drop-in','rec-camps']);
 const all=expandedSources();
 if(all.some(x=>x.id==='pma-fine-arts')){
   const pmaChildren=all.filter(x=>x.id!=='pma-fine-arts'&&String(x.id||'').startsWith('pma-')).map(x=>x.id);
   if(pmaChildren.length)map.set('pma-fine-arts',pmaChildren);
 }
 all.filter(x=>String(x.id||'').startsWith('nys-grade-')).forEach(parent=>{
   const grade=String(parent.name||'').replace(/^Norwood Youth Soccer\s*[—-]\s*/,'').trim();
   const children=all.filter(x=>String(x.id||'').startsWith('nys-team-')&&String(x.name||'').endsWith('— '+grade)).map(x=>x.id);
   if(children.length)map.set(parent.id,children);
 });
 return map;
}
function syncParentChildCheckboxes(){
 const map=parentChildMap(),host=document.querySelector('#calendarFeedChoices');if(!host)return;
 const byId=id=>host.querySelector('#feed-'+CSS.escape(id));
 map.forEach((children,parentId)=>{
   const parent=byId(parentId),kids=children.map(byId).filter(Boolean);if(!parent||!kids.length)return;
   const refreshParent=()=>{const count=kids.filter(x=>x.checked).length;parent.checked=count===kids.length;parent.indeterminate=count>0&&count<kids.length;};
   parent.addEventListener('change',()=>{parent.indeterminate=false;kids.forEach(x=>x.checked=parent.checked);});
   kids.forEach(x=>x.addEventListener('change',refreshParent));
   refreshParent();
 });
}
function apply(){
 const checked=[...document.querySelectorAll('#calendarFeedChoices input:checked:not(.calendar-unavailable-check)')].map(x=>x.value);
 const defaults=defaultSourceIds();
 const communityOn=checked.includes('norwood-community');
 excludedDefaults=communityOn?[...defaults].filter(id=>!checked.includes(id)):[];
 // The checkboxes are authoritative. In particular, never silently restore
 // norwood-community after the user explicitly unchecks it.
 selected=checked.slice();
 try{localStorage.setItem(KEY,JSON.stringify(selected));localStorage.setItem(EXCLUDE_KEY,JSON.stringify(excludedDefaults))}catch(e){};try{if(typeof allEventsForPage!=='undefined'&&allEventsForPage.length){if(document.querySelector('#eventPeriods'))renderEventsPage(filtered(allEventsForPage));if(document.querySelector('#homeEvents'))renderHomeEvents(filtered(allEventsForPage));}}catch(e){};close();}
function close(){const p=document.querySelector('#calendarPicker'),b=document.querySelector('#calendarPickerToggle');if(p)p.hidden=true;if(b)b.setAttribute('aria-expanded','false');}
function setup(){const p=document.querySelector('#calendarPicker'),b=document.querySelector('#calendarPickerToggle');if(!p||!b)return;build();const params=new URLSearchParams(location.search);if(params.get('calendars')==='open'||location.hash==='#calendarPicker'){p.hidden=false;b.setAttribute('aria-expanded','true');setTimeout(()=>p.scrollIntoView({behavior:'smooth',block:'start'}),50);}const toggle=()=>{p.hidden=!p.hidden;b.setAttribute('aria-expanded',String(!p.hidden));};b.addEventListener('click',toggle);document.querySelector('.calendar-picker-close')?.addEventListener('click',close);document.querySelector('#calendarApply')?.addEventListener('click',apply);document.querySelector('#calendarSelectAll')?.addEventListener('click',()=>document.querySelectorAll('#calendarFeedChoices input').forEach(x=>x.checked=true));document.querySelector('#calendarClearAll')?.addEventListener('click',()=>document.querySelectorAll('#calendarFeedChoices input').forEach(x=>x.checked=false));document.querySelector('#calendarCurated')?.addEventListener('click',()=>{
 const defaults=defaultSourceIds();
 excludedDefaults=[];
 document.querySelectorAll('#calendarFeedChoices input').forEach(x=>{
   if(x.classList.contains('calendar-unavailable-check'))return;
   x.checked=curatedIds.includes(x.value)||defaults.has(x.value);
 });
});
document.querySelectorAll('.calendar-feed-info[data-info-id]').forEach(x=>x.addEventListener('click',()=>{const d=document.querySelector('#info-'+x.dataset.infoId);if(!d)return;d.hidden=!d.hidden;x.setAttribute('aria-expanded',String(!d.hidden));}));
document.querySelectorAll('.calendar-copy-feed').forEach(x=>x.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(x.dataset.url);const old=x.textContent;x.textContent='Copied';setTimeout(()=>x.textContent=old,1400);}catch(e){prompt('Copy this subscription URL:',x.dataset.url);}}));
document.querySelectorAll('.calendar-unavailable-check').forEach(x=>x.addEventListener('change',()=>{if(!x.checked)return;const s=expandedSources().find(v=>v.id===x.dataset.feedId);x.checked=false;if(!s)return;document.querySelector('#calendar-unavailable-dialog')?.remove();const href=s.view_url||s.feed_url||'';const dialog=document.createElement('dialog');dialog.id='calendar-unavailable-dialog';dialog.className='calendar-unavailable-dialog';dialog.innerHTML='<form method="dialog" class="calendar-unavailable-dialog-card"><button class="calendar-unavailable-close" value="close" aria-label="Close">×</button><h3>'+s.name+'</h3><p>Sorry... we were unable to find the calendar feed for this organization. If you have one to share with us, please let us know. In the meantime, try these links:</p>'+(href?'<div class="calendar-info-actions"><a class="button secondary-button" href="'+href+'" target="_blank" rel="noopener">View '+(/calendar|schedule/i.test(href)?'calendar / schedule':'organization website')+' ↗</a></div>':'')+'</form>';document.body.appendChild(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});dialog.showModal();}));
syncParentChildCheckboxes();
document.querySelector('#calendarFeedSearch')?.addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();document.querySelectorAll('.calendar-feed-group').forEach(g=>{let any=false;g.querySelectorAll('.calendar-feed-option').forEach(o=>{const show=!q||o.textContent.toLowerCase().includes(q);o.hidden=!show;if(show)any=true;});g.hidden=!!q&&!any;if(q&&any)g.open=true;});});
const rerender=()=>{try{if(typeof allEventsForPage!=='undefined'&&allEventsForPage.length){if(document.querySelector('#eventPeriods'))renderEventsPage(filtered(allEventsForPage));if(document.querySelector('#homeEvents'))renderHomeEvents(filtered(allEventsForPage));}}catch(e){}};setTimeout(rerender,100);setTimeout(rerender,700);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
