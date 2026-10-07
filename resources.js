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
['basic-needs','Food & Basic Needs','Help with essential necessities, including food assistance, clothing, diapers, period products and other basic-needs support.',['food assistance','food-assistance','basic-needs','clothing','clothes','diaper','period products','hygiene','pantry','meal','snap','wic','nutrition','hunger','essential needs']],
['health','Disability, Mental Health & Addiction','Disability, accessibility, mental-health, crisis, addiction and recovery resources.',['disability','mental','special needs','human services','crisis','autism','deaf','blind','recovery','addiction']],
['medical','Medical & Health','Hospitals, urgent care, primary care, rehabilitation and other health-care services. Pregnancy, postpartum and lactation support is also linked in its own section.',['medical','health care','healthcare','hospital','urgent care','primary care','physician','doctor','clinic','physical therapy','rehab','pharmacy','audiology','vaccin']],
['pregnancy','Pregnancy, Postpartum & Lactation','Prenatal and postpartum support, lactation and infant-feeding help, parent groups, classes and pregnancy-loss resources.',['pregnancy','pregnant','prenatal','perinatal','postpartum','maternity','lactation','breastfeeding','infant feeding','childbirth','doula','newborn','new parent','pregnancy loss','miscarriage','stillbirth']],
['dental','Dental & Orthodontics','Dentists, orthodontists and oral-health services.',['dentist','dental','orthodontist','orthodontics','oral health']],
['wellness','Spas, Salons & Massage','Spas, salons, massage and related personal-care and wellness services.',['spa','salon','massage','hair','wellness','halotherapy','salt room']],
['transport','Transportation','Bus, commuter rail, accessible transportation and local mobility.',['mbta','transit','transport','airport','rail','bus','ride','paratransit']],
['employment','Employment','Job search, career development, vocational rehabilitation, workforce training and employment supports.',['job','employment','career','workforce','vocational','resume','masshire']],
['financial-assistance','Money, Benefits & Financial Assistance','Benefits, financial assistance, taxes, scholarships and practical financial support.',['benefit','financial','scholarship','unemployment','tax','social security','cash assistance']],
['domestic-violence','Domestic Violence Support','Confidential help, advocacy, safety planning, shelter and legal resources for people experiencing domestic or partner violence.',['domestic violence','partner violence','abuse','safety planning','shelter','restraining order','DOVE']],
['immigration','Immigration & ICE Help','Immigration, refugee and asylum support, Know Your Rights information, detention and deportation help, language access and legal resources.',['immigration','immigrant','ice','deportation','detention','asylum','refugee','visa','citizenship','naturalization','undocumented','immigration-language']],
['legal','Legal Help & Advocacy','Legal aid, rights information, advocacy and help finding appropriate legal assistance.',['legal','lawyer','attorney','legal aid','rights','advocacy','legal-advocacy']],
['safety','Safety & Crisis Help','Crisis, victim-support, safety-planning and emergency-support resources.',['safety','crisis','victim','violence','abuse','hotline','safety-crisis']],
['lgbtq','LGBTQ+ Support','Support, health, community and advocacy resources for LGBTQ+ people and families.',['lgbtq','gay','lesbian','bisexual','transgender','trans','queer','nonbinary','lgbtq-support']],

