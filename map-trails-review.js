(()=>{
'use strict';
const NORWOOD_BOUNDS=L.latLngBounds([[42.1515,-71.2355],[42.2265,-71.1505]]);
const map=L.map('prototypeMap',{scrollWheelZoom:false}).fitBounds(NORWOOD_BOUNDS,{padding:[8,8]});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
/* Aerial imagery is useful for aligning fixed landmarks independently of street-map cartography. */
const aerial=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Imagery © Esri and providers'});
const aerialToggle=L.control({position:'topright'});
aerialToggle.onAdd=()=>{const el=L.DomUtil.create('div','leaflet-bar');el.style.cssText='background:white;padding:7px 9px;font:13px sans-serif';const label=document.createElement('label');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.addEventListener('change',()=>checkbox.checked?aerial.addTo(map):map.removeLayer(aerial));label.append(checkbox,document.createTextNode(' Satellite imagery'));el.append(label);L.DomEvent.disableClickPropagation(el);return el};aerialToggle.addTo(map);
const cluster=L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:48,spiderfyOnMaxZoom:true});
map.addLayer(cluster);
const list=document.querySelector('#placeList'),count=document.querySelector('#placeCount'),status=document.querySelector('#mapStatus'),search=document.querySelector('#mapSearch'),category=document.querySelector('#mapCategory'),searchHelp=document.querySelector('#mapSearchHelp');
let filter=category?.value??'',userMarker=null,renderToken=0;
const params=new URLSearchParams(location.search),requestedPlace=params.get('place')||'',requestedBusiness=params.get('business')||'',requestedBusinessGroup=params.get('businessGroup')||'',requestedBusinessSub=params.get('businessSub')||'',requestedCategory=params.get('category')||'';
if(requestedCategory&&category&&[...category.options].some(o=>o.value===requestedCategory)){filter=requestedCategory;category.value=requestedCategory;}
if((requestedBusinessGroup||requestedBusinessSub)&&category){filter='business';category.value='business';if(search)search.value='';}
else if(requestedBusiness&&search){search.value=requestedBusiness;filter='business';if(category)category.value='business';}
else if(requestedPlace&&search){search.value=requestedPlace;filter='all';if(category)category.value='all';}
// On ordinary page loads, force Show All even if the browser restores an old select value.
// Explicit deep-link categories, business searches and place searches take precedence.
if(!requestedCategory&&!requestedBusinessGroup&&!requestedBusinessSub&&!requestedBusiness&&!requestedPlace&&category){filter='';category.value='';}
const boundaryLayers={town:null,precincts:null};
const geocodeCache=JSON.parse(localStorage.getItem('norwood-map-geocode-v2')||'{}');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const today=new Date().toISOString().slice(0,10);
const venueAddresses={
 'morrill memorial library':'33 Walpole St, Norwood, MA 02062',
 'norwood civic center':'165 Nahatan St, Norwood, MA 02062',
 'norwood town common':'Washington St at Nahatan St, Norwood, MA 02062',
 'town common':'Washington St at Nahatan St, Norwood, MA 02062',
 'norwood high school':'245 Nichols St, Norwood, MA 02062',
 'coakley middle school':'1315 Washington St, Norwood, MA 02062',
 'norwood food pantry':'150 Chapel St, Norwood, MA 02062',
 'norwood theatre':'109 Central St, Norwood, MA 02062'
};
const staticPlaces=[
 {name:'Little Library / Book Box — 69 Longwood Terrace',category:'little-library',also:['resource'],address:'69 Longwood Terrace, Norwood, MA 02062',details:'Neighborhood book-sharing box',url:'resources.html'},
 {name:'Little Library / Book Box — 44 Blossom St',category:'little-library',also:['resource'],address:'44 Blossom St, Norwood, MA 02062',details:'Neighborhood book-sharing box',url:'resources.html'},
 {name:'Little Library / Book Box — 19 Crestwood Cir',category:'little-library',also:['resource'],address:'19 Crestwood Cir, Norwood, MA 02062',details:'Neighborhood book-sharing box',url:'resources.html'},
 {name:'Little Library / Book Box — 28 Wilson St',category:'little-library',also:['resource'],address:'28 Wilson St, Norwood, MA 02062',details:'Neighborhood book-sharing box',url:'resources.html'},
 {name:'Little Library / Book Box — 12 Westview Dr',category:'little-library',also:['resource'],address:'12 Westview Dr, Norwood, MA 02062',details:'Neighborhood book-sharing box',url:'resources.html'},
 {name:'Little Library / Book Box — 68 Elm St',category:'little-library',also:['resource'],address:'68 Elm St, Norwood, MA 02062',details:'Neighborhood book-sharing box',url:'resources.html'},
 {name:'Little Library / Book Box — 310 Railroad Ave',category:'little-library',also:['resource'],address:'310 Railroad Ave, Norwood, MA 02062',details:'Neighborhood book-sharing box',url:'resources.html'},
 {name:'Little Library / Book Box — 22 Shaw St',category:'little-library',also:['resource'],address:'22 Shaw St, Norwood, MA 02062',details:'Neighborhood book-sharing box',url:'resources.html'},
 {name:'Little Library / Book Box — 80 Highland St',category:'little-library',also:['resource'],address:'80 Highland St, Norwood, MA 02062',details:'Neighborhood book-sharing box',url:'resources.html'},
 {name:'Little Library / Book Box — Meadow St & Azalea Dr',category:'little-library',also:['resource'],address:'Meadow St at Azalea Dr, Norwood, MA 02062',details:'Neighborhood book-sharing box',url:'resources.html'},
 {name:'Little Library / Book Box — East Cross & First',category:'little-library',also:['resource'],address:'East Cross St at First St, Norwood, MA 02062',details:'Neighborhood book-sharing box',url:'resources.html'},
 {name:'Little Library / Book Box — Callahan School',category:'little-library',also:['resource'],address:'116 Garfield Ave, Norwood, MA 02062',details:'Neighborhood book-sharing box',url:'resources.html'},
 {name:'Little Library / Book Box — Washington Street',category:'little-library',also:['resource'],address:'169 Washington St, Norwood, MA 02062',details:'Neighborhood book-sharing box',url:'resources.html'},
 {name:'Little Library / Book Box — Roosevelt Avenue',category:'little-library',also:['resource'],address:'82 Roosevelt Ave, Norwood, MA 02062',details:'Neighborhood book-sharing box',url:'resources.html'},
 {name:'Little Library / Book Box — Belnap & Cranmore',category:'little-library',also:['resource'],address:'Belnap St at Cranmore Rd, Norwood, MA 02062',details:'Neighborhood book-sharing box',url:'resources.html'},
 {name:'Little Library / Book Box — Father McAleer Playground',category:'little-library',also:['resource'],address:'Father McAleer Playground, Norwood, MA 02062',details:'Neighborhood book-sharing box',url:'resources.html'},
 {name:'Little Library / Book Box — Savage Center / Senior Center property',category:'little-library',also:['resource'],address:'275 Prospect St, Norwood, MA 02062',details:'Neighborhood book-sharing box · exact location on the property to be confirmed',url:'resources.html'},
 {name:'Little Library / Book Box — Dean & Pellana',category:'little-library',also:['resource'],address:'Dean St at Pellana Rd, Norwood, MA 02062',details:'Neighborhood book-sharing box',url:'resources.html'},
 {name:'Norwood Town Common',category:'civic',address:'Washington St at Nahatan St, Norwood, MA 02062',lat:42.19455,lng:-71.19955,details:'Town green · gazebo · community events',url:'parks-trails.html'},
 {name:'Bernie Cooper Park',category:'park',address:'Bernie Cooper Park, Norwood, MA 02062',details:'Neponset River · accessible riverfront walking',url:'parks-trails.html'},
 {name:'Endean Park & Hawes Brook',category:'park',address:'Endean Conservation Land, Norwood, MA 02062',details:'Wooded trails · pond · brook · conservation land',url:'parks-trails.html'},
 {name:'Ellis Pond & Alevizos Park',category:'park',address:'Ellis Pond, Norwood, MA 02062',details:'Pond · fishing · boating · passive recreation · trail',url:'parks-trails.html'},
 {name:'Germany Brook',category:'park',address:'Germany Brook, Norwood, MA 02062',details:'Woodland conservation trail',url:'parks-trails.html'},
 {name:'Hennessey Field & Murphy Park',category:'park',address:'Murphy Park, Pleasant St, Norwood, MA 02062',details:'Neighborhood woods · walking connection',url:'parks-trails.html'},
 {name:'Meadow Street Conservation Land',category:'park',address:'Meadow St, Norwood, MA 02062',details:'Conservation land · walking route',url:'parks-trails.html'},
 {name:'Shattuck Park',category:'park',address:'Shattuck Park, Norwood, MA 02062',details:'Wooded walking trails',url:'parks-trails.html'},
 {name:'Vanderbilt / Pine Tree Forest',category:'park',address:'Vanderbilt Ave, Norwood, MA 02062',details:'Trail loops · mapped 5K route',url:'parks-trails.html'},
 {name:'Willett / Tiot Trail',category:'park',address:'100 Westover Pkwy, Norwood, MA 02062',details:'School-area trail connection · preliminary Tiot Trail',url:'parks-trails.html'},
 {name:'Ledgeview Drive',category:'park',address:'Ledgeview Dr, Norwood, MA 02062',details:'Preliminary trail route',url:'parks-trails.html'},
 {name:'Senior Center walking route',category:'park',address:'275 Prospect St, Norwood, MA 02062',details:'Mapped neighborhood walking loop',url:'parks-trails.html'},
 {name:'Old Parish Cemetery',category:'historic',address:'Washington St near Town Hall, Norwood, MA 02062',details:'Established 1741 · early South Dedham/Norwood burial ground · historic gravestones',url:'https://norwoodhistoricalsociety.org/happy-birthday-norwood-massachusetts/'},
 {name:'F. Holland Day House / Norwood Historical Society',category:'historic',address:'93 Day St, Norwood, MA 02062',details:'1859 house · remodeled 1890–1893 · home of photographer and publisher F. Holland Day · National Register site',url:'https://norwoodhistoricalsociety.org/93-day-street-f-holland-day-house/'},
 {name:'Oakview Mansion',category:'historic',address:'289 Walpole St, Norwood, MA 02062',details:'1868 Second Empire mansion · F.O. Winslow and Governor Frank Allen associations',url:'https://norwoodhistoricalsociety.org/oakview-mansion/'},
 {name:'Little Red Brick Schoolhouse',category:'historic',address:'93 Day St, Norwood, MA 02062',details:'Former Schoolhouse No. 7 · moved and reconstructed on the historical society grounds',url:'https://norwoodhistoricalsociety.org/a-brief-history-of-norwood-massachusetts/'},
 {name:'St. Gabriel the Archangel Chapel',category:'historic',address:'320 Winter St, Norwood, MA 02062',details:'Historic 1903 mortuary chapel in Highland Cemetery',url:'https://norwoodhistoricalsociety.org/this-day-in-norwood-history-may-29-1903-highst-gabriels-chapel/'},
 {name:'Historic Day Street',category:'historic',address:'Day St, Norwood, MA 02062',details:'Historic residential corridor with architecturally significant 19th- and early-20th-century homes',url:'https://norwoodhistoricalsociety.org/day-street/'},
 {name:'Norwood Memorial Municipal Building / Town Hall',category:'civic',also:['historic'],address:'566 Washington St, Norwood, MA 02062',details:'Historic municipal building · carillon tower · Town Hall offices',url:'https://www.norwoodma.gov/'},
 {name:'Norwood Public Safety Building',category:'civic',address:'135–137 Nahatan St, Norwood, MA 02062',details:'Police Department · Fire Department · public safety services',url:'https://www.norwoodma.gov/'},
 {name:'Norwood Civic Center',category:'civic',address:'165 Nahatan St, Norwood, MA 02062',lat:42.19443,lng:-71.19893,details:'Recreation Department · gym · programs · community activities',url:'sports-recreation.html'},
 {name:'Norwood Senior Center',category:'civic',address:'275 Prospect St, Norwood, MA 02062',details:'Council on Aging · senior programs · transportation and support services',url:'resources.html'},
 {name:'Norwood Public Schools Administration',category:'civic',address:'275 Prospect St, Norwood, MA 02062',details:'School district administration offices',url:'https://www.norwood.k12.ma.us/'},
 {name:'Norwood Department of Public Works / Engineering',category:'civic',address:'1 Lyman Pl, Norwood, MA 02062',details:'Public Works · engineering · roads · water · sewer · trash and recycling',url:'https://www.norwoodma.gov/departments/public_works/index.php'},
 {name:'Norwood Light & Broadband',category:'civic',address:'136 Access Rd, Norwood, MA 02062',details:'Municipal electric utility · broadband · billing and customer service',url:'https://norwoodlight.com/'},
 {name:'Norwood Housing Authority — Administration',category:'civic',address:'40 William Shyne Cir, Norwood, MA 02062',details:'Municipal housing authority administrative offices',url:'https://www.norwoodha.org/'},
 {name:'Highland Cemetery / Cemetery Department',category:'civic',also:['historic'],address:'320 Winter St, Norwood, MA 02062',details:'Historic town cemetery · cemetery office · St. Gabriel’s Chapel',url:'https://www.norwoodma.gov/'},
 {name:'Norwood High School',category:'school',publicSchool:true,also:['civic'],address:'245 Nichols St, Norwood, MA 02062',lat:42.19917,lng:-71.20972,details:'Athletic fields · tennis courts · track',url:'https://www.norwood.k12.ma.us/nhs'},
 {name:'FINE Mortuary College',category:'school',address:'150 Kerry Pl, Norwood, MA 02062',details:'Postsecondary funeral-service education · Associate in Applied Science · distance and part-time options',url:'https://fmc.edu/'},
 {name:'Saint Catherine of Siena School',category:'school',address:'249 Nahatan St, Norwood, MA 02062',details:'Private Catholic school · preschool through grade 8',url:'https://www.scsnorwood.org/'},
 {name:'Norwood Montessori School',category:'school',address:'462 Walpole St, Norwood, MA 02062',details:'Private Montessori school · toddler through secondary/high school programs',url:'https://www.norwoodmontessorischool.com/'},
 {name:'Blue Hills Regional Technical School',category:'school',address:'800 Randolph St, Canton, MA 02021',details:'Regional vocational-technical high school serving Norwood and neighboring towns',url:'https://www.bluehills.org/'},
 {name:'Norfolk County Agricultural High School',category:'school',address:'400 Main St, Walpole, MA 02081',details:'Public vocational agricultural high school · career and technical education',url:'https://www.norfolkaggie.org/'},
 {name:'Xaverian Brothers High School',category:'school',address:'800 Clapboardtree St, Westwood, MA 02090',details:'Private Catholic college-preparatory school for boys · grades 7–12',url:'https://www.xbhs.com/'},
 {name:'Tri-County Regional Vocational Technical High School',category:'school',address:'147 Pond St, Franklin, MA 02038',details:'Regional vocational-technical high school · career programs and adult/postsecondary education',url:'https://www.tri-county.us/'},
 {name:'Coakley Middle School / Ivatts',category:'school',publicSchool:true,also:['civic'],address:'1315 Washington St, Norwood, MA 02062',lat:42.17445,lng:-71.20085,details:'Tennis · baseball · softball · rectangular fields · school recreation facilities',url:'https://www.norwood.k12.ma.us/cms'},
 {name:'Balch Elementary School',category:'school',publicSchool:true,also:['civic'],address:'1170 Washington St, Norwood, MA 02062',details:'Playground · outdoor play areas · adjoining athletic fields',url:'https://www.norwood.k12.ma.us/balch'},
 {name:'Callahan Elementary School',category:'school',publicSchool:true,also:['civic'],address:'116 Garfield Ave, Norwood, MA 02062',details:'Playground · outdoor recreation · athletic field',url:'https://www.norwood.k12.ma.us/callahan'},
 {name:'Cleveland Elementary School',category:'school',publicSchool:true,also:['civic'],address:'33 George Willett Pkwy, Norwood, MA 02062',details:'Playground · outdoor recreation · Jean Brown Field and back field',url:'https://www.norwood.k12.ma.us/cleveland'},
 {name:'Oldham Elementary School',category:'school',publicSchool:true,also:['civic'],address:'165 Prospect St, Norwood, MA 02062',details:'Playground · outdoor recreation · Little League and rectangular fields',url:'https://www.norwood.k12.ma.us/oldham/'},
 {name:'Prescott Elementary School',category:'school',publicSchool:true,also:['civic'],address:'66 Richland Rd, Norwood, MA 02062',details:'Playground · basketball · Little League baseball · softball field',url:'https://www.norwood.k12.ma.us/prescott'},
 {name:'Willett Elementary School',category:'school',publicSchool:true,also:['civic'],address:'100 Westover Pkwy, Norwood, MA 02062',details:'Playground · baseball field · outdoor recreation area',url:'https://www.norwood.k12.ma.us/willett/index'},
 {name:'Norwood High School Athletic Complex',category:'athletic',address:'245 Nichols St, Norwood, MA 02062',details:'Athletic fields · tennis courts · track',url:'parks-trails.html#tennis-courts'},
 {name:'Coakley / Ivatts Athletic Complex',category:'athletic',address:'1315 Washington St, Norwood, MA 02062',details:'Tennis · baseball · softball · rectangular fields · walking/cross-country route · disc golf',url:'parks-trails.html'},
 {name:'Balch Fields & Playground',category:'athletic',address:'1170 Washington St, Norwood, MA 02062',details:'Playground · baseball · softball · basketball',url:'parks-trails.html'},
 {name:'Callahan Fields & Playground',category:'athletic',address:'116 Garfield Ave, Norwood, MA 02062',details:'Playground · rectangular athletic field · basketball',url:'parks-trails.html'},
 {name:'Cleveland Fields & Playground',category:'athletic',address:'33 George Willett Pkwy, Norwood, MA 02062',details:'Playground · Jean Brown Field · back field · basketball',url:'parks-trails.html'},
 {name:'Oldham Fields & Playground',category:'athletic',address:'165 Prospect St, Norwood, MA 02062',details:'Playground · Little League baseball · rectangular field',url:'parks-trails.html'},
 {name:'Prescott Fields & Playground',category:'athletic',address:'66 Richland Rd, Norwood, MA 02062',details:'Playground · basketball · Little League baseball · softball',url:'parks-trails.html'},
 {name:'Willett Field & Playground',category:'athletic',address:'100 Westover Pkwy, Norwood, MA 02062',details:'Playground · baseball field · outdoor recreation area',url:'parks-trails.html'},
 {name:'Hawes Recreation Area',category:'athletic',also:['park'],address:'1305 Washington St, Norwood, MA 02062',details:'Pool · spray park · playground · tennis · fishing · trails',url:'parks-trails.html'},
 {name:'Father Mac’s / Father McAleer Recreation Area',category:'athletic',also:['park'],address:'295 Vernon St, Norwood, MA 02062',details:'Pool · playground · Little League baseball · soccer',url:'parks-trails.html'},
 {name:'Doherty Park / Doherty Field',category:'athletic',also:['park'],address:'Brewster Dr, Norwood, MA 02062',details:'Playground · Little League baseball',url:'parks-trails.html'},
 {name:'Ellis Playground & Fields',category:'athletic',also:['park'],address:'Ellis Playground, Codman Road, Norwood, MA 02062',details:'Playground · baseball · softball · soccer · pond access',url:'parks-trails.html'},
 {name:'Murphy Park & Playground',category:'athletic',also:['park'],address:'Pleasant St at Lenox St, Norwood, MA 02062',details:'Playground · Little League baseball · basketball · walking connection',url:'parks-trails.html'},
 {name:'Morrill Memorial Library',category:'culture',also:['civic','historic'],address:'33 Walpole St, Norwood, MA 02062',lat:42.19107,lng:-71.20408,details:'Library · events · museum passes · Library of Things · study spaces',url:'resources.html'},
 {name:'The Norwood Theatre',category:'culture',also:['historic'],address:'109 Central St, Norwood, MA 02062',lat:42.19386,lng:-71.19976,details:'Restored 1927 theatre · live music · theatre · comedy · films',url:'things.html'},
 {name:'First Congregational Church — Blessings Box',category:'mini-food-pantry',also:['resource'],address:'100 Winter St, Norwood, MA 02062',details:'Little food pantry · shelf-stable meal kits · no registration required',url:'resources.html'},
 {name:'Little Free Food Pantry — Railroad Avenue',category:'mini-food-pantry',also:['resource'],address:'280 Railroad Ave, Norwood, MA 02062',details:'Little food pantry · outdoor pickup available at any time · no eligibility requirement',url:'resources.html'},
 {name:'Norwood Food Pantry',category:'resource',address:'150 Chapel St, Norwood, MA 02062',lat:42.18262,lng:-71.21230,details:'Food assistance · Saturday pantry hours',url:'resources.html'},
 {name:'Norwood Central',category:'transit',address:'164 Broadway, Norwood, MA 02062',lat:42.18873,lng:-71.19991,details:'MBTA Franklin/Foxboro Line',url:'transit.html'},
 {name:'Norwood Depot',category:'transit',address:'Railroad Ave, Norwood, MA 02062',lat:42.19675,lng:-71.19665,details:'MBTA Franklin/Foxboro Line',url:'transit.html'},
 {name:'Windsor Gardens',category:'transit',address:'Engamore Ln at Buckminster Dr, Norwood, MA 02062',lat:42.17189,lng:-71.21973,details:'MBTA Franklin/Foxboro Line',url:'transit.html'},
 {name:'Norwood Memorial Airport',category:'landmark',also:['civic','historic'],address:'111 Access Rd, Norwood, MA 02062',lat:42.19052,lng:-71.17293,details:'Public-use municipal airport · playground · aviation businesses',url:'things.html'},
 {name:'Town Hall Public Parking',category:'parking',address:'566 Washington St, Norwood, MA 02062',details:'Public municipal parking serving Town Hall and the town-center area',url:'https://www.norwoodma.gov/'},
 {name:'Senior Center Public Parking',category:'parking',address:'275 Prospect St, Norwood, MA 02062',details:'Public municipal parking at the Senior Center / municipal complex',url:'https://www.norwoodma.gov/'},
 {name:'Talbot / Babel’s Municipal Lot',category:'parking',address:'Talbot Ave, Norwood, MA 02062',details:'Downtown municipal public parking lot',url:'https://www.norwoodma.gov/'},
 {name:'Central Street / Day Street Municipal Lot',category:'parking',address:'Central St at Day St, Norwood, MA 02062',details:'Downtown municipal public parking lot',url:'https://www.norwoodma.gov/'},
 {name:'Nahatan Street / Broadway Municipal Lot',category:'parking',address:'Nahatan St at Broadway, Norwood, MA 02062',details:'Downtown municipal public parking lot',url:'https://www.norwoodma.gov/'},
 {name:'Post Office Municipal Lot',category:'parking',address:'Washington St near Norwood Post Office, Norwood, MA 02062',details:'Municipal public parking in the Norwood Center area',url:'https://www.norwoodma.gov/'},
 {name:'Norwood Gulf',category:'gas',also:['business'],address:'707 Neponset Street, Norwood, MA 02062',details:'Gas station · fuel',url:'gas-prices.html'},
 {name:'Gulf — Broadway',category:'gas',also:['business'],address:'145 Broadway, Norwood, MA 02062',details:'Gas station · fuel',url:'gas-prices.html'},
 {name:"Mr. Frank's Food Mart",category:'gas',also:['business'],address:'917 Washington Street, Norwood, MA 02062',details:'Gas station · convenience',url:'gas-prices.html'},
 {name:'Sunoco — Route 1',category:'gas',also:['business'],address:'515 Providence Highway, Norwood, MA 02062',details:'Gas station · fuel',url:'gas-prices.html'},
 {name:'Route 1 Auto Services',category:'gas',also:['business'],address:'305 Boston-Providence Turnpike, Norwood, MA 02062',details:'Gas station · auto services',url:'gas-prices.html'},
 {name:'Mobil — Route 1',category:'gas',also:['business'],address:'971 Providence Highway, Norwood, MA 02062',details:'Gas station · convenience',url:'gas-prices.html'},
 {name:'Irving Oil / Rojo',category:'gas',also:['business'],address:'69 Providence Highway, Norwood, MA 02062',details:'Gas station · fuel',url:'gas-prices.html'},
 {name:"BJ's Gas Station",category:'gas',also:['business'],address:'1415 Boston-Providence Turnpike, Norwood, MA 02062',details:'Gas station · membership fuel',url:'gas-prices.html'},
 {name:'CITGO',category:'gas',also:['business'],address:'960 Boston Providence Highway, Norwood, MA 02062',details:'Gas station · fuel',url:'gas-prices.html'},
 {name:'Shell — Walpole Street',category:'gas',also:['business'],address:'491 Walpole Street, Norwood, MA 02062',details:'Gas station · convenience',url:'gas-prices.html'},
 {name:'Mobil / On the Run — Norwood Center',category:'gas',also:['business'],address:'499 Washington Street, Norwood, MA 02062',details:'Gas station · convenience',url:'gas-prices.html'},
 {name:'Shell — Pleasant Street',category:'gas',also:['business'],address:'238 Pleasant Street, Norwood, MA 02062',details:'Gas station · convenience',url:'gas-prices.html'}
];
function resourceCategory(r){
 const t=norm([r.category,r.tags,(r.topics||[]).join(' ')].join(' '));
 // Legal and immigration providers are community resources, even when their
 // metadata also mentions family education or school-related guidance.
 if(/immigration|immigrant|refugee|asylum|attorney|lawyer|legal|uscis|deportation|detention/.test(t))return'resource';
 if(/health|medical|mental health|physical therapy|disability|senior|older/.test(t))return'health';
 if(/town government|town services|town &|police|fire|veteran|board|commission|clerk|assessor|building department/.test(t))return'civic';
 if(/library|history|museum|arts|music|theatre/.test(t))return'culture';
 if(/school|youth sports|education/.test(t))return'school';
 return'resource';
}
function cleanAddress(a){
 a=String(a||'').trim();
 if(!a||/^norwood,? ma( 02062)?$/i.test(a))return'';
 if(!/(,\s*(?:norwood|westwood|walpole|dedham|canton|sharon|foxborough|boston|needham|medfield|dover|millis|medway|massachusetts|ma)\b)/i.test(a))a+=', Norwood, MA 02062';
 return a;
}
const dynamic=[];
(window.NORWOOD_RESTAURANTS||[]).forEach(r=>{const a=cleanAddress(r.address);if(a)dynamic.push({name:r.name,category:'food',address:a,details:r.cuisine||r.category||'Restaurant',url:r.url||'restaurants.html'});});
(window.NORWOOD_BUSINESSES||[]).forEach(b=>{const a=cleanAddress(b.address);if(!a)return;const gasAddress=staticPlaces.some(p=>p.category==='gas'&&norm(p.address)===norm(a));if(gasAddress)return;dynamic.push({name:b.name,category:'business',businessText:norm([b.category,b.labels,b.tags].flat().filter(Boolean).join(' ')),businessTaxonomy:(window.NORWOOD_BUSINESS_TAXONOMY||{})[String(b.name||'').toLowerCase()]||[],address:a,details:(b.labels||b.tags||[b.category]).filter(Boolean).join(' · ')||'Local business',url:b.website||'businesses.html'});});
(window.NORWOOD_RESOURCES||[]).forEach(r=>{const a=cleanAddress(r.address);if(a)dynamic.push({name:r.name,category:resourceCategory(r),address:a,details:r.description||r.category||'Community resource',url:r.url||'resources.html'});});
(window.NORWOOD_EVENTS||[]).forEach(e=>{
 if(e.publish_candidate===false)return;
 const end=e.end?.date||e.start?.date||''; if(end&&end<today)return;
 let a=cleanAddress(e.address);
 if(!a&&e.venue)a=venueAddresses[norm(e.venue)]||'';
 if(a)dynamic.push({name:e.title,category:'event',address:a,details:[e.start?.date,e.start?.time,e.venue,e.cost].filter(Boolean).join(' · '),url:e.registration_url||e.source_url||'events.html'});
});
const seen=new Set(),places=[...staticPlaces,...dynamic].filter(p=>{const k=norm(p.name)+'|'+norm(p.address);if(seen.has(k))return false;seen.add(k);return true});
// A page may deep-link a named park/facility before it has a dedicated static map record.
// Keep that interface functional by geocoding the named Norwood place instead of returning an empty map.
if(requestedPlace&&!places.some(p=>norm(p.name)===norm(requestedPlace))){
 places.push({name:requestedPlace,category:'park',address:requestedPlace+', Norwood, MA 02062',details:'Norwood park, trail or recreation facility',url:'parks-trails.html'});
}
function publicSchoolMark(p){return p.publicSchool?'<img src="https://upload.wikimedia.org/wikipedia/commons/5/5f/Seal_of_Norwood%2C_Massachusetts.png" alt="Official Norwood Public Schools" title="Norwood Public Schools" style="width:14px;height:14px;object-fit:contain;vertical-align:-2px;margin-left:5px">':''}
function popup(p){return '<div class="map-popup"><h3>'+esc(p.name)+publicSchoolMark(p)+'</h3><p>'+esc(p.address)+'</p><p>'+esc(p.details||'')+'</p><p><a href="'+esc(p.url||'#')+'"'+(/^https?:/i.test(p.url||'')?' target="_blank" rel="noopener"':'')+'>Open details →</a></p></div>'}

