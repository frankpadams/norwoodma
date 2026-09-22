(()=>{
 const input=document.querySelector('#siteSearch'),box=document.querySelector('#siteSearchResults'),form=document.querySelector('#siteSearchForm');
 if(!input||!box||!form)return;
 const pages=[
  {name:'Things to Do',url:'things.html',type:'Things to Do',text:'activities entertainment explore parks recreation'},
  {name:'Museum passes & discounts',url:'museum-discounts.html',type:'Things to Do',text:'museum pass passes discount discounts free admission cheap attractions library Morrill EBT SNAP WIC ConnectorCare Card to Culture Museums for All Bank of America Museums on Us credit card zoo aquarium science museum MFA ICA'},
  {name:'Norwood Trivia',url:'norwood-trivia.html',type:'Explore',text:'trivia history facts notable residents movies filmed local history'},
  {name:'Fishing & boating',url:'fishing-boating.html',type:'Things to Do',text:'kayak canoe paddling launch fishing boat water Ellis Pond'},
  {name:'Swimming',url:'swimming.html',type:'Things to Do',text:'pool swim swimming lessons Hawes Father Mac beach'},
  {name:'Hiking & biking',url:'hiking-biking.html',type:'Things to Do',text:'hike hiking bike biking bicycle trails shops cycling clubs'},
  {name:'Sports & recreation',url:'sports-recreation.html',type:'Things to Do',text:'sports youth adult pickleball golf soccer baseball basketball hockey lacrosse ninja climbing obstacle'},
  {name:'Get involved',url:'get-involved.html',type:'Community',text:'volunteer civic poll worker election boards committees run office food pantry'},
  {name:'Transit',url:'transit.html',type:'Transit',text:'train commuter rail bus MBTA Windsor Gardens Norwood Central Norwood Depot 34E schedules'},
  {name:'What’s Happening',url:'events.html',type:'Events',text:'events calendar music trivia community town common elections school theatre marching band fundraiser'},
  {name:'Calendars',url:'calendars.html',type:'Calendars',text:'town meetings schools community events subscribe calendar'},
  {name:'Local Resources',url:'resources.html',type:'Resources',text:'services organizations health housing youth seniors disability community'},
  {name:'Utilities & Home Energy',url:'utilities.html',type:'Home services',text:'utilities electric electricity Norwood Light water sewer natural gas gas internet broadband cable TV heating oil fuel oil prices propane home energy'},
  {name:'Trash & Recycling',url:'trash-recycling.html',type:'Town services',text:'trash garbage rubbish waste recycling recycle pickup collection curbside cart bins red yellow route schedule calendar holiday delay DPW public works WM waste management compost composting food scraps Black Earth Winter Street recycling facility swap shop bulk bulky items hazardous waste household hazardous waste HHW leaves leaf bags brush yard waste Christmas tree trees mattress mattresses styrofoam rigid plastic metal mercury fluorescent bulbs textiles clothing books electronics e-waste television TV batteries paint oil tires construction debris missed pickup cart repair cart replacement additional cart service day disposal dump transfer station'}
 ];
 const aliases={doctor:'medical physician health',dentist:'dental orthodontics',train:'transit commuter rail mbta',volunteer:'get involved civic',kayak:'boating paddling',bike:'biking cycling',pool:'swimming',pizza:'restaurant food',food:'restaurant dining',vote:'election voting',voting:'election poll',trivia:'trivia history game',climbing:'rock climbing recreation',ninja:'obstacle recreation',trash:'trash recycling garbage waste pickup',garbage:'trash recycling waste pickup',recycle:'recycling trash waste',recycling:'recycling trash waste',compost:'composting food scraps trash recycling',composting:'compost food scraps recycling',bulk:'bulk bulky items recycling disposal',mattress:'mattress bulk recycling disposal',styrofoam:'styrofoam recycling Winter Street',paint:'hazardous waste disposal recycling',electronics:'electronics e waste recycling disposal',batteries:'batteries hazardous waste recycling',leaves:'leaf bags brush yard waste Winter Street',brush:'brush yard waste leaves Winter Street',dump:'Winter Street recycling facility disposal',hazardous:'household hazardous waste recycling',christmas:'Christmas tree recycling pickup',museum:'museum passes discounts library',museums:'museum passes discounts library',snap:'EBT Museums for All Card to Culture discounts',ebt:'SNAP Museums for All Card to Culture discounts',wic:'Card to Culture discounts',connectorcare:'Card to Culture discounts',boa:'Bank of America Museums on Us',bank:'Bank of America Museums on Us',pt:'physical therapy physical therapist physiotherapy rehabilitation rehab',ot:'occupational therapy occupational therapist rehabilitation rehab',slp:'speech language pathology speech therapy speech therapist communication swallowing',st:'speech therapy speech therapist speech language pathology',aba:'applied behavior analysis autism behavioral therapy',bcba:'board certified behavior analyst applied behavior analysis autism',ei:'early intervention child development developmental services',pcp:'primary care physician primary care doctor medical',rent:'rent rental housing tenant tenants assistance help RAFT eviction emergency housing',rental:'rent rental housing tenant assistance RAFT',housing:'housing rent rental tenant assistance shelter home',childcare:'childcare preschool daycare early education',dentist:'dental orthodontics dentist',disability:'disability accessibility support services',heating:'heating fuel utility energy assistance LIHEAP',benefits:'benefits assistance financial SNAP MassHealth'};
 const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const libraryThings=[
  {name:'OBD-II diagnostic scanner',terms:'obd obd2 obd ii car auto automobile mechanic mechanical check engine light engine code diagnostic trouble codes vehicle repair scanner',desc:'read vehicle diagnostic trouble codes',url:'https://www.norwoodlibrary.org/wp-content/uploads/2021/05/LOT-Master-List.pdf'},
  {name:'Metal detector',terms:'metal detector treasure hunt lost ring beach yard find metal outdoors',desc:'search for metal objects and lost items',url:'https://norwoodlibrary.org/borrow-a-karaoke-kit/'},
  {name:'Power washer',terms:'power washer pressure washer clean siding deck patio driveway outdoor cleaning home improvement',desc:'tackle outdoor cleaning projects',url:'https://norwoodlibrary.assabetinteractive.com/'},
  {name:'Bike repair tools',terms:'bike bicycle cycling repair mechanic tire chain brakes tools fix',desc:'handle basic bicycle maintenance and repairs',url:'https://norwoodlibrary.org/borrow-a-karaoke-kit/'},
  {name:'Soil tester',terms:'soil tester garden gardening lawn ph moisture plants yard',desc:'check soil conditions for lawn and garden projects',url:'https://norwoodlibrary.org/borrow-a-karaoke-kit/'},
  {name:'Food dehydrator',terms:'food dehydrator dehydrate jerky dried fruit cooking kitchen preserve food',desc:'dehydrate and preserve foods',url:'https://norwoodlibrary.org/borrow-a-karaoke-kit/'},
  {name:'Karaoke kit',terms:'karaoke microphone party singing music entertainment',desc:'set up karaoke for a party or gathering',url:'https://norwoodlibrary.org/borrow-a-karaoke-kit/'},
  {name:'Portable turntable / LP digitizer',terms:'record player turntable vinyl lp records digitize convert audio music old records',desc:'play records and convert LP audio to digital files',url:'https://norwoodlibrary.org/borrow-a-karaoke-kit/'},
  {name:'Picnic kit',terms:'picnic basket blanket park outdoor lunch date picnic supplies',desc:'pack for a picnic or outdoor outing',url:'https://norwoodlibrary.org/polo-picnics-and-people-watching/'},
  {name:'Roku streaming player',terms:'roku streaming tv television movies netflix media player stream',desc:'add streaming-media capability to a television',url:'https://norwoodlibrary.org/mmlservices/technology/'},
  {name:'USB floppy disk drive',terms:'floppy disk drive old files computer data recover usb technology',desc:'access files stored on floppy disks',url:'https://norwoodlibrary.org/mmlservices/technology/'},
  {name:'USB external CD/DVD drive',terms:'cd dvd disc drive laptop computer read burn optical usb movie',desc:'use CDs or DVDs with a computer that lacks an optical drive',url:'https://norwoodlibrary.org/mmlservices/technology/'},
  {name:'Portable electronic magnifier',terms:'magnifier magnifying low vision accessibility visually impaired reading zoom assistive technology',desc:'magnify text and objects for easier viewing',url:'https://norwoodlibrary.org/assistive-technology/'}
 ];
 function thingMatches(raw){
   const q=norm(raw),terms=q.split(/\s+/).filter(x=>x.length>2);if(!q||!terms.length)return[];
   return libraryThings.map(t=>{const h=norm(t.name+' '+t.terms+' '+t.desc);let score=h.includes(q)?30:0;terms.forEach(w=>{if(norm(t.name).includes(w))score+=12;else if(h.includes(w))score+=5});return{...t,score}}).filter(t=>t.score>=10).sort((a,b)=>b.score-a.score).slice(0,4);
 }

 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function items(){
  const out=pages.map(p=>({...p,norwoodPage:true}));
  (window.NORWOOD_RESTAURANTS||[]).forEach(r=>out.push({name:r.name,url:r.url||'restaurants.html',type:'Restaurant',text:[r.category,r.cuisine,r.address,r.tags].join(' ')}));
  (window.NORWOOD_RESOURCES||[]).forEach(r=>out.push({name:r.name,url:r.url||'resources.html',type:r.category||'Resource',text:[r.category,r.tags,r.coverage,r.description].join(' '),officialTown:r.officialTown===true}));
  (window.NORWOOD_BUSINESSES||[]).forEach(b=>out.push({name:b.name,url:'business-directory.html?q='+encodeURIComponent(b.name),type:'Local business',text:[b.category,b.address,b.phone,(b.tags||[]).join(' ')].join(' '),business:true}));
  (window.NORWOOD_CALENDAR_SOURCES||[]).forEach(c=>out.push({name:(c.name||'Calendar')+' calendar',url:c.view_url||'calendars.html',type:'Calendar',text:[c.name,c.description,c.provider,c.group,'calendar schedule dates events school'].join(' '),calendar:true}));
  (window.NORWOOD_EVENTS||[]).forEach(e=>out.push({name:e.title||e.name||'Community event',url:'events.html',type:'Event',date:e.start?.date||'',text:[e.description,e.category,e.venue,e.address,e.town,e.organizer,e.start?.date].join(' ')}));
  return out;
 }
 function search(raw){
  const original=String(raw||'').trim();
  const acronym=/^[A-Z][A-Z0-9&.-]{1,7}$/.test(original);
  raw=norm(original); if(!raw)return [];
  const expanded=norm(raw+' '+(aliases[raw]||''));
  const terms=[...new Set(expanded.split(/\s+/).filter(Boolean))];
  return items().map(x=>{const name=norm(x.name),type=norm(x.type),body=norm(x.text),hay=norm([x.name,x.type,x.text].join(' '));let score=0;if(name===raw)score+=120;if(name.startsWith(raw))score+=55;if(name.includes(raw))score+=35;if(type===raw)score+=70;if(type.includes(raw))score+=35;if(body.includes(raw))score+=18;terms.forEach(t=>{if(name===t)score+=30;else if(name.includes(t))score+=14;if(type===t)score+=24;else if(type.includes(t))score+=10;if(body.includes(t))score+=4});/* Geography/source is only a tie-breaker after strong intent relevance. */if(x.norwoodPage&&score>=35)score+=8;if(x.business&&score>=30)score+=3;if(acronym&&aliases[raw]){const phrase=norm(aliases[raw]);if(name.split(' ').some(w=>w===raw)||type.split(' ').some(w=>w===raw))score+=45;if(phrase.split(' ').some(w=>name.includes(w)||type.includes(w)))score+=12;}return{x,score};}).filter(o=>o.score>0).sort((a,b)=>b.score-a.score||a.x.name.localeCompare(b.x.name)).slice(0,12);
 }
 function noteSearch(query,count){
   try{
     const key='norwood-search-insights',now=new Date().toISOString();
     const data=JSON.parse(localStorage.getItem(key)||'[]');
     data.push({q:query.toLowerCase().slice(0,80),results:count,at:now});
     localStorage.setItem(key,JSON.stringify(data.slice(-100)));
   }catch(e){}
 }
 function eventDate(s){if(!s)return '';const p=s.split('-').map(Number),d=new Date(p[0],p[1]-1,p[2],12);return d.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric',year:'numeric'});}
 function render(track=false){
  const raw=input.value.trim(); if(!raw){box.hidden=true;box.innerHTML='';return []}
  let hits=search(raw);
  if(hits.some(({x})=>x.url==='trash-recycling.html')) hits=hits.filter(({x})=>!x.officialTown);
  const things=thingMatches(raw);
  const thingHtml=things.length?`<div class="library-things-search-callout"><span class="library-things-badge">LIBRARY OF THINGS</span><b>📚 The library may have ${things.length===1?'one':'things'} you can borrow</b><p>${things.map(t=>`<strong>${esc(t.name)}</strong> — ${esc(t.desc)}`).join('<br>')}</p><a href="${esc(things[0].url)}" target="_blank" rel="noopener">Check availability &amp; borrowing details →</a><small>Morrill Memorial Library · Listed by library; current availability is not guaranteed.</small></div>`:'';
  const regularHtml=hits.length?hits.map(({x})=>`<a href="${esc(x.url)}"><b>${esc(x.name)}${x.norwoodPage?' <img class="search-source-icon norwoodma-search-icon" src="assets/favicon-approved.png" alt="Norwood.ma page" title="Norwood.ma page">':''}${x.officialTown?' <img class="search-source-icon town-search-icon" src="https://upload.wikimedia.org/wikipedia/commons/5/5f/Seal_of_Norwood%2C_Massachusetts.png" alt="Official Town of Norwood resource" title="Official Town of Norwood resource">':''}</b><small>${esc(x.type)}${x.type==='Event'&&x.date?' · '+esc(eventDate(x.date)):''}${x.text?' · '+esc(String(x.text).split(/\s+/).slice(0,7).join(' ')):''}</small></a>`).join(''):'<p>No matches. Try a shorter or different term.</p>';
  box.innerHTML=thingHtml+regularHtml;
  box.hidden=false;if(track)noteSearch(raw,hits.length+things.length);return hits;
 }
 input.addEventListener('input',()=>render(false));
 input.addEventListener('focus',()=>{if(input.value.trim())render(false)});
 form.addEventListener('submit',e=>{e.preventDefault();const hits=render(true);if(hits.length===1)location.href=hits[0].x.url});
 input.addEventListener('keydown',e=>{if(e.key==='Escape'){box.hidden=true;input.blur()}if(e.key==='ArrowDown'){const a=box.querySelector('a');if(a){e.preventDefault();a.focus()}}});
 box.addEventListener('keydown',e=>{if(e.key==='Escape'){box.hidden=true;input.focus()}});
 document.addEventListener('click',e=>{if(!form.contains(e.target))box.hidden=true});
})();