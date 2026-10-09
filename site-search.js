(()=>{
 const input=document.querySelector('#siteSearch'),box=document.querySelector('#siteSearchResults'),form=document.querySelector('#siteSearchForm');
 if(!input||!box||!form)return;
 window.NorwoodSiteSearch=window.NorwoodSiteSearch||{};
 const resultsPage=document.body.classList.contains('search-results-page');
 const howDoPage=document.body.classList.contains('how-do-page');
 let submitted=resultsPage;
 let archiveRequest=0;
 const archiveNorm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 async function archiveHasMatch(raw){
  const q=archiveNorm(raw);if(!q)return false;
  try{const html=await fetch('town-meeting-archive.html',{cache:'no-store'}).then(r=>r.ok?r.text():'');if(!html)return false;const doc=new DOMParser().parseFromString(html,'text/html');return [...doc.querySelectorAll('.meeting')].some(m=>archiveNorm([m.textContent,m.getAttribute('data-source-index')||'',...[...m.querySelectorAll('[data-videos]')].map(x=>x.getAttribute('data-videos')||'')].join(' ')).includes(q));}catch(e){return false;}
 }
 function insertArchiveBridge(raw){
  const request=++archiveRequest;
  archiveHasMatch(raw).then(hit=>{if(request!==archiveRequest||archiveNorm(input.value)!==archiveNorm(raw)||!hit)return;const links=[...box.querySelectorAll(':scope > a')];if(box.querySelector('.town-meeting-search-bridge'))return;const a=document.createElement('a');a.className='town-meeting-search-bridge';a.href='town-meeting-archive.html?q='+encodeURIComponent(raw);a.innerHTML='<b>Town Meeting Archive</b><small>See Town Meeting Archive results for “'+esc(raw)+'” →</small>';const sixth=links[5];if(sixth)box.insertBefore(a,sixth);else{const google=box.querySelector('.site-search-google');box.insertBefore(a,google||null);}});
 }
 const pages=[
  {name:'Artists, Crafters & Artisans',url:'artists-crafters-artisans.html',type:'Things to Do',text:'artists art crafters crafts artisans makers jewelry jewellery painting painters photography photographers glass textiles fiber handmade SONO Arts Norwood Space Center Winsmith Maple Roots Creative Melissa Adams'},
  {name:'Things to Do',url:'things.html',type:'Things to Do',text:'activities entertainment explore parks recreation'},
  {name:'Museum passes & discounts',url:'museum-discounts.html',type:'Things to Do',text:'museum pass passes discount discounts free admission cheap attractions library Morrill EBT SNAP WIC ConnectorCare Card to Culture Museums for All Bank of America Museums on Us credit card zoo aquarium science museum MFA ICA'},
  {name:'Norwood Trivia',url:'norwood-trivia.html',type:'Explore',text:'trivia history facts notable residents movies filmed local history'},
  {name:'Fishing & boating',url:'fishing-boating.html',type:'Things to Do',text:'kayak canoe paddling launch fishing boat water Ellis Pond'},
  {name:'Swimming',url:'swimming.html',type:'Things to Do',text:'pool swim swimming lessons Hawes Father Mac beach'},
  {name:'Trails, Parks, Hiking & biking',url:'parks-trails.html',type:'Things to Do',text:'parks park playground playgrounds fields trail trails walking hiking hike biking bike bicycle maps brochures trails advisory committee cycling clubs bike shops Hawes Father Macs McAleer Ellis Balch Callahan Cleveland Doherty Murphy Oldham Prescott Wilson Winslow Endean Alevizos Bernie Cooper Shattuck Hennessey Germany Brook Meadow Vanderbilt Pine Tree Forest Tiot Blue Hills Moose Hill Trustees AMC MassBike Charles River Wheelers'},
  {name:'Sports & recreation',url:'sports-recreation.html',type:'Things to Do',text:'sports youth adult pickleball golf soccer baseball basketball hockey lacrosse ninja climbing obstacle'},
  {name:'Tennis courts in Norwood',url:'parks-trails.html#tennis-courts',type:'Parks & recreation',text:'tennis tennis courts public courts Norwood High School NHS Coakley Ivatts Hawes Washington Street Nichols Street racket racquet recreation'},
  {name:'Doherty Park & Field',url:'parks-trails.html',type:'Parks & recreation',text:'Doherty Park Doherty Field Brewster Drive playground Little League baseball hardcourt recreation park field'},
  {name:'Get involved',url:'get-involved.html',type:'Community',text:'volunteer volunteering service hours teen youth civic poll worker election elections boards committees town meeting run for office food pantry trails cleanup community service'},
  {name:'Living in Norwood — Homes & Real Estate',url:'real-estate.html',type:'Moving & Real Estate',text:'moving move relocate relocation living homes houses real estate homebuyer buyers property recent sales schools elementary school lookup taxes utilities commute transit community culture religion religious houses worship nonprofits organizations events agent realtor mortgage calculator'},
  {name:'Business Directory',url:'business-directory.html',type:'Businesses',text:'business businesses directory shops stores services contractors trades professional real estate agents groceries supermarkets hotels banks salons automotive local business'},
  {name:'Restaurants & Food',url:'restaurants.html',type:'Food & Drink',text:'restaurants dining food takeout dinner lunch breakfast brunch pizza italian indian asian mexican gluten free international grocers'},
  {name:'Explore Norwood by Map',url:'map.html',type:'Map',text:'map explore parks trails athletic fields schools playgrounds government historic restaurants parking businesses resources transit events landmarks voting precincts'},
  {name:'News',url:'news.html',type:'News',text:'news local news Norwood Record community updates town police public works schools headlines'},
  {name:'Discover Norwood',url:'discover.html',type:'Explore',text:'discover community guides local places resources Norwood'},
  {name:'Contact Norwood.ma',url:'contact.html',type:'Norwood.ma',text:'contact submit suggestion correction event organization volunteer opportunity feedback'},
  {name:'About Norwood.ma',url:'about.html',type:'Norwood.ma',text:'about editorial standards independent community site not town government methodology corrections sources'},
  {name:'Support Norwood.ma',url:'support.html',type:'Norwood.ma',text:'support donate sponsor sponsorship advertising community site'},
  {name:'Norwood Weather & Forecast',url:'weather.html',type:'Weather',text:'weather forecast 02062 temperature rain snow storm radar National Weather Service NWS local weather'},
  {name:'Official Town Updates',url:'town-updates.html',type:'Town Updates',text:'official public service updates town departments police public works DPW Norwood Light government notices announcements'},
  {name:'Live Music in Norwood',url:'live-music.html',type:'Things to Do',text:'live music bands concerts performances venues restaurants breweries pubs entertainment'},
  {name:'Gas Prices in Norwood',url:'gas-prices.html',type:'Transportation',text:'gas gasoline fuel prices stations cheapest regular premium diesel compare'},
  {name:'Route 1 Roadwork',url:'route-1-roadwork.html',type:'Transportation',text:'Route 1 roadwork construction MassDOT nighttime milling paving traffic detour delays Providence Highway'},
  {name:'Credits',url:'credits.html',type:'Norwood.ma',text:'credits sources acknowledgments attribution community information'},
  {name:'Transit',url:'transit.html',type:'Transit',text:'train commuter rail bus MBTA Windsor Gardens Norwood Central Norwood Depot 34E schedules'},
  {name:'What’s Happening',url:'events.html',type:'Events',text:'events calendar music trivia community town common elections school theatre marching band fundraiser'},
  {name:'Calendars',url:'calendars.html',type:'Calendars',text:'town meetings schools community events subscribe calendar'},
  {name:'Local Resources',url:'resources.html',type:'Resources',text:'services organizations health housing youth seniors disability community'},
  {name:'Food & Basic Needs',url:'resources.html#basic-needs',type:'Resource category',text:'food assistance pantry groceries meals SNAP WIC hunger clothing diapers hygiene basic needs',norwoodPage:true,resourceCategory:true},
  {name:'Housing & Utilities',url:'resources.html#housing',type:'Resource category',text:'housing rent rental tenant eviction RAFT shelter utilities electric heat energy assistance',norwoodPage:true,resourceCategory:true},
  {name:'Disability, Mental Health & Addiction',url:'resources.html#health',type:'Resource category',text:'disability accessibility mental health behavioral health crisis addiction recovery substance autism deaf blind',norwoodPage:true,resourceCategory:true},
  {name:'Domestic Violence Support',url:'resources.html#domestic-violence',type:'Resource category',text:'domestic violence partner violence abuse safety planning shelter restraining order survivor',norwoodPage:true,resourceCategory:true},
  {name:'Immigration & ICE Help',url:'resources.html#immigration',type:'Resource category',text:'ICE immigration immigrant deportation detention detained asylum refugee visa citizenship naturalization legal rights undocumented newcomer migrant enforcement',norwoodPage:true,resourceCategory:true},
  {name:'Legal Help & Advocacy',url:'resources.html#legal',type:'Resource category',text:'legal lawyer attorney legal aid rights advocacy court civil law tenant immigration benefits',norwoodPage:true,resourceCategory:true},
  {name:'Safety & Crisis Help',url:'resources.html#safety',type:'Resource category',text:'safety crisis emergency victim support violence abuse hotline shelter crisis help',norwoodPage:true,resourceCategory:true},
  {name:'LGBTQ+ Support',url:'resources.html#lgbtq',type:'Resource category',text:'LGBTQ gay lesbian bisexual transgender trans queer nonbinary support youth community',norwoodPage:true,resourceCategory:true},

  {name:'How Do I?',url:'how-do-i.html',type:'Help & answers',text:'how do i questions answers town services help permits schools safety food housing utilities trash recreation'},
  {name:'Utilities & Home Energy',url:'utilities.html',type:'Home services',text:'utilities electric electricity Norwood Light water sewer natural gas gas internet broadband cable TV heating oil fuel oil prices propane home energy'},
  {name:'Trash & Recycling',url:'trash-recycling.html',type:'Town services',text:'trash garbage rubbish waste recycling recycle pickup collection curbside cart bins red yellow route schedule calendar holiday delay DPW public works WM waste management compost composting food scraps Black Earth Winter Street recycling facility swap shop bulk bulky items hazardous waste household hazardous waste HHW leaves leaf bags brush yard waste Christmas tree trees mattress mattresses styrofoam rigid plastic metal mercury fluorescent bulbs textiles clothing books electronics e-waste television TV batteries paint oil tires construction debris missed pickup cart repair cart replacement additional cart service day disposal dump transfer station'}
 ];
 const townCanonical=[
  {name:'Norwood Health Department',url:'https://www.norwoodma.gov/departments/health/index.php',type:'Official Town department',text:'health department board of health public health permits inspections vaccines food safety septic tobacco'},
  {name:'Norwood Building Department',url:'https://www.norwoodma.gov/departments/building/index.php',type:'Official Town department',text:'building department building permit permits inspector inspection code construction electrical plumbing gas'},
  {name:'Norwood Public Works (DPW)',url:'https://www.norwoodma.gov/departments/public_works/index.php',type:'Official Town department',text:'dpw public works trash recycling roads streets snow water sewer highway engineering'},
  {name:'Norwood Police Department',url:'https://www.norwoodma.gov/departments/police/index.php',type:'Official Town department',text:'police department public safety reports records traffic animal control'},
  {name:'Norwood Fire Department',url:'https://www.norwoodma.gov/departments/fire/index.php',type:'Official Town department',text:'fire department fire prevention permits inspections ambulance ems emergency'},
  {name:'Norwood Town Clerk',url:'https://www.norwoodma.gov/departments/town_clerk/index.php',type:'Official Town department',text:'town clerk elections voting voter registration dog license licenses vital records birth death marriage town meeting'},
  {name:'Norwood Engineering Department',url:'https://www.norwoodma.gov/departments/engineering/index.php',type:'Official Town department',text:'engineering department streets drainage sewer water construction permits plans'},
  {name:'Norwood Conservation Department',url:'https://www.norwoodma.gov/departments/conservation/index.php',type:'Official Town department',text:'conservation department wetlands conservation commission permits open space community garden'},
  {name:'Norwood Memorial Airport',url:'https://www.norwoodma.gov/departments/airport/index.php',type:'Official Town department',text:'airport memorial airport aviation airport commission pilots aircraft hangars drone noise complaints'},
  {name:'Norwood Animal Control',url:'https://www.norwoodma.gov/departments/animal_control.php',type:'Official Town department',text:'animal control dogs cats pets stray lost found wildlife rabies animal complaints dog officer'},
  {name:'Norwood Assessors Office',url:'https://www.norwoodma.gov/departments/assessor/index.php',type:'Official Town department',text:'assessor assessors property tax assessment valuation real estate personal property abatement exemption maps parcel'},
  {name:'Norwood Community Development',url:'https://www.norwoodma.gov/departments/planning_and_economic_development/index.php',type:'Official Town department',text:'community development planning housing land use zoning permits grants economic development'},
  {name:'Norwood Economic Development',url:'https://www.norwoodma.gov/departments/economic_development.php',type:'Official Town department',text:'economic development business development commercial development redevelopment investment'},
  {name:'Norwood Facilities Department',url:'https://www.norwoodma.gov/departments/facilities_/index.php',type:'Official Town department',text:'facilities department town buildings municipal buildings maintenance repairs facilities management'},
  {name:'Norwood Finance & Accounting',url:'https://www.norwoodma.gov/departments/Finance_and_Accounting/index.php',type:'Official Town department',text:'finance accounting budget financial reports accounts payable payroll audit municipal finance'},
  {name:'Norwood General Manager',url:'https://www.norwoodma.gov/departments/general_manager.php',type:'Official Town department',text:'general manager town manager administration executive office town operations'},
  {name:'Norwood Human Resources',url:'https://www.norwoodma.gov/departments/human_resources/index.php',type:'Official Town department',text:'human resources hr jobs employment town jobs careers benefits personnel job openings'},
  {name:'Morrill Memorial Library',url:'https://norwoodlibrary.org/',type:'Official Town department',text:'library books borrowing library card catalog museum passes library of things makerspace events literacy technology'},
  {name:'Norwood Light & Broadband',url:'https://norwoodlight.com/',type:'Official Town department',text:'norwood light electric electricity utility broadband internet cable outage bill billing energy'},
  {name:'Norwood Purchasing Department',url:'https://www.norwoodma.gov/departments/purchasing/index.php',type:'Official Town department',text:'purchasing procurement bids contracts vendors requests for proposals rfp rfq'},
  {name:'Norwood Recreation Department',url:'https://www.norwoodma.gov/departments/recreation/index.php',type:'Official Town department',text:'recreation rec programs sports camps classes pool fields parks activities registration'},
  {name:'Norwood Public Schools',url:'https://www.norwood.k12.ma.us/',type:'Official Town department',text:'schools school district education students elementary middle high superintendent registration'},
  {name:'Norwood Treasurer & Collector',url:'https://www.norwoodma.gov/departments/treasurer_and_collector/index.php',type:'Official Town department',text:'treasurer collector taxes tax bills property tax excise water sewer bills payments'} ,
  {name:'Norwood Veterans Services',url:'https://www.norwoodma.gov/departments/veterans_services/index.php',type:'Official Town department',text:'veterans services veteran benefits assistance'},
  {name:'Norwood Senior Center / Council on Aging',url:'https://www.norwoodma.gov/departments/council_on_aging/index.php',type:'Official Town department',text:'senior center council on aging coa older adults seniors services'},
  {name:'Norwood Board of Selectmen',url:'https://www.norwoodma.gov/government/board_of_selectmen/index.php',type:'Official Town government',text:'board selectmen select board town government meetings'},
  {name:'Norwood Planning Board',url:'https://www.norwoodma.gov/government/boards_committees/planning_board.php',type:'Official Town board',text:'planning board subdivision site plan zoning development'},
  {name:'Norwood Zoning Board of Appeals',url:'https://www.norwoodma.gov/government/boards_committees/zoning_board_of_appeals.php',type:'Official Town board',text:'zoning board appeals zba variance special permit zoning'}
 ].map(x=>({...x,officialTown:true,canonicalTown:true}));
 const aliases={
  doctor:'medical physician primary care health',dentist:'dental orthodontics',train:'transit commuter rail mbta',volunteer:'get involved civic',
  kayak:'boating paddling canoe',bike:'biking cycling bicycle',pool:'swimming swim',pizza:'restaurant food dining',food:'restaurant dining meals',
  vote:'election voting voter ballot polling precinct',voting:'election voter ballot polling precinct',trivia:'trivia history game',climbing:'rock climbing recreation',ninja:'obstacle recreation',
  trash:'trash recycling garbage rubbish waste pickup collection curbside',garbage:'trash recycling rubbish waste pickup',rubbish:'trash garbage waste pickup',
  recycle:'recycling trash waste',recycling:'recycle trash waste',compost:'composting food scraps organics trash recycling',composting:'compost food scraps organics recycling',
  bulk:'bulk bulky large item disposal pickup',mattress:'mattress bulk recycling disposal',styrofoam:'styrofoam polystyrene recycling Winter Street',
  paint:'hazardous waste disposal recycling',electronics:'electronics e waste ewaste recycling disposal',batteries:'batteries hazardous waste recycling',
  leaves:'leaf leaves brush yard waste Winter Street',brush:'brush yard waste leaves Winter Street',dump:'Winter Street recycling facility disposal transfer station',
  hazardous:'household hazardous waste hhw recycling disposal',christmas:'Christmas tree recycling pickup',
  museum:'museum passes discounts library',museums:'museum passes discounts library',snap:'EBT food assistance benefits discounts',ebt:'SNAP food assistance benefits discounts',
  wic:'food assistance benefits Card to Culture discounts',connectorcare:'health insurance Card to Culture discounts',boa:'Bank of America Museums on Us',
  pt:'physical therapy physical therapist physiotherapy rehabilitation rehab',ot:'occupational therapy occupational therapist rehabilitation rehab',
  slp:'speech language pathology speech therapy speech therapist communication swallowing',st:'speech therapy speech therapist speech language pathology',
  aba:'applied behavior analysis autism behavioral therapy',bcba:'board certified behavior analyst applied behavior analysis autism',
  ei:'early intervention child development developmental services',pcp:'primary care physician primary care doctor medical',
  rent:'rent rental housing tenant tenants assistance help RAFT eviction emergency housing',rental:'rent rental housing tenant assistance RAFT',
  housing:'housing rent rental tenant assistance shelter home',childcare:'childcare child care preschool daycare day care early education',
  disability:'disability accessibility accessible special needs support services',heating:'heating fuel utility energy assistance LIHEAP',
  benefits:'benefits assistance financial SNAP MassHealth',dpw:'public works trash recycling roads streets water sewer snow',
  coa:'council on aging senior center seniors older adults',zba:'zoning board appeals zoning variance special permit',
  bos:'board of selectmen select board town government',clerk:'town clerk elections voting records licenses certificates',
  permit:'permits permitting license licensing building energov citizen self service',permits:'permit permitting license licensing building energov citizen self service',
  pothole:'potholes road street dpw public works repair',potholes:'pothole road street dpw public works repair',
  sewer:'sewer wastewater drain drainage public works dpw',water:'water utility bill service public works dpw',
  electric:'electric electricity light power utility norwood light outage',electricity:'electric power light utility norwood light outage',
  internet:'internet broadband cable wifi norwood light broadband',wifi:'internet broadband wireless',
  dog:'dog canine pet animal license animal control',dogs:'dog canine pet animal license animal control',
  playground:'playground park recreation children',field:'athletic field sports recreation',fields:'athletic field sports recreation',
  cops:'police law enforcement public safety',police:'police law enforcement public safety',fire:'fire department fire prevention emergency ems',
  ambulance:'ems emergency medical fire department',senior:'senior seniors older adult council aging coa',seniors:'senior older adults council aging coa',
  tax:'tax taxes assessor collector treasury',taxes:'tax assessor collector treasury',assessment:'assessor property assessment valuation tax',
  birth:'birth certificate vital records town clerk',marriage:'marriage certificate license vital records town clerk',death:'death certificate vital records town clerk',
  license:'license licensing permit permits',licence:'license licensing permit permits',registration:'register registration signup',
  rec:'recreation sports programs parks',recreation:'rec sports programs parks civic center',
  school:'schools education student district',schools:'school education students district',
  library:'morrill memorial library books borrow lending',airport:'norwood memorial airport aviation',
  veterans:'veteran veterans benefits services',veteran:'veterans benefits services',
  foodpantry:'food pantry food assistance groceries',pantry:'food pantry groceries assistance',
  notary:'notary public notarize notarization',notarize:'notary public notarization',
  trainstation:'train station commuter rail mbta transit',parking:'parking lot garage permit ticket',
  meeting:'meetings board committee town meeting agenda minutes',meetings:'meeting board committee town agenda minutes',
  church:'religion religious faith worship house houses congregation parish',churches:'religion religious faith worship houses congregations parishes',
  religion:'religious faith worship church synagogue mosque temple',religious:'religion faith worship church synagogue mosque temple',
  synagogue:'jewish judaism religion worship temple',mosque:'muslim islam islamic religion worship',temple:'hindu buddhist jewish religion worship',
  nonprofit:'nonprofits community organizations clubs charity charitable',nonprofits:'nonprofit community organizations clubs charities',
  club:'clubs community organizations groups',clubs:'club community organizations groups',organization:'organizations community nonprofit clubs',organizations:'organization community nonprofit clubs',
  volunteer:'volunteering get involved community service service hours civic',volunteering:'volunteer get involved community service service hours civic',
  realtor:'real estate agent broker homes property',realtors:'real estate agents brokers homes property',homebuyer:'real estate homes mortgage property moving',
  moving:'real estate living utilities schools transit community relocation',move:'moving relocation real estate utilities schools transit',
  event:'events calendar whats happening activities',events:'event calendar whats happening activities',
  map:'map explore location locations directions parks businesses resources',address:'location map street directions',
  restaurant:'restaurants food dining dinner lunch',restaurants:'restaurant food dining dinner lunch'
 };
 const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const stop=new Set(['a','an','and','are','at','for','from','how','i','in','is','it','me','my','of','on','or','the','to','with']);
 const words=s=>norm(s).split(/\s+/).filter(w=>w&&!stop.has(w));
 const editDistance=(a,b)=>{if(a===b)return 0;if(!a.length)return b.length;if(!b.length)return a.length;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const cur=[i];for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur}return prev[b.length]};
 const closeWord=(q,w)=>{if(q===w)return 1;if(q.length>=4&&w.startsWith(q))return .86;if(w.length>=4&&q.startsWith(w)&&q.length-w.length<=3)return .72;if(q.length<5||w.length<5)return 0;const d=editDistance(q,w),m=Math.max(q.length,w.length);return d===1?.72:(d===2&&m>=8?.42:0)};
 const aliasTerms=raw=>{const direct=aliases[raw]||'';const perWord=words(raw).map(w=>aliases[w]||'').join(' ');return norm(direct+' '+perWord)};

 const libraryThings=[
  {name:'OBD-II diagnostic scanner',terms:'obd obd2 obd ii car auto automobile mechanic mechanical check engine light engine code diagnostic trouble codes vehicle repair scanner',desc:'read vehicle diagnostic trouble codes',url:'https://www.norwoodlibrary.org/wp-content/uploads/2021/05/LOT-Master-List.pdf'},
  {name:'Metal detector',terms:'metal detector treasure hunt lost ring beach yard find metal outdoors',desc:'search for metal objects and lost items',url:'https://norwoodlibrary.org/borrow-a-karaoke-kit/'},
  {name:'Power washer',terms:'power washer pressure washer clean siding deck patio driveway outdoor cleaning home improvement',desc:'tackle outdoor cleaning projects',url:'https://norwoodlibrary.assabetinteractive.com/'},
  {name:'Bike repair tools',terms:'bike bicycle cycling repair mechanic tire chain brakes tools fix',desc:'handle basic bicycle maintenance and repairs',url:'https://norwoodlibrary.org/borrower_services/'},
  {name:'Birdwatching kit',terms:'bird birdwatching bird watching birding birds binocular binoculars nature wildlife outdoors trail trails hiking',desc:'borrow birdwatching gear for trails, parks and wildlife viewing',url:'https://norwoodlibrary.org/borrower_services/'},
  {name:'Tennis rackets',terms:'tennis racket rackets racquet racquets court courts sports recreation',desc:'borrow tennis rackets for use at local courts',url:'https://norwoodlibrary.org/borrower_services/'},
  {name:'Picnic kit',terms:'picnic basket blanket park outdoor lunch date picnic supplies outing',desc:'borrow picnic gear for parks and outdoor outings',url:'https://norwoodlibrary.org/borrower_services/'},
  {name:'Backyard horseshoes',terms:'horseshoes horse shoes lawn game backyard game outdoor game park picnic recreation',desc:'borrow a horseshoes set for outdoor games and gatherings',url:'https://norwoodlibrary.org/borrower_services/'},
  {name:'Soil tester',terms:'soil tester garden gardening lawn ph moisture plants yard',desc:'check soil conditions for lawn and garden projects',url:'https://norwoodlibrary.org/borrow-a-karaoke-kit/'},
  {name:'Food dehydrator',terms:'food dehydrator dehydrate jerky dried fruit cooking kitchen preserve food',desc:'dehydrate and preserve foods',url:'https://norwoodlibrary.org/borrow-a-karaoke-kit/'},
  {name:'Karaoke kit',terms:'karaoke microphone party singing music entertainment',desc:'set up karaoke for a party or gathering',url:'https://norwoodlibrary.org/borrow-a-karaoke-kit/'},
  {name:'Portable turntable / LP digitizer',terms:'record player turntable vinyl lp records digitize convert audio music old records',desc:'play records and convert LP audio to digital files',url:'https://norwoodlibrary.org/borrow-a-karaoke-kit/'},
  {name:'Roku streaming player',terms:'roku streaming tv television movies netflix media player stream',desc:'add streaming-media capability to a television',url:'https://norwoodlibrary.org/mmlservices/technology/'},
  {name:'USB floppy disk drive',terms:'floppy disk drive old files computer data recover usb technology',desc:'access files stored on floppy disks',url:'https://norwoodlibrary.org/mmlservices/technology/'},
  {name:'USB external CD/DVD drive',terms:'cd dvd disc drive laptop computer read burn optical usb movie',desc:'use CDs or DVDs with a computer that lacks an optical drive',url:'https://norwoodlibrary.org/mmlservices/technology/'},
  {name:'Portable electronic magnifier',terms:'magnifier magnifying low vision accessibility visually impaired reading zoom assistive technology',desc:'magnify text and objects for easier viewing',url:'https://norwoodlibrary.org/assistive-technology/'}
 ];
 function thingMatches(raw){
   const q=norm(raw),terms=q.split(/\s+/).filter(x=>x.length>2);if(!q||!terms.length)return[];
   const generic=new Set(['park','parks','outdoor','outdoors','music','party','game','games','sport','sports','repair','tools','technology','food','home','clean','cleaning','movie','movies','reading','yard','garden']);
   return libraryThings.map(t=>{
    const name=norm(t.name),keywords=norm(t.terms),desc=norm(t.desc),h=name+' '+keywords+' '+desc;
    const exactPhrase=h.includes(q),namePhrase=name.includes(q);
    let score=namePhrase?45:exactPhrase?24:0,matched=0;
    terms.forEach(w=>{if(name.split(/\s+/).includes(w)){score+=16;matched++;}else if(keywords.split(/\s+/).includes(w)){score+=7;matched++;}else if(desc.split(/\s+/).includes(w)){score+=3;matched++;}});
    const singleStrong=terms.length===1&&(name.split(/\s+/).includes(terms[0])||(!generic.has(terms[0])&&keywords.split(/\s+/).includes(terms[0])&&terms[0].length>=5));
    const multiStrong=terms.length>1&&(namePhrase||exactPhrase||matched>=2);
    return{...t,score,eligible:singleStrong||multiStrong};
   }).filter(t=>t.eligible&&t.score>=20).sort((a,b)=>b.score-a.score).slice(0,3);
 }

 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function items(){
  const out=pages.map(p=>({...p,norwoodPage:p.norwoodPage!==false}));
  townCanonical.forEach(t=>out.push({...t}));
  (window.NORWOOD_RESTAURANTS||[]).forEach(r=>out.push({name:r.name,url:r.url||'restaurants.html',type:'Restaurant',text:[r.category,r.cuisine,r.address,r.tags].join(' ')}));
  (window.NORWOOD_RESOURCES||[]).forEach(r=>{
   const rawUrl=String(r.url||'');
   const libraryGuide=/^https?:\/\/(?:www\.)?norwoodlibrary\.org\/commres-/i.test(rawUrl);
   const topic=Array.isArray(r.topics)&&r.topics.length?r.topics[0]:'';
   const listingUrl=topic?'resources.html#'+encodeURIComponent(topic):'resources.html';
   out.push({name:r.name,url:libraryGuide?listingUrl:(rawUrl||listingUrl),type:r.category||'Resource',text:[r.category,r.tags,r.coverage,r.description,(r.topics||[]).join(' '),r.address,r.phone,r.source_note].join(' '),officialTown:r.officialTown===true});
  });
  const businessRows=(window.NORWOOD_BUSINESSES||[]).map(b=>Array.isArray(b)?{name:b[0],category:b[1],address:b[2],phone:b[3],website:b[4],labels:[],tags:[]}:b);
  const businessCats={};
  businessRows.forEach(b=>{
   const cat=String(b.category||'').trim();if(cat)(businessCats[cat]||(businessCats[cat]=[])).push(b);
   out.push({name:b.name,url:'business-directory.html?q='+encodeURIComponent(b.name),type:'Local business',text:[b.category,(b.labels||[]).join(' '),b.address,b.phone,(b.tags||[]).join(' ')].join(' '),business:true});
  });
  Object.entries(businessCats).forEach(([cat,rows])=>out.push({name:cat,url:'business-directory.html?q='+encodeURIComponent(cat),type:'Business directory',text:cat+' '+rows.map(b=>[b.name,(b.labels||[]).join(' '),(b.tags||[]).join(' ')].join(' ')).join(' '),norwoodPage:true,businessCategory:true}));
  if(businessRows.some(b=>/roof/i.test([b.category,b.name,(b.labels||[]).join(' '),(b.tags||[]).join(' ')].join(' '))))out.push({name:'Roofers & Roofing Contractors',url:'business-directory.html?q=roof',type:'Business directory',text:'roof roofer roofers roofing contractor contractors home repair exterior shingles gutters',norwoodPage:true,businessCategory:true});
  (window.NORWOOD_CALENDAR_SOURCES||[]).forEach(c=>out.push({name:(c.name||'Calendar')+' calendar',url:c.view_url||'calendars.html',type:'Calendar',text:[c.name,c.description,c.provider,c.group,'calendar schedule dates events school'].join(' '),calendar:true}));
  (window.NORWOOD_EVENTS||[]).forEach(e=>out.push({name:e.title||e.name||'Community event',url:'events.html',type:'Event',date:e.start?.date||'',text:[e.description,e.category,e.venue,e.address,e.town,e.organizer,e.source,e.tags,e.start?.date,e.end?.date].join(' ')}));
  (window.NORWOOD_RECREATION_PROGRAMS||[]).filter(r=>r.searchable!==false).forEach(r=>out.push({name:r.name||r.program||'Recreation program',url:'events.html?rec='+encodeURIComponent(r.id),type:'Norwood Recreation',date:r.start_date||'',text:[r.program,r.subcategory,r.section,r.description,r.ages,r.grades,r.days,r.venue,r.fees,r.source,r.start_date,r.end_date,r.start_time,r.end_time,r.drop_in?'drop in':''].join(' '),recreation:true}));
  (window.NORWOOD_HOWDO||[]).forEach(h=>out.push({name:h.title,url:'how-do-i.html#'+h.id,type:'How Do I?',text:[h.text,h.keywords,'question answer help'].join(' '),norwoodPage:true}));
  return out.map(x=>({
   ...x,
   officialTown:x.officialTown===true||/^https?:\/\/(?:www\.)?(?:norwoodma\.gov|norwoodlight\.com)(?:\/|$)/i.test(String(x.url||'')),
   officialSchool:/^https?:\/\/(?:www\.)?norwood\.k12\.ma\.us(?:\/|$)/i.test(String(x.url||''))
  }));
 }
 function search(raw,limit=12){
  const original=String(raw||'').trim();
  const acronym=/^[A-Z][A-Z0-9&.-]{1,7}$/.test(original);
  raw=norm(original); if(!raw)return [];
  const queryWords=words(raw),expanded=norm(raw+' '+aliasTerms(raw)),expandedWords=[...new Set(words(expanded))];
  return items().map(x=>{
   const name=norm(x.name),type=norm(x.type),body=norm(x.text),url=norm(x.url),nameWords=words(name),typeWords=words(type),bodyWords=words(body);
   let score=0,matchedCore=0;
   if(name===raw)score+=180;else if(name.startsWith(raw))score+=105;else if(name.includes(raw))score+=78;
   if(type===raw)score+=75;else if(type.includes(raw))score+=34;
   if(body.includes(raw))score+=32;
   queryWords.forEach(q=>{
    let best=0;
    nameWords.forEach(w=>best=Math.max(best,closeWord(q,w)*30));
    typeWords.forEach(w=>best=Math.max(best,closeWord(q,w)*20));
    bodyWords.forEach(w=>best=Math.max(best,closeWord(q,w)*8));
    if(best>=10)matchedCore++;
    score+=best;
   });
   const related=expandedWords.filter(w=>!queryWords.includes(w));
   related.forEach(q=>{
    let best=0;
    nameWords.forEach(w=>best=Math.max(best,closeWord(q,w)*9));
    typeWords.forEach(w=>best=Math.max(best,closeWord(q,w)*7));
    bodyWords.forEach(w=>best=Math.max(best,closeWord(q,w)*3));
    score+=best;
   });
   if(queryWords.length>1){const coverage=matchedCore/queryWords.length;score+=coverage===1?38:coverage>=.67?16:-18;}
   if(url.includes(raw.replace(/ /g,' ')))score+=5;
   if(x.resourceCategory&&score>=18)score+=42;
   if(x.type==='How Do I?'&&score>=18)score+=howDoPage?140:34;
   if(x.business&&score>=30)score+=3;
   if(acronym&&aliasTerms(raw)){if(nameWords.includes(raw)||typeWords.includes(raw))score+=50;}
   let tier=3;
   const phraseMatch=name===raw||name.startsWith(raw)||name.includes(raw)||body.includes(raw);
   const fullCoreMatch=queryWords.length<=1?matchedCore>0:matchedCore===queryWords.length;
   const strongCore=phraseMatch||fullCoreMatch;
   if(x.norwoodPage&&!x.business&&!x.calendar&&!x.recreation&&x.type!=='Event'&&strongCore&&score>=18)tier=1;
   else if(x.canonicalTown&&strongCore&&score>=18)tier=2;
   return{x,score,tier,matchedCore};
  }).filter(o=>o.score>7&&(queryWords.length<=1||o.matchedCore>0))
   .sort((a,b)=>a.tier-b.tier||b.score-a.score||a.x.name.localeCompare(b.x.name))
   .filter((o,idx,arr)=>{
    if(!o.x.officialTown||o.x.canonicalTown)return true;
    const u=norm(o.x.url),n=norm(o.x.name);
    return !arr.some((p,j)=>j<idx&&p.x.canonicalTown&&(norm(p.x.url)===u||norm(p.x.name)===n));
   }).slice(0,limit);
 }
 window.NorwoodSiteSearch.search=(raw,limit=12)=>search(raw,limit);
 function noteSearch(query,count){
   try{
     const key='norwood-search-insights',now=new Date().toISOString();
     const data=JSON.parse(localStorage.getItem(key)||'[]');
     data.push({q:query.toLowerCase().slice(0,80),results:count,at:now});
     localStorage.setItem(key,JSON.stringify(data.slice(-100)));
   }catch(e){}
 }
 function eventDate(s){if(!s)return '';const p=s.split('-').map(Number),d=new Date(p[0],p[1]-1,p[2],12);return d.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric',year:'numeric'});}
 let restaurantIndex=[];
 fetch('data/restaurants.json').then(r=>r.json()).then(rows=>{restaurantIndex=Array.isArray(rows)?rows:[];if(input.value.trim())render(false);}).catch(()=>{});
  const normalize=norm;
  function searchable(r){
    const tags=Array.isArray(r.tags)?r.tags.join(' '):(r.tags||'');
    return normalize([r.name,r.category,r.cuisine,r.address,tags,r.gluten_free?'gluten free gf':'',hasFullBar(r)?'full bar cocktails liquor drinks':''].filter(Boolean).join(' '));
  }
  function hasFullBar(r){
    if(r?.full_bar===true) return true;
    const tags=' '+normalize(Array.isArray(r?.tags)?r.tags.join(' '):(r?.tags||''))+' ';
    return tags.includes(' cocktails ')&&tags.includes(' beer ')&&tags.includes(' wine ')&&tags.includes(' full ');
  }
  function editDistanceAtMostOne(a,b){
    if(a===b) return true;
    if(Math.abs(a.length-b.length)>1) return false;
    let i=0,j=0,edits=0;
    while(i<a.length&&j<b.length){
      if(a[i]===b[j]){i++;j++;continue;}
      if(++edits>1) return false;
      if(a.length>b.length)i++;
      else if(b.length>a.length)j++;
      else{i++;j++;}
    }
    return edits+(i<a.length||j<b.length?1:0)<=1;
  }
  function termMatchesRestaurant(r,term){
    const q=normalize(term);
    if(!q) return true;
    const hay=searchable(r);
    if((' '+hay+' ').includes(' '+q+' ')) return true;
    const words=hay.split(' ').filter(Boolean);
    if(q.length>=4&&words.some(w=>w.startsWith(q)&&w.length-q.length<=2)) return true;
    if(q.length>=5&&words.some(w=>w.length>=5&&editDistanceAtMostOne(q,w))) return true;
    return false;
  }
  // Explicit dish aliases only; never infer an individual dish from a broad cuisine.
  const beverageAliases={
    'beer':['draft beer','bottled beer','craft beer','lager','ipa'],
    'wine':['red wine','white wine','rose','rosé','sparkling wine','prosecco'],
    'cocktail':['cocktails','mixed drinks'],
    'mocktail':['mocktails','nonalcoholic cocktails','non alcoholic cocktails'],
    'soda':['soft drinks','cola'],
    'coffee':['iced coffee','cold brew','espresso','latte'],
    'tea':['iced tea','milk tea','chai']
  };
  const dishAliases={
    'chicken parm':['chicken parmesan','chicken parmigiana','chicken parm sub','chicken parmigiana sub'],
    'eggplant parm':['eggplant parmesan','eggplant parmigiana'],
    'fries':['french fries','frites'],
    'subs':['sub','submarine sandwich','hoagie','hoagies','grinder','grinders','hero','heroes'],
    'calzone':['calzones'],
    'enchiladas':['enchilada'],
    'quesadilla':['quesadillas'],
    'burrito':['burritos'],
    'taco':['tacos'],
    'sushi':['sushi rolls','maki','nigiri'],
    'pad thai':['phad thai'],
    'gyro':['gyros'],
    'falafel':['falafels'],
    'burger':['burgers','hamburger','hamburgers','cheeseburger','cheeseburgers'],
    'ice cream':['ice cream cone','ice cream sundae','sundae','soft serve','soft serve ice cream']
  };
  function dishMatch(r,query){
    const q=normalize(query);
    const dishes=Array.isArray(r.dishes)?r.dishes:[];
    const terms=[q];
    for(const [canonical,aliases] of Object.entries({...dishAliases,...beverageAliases})){
      const family=[canonical,...aliases].map(normalize);
      if(family.includes(q)){terms.splice(0,terms.length,...family);break;}
    }
    return dishes.some(d=>terms.some(t=>(' '+normalize(d)+' ').includes(' '+t+' ')));
  }
  function beverageMatch(r,query){
    const q=normalize(query);
    const beverages=Array.isArray(r.beverages)?r.beverages:[];
    const family=Object.entries(beverageAliases).find(([key,aliases])=>[key,...aliases].map(normalize).includes(q));
    const terms=family?[family[0],...family[1]].map(normalize):[q];
    return beverages.some(b=>terms.some(t=>(' '+normalize(b)+' ').includes(' '+t+' ')));
  }
  // Generic deli subs imply searchable sub styles, but not a verified specific filling.
  function genericSubMatch(r,query){
    const q=normalize(query);
    const subs=Array.isArray(r.dishes)?r.dishes.map(normalize):[];
    if(!subs.some(d=>['subs','deli subs','sub','sandwiches','deli sandwiches'].includes(d))) return false;
    const words=q.split(' ').filter(Boolean);
    const styles=['sub','subs','hoagie','hoagies','grinder','grinders','hero','heroes','submarine','sandwich'];
    const fillings=['turkey','italian','ham','roast beef','chicken salad','tuna','salami','pastrami'];
    return words.some(w=>styles.includes(w))&&fillings.some(f=>(' '+q+' ').includes(' '+f+' '));
  }
  function matchesCuisine(r,choice){
    const q=normalize(choice);
    if(!q) return true;
    if(q==='sushi') return normalize(r.cuisine).includes('sushi') || (Array.isArray(r.cuisine_tags)&&r.cuisine_tags.includes('sushi'));
    if(q==='hibachi') return normalize(r.cuisine).includes('hibachi') || (Array.isArray(r.cuisine_tags)&&r.cuisine_tags.includes('hibachi'));
    return normalize(r.category)===q || (Array.isArray(r.cuisine_tags)&&r.cuisine_tags.some(t=>normalize(t)===q));
  }
  function matchesQuery(r,q){
    if(!q) return true;
    if(dishMatch(r,q)||beverageMatch(r,q)||genericSubMatch(r,q)) return true;
    // Cuisine searches should return every relevant restaurant, not only a literal dish entry.
    if(['sushi','hibachi'].includes(q)) return matchesCuisine(r,q);
    const beverageTerms=Object.entries(beverageAliases).flatMap(([key,aliases])=>[key,...aliases].map(normalize));
    if(beverageTerms.includes(q)) return false;
    // Do not mistake a requested dish for a restaurant's broad cuisine or address.
    const dishTerms=Object.entries(dishAliases).flatMap(([key,aliases])=>[key,...aliases].map(normalize));
    const indexedDishes=new Set(restaurants.flatMap(item=>Array.isArray(item.dishes)?item.dishes.map(normalize):[]));
    const indexedDrinks=new Set(restaurants.flatMap(item=>Array.isArray(item.beverages)?item.beverages.map(normalize):[]));
    if(dishTerms.includes(q)||indexedDishes.has(q)||indexedDrinks.has(q)) return false;
    const words=q.split(' ').filter(Boolean);
    return words.every(t=>termMatchesRestaurant(r,t));
  }
  function restaurantMatchCount(raw){
    const q=normalize(raw);
    return q.length<3?0:restaurantIndex.filter(r=>matchesQuery(r,q)).length;
  }
 function render(track=false){
  const raw=input.value.trim(); if(!raw){submitted=false;box.hidden=true;box.innerHTML='';return []}
  const allHits=search(raw,200);
  const businessHits=allHits.filter(({x})=>x.business);
  // Autocomplete stays task-focused: individual businesses belong on the full
  // results page, not in the live dropdown.
  let hits=(resultsPage?allHits:allHits.filter(({x})=>!x.business)).slice(0,12);
  if(howDoPage)hits=[...hits.filter(({x})=>x.type==='How Do I?'),...hits.filter(({x})=>x.type!=='How Do I?')].slice(0,12);
  if(hits.some(({x})=>x.url==='trash-recycling.html')) hits=hits.filter(({x})=>!x.officialTown);
  const things=thingMatches(raw);
  const howDoHtml=/^how(?:\s|$)|^how\s+do\s+i/i.test(raw)?'<div class="library-things-search-callout howdo-search-callout"><span class="library-things-badge">HOW DO I?</span><b>❓ Looking for a quick answer?</b><p>Browse practical answers to common Norwood questions.</p><a href="how-do-i.html">Open How Do I? →</a></div>':'';
  const thingHtml=things.length?`<div class="library-things-search-callout"><span class="library-things-badge">LIBRARY OF THINGS</span><b>📚 The library may have ${things.length===1?'one':'things'} you can borrow</b><p>${things.map(t=>`<strong>${esc(t.name)}</strong> — ${esc(t.desc)}`).join('<br>')}</p><a href="${esc(things[0].url)}" target="_blank" rel="noopener">Check availability &amp; borrowing details →</a><small>Morrill Memorial Library · Listed by library; current availability is not guaranteed.</small></div>`:'';
  // Keep menu-item searches on the dedicated Food & Drink results page.
  const foodIntent=restaurantMatchCount(raw)>0;
  const foodMoreHtml=foodIntent?`<a class="restaurant-search-bridge" href="restaurants.html?q=${encodeURIComponent(raw)}"><b>See Restaurant Results →</b><small>View matching restaurants in Food &amp; Drink</small></a>`:'';
  const businessMoreHtml=!resultsPage&&businessHits.length?`<a href="search.html?q=${encodeURIComponent(raw)}"><b>${businessHits.length} ${esc(raw)} business${businessHits.length===1?'':'es'} found…</b><small>Click for full search results →</small></a>`:'';
  const regularHtml=hits.length?hits.map(({x})=>`<a href="${esc(x.url)}"><b>${esc(x.name)}${x.norwoodPage?' <img class="search-source-icon norwoodma-search-icon" src="assets/favicon-approved.png" alt="Norwood.ma page" title="Norwood.ma page">':''}${x.officialTown?' <img class="search-source-icon town-search-icon" src="https://upload.wikimedia.org/wikipedia/commons/5/5f/Seal_of_Norwood%2C_Massachusetts.png" alt="Official Town of Norwood resource" title="Official Town of Norwood resource">':''}${x.officialSchool?' <img class="search-source-icon school-search-icon" src="https://www.norwood.k12.ma.us/favicon.ico" alt="Official Norwood Public Schools resource" title="Official Norwood Public Schools resource">':''}${x.type==='Event'?' <span class="search-source-icon event-search-icon" aria-label="Event" title="Event">📅</span>':''}</b><small>${esc(x.type)}${x.type==='Event'&&x.date?' · '+esc(eventDate(x.date)):''}${x.text?' · '+esc(String(x.text).split(/\s+/).slice(0,7).join(' ')):''}</small></a>`).join(''):'<p>No matches. Try a shorter or different term.</p>';
  const heading=track?`<div class="site-search-submitted-head" role="status"><b>Search results for “${esc(raw)}”</b><small>${hits.length+things.length} result${hits.length+things.length===1?'':'s'}</small></div>`:'';
  const resultCount=hits.length+things.length; const googleHtml=resultCount<10?`<div class="site-search-google"><a href="https://www.google.com/search?q=${encodeURIComponent(raw+' Norwood MA')}" target="_blank" rel="noopener"><b>Search Google for “${esc(raw)}” →</b><small>Search the wider web for Norwood-related results</small></a></div>`:''; box.innerHTML=heading+foodMoreHtml+howDoHtml+thingHtml+regularHtml+businessMoreHtml+googleHtml;
  box.hidden=false;insertArchiveBridge(raw);if(track)noteSearch(raw,hits.length+things.length);return hits;
 }
 input.addEventListener('input',()=>{submitted=false;render(false)});
 input.addEventListener('focus',()=>{if(input.value.trim())render(false)});
 form.addEventListener('submit',e=>{e.preventDefault();const q=input.value.trim();if(!q)return;if(!resultsPage){location.href='search.html?q='+encodeURIComponent(q);return;}submitted=true;history.replaceState(null,'','search.html?q='+encodeURIComponent(q));render(true);box.setAttribute('tabindex','-1');const anchor=form.getBoundingClientRect().top+window.scrollY;window.scrollTo({top:Math.max(0,anchor-24),behavior:'smooth'});box.focus({preventScroll:true});});
 input.addEventListener('keydown',e=>{if(e.key==='Escape'){box.hidden=true;input.blur()}if(e.key==='ArrowDown'){const a=box.querySelector('a');if(a){e.preventDefault();a.focus()}}});
 box.addEventListener('keydown',e=>{if(e.key==='Escape'){box.hidden=true;input.focus()}});
 document.addEventListener('click',e=>{if(!form.contains(e.target)&&!submitted)box.hidden=true});
 if(resultsPage){const q=new URLSearchParams(location.search).get('q')||'';if(q){input.value=q;submitted=true;render(true);}else{box.hidden=false;box.innerHTML='<p>Enter a search above to find pages, events, businesses, resources, calendars, restaurants, and Library of Things items.</p>';}}
})();