const businessTaxonomy={
 automotive:{b:/auto|automotive|car wash|vehicle|towing|roadside|collision|tire|truck repair/i,s:{sales:/dealer|sales/i,repair:/repair|mechanic/i,collision:/collision|auto body|detail/i,tires:/tire/i,inspection:/inspection|car wash/i,towing:/towing|roadside/i,rental:/(car|van|truck).*rental|rental.*(car|van|truck)/i}},
 home:{b:/hvac|plumb|heating|electric|contractor|home improvement|home repair|house cleaning|painting|remodel|garage door|roof|landscap|tree service|pest|pool service|masonry|chimney|gutter|flooring|fence|interior design|hardscap|cabinet|fireplace|glass|mirror|window repair|drywall|plaster|stucco|tile|marble|excavation|paving|restoration/i,s:{'emergency-restoration':/water.*restoration|fire.*restoration|mold.*restoration|restoration.*construction/i,hvac:/hvac|heating|refrigeration/i,plumbing:/plumb/i,electrical:/electric/i,roofing:/roof|siding/i,masonry:/masonry|chimney|hardscap/i,gutters:/gutter/i,'garage-doors':/garage door/i,painting:/painting|painter/i,flooring:/flooring/i,tile:/tile|marble/i,drywall:/drywall|plaster|stucco/i,glass:/glass|mirror|window repair/i,excavation:/excavation|site work|paving/i,contractors:/contractor|remodel|home improvement|home repair|construction/i,cleaning:/house cleaning|residential.*cleaning/i,landscape:/landscap|tree service|garden design/i,pest:/pest/i,interior:/interior design|home staging/i,cabinets:/cabinet|custom woodwork/i,fireplaces:/fireplace|grill|outdoor living/i}},
 health:{b:/dental|orthodont|oral surgery|endodont|physical therapy|rehabilitation|optometr|eye care|ophthalm|eyewear|audiology|hearing|chiropractic|acupuncture|pharmac|medical|physician|neurolog|psychiatr|mental health|counsel|urgent care|primary care|internal medicine|orthopedic|occupational health|wellness|massage/i},
 pets:{b:/pet|veterinar|animal hospital|groom|dog walk|pet sit|pet board|dog train/i,s:{veterinary:/veterinar|animal hospital/i,grooming:/groom/i,walking:/dog walk|pet sit/i,boarding:/pet board|dog daycare|dog train|pet daycare/i}},
 professional:{b:/attorney|legal|account|tax|bookkeep|bank|financial|insurance|notary|real estate|mortgage|appraisal|valuation|mediation|benefit consulting/i},
 personal:{b:/barber|salon|beauty|spa|massage|personal care|tailor|alteration|dry clean|laundry|nail|lash|wax|skin care|aesthetic/i},
 fitness:{b:/fitness|personal training|martial arts|gymnast|swim|cheer|tumbling|music school|music.*lesson|dance school|dance.*lesson|yoga|barre|sports training|weightlifting|tutoring|education/i},
 creative:{b:/artist|creative|photograph|design|gallery|glassblow|media|music|event|wedding|party|function hall|ballroom|conference.*venue|craft|maker|makerspace|workshop|audio production|film production|video production/i,s:{venues:/party.*venue|event venue|function hall|ballroom|conference.*venue|wedding.*venue/i,'kids-parties':/kids party|birthday part|children.*part|indoor play|family entertainment|arcade|mini golf/i,'event-services':/event service|catering|DJ|entertainment|event planning/i,artists:/artist|art studio|creative studio/i,photography:/photograph/i,design:/design|graphic/i,media:/media|audio production|film production|video production/i,makers:/maker|makerspace|craft|glassblow|workshop/i}},
 lodging:{b:/hotel|lodging|marriott|sheraton|hampton inn|residence inn|holiday inn/i},
 family:{b:/childcare|preschool|driving school|indoor play|children.*party|family entertainment/i},
 housing:{b:/apartment|rental housing|assisted living|memory care|home care|senior services|adult day/i},
 shopping:{b:/grocer|supermarket|produce|warehouse club|international grocer|garden center|nurser|florist|books|shopping|plants|gifts|bicycles|specialty retail|antiques|vintage|jewelry|collectibles|clothing|apparel|sporting goods|department store|beauty supply|musical instrument|home decor|candy|chocolate|convenience store|thrift|wine.*spirit|liquor/i},
 'business-services':{b:/printing|shipping|office|computer|technology|telecom|digital marketing|aviation|flight|aircraft|industrial|building materials|sign|manufactur|fabrication|testing|engineering|architecture|automation|aerospace|composite|electronics|sensor|thermal|machinery|equipment|biotechnology|pharmaceutical|collection services|business services|business consulting|semiconductor|materials testing|distribution|logistics|wholesale|corporate|scientific|environmental|marketing|commercial space|office space|food distribution/i},
 other:{b:/self storage|moving|funeral|cremation|monument|memorial|headstone|grave marker|cemetery lettering|bronze plaque|florist|sympathy flower|funeral flower|locksmith|security|taxi|shuttle|transportation|truck rental|gas station|cleanout|junk removal/i,s:{gas:/gas station/i,storage:/self storage|storage & moving|moving/i,funeral:/funeral|cremation|monument|memorial|headstone|grave marker|cemetery lettering|bronze plaque|engraving|florist|sympathy flower|funeral flower/i,security:/locksmith|security/i,junk:/junk removal|cleanout/i,transportation:/taxi|shuttle|transportation|truck rental/i}}
};
function businessTaxonomyMatch(p){if(p.category!=='business'||!requestedBusinessGroup)return true;const canonical=(p.businessTaxonomy||[]).find(x=>x.group===requestedBusinessGroup);if(canonical)return !requestedBusinessSub||canonical.subs.includes(requestedBusinessSub);const g=businessTaxonomy[requestedBusinessGroup];if(!g)return false;const t=p.businessText||norm(p.details||'');if(!g.b.test(t))return false;const sm=requestedBusinessSub&&g.s&&g.s[requestedBusinessSub];return requestedBusinessSub?!!sm&&sm.test(t):true;}
function searchMatch(p,q){
 if(!q)return true;
 const hay=norm([p.name,p.details,p.address,p.category,p.labels,p.tags].join(' '));
 if(/\blgbtq\b|\bgay\b|\blesbian\b|\btrans\b|\btransgender\b|\bqueer\b|\bnonbinary\b/.test(q)){
   return /\blgbtq\b|\bgay\b|\blesbian\b|\btrans\b|\btransgender\b|\bqueer\b|\bnonbinary\b/.test(hay);
 }
 return hay.includes(q);
}
function currentPlaces(){const q=norm(search.value);return places.filter(p=>(filter!==''&&(filter==='all'||p.category===filter||(Array.isArray(p.also)&&p.also.includes(filter))))&&businessTaxonomyMatch(p)&&searchMatch(p,q));}
async function geocode(p){
 if(Number.isFinite(p.lat)&&Number.isFinite(p.lng))return [p.lat,p.lng];
 const key=norm(p.address);
 if(geocodeCache[key])return geocodeCache[key];
 const u='https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&maxLocations=1&outFields=Match_addr,Addr_type&countryCode=USA&searchExtent=-71.27,42.14,-71.12,42.25&singleLine='+encodeURIComponent(p.address);
 try{
   const r=await fetch(u); if(!r.ok)throw Error(r.status);
   const j=await r.json(),c=j.candidates&&j.candidates[0];
   if(c&&c.location){const v=[c.location.y,c.location.x];geocodeCache[key]=v;localStorage.setItem('norwood-map-geocode-v2',JSON.stringify(geocodeCache));return v}
 }catch(e){}
 return null;
}
async function pooled(items,worker,limit=5){
 let i=0;const runners=Array.from({length:Math.min(limit,items.length)},async()=>{while(i<items.length){const idx=i++;await worker(items[idx],idx)}});await Promise.all(runners);
}
async function render(){
 const token=++renderToken,shown=currentPlaces(),q=norm(search.value);
 cluster.clearLayers();list.innerHTML='';
 if(searchHelp){
   const lgbtq=/\blgbtq\b|\bgay\b|\blesbian\b|\btrans\b|\btransgender\b|\bqueer\b|\bnonbinary\b/.test(q);
   searchHelp.hidden=!lgbtq;
   searchHelp.innerHTML=lgbtq?'<strong>Looking for LGBTQ+ support?</strong><br>Most LGBTQ+ services in the directory are regional, statewide, or online and do not have a Norwood street address, so they cannot be shown accurately as map pins. <a href="resources.html#lgbtq">See LGBTQ+ Support resources →</a>':'';
 }
 count.textContent=shown.length+' place'+(shown.length===1?'':'s')+' in this view';
 status.innerHTML='Plotting locations… <span class="map-progress" id="mapProgress">0 of '+shown.length+' mapped</span>';
 const cards=new Map(),markers=[],progress=document.querySelector('#mapProgress');
 shown.forEach((p,i)=>{
  const b=document.createElement('button');b.className='place-card';b.innerHTML='<b>'+esc(p.name)+publicSchoolMark(p)+'</b><span>'+esc(p.address)+'</span><small>'+esc(p.details||p.category)+'</small>';list.appendChild(b);cards.set(p,b);
 });
 let done=0,mapped=0;
 await pooled(shown,async p=>{
   const ll=await geocode(p);done++;if(token!==renderToken)return;
   if(ll){
     mapped++;const m=L.marker(ll).bindPopup(popup(p));cluster.addLayer(m);markers.push(m);
     cards.get(p)?.addEventListener('click',()=>{map.setView(ll,16);m.openPopup()});
   }else cards.get(p)?.classList.add('unmapped');
   if(progress)progress.textContent=done+' of '+shown.length+' checked · '+mapped+' mapped';
 },6);
 if(token!==renderToken)return;
 status.textContent=mapped+' mapped'+(shown.length-mapped?' · '+(shown.length-mapped)+' could not be located automatically':'')+' · click a place to center the map.';
 if((filter==='all'&&!q)||(filter==='gas'&&requestedCategory==='gas'&&!q)){map.fitBounds(NORWOOD_BOUNDS,{padding:[8,8]});}
 else if(markers.length>1){const g=L.featureGroup(markers);map.fitBounds(g.getBounds().pad(.08),{maxZoom:14})}
 else if(markers.length===1)map.setView(markers[0].getLatLng(),16);
}
category?.addEventListener('change',()=>{filter=category.value;render();});
let searchTimer;search.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(render,180)});