['community','Community & Belonging','Civic groups, volunteering, clubs and community connections.',['civic','volunteer','community','rotary','elks','club','immigrant','lgbtq']],
['worship','Houses of Worship','Churches, temples, synagogues, mosques and nearby faith communities.',['worship','religious','faith','church','temple','synagogue','mosque','parish','congregation','jewish','muslim','hindu','catholic','baptist','episcopal','unitarian']],
['todo','Things to Do','Library, recreation, arts, sports, trails, parks and history.',['library','recreation','arts','culture','theatre','trail','sport','history','park','museum']],
['town','Town Services & Government','Town departments, public safety, permits, voting and everyday municipal services.',['town','board','police','fire','clerk','public works','building','planning','health','government','election','trash','assessor']],
['business','Business & Local Economy','Business groups, downtown organizations, entrepreneurs and employment resources.',['business','chamber','downtown','center','entrepreneur','startup']]
];
let all=[];
let howDoItems=[];
const businesses=window.NORWOOD_BUSINESSES||[];
const businessTopicRules={dental:/dental|orthodont/i,medical:/physical therapy|chiropractic|optometry|audiology|hearing|pharmac|medical|dental|orthodont/i,wellness:/salon|barber|beauty|massage|personal care/i,realestate:/real estate|realtor/i,kids:/childcare|preschool|swim school|martial arts|gymnastics|cheer/i,youth:/swim school|martial arts|gymnastics|cheer/i,wellness:/spa|salon|barber|beauty|massage|personal care/i,services:/driving school|laundry|dry cleaning|tailor|computer repair|printing|shipping|rental/i,business:/manufacturing|engineering|printing|office|financial|accounting|legal|insurance|computer/i};
function businessesForTopic(id){const rule=businessTopicRules[id];if(!rule)return[];return businesses.filter(b=>rule.test(`${b.category||''} ${(b.tags||[]).join(' ')}`));}
function businessResource(b){return {name:b.name,category:b.category,description:[b.address,b.phone].filter(Boolean).join(' · '),url:b.website||'',coverage:'Norwood business',_business:true};}
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
function belongs(r,t){
 const explicit=Array.isArray(r.topics)&&r.topics.length;
 const hay=haystack(r);
 if(t[0]==='health'){
   const disabilityMentalAddiction=/disability|disabled|accessib|mental health|behavioral health|psychiatr|crisis|suicid|addiction|substance|recovery|alcohol|drug|autism|developmental|deaf|hard of hearing|blind|interpreter|paratransit/i;
   return disabilityMentalAddiction.test(hay);
 }
 if(t[0]==='pregnancy'){
   const pregnancySupport=/pregnan|prenatal|perinatal|postpartum|maternity|lactat|breastfeed|infant feeding|childbirth|doula|newborn|new parent|miscarriage|stillbirth|pregnancy loss/i;
   return (explicit&&r.topics.includes('pregnancy'))||pregnancySupport.test(hay);
 }
 if(t[0]==='medical'){
   const medicalHealth=/medical|health care|healthcare|hospital|urgent care|primary care|physician|doctor|clinic|physical therapy|rehab|pharmac|audiolog|hearing aid|vaccin|immuniz|nursing|home health/i;
   return (explicit&&r.topics.includes('medical'))||medicalHealth.test(hay);
 }
 if(explicit){
   const aliases={
     safety:['safety','safety-crisis'],
     immigration:['immigration','immigration-language'],
     legal:['legal','legal-advocacy'],
     lgbtq:['lgbtq','lgbtq-support'],
     housing:['housing','housing-assistance'],
     employment:['employment','jobs'],
     kids:['kids','education-family','family-support'],
     community:['community','community-groups','volunteer'],
     'basic-needs':['basic-needs','food-assistance']
   };
   if(aliases[t[0]])return aliases[t[0]].some(id=>r.topics.includes(id));
   return r.topics.includes(t[0]);
 }
 return t[3].some(k=>hay.includes(k));
}
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
function isNorwoodPublicSchool(r){return /^https?:\/\/([^/]+\.)?norwood\.k12\.ma\.us\//i.test(r.url||'')||/^(Norwood High School|Coakley Middle School|Balch Elementary School|Callahan Elementary School|Cleveland Elementary School|Oldham Elementary School|Prescott Elementary School|Willett Elementary School)$/i.test(r.name||'');}
function isBusiness(r){const h=haystack(r),provider=(r.provider_type||'').toLowerCase(),cat=(r.category||'').toLowerCase();return /^private\b/.test(provider)||/^private\b/.test(cat)||(r.topics||[]).includes('services')||(r.topics||[]).includes('realestate')||(r.topics||[]).includes('wellness')||/local service|driving school|realtor|real estate|barber|laundromat|dry clean|spa|salon|massage|dentist|orthodont|martial arts|gymnastics|music school|ice cream|restaurant|veterinar|contractor|plumb|electrician|hvac/i.test(h);}
function reviewLinks(r){if(!isBusiness(r))return'';const links=[];if(r.googleReviews)links.push(`<a href="${esc(r.googleReviews)}" target="_blank" rel="noopener" aria-label="Google reviews" title="Google reviews"><img alt="" src="https://www.google.com/s2/favicons?domain=google.com&sz=32"></a>`);if(r.yelp)links.push(`<a href="${esc(r.yelp)}" target="_blank" rel="noopener" aria-label="Yelp reviews" title="Yelp reviews"><img alt="" src="https://www.google.com/s2/favicons?domain=yelp.com&sz=32"></a>`);if(r.tripadvisor)links.push(`<a href="${esc(r.tripadvisor)}" target="_blank" rel="noopener" aria-label="Tripadvisor reviews" title="Tripadvisor reviews"><img alt="" src="https://www.google.com/s2/favicons?domain=tripadvisor.com&sz=32"></a>`);return links.length?`<span class="resource-review-links" aria-label="Verified review-site listings">${links.join('')}</span>`:'';}
function townMark(r){const school=isNorwoodPublicSchool(r),town=isTown(r);if(!school&&!town)return'';const label=school?'Official Norwood Public Schools resource':'Official Town of Norwood resource';return '<span class="resource-town-mark" title="'+label+'"><img src="https://upload.wikimedia.org/wikipedia/commons/5/5f/Seal_of_Norwood%2C_Massachusetts.png" alt=""><span class="sr-only">'+label+'</span></span>';}
function card(r){const title=r.url?`<a class="resource-name" href="${esc(r.url)}" target="_blank" rel="noopener"><b>${esc(r.name)}</b> ${townMark(r)} <span aria-hidden="true">↗</span></a>`:`<span class="resource-name resource-name-no-link"><b>${esc(r.name)}</b> ${townMark(r)}</span>`;return `<article class="resource-item"><div class="resource-meta"><span class="badge">${esc(r.category||'Resource')}</span><span class="coverage">${esc(r.coverage||'')}</span></div><div class="resource-title-row">${title}<span class="resource-card-actions">${reviewLinks(r)}${socialLinks(r)}</span></div><p>${esc(r.description||'')}</p></article>`;}
function isLocalResource(r){const coverage=(r.coverage||'').toLowerCase();return coverage==='local'||/^norwood(?:\b|\/)/i.test(coverage)||isTown(r)||isNorwoodPublicSchool(r)||/^norwood\b/i.test(r.name||'');}
function geographyRank(r){
 const coverage=(r.coverage||'').toLowerCase(),name=(r.name||'').toLowerCase();
 if(isTown(r)||isNorwoodPublicSchool(r)||coverage==='local'||/^norwood(?:\b|\/)/i.test(coverage)||/^norwood\b/.test(name))return 4;
 if(/nearby|regional|greater boston|metrowest|local\/regional|massachusetts \/ greater boston|south shore|boston area/.test(coverage))return 3;
 if(/statewide|massachusetts|\bstate\b/.test(coverage))return 2;
 if(/national|federal|united states|nationwide/.test(coverage))return 1;
 return 2;
}
function directHelpRank(r){
 const h=haystack(r);
 let s=0;
 if(/hotline|helpline|call|text|apply|application|appointment|counsel|treatment|shelter|food pantry|meal|transportation|ride|legal aid|advocacy|benefit|financial assistance|case management|support group|peer support|health care|healthcare|clinic|services?\b/.test(h))s+=2;
 if(/information|guide|directory|finder|lookup|overview|resource list|resources? supporting|commission resources/.test(h))s-=1;
 return s;
}
function basicNeedsKind(r){
 const h=haystack(r);
 if(/food pantry|little free food|blessings box|foodsource|find food|snap\b|wic\b|school meal|summer eats|sun bucks|summer ebt|meals on wheels|nutrition|hunger|grocer|meal\b|food assistance|food-assistance/.test(h))return'food';
 if(/diaper|period product|menstrual|hygiene/.test(h))return'hygiene';
 if(/furniture|household|restore|home goods/.test(h))return'household';
 if(/clothing|clothes|coat|closet/.test(h))return'clothing';
 return'other';
}
function foodPriority(r){
 const n=(r.name||'').toLowerCase();
 if(/^norwood food pantry$/.test(n))return 10000;
 if(/little free food pantry|blessings box/.test(n))return 9500;
 if(/^norwood wic$/.test(n))return 9000;
 if(/snap & wic information — norwood food pantry/.test(n))return 8800;
 if(/greater boston food bank|project bread/.test(n))return 8200;
 if(/massachusetts snap|massachusetts wic|school meals|summer eats|sun bucks/.test(n))return 7600;
 if(basicNeedsKind(r)==='food')return 7000;
 return 0;
}
function basicNeedsFilters(rows){
 const defs=[
  ['food','Food'],
  ['all','All Basic Needs'],
  ['hygiene','Diapers & Hygiene'],
  ['clothing','Clothing'],
  ['household','Furniture & Household'],
  ['other','Other Essentials']
 ];
 return defs.filter(([id])=>id==='all'||rows.some(r=>basicNeedsKind(r)===id));
}

function topicFilterKind(topicId,r){
 const h=haystack(r),topics=Array.isArray(r.topics)?r.topics:[];
 if(topicId==='health'){
   if(topics.includes('recovery')||/addiction|substance use|alcohol|narcotics|gambl|recovery|treatment locator/.test(h))return'recovery';
   if(topics.includes('deaf-hard-of-hearing')||/deaf|hard of hearing|\bmcdhh\b|cart referral|hearing loss/.test(h))return'deaf';
   if(topics.includes('disability-support')||/disability|disabled|autism|developmental|brain injury|blind|paratransit|accessibility/.test(h))return'disability';
   if(topics.includes('mental-health')||/mental health|behavioral health|psychiatr|suicid|crisis|therapy|nami|interface/.test(h))return'mental';
   return'other';
 }
 if(topicId==='immigration'){
   if(/^private\b/i.test(r.provider_type||'')||/private immigration attorney/.test((r.category||'').toLowerCase()))return'private';
   if(/ice|detain|deport|removal|rapid response|know your rights|family emergency planning|law enforcement/.test(h))return'urgent';
   if(topics.includes('legal-advocacy')||/legal|lawyer|attorney|asylum|counsel/.test(h))return'legal';
   return'newcomer';
 }
 if(topicId==='housing'){
   if(/emergency family shelter|homebase|raft|homeless|shelter|eviction/.test(h))return'urgent';
   if(/housing authority|public housing|affordable housing|champ|housing navigator|masshousing|my mass home/.test(h))return'affordable';
   if(/utility|energy|fuel|heat|weatherization|heartwap|electric/.test(h))return'utility';
   if(topics.includes('legal-advocacy')||/tenant|legal|discrimination|consumer/.test(h))return'rights';
   return'other';
 }
 if(topicId==='older'){
   if(/senior center|council on aging|newsletter|calendar|memory café|adult day/.test(h))return'local';
   if(/meal|food|nutrition/.test(h))return'food';
   if(/ride|transport|paratransit/.test(h))return'transport';
   if(/medicare|prescription|health|dementia|alzheimer|mental health/.test(h))return'health';
   if(/benefit|financial|tax|social security|legal/.test(h))return'benefits';
   return'other';
 }
 if(topicId==='pregnancy'){
   if(/pregnancy loss|miscarriage|stillbirth|infant loss|bereavement|grief/.test(h))return'loss';
   if(/breastfeed|lactat|infant feeding|breast pump/.test(h))return'lactation';
   if(/postpartum|perinatal mental|postpartum depression|postpartum anxiety|maternal mental health/.test(h))return'postpartum';
   return'general';
 }
 if(topicId==='legal'){
   if(topics.includes('immigration-language')||/immigration|ice\b|asylum|refugee|deport|detention/.test(h))return'immigration';
   if(topics.includes('housing')||topics.includes('housing-assistance')||/tenant|eviction|housing/.test(h))return'housing';
   if(topics.includes('domestic-violence')||topics.includes('safety-crisis')||/domestic violence|sexual assault|rape crisis|victim/.test(h))return'safety';
   if(topics.includes('disability-support')||/disability|discrimination|civil rights|\bada\b/.test(h))return'rights';
   return'general';
 }
 if(topicId==='employment'){
   if(topics.includes('immigration-language')||/refugee|immigrant|newcomer/.test(h))return'newcomer';
   if(topics.includes('disability-support')||/vocational rehabilitation|massability|blind|deaf|disability/.test(h))return'disability';
   if(/unemployment|paid family|medical leave|pfml/.test(h))return'benefits';
   if(/training|workforce|career development|internship|apprentice|resume|education|vocational/.test(h))return'training';
   if(/masshire|job search|employment opportunities|help wanted|career center|find a job/.test(h))return'jobs';
   return'other';
 }
 return'all';
}
function topicFilterDefs(topicId,rows){
 const defs={
  health:[['all','All'],['mental','Mental Health & Crisis'],['recovery','Addiction & Recovery'],['disability','Disability & Accessibility'],['deaf','Deaf & Hard of Hearing'],['other','Other Support']],
  immigration:[['all','All'],['urgent','ICE / Detention / Know Your Rights'],['legal','Free & Nonprofit Legal Help'],['private','Private Attorneys'],['newcomer','Newcomer & Language Support']],
  housing:[['all','All'],['urgent','Emergency Housing & Eviction'],['affordable','Public & Affordable Housing'],['utility','Utilities & Energy'],['rights','Tenant Rights & Legal Help'],['other','Other Housing Help']],
  older:[['all','All'],['local','Norwood Senior Services'],['health','Health & Caregiving'],['transport','Transportation'],['food','Meals & Food'],['benefits','Benefits & Legal'],['other','Other Support']],
  pregnancy:[['all','All'],['general','Pregnancy & General Support'],['postpartum','Postpartum Mental Health'],['lactation','Lactation & Feeding'],['loss','Pregnancy Loss & Grief']],
  legal:[['all','All'],['general','General Legal Help'],['housing','Housing & Tenant'],['immigration','Immigration'],['rights','Disability & Civil Rights'],['safety','Domestic & Sexual Violence']],
  employment:[['all','All'],['jobs','Job Search'],['training','Training & Career Development'],['benefits','Unemployment & Leave'],['disability','Disability Employment'],['newcomer','Newcomer Employment'],['other','Other Employment Help']]
 };
 const list=defs[topicId]||[];
 return list.filter(([id])=>id==='all'||rows.some(r=>topicFilterKind(topicId,r)===id));
}

function relevance(r,t,q){
 const topics=Array.isArray(r.topics)?r.topics:[],hay=haystack(r);
 let s=0;
 // Relevance is primary. Geography only separates resources of roughly similar usefulness.
 if(t&&topics[0]===t[0])s+=500;
 else if(t&&topics.includes(t[0]))s+=340;
 else if(t&&t[3].some(k=>hay.includes(k)))s+=180;
 s+=directHelpRank(r)*55;
 s+=geographyRank(r)*25;
 if(t?.[0]==='veterans'&&/^Norwood Veterans Services$/i.test(r.name||''))s+=1000;
 if(t?.[0]==='kids'&&/special education|sepac|\biep\b/i.test(hay)&&!q)s-=25;
 return s;
}
function globalRelevance(r,q){
 const hay=haystack(r); let score=0;
 const raw=q.toLowerCase().trim();
 if((r.name||'').toLowerCase().includes(raw)) score+=80;
 for(const group of queryGroups(q)) for(const term of group){if((r.name||'').toLowerCase().includes(term))score+=25;else if(hay.includes(term))score+=8;}
 if((r.coverage||'').toLowerCase()==='local')score+=10;
 return score;
}
function howDoMatches(q){
 const terms=queryGroups(q).flat();
 return howDoItems.map(x=>{const h=(x.title+' '+x.text+' '+x.keywords).toLowerCase();let score=0;if(x.title.toLowerCase().includes(q.toLowerCase()))score+=80;terms.forEach(t=>{if(x.title.toLowerCase().includes(t))score+=24;else if(h.includes(t))score+=8});return{x,score};}).filter(o=>o.score>0).sort((a,b)=>b.score-a.score).slice(0,8);
}
function howDoSearchHtml(q){
 const raw=q.toLowerCase().trim();
 const gateway=/^how(?:\s|$)|^how\s+do\s+i/.test(raw)?'<div class="library-things-search-callout howdo-search-callout"><span class="library-things-badge">HOW DO I?</span><b>Looking for a quick answer?</b><p>Browse practical answers to common Norwood questions, with direct links to official forms, departments and resources.</p><a href="how-do-i.html">Open How Do I? →</a></div>':'';
 const hits=howDoMatches(q);
 if(!hits.length)return gateway;
 return gateway+'<section class="topic-section search-results-section resource-howdo-search-results"><p class="eyebrow">HOW DO I?</p><h2>'+hits.length+' quick answer'+(hits.length===1?'':'s')+'</h2><div class="resource-list">'+hits.map(({x})=>'<article class="resource-item"><div class="resource-meta"><span class="badge">How Do I?</span></div><div class="resource-title-row"><a class="resource-name" href="how-do-i.html#'+esc(x.id)+'"><b>'+esc(x.title)+'</b> <span aria-hidden="true">→</span></a></div><p>'+esc(x.text.slice(0,220))+(x.text.length>220?'…':'')+'</p></article>').join('')+'</div></section>';
}
function render(){
 const root=$('#resourceTopics');
 if(!root)return;
 const id=location.hash.slice(1);
 const t=topics.find(x=>x[0]===id);
 if(!t){root.innerHTML='';return;}
 const topicRows=all.filter(r=>belongs(r,t));
 let rows=topicRows.filter(r=>!isBusiness(r)).sort((a,b)=>{
   if(t[0]==='basic-needs'){
     const fp=foodPriority(b)-foodPriority(a);
     if(fp)return fp;
   }
   return relevance(b,t,'')-relevance(a,t,'')||a.name.localeCompare(b.name);
 });
 const related=[...topicRows.filter(isBusiness),...businessesForTopic(t[0]).map(businessResource)];
 const seenBiz=new Set();
 const biz=related.filter(b=>{const k=(b.name||'').toLowerCase().trim();if(!k||seenBiz.has(k))return false;seenBiz.add(k);return true;}).sort((a,b)=>a.name.localeCompare(b.name));
 const relatedBusinesses=biz.length?`<details class="resource-related-businesses"><summary><strong>Related Businesses</strong> <span>Local for-profit options (${biz.length})</span></summary><div class="resource-list">${biz.map(card).join('')}</div><p class="resource-related-note"><a href="businesses.html">Browse the full Norwood Business Directory →</a></p></details>`:'';
 const businessGateway=t[0]==='medical'?'<a class="trash-resource-link resource-business-gateway" href="businesses.html#health"><b>Looking for a medical provider?</b><span>Browse local health, dental & wellness businesses →</span></a>':'';
 const basicFilters=t[0]==='basic-needs'?basicNeedsFilters(rows):[];
 const foodControls=t[0]==='basic-needs'?'<div class="resource-basic-needs-tools"><div class="resource-filter-row" role="group" aria-label="Basic needs filters">'+basicFilters.map(([id,label])=>'<button type="button" class="resource-filter'+(id==='food'?' is-active':'')+'" data-basic-filter="'+id+'">'+label+'</button>').join('')+'</div><button type="button" class="resource-mini-pantry-button" data-open-mini-pantries>🥫 Little Food Pantries — locations & map</button></div>':'';
 const extraFilterDefs=topicFilterDefs(t[0],rows);
 const extraControls=extraFilterDefs.length?'<div class="resource-basic-needs-tools"><div class="resource-filter-row" role="group" aria-label="'+esc(t[1])+' filters">'+extraFilterDefs.map(([id,label],i)=>'<button type="button" class="resource-filter'+(i===0?' is-active':'')+'" data-topic-filter="'+id+'">'+esc(label)+'</button>').join('')+'</div></div>':'';
 const foodJumpLinks=t[0]==='basic-needs'?'<div class="resource-topic-jumps" aria-label="Related help"><a href="#housing"><b>Housing Help</b><span>Rent, shelter & tenant support →</span></a><a href="#financial-assistance"><b>Benefits & Cash Assistance</b><span>Financial help and public benefits →</span></a><a href="utilities.html"><b>Utilities & Energy</b><span>Electric, heat, water & internet help →</span></a></div>':'';
 const safetyEmergencyNote=t[0]==='safety'?'<div class="resource-crisis" role="note"><strong>If there is an emergency or immediate danger, call <a href="tel:911">911</a> now.</strong><p>The resources below serve different needs. Read each description to choose the service that best matches the situation.</p></div>':'';
  root.innerHTML=`<section class="topic-section selected-resource-topic" id="selected-${esc(t[0])}"><button class="resource-back" type="button">← All resource categories</button><p class="eyebrow">RESOURCE TOPIC</p><h2>${esc(t[1])}</h2><p class="sub">${esc(t[2])}</p>${safetyEmergencyNote}${foodControls}${extraControls}${foodJumpLinks}${businessGateway}<div class="resource-list">${rows.map(r=>'<div class="resource-filter-item" data-basic-kind="'+basicNeedsKind(r)+'" data-topic-kind="'+topicFilterKind(t[0],r)+'">'+card(r)+'</div>').join('')||'<p>No nonprofit, public or community resources found in this topic.</p>'}</div>${relatedBusinesses}</section>`;
 root.querySelector('.resource-back')?.addEventListener('click',()=>{history.pushState(null,'',location.pathname);render();document.querySelector('.resource-start')?.scrollIntoView({behavior:'smooth',block:'start'});});
 if(t[0]==='basic-needs'){
   const applyBasicFilter=id=>{
     root.querySelectorAll('[data-basic-filter]').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.basicFilter===id));
     root.querySelectorAll('.resource-filter-item').forEach(el=>{el.hidden=id!=='all'&&el.dataset.basicKind!==id;});
   };
   root.querySelectorAll('[data-basic-filter]').forEach(btn=>btn.addEventListener('click',()=>applyBasicFilter(btn.dataset.basicFilter)));
   applyBasicFilter('food');
   root.querySelector('[data-open-mini-pantries]')?.addEventListener('click',()=>{
     document.getElementById('miniPantriesOpen')?.click();
   });
 }
 if(extraFilterDefs.length){
   const applyTopicFilter=id=>{
     root.querySelectorAll('[data-topic-filter]').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.topicFilter===id));
     root.querySelectorAll('.resource-filter-item').forEach(el=>{el.hidden=id!=='all'&&el.dataset.topicKind!==id;});
   };
   root.querySelectorAll('[data-topic-filter]').forEach(btn=>btn.addEventListener('click',()=>applyTopicFilter(btn.dataset.topicFilter)));
 }
 requestAnimationFrame(()=>root.scrollIntoView({behavior:'smooth',block:'start'}));
}
function loadResources(d){
 all=Array.isArray(d)?d:[];
 const total=$('#resourceCount'); if(total)total.textContent=`${all.length} curated entries in this build.`;
 render();
}
window.addEventListener('hashchange',render);
if(window.NORWOOD_RESOURCES){loadResources(window.NORWOOD_RESOURCES)}else{fetch('data/resources.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}).then(loadResources).catch(()=>{const total=$('#resourceCount');if(total)total.textContent='Resource data could not be loaded.';});}
})();
