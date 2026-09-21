const $=s=>document.querySelector(s);
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

async function rotatingHero(){
  const el=$('#heroPhoto'), info=$('#photoInfo'), btn=$('#photoInfoButton'); if(!el||!info||!btn)return;
  try{
    let photos=window.NORWOOD_HERO_PHOTOS||[]; if(!photos.length){try{photos=await (await fetch('data/hero-photos.json')).json()}catch(e){}} if(!photos.length)return;
    let recent=[]; try{recent=JSON.parse(localStorage.getItem('norwoodHeroRecent')||'[]')}catch(e){}
    let preferred=photos.filter(x=>x.heroPriority==='primary'); if(preferred.length<2)preferred=photos.filter(x=>x.heroPriority!=='supporting'); if(!preferred.length)preferred=photos;
    let eligible=preferred.filter(x=>!recent.includes(x.id)); if(!eligible.length)eligible=preferred;
    // Weighted selection lets seasonal/special images appear less often without removing them from rotation.
    const weights=eligible.map(x=>Math.max(0,Number(x.weight??1))), totalWeight=weights.reduce((a,b)=>a+b,0);
    let photo=eligible[Math.floor(Math.random()*eligible.length)];
    if(totalWeight>0){let pick=Math.random()*totalWeight;for(let i=0;i<eligible.length;i++){pick-=weights[i];if(pick<=0){photo=eligible[i];break;}}}
    el.style.backgroundImage=`url("${photo.url.replace(/"/g,'%22')}")`; el.style.backgroundPosition=photo.position||'center'; el.setAttribute('aria-label',photo.alt);
    const hist=photo.historical?'<span class="historical-badge">HISTORIC IMAGE</span> ':'';
    const meta=photo.license==='Photo: Frank P. Adams' ? 'Photo: Frank P. Adams' : [photo.date,photo.creator,photo.license].filter(Boolean).map(esc).join(' · ');
    const sourceLink=photo.source ? `<a href="${photo.source}" target="_blank" rel="noopener">Image source and license ↗</a>` : '';
    info.innerHTML=`${hist}<strong>${esc(photo.title)}</strong><p>${esc(photo.description)}</p><p>${meta}</p>${sourceLink}`;
    recent=[photo.id,...recent.filter(x=>x!==photo.id)].slice(0,Math.min(3,Math.max(1,photos.length-1))); try{localStorage.setItem('norwoodHeroRecent',JSON.stringify(recent))}catch(e){}
    btn.addEventListener('click',()=>{const open=info.hidden;info.hidden=!open;btn.setAttribute('aria-expanded',String(open));});
  }catch(e){ el.setAttribute('aria-label','Norwood, Massachusetts'); }
}
rotatingHero();

const NEWS_BLOCK_PATTERNS=[/\bsponsored\b/i,/\badvertorial\b/i,/\bpartner content\b/i,/\bpaid content\b/i,/\bshopping\b/i,/\bcoupon(s)?\b/i,/\bpromo code\b/i,/\baffiliate\b/i,/\bbest prices?\b/i,/\bdeal(s)? of the day\b/i];
const OTHER_NORWOODS=[/Norwood,?\s*(Ohio|OH|New Jersey|NJ|Pennsylvania|PA|Colorado|CO|North Carolina|NC|New York|NY|Georgia|GA|Louisiana|LA|Missouri|MO)/i];
const LOCAL_SIGNALS=/Norwood,?\s*(Massachusetts|Mass\.?|MA)\b|Norfolk County|Norwood (Public Schools|Light|Hospital|Central|Depot|Memorial Airport|Record)|Morrill Memorial Library|Washington Street|Route 1\b/i;
function newsQuality(x){
 const text=[x.title,x.summary,x.source].filter(Boolean).join(' ');
 if(NEWS_BLOCK_PATTERNS.some(r=>r.test(text)))return {ok:false,reason:'advertisement'};
 if(OTHER_NORWOODS.some(r=>r.test(text)))return {ok:false,reason:'wrong_norwood'};
 if(x.localVerified===false)return {ok:false,reason:'insufficient_local_relevance'};
 if(x.localVerified!==true && /\bNorwood\b/i.test(text) && !LOCAL_SIGNALS.test(text))return {ok:false,reason:'ambiguous_norwood'};
 return {ok:true};
}