async function fetchGeoJSON(url){const r=await fetch(url);if(!r.ok)throw Error(r.status);return r.json()}
function boundaryStyle(kind){return kind==='town'?{color:'#003B71',weight:4,fill:false,opacity:.9}:{color:'#a36d00',weight:2,fillColor:'#f2c100',fillOpacity:.08,opacity:.85}}
async function toggleTownBoundary(on){
 const box=document.querySelector('#boundaryStatus');
 if(!on){if(boundaryLayers.town){map.removeLayer(boundaryLayers.town);boundaryLayers.town=null}return}
 if(boundaryLayers.town){boundaryLayers.town.addTo(map);return}
 if(box)box.textContent='Loading Norwood town boundary…';
 try{
  const url="https://services1.arcgis.com/hGdibHYSPO59RG1h/ArcGIS/rest/services/Massachusetts_Municipalities_Hosted/FeatureServer/0/query?where="+encodeURIComponent("TOWN='NORWOOD'")+"&outFields=TOWN&returnGeometry=true&outSR=4326&f=geojson";
  const gj=await fetchGeoJSON(url);
  boundaryLayers.town=L.geoJSON(gj,{style:boundaryStyle('town'),onEachFeature:(f,l)=>l.bindPopup('<b>Town of Norwood boundary</b><br>MassGIS municipal boundary')}).addTo(map);
  if(box)box.textContent='Town boundary shown from MassGIS.';
 }catch(e){if(box)box.textContent='The town boundary could not be loaded right now.'}
}
async function togglePrecincts(on){
 const box=document.querySelector('#boundaryStatus');
 if(!on){if(boundaryLayers.precincts){map.removeLayer(boundaryLayers.precincts);boundaryLayers.precincts=null}return}
 if(boundaryLayers.precincts){boundaryLayers.precincts.addTo(map);return}
 if(box)box.textContent='Loading Norwood voting precincts…';
 try{
  const url="https://services9.arcgis.com/wMoJraMZWuVPEmGK/arcgis/rest/services/Voter_Precinct/FeatureServer/0/query?where="+encodeURIComponent("UPPER(TOWN)='NORWOOD'")+"&outFields=PRECINCT,WP_NAME,TOWN&returnGeometry=true&outSR=4326&f=geojson";
  const gj=await fetchGeoJSON(url);
  if(!gj?.features?.length)throw Error('No Norwood precincts returned');
  boundaryLayers.precincts=L.geoJSON(gj,{style:boundaryStyle('precinct'),onEachFeature:(f,l)=>{const a=f.properties||{};l.bindPopup('<b>'+esc(a.WP_NAME||('Norwood Precinct '+(a.PRECINCT||'')))+'</b><br>Voting precinct boundary')}}).addTo(map);
  if(box)box.textContent='Norwood voting precincts shown from the Massachusetts 2022 wards and precincts dataset.';
 }catch(e){if(box)box.textContent='Voting precinct boundaries could not be loaded right now.'}
}


