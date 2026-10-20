(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const form=$('#foodSearchForm'), search=$('#foodSearch'), category=$('#foodCategory'), directory=$('#restaurantDirectory'), count=$('#restaurantCount'), clear=$('#clearFoodFilters');
  if(!search||!category||!directory||!count||!clear) return;
  let restaurants=Array.isArray(window.NORWOOD_RESTAURANTS)?window.NORWOOD_RESTAURANTS:[];

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
    'ice cream':['ice cream cone','ice cream sundae','sundae','soft serve','soft serve ice cream'],
    'chicken tenders':['chicken fingers','chicken strips'],
    'mozzarella sticks':['mozz sticks','fried mozzarella'],
    'steak and cheese':['cheesesteak','philly cheesesteak','steak cheese'],
    'mac and cheese':['macaroni and cheese','mac n cheese','macaroni cheese'],
    'boba':['bubble tea','boba tea','milk tea'],
    'acai bowl':['acai bowls','açaí bowl','açaí bowls'],
    'shawarma':['shawerma','shwarma'],
    'kebab':['kabob','kabobs','kebabs'],
    'pupusa':['pupusas'],
    'biryani':['biriyani','briyani'],
    'naan':['nan','naan bread'],
    'samosa':['samosas'],
    'fried rice':['pork fried rice','chicken fried rice','vegetable fried rice'],
    'lo mein':['lomein'],
    'dumplings':['gyoza','potstickers'],
    'calamari':['fried calamari','calamari fritti'],
    'arancini':['rice balls','fried risotto balls'],
    'chicken wings':['wings','buffalo wings'],
    'pancakes':['hotcakes','flapjacks'],
    'french toast':['pain perdu'],
    'ice cream shake':['milkshake','milkshakes','frappe','frappes'],
    'chicken tikka masala':['tikka masala'],
    'butter chicken':['murgh makhani'],
    'chicken parmesan':['pollo alla parmigiana','pollo parmigiana'],
    'eggplant parmesan':['melanzane alla parmigiana','eggplant parmigiana'],
    'souvlaki':['souvlakia'],
    'spanakopita':['spinach pie'],
    'tzatziki':['cucumber yogurt sauce']
  };
  // Correct common food spelling errors and one-edit typos only against indexed menu items.
  const foodMisspellings={
    'calzoni':'calzone','calzon':'calzone','calzonee':'calzone',
    'chiken':'chicken','chikcen':'chicken','parmasan':'parmesan','parmasian':'parmesan',
    'mozarella':'mozzarella','mozerella':'mozzarella','quesidilla':'quesadilla',
    'quesidillas':'quesadillas','buritto':'burrito','burito':'burrito',
    'enchalada':'enchilada','enchiladas':'enchiladas','gyroo':'gyro',
    'shwarma':'shawarma','shawrma':'shawarma','felafel':'falafel',
    'humus':'hummus','hummous':'hummus','biriyani':'biryani','briyani':'biryani',
    'tikka massala':'tikka masala','tika masala':'tikka masala',
    'pad tai':'pad thai','pad thia':'pad thai','lo main':'lo mein',
    'sushie':'sushi','hibatchi':'hibachi','sashame':'sashimi',
    'pannini':'panini','cannolli':'cannoli','canoli':'cannoli',
    'bruchetta':'bruschetta','brushetta':'bruschetta','rissotto':'risotto',
    'gnocci':'gnocchi','alfredo':'alfredo','açai':'acai','acaí':'acai',
    'capuccino':'cappuccino','expresso':'espresso','frappee':'frappe'
  };
  function correctedFoodQuery(query){
    const q=normalize(query);
    if(foodMisspellings[q]) return normalize(foodMisspellings[q]);
    return q.split(' ').map(w=>foodMisspellings[w]||w).join(' ');
  }
  function editDistanceAtMostTwo(a,b){
    if(Math.abs(a.length-b.length)>2) return false;
    let prev=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){
      const cur=[i];
      for(let j=1;j<=b.length;j++){
        cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
      }
      if(Math.min(...cur)>2)return false;
      prev=cur;
    }
    return prev[b.length]<=2;
  }
  function fuzzyIndexedDishMatch(r,query){
    const q=correctedFoodQuery(query);
    if(q.length<5)return false;
    const terms=q.split(' ').filter(Boolean);
    return (Array.isArray(r.dishes)?r.dishes:[]).some(d=>{
      const item=normalize(d), words=item.split(' ');
      if(terms.length===1)return words.some(w=>w.length>=5&&(editDistanceAtMostOne(q,w)||(q.length>=8&&editDistanceAtMostTwo(q,w))));
      return terms.every(t=>words.some(w=>w===t||(t.length>=5&&editDistanceAtMostOne(t,w))||(t.length>=8&&editDistanceAtMostTwo(t,w))));
    });
  }
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
    if(q==='gluten free') return r.gluten_free===true;
    if(q==='full bar') return hasFullBar(r);
    const category=normalize(r.category), cuisine=normalize(r.cuisine);
    const tags=normalize(Array.isArray(r.tags)?r.tags.join(' '):(r.tags||''));
    const cuisineTags=Array.isArray(r.cuisine_tags)?r.cuisine_tags.map(normalize):[];
    const words=' '+[category,cuisine,tags,cuisineTags.join(' ')].join(' ')+' ';
    const has=re=>re.test(words);
    if(q==='sushi') return has(/\bsushi\b/);
    if(q==='hibachi') return has(/\bhibachi\b/);
    if(q==='pizza') return has(/\bpizza\b/);
    if(q==='italian') return has(/\bitalian\b/) || category==='pizza italian';
    if(q==='american pub burgers') return category==='american pub' || has(/\b(pub|tavern|burger|burgers)\b/);
    if(q==='asian sushi') return category==='asian' || has(/\b(sushi|japanese|chinese|thai|korean|vietnamese|hibachi)\b/);
    if(q==='indian south asian') return category==='indian south asian' || has(/\b(indian|pakistani|nepalese|bangladeshi|south asian)\b/);
    if(q==='middle eastern mediterranean') return category==='middle eastern' || has(/\b(middle eastern|mediterranean|greek|lebanese|turkish|persian)\b/);
    if(q==='mexican latin') return category==='mexican latin' || has(/\b(mexican|latin|salvadoran|colombian|peruvian|tacos)\b/);
    if(q==='brazilian') return category==='brazilian' || has(/\bbrazilian\b/);
    if(q==='breakfast brunch cafe') return category==='breakfast cafe' || has(/\b(breakfast|brunch|cafe)\b/);
    if(q==='deli sandwiches') return category==='deli sandwiches' || has(/\b(deli|sandwiches|subs)\b/);
    if(q==='bakery sweets') return category==='bakery sweets' || has(/\b(bakery|pastry|dessert|sweets|ice cream)\b/);
    if(q==='quick service casual') return category==='quick service' || has(/\b(fast food|quick service|fast casual)\b/);
    return category===q || cuisineTags.includes(q) || words.includes(' '+q+' ');
  }
  function matchesQuery(r,q){
    if(!q) return true;
    if(dishMatch(r,q)||dishMatch(r,correctedFoodQuery(q))||fuzzyIndexedDishMatch(r,q)||beverageMatch(r,q)||genericSubMatch(r,q)) return true;
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
  function row(r){
    const label=r.link_type==='maps'?'Google Maps':'Website';
    const detail=r.link_type==='maps'?'No verified official website found':'Official restaurant site';
    return `<article class="restaurant-row"><div class="restaurant-name"><a href="${esc(r.url)}" target="_blank" rel="noopener"><h3>${esc(r.name)}${r.gluten_free?'<svg class=\"gf-icon\" width=\"15\" height=\"15\" viewBox=\"0 0 64 64\" role=\"img\" aria-label=\"Gluten-free options available\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"32\" cy=\"32\" r=\"29\" fill=\"#fff\" stroke=\"#155b32\" stroke-width=\"5\"/><text x=\"32\" y=\"17\" text-anchor=\"middle\" font-family=\"Arial,sans-serif\" font-size=\"8\" font-weight=\"700\" fill=\"#155b32\">GLUTEN</text><text x=\"32\" y=\"43\" text-anchor=\"middle\" font-family=\"Arial,sans-serif\" font-size=\"29\" font-weight=\"800\" fill=\"#155b32\">GF</text><text x=\"32\" y=\"54\" text-anchor=\"middle\" font-family=\"Arial,sans-serif\" font-size=\"8\" font-weight=\"700\" fill=\"#155b32\">FREE</text></svg>':''}</h3></a><span class="restaurant-link-note">${esc(detail)}</span></div><div class="restaurant-cuisine">${esc(r.cuisine||r.category||'')}</div><address>${esc(r.address||'')}${normalize(r.municipality||'norwood')!=='norwood'?`<br><strong>Outside Norwood · ${esc(r.municipality)}</strong>`:''} </address><a class="restaurant-outbound" href="${esc(r.url)}" target="_blank" rel="noopener" aria-label="Open ${esc(r.name)} ${esc(label)}">${esc(label)} <span aria-hidden="true">↗</span></a></article>`;
  }
  function render({focusResults=false}={}){
    const q=normalize(search.value||'');
    const cat=category.value||'';
    const visible=restaurants.filter(r=>((!cat)||(cat==='Gluten-Free'?r.gluten_free:cat==='Full Bar'?hasFullBar(r):matchesCuisine(r,cat)))&&matchesQuery(r,q));
    const pieces=[];
    if(q) pieces.push(`matching “${search.value.trim()}”`);
    if(cat) pieces.push(cat==='Gluten-Free'?'with gluten-free options':cat==='Full Bar'?'with a full bar':`in ${cat}`);
    count.textContent=`${visible.length} ${visible.length===1?'place':'places'} shown${pieces.length?' '+pieces.join(' '):''} · ${restaurants.length} total`;
    if(!visible.length){
      directory.innerHTML='<div class="restaurant-empty"><h2>No matches found</h2><p>Try a broader restaurant name, cuisine, food, or street.</p></div>';
    }else{
      const groups=new Map();
      visible.forEach(r=>{const displaySortName=String(r.name||'').replace(/^the\s+/i,'');const letter=(displaySortName.match(/[A-Za-z0-9]/)?.[0]||'#').toUpperCase();if(!groups.has(letter))groups.set(letter,[]);groups.get(letter).push(r);});
      directory.innerHTML=[...groups.entries()].map(([letter,items])=>`<section class="restaurant-letter" aria-labelledby="food-letter-${letter}"><h2 id="food-letter-${letter}">${letter}</h2><div class="restaurant-list">${items.map(row).join('')}</div></section>`).join('');
    }
    if(focusResults) directory.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function load(){
    const sortName=name=>String(name||'').replace(/^the\s+/i,'');
    restaurants=restaurants.slice().sort((a,b)=>sortName(a.name).localeCompare(sortName(b.name),undefined,{sensitivity:'base'}));
    const categories=[...new Set(restaurants.map(r=>r.category).filter(Boolean).concat(['Sushi','Hibachi']))].sort((a,b)=>a.localeCompare(b));
    category.innerHTML='<option value="">All cuisines & types</option><option value="Gluten-Free">Gluten-Free</option><option value="Full Bar">Full Bar</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    const incoming=new URLSearchParams(location.search).get('q');
    if(incoming){ search.value=incoming; }
    render();
    if(incoming){ document.querySelector('#foodSearchForm')?.scrollIntoView({block:'start'}); }
  }
  // Suggestions are drawn from actual directory names, cuisine labels, and indexed dishes.
  const suggestions=document.createElement('div');
  suggestions.id='foodSearchSuggestions';
  suggestions.setAttribute('role','listbox');
  suggestions.setAttribute('aria-label','Restaurant and dish suggestions');
  suggestions.style.cssText='position:absolute;z-index:30;left:0;right:0;top:100%;background:#fff;color:#172b4d;border:1px solid #aeb8c5;border-radius:0 0 10px 10px;box-shadow:0 8px 20px #0002;max-height:260px;overflow-y:auto;display:none';
  const searchWrap=search.parentElement;
  if(searchWrap){searchWrap.style.position='relative';searchWrap.appendChild(suggestions);}
  search.setAttribute('autocomplete','off');
  search.setAttribute('aria-autocomplete','list');
  search.setAttribute('aria-controls',suggestions.id);
  function updateSuggestions(){
    const q=normalize(search.value);
    if(q.length<2){suggestions.style.display='none';suggestions.replaceChildren();return;}
    const values=new Map();
    const add=(label,type,priority=0)=>{
      const key=normalize(label);
      if(!key)return;
      const prev=values.get(key);
      if(!prev||priority>prev.priority)values.set(key,{label,type,priority});
    };
    for(const cuisine of ['Sushi','Hibachi'])add(cuisine,'Cuisine',5);
    // Canonical dish suggestions must be selectable even when the menu uses
    // a singular form or a more specific dish name (e.g. beef tacos).
    const popularDishes=['Tacos','Burritos','Quesadillas','Enchiladas','Sushi','Pizza','Burger','Cheeseburger','Hamburger','Ice cream','Subs','Hoagies','Chicken parm','Pad Thai','Gyros','Falafel','Fries','Calzones'];
    for(const label of popularDishes){
      if(restaurants.some(r=>dishMatch(r,label)||genericSubMatch(r,label)))add(label,'Food',4);
    }
    for(const r of restaurants){
      add(r.name,'Restaurant',1);
      if(Array.isArray(r.dishes))for(const dish of r.dishes)add(dish,'Dish',2);
      if(Array.isArray(r.beverages))for(const drink of r.beverages)add(drink,'Drink',2);
    }
    for(const [canonical,aliases] of Object.entries(dishAliases)){
      if(restaurants.some(r=>dishMatch(r,canonical))){
        for(const alias of [canonical,...aliases])add(alias,'Food',3);
      }
    }
    for(const [canonical,aliases] of Object.entries(beverageAliases)){
      if(restaurants.some(r=>beverageMatch(r,canonical))){
        for(const alias of [canonical,...aliases])add(alias,'Drink',3);
      }
    }
    const hits=[...values.entries()].filter(([key])=>key.includes(q)||(q.length>=4&&key.split(' ').some(w=>editDistanceAtMostOne(q,w))))
      .sort((a,b)=>Number(!a[0].startsWith(q))-Number(!b[0].startsWith(q))||b[1].priority-a[1].priority||a[0].localeCompare(b[0])).slice(0,7);
    suggestions.replaceChildren();
    for(const [,v] of hits){
      const b=document.createElement('button');b.type='button';b.setAttribute('role','option');b.textContent=v.label+' · '+v.type;
      b.style.cssText='display:block;width:100%;min-height:44px;padding:11px 14px;text-align:left;background:#fff;color:#172b4d;border:0;border-bottom:1px solid #eee;font:inherit;cursor:pointer';
      b.addEventListener('pointerdown',e=>e.preventDefault());
      b.addEventListener('click',()=>{search.value=v.label;suggestions.style.display='none';render({focusResults:true});});
      suggestions.appendChild(b);
    }
    suggestions.style.display=hits.length?'block':'none';
  }
  search.addEventListener('input',updateSuggestions);
  search.addEventListener('keydown',e=>{
    if(e.key==='Escape')suggestions.style.display='none';
    if(e.key==='ArrowDown'&&suggestions.style.display!=='none'){
      e.preventDefault();suggestions.querySelector('button')?.focus();
    }
  });
  suggestions.addEventListener('keydown',e=>{if(e.key==='Escape'){suggestions.style.display='none';search.focus();}});
  document.addEventListener('click',e=>{if(!searchWrap?.contains(e.target))suggestions.style.display='none';});
  const runLive=()=>render();
  search.addEventListener('input',runLive);
  search.addEventListener('search',runLive);
  category.addEventListener('change',runLive);
  form?.addEventListener('submit',e=>{e.preventDefault();render({focusResults:true});});
  clear.addEventListener('click',()=>{search.value='';category.value='';suggestions.style.display='none';render();search.focus();});

  function setupDinnerSpinner(){
    const food=$('#spinnerFood'), spin=$('#spinDinner'), wheel=$('#spinnerWheel'), result=$('#spinnerResult'), meta=$('#spinnerMeta'), links=$('#spinnerLinks');
    if(!food||!spin||!wheel||!result||!meta||!links) return;
    let spinning=false;
    function easternNowParts(){
      const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());
      const get=t=>parts.find(p=>p.type===t)?.value;
      return {day:get('weekday'),minutes:Number(get('hour'))*60+Number(get('minute'))};
    }
    function parseClock(v){
      const m=String(v||'').match(/^(\d{1,2}):(\d{2})$/); return m?Number(m[1])*60+Number(m[2]):null;
    }
    function isAvailableToday(r){
      const hours=r.hours;
      if(!hours||typeof hours!=='object') return null;
      const {day,minutes}=easternNowParts(), span=hours[day];
      if(span==='closed') return false;
      if(span==='24h') return true;
      const spans=Array.isArray(span)?span:[span];
      let known=false;
      for(const s of spans){
        if(!s||typeof s!=='string'||!s.includes('-')) continue;
        let [a,b]=s.split('-').map(parseClock); if(a===null||b===null) continue;
        known=true;
        // Before opening, while open, or during an overnight service period all count.
        // Once a same-day service period has ended, only a later period can keep the restaurant eligible.
        if(b>a){
          if(minutes<b) return true;
        }else{
          // A period such as 16:00-01:00 is available from before opening through midnight.
          // After midnight it remains available until its overnight close.
          if(minutes>=a || minutes<b) return true;
          if(minutes<a) return true;
        }
      }
      return known?false:null;
    }
    function choose(ignore=false){
      if(spinning||!restaurants.length) return;
      const choice=ignore?'':normalize(food.value);
      const wantsFullBar=choice==='full bar';
      
      const norwoodOnly=restaurants.filter(r=>{ const town=normalize(r.municipality||r.city||r.coverage||''); return !town || town==='norwood'; });
      // Dinner Spinner is for places with a food menu; bar-only/drink-only venues stay searchable but are excluded.
      const dinnerEligible=norwoodOnly.filter(r=>r.dinner_spinner!==false && r.food_menu!==false);
      let pool=dinnerEligible.filter(r=>wantsFullBar?hasFullBar(r):(!choice||matchesCuisine(r,choice)));
      // By default, exclude restaurants whose verified service for today has ended.
      // Unknown/unverified hours remain eligible rather than being falsely treated as closed.
      pool=pool.filter(r=>isAvailableToday(r)!==false);
      if(!pool.length){ result.textContent='No exact matches.'; meta.textContent='Nothing matching that choice with verified hours is still available today. Try another category.'; links.innerHTML=''; return; }
      spinning=true; spin.disabled=true; wheel.classList.add('is-spinning');
      let ticks=0, last=null;
      const timer=setInterval(()=>{ last=pool[Math.floor(Math.random()*pool.length)]; wheel.querySelector('span').textContent=(last.name||'?').slice(0,2).toUpperCase(); ticks++; if(ticks>=18){
        clearInterval(timer); wheel.classList.remove('is-spinning'); spinning=false; spin.disabled=false;
        const pick=pool[Math.floor(Math.random()*pool.length)]; wheel.querySelector('span').textContent='✓'; result.textContent=pick.name; const openState=isAvailableToday(pick);
        meta.textContent=[pick.cuisine||pick.category,pick.address&&pick.address+', Norwood',openState===true?'Available today':'Hours not verified'].filter(Boolean).join(' · ');
        const label=pick.link_type==='maps'?'Open in Google Maps':'Visit restaurant website';
        links.innerHTML=`<a class="spinner-result-link" href="${esc(pick.url)}" target="_blank" rel="noopener">${esc(label)} ↗</a><button id="spinAgain" type="button">Spin again</button>`;
        $('#spinAgain')?.addEventListener('click',()=>choose(ignore));
      }},75);
    }
    spin.addEventListener('click',()=>choose(false));
    wheel.setAttribute('role','button');
    wheel.setAttribute('tabindex','0');
    wheel.setAttribute('aria-label','Spin the dinner wheel');
    wheel.addEventListener('click',()=>choose(false));
    wheel.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(false);}});
  }
  function setupMobileAdRotation(){
    const rail=document.querySelector('.restaurant-ad-rail');
    if(!rail) return;
    const ads=[...rail.querySelectorAll('.restaurant-ad-slot')];
    if(!ads.length) return;
    const choose=()=>{
      ads.forEach(a=>a.classList.remove('mobile-ad-selected'));
      if(window.matchMedia('(max-width:820px)').matches){
        ads[Math.floor(Math.random()*ads.length)].classList.add('mobile-ad-selected');
      }
    };
    choose();
  }
  setupMobileAdRotation();

  if(restaurants.length){
    load(); setupDinnerSpinner();
  }else{
    fetch('data/restaurants.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}).then(d=>{restaurants=Array.isArray(d)?d:[];load();setupDinnerSpinner();}).catch(()=>{count.textContent='Restaurant data could not be loaded.';directory.innerHTML='<p class="directory-note">The directory could not be loaded. Please try again later.</p>';});
  }
})();
