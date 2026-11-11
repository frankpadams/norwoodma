/* Shared by the browser and the event HTML generator. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NorwoodEventAgenda=api;})(typeof globalThis==='object'?globalThis:this,function(){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const text=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''));
 const date=s=>new Date(s+'T12:00:00');
 function todayKey(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
 function time(s){
  if(!s||/^(?:0?0:00(?::00)?|12:00(?:\s*AM))$/i.test(String(s).trim()))return '';
  const m=String(s).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if(!m)return text(s);
  let h=+m[1];const minute=+m[2],ampm=m[3]?.toLowerCase();
  if(minute>59)return text(s);
  if(ampm){if(h<1||h>12)return text(s);h=(h%12)+(ampm==='pm'?12:0);}
  if(h>23)return text(s);
  const suffix=h>=12?'pm':'am',hour=h%12||12;
  return String(hour)+(minute===0?'':':'+String(minute).padStart(2,'0'))+suffix;
 }
 const short=s=>date(s).toLocaleDateString('en-US',{month:'short',day:'numeric'});
 function safeUrl(s){try{const u=new URL(s);return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}}
 function links(e){const out=[];const add=(url,label)=>{url=safeUrl(url);if(url&&!out.some(x=>x.url===url))out.push({url,label});};add(e.registration_url,'Register');add(e.purchase_url,'Tickets / order');add(e.donation_url,'Donate');if(!/\.(?:json|xml|ics|csv)(?:[?#]|$)|\/api\/|calendar_data_handler|\/feed\/?(?:[?#]|$)/i.test(e.source_url||''))add(e.source_url,'Official event information');(e.links||[]).forEach(x=>typeof x==='string'?add(x,'More information'):x&&add(x.url,x.label||'More information'));return out;}
 function metadata(e){const multi=validDate(e.end?.date)&&e.end.date>e.start.date;return [time(e.start?.time),multi?short(e.start.date)+'–'+short(e.end.date):'',e.recurrence,e.venue||e.address,e.town&&!/^norwood$/i.test(e.town)?e.town:'',e.cost||e.price].filter(Boolean).map(text).join(' · ');}
 function row(e){const multi=validDate(e.end?.date)&&e.end.date>e.start.date;const dates=short(e.start.date)+(multi?'–'+short(e.end.date):'');const times=[time(e.start?.time),time(e.end?.time)].filter(Boolean).join('–');const info=links(e);const schedule=Array.isArray(e.schedule)?'<ul class="event-agenda-schedule">'+e.schedule.map(s=>'<li><strong>'+esc(time(s.time))+'</strong> — '+esc(s.label)+'</li>').join('')+'</ul>':'';return '<details class="event-agenda-entry" id="agenda-'+esc(e.id)+'"><summary><span class="event-agenda-copy"><span class="event-agenda-title">'+esc(e.title)+'</span><span class="event-agenda-meta">'+esc(metadata(e)||'Select for event details')+'</span></span><span class="event-agenda-expand" aria-hidden="true">+</span></summary><div class="event-agenda-detail"><p><strong>When:</strong> '+esc(dates+(times?' · '+times:''))+'</p>'+(e.address?'<p><strong>Where:</strong> '+esc(e.address)+'</p>':'')+(e.organizer?'<p><strong>Hosted by:</strong> '+esc(e.organizer)+'</p>':'')+(e.notes||e.description?'<p>'+esc(text(e.notes||e.description))+'</p>':'')+schedule+(e.category==='civic_meeting'?'<p>Return to Norwood.ma at meeting time for available live coverage.</p>':'')+'<div class="event-agenda-links">'+info.map(x=>'<a href="'+esc(x.url)+'" target="_blank" rel="noopener">'+esc(x.label)+' ↗</a>').join('')+'<a href="events.html?event='+encodeURIComponent(e.id||'')+'" data-event-details="'+esc(e.id||'')+'">Calendar &amp; sharing options →</a></div></div></details>';}
 function timeMinutes(value){
  const s=String(value||'').trim().toUpperCase();
  if(!s)return null;
  const m=s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/);
  if(!m)return null;
  let h=Number(m[1]);const minute=Number(m[2]);
  if(minute>59)return null;
  if(m[3]){if(h<1||h>12)return null;h=(h%12)+(m[3]==='PM'?12:0);}
  if(h>23)return null;
  return h*60+minute;
}
 function deduplicate(items){
  const groups=new Map();
  for(const e of items){
   const title=text(e.title).toLowerCase().replace(/[’']/g,'').replace(/\u200b/g,'');
   const venue=text(e.venue||e.address).toLowerCase();
   const url=safeUrl(e.source_url);
   const minutes=timeMinutes(e.start?.time);
   const date=e.start?.date;
   let name='', preference=0;
   if(/^school committee meeting(?: - (?:budget (?:hearing|vote) - )?hybrid meeting\b|$)/.test(title)){
    name='school committee';
    preference=title==='school committee meeting'?1:0;
   }else if(/^(?:neponset river regional chamber: )?connections at work \(noon networking\)$/.test(title)){
    name='noon networking';
    preference=title.startsWith('neponset')?1:0;
   }else if(/^https:\/\/(?:www\.)?norwoodstage\.com\/(?:creedence-revived|boogie-wonder-band|john-denver-christmas)\/?$/.test(url)){
    name=url.replace(/\/$/,'');
    preference=title.includes('—')?1:0;
   }else if(/^https:\/\/(?:www\.extendedplaysessions\.com|grcpac\.yapsody\.com)\//.test(url)){
    name=title.match(/^(?:dave liminas wednesdave blues [ivx]+|goodnight moonshine|john németh & the blue dreamers|the mcdonough band)(?= |$)/)?.[0]||'';
    preference=venue?1:0;
   }
   const key=date&&minutes!==null&&name
    ?JSON.stringify([date,minutes,name])
    :e.id?'id:'+e.id:Symbol();
   const previous=groups.get(key);
   if(!previous){groups.set(key,{event:e,preference});continue;}
   const [primary,alternate]=preference>previous.preference?[e,previous.event]:[previous.event,e];
   groups.set(key,{
    event:{...primary,links:[...(primary.links||[]),...links(alternate)]},
    preference:Math.max(preference,previous.preference)
   });
  }
  return [...groups.values()].map(group=>group.event);
 }
function rank(e){
  const text=[e.title,e.notes,e.description,e.category,e.organizer,e.source_id].filter(Boolean).join(' ').toLowerCase();
  const location=[e.venue,e.address,typeof e.location==='string'?e.location:e.location?.name,e.location?.venue].filter(Boolean).join(' ').toLowerCase();
  const religious=/\b(church|parish|chapel|congregation|temple|synagogue|mosque|worship|bible|prayer|faith|religious|ministry|saint catherine|st\.? catherine)\b/.test(text+' '+location);
  if(/\b(elections?|voter registration|register to vote|early voting|voting opportunit(?:y|ies)|voting information|polling place|precinct voting|candidate forum|ballot|vote by mail|absentee voting|polls open|where to vote)\b/.test(text))return 1;
  const knightsOfColumbus=e.source_id==='norwood-kofc-events'||/\bknights\s+of\s+columbus\b/i.test([e.title,e.organizer,location].join(' '));
  if(religious||knightsOfColumbus)return 9;
  if(/\b(town common|norwood common|common green|580 washington st)\b/.test(location))return 2;
  const recurrence=String(e.recurrence||'').trim();
  const singleOccurrence=/^(?:once|one[- ]?time|single(?: occurrence| date)?)$/i.test(recurrence);
  const recurring=e.session_based===true||(!singleOccurrence&&!!recurrence)||/\b(weekly|biweekly|fortnightly|monthly|daily|every\s+(?:day|week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|each\s+(?:week|month))\b/.test(text);
  const specialOneTime=/\b(festival|fair|expo|exposition|open house|community celebration|town celebration|special event|special (?:workshop|presentation)|one[- ]time event|carnival|parade)\b/.test(text);
  if(specialOneTime&&!recurring)return 3;
  if(/\b(live\s+music|live\s+(?:band|bands|performance)|concert|music performance|band performance|jazz performance)\b/.test(text))return 4;
  const oneTimeProgram=/\b(workshop|presentation|author talk|book signing|fundraiser|fundraising event|public performance|theatrical performance)\b/.test(text);
  if(oneTimeProgram&&!recurring)return 3;
  if(e.category==='civic_meeting'||/\b(select board|board of selectmen|school committee|planning board|zoning board|zoning board of appeals|finance commission|conservation commission|board of health|town meeting|town committee|town board|public hearing)\b/.test(text)||(/\b(?:board|committee|commission)\b/.test(text)&&/\b(?:meeting|hearing)\b/.test(text)&&/\b(?:norwood|town hall|municipal)\b/.test(text+' '+location)))return 7;
  if(recurring)return 8;
  const cost=[e.cost,e.price,e.fees,e.admission].filter(Boolean).join(' ').toLowerCase();
  if(/^(?:free|none|no charge|no cost|\$?0(?:\.00)?)$/.test(cost.trim())||/\bfree (?:admission|event|program|activity|to the public)\b|\bno charge\b|\bno cost\b/.test(text))return 5;
  return 6;
}
function compare(a,b){
  const priority=rank(a)-rank(b);
  if(priority)return priority;
  const at=timeMinutes(a.start?.time),bt=timeMinutes(b.start?.time);
  if(at===null&&bt!==null)return 1;
  if(bt===null&&at!==null)return -1;
  return (at??0)-(bt??0);
}
function render(items,opts={}){const today=opts.today||todayKey(),days=new Map();for(const e of deduplicate(items)){const start=e.start?.date,end=e.end?.date||start;if(!e.title||!validDate(start)||!validDate(end)||end<today)continue;const key=start<today?today:start;if(!days.has(key))days.set(key,[]);days.get(key).push(e);}const fundraiser='<a class="fundraiser-agenda-link" href="fundraising.html"><span class="fundraiser-agenda-icon" aria-hidden="true">♥</span><span class="fundraiser-agenda-copy"><span class="event-agenda-title">Current &amp; Upcoming Norwood Fundraisers</span><span class="event-agenda-meta">View the fundraisers currently happening to support Norwood organizations</span></span><span class="fundraiser-agenda-arrow" aria-hidden="true">›</span></a>';const listings=[...days.keys()].sort().map(key=>{const d=date(key),label=d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});return '<section class="event-agenda-day" aria-label="'+esc(label)+'"><h2 class="event-agenda-date"><time datetime="'+key+'"><span class="agenda-weekday">'+d.toLocaleDateString('en-US',{weekday:'short'})+'</span><span class="agenda-day-number">'+d.getDate()+'</span><span class="agenda-month">'+d.toLocaleDateString('en-US',{month:'short'})+' '+d.getFullYear()+'</span></time></h2><div class="event-agenda-list">'+days.get(key).sort(compare).map(row).join('')+'</div></section>';}).join('');return fundraiser+(listings||'<p class="event-agenda-empty">No upcoming public events match this search.</p>');}
    function confirmedNcmLive(notice,schedule,now){
      if(schedule?.date!==now.date)return false;
      const channel=schedule.channels?.[/school committee/i.test(notice.title||'')?'schools':'government'];
      if(channel?.status!=='scheduled')return false;
      const slots=(channel.slots||[]).filter(s=>Number.isInteger(s.minute)&&s.minute>=0&&s.minute<1440).sort((a,b)=>a.minute-b.minute);
      const index=slots.findLastIndex(s=>s.minute<=now.minutes);
      if(index<0)return false;
      const slot=slots[index],end=slots[index+1]?.minute??Math.min(1440,slot.minute+180);
      if(now.minutes>=end)return false;
      const title=String(slot.title||'');
      if(/\b(rebroadcast|replay|repeat|recorded)\b/i.test(title))return false;
      const recorded=title.match(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4}|\d{2})\b/);
      if(recorded){
        const year=recorded[3].length===2?'20'+recorded[3]:recorded[3];
        const date=year+'-'+recorded[1].padStart(2,'0')+'-'+recorded[2].padStart(2,'0');
        if(date!==now.date)return false;
      }
      if(slot.live!==true&&slot.is_live!==true&&!/\blive\b/i.test(title))return false;
      const key=s=>String(s).toLowerCase().replace(/\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/g,'').replace(/\b(live|meeting|broadcast|norwood)\b/g,'').replace(/[^a-z0-9]/g,'');
      return key(title)===key(notice.title)&&key(notice.title)!=='';
    }

 function liveLink(e,schedule,clock=new Date()){
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(clock).map(x=>[x.type,x.value]));
  const now={date:p.year+'-'+p.month+'-'+p.day,minutes:+p.hour*60+(+p.minute)};
  if(e.start?.date!==now.date||!confirmedNcmLive(e,schedule,now))return '';
  return safeUrl(schedule.channels[/school committee/i.test(e.title)?'schools':'government'].url);
 }
 return {render,row,deduplicate,todayKey,time,metadata,links,rank,compare,liveLink};
});