document.querySelector('#locateMe').addEventListener('click',()=>{
 if(!navigator.geolocation){alert('Location is not available in this browser.');return}
 navigator.geolocation.getCurrentPosition(pos=>{
  const ll=[pos.coords.latitude,pos.coords.longitude];
  if(userMarker)map.removeLayer(userMarker);
  userMarker=L.circleMarker(ll,{radius:9,weight:3,color:'#003B71',fillColor:'#F2C100',fillOpacity:1}).addTo(map).bindPopup('<b>Your approximate location</b>').openPopup();map.setView(ll,15);
 },()=>alert('Your location was not shared. You can still browse the map normally.'),{enableHighAccuracy:false,timeout:8000});
});
document.querySelector('#townBoundary')?.addEventListener('change',e=>toggleTownBoundary(e.target.checked));
document.querySelector('#votingPrecincts')?.addEventListener('change',e=>togglePrecincts(e.target.checked));
render().then(async()=>{if(!requestedPlace)return;const target=places.find(p=>norm(p.name)===norm(requestedPlace))||currentPlaces()[0];if(!target)return;const ll=await geocode(target);if(!ll)return;map.setView(ll,16);for(const layer of cluster.getLayers()){if(layer.getLatLng&&layer.getLatLng().distanceTo(L.latLng(ll))<5){layer.openPopup();break;}}});

