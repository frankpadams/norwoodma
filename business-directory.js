(()=>{'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const raw=window.NORWOOD_BUSINESSES||[];
const aliases={auto:['auto','automotive','car','vehicle','tire','towing'],home:['home','contractor','plumbing','heating','hvac','electric','roof','painting','flooring','landscaping','garage','locksmith','pool','cleaning'],health:['dental','orthodont','physical therapy','chiropractic','optometry','hearing','pharmacy','medical'],pets:['pet','veterinary','grooming','animal'],family:['childcare','preschool','swim','martial arts'],money:['account','tax','bank','financial','insurance','legal','attorney','real estate'],personal:['salon','barber','beauty','tailor','laundry','dry cleaning'],business:['printing','office','engineering','manufacturing','computer','storage','moving','rental']};
function text(b){return [b.name,b.category,b.address,...(b.tags||[])].join(' ').toLowerCase();}
function broad(b){const h=text(b);return Object.entries(aliases).filter(([,words])=>words.some(w=>h.includes(w))).map(([k])=>k);}
const all=raw.map(b=>({...b,tags:Array.isArray(b.tags)?b.tags:[],groups:Array.isArray(b.groups)?b.groups:broad(b)}));
const review=(url,label,domain)=>url?'<a class="review-icon" href="'+esc(url)+'" target="_blank" rel="noopener" aria-label="'+label+'" title="'+label+'"><img alt="" src="https://www.google.com/s2/favicons?domain='+domain+'&sz=32"></a>':'';
function card(b){const reviews=review(b.googleReviews,'Google reviews','google.com')+review(b.yelp,'Yelp reviews','yelp.com')+review(b.tripadvisor,'Tripadvisor reviews','tripadvisor.com');return '<article class="business-card"><div><span class="badge">'+esc(b.category)+'</span><h3>'+esc(b.name)+'</h3><p>'+esc(b.address)+'</p>'+(b.phone?'<p><a href="tel:'+b.phone.replace(/[^0-9+]/g,'')+'">'+esc(b.phone)+'</a></p>':'')+'</div><div class="business-actions">'+(b.website?'<a class="business-website" href="'+esc(b.website)+'" target="_blank" rel="noopener">Website ↗</a>':'')+(reviews?'<span class="review-icons" aria-label="Verified review-site listings">'+reviews+'</span>':'')+'</div></article>'}
const groups=[['auto','Auto & Transportation','🚗'],['home','Home & Contractors','🏠'],['health','Health & Dental','🩺'],['pets','Pets','🐾'],['family','Kids & Activities','👨‍👩‍👧‍👦'],['money','Money, Legal & Real Estate','💼'],['personal','Personal Services','✂️'],['business','Business & Professional','🏢']];
let selected='';
function syncFromUrl(){const p=new URLSearchParams(location.search);const q=p.get('q')||'';const cat=p.get('category')||'';if($('#businessSearch'))$('#businessSearch').value=q;if(cat)selected=cat;}
function render(){
 const term=($('#businessSearch')?.value||'').toLowerCase().trim();
 let rows=[];
 if(term) rows=all.filter(b=>text(b).includes(term));
 else if(selected) rows=all.filter(b=>b.category===selected||b.groups.includes(selected));
 const grid=$('#businessGrid'),count=$('#businessCount'),empty=$('#businessIntro');
 document.querySelectorAll('[data-business-group]').forEach(x=>x.classList.toggle('active',x.dataset.businessGroup===selected));
 if(!term&&!selected){count.textContent=all.length+' listings available';grid.innerHTML='';if(empty)empty.hidden=false;return;}
 if(empty)empty.hidden=true;
 count.textContent=rows.length+' '+(rows.length===1?'business':'businesses');
 grid.innerHTML=rows.length?rows.map(card).join(''):'<p>No matching businesses found. Try another search or category.</p>';
}
function choose(v){selected=selected===v?'':v;render();}
function init(){
 syncFromUrl();
 const cats=[...new Set(all.map(b=>b.category))].sort();
 $('#businessCategory').innerHTML='<option value="">More specific categories…</option>'+cats.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');
 if(selected&&cats.includes(selected))$('#businessCategory').value=selected;
 $('#businessSearch').addEventListener('input',()=>{selected='';$('#businessCategory').value='';render();});
 $('#businessCategory').addEventListener('change',e=>{selected=e.target.value;render();});
 document.querySelectorAll('[data-business-group]').forEach(x=>x.addEventListener('click',()=>choose(x.dataset.businessGroup)));
 render();
}
init();
})();