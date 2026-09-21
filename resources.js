(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const topics=[
['services','Everyday Local Services','Practical local businesses for everyday needs such as laundry, haircuts, driving schools and personal services.',['laundromat','laundry','barber','haircut','dry cleaning','local service','driving school','drivers ed','driving lessons']],
['kids','Kids, Families & Education','Schools, special education, childcare, youth activities and family support.',['education','school','student','youth','child','family','parent','scholarship','sport','sepac','special education','daycare','preschool']],
['youth','Youth Sports & Activities','Youth leagues, clubs, classes, scouting, arts and other activities for children and teens.',['youth','sport','league','cheer','cheerleading','gymnastics','lacrosse','baseball','softball','soccer','hockey','basketball','swim','track','field hockey','dance','martial arts','scout','music','skating']],
['adultsports','Adult Sports & Leagues','Recreational sports, leagues and athletic programs intended for adults.',['adult sports','adult league','adult recreation','mens league','womens league','pickleball','adult softball','adult basketball']],
['older','Older Adults & Caregivers','Senior services, meals, transportation, activities, benefits and caregiver support.',['senior','aging','older','caregiver','meals on wheels','medicare','dementia']],
['veterans','Veterans & Military Families','Local, state and federal help for veterans and military families.',['veteran','military','va','legion']],
['housing','Housing & Utilities','Housing, rent, tenant help, utilities, energy, power and broadband.',['housing','utility','electric','light','broadband','water','tenant','home','rent','eviction','heat']],
['realestate','Realtors & Real Estate','Local real-estate professionals and resources for buying or selling a home. This directory will expand as additional listings are added.',['realtor','real estate','broker','home buying','home selling']],
['food','Food & Basic Needs','Food assistance, groceries, meals, nutrition and essential-needs support.',['food','pantry','meal','snap','wic','bread','nutrition','grocer','hunger']],
['health','Health, Disability & Mental Health','Health care, disability, accessibility, recovery and behavioral health resources.',['health','disability','mental','special needs','human services','crisis','autism','deaf','blind','recovery']],
['medical','Medical Care','Hospitals, urgent care, primary care and other medical services.',['medical','hospital','urgent care','primary care','physician','doctor','clinic']],
['dental','Dental & Orthodontics','Dentists, orthodontists and oral-health services.',['dentist','dental','orthodontist','orthodontics','oral health']],
['wellness','Spas, Salons & Massage','Spas, salons, massage and related personal-care and wellness services.',['spa','salon','massage','hair','wellness','halotherapy','salt room']],
['transport','Transportation','Bus, commuter rail, accessible transportation and local mobility.',['mbta','transit','transport','airport','rail','bus','ride','paratransit']],
['jobs','Jobs, Money & Benefits','Employment, benefits, financial assistance, taxes and practical support.',['job','employment','benefit','financial','scholarship','career','unemployment','tax','social security']],
['community','Community & Belonging','Civic groups, volunteering, clubs and community connections.',['civic','volunteer','community','rotary','elks','club','immigrant','lgbtq']],
['worship','Houses of Worship','Churches, temples, synagogues, mosques and nearby faith communities.',['worship','religious','faith','church','temple','synagogue','mosque','parish','congregation','jewish','muslim','hindu','catholic','baptist','episcopal','unitarian']],
['todo','Things to Do','Library, recreation, arts, sports, trails, parks and history.',['library','recreation','arts','culture','theatre','trail','sport','history','park','museum']],
['town','Town Services & Government','Town departments, public safety, permits, voting and everyday municipal services.',['town','board','police','fire','clerk','public works','building','planning','health','government','election','trash','assessor']],
['business','Business & Local Economy','Business groups, downtown organizations, entrepreneurs and employment resources.',['business','chamber','downtown','center','entrepreneur','startup']]
];
let all=[];
const stopWords=new Set(['a','an','and','are','for','from','help','i','in','is','me','my','need','of','on','please','the','to','with']);
const tokenAliases={
 kid:['kid','kids','child','children','family','youth'],kids:['kid','kids','child','children','family','youth'],child:['child','children','kid','kids','youth'],children:['child','children','kid','kids','youth'],
 iep:['iep','special education','sepac','disability'],'504':['504','special education','disability','sepac'],
 rent:['rent','rental','housing','tenant','raft','eviction'],realtor:['realtor','real estate','broker','agent'],evicted:['evicted','eviction','housing','tenant','raft'],
 food:['food','pantry','meal','meals','snap','wic','groceries','hunger'],groceries:['groceries','food','pantry','snap'],hungry:['hungry','hunger','food','pantry','snap'],
 elderly:['elderly','senior','older','aging','caregiver'],old:['older','senior','aging'],wheelchair:['wheelchair','disability','accessible','paratransit'],
 driver:['driver','driving school','drivers ed','driving lessons','road test'],driving:['driving','driving school','drivers ed','driving lessons','road test'],ice:['ice cream','frozen yogurt','froyo','gelato','dessert'],cream:['ice cream','frozen yogurt','froyo','gelato','dessert'],froyo:['frozen yogurt','ice cream','dessert'],job:['job','jobs','employment','career','masshire'],lawyer:['lawyer','legal','rights'],english:['english','esl','ell','multilingual','language','immigrant'],
 gay:['gay','lgbtq','queer'],trans:['trans','transgender','lgbtq'],vet:['vet','veterinarian','veterinary','animal hospital','pet','veteran','military'],church:['church','worship','faith','congregation'],synagogue:['synagogue','jewish','worship'],mosque:['mosque','muslim','islam','worship'],temple:['temple','hindu','jewish','worship'],jewish:['jewish','synagogue','temple','worship'],muslim:['muslim','islam','mosque','worship'],hindu:['hindu','temple','mandir','worship'],cheer:['cheer','cheerleading','tumbling'],gymnastics:['gymnastics','gymnastic','tumbling'],lacrosse:['lacrosse','lax'],scouts:['scouts','scouting','cub scouts','girl scouts'],dance:['dance','ballet','acro'],skating:['skating','ice skating','learn to skate'],martial:['martial arts','karate','taekwondo','jiu jitsu']
};
const crisisTerms=/\b(suicid(?:e|al)|kill myself|hurt myself|self[- ]?harm|want to die|end my life|mental health crisis|psychiatric crisis|crisis line|crisis hotline)\b/i;
function crisisHelp(q){
 if(!crisisTerms.test(q||''))return'';
 return '<aside class="resource-crisis" role="note"><strong>Need immediate mental-health crisis support?</strong><p>Call or text <a href="tel:988">988</a> for the Suicide & Crisis Lifeline. If there is immediate danger or a life-threatening emergency, call <a href="tel:911">911</a>.</p><a href="https://988lifeline.org/" target="_blank" rel="noopener">988 Suicide & Crisis Lifeline ↗</a></aside>';
}
const phraseAliases={
 'electric bill':['electric','utility','energy','fuel assistance'],
 'lost my job':['job','employment','unemployment','benefits'],
 'mental health':['mental health','counseling','behavioral health','crisis'],
 'special education':['special education','sepac','iep','504'],
 'domestic violence':['domestic violence','abuse','safety']
};
function haystack(r){
 const tags=Array.isArray(r.tags)?r.tags.join(' '):(r.tags||'');
 return `${r.name||''} ${r.description||''} ${tags} ${r.category||''} ${(r.topics||[]).join(' ')} ${r.coverage||''}`.toLowerCase();
}
function belongs(r,t){return Array.isArray(r.topics)?r.topics.includes(t[0]):t[3].some(k=>haystack(r).includes(k));}
function socialLinks(r){if(!r.social)return'';const labels={facebook:['bi-facebook','Facebook'],instagram:['bi-instagram','Instagram'],youtube:['bi-youtube','YouTube'],linkedin:['bi-linkedin','LinkedIn'],x:['bi-twitter-x','X']};return `<span class="social-links">${Object.entries(r.social).map(([k,u])=>{const v=labels[k]||['bi-link-45deg',k];return `<a href="${esc(u)}" target="_blank" rel="noopener" aria-label="${esc(v[1])}" title="${esc(v[1])}"><i class="bi ${v[0]}"></i></a>`}).join('')}</span>`;}
function queryGroups(q){
 const raw=q.toLowerCase().trim(); if(!raw)return [];
 const groups=[]; let remainder=raw;
 for(const [phrase,alts] of Object.entries(phraseAliases)){
   if(remainder.includes(phrase)){groups.push(alts);remainder=remainder.replaceAll(phrase,' ');}
 }
 remainder.split(/[^a-z0-9]+/).filter(w=>w.length>1&&!stopWords.has(w)).forEach(w=>groups.push(tokenAliases[w]||[w]));
 return groups;
}
function matchesQuery(r,q){const groups=queryGroups(q);if(!groups.length)return true;const hay=haystack(r);return groups.every(group=>group.some(term=>hay.includes(term)));}
function isTown(r){return !!r.officialTown||/^https?:\/\/([^/]+\.)?norwoodma\.gov\//i.test(r.url||'');}
function isBusiness(r){const h=haystack(r);return (r.topics||[]).includes('services')||(r.topics||[]).includes('realestate')||(r.topics||[]).includes('wellness')||/local service|driving school|realtor|real estate|barber|laundromat|dry clean|spa|salon|massage|dentist|orthodont|martial arts|gymnastics|music school|ice cream|restaurant|veterinar|contractor|plumb|electrician|hvac/i.test(h);}
function reviewLinks(r){if(!isBusiness(r))return'';const loc=(r.address||((r.coverage||'').toLowerCase().includes('norwood')||r.coverage==='Local'?'Norwood, MA':'Massachusetts'));const g='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(r.name+' '+loc),y='https://www.yelp.com/search?find_desc='+encodeURIComponent(r.name)+'&find_loc='+encodeURIComponent(loc);return `<span class="resource-review-links" aria-label="Review sites"><a href="${g}" target="_blank" rel="noopener" aria-label="Google reviews" title="Google reviews"><img alt="" src="https://www.google.com/s2/favicons?domain=google.com&sz=32"></a><a href="${y}" target="_blank" rel="noopener" aria-label="Yelp reviews" title="Yelp reviews"><img alt="" src="https://www.google.com/s2/favicons?domain=yelp.com&sz=32"></a></span>`;}
function townMark(r){return isTown(r)?'<span class="resource-town-mark" title="Official Town of Norwood resource"><img src="https://upload.wikimedia.org/wikipedia/commons/5/5f/Seal_of_Norwood%2C_Massachusetts.png" alt=""><span class="sr-only">Official Town of Norwood resource</span></span>':'';}
function card(r){return `<article class="resource-item"><div class="resource-meta"><span class="badge">${esc(r.category||'Resource')}</span><span class="coverage">${esc(r.coverage||'')}</span></div><div class="resource-title-row"><a class="resource-name" href="${esc(r.url)}" target="_blank" rel="noopener"><b>${esc(r.name)}</b> ${townMark(r)} <span aria-hidden="true">↗</span></a><span class="resource-card-actions">${reviewLinks(r)}${socialLinks(r)}</span></div><p>${esc(r.description||'')}</p></article>`;}
function relevance(r,t,q){let s=0,hay=haystack(r);if(t&&(r.topics||[])[0]===t[0])s+=60;if((r.coverage||'').toLowerCase()==='local')s+=25;if(t?.[0]==='veterans'&&/veteran|military|\bva\b/i.test(hay))s+=50;if(t?.[0]==='kids'&&/special education|sepac|\biep\b/i.test(hay)&&!q)s-=25;return s;}
function globalRelevance(r,q){
 const hay=haystack(r); let score=0;
 const raw=q.toLowerCase().trim();
 if((r.name||'').toLowerCase().includes(raw)) score+=80;
 for(const group of queryGroups(q)) for(const term of group){if((r.name||'').toLowerCase().includes(term))score+=25;else if(hay.includes(term))score+=8;}
 if((r.coverage||'').toLowerCase()==='local')score+=10;
 return score;
}
function render(q=''){
 const root=$('#resourceTopics'), nav=$('#topicNav'), status=$('#resourceSearchStatus'), clear=$('#clearResourceSearch');
 if(!root)return;
 const query=q.trim();
 if(query){
   const rows=all.filter(r=>matchesQuery(r,query)).sort((a,b)=>globalRelevance(b,query)-globalRelevance(a,query)||a.name.localeCompare(b.name));
   if(nav) nav.hidden=true;
   if(clear) clear.hidden=false;
   if(status) status.textContent=`${rows.length} ${rows.length===1?'resource':'resources'} match “${query}”.`;
   root.innerHTML=crisisHelp(query)+(rows.length?`<section class="topic-section search-results-section"><p class="eyebrow">SEARCH RESULTS</p><h2>${rows.length} ${rows.length===1?'match':'matches'} for “${esc(query)}”</h2><p class="sub">Results are shown once each, with local resources given extra weight.</p><div class="resource-list">${rows.map(card).join('')}</div></section>`:`<section class="topic-section search-results-section"><p class="eyebrow">SEARCH RESULTS</p><h2>No matches found</h2><p class="sub">Try a shorter phrase or a different description of what you need.</p></section>`);
   return;
 }
 if(nav) nav.hidden=false;
 if(clear) clear.hidden=true;
 if(status) status.textContent='Browse by topic below, or search in plain language.';
 root.innerHTML=topics.map(t=>{let rows=all.filter(r=>belongs(r,t)).sort((a,b)=>relevance(b,t,'')-relevance(a,t,'')||a.name.localeCompare(b.name));const open=location.hash===`#${t[0]}`?' open':'';return `<details class="topic-section topic-disclosure" id="${t[0]}"${open}><summary><span><small>RESOURCE TOPIC</small><b>${t[1]} <em class="topic-count">${rows.length}</em></b><span>${t[2]}</span></span><i aria-hidden="true">⌄</i></summary><div class="topic-disclosure-body"><div class="resource-list">${rows.map(card).join('')||'<p>No resources found in this topic.</p>'}</div></div></details>`;}).join(''); requestAnimationFrame(()=>{const id=location.hash.slice(1);if(!id)return;const el=document.getElementById(id);if(el){el.open=true;setTimeout(()=>el.scrollIntoView({block:'start'}),0);}});
}
function loadResources(d){
 all=Array.isArray(d)?d:[];
 const total=$('#resourceCount'); if(total)total.textContent=`${all.length} verified/curated entries in this build.`;
 render($('#needSearch')?.value||'');
}
const input=$('#needSearch'), form=$('#resourceSearchForm'), clear=$('#clearResourceSearch');
input?.addEventListener('input',e=>render(e.target.value));
input?.addEventListener('search',e=>render(e.target.value));
form?.addEventListener('submit',e=>{e.preventDefault();render(input?.value||'');$('#resourceTopics')?.scrollIntoView({behavior:'smooth',block:'start'});});
clear?.addEventListener('click',()=>{if(input)input.value='';render('');input?.focus();});
window.addEventListener('hashchange',()=>{if(input?.value)return;const id=location.hash.slice(1);const el=id&&document.getElementById(id);if(el){el.open=true;el.scrollIntoView({behavior:'smooth',block:'start'});}});
if(window.NORWOOD_RESOURCES){loadResources(window.NORWOOD_RESOURCES)}else{fetch('data/resources.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}).then(loadResources).catch(()=>{const total=$('#resourceCount');if(total)total.textContent='Resource data could not be loaded.';});}
})();
