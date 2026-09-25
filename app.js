const $=s=>document.querySelector(s);
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

async function rotatingHero(){
  const el=$('#heroPhoto'), info=$('#photoInfo'), btn=$('#photoInfoButton'); if(!el||!info||!btn)return;
  try{
    let photos=window.NORWOOD_HERO_PHOTOS||[]; if(!photos.length){try{photos=await (await fetch('data/hero-photos.json')).json()}catch(e){}} if(!photos.length)return;
    let recent=[]; try{recent=JSON.parse(localStorage.getItem('norwoodHeroRecent')||'[]')}catch(e){}
    if(window.matchMedia('(min-width: 768px)').matches) photos=photos.filter(x=>x.desktopEligible!==false);
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

function rotatingHeroMessage(){
  const title=$('#hero-title'); if(!title)return;
  const messages=[
    "There’s more happening around town than you think.",
    "Discover something new about the town you already love.",
    "There’s always more to discover close to home.",
    "Everything Norwood has to offer, a little easier to find.",
    "You live here. Might as well know what’s going on.",
    "Everything Norwood, minus the town Facebook argument.",
    "Because nobody should need six browser tabs to figure out trash day.",
    "Local information… without the drama of a comments section.",
    "We organize Norwood information recreationally. Apparently.",
    "Not the official town website. That’s kind of the point. Unofficial. Uncomplicated.",
    "Trash. Trains. Trails. Trivia. We somehow ended up with all of it.",
    "Town meetings and dinner ideas. Democracy works up an appetite.",
    "From potholes to pad thai, we’ve probably got a link.",
    "Side effects may include knowing what’s happening this weekend.",
    "From school calendars to sushi, somehow it’s all here.",
    "From voting precincts to vindaloo, we’ve looked it up.",
    "From pizza to pickleball — find it here.",
    "Can’t decide where to eat? We literally built a spinner.",
    "Dinner decisions and scheduling collisions. We have tools for that.",
    "We built a Dinner Spinner. Things escalated from there."
  ];
  title.textContent=messages[Math.floor(Math.random()*messages.length)];
}
rotatingHeroMessage();

const NEWS_BLOCK_PATTERNS=[/\bobituar(?:y|ies)\b/i,/\bin memoriam\b/i,/\bpassed away\b/i,/\bfuneral (?:home|service|services)\b/i,/\bvisitation\b/i,/\bcelebration of life\b/i,/\bdeath notice\b/i,/\bsponsored\b/i,/\badvertorial\b/i,/\bpartner content\b/i,/\bpaid content\b/i,/\bshopping\b/i,/\bcoupon(s)?\b/i,/\bpromo code\b/i,/\baffiliate\b/i,/\bbest prices?\b/i,/\bdeal(s)? of the day\b/i,/\brealtor\.com\b/i,/\bzillow\b/i,/\bredfin\b/i,/\btrulia\b/i,/^posts pagination$/i];
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

function newsSourceKey(x){
 return String(x.source||'Unknown').trim().toLowerCase();
}
function diversifyNewsChronologically(items){
 // Keep the feed fundamentally newest-first, but avoid long same-source runs
 // when another source has a nearly-as-recent story available.
 const out=(items||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
 const maxGap=36*60*60*1000;
 for(let i=2;i<out.length;i++){
  const s0=newsSourceKey(out[i-2]),s1=newsSourceKey(out[i-1]),s2=newsSourceKey(out[i]);
  if(!(s0===s1&&s1===s2))continue;
  const anchor=Date.parse(out[i].date);
  for(let j=i+1;j<out.length;j++){
   const candidate=Date.parse(out[j].date);
   if(!Number.isFinite(anchor)||!Number.isFinite(candidate)||anchor-candidate>maxGap)break;
   if(newsSourceKey(out[j])!==s2){
    const swap=out[i];out[i]=out[j];out[j]=swap;break;
   }
  }
 }
 return out;
}

function renderNews(items){
 const feed=$('#newsFeed'); if(!feed)return;
 const isHome=!!document.querySelector('#home'), now=Date.now(), day=24*60*60*1000, seen=new Set();
 let clean=diversifyNewsChronologically((items||[]).filter(x=>{const d=Date.parse(x.date);if(!Number.isFinite(d)||d>now+day||!newsQuality(x).ok)return false;const k=(x.title||'').trim().toLowerCase()+'|'+(x.url||'');if(seen.has(k))return false;seen.add(k);return true;}));
 let selected=[], selectedDays;
 if(isHome){
  // Homepage stays compact and adapts to the smallest recent window that supplies enough current stories.
  const windows=[7,14,21,30,45], target=20; selectedDays=45;
  for(const days of windows){const cutoff=now-days*day, candidate=clean.filter(x=>Date.parse(x.date)>=cutoff);selected=candidate;selectedDays=days;if(candidate.length>=target)break;}
 }else{
  // Expanded News page: show all qualifying stories from the past 45 days, strictly newest first.
  selectedDays=45;
  const cutoff=now-45*day;
  selected=diversifyNewsChronologically(clean.filter(x=>Date.parse(x.date)>=cutoff));
 }
 const health=$('#feedHealth'); if(health)health.textContent=selected.length?`Local news from the past ${selectedDays} days · ${selected.length} verified stor${selected.length===1?'y':'ies'}`:'No verified local news is currently available';
 if(!selected.length){feed.innerHTML='<article><h3>No current headlines available</h3><p>We’ll keep checking local sources automatically.</p></article>';return;}
 const visibleItems=isHome?selected.slice(0,20):selected.slice(0,60), initialHome=9;
 feed.innerHTML=visibleItems.map((x,i)=>{const image=!isHome&&(x.image||x.thumbnail||x.image_url||x.imageUrl);const thumb=image?`<img class="news-thumb" src="${esc(image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove();this.closest('article')?.classList.remove('has-thumb')">`:'';return `<article class="${isHome && i>=initialHome?'news-extra':''}${image?' has-thumb':''}">${thumb}<a href="${esc(x.url)}" target="_blank" rel="noopener"><h3>${esc(x.title)}</h3><p>${esc(x.summary||'Open the original article for details.')}</p></a></article>`;}).join('');
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
 const m={live_music:'Live music',music:'Live music',music_community:'Music & community',performance:'Performance',school_theatre:'School theatre',sports_education:'Figure skating',sports:'Sports',food_culture:'Food & culture',food:'Food & drink',market:'Market',assistance:'Community assistance',business_community:'Local business',workshop:'Workshop',arts:'Arts & making',fundraiser:'Fundraiser',community:'Community',civic_meeting:'Town meeting'};return m[cat]||String(cat).replaceAll('_',' ');
}
function eventClass(cat='community'){if(/music/.test(cat))return'music';if(/arts|theatre|workshop/.test(cat))return'arts';if(/assistance/.test(cat))return'community';if(/food|market/.test(cat))return'food';if(/sport|skating|race|fitness/.test(cat))return'sports';if(/fund/.test(cat))return'fundraiser';return'community';}
function eventHasPaidAdmission(e){const cost=String(e.cost||'').trim().toLowerCase();return !!cost&&!/^free\b/.test(cost)&&!/donation|suggested/.test(cost)&&(/\$|admission|ticket|fee|per person|per child|per adult/.test(cost));}
function paidAdmissionIcon(e){return eventHasPaidAdmission(e)?'<span class="paid-admission" aria-label="Paid admission" title="Paid admission">$</span>':'';}
function eventSummary(e){const bits=[];if(e.start?.time&&e.start.time!=='00:00')bits.push(formatEventTime(e.start.time));if(e.end?.date&&e.end.date!==e.start?.date)bits.push(`${shortDate(e.start.date)}–${shortDate(e.end.date)}`);if(e.venue)bits.push(e.venue);if(e.town&&String(e.town).trim().toLowerCase()!=='norwood')bits.push(`${e.town}, MA`);if(e.cost)bits.push(e.cost);if(String(e.category||'').toLowerCase().includes('fundraiser')&&e.organizer)bits.push(`Benefits: ${e.organizer}`);return bits.join(' · ')||e.address||'Open source for details.';}
function eventPriority(e){
 const text=[e.title,e.notes,e.venue,e.address,e.organizer,e.source_id].filter(Boolean).join(' ').toLowerCase();
 if(/farmers'? market|farmer'?s market|town-farmers-market|town common|norwood common|580 washington st/.test(text))return 0;
 if(e.category==='assistance'||/food pantry|food assistance|food distribution|free meal|community meal|soup kitchen|clothing giveaway|diaper distribution|resource fair/.test(text))return 1;
 const religious=/\b(church|parish|chapel|congregation|temple|synagogue|mosque|mandir|worship|mass|bible|prayer|faith|ministry|saint catherine|st\. catherine|first congregational|grace episcopal|united church)\b/.test(text);
 return religious?2:1;
}
function compareEventDisplay(a,b){
 const p=eventPriority(a)-eventPriority(b);if(p)return p;
 const d=(a.start?.date||'').localeCompare(b.start?.date||'');if(d)return d;
 return (a.start?.time||'99:99').localeCompare(b.start?.time||'99:99');
}
function eventSourceKey(e){
 const combined=[e.source_id,e.organizer,e.venue].filter(Boolean).join(' ').toLowerCase();
 if(/library|morrill/.test(combined))return'norwood-library';
 return String(e.organizer||e.source_id||e.venue||'other').toLowerCase().replace(/[^a-z0-9]+/g,'-');
}
function diversifySameDayEvents(list){
 const byDate=new Map();
 list.forEach(e=>{const d=e.start?.date||'';if(!byDate.has(d))byDate.set(d,[]);byDate.get(d).push(e)});
 const out=[];
 [...byDate.keys()].sort().forEach(d=>{
   const day=byDate.get(d);
   const ordered=day.slice().sort(compareEventDisplay);
   // Town Common events and the Farmers Market always lead their day.
   const pinned=ordered.filter(e=>eventPriority(e)===0);
   const remainder=ordered.filter(e=>eventPriority(e)!==0);
   out.push(...pinned);
   const queues=new Map();
   remainder.forEach(e=>{const k=eventSourceKey(e);if(!queues.has(k))queues.set(k,[]);queues.get(k).push(e)});
   let last=pinned.length?eventSourceKey(pinned[pinned.length-1]):'';
   while(queues.size){
     const choices=[...queues.entries()].filter(([k])=>k!==last&&queues.size>1);
     const pool=choices.length?choices:[...queues.entries()];
     pool.sort((a,b)=>compareEventDisplay(a[1][0],b[1][0]));
     const [key,q]=pool[0],e=q.shift();out.push(e);last=key;if(!q.length)queues.delete(key);
   }
 });
 return out;
}
async function loadEvents(){
 let items=Array.isArray(window.NORWOOD_EVENTS)?window.NORWOOD_EVENTS.slice():[];
 try{const r=await fetch('data/events.json',{cache:'no-store'});if(r.ok){const fresh=await r.json();if(Array.isArray(fresh))items=fresh;}}catch(e){}
 // Public board/committee meetings are maintained separately for the time-sensitive
 // alert system, but they also belong in the community calendar.
 try{
   const r=await fetch('data/civic-notices.json?fresh='+Date.now(),{cache:'no-store'});
   if(r.ok){
     const data=await r.json(), notices=Array.isArray(data)?data:(data.notices||[]);
     for(const n of notices){
       if(n.kind!=='meeting'||!n.date)continue;
       const id='civic-meeting-'+String(n.date)+'-'+String(n.title||'meeting').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
       const civicTitleKey=s=>String(s||'').toLowerCase().replace(/\b(meeting|hearing|session)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
       // Treat source-title variants such as "Airport Commission" and
       // "Airport Commission Meeting" as the same civic event.
       if(items.some(e=>e.id===id||(e.start?.date===n.date&&civicTitleKey(e.title)===civicTitleKey(n.title))))continue;
       items.push({
         id,
         title:n.title||'Public meeting',
         start:{date:n.date,time:n.start_time||null},
         end:{date:n.date,time:n.end_time||null},
         venue:n.venue||'Town of Norwood',
         address:n.address||null,
         category:'civic_meeting',
         source_id:'town-civic-meetings',
         source_url:n.url||'https://www.norwoodma.gov/#section4-anchor',
         public_access:'public',
         publish_candidate:true,
         verification_status:'civic_notice',
         notes:'Come back to Norwood.ma at meeting time to watch live when a live stream is available.'
       });
     }
   }
 }catch(e){}
 const today=dateKey(new Date());return items.filter(e=>(e.end?.date||e.start?.date||'')>=today&&e.publish_candidate!==false).sort((a,b)=>(a.start?.date||'').localeCompare(b.start?.date||'')||(a.start?.time||'99:99').localeCompare(b.start?.time||'99:99'));
}
function groupEvents(items){
 const now=new Date(),today=dateKey(now),tom=new Date(now);tom.setDate(tom.getDate()+1);const tomorrow=dateKey(tom);
 const sat=new Date(now);const delta=(6-now.getDay()+7)%7;sat.setDate(sat.getDate()+delta);const sun=new Date(sat);sun.setDate(sun.getDate()+1);const satKey=dateKey(sat),sunKey=dateKey(sun);
 const next7=new Date(now);next7.setDate(next7.getDate()+7);const next7Key=dateKey(next7);
 const g={today:[],tomorrow:[],weekend:[],next:[],save:[]};
 for(const e of items){const d=e.start?.date||'',end=e.end?.date||d;const activeToday=d<=today&&end>=today;if(activeToday)g.today.push(e);else if(d<today)continue;else if(d===tomorrow)g.tomorrow.push(e);else if(d===satKey||d===sunKey)g.weekend.push(e);else if(d>today&&d<=next7Key)g.next.push(e);else if(d>next7Key)g.save.push(e);}Object.keys(g).forEach(k=>{g[k]=diversifySameDayEvents(g[k]);});return g;
}
function eventLinks(e){const links=[];const add=(url,label)=>{if(url&&!links.some(x=>x.url===url))links.push({url,label})};add(e.registration_url,'Participate / register');add(e.donation_url,'Donate / support');add(e.purchase_url,'Purchase / order');add(e.source_url,'Official event information');(Array.isArray(e.links)?e.links:[]).forEach(x=>{if(typeof x==='string')add(x,'More information');else if(x&&x.url)add(x.url,x.label||'More information')});return links;}
function eventRow(e){const d=parseLocalDate(e.start?.date),day=d?d.getDate():'',mon=d?d.toLocaleDateString([],{month:'short'}).toUpperCase():'',dow=d?d.toLocaleDateString([],{weekday:'short'}).toUpperCase():'',civic=e.category==='civic_meeting'?'<p class="civic-watch-note">Come back to Norwood.ma at meeting time to watch live.</p>':'',links=eventLinks(e),direct=links.length===1,href=direct?links[0].url:`events.html?event=${encodeURIComponent(e.id||'')}`,multi=!!(e.end?.date&&e.start?.date&&e.end.date!==e.start.date),range=multi?`<p class="event-date-range"><strong>${String(e.category||'').toLowerCase().includes('fundraiser')?'Fundraiser runs':'Runs'}:</strong> ${esc(shortDate(e.start.date))}–${esc(shortDate(e.end.date))}</p>`:'';return `<a class="event-row ${eventClass(e.category)}" href="${esc(href)}" ${direct?'target="_blank" rel="noopener"':''}><div class="event-date"><small>${dow}</small><b>${day}</b><span>${mon}</span></div><div class="event-body"><div class="event-kind-line"><span class="event-kind">${esc(eventKind(e.category))}</span>${paidAdmissionIcon(e)}</div><h3>${esc(e.title)}</h3>${range}<p>${esc(eventSummary(e))}</p>${civic}</div><span class="event-arrow">${direct?'↗':'→'}</span></a>`;}
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
 const chosen=diversifySameDayEvents((byDate.get(calendarSelected)||[]).slice()),selectedDate=parseLocalDate(calendarSelected);
 return `<section class="month-calendar"><div class="month-nav"><button type="button" data-month-step="-1" aria-label="Previous month">‹</button><h2>${calendarCursor.toLocaleDateString([],{month:'long',year:'numeric'})}</h2><button type="button" data-month-step="1" aria-label="Next month">›</button></div><div class="month-weekdays" aria-hidden="true">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>'<b>'+x+'</b>').join('')}</div><div class="month-grid">${cells.join('')}</div></section><section class="event-period calendar-selection"><div class="event-period-head"><h2>${selectedDate?selectedDate.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'}):'Select a day'}</h2></div><div class="event-list">${chosen.length?chosen.map(eventRow).join(''):'<p>No events currently listed for this day.</p>'}</div></section>`;
}
function renderEventsPage(items){
 const host=$('#eventPeriods'); if(!host)return;
 const params=new URLSearchParams(location.search);
 const eventId=params.get('event');
 const calendarKey=params.get('calendar')||'all';
 const q=($('#eventSearch')?.value||'').trim().toLowerCase();
 items=items.filter(e=>eventMatchesCalendar(e,calendarKey)).filter(e=>!q||eventSearchText(e).includes(q));
 if(eventId){
   const e=items.find(x=>String(x.id||'')===eventId);
   if(e){
     const d=parseLocalDate(e.start?.date);
     const dateLabel=d?d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric',year:'numeric'}):(e.start?.date||'');
     const timeBits=[];if(e.start?.time)timeBits.push(formatEventTime(e.start.time));if(e.end?.time)timeBits.push(formatEventTime(e.end.time));
     const where=[e.venue,e.address].filter(Boolean).join(' · ');
     const links=eventLinks(e);const linkHtml=links.length?'<div class="event-detail-links"><strong>Links:</strong>'+links.map(x=>'<p><a href="'+esc(x.url)+'" target="_blank" rel="noopener">'+esc(x.label)+' ↗</a></p>').join('')+'</div>':'';
     host.innerHTML='<section class="event-period"><div class="event-period-head"><p class="eyebrow">Event details</p><h2>'+esc(e.title)+'</h2></div><div class="event-list"><article class="event-row '+eventClass(e.category)+'"><div class="event-date"><small>'+esc(d?d.toLocaleDateString([],{weekday:'short'}).toUpperCase():'')+'</small><b>'+esc(d?d.getDate():'')+'</b><span>'+esc(d?d.toLocaleDateString([],{month:'short'}).toUpperCase():'')+'</span></div><div class="event-body"><div class="event-kind-line"><span class="event-kind">'+esc(eventKind(e.category))+'</span>'+paidAdmissionIcon(e)+'</div><h3>'+esc(e.title)+'</h3><p><strong>Date:</strong> '+esc(dateLabel)+'</p>'+(timeBits.length?'<p><strong>Time:</strong> '+esc(timeBits.join('–'))+'</p>':'')+(where?'<p><strong>Place:</strong> '+esc(where)+'</p>':'')+(e.organizer?'<p><strong>Organization:</strong> '+esc(e.organizer)+'</p>':'')+(e.notes?'<p>'+esc(e.notes)+'</p>':'')+linkHtml+'</div></article></div></section>';
     const st=$('#eventsStatus');if(st)st.textContent='Showing full event information';
     return;
   }
 }
 const labels={all:'All community events',arts:'Arts, music & entertainment',family:'Family & kids',sports:'Sports & active events',fundraisers:'Fundraisers & benefits','food-markets':'Food, markets & fairs'};
 const title=document.querySelector('.events-hero h1'), intro=document.querySelector('.events-hero p:not(.eyebrow)');
 if(calendarKey!=='all'&&labels[calendarKey]){if(title)title.textContent=labels[calendarKey];if(intro)intro.textContent='A filtered Norwood.ma calendar view. Use the event link for the latest details.';}
 if(eventView==='calendar') host.innerHTML=renderCalendarView(items);
 else {
  const g=groupEvents(items),sections=[['today','Today'],['tomorrow','Tomorrow'],['weekend','This weekend'],['next','Next few days'],['save','Save the date']];
  host.innerHTML=sections.filter(([k])=>g[k].length).map(([k,label])=>`<section class="event-period ${k==='save'?'save-date':''}"><div class="event-period-head"><p class="eyebrow">${esc(monthDayRange(g[k]))}</p><h2>${label}</h2></div><div class="event-list">${g[k].map(eventRow).join('')}</div></section>`).join('')||'<section class="event-period"><p>No upcoming public events match this search.</p></section>';
 }
 const st=$('#eventsStatus');if(st)st.textContent='';
}
function renderHomeEvents(items){const host=$('#homeEvents');if(!host)return;const ranked=diversifySameDayEvents(items.slice());const limit=window.matchMedia('(max-width:850px)').matches?5:7;host.innerHTML=ranked.slice(0,limit).map(e=>`<a href="${esc(e.source_url||'events.html')}" target="_blank" rel="noopener"><b>${esc(shortDate(e.start?.date))} · ${esc(e.title)} ${paidAdmissionIcon(e)}</b><span>${esc(eventSummary(e))}</span></a>`).join('')||'<span class="muted">No upcoming events currently verified.</span>';}
async function events(){if(!$('#eventPeriods')&&!$('#homeEvents'))return;const items=await loadEvents();allEventsForPage=items;renderEventsPage(items);renderHomeEvents(items);
 const runEventSearch=()=>renderEventsPage(window.NORWOOD_CALENDAR_FILTER?window.NORWOOD_CALENDAR_FILTER(allEventsForPage):allEventsForPage); $('#eventSearch')?.addEventListener('input',runEventSearch); $('#eventSearchButton')?.addEventListener('click',runEventSearch); $('#eventSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();runEventSearch();}});
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
