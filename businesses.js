(()=>{'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const groups={
 automotive:/auto|automotive|car wash|vehicle|towing|roadside/i,
 home:/hvac|plumb|heating|electric|contractor|home|repair|cleaning|painting|remodel|garage door|roof|landscap|tree|pest|pool/i,
 health:/dental|orthodont|physical therapy|rehabilitation|optometry|eyewear|audiology|hearing|chiropractic|pharmac|medical/i,
 pets:/pet|veterinar|animal hospital|groom/i,
 professional:/attorney|legal|account|tax|bookkeep|bank|financial|insurance|notary|real estate/i,
 personal:/barber|salon|beauty|spa|massage|personal care|tailor|alteration|dry clean|laundry/i,
 fitness:/fitness|personal training|martial arts|gymnast|swim|cheer|tumbling|music school|lessons/i,
 family:/childcare|preschool|driving school/i,
 shopping:/grocer|garden center|nurser|florist|books|shopping|plants|gifts|bicycles|outdoor recreation/i,
 'business-services':/printing|shipping|office|computer|technology|manufactur|testing|engineering|equipment|tool rental/i,
 other:/storage|moving|funeral|cremation|locksmith|security|rental/i
};
const raw=window.NORWOOD_BUSINESSES||[];
const businesses=raw.map(b=>Array.isArray(b)?{name:b[0],category:b[1],address:b[2],phone:b[3],website:b[4]}:b);
function belongs(b,id){const re=groups[id];if(!re)return false;const text=(b.category||'')+' '+(b.tags||[]).join?.(' ');return re.test(text);}
function card(b){const title=b.website?'<a class="resource-name" href="'+esc(b.website)+'" target="_blank" rel="noopener"><b>'+esc(b.name)+'</b> <span aria-hidden="true">↗</span></a>':'<span class="resource-name resource-name-no-link"><b>'+esc(b.name)+'</b></span>';const details=[b.address,b.phone].filter(Boolean).map(esc).join(' · ');return '<article class="resource-item business-item"><div class="resource-meta"><span class="badge">'+esc(b.category||'Local business')+'</span></div><div class="resource-title-row">'+title+'</div>'+(details?'<p>'+details+'</p>':'')+'</article>';}
function render(){const id=location.hash.slice(1);if(!groups[id]){$('#businessDirectory').innerHTML='';return;}const rows=businesses.filter(b=>belongs(b,id)).sort((a,b)=>a.name.localeCompare(b.name));$('#businessDirectory').innerHTML='<section class="topic-section selected-resource-topic"><button class="resource-back" type="button">← All business categories</button><p class="eyebrow">BUSINESS CATEGORY</p><h2>'+esc(document.querySelector('a[href="#'+id+'"] b')?.textContent||'Local businesses')+'</h2><div class="resource-list">'+(rows.map(card).join('')||'<p>No businesses found in this category yet.</p>')+'</div></section>';$('#businessCount').textContent=businesses.length+' local business listings.';document.querySelector('.resource-back')?.addEventListener('click',()=>{history.pushState(null,'',location.pathname);render();document.querySelector('.resource-start')?.scrollIntoView({behavior:'smooth',block:'start'});});requestAnimationFrame(()=>$('#businessDirectory').scrollIntoView({behavior:'smooth',block:'start'}));}
window.addEventListener('hashchange',render);render();if($('#businessCount'))$('#businessCount').textContent=businesses.length+' local business listings.';
})();