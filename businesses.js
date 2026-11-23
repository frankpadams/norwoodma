(()=>{'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const groups={
 food:{label:'Restaurants & Food',match:/restaurants?|dining|\bcaf[eé]s?\b|coffee|juice bars|deli|bakery|\bpizza\b|\bsushi\b/i,subs:[]},
 automotive:{label:'Automotive',match:/car.{0,12}rental|van rental|\\bauto\\b|automotive|car wash|vehicle|towing|roadside|collision|tire|truck repair/i,subs:[
  ['sales','Sales & Dealers',/dealer|sales/i],['repair','Repair & Mechanics',/repair|mechanic/i],['collision','Collision, Body & Detailing',/collision|auto body|detail/i],['tires','Tires',/tire/i],['inspection','Inspections & Car Wash',/inspection|car wash/i],['towing','Towing & Roadside',/towing|roadside/i],['rental','Car, Van & Truck Rental',/(car|van|truck).*rental|rental.*(car|van|truck)/i]
 ]},
 home:{label:'Home Services & Contractors',match:/construction|carpentry|handyman|residential.*cleaning|commercial.*cleaning|vacuum|appliance|hvac|plumb|heating|electric|contractor|home improvement|home repair|house cleaning|painting|remodel|garage door|roof|landscap|tree service|pest|pool service|masonry|chimney|gutter|flooring|fence|interior design|hardscap|cabinet|fireplace|glass|mirror|window repair|drywall|plaster|stucco|tile|marble|excavation|paving|restoration/i,subs:[
  ['emergency-restoration','Water, Fire & Mold Restoration',/water.*restoration|fire.*restoration|mold.*restoration|restoration.*construction/i],['hvac','HVAC & Heating',/hvac|heating|refrigeration/i],['plumbing','Plumbing',/plumb/i],['electrical','Electrical',/electric/i],['roofing','Roofing & Siding',/roof|siding/i],['masonry','Masonry, Chimneys & Hardscaping',/masonry|chimney|hardscap/i],['gutters','Gutters & Gutter Cleaning',/gutter/i],['garage-doors','Garage Doors',/garage door/i],['painting','Painting',/painting|painter/i],['flooring','Flooring',/flooring/i],['tile','Tile & Marble',/tile|marble/i],['drywall','Drywall, Plaster & Stucco',/drywall|plaster|stucco/i],['glass','Glass, Mirrors & Window Repair',/glass|mirror|window repair/i],['excavation','Excavation, Paving & Site Work',/excavation|site work|paving/i],['contractors','General Contracting & Remodeling',/contractor|remodel|home improvement|home repair|construction/i],['cleaning','House Cleaning',/house cleaning|residential.*cleaning/i],['landscape','Landscaping & Tree Services',/landscap|tree service|garden design/i],['pest','Pest Control',/pest/i],['interior','Interior Design & Home Staging',/interior design|home staging/i],['cabinets','Cabinets & Custom Woodwork',/cabinet|custom woodwork/i],['fireplaces','Fireplaces & Outdoor Living',/fireplace|grill|outdoor living/i]
 ]},
 health:{label:'Health, Dental & Wellness',match:/dental|orthodont|oral surgery|endodont|physical therapy|rehabilitation|optometr|eye care|ophthalm|eyewear|audiology|hearing|chiropractic|acupuncture|pharmac|medical|physician|neurolog|psychiatr|mental health|counsel|urgent care|primary care|internal medicine|orthopedic|occupational health|wellness|massage/i,subs:[
  ['dental','Dental & Orthodontics',/dental|orthodont|oral surgery|endodont/i],['rehab','Physical Therapy & Rehabilitation',/physical therapy|rehabilitation/i],['vision','Vision & Eye Care',/optometr|ophthalm|eye care|eyewear|vision/i],['hearing','Audiology & Hearing',/audiology|hearing/i],['chiropractic','Chiropractic',/chiropractic/i],['acupuncture','Acupuncture & Holistic Wellness',/acupuncture|holistic/i],['mental-health','Mental Health & Psychiatry',/mental health|psychiatr|counsel|psycholog/i],['primary','Primary & Urgent Care',/primary care|internal medicine|urgent care|family medicine|occupational health/i],['specialty','Specialty Medical Care',/orthopedic|neurolog|physician|specialty medical|ENT/i],['senior','Nursing & Rehabilitation',/nursing|skilled nursing/i],['pharmacy','Pharmacies, Labs & Medical Supplies',/pharmac|medical supplies|medical equipment|laboratory|diagnostic/i]
 ]},
 pets:{label:'Pets & Veterinary',match:/pet|veterinar|animal hospital|groom|dog walk|pet sit|pet board|dog train/i,subs:[['veterinary','Veterinary & Animal Hospitals',/veterinar|animal hospital/i],['grooming','Pet Grooming',/groom/i],['walking','Dog Walking & Pet Sitting',/dog walk|pet sit/i],['boarding','Boarding, Daycare & Training',/pet board|dog daycare|dog train|pet daycare/i]]},
 professional:{label:'Professional & Financial Services',match:/attorney|legal|account|tax|bookkeep|bank|financial|insurance|notary|real estate|mortgage|appraisal|valuation|mediation|benefit consulting/i,subs:[['legal','Attorneys & Legal Services',/attorney|legal/i],['accounting','Accounting & Tax',/account|tax|bookkeep|CPA/i],['banking','Banks & Financial Services',/bank|financial planning|investment/i],['mortgage','Mortgage Services',/mortgage/i],['insurance','Insurance & Benefits',/insurance|benefit consulting/i],['notary','Notary Services',/notary/i],['real-estate','Real Estate & Property Management',/real estate|property management/i],['appraisal','Appraisal & Valuation',/appraisal|valuation/i],['mediation','Mediation & Conflict Resolution',/mediation|conflict resolution/i]]},
 personal:{label:'Personal Care',match:/tattoo|laser services|barber|salon|beauty|spa|massage|personal care|tailor|alteration|dry clean|laundry|nail|lash|wax|skin care|aesthetic/i,subs:[['hair','Barbers & Salons',/barber|hair salon|salon/i],['nails','Nails, Lashes & Brows',/nail|lash|brow/i],['skin','Skin Care & Aesthetics',/skin care|aesthetic|laser|wax/i],['massage','Massage & Wellness',/massage|body work/i],['tailoring','Tailoring & Alterations',/tailor|alteration/i],['laundry','Laundry & Dry Cleaning',/laundry|dry clean/i]]},
 fitness:{label:'Fitness, Sports & Lessons',match:/sports|recreation|adventure|fitness|personal training|martial arts|gymnast|swim|cheer|tumbling|music school|music.*lesson|dance school|dance.*lesson|yoga|barre|sports training|weightlifting|tutoring|education/i,subs:[['fitness','Fitness & Personal Training',/fitness|personal training|weightlifting/i],['martial','Martial Arts',/martial arts|karate|taekwondo|jiu-jitsu/i],['gymnastics','Gymnastics, Cheer & Tumbling',/gymnast|cheer|tumbling/i],['swim','Swim Schools',/swim/i],['dance','Dance, Yoga & Barre',/dance|yoga|barre/i],['music','Music Schools & Lessons',/music school|music.*lesson/i],['tutoring','Tutoring & Education',/tutoring|education|college consulting/i],['sports','Sports Training',/sports training|sports performance/i]]},
 training:{label:'Training & Instruction',match:/driving schools?|driver education|driving lessons|truck[ -]?driving|truck driver training|\bcdl\b|music schools?|music.*lesson|(?:piano|guitar|voice|violin|drum) lessons/i,subs:[['driving','Driving Schools',/driving schools?|driver education|driving lessons/i],['cdl','Truck Driving & CDL Training',/truck[ -]?driving|truck driver training|\bcdl\b/i],['music','Music Lessons',/music schools?|music.*lesson|(?:piano|guitar|voice|violin|drum) lessons/i]]},
 creative:{label:'Arts, Creative & Events',match:/performing arts|theatre|handmade goods|wood burning|artist|creative|photograph|design|gallery|glassblow|media|music|event|wedding|party|function hall|ballroom|conference.*venue|craft|maker|makerspace|workshop|audio production|film production|video production/i,subs:[
  ['venues','Party & Event Venues',/party.*venue|event venue|function hall|ballroom|conference.*venue|wedding.*venue/i],
  ['kids-parties','Kids & Activity Parties',/kids party|birthday part|children.*part|indoor play|family entertainment|arcade|mini golf/i],
  ['event-services','Event Services, Catering & Entertainment',/event service|catering|DJ|entertainment|event planning/i],
  ['artists','Artists & Studios',/artist|art studio|creative studio/i],['photography','Photography',/photograph/i],['design','Design & Creative Services',/design|graphic/i],['media','Media, Audio & Video',/media|audio production|film production|video production/i],['makers','Makerspaces, Crafts & Workshops',/maker|makerspace|craft|glassblow|workshop/i]
 ]},
 lodging:{label:'Hotels & Lodging',match:/hotel|lodging|marriott|sheraton|hampton inn|residence inn|holiday inn/i,subs:[['hotels','Hotels & Lodging',/hotel|lodging|marriott|sheraton|hampton inn|residence inn|holiday inn/i]]},
 family:{label:'Children & Family Services',match:/childcare|preschool|indoor play|children.*party|family entertainment/i,subs:[['childcare','Childcare & Preschools',/childcare|preschool/i],['parties','Kids Parties & Indoor Play',/indoor play|children.*party|family entertainment/i]]},
 housing:{label:'Housing & Senior Living',match:/apartment|rental housing|assisted living|memory care|home care|senior services|adult day/i,subs:[['apartments','Apartments & Rental Housing',/apartment|rental housing/i],['senior-living','Assisted Living & Memory Care',/assisted living|memory care/i],['home-care','Home Care & Senior Services',/home care|senior services|adult day/i]]},
 shopping:{label:'Shopping & Specialty Retail',match:/discount|variety|hardware|tool supplies|furniture|appliance|estate sales|butcher|specialty food|food retail|grocer|supermarket|produce|warehouse club|international grocer|garden center|nurser|florist|books|shopping|plants|gifts|bicycles|specialty retail|antiques|vintage|jewelry|collectibles|clothing|apparel|sporting goods|department store|beauty supply|musical instrument|home decor|candy|chocolate|convenience store|thrift|wine.*spirit|liquor/i,subs:[['supermarkets','Supermarkets & Groceries',/grocer|supermarket/i],['international','International Grocers',/international grocer/i],['produce','Produce & Specialty Food Retail',/produce|butcher|specialty food|candy|chocolate|deli/i],['convenience','Convenience Stores',/convenience store/i],['garden','Garden, Plants & Florists',/garden|nurser|florist|plants/i],['gifts','Books, Gifts & Specialty Shopping',/books|shopping|gifts/i],['bikes','Bicycles & Sporting Goods',/bicycle|sporting goods/i],['jewelry','Jewelry, Coins & Collectibles',/jewelry|coins|stamps|collectibles/i],['vintage','Antiques, Vintage, Thrift & Home Decor',/antiques|vintage|thrift|home decor|salvage/i],['apparel','Clothing, Apparel & Beauty Supply',/clothing|apparel|beauty supply|dancewear/i],['spirits','Wine & Spirits',/wine.*spirit|liquor/i],['specialty','Other Specialty Retail',/specialty retail|department store|musical instrument/i]]},
 'business-services':{label:'Business & Technology Services',match:/recruit|employment|career|promotional products|commercial supply|printing|shipping|office|computer|technology|telecom|digital marketing|aviation|flight|aircraft|industrial|building materials|sign|manufactur|fabrication|testing|engineering|architecture|automation|aerospace|composite|electronics|sensor|thermal|machinery|equipment|biotechnology|pharmaceutical|collection services|business services|business consulting|semiconductor|materials testing|distribution|logistics|wholesale|corporate|scientific|environmental|marketing|commercial space|office space|food distribution/i,subs:[['print','Printing, Signs & Promotional Products',/printing|shipping|sign|promotional/i],['tech','Computer, IT & Telecommunications',/computer|technology|telecom|digital/i],['consulting','Business & Professional Consulting',/business consulting|business services/i],['aviation','Aviation Services',/aviation|flight|aircraft|fixed-base/i],['industrial','Industrial & Commercial Supply',/industrial supply|building materials|rigging|commercial supply/i],['engineering','Engineering, Architecture & Manufacturing',/manufactur|fabrication|testing|engineering|architecture|automation|aerospace|composite|electronics|semiconductor|sensor|thermal|machinery|scientific|materials testing|biotechnology|pharmaceutical|environmental/i],['logistics','Distribution, Wholesale & Logistics',/distribution|logistics|wholesale|food distribution/i],['media','Marketing & Media',/marketing|media/i],['space','Office & Commercial Space',/commercial space|office space|office park/i],['equipment','Equipment & Tool Services',/equipment|tool rental/i]]},
 other:{label:'Other Local Services',match:/self storage|moving|funeral|cremation|monument|memorial|headstone|grave marker|cemetery lettering|bronze plaque|florist|sympathy flower|funeral flower|locksmith|security|taxi|shuttle|transportation|truck rental|gas station|cleanout|junk removal/i,subs:[['gas','Gas Stations',/gas station/i],['storage','Storage & Moving',/self storage|storage & moving|moving/i],['funeral','Funeral, Cremation, Memorials & Flowers',/funeral|cremation|monument|memorial|headstone|grave marker|cemetery lettering|bronze plaque|engraving|florist|sympathy flower|funeral flower/i],['security','Locksmiths & Security',/locksmith|security/i],['junk','Junk Removal & Cleanouts',/junk removal|cleanout/i],['transportation','Taxi, Shuttle & Transportation',/taxi|shuttle|transportation|truck rental/i]]}
}
const raw = window.NORWOOD_BUSINESSES || [];
const businesses = raw.map(b => Array.isArray(b) ? {name:b[0],category:b[1],address:b[2],phone:b[3],website:b[4]} : b);
const nameKey = value => String(value || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
let activeSponsorNames = new Set();
// Display badges only for confirmed, active sponsors; never influence ranking.
function sponsorBadge(b) {
 return activeSponsorNames.has(nameKey(b.name))
  ? '<span class="business-sponsor-mark" title="This business is a Norwood.ma sponsor"><img src="assets/sponsor-button.webp" alt="Sponsor" width="40" height="40" loading="lazy"></span>'
  : '';
}

const addressKey = value => String(value || '').toLowerCase()
 .replace(/,?\s*norwood(?:,?\s*ma(?:\s*02062)?)?$/i, '')
 .replace(/boston[ -]*providence/g, 'providence').replace(/highway|turnpike|tpke/g, 'hwy')
 .replace(/street/g, 'st').replace(/avenue/g, 'ave').replace(/[^a-z0-9]/g, '');
for (const restaurant of window.NORWOOD_RESTAURANTS || []) {
 const duplicate = businesses.some(b => {
  const sameAddress = addressKey(b.address) && addressKey(b.address) === addressKey(restaurant.address);
  const sameName = nameKey(b.name) === nameKey(restaurant.name);
  return (sameName && (!b.address || !restaurant.address || sameAddress)) ||
   (sameAddress && groups.food.match.test(b.category || ''));
 });
 if (duplicate) continue;
 businesses.push({
  id: 'restaurant-' + restaurant.id, name: restaurant.name, category: 'Restaurants & Dining',
  labels: ['Restaurants & Dining', restaurant.category, restaurant.cuisine].filter(Boolean),
  address: restaurant.address ? restaurant.address + ', Norwood, MA 02062' : '',
  phone: restaurant.phone || '', website: restaurant.url || '',
  mapUrl: 'map.html?category=food&place=' + encodeURIComponent(restaurant.name)
 });
}
const text=b=>[b.name,b.category,Array.isArray(b.labels)?b.labels.join(' '):b.labels,Array.isArray(b.tags)?b.tags.join(' '):b.tags].filter(Boolean).join(' ');
function classifyBusiness(b){
 const t=text(b),out=[];
 Object.entries(groups).forEach(([group,g])=>{
  if(!g.match.test(t))return;
  const subs=g.subs.filter(s=>s[2].test(t)).map(s=>s[0]);
  out.push({group,subs});
 });
 return out.length ? out : [{group:'other',subs:[]}];
}
businesses.forEach(b=>{b.taxonomy=classifyBusiness(b);});
window.NORWOOD_BUSINESS_TAXONOMY=Object.fromEntries(businesses.map(b=>[String(b.name||'').toLowerCase(),b.taxonomy]));
function card(b){
 const title=b.website?'<a class="resource-name" href="'+esc(b.website)+'" target="_blank" rel="noopener"><b>'+esc(b.name)+'</b> <span aria-hidden="true">↗</span></a>':'<span class="resource-name resource-name-no-link"><b>'+esc(b.name)+'</b></span>';
 const details=[b.address,b.phone].filter(Boolean).map(esc).join(' · ');
 const description=b.description?'<p class="business-description">'+esc(b.description)+'</p>':'';
 const hours=b.hours?'<p class="business-hours"><strong>Hours:</strong> '+esc(b.hours)+'</p>':'';
 const extra=[];
 if(b.email)extra.push('<a href="mailto:'+encodeURIComponent(b.email)+'">Email bookstore</a>');
 if(b.eventsUrl&&/^https:\/\//i.test(b.eventsUrl))extra.push('<a href="'+esc(b.eventsUrl)+'" target="_blank" rel="noopener">Events &amp; author visits ↗</a>');
 const extraLinks=extra.length?'<p class="business-extra-links">'+extra.join(' · ')+'</p>':'';
 const mapLink=b.address?'<p class="business-map-item-link"><a href="'+esc(b.mapUrl||('map.html?business='+encodeURIComponent(b.name)))+'">Show on map →</a></p>':'';
 return '<article class="resource-item business-item"><div class="resource-meta"><span class="badge">'+esc(b.category||'Local business')+'</span></div><div class="resource-title-row">'+title+sponsorBadge(b)+'</div>'+(details?'<p>'+details+'</p>':'')+description+hours+extraLinks+mapLink+'</article>';
}
function parse(){const p=location.hash.slice(1).split('/');if(['family','fitness'].includes(p[0])&&p[1]==='driving')return {group:'training',sub:'driving'};return {group:p[0],sub:p[1]};}
function setHash(h){location.hash=h;}

// Keep structured data synchronized with the currently displayed directory listings.
// Only publish fields present in the directory; do not invent ratings or hours.
function updateBusinessSchema(rows){
 const old=document.getElementById('business-directory-jsonld');
 if(old)old.remove();
 if(!rows.length)return;
 const graph=rows.map(b=>{
  const item={'@type':'LocalBusiness',name:b.name};
  if(b.address){
   const street=String(b.address).trim();
   item.address={'@type':'PostalAddress',streetAddress:street,addressLocality:b.town||(street.match(/\b(East Walpole|Walpole|Westwood|Foxborough|Dedham|Sharon|Canton)(?=,?\s+MA(?:\s+\d{5}(?:-\d{4})?)?$)/i)||[])[1]||'Norwood',addressRegion:'MA',addressCountry:'US'};
  }
  if(b.phone)item.telephone=b.phone;
  if(/^https?:\/\//i.test(b.website||''))item.url=b.website;
  if(b.category)item.description=b.category;
  return item;
 });
 const node=document.createElement('script');
 node.id='business-directory-jsonld';
 node.type='application/ld+json';
 node.textContent=JSON.stringify({'@context':'https://schema.org','@graph':graph});
 document.head.appendChild(node);
}

const pageSizes = [20, 50, 100];
let pageSize = pageSizes[0];
let visibleCount = pageSize;
const categoryToggle = $('#business-category-toggle');
const phoneLayout = window.matchMedia?.('(max-width: 720px)');
if (categoryToggle) {
 categoryToggle.hidden = false;
 categoryToggle.setAttribute('aria-expanded', 'false');
 categoryToggle.addEventListener('click', () => {
  categoryToggle.setAttribute('aria-expanded', String(categoryToggle.getAttribute('aria-expanded') !== 'true'));
 });
}

function renderListings(rows, emptyMessage) {
 const visibleRows = rows.slice(0, visibleCount);
 updateBusinessSchema(visibleRows);
 if (!rows.length) return '<p>' + esc(emptyMessage) + '</p>';
 const options = pageSizes.map(size => '<option' + (size === pageSize ? ' selected' : '') + '>' + size + '</option>').join('');
 const count = '<span role="status">Showing ' + visibleRows.length + ' of ' + rows.length + '</span>';
 const controls = '<div class="business-results-controls"><label>Listings at a time <select id="business-page-size">' + options + '</select></label>' + count + '</div>';
 const more = visibleRows.length < rows.length ? '<button id="business-show-more" class="resource-back" type="button">Show more listings</button>' : '';
 return controls + '<div class="resource-list">' + visibleRows.map(card).join('') + '</div>' + more;
}

function bindListingControls(root) {
 $('#business-page-size')?.addEventListener('change', event => {
  const size = Number(event.target.value);
  if (!pageSizes.includes(size)) return;
  pageSize = size;
  resetListings();
  $('#business-page-size')?.focus({preventScroll:true});
 });
 $('#business-show-more')?.addEventListener('click', () => {
  const previousCount = visibleCount;
  visibleCount += pageSize;
  render();
  const firstAdded = root.querySelectorAll('.business-item')[previousCount];
  if (firstAdded) {
   firstAdded.tabIndex = -1;
   firstAdded.focus();
  }
 });
}

function resetListings() {
 visibleCount = pageSize;
 render();
}

function suggestionLink(category) {
 const url = 'contact.html?topic=resource&business-category=' + encodeURIComponent(category) + '#contact';
 return '<a class="business-map-link" href="' + esc(url) + '">Suggest a business for this category</a>';
}

function render(focusResults = false) {
 const {group,sub}=parse(),g=Object.hasOwn(groups, group) ? groups[group] : null,root=$('#businessDirectory');
 const query = ($('#businessSearch')?.value || '').trim().toLowerCase();
 const categoryLinks = [...(document.querySelectorAll?.('#business-category-list a[href^="#"]') || [])];
 const activeLink = query ? null : categoryLinks.find(link => link.hash === location.hash) ||
  categoryLinks.find(link => link.hash === (g ? '#' + group : ''));
 for (const link of categoryLinks) {
  if (link === activeLink) link.setAttribute('aria-current', 'true');
  else link.removeAttribute('aria-current');
 }
 if (query || !g) {
  const terms = query ? query.split(/\s+/) : [];
  const rows = businesses.filter(b => terms.every(term => (text(b) + ' ' + (b.address || '')).toLowerCase().includes(term))).sort((a,b) => a.name.localeCompare(b.name));
  const heading = query ? 'Search results' : 'All businesses';
  root.innerHTML = '<section class="topic-section selected-resource-topic"><h2>' + heading + '</h2>' +
   renderListings(rows, 'No businesses match this search.') + '</section>';
 } else {
  const broad=businesses.filter(b=>b.taxonomy.some(x=>x.group===group)).sort((a,b)=>a.name.localeCompare(b.name));
  const selected = sub ? g.subs.find(item => item[0] === sub) : null;
  if (sub && !selected) {setHash(group);return;}
  const rows = selected ? broad.filter(b=>b.taxonomy.some(x=>x.group===group&&x.subs.includes(sub))) : broad;
  const label = selected ? selected[1] : g.label;
  const groupMapUrl = group === 'food' ? 'map.html?category=food' : 'map.html?businessGroup=' + encodeURIComponent(group);
  const mapUrl = selected ? groupMapUrl + '&businessSub=' + encodeURIComponent(sub) : groupMapUrl;
  const tiles = selected ? '' : g.subs.map(([id,name]) => {
   const count = broad.filter(b=>b.taxonomy.some(x=>x.group===group&&x.subs.includes(id))).length;
   return count ? '<a href="#'+group+'/'+id+'"><b>'+esc(name)+'</b><small>'+count+' '+(count===1?'business':'businesses')+'</small></a>' : '';
  }).join('');
  const subcategories = tiles ? '<h3 class="business-filter-heading">Narrow this category</h3><div class="resource-help-grid business-subcategory-grid">'+tiles+'</div>' : '';
  root.innerHTML = '<section class="topic-section selected-resource-topic"><button class="resource-back" type="button">← '+
   esc(selected ? g.label : 'All businesses')+'</button><h2>'+esc(label)+'</h2><p class="sub"><a class="business-map-link" href="'+
   esc(mapUrl)+'">View these businesses on map</a> · '+suggestionLink(label)+'</p>'+subcategories+
   renderListings(rows, 'No businesses found in this category yet.')+'</section>';
  $('.resource-back:not(#business-category-toggle)')?.addEventListener('click', () => {setHash(sub ? group : '');});
 }
 bindListingControls(root);
 if (focusResults && phoneLayout?.matches) requestAnimationFrame(() => {
  const heading = root.querySelector('h2');
  if (heading) {
   heading.tabIndex = -1;
   heading.focus({preventScroll:true});
  }
  root.scrollIntoView({behavior:'smooth',block:'start'});
 });
}
const search = $('#businessSearch');
if (search) {
 search.value = new URLSearchParams(location.search).get('q') || '';
 search.addEventListener('input', resetListings);
}
function openCategory() {
 if (search) search.value = '';
 visibleCount = pageSize;
 categoryToggle?.setAttribute('aria-expanded', 'false');
 render(true);
}
$('#business-category-list')?.addEventListener('click', event => {
 const link = event.target.closest('a[href^="#"]');
 if (!link || link.hash !== location.hash || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
 event.preventDefault();
 openCategory();
});
window.addEventListener('hashchange', openCategory);
render();if($('#businessCount'))$('#businessCount').textContent=businesses.length+' local business listings.';
fetch('data/sponsors.json',{cache:'no-store'})
 .then(response=>response.ok?response.json():Promise.reject(new Error('Sponsor registry unavailable')))
 .then(data=>{
  activeSponsorNames=new Set((Array.isArray(data.sponsors)?data.sponsors:[])
   .filter(item=>item && item.active===true && item.id!=='advertise' && item.name)
   .map(item=>nameKey(item.name)));
  render();
 }).catch(()=>{/* Registry unavailable: do not display unverified sponsorship status. */});

})();