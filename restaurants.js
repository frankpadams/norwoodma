(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const form=$('#foodSearchForm'), search=$('#foodSearch'), category=$('#foodCategory'), dietary=$('#foodDietary'), directory=$('#restaurantDirectory'), count=$('#restaurantCount'), clear=$('#clearFoodFilters');
  if(!search||!category||!dietary||!directory||!count||!clear) return;
  let restaurants=Array.isArray(window.NORWOOD_RESTAURANTS)?window.NORWOOD_RESTAURANTS:[];

  function searchable(r){
    const tags=Array.isArray(r.tags)?r.tags.join(' '):(r.tags||'');
    return normalize([r.name,r.category,r.cuisine,r.address,tags,r.gluten_free?'gluten free gf':''].filter(Boolean).join(' '));
  }
  function row(r){
    const label=r.link_type==='maps'?'Google Maps':'Website';
    const detail=r.link_type==='maps'?'No verified official website found':'Official restaurant site';
    return `<article class="restaurant-row"><div class="restaurant-name"><a href="${esc(r.url)}" target="_blank" rel="noopener"><h3>${esc(r.name)}${r.gluten_free?'<svg class=\"gf-icon\" width=\"15\" height=\"15\" viewBox=\"0 0 64 64\" role=\"img\" aria-label=\"Gluten-free options available\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"32\" cy=\"32\" r=\"29\" fill=\"#fff\" stroke=\"#155b32\" stroke-width=\"5\"/><text x=\"32\" y=\"17\" text-anchor=\"middle\" font-family=\"Arial,sans-serif\" font-size=\"8\" font-weight=\"700\" fill=\"#155b32\">GLUTEN</text><text x=\"32\" y=\"43\" text-anchor=\"middle\" font-family=\"Arial,sans-serif\" font-size=\"29\" font-weight=\"800\" fill=\"#155b32\">GF</text><text x=\"32\" y=\"54\" text-anchor=\"middle\" font-family=\"Arial,sans-serif\" font-size=\"8\" font-weight=\"700\" fill=\"#155b32\">FREE</text></svg>':''}</h3></a><span class="restaurant-link-note">${esc(detail)}</span></div><div class="restaurant-cuisine">${esc(r.cuisine||r.category||'')}</div><address>${esc(r.address||'')}<br>Norwood, MA</address><a class="restaurant-outbound" href="${esc(r.url)}" target="_blank" rel="noopener" aria-label="Open ${esc(r.name)} ${esc(label)}">${esc(label)} <span aria-hidden="true">↗</span></a></article>`;
  }
  function render({focusResults=false}={}){
    const q=normalize(search.value||'');
    const cat=category.value||'';
    const diet=dietary.value||'';
    const terms=q?q.split(' ').filter(Boolean):[];
    const visible=restaurants.filter(r=>(!cat||r.category===cat)&&(!diet||(diet==='gluten-free'&&r.gluten_free))&&terms.every(t=>searchable(r).includes(t)));
    const pieces=[];
    if(q) pieces.push(`matching “${search.value.trim()}”`);
    if(cat) pieces.push(`in ${cat}`);
    if(diet==='gluten-free') pieces.push('with gluten-free options');
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
    const categories=[...new Set(restaurants.map(r=>r.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    category.innerHTML='<option value="">All cuisines & types</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    render();
  }
  const runLive=()=>render();
  search.addEventListener('input',runLive);
  search.addEventListener('search',runLive);
  category.addEventListener('change',runLive);
  dietary.addEventListener('change',runLive);
  form?.addEventListener('submit',e=>{e.preventDefault();render({focusResults:true});});
  clear.addEventListener('click',()=>{search.value='';category.value='';dietary.value='';render();search.focus();});

  function setupDinnerSpinner(){
    const food=$('#spinnerFood'), spin=$('#spinDinner'), surprise=$('#surpriseDinner'), wheel=$('#spinnerWheel'), result=$('#spinnerResult'), meta=$('#spinnerMeta'), links=$('#spinnerLinks');
    if(!food||!spin||!surprise||!wheel||!result||!meta||!links) return;
    let spinning=false;
    function choose(ignore=false){
      if(spinning||!restaurants.length) return;
      const choice=ignore?'':normalize(food.value);
      const terms=choice?choice.split(' ').filter(Boolean):[];
      const norwoodOnly=restaurants.filter(r=>{ const town=normalize(r.municipality||r.city||r.coverage||''); return !town || town==='norwood'; });
      let pool=norwoodOnly.filter(r=>!terms.length||terms.some(t=>searchable(r).includes(t)));
      if(!pool.length){ result.textContent='No exact matches.'; meta.textContent='Try “Anything — surprise me” and spin again.'; links.innerHTML=''; return; }
      spinning=true; spin.disabled=surprise.disabled=true; wheel.classList.add('is-spinning');
      let ticks=0, last=null;
      const timer=setInterval(()=>{ last=pool[Math.floor(Math.random()*pool.length)]; wheel.querySelector('span').textContent=(last.name||'?').slice(0,2).toUpperCase(); ticks++; if(ticks>=18){
        clearInterval(timer); wheel.classList.remove('is-spinning'); spinning=false; spin.disabled=surprise.disabled=false;
        const pick=pool[Math.floor(Math.random()*pool.length)]; wheel.querySelector('span').textContent='✓'; result.textContent=pick.name; meta.textContent=[pick.cuisine||pick.category,pick.address&&pick.address+', Norwood'].filter(Boolean).join(' · ');
        const label=pick.link_type==='maps'?'Open in Google Maps':'Visit restaurant website';
        links.innerHTML=`<a class="spinner-result-link" href="${esc(pick.url)}" target="_blank" rel="noopener">${esc(label)} ↗</a><button id="spinAgain" type="button">Spin again</button>`;
        $('#spinAgain')?.addEventListener('click',()=>choose(ignore));
      }},75);
    }
    spin.addEventListener('click',()=>choose(false)); surprise.addEventListener('click',()=>choose(true));
  }
  if(restaurants.length){
    load(); setupDinnerSpinner();
  }else{
    fetch('data/restaurants.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}).then(d=>{restaurants=Array.isArray(d)?d:[];load();setupDinnerSpinner();}).catch(()=>{count.textContent='Restaurant data could not be loaded.';directory.innerHTML='<p class="directory-note">The directory could not be loaded. Please try again later.</p>';});
  }
})();