/* Trail system selection is a research index until brochure-aligned geometries exist.
   Do not filter unnamed regional GIS lines by proximity and mislabel them as town trails. */
(()=>{
 const select=document.getElementById('trailSystemSelect');
 const status=document.getElementById('trailSystemSelectionStatus');
 const descriptions={
  all:'All town trail systems selected. Candidate GIS lines are separate, unverified overlays; brochure-aligned routes are still being traced.',
  shattuck:'Shattuck Park: Winter / Nichols / Bond streets; Bellevue Avenue parking. Route geometry pending alignment.',
  germany:'Germany Brook: Savage Center loop, Winter Street crossing, Willett School connection and landfill spur. Geometry pending.',
  endean:'Endean / Hawes Brook: interconnected trails and five community-walk loops. Geometry pending.',
  'ellis-pond':'Ellis Pond: north, east and south shores; Walpole Street and Nichols Street access. Geometry pending.',
  'ellis-playground':'Ellis Playground: boardwalk trails off Codman Road. Geometry pending.',
  cooper:'Bernie Cooper Park: existing public trails, opened 2025, dawn to dusk; geometry alignment pending.',
  hennessey:'Hennessey Field: wooded trails by Pleasant Street and Lenox Avenue. Geometry pending.',
  meadow:'Meadow Street: brochure confirms existing public walking paths, open dawn to dusk; crossings can flood. Geometry alignment pending.',
  vanderbilt:'Vanderbilt / Pine Tree Forest: outer and inner loops, Tiot Trail and secondary colored branches. Geometry pending.',
  willett:'Willett / Tiot: 0.37-mile trail leg depicted in 2026 brochure; current public access is not established by that document.',
  ledgeview:'Ledgeview: brochure identifies an existing blue trail toward the river, but the full ~1-mile loop is contingent on land acquisition. Public access to individual sections is not confirmed.',
  senior:'Norwood Senior Center walking route: separate route document; review walking alignment and sidewalk crossings before publishing as a trail.'
 };
 select?.addEventListener('change',()=>{
  const v=select.value;
  if(status)status.textContent=v?(descriptions[v]||'Trail geometry pending.'):'Select a trail system to see its mapping status.';
 });
})();
/* Geographic alignment aids for committee: coordinates are park reference points, NOT trail vertices. */
(()=>{
 const references=[
  {name:'Shattuck Park reference point',lat:42.19283,lon:-71.21099,source:'OpenStreetMap park geometry',note:'Compare Winter, Nichols, Bond and Bellevue streets with the brochure.'},
  {name:'Bernie Cooper Riverfront Park reference point',lat:42.17478,lon:-71.20465,source:'OpenStreetMap park geometry',note:'Align with Saint Joseph Avenue, Balch School, Hawes Brook and Neponset River.'}
 ];
 const anchors=L.layerGroup(references.map(p=>L.circleMarker([p.lat,p.lon],{radius:7,color:'#17384d',weight:2,fillColor:'#fff',fillOpacity:1}).bindPopup('<strong>'+p.name+'</strong><p>'+p.note+'</p><small>'+p.source+' — location anchor only, not a trail point</small>'))).addTo(map);
 const panel=document.getElementById('trailTestStatus');
 if(panel){const label=document.createElement('label');label.style.marginLeft='10px';const check=document.createElement('input');check.type='checkbox';check.checked=true;check.addEventListener('change',()=>check.checked?map.addLayer(anchors):map.removeLayer(anchors));label.append(check,document.createTextNode(' Show geographic alignment anchors (blue rings)'));panel.append(label);}
})();
/* REVIEW ONLY: publicly distributable MassGIS 911 hiking trails, not validated routes. */
(async()=>{
 const output=document.getElementById('trailTestStatus');if(!output)return;
 // Use a spatial envelope: town-name attributes are often missing or inconsistent.
 const base='https://services.arcgis.com/2gdL2gxYNFY2TOUb/ArcGIS/rest/services/Trails40miBuffer/FeatureServer/18/query';
 const args=new URLSearchParams({where:'1=1',geometry:JSON.stringify({xmin:-71.2355,ymin:42.1515,xmax:-71.1505,ymax:42.2265,spatialReference:{wkid:4326}}),geometryType:'esriGeometryEnvelope',spatialRel:'esriSpatialRelIntersects',inSR:'4326',outFields:'*',returnGeometry:'true',outSR:'4326',f:'geojson',resultRecordCount:'2000'});
 try{
  let response=await fetch(base+'?'+args,{signal:AbortSignal.timeout(12000)});
  let data=await response.json();
  if(!data.features){ // Service may only support Esri JSON; request that and convert paths.
   args.set('f','json');response=await fetch(base+'?'+args,{signal:AbortSignal.timeout(12000)});const raw=await response.json();
   if(raw.error)throw Error(raw.error.message);
   data={type:'FeatureCollection',features:(raw.features||[]).map(f=>({type:'Feature',properties:f.attributes||{},geometry:{type:'MultiLineString',coordinates:(f.geometry?.paths||[]).map(path=>path.map(([lon,lat])=>[lon,lat]))}}))};
  }
  const candidates=(data.features||[]).filter(f=>f.geometry&&['LineString','MultiLineString'].includes(f.geometry.type));
  const overlay=L.geoJSON({type:'FeatureCollection',features:candidates},{style:{color:'#c05b00',weight:4,opacity:.85,dashArray:'7 5'},onEachFeature:(feature,layer)=>{const p=feature.properties||{};const name=p.TRAIL_NAME||p.ALT_NAME||p.SITE_NAME||'Unnamed candidate trail';const div=document.createElement('div');const title=document.createElement('strong');title.textContent=name;div.append(title);const note=document.createElement('p');note.textContent='Unverified MassGIS trail line. Do not use for navigation.';div.append(note);layer.bindPopup(div)}}).addTo(map);
  // Optional second source: OSM footways and paths, visually distinct and never asserted as approved trails.
  const osmButton=document.createElement('button');osmButton.type='button';osmButton.textContent='Compare OpenStreetMap candidate paths';osmButton.style.margin='0 8px';osmButton.addEventListener('click',async()=>{
    osmButton.disabled=true;osmButton.textContent='Checking OpenStreetMap…';
    try{
      const q='[out:json][timeout:25];(way[highway~"^(path|footway|bridleway|track)$"](42.1515,-71.2355,42.2265,-71.1505););out geom;';
      const res=await fetch('https://overpass.kumi.systems/api/interpreter',{method:'POST',body:new URLSearchParams({data:q}),signal:AbortSignal.timeout(30000)});
      if(!res.ok)throw Error('OSM service unavailable');const json=await res.json();
      const features=(json.elements||[]).filter(w=>w.type==='way'&&w.geometry?.length>1&&w.tags?.access!=='private'&&w.tags?.access!=='no'&&w.tags?.foot!=='no'&&w.tags?.highway!=='track').map(w=>({type:'Feature',properties:w.tags||{},geometry:{type:'LineString',coordinates:w.geometry.map(p=>[p.lon,p.lat])}}));
      const osm=L.geoJSON({type:'FeatureCollection',features},{style:{color:'#6e4a9e',weight:3,opacity:.7,dashArray:'2 7'},onEachFeature:(f,l)=>l.bindPopup('Unverified OpenStreetMap candidate path — NOT approved for navigation')}).addTo(map);
      const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.checked=true;check.addEventListener('change',()=>check.checked?map.addLayer(osm):map.removeLayer(osm));label.append(check,document.createTextNode(' '+features.length+' OSM candidate paths (purple dots)'));output.append(label);
      osmButton.remove();
    }catch(err){osmButton.disabled=false;osmButton.textContent='Retry OpenStreetMap comparison';output.append(document.createTextNode(' OSM comparison unavailable: '+err.message))}
  });
  output.append(osmButton);
  // Load OSM candidate geometries automatically for committee review; button remains for retry.
  osmButton.click();
  const shown=overlay.getLayers().length;
  output.textContent=shown+' candidate MassGIS trail segments displayed as dashed orange lines. NOT checked against town brochures, entrances, closures, or on-the-ground conditions. Official trail maps remain in Parks & Trails. Do not navigate with this draft.';
  const toggle=document.createElement('label');toggle.style.marginLeft='12px';const check=document.createElement('input');check.type='checkbox';check.checked=true;check.addEventListener('change',()=>check.checked?map.addLayer(overlay):map.removeLayer(overlay));toggle.append(check,document.createTextNode(' Show unverified trails'));output.append(toggle);
 }catch(err){output.textContent='Trail overlay unavailable ('+err.message+'). The regular map remains usable. No routes have been verified.'}
})();