async function weather(){
 const temp=$('#temp'), forecast=$('#forecast'); if(!temp&&!forecast)return;
 try{let p=await fetch('https://api.weather.gov/points/42.1945,-71.1995');let pj=await p.json();let f=await fetch(pj.properties.forecast);let j=await f.json(),n=j.properties.periods[0];if(temp)temp.textContent=`${n.temperature}° · ${n.shortForecast}`;if(forecast)forecast.textContent=`${n.name} · ${n.windSpeed}`;}catch(e){if(forecast)forecast.textContent='Live weather temporarily unavailable';}
} weather();

function renderNews(items){
 const feed=$('#newsFeed'); if(!feed)return;
 const isHome=!!document.querySelector('#home'), now=Date.now(), day=24*60*60*1000, seen=new Set();
 let clean=(items||[]).filter(x=>{const d=Date.parse(x.date);if(!Number.isFinite(d)||d>now+day||!newsQuality(x).ok||!String(x.summary||'').trim())return false;const k=(x.title||'').trim().toLowerCase()+'|'+(x.url||'');if(seen.has(k))return false;seen.add(k);return true;}).sort((a,b)=>new Date(b.date)-new Date(a.date));
 // Use the smallest recent window that supplies a useful current-news set. The deeper queue remains available as resilience, not filler.
 const windows=[7,14,21,30,45,60,90,120], target=20; let selected=[], selectedDays=120;
 for(const days of windows){const cutoff=now-days*day, candidate=clean.filter(x=>Date.parse(x.date)>=cutoff);selected=candidate;selectedDays=days;if(candidate.length>=target)break;}
 // Preserve recency first; only diversify within two-day bands so an older item is never promoted far above newer reporting.
 const bands=new Map(); for(const x of selected){const age=Math.max(0,Math.floor((now-Date.parse(x.date))/day)), band=Math.floor(age/2);if(!bands.has(band))bands.set(band,[]);bands.get(band).push(x)}
 const mixed=[]; for(const band of [...bands.keys()].sort((a,b)=>a-b)){const group=bands.get(band), buckets=new Map();for(const x of group){const k=x.source||'Other';if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(x)}while([...buckets.values()].some(b=>b.length)){for(const b of buckets.values())if(b.length)mixed.push(b.shift())}}
 selected=mixed;
 const health=$('#feedHealth'); if(health)health.textContent=selected.length?`Local news from the past ${selectedDays} days · ${selected.length} verified stor${selected.length===1?'y':'ies'}`:'No verified local news is currently available';
 if(!selected.length){feed.innerHTML='<article><h3>No current headlines available</h3><p>We’ll keep checking local sources automatically.</p></article>';return;}
 const visibleItems=isHome?selected.slice(0,20):selected.slice(0,60), initialHome=9;
 feed.innerHTML=visibleItems.map((x,i)=>`<article class="${isHome && i>=initialHome?'news-extra':''}"><a href="${esc(x.url)}" target="_blank" rel="noopener"><h3>${esc(x.title)}</h3><p>${esc(x.summary||'Open the original article for details.')}</p></a></article>`).join('');
 const btn=$('#moreNews'); if(btn)btn.hidden=!isHome||selected.length<=initialHome;
}
async function news(){
 const feed=$('#newsFeed'); if(!feed)return;
 let items=Array.isArray(window.NORWOOD_NEWS)?window.NORWOOD_NEWS.slice():[];
 if(items.length)renderNews(items);
 try{const r=await fetch('data/news.json?fresh='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache'}});if(r.ok){const fresh=await r.json();if(Array.isArray(fresh)){items=fresh;renderNews(items);}}}catch(e){}
 if(!items.length)renderNews([]);
} news();

function dateKey(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;}
function parseLocalDate(s){if(!s)return null;const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12,0,0);}
function formatEventTime(t){if(!t)return '';const [h,m]=t.split(':').map(Number);return new Date(2000,0,1,h,m).toLocaleTimeString([],{hour:'numeric',minute:m?'2-digit':undefined});}
function shortDate(s){const d=parseLocalDate(s);return d?d.toLocaleDateString([],{month:'short',day:'numeric'}):'';}
function monthDayRange(events){
 const dates=events.map(e=>parseLocalDate(e.start?.date)).filter(Boolean); if(!dates.length)return '';
 const a=dates[0],b=dates[dates.length-1];
 if(dateKey(a)===dateKey(b))return a.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'}).toUpperCase();
 if(a.getMonth()===b.getMonth())return `${a.toLocaleDateString([],{month:'long'}).toUpperCase()} ${a.getDate()}–${b.getDate()}`;
 return `${a.toLocaleDateString([],{month:'short',day:'numeric'}).toUpperCase()} – ${b.toLocaleDateString([],{month:'short',day:'numeric'}).toUpperCase()}`;
}
function eventKind(cat='community'){
 const m={live_music:'Live music',music:'Live music',music_community:'Music & community',performance:'Performance',school_theatre:'School theatre',sports_education:'Figure skating',sports:'Sports',food_culture:'Food & culture',food:'Food & drink',market:'Market',business_community:'Local business',workshop:'Workshop',arts:'Arts & making',fundraiser:'Fundraiser',community:'Community'};return m[cat]||String(cat).replaceAll('_',' ');
}
function eventClass(cat='community'){if(/music/.test(cat))return'music';if(/arts|theatre|workshop/.test(cat))return'arts';if(/food|market/.test(cat))return'food';if(/sport|skating|race|fitness/.test(cat))return'sports';if(/fund/.test(cat))return'fundraiser';return'community';}
function eventSummary(e){const bits=[];if(e.start?.time&&e.start.time!=='00:00')bits.push(formatEventTime(e.start.time));if(e.end?.date&&e.end.date!==e.start?.date)bits.push(`${shortDate(e.start.date)}–${shortDate(e.end.date)}`);if(e.venue)bits.push(e.venue);if(e.town&&String(e.town).trim().toLowerCase()!=='norwood')bits.push(`${e.town}, MA`);if(e.cost)bits.push(e.cost);return bits.join(' · ')||e.address||'Open source for details.';}
async function loadEvents(){
 let items=Array.isArray(window.NORWOOD_EVENTS)?window.NORWOOD_EVENTS.slice():[];
 try{const r=await fetch('data/events.json',{cache:'no-store'});if(r.ok){const fresh=await r.json();if(Array.isArray(fresh))items=fresh;}}catch(e){}
 const today=dateKey(new Date());return items.filter(e=>(e.end?.date||e.start?.date||'')>=today&&e.publish_candidate!==false).sort((a,b)=>(a.start?.date||'').localeCompare(b.start?.date||'')||(a.start?.time||'99:99').localeCompare(b.start?.time||'99:99'));
}
function groupEvents(items){
 const now=new Date(),today=dateKey(now),tom=new Date(now);tom.setDate(tom.getDate()+1);const tomorrow=dateKey(tom);
 const sat=new Date(now);const delta=(6-now.getDay()+7)%7;sat.setDate(sat.getDate()+delta);const sun=new Date(sat);sun.setDate(sun.getDate()+1);const satKey=dateKey(sat),sunKey=dateKey(sun);
 const next7=new Date(now);next7.setDate(next7.getDate()+7);const next7Key=dateKey(next7);
 const g={today:[],tomorrow:[],weekend:[],next:[],save:[]};
 for(const e of items){const d=e.start?.date||'',end=e.end?.date||d;const activeToday=d<=today&&end>=today;if(activeToday)g.today.push(e);else if(d<today)continue;else if(d===tomorrow)g.tomorrow.push(e);else if(d===satKey||d===sunKey)g.weekend.push(e);else if(d>today&&d<=next7Key)g.next.push(e);else if(d>next7Key)g.save.push(e);}return g;
}
function eventRow(e){const d=parseLocalDate(e.start?.date),day=d?d.getDate():'',mon=d?d.toLocaleDateString([],{month:'short'}).toUpperCase():'',dow=d?d.toLocaleDateString([],{weekday:'short'}).toUpperCase():'';return `<a class="event-row ${eventClass(e.category)}" href="${esc(e.registration_url||e.source_url||'events.html')}" target="_blank" rel="noopener"><div class="event-date"><small>${dow}</small><b>${day}</b><span>${mon}</span></div><div class="event-body"><span class="event-kind">${esc(eventKind(e.category))}</span><h3>${esc(e.title)}</h3><p>${esc(eventSummary(e))}</p></div><span class="event-arrow">↗</span></a>`;}
function eventMatchesCalendar(e,key){
 if(!key||key==='all')return true;
 const cat=String(e.category||'').toLowerCase();
 const text=[e.title,e.notes,e.venue,e.category].filter(Boolean).join(' ').toLowerCase();
 const rules={
  arts:()=>['live_music','music_community','performance','school_theatre','music','arts','open_mic','comedy'].includes(cat),
  family:()=>['family','families','kids','children','child','storytime','teen','youth','school','craft'].some(x=>text.includes(x)),
  sports:()=>['sports','sports_education'].includes(cat)||['5k','race','skating','sport','fitness','walk'].some(x=>text.includes(x)),
  fundraisers:()=>cat.includes('fundraiser')||['fundraiser','fundraising','benefit','charity'].some(x=>text.includes(x)),
  'food-markets':()=>['food','food_culture','market','market_festival'].includes(cat)||['market','fair','food','dinner','brunch'].some(x=>text.includes(x))
 };return rules[key]?rules[key]():true;
}
let allEventsForPage=[],eventView='list';
function eventSearchText(e){return [e.title,e.notes,e.venue,e.address,e.town,e.category,e.organizer].filter(Boolean).join(' ').toLowerCase();}
let calendarCursor=new Date(),calendarSelected='';
function renderCalendarView(items){
 const byDate=new Map();for(const e of items){const k=e.start?.date;if(!k)continue;if(!byDate.has(k))byDate.set(k,[]);byDate.get(k).push(e)}
 if(!calendarSelected&&items.length){calendarSelected=items[0].start?.date||dateKey(new Date());const d=parseLocalDate(calendarSelected);if(d)calendarCursor=new Date(d.getFullYear(),d.getMonth(),1)}
 const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth(),first=new Date(y,m,1),days=new Date(y,m+1,0).getDate(),lead=first.getDay();
 const cells=[];for(let i=0;i<lead;i++)cells.push('<span class="month-empty" aria-hidden="true"></span>');
 for(let day=1;day<=days;day++){const k=dateKey(new Date(y,m,day)),count=(byDate.get(k)||[]).length;cells.push(`<button class="month-day ${k===calendarSelected?'selected':''} ${count?'has-events':''}" data-calendar-date="${k}" aria-pressed="${k===calendarSelected}"><span>${day}</span>${count?`<small>${count} event${count===1?'':'s'}</small>`:''}</button>`)}
 const chosen=byDate.get(calendarSelected)||[],selectedDate=parseLocalDate(calendarSelected);
 return `<section class="month-calendar"><div class="month-nav"><button type="button" data-month-step="-1" aria-label="Previous month">‹</button><h2>${calendarCursor.toLocaleDateString([],{month:'long',year:'numeric'})}</h2><button type="button" data-month-step="1" aria-label="Next month">›</button></div><div class="month-weekdays" aria-hidden="true">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>'<b>'+x+'</b>').join('')}</div><div class="month-grid">${cells.join('')}</div></section><section class="event-period calendar-selection"><div class="event-period-head"><h2>${selectedDate?selectedDate.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'}):'Select a day'}</h2></div><div class="event-list">${chosen.length?chosen.map(eventRow).join(''):'<p>No events currently listed for this day.</p>'}</div></section>`;
}
function renderEventsPage(items){
 const host=$('#eventPeriods'); if(!host)return;
 const calendarKey=new URLSearchParams(location.search).get('calendar')||'all';
 const q=($('#eventSearch')?.value||'').trim().toLowerCase();
 items=items.filter(e=>eventMatchesCalendar(e,calendarKey)).filter(e=>!q||eventSearchText(e).includes(q));
 const labels={all:'All community events',arts:'Arts, music & entertainment',family:'Family & kids',sports:'Sports & active events',fundraisers:'Fundraisers & benefits','food-markets':'Food, markets & fairs'};
 const title=document.querySelector('.events-hero h1'), intro=document.querySelector('.events-hero p:not(.eyebrow)');
 if(calendarKey!=='all'&&labels[calendarKey]){if(title)title.textContent=labels[calendarKey];if(intro)intro.textContent='A filtered Norwood.ma calendar view. Use the event link for the latest details.';}
 if(eventView==='calendar') host.innerHTML=renderCalendarView(items);
 else {
  const g=groupEvents(items),sections=[['today','Today'],['tomorrow','Tomorrow'],['weekend','This weekend'],['next','Next few days'],['save','Save the date']];
  host.innerHTML=sections.filter(([k])=>g[k].length).map(([k,label])=>`<section class="event-period ${k==='save'?'save-date':''}"><div class="event-period-head"><p class="eyebrow">${esc(monthDayRange(g[k]))}</p><h2>${label}</h2></div><div class="event-list">${g[k].map(eventRow).join('')}</div></section>`).join('')||'<section class="event-period"><p>No upcoming public events match this search.</p></section>';
 }
 const st=$('#eventsStatus');if(st)st.textContent=`${items.length} upcoming/current events · refreshed every two hours`;
}
function renderHomeEvents(items){const host=$('#homeEvents');if(!host)return;host.innerHTML=items.slice(0,3).map(e=>`<a href="${esc(e.source_url||'events.html')}" target="_blank" rel="noopener"><b>${esc(shortDate(e.start?.date))} · ${esc(e.title)}</b><span>${esc(eventSummary(e))}</span></a>`).join('')||'<span class="muted">No upcoming events currently verified.</span>';}
async function events(){if(!$('#eventPeriods')&&!$('#homeEvents'))return;const items=await loadEvents();allEventsForPage=items;renderEventsPage(items);renderHomeEvents(items);
 $('#eventSearch')?.addEventListener('input',()=>renderEventsPage(allEventsForPage));
 document.querySelectorAll('[data-event-view]').forEach(b=>b.addEventListener('click',()=>{eventView=b.dataset.eventView;document.querySelectorAll('[data-event-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderEventsPage(allEventsForPage);})); document.addEventListener('click',e=>{const day=e.target.closest('[data-calendar-date]');if(day){calendarSelected=day.dataset.calendarDate;renderEventsPage(allEventsForPage);return}const step=e.target.closest('[data-month-step]');if(step){calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+Number(step.dataset.monthStep),1);calendarSelected=dateKey(calendarCursor);renderEventsPage(allEventsForPage)}});
}events();

if(document.querySelector('#transitMap') && window.L){
const map=L.map('transitMap',{scrollWheelZoom:false}).setView([42.190,-71.198],14);
const basemap=L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles &copy; Esri — Source: Esri, HERE, Garmin, USGS, NGA, EPA, USDA, NPS'}).addTo(map);
let vehicleLayer=L.layerGroup().addTo(map),stopLayer=L.layerGroup().addTo(map),railStopLayer=L.layerGroup().addTo(map),shapeLayer=L.layerGroup().addTo(map),railShapeLayer=L.layerGroup().addTo(map);
function vehicleIcon(kind,bearing){const emoji=kind==='bus'?'🚌':'🚆',bg=kind==='bus'?'#F2C100':'#785a91';return L.divIcon({className:'',html:`<div class="vehicle transit-vehicle" style="background:${bg};transform:rotate(${Number.isFinite(bearing)?bearing:0}deg)"><span style="display:block;transform:rotate(${Number.isFinite(bearing)?-bearing:0}deg)">${emoji}</span><i class="direction-arrow">▲</i></div>`,iconSize:[34,34],iconAnchor:[17,17]})}
function decodePolyline(str){let index=0,lat=0,lng=0,coords=[];while(index<str.length){let b,shift=0,result=0;do{b=str.charCodeAt(index++)-63;result|=(b&0x1f)<<shift;shift+=5}while(b>=0x20);lat+=(result&1)?~(result>>1):(result>>1);shift=0;result=0;do{b=str.charCodeAt(index++)-63;result|=(b&0x1f)<<shift;shift+=5}while(b>=0x20);lng+=(result&1)?~(result>>1):(result>>1);coords.push([lat/1e5,lng/1e5])}return coords}
const mbtaGet=u=>fetch(u).then(r=>{if(!r.ok)throw Error(r.status);return r.json()});function direction(route,v){const id=v.attributes.direction_id;return route?.attributes?.direction_destinations?.[id]||route?.attributes?.direction_names?.[id]||`Direction ${id}`}function busDir(v){return Number(v.attributes.direction_id)===0?'Inbound → Forest Hills':'Outbound → Walpole'}function railDir(v){const d=Number(v.attributes.direction_id);return d===1?'Inbound → Boston':'Outbound → Franklin/Foxboro'}function statusText(s){return String(s||'Live vehicle').toLowerCase().replaceAll('_',' ').replace(/^./,x=>x.toUpperCase())}function when(x){const d=x.attributes.departure_time||x.attributes.arrival_time;if(!d)return 'Time unavailable';const min=Math.round((new Date(d)-Date.now())/60000);const eta=new Date(Date.now()+Math.max(0,min)*60000).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});return min<=0?`Due · est. ${eta}`:min===1?`1 min · est. ${eta}`:`${min} min · est. ${eta}`}function nearestPassedStop(v,stops){if(!stops.length)return'';const lat=v.attributes.latitude,lon=v.attributes.longitude;let best=null,bd=1e9;for(const s of stops){const a=s.attributes;if(!a.latitude)continue;const d=(a.latitude-lat)**2+(a.longitude-lon)**2;if(d<bd){bd=d;best=s}}return best?.attributes?.name||''}function stationTimes(pred){const groups={inbound:[],outbound:[]};pred.forEach(z=>(Number(z.attributes.direction_id)===1?groups.inbound:groups.outbound).push(when(z)));return `<div class="dir"><span>Inbound</span><span>${groups.inbound.slice(0,2).map(esc).join(' · ')||'No prediction'}</span></div><div class="dir"><span>Outbound</span><span>${groups.outbound.slice(0,2).map(esc).join(' · ')||'No prediction'}</span></div>`}
async function mbta(){try{const [br,tr,bv,tv,bs,rs,bh,rh]=await Promise.all([mbtaGet('https://api-v3.mbta.com/routes/34E'),mbtaGet('https://api-v3.mbta.com/routes/CR-Franklin'),mbtaGet('https://api-v3.mbta.com/vehicles?filter[route]=34E'),mbtaGet('https://api-v3.mbta.com/vehicles?filter[route]=CR-Franklin'),mbtaGet('https://api-v3.mbta.com/stops?filter[route]=34E'),mbtaGet('https://api-v3.mbta.com/stops?filter[route]=CR-Franklin'),mbtaGet('https://api-v3.mbta.com/shapes?filter[route]=34E'),mbtaGet('https://api-v3.mbta.com/shapes?filter[route]=CR-Franklin')]);vehicleLayer.clearLayers();stopLayer.clearLayers();railStopLayer.clearLayers();shapeLayer.clearLayers();railShapeLayer.clearLayers();
const localBusStops=(bs.data||[]).filter(x=>x.attributes.latitude>42.15&&x.attributes.latitude<42.23&&x.attributes.longitude>-71.24&&x.attributes.longitude<-71.15);(bv.data||[]).filter(v=>v.attributes.latitude).forEach(v=>{const loc=nearestPassedStop(v,localBusStops);L.marker([v.attributes.latitude,v.attributes.longitude],{icon:vehicleIcon('bus',v.attributes.bearing)}).bindPopup(`<b>34E · ${esc(busDir(v))}</b><br>${loc?`Last reported near <span class="bus-location">${esc(loc)}</span><br>`:''}${esc(statusText(v.attributes.current_status))}<br>Updated: ${new Date(v.attributes.updated_at).toLocaleTimeString()}`).addTo(vehicleLayer)});
(tv.data||[]).filter(v=>v.attributes.latitude).forEach(v=>{const toward=direction(tr.data,v);L.marker([v.attributes.latitude,v.attributes.longitude],{icon:vehicleIcon('train',v.attributes.bearing)}).bindPopup(`<b>Franklin/Foxboro · Toward ${esc(toward)}</b><br>${esc(statusText(v.attributes.current_status))}`).addTo(vehicleLayer)});
localBusStops.forEach(x=>L.circleMarker([x.attributes.latitude,x.attributes.longitude],{radius:5,color:'#003B71',weight:2,fillColor:'#fff',fillOpacity:1}).bindPopup(`<b>${esc(x.attributes.name)}</b><br>34E stop`).addTo(stopLayer));
const localRail=(rs.data||[]).filter(x=>/Norwood Central|Norwood Depot|Windsor Gardens/i.test(x.attributes.name));let stationCards=[];for(const x of localRail){let pred=[];try{pred=(await mbtaGet(`https://api-v3.mbta.com/predictions?filter[route]=CR-Franklin&filter[stop]=${encodeURIComponent(x.id)}`)).data||[]}catch(e){};pred=pred.filter(z=>z.attributes.departure_time||z.attributes.arrival_time).sort((a,b)=>new Date(a.attributes.departure_time||a.attributes.arrival_time)-new Date(b.attributes.departure_time||b.attributes.arrival_time));const times=stationTimes(pred);stationCards.push(`<div class="station-arrivals"><b>${esc(x.attributes.name)}</b>${times}</div>`);L.circleMarker([x.attributes.latitude,x.attributes.longitude],{radius:8,color:'#785a91',weight:3,fillColor:'#fff',fillOpacity:1}).bindTooltip(esc(x.attributes.name),{permanent:true,direction:'top',className:'station-label',offset:[0,-8]}).bindPopup(`<b>🚆 ${esc(x.attributes.name)}</b><br>Franklin/Foxboro Line${times}`).addTo(railStopLayer)}document.querySelector('#selectedInfo').innerHTML=stationCards.join('');
(bh.data||[]).forEach(x=>x.attributes.polyline&&L.polyline(decodePolyline(x.attributes.polyline),{color:'#003B71',weight:5,opacity:.72}).addTo(shapeLayer));(rh.data||[]).forEach(x=>x.attributes.polyline&&L.polyline(decodePolyline(x.attributes.polyline),{color:'#785a91',weight:4,opacity:.7,dashArray:'8 6'}).addTo(railShapeLayer));$('#busStatus').textContent=`34E: ${bv.data?.length||0} live bus${bv.data?.length===1?'':'es'} · tap a bus for direction`;$('#railStatus').textContent=`Franklin/Foxboro: Norwood Central + Depot + Windsor Gardens · ${tv.data?.length||0} live train${tv.data?.length===1?'':'s'}`;$('#mapUpdated').textContent='LIVE · '+new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});}catch(e){$('#busStatus').textContent='Live MBTA data unavailable';$('#railStatus').textContent='Live MBTA data unavailable';$('#mapUpdated').textContent='MBTA CONNECTION ISSUE'}}mbta();setInterval(mbta,20000);
}


async function homeTransitAlerts(){
 const box=document.querySelector('#homeTransitAlerts');if(!box)return;
 try{const r=await fetch('https://api-v3.mbta.com/alerts?filter[route]=34E,CR-Franklin');if(!r.ok)throw Error(r.status);const j=await r.json(),alerts=j.data||[];
  if(!alerts.length){box.hidden=true;box.innerHTML='';return;}
  box.innerHTML='<span class="home-transit-alert-label">SERVICE ALERT'+(alerts.length===1?'':'S')+'</span><b>'+alerts.length+' current MBTA alert'+(alerts.length===1?'':'s')+'</b><small>View alert details →</small>';box.hidden=false;
 }catch(e){box.hidden=true;}
}homeTransitAlerts();setInterval(homeTransitAlerts,60000);

document.querySelector('#moreNews')?.addEventListener('click',function(){let feed=document.querySelector('#newsFeed');let open=feed.classList.toggle('expanded');this.textContent=open?'Show fewer headlines ↑':'Show more local headlines ↓'});
async function timely(){
 const box=document.querySelector('#timelyItems'),alert=document.querySelector('#timelyAlert');
 if(!box||!alert)return;
 // The site-wide strip is reserved for broadly relevant, genuinely urgent town information.
 // Transit service alerts belong in the homepage transit card and detailed Transit page instead.
 box.innerHTML='';alert.hidden=true;
} timely();

function featuredCommunity(){
 const data=window.NORWOOD_FEATURED||null, section=document.querySelector('#featuredCommunity'); if(!data||!section||!data.enabled)return;
 const today=new Date(); const starts=data.starts?new Date(data.starts+'T00:00:00'):null, expires=data.expires?new Date(data.expires+'T23:59:59'):null;
 if((starts&&today<starts)||(expires&&today>expires))return;
 document.querySelector('#featuredEyebrow').textContent=data.eyebrow||'AROUND TOWN';
 document.querySelector('#featuredTitle').textContent=data.title||''; document.querySelector('#featuredSummary').textContent=data.summary||'';
 const a=document.querySelector('#featuredLink'); if(data.url){a.href=data.url;a.textContent=(data.link_label||'Learn more')+' →';}else a.hidden=true; section.hidden=false;
}
featuredCommunity();
