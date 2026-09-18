(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const topics=[
['services','Everyday Local Services','Practical local businesses for everyday needs such as laundry, haircuts and personal services.',['laundromat','laundry','barber','haircut','dry cleaning','local service']],
['kids','Kids, Families & Education','Schools, special education, childcare, youth activities and family support.',['education','school','student','youth','child','family','parent','scholarship','sport','sepac','special education','daycare','preschool']],
['youth','Youth Sports & Activities','Local leagues, clubs, classes, scouting, arts and other activities for children and teens.',['youth','sport','league','cheer','cheerleading','gymnastics','lacrosse','baseball','softball','soccer','hockey','basketball','swim','track','field hockey','dance','martial arts','scout','music','skating']],
['older','Older Adults & Caregivers','Senior services, meals, transportation, activities, benefits and caregiver support.',['senior','aging','older','caregiver','meals on wheels','medicare','dementia']],
['veterans','Veterans & Military Families','Local, state and federal help for veterans and military families.',['veteran','military','va','legion']],
['housing','Housing & Utilities','Housing, rent, tenant help, utilities, energy, power and broadband.',['housing','utility','electric','light','broadband','water','tenant','home','rent','eviction','heat']],
['food','Food & Basic Needs','Food assistance, groceries, meals, nutrition and essential-needs support.',['food','pantry','meal','snap','wic','bread','nutrition','grocer','hunger']],
['health','Health, Disability & Mental Health','Health care, disability, accessibility, recovery and behavioral health resources.',['health','disability','mental','special needs','human services','crisis','autism','deaf','blind','recovery']],
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
 rent:['rent','rental','housing','tenant','raft','eviction'],evicted:['evicted','eviction','housing','tenant','raft'],
 food:['food','pantry','meal','meals','snap','wic','groceries','hunger'],groceries:['groceries','food','pantry','snap'],hungry:['hungry','hunger','food','pantry','snap'],
 elderly:['elderly','senior','older','aging','caregiver'],old:['older','senior','aging'],wheelchair:['wheelchair','disability','accessible','paratransit'],
 job:['job','jobs','employment','career','masshire'],lawyer:['lawyer','legal','rights'],english:['english','esl','ell','multilingual','language','immigrant'],
 gay:['gay','lgbtq','queer'],trans:['trans','transgender','lgbtq'],vet:['vet','veteran','military'],church:['church','worship','faith','congregation'],synagogue:['synagogue','jewish','worship'],mosque:['mosque','muslim','islam','worship'],temple:['temple','hindu','jewish','worship'],jewish:['jewish','synagogue','temple','worship'],muslim:['muslim','islam','mosque','worship'],hindu:['hindu','temple','mandir','worship'],cheer:['cheer','cheerleading','tumbling'],gymnastics:['gymnastics','gymnastic','tumbling'],lacrosse:['lacrosse','lax'],scouts:['scouts','scouting','cub scouts','girl scouts'],dance:['dance','ballet','acro'],skating:['skating','ice skating','learn to skate'],martial:['martial arts','karate','taekwondo','jiu jitsu']
};
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
function card(r){return `<article class="resource-item"><div class="resource-meta"><span class="badge">${esc(r.category||'Resource')}</span><span class="coverage">${esc(r.coverage||'')}</span></div><div class="resource-title-row"><a class="resource-name" href="${esc(r.url)}" target="_blank" rel="noopener"><b>${esc(r.name)}</b> <span aria-hidden="true">↗</span></a>${socialLinks(r)}</div><p>${esc(r.description||'')}</p></article>`;}
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
   root.innerHTML=rows.length?`<section class="topic-section search-results-section"><p class="eyebrow">SEARCH RESULTS</p><h2>${rows.length} ${rows.length===1?'match':'matches'} for “${esc(query)}”</h2><p class="sub">Results are shown once each, with local resources given extra weight.</p><div class="resource-list">${rows.map(card).join('')}</div></section>`:`<section class="topic-section search-results-section"><p class="eyebrow">SEARCH RESULTS</p><h2>No matches found</h2><p class="sub">Try a shorter phrase or a different description of what you need.</p></section>`;
   return;
 }
 if(nav) nav.hidden=false;
 if(clear) clear.hidden=true;
 if(status) status.textContent='Browse by topic below, or search in plain language.';
 root.innerHTML=topics.map(t=>{let rows=all.filter(r=>belongs(r,t)).sort((a,b)=>relevance(b,t,'')-relevance(a,t,'')||a.name.localeCompare(b.name));return `<section class="topic-section" id="${t[0]}"><p class="eyebrow">RESOURCE TOPIC</p><h2>${t[1]} <span class="topic-count">${rows.length}</span></h2><p class="sub">${t[2]}</p><div class="resource-list">${rows.map(card).join('')||'<p>No resources found in this topic.</p>'}</div></section>`;}).join('');
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
if(window.NORWOOD_RESOURCES){loadResources(window.NORWOOD_RESOURCES)}else{fetch('data/resources.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}).then(loadResources).catch(()=>{const total=$('#resourceCount');if(total)total.textContent='Resource data could not be loaded.';});}
})();