/* Trail-system candidate line conversion. Every source area can display real
   mapped OSM footway geometry, clipped to a conservative reference envelope.
   These are candidates, not a digitization of the official PDFs. */
(()=>{
 const picker=document.getElementById('trailSystemSelect');
 const status=document.getElementById('trailSystemSelectionStatus');
 if(!picker||!status)return;
 const areas={
  shattuck:[42.19283,-71.21099,.008],
  germany:[42.188,-71.221,.010],
  endean:[42.17425,-71.2123,.009],
  'ellis-pond':[42.189,-71.217,.009],
  'ellis-playground':[42.201,-71.223,.008],
  cooper:[42.17478,-71.20465,.008],
  hennessey:[42.207,-71.187,.009],
  meadow:[42.169,-71.207,.009],
  vanderbilt:[42.209,-71.221,.011],
  willett:[42.183,-71.219,.008],
  ledgeview:[42.195,-71.222,.007],
  senior:[42.197,-71.203,.008]
 };
 const layer=L.layerGroup();let cache=null,request=null,serial=0;
 function clear(){layer.clearLayers();map.removeLayer(layer)}
 async function load(){
  if(cache)return cache;
  if(request)return request;
  request=(async()=>{
   const q='[out:json][timeout:35];way["highway"~"^(path|footway)$"](42.1515,-71.2355,42.2265,-71.1505);out geom;';
   const endpoints=['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter'];
   for(const endpoint of endpoints){
    try{
     const response=await fetch(endpoint,{method:'POST',body:new URLSearchParams({data:q}),signal:AbortSignal.timeout(35000)});
     if(!response.ok)continue;
     const json=await response.json();
     cache=(json.elements||[]).filter(w=>w.geometry?.length>1&&w.tags?.access!=='private'&&w.tags?.access!=='no'&&w.tags?.foot!=='no');
     return cache;
    }catch(e){}
   }
   throw Error('Mapped path service unavailable');
  })();
  try{return await request}finally{request=null}
 }
 function inside(p,area){const [lat,lon,r]=area;return Math.abs(p.lat-lat)<r&&Math.abs(p.lon-lon)<r}
 async function update(){
  const token=++serial;clear();const selection=picker.value;
  if(!selection)return;
  if(selection==='ledgeview'){status.textContent='Ledgeview brochure: blue trail from easement manhole toward the river is depicted; proposed full loop depends on land acquisition. Public access not confirmed. Candidate OSM lines are not proof of an open route.';return}
  status.textContent='Loading approximate mapped footpaths for '+(selection==='all'?'all areas':selection)+'…';
  try{
   const ways=await load();if(token!==serial)return;
   let count=0;
   for(const [id,area] of Object.entries(areas)){
    if(id==='ledgeview'||(selection!=='all'&&selection!==id))continue;
    const matches=ways.filter(w=>w.geometry.some(p=>inside(p,area)));
    for(const w of matches){
     const coords=w.geometry.map(p=>[p.lat,p.lon]);
     L.polyline(coords,{color:'#0b806b',weight:3,opacity:.75,dashArray:'7 5'})
      .bindPopup('<strong>'+id+'</strong><br>Approximate OSM footpath candidate, selected by proximity. Not traced or verified against the source brochure. Do not use for navigation.')
      .addTo(layer);
     count++;
    }
   }
   layer.addTo(map);
   status.textContent=count+' approximate OSM footpath candidates shown. They are NOT converted brochure alignments, may include unrelated paths, and must be reviewed.';
  }catch(e){if(token===serial)status.textContent='Candidate path lines unavailable: '+e.message}
 }
 picker.addEventListener('change',update);
})();
/* Source-specific OSM line comparison for Ellis Pond: only named ways, no guessed geometry. */
(async()=>{
 const picker=document.getElementById('trailSystemSelect');
 const status=document.getElementById('trailSystemSelectionStatus');
 if(!picker||!status)return;
 let lines=null,heads=null,loaded=false;
 async function load(){
  if(loaded)return;loaded=true;
  try{
   const q='[out:json][timeout:20];way["highway"="path"]["name"="Ellis Pond Trail"](42.17,-71.25,42.21,-71.19);out geom;';
   const res=await fetch('https://overpass.kumi.systems/api/interpreter',{method:'POST',body:new URLSearchParams({data:q}),signal:AbortSignal.timeout(25000)});
   if(!res.ok)throw Error('OSM unavailable');
   const json=await res.json();
   const ways=(json.elements||[]).filter(w=>w.geometry?.length>1);
   if(!ways.length)throw Error('No named trail lines returned');
   lines=L.layerGroup();heads=L.layerGroup();
   ways.forEach(w=>{
    const points=w.geometry.map(p=>[p.lat,p.lon]);
    L.polyline(points,{color:'#087f5b',weight:5,opacity:.85}).bindPopup('<b>Ellis Pond Trail</b><br>OpenStreetMap mapped path, not independently checked against the town brochure.').addTo(lines);
    [points[0],points[points.length-1]].forEach((ll,i)=>L.circleMarker(ll,{radius:6,color:'#087f5b',weight:2,fillColor:'#fff',fillOpacity:1}).bindPopup('<b>OSM path endpoint candidate</b><br>Not confirmed as a public trail entrance.').addTo(heads));
   });
   if(['all','ellis-pond'].includes(picker.value)){lines.addTo(map);heads.addTo(map);map.fitBounds(lines.getBounds?lines.getBounds():L.featureGroup(lines.getLayers()).getBounds().pad(.15))}
   status.textContent='Ellis Pond: '+ways.length+' named OSM path segments loaded. Endpoint candidates are NOT verified public entrances.';
  }catch(e){loaded=false;status.textContent='Ellis Pond mapped path unavailable: '+e.message}
 }
 picker.addEventListener('change',()=>{
  if(['all','ellis-pond'].includes(picker.value)){load().then(()=>{if(lines){lines.addTo(map);heads.addTo(map)}})}
  else {if(lines)map.removeLayer(lines);if(heads)map.removeLayer(heads)}
 });
})();
/* Independently published geographic reference: Neponset River Watershed
   Association Hawes Brook sampling station HAB006, not a trailhead. */
(()=>{
 const select=document.getElementById('trailSystemSelect');
 const refLayer=L.layerGroup([
  L.circleMarker([42.174249,-71.212308],{radius:7,color:'#7c3aed',weight:2,fillColor:'#fff',fillOpacity:1})
   .bindPopup('<strong>Hawes Brook / Endean reference point</strong><br>Neponset River Watershed Association sampling station HAB006, at the railroad bridge near a foot path. <b>NOT a verified trail entrance.</b><br><a target="_blank" rel="noopener" href="https://neponset.org/wp-content/uploads/2023/08/2023-CWMN-Site-Manual-June-Update-2.pdf">Source: watershed sampling-site manual</a>')
 ]);
 const update=()=>{if(select?.value==='endean'||select?.value==='all')refLayer.addTo(map);else map.removeLayer(refLayer)};
 select?.addEventListener('change',update);update();
})();
/* Named OSM Endean footpath geometry, separated from official brochure geometry.
   This is an approximate review layer; endpoints are not verified access points. */
(async()=>{
 const picker=document.getElementById('trailSystemSelect');
 const status=document.getElementById('trailSystemSelectionStatus');
 if(!picker||!status)return;
 let layer=null,loading=false;
 async function show(){
  if(layer){layer.addTo(map);return}
  if(loading)return;loading=true;
  try{
   const query='[out:json][timeout:25];way["highway"~"^(path|footway)$"]["name"="Endean Conservation Land Path"](42.165,-71.225,42.183,-71.201);out geom;';
   const res=await fetch('https://overpass.kumi.systems/api/interpreter',{method:'POST',body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(30000)});
   if(!res.ok)throw Error('OSM service unavailable');
   const data=await res.json();
   const ways=(data.elements||[]).filter(w=>w.geometry?.length>1);
   if(!ways.length)throw Error('No named Endean paths returned');
   layer=L.layerGroup(ways.map(w=>L.polyline(w.geometry.map(p=>[p.lat,p.lon]),{color:'#00896b',weight:5,opacity:.85})
     .bindPopup('<b>Endean Conservation Land Path</b><br>Approximate OpenStreetMap line. Not a verified official trail alignment or navigation route.')));
   if(['endean','all'].includes(picker.value))layer.addTo(map);
   status.textContent=ways.length+' Endean named OSM path segments available for review. Hawes Pool and athletic facilities are alignment references; access points are approximate.';
  }catch(e){status.textContent='Endean path overlay unavailable: '+e.message}
  finally{loading=false}
 }
 picker.addEventListener('change',()=>{if(['endean','all'].includes(picker.value))show();else if(layer)map.removeLayer(layer)});
})();
/* Source-described trail access areas. Geocode street-level reference only;
   never label an address result as the exact woodland entrance. */
(()=>{
 const picker=document.getElementById('trailSystemSelect');
 const status=document.getElementById('trailSystemSelectionStatus');
 if(!picker||!status)return;
 const access=[
  {system:'shattuck',name:'Shattuck Park — Bellevue Avenue parking',query:'Bellevue Avenue, Norwood, Massachusetts',source:'Town of Norwood Shattuck Park brochure',url:'https://cms5.revize.com/revize/norwoodma/document_center/Trails%20Committee/2023.03.24%20ShattuckPark_Trails_MAP_BROCHURE.pdf'},
  {system:'vanderbilt',name:'Vanderbilt / Pine Tree Forest — end of Vanderbilt Avenue',query:'Vanderbilt Avenue, Norwood, Massachusetts',source:'Neponset River Watershed Association recreation guide',url:'https://neponset.org/recreation/'},
  {system:'ellis-pond',name:'Ellis Pond — Walpole Street near Endicott Street',query:'Walpole Street and Endicott Street, Norwood, Massachusetts',source:'Neponset River Watershed Association recreation guide',url:'https://neponset.org/recreation/'},
  {system:'meadow',name:'Meadow Street riverside trails — end of Meadow Street',query:'Meadow Street, Norwood, Massachusetts',source:'Neponset River Watershed Association recreation guide',url:'https://neponset.org/recreation/'}
 ];
 const group=L.layerGroup(),cache=new Map();let serial=0;
 async function lookup(item){
  if(cache.has(item.query))return cache.get(item.query);
  const u='https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q='+encodeURIComponent(item.query);
  const res=await fetch(u);if(!res.ok)throw Error('Geocoding unavailable');const data=await res.json();
  const first=data[0];if(!first)return null;
  const ll=[Number(first.lat),Number(first.lon)];
  if(ll[0]<42.14||ll[0]>42.23||ll[1]<-71.25||ll[1]>-71.14)return null;
  cache.set(item.query,ll);return ll;
 }
 async function refresh(){
  const token=++serial;group.clearLayers();if(!picker.value)return;
  const selected=access.filter(x=>picker.value==='all'||x.system===picker.value);
  for(const item of selected){
   try{
    const ll=await lookup(item);if(token!==serial)return;if(!ll)continue;
    const popup=document.createElement('div');
    const strong=document.createElement('strong');strong.textContent=item.name;popup.append(strong);
    const p=document.createElement('p');p.textContent='Approximate access area based on street-level geocoding, NOT a surveyed trailhead. Look for trail signage and the actual path entrance.';popup.append(p);
    const link=document.createElement('a');link.href=item.url;link.target='_blank';link.rel='noopener';link.textContent='Access information source: '+item.source;popup.append(link);
    L.circleMarker(ll,{radius:9,color:'#b66b00',weight:3,fillColor:'#ffe8a3',fillOpacity:.95}).bindPopup(popup).addTo(group);
   }catch(e){if(token===serial)status.textContent='Approximate access locator temporarily unavailable: '+e.message}
  }
  if(token===serial&&group.getLayers().length)group.addTo(map);
 }
 picker.addEventListener('change',refresh);
})();
/* Endean landmark registration guide from Norwood's 2023 official trail brochure.
   Features are anchors for locating entrances, not claimed GPS entrance coordinates. */
(()=>{
 const picker=document.getElementById('trailSystemSelect');
 const status=document.getElementById('trailSystemSelectionStatus');
 if(!picker||!status)return;
 const panel=document.createElement('div');
 panel.id='endeanLandmarkGuide';
 panel.style.cssText='display:none;margin:10px 0;padding:12px;border:1px solid #b6c5cf;border-radius:8px;background:#fff';
 panel.innerHTML='<strong>Endean / Hawes Brook — entrance alignment</strong><p>Use the <a href="https://cms5.revize.com/revize/norwoodma/2023.02.21%20EndeanHawesBrTr_MAP_BROCHURE.pdf" target="_blank" rel="noopener">official 2023 trail brochure</a> and switch on satellite imagery. Match Hawes Pool, tennis-court corners and the Little League baseball diamond/backstop. These are landmarks, not trailhead markers.</p><p>Find the gravel path leading from the pool parking area toward the woods. Confirm the actual point where the public trail enters the wooded area before placing a directions pin. Cross-check the brook, rail corridor and Washington Street crossing before drawing connecting paths.</p><p><strong>Status:</strong> Entrances and trail geometry not yet independently located. Do not provide navigation directions to unverified pins.</p>';
 status.insertAdjacentElement('afterend',panel);
 function update(){panel.style.display=picker.value==='endean'||picker.value==='all'?'block':'none'}
 picker.addEventListener('change',update);update();
})();
/* Entrance-first mapping: trailhead positions are separate from approximate route geometry.
   Add confirmed coordinates only; never substitute park centroid for access. */
(()=>{
 const select=document.getElementById('trailSystemSelect');
 const note=document.getElementById('trailSystemSelectionStatus');
 if(!select||!note)return;
 const heads=L.layerGroup().addTo(map);
 const entries=[]; // Populated only after entrance location is independently checked.
 const draw=()=>{
  heads.clearLayers();
  if(!select.value)return;
  entries.filter(e=>select.value==='all'||e.system===select.value).forEach(e=>{
   L.circleMarker([e.lat,e.lon],{radius:8,color:'#004f7a',weight:3,fillColor:'#ffcf32',fillOpacity:1})
    .bindPopup('<strong>'+e.name+'</strong><br>Verified entrance location<br><a target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(e.lat+','+e.lon)+'">Directions to entrance</a>')
    .addTo(heads);
  });
 };
 select.addEventListener('change',draw);
 draw();
})();
/* Vanderbilt brochure georeferencing workbench: reviewer must supply map control points.
   Never publish transformed paths as accurate without independent validation. */
(async()=>{
 const host=document.getElementById('trailSystemSelectionStatus');
 const picker=document.getElementById('trailSystemSelect');
 if(!host||!picker)return;
 let source;
 try{const response=await fetch('data/trails/vanderbilt-5k-brochure-trace.json');if(!response.ok)throw Error('source unavailable');source=await response.json()}catch(e){host.textContent='Vanderbilt source geometry could not load';return}
 const panel=document.createElement('div');panel.style.cssText='margin:12px 0;padding:12px;border:1px solid #aab8c1;border-radius:8px;background:#fff';
 panel.innerHTML='<strong>Vanderbilt georeferencing workbench (committee only)</strong><p style="margin:6px 0">Open the <a href="https://drive.google.com/file/d/1vZ7KuQE0WHdan1lJJLNMbYqAdzj50iF0/view" target="_blank" rel="noopener">official source map</a>. Enter its image pixel X/Y (1088 × 1408 reference image), then click the corresponding location on this geographic map. Use at least three widely spaced, independent landmarks. The first two fit rotation and scale; additional points reveal alignment error.</p><label>Source X <input id="trailCalX" type="number" min="0" max="1088" style="width:80px"></label> <label>Y <input id="trailCalY" type="number" min="0" max="1408" style="width:80px"></label> <button type="button" id="trailCalAdd">Click map to match this pixel</button> <button type="button" id="trailCalClear">Clear calibration</button> <button type="button" id="trailCalExport" disabled>Export provisional GeoJSON</button><div id="trailCalResults" role="status" style="margin-top:8px"></div>';
 host.insertAdjacentElement('afterend',panel);
 const result=panel.querySelector('#trailCalResults');
 const cpLayer=L.layerGroup().addTo(map);
 function redrawControls(){cpLayer.clearLayers();controls.forEach((p,i)=>L.circleMarker([p.lat,p.lon],{radius:7,color:'#0a5175',weight:2,fillColor:'#fff',fillOpacity:1}).bindTooltip('Control '+(i+1)+': source '+p.x+','+p.y).addTo(cpLayer))}

 let controls=[],awaiting=false,layer=null;
 try{controls=JSON.parse(localStorage.getItem('norwood-vanderbilt-control-points')||'[]');if(!Array.isArray(controls))controls=[]}catch(e){}
 const project=ll=>L.CRS.EPSG3857.project(L.latLng(ll));
 function solve(){
  redrawControls();if(controls.length<2){result.textContent=controls.length+' control points. At least two required; three or more recommended.';if(layer)map.removeLayer(layer);return}
  const n=controls.length;
  const mx=controls.reduce((s,p)=>s+p.x,0)/n,my=controls.reduce((s,p)=>s+p.y,0)/n;
  const targets=controls.map(p=>project([p.lat,p.lon]));
  const me=targets.reduce((s,p)=>s+p.x,0)/n,mn=targets.reduce((s,p)=>s+p.y,0)/n;
  let a=0,b=0,den=0;
  controls.forEach((p,i)=>{const x=p.x-mx,y=p.y-my,u=targets[i].x-me,v=targets[i].y-mn;a+=x*u+y*v;b+=x*v-y*u;den+=x*x+y*y});
  if(den<1){result.textContent='Control points must have distinct image positions';return}
  a/=den;b/=den;
  const geo=(x,y)=>{const xy=L.point(me+a*(x-mx)-b*(y-my),mn+b*(x-mx)+a*(y-my));const ll=L.CRS.EPSG3857.unproject(xy);return [ll.lat,ll.lng]};
  // Detect source-map anisotropy with a six-parameter affine fit, but do not
  // automatically warp routes: a distorted brochure can overfit landmarks.
  function affineFit(samples){
   if(samples.length<3)return null;
   const A=[],B=[];
   samples.forEach(p=>{const t=project([p.lat,p.lon]);A.push([p.x,p.y,1,0,0,0],[0,0,0,p.x,p.y,1]);B.push(t.x,t.y)});
   const M=Array.from({length:6},(_,i)=>Array.from({length:7},(_,j)=>j===6?A.reduce((s,row,k)=>s+row[i]*B[k],0):A.reduce((s,row)=>s+row[i]*row[j],0)));
   for(let i=0;i<6;i++){let best=i;for(let j=i+1;j<6;j++)if(Math.abs(M[j][i])>Math.abs(M[best][i]))best=j;if(Math.abs(M[best][i])<1e-8)return null;[M[i],M[best]]=[M[best],M[i]];const d=M[i][i];for(let k=i;k<7;k++)M[i][k]/=d;for(let j=0;j<6;j++)if(j!==i){const f=M[j][i];for(let k=i;k<7;k++)M[j][k]-=f*M[i][k]}}
   const z=M.map(row=>row[6]);return p=>L.point(z[0]*p.x+z[1]*p.y+z[2],z[3]*p.x+z[4]*p.y+z[5]);
  }
  const affine=affineFit(controls);
  const affineRms=affine?Math.sqrt(controls.reduce((s,p)=>{const a=affine(p),t=project([p.lat,p.lon]);return s+Math.pow(Math.hypot(a.x-t.x,a.y-t.y)*Math.cos(p.lat*Math.PI/180),2)},0)/n):null;
  const affineHoldout=[];
  if(n>=5)controls.forEach((p,i)=>{const fit=affineFit(controls.filter((_,j)=>i!==j));if(!fit)return;const a=fit(p),t=project([p.lat,p.lon]);affineHoldout.push(Math.hypot(a.x-t.x,a.y-t.y)*Math.cos(p.lat*Math.PI/180))});
  const affineIndependent=affineHoldout.length?Math.sqrt(affineHoldout.reduce((s,e)=>s+e*e,0)/affineHoldout.length):null;
  const errors=controls.map((p,i)=>{const xy=project(geo(p.x,p.y));return Math.hypot(xy.x-targets[i].x,xy.y-targets[i].y)*Math.cos(p.lat*Math.PI/180)});
  const rms=Math.sqrt(errors.reduce((s,v)=>s+v*v,0)/n);
  // Leave-one-out residuals provide an independent prediction test rather than training error.
  const holdout=[];
  if(n>=4)for(let excluded=0;excluded<n;excluded++){
   const others=controls.filter((_,i)=>i!==excluded),m=others.length;
   const ox=others.reduce((s,p)=>s+p.x,0)/m,oy=others.reduce((s,p)=>s+p.y,0)/m;
   const xy=others.map(p=>project([p.lat,p.lon]));
   const ex=xy.reduce((s,p)=>s+p.x,0)/m,ey=xy.reduce((s,p)=>s+p.y,0)/m;
   let aa=0,bb=0,dd=0;
   others.forEach((p,i)=>{const x=p.x-ox,y=p.y-oy,u=xy[i].x-ex,v=xy[i].y-ey;aa+=x*u+y*v;bb+=x*v-y*u;dd+=x*x+y*y});
   if(dd<1)continue;aa/=dd;bb/=dd;
   const p=controls[excluded],actual=project([p.lat,p.lon]);
   const predicted=L.point(ex+aa*(p.x-ox)-bb*(p.y-oy),ey+bb*(p.x-ox)+aa*(p.y-oy));
   holdout.push(Math.hypot(predicted.x-actual.x,predicted.y-actual.y)*Math.cos(p.lat*Math.PI/180));
  }
  const independent=holdout.length?Math.sqrt(holdout.reduce((s,v)=>s+v*v,0)/holdout.length):null;
  if(layer)map.removeLayer(layer);
  layer=L.layerGroup(source.trails.map(t=>L.polyline(t.points.map(p=>geo(p[0],p[1])),{color:t.color,weight:4,opacity:.8,dashArray:'7 5'}).bindPopup('<b>'+t.name+'</b><br>PROVISIONAL brochure alignment; not independently validated.'))).addTo(map);
  result.textContent=n+' matched landmarks; fitted RMS '+rms.toFixed(1)+' m; '+(independent===null?'independent validation requires at least four control points.':'leave-one-out RMS '+independent.toFixed(1)+' m ('+(independent<=6.1?'within 20-foot check on sampled landmarks':'exceeds 20-foot target')+').')+' Rotation '+(Math.atan2(b,a)*180/Math.PI).toFixed(1)+'°. Affine fitted RMS '+(affineRms===null?'n/a':affineRms.toFixed(1)+' m')+'; affine leave-one-out '+(affineIndependent===null?'needs 5+ landmarks':affineIndependent.toFixed(1)+' m')+'. Affine results are diagnostic only; no rubber-sheet warping is applied. Source tracing and landmarks still require human review. NOT navigation-ready.';
  const exportBtn=panel.querySelector('#trailCalExport');
  if(exportBtn)exportBtn.disabled=independent===null;
  panel.dataset.export=JSON.stringify({type:'FeatureCollection',properties:{status:'provisional-georeferencing',fittedRmsMeters:rms,holdoutRmsMeters:independent,controlPoints:controls,source:source.source},features:source.trails.map(t=>({type:'Feature',properties:{id:t.id,name:t.name,status:'unverified',source:'official brochure pixel trace'},geometry:{type:'LineString',coordinates:t.points.map(p=>{const ll=geo(p[0],p[1]);return [ll[1],ll[0]]})}}))});
 }
 panel.querySelector('#trailCalAdd').addEventListener('click',()=>{awaiting=true;result.textContent='Click the corresponding landmark on the geographic map.'});
 panel.querySelector('#trailCalExport').addEventListener('click',()=>{if(!panel.dataset.export)return;const blob=new Blob([panel.dataset.export],{type:'application/geo+json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='vanderbilt-provisional-trails.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
 panel.querySelector('#trailCalClear').addEventListener('click',()=>{controls=[];localStorage.removeItem('norwood-vanderbilt-control-points');solve()});
 map.on('click',e=>{if(!awaiting)return;awaiting=false;const rawX=panel.querySelector('#trailCalX').value,rawY=panel.querySelector('#trailCalY').value;const x=Number(rawX),y=Number(rawY);if(!rawX||!rawY||!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>1088||y>1408){result.textContent='Enter valid image X and Y first';return}controls.push({x,y,lat:e.latlng.lat,lon:e.latlng.lng});localStorage.setItem('norwood-vanderbilt-control-points',JSON.stringify(controls));solve()});
 picker.addEventListener('change',()=>{if(layer){if(picker.value==='vanderbilt'||picker.value==='all')layer.addTo(map);else map.removeLayer(layer)}});
 solve();
})();
})();