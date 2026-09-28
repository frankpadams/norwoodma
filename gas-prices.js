(()=>{'use strict';
const stations=[
{name:'Norwood Gulf',address:'707 Neponset St',phone:'781-255-7368',map:'https://www.google.com/maps/search/?api=1&query=Norwood+Gulf+707+Neponset+St+Norwood+MA'},
{name:'Mobil — Route 1',address:'971 Providence Hwy',phone:'781-769-8945',map:'https://www.google.com/maps/search/?api=1&query=Mobil+971+Providence+Hwy+Norwood+MA'},
{name:'Irving Oil / Rojo',address:'69 Providence Hwy',phone:'781-762-8280',map:'https://www.google.com/maps/search/?api=1&query=Irving+Oil+69+Providence+Hwy+Norwood+MA'},
{name:"BJ's Gas Station",address:'1412–1420 Boston-Providence Turnpike',phone:'781-619-1250',map:'https://www.google.com/maps/search/?api=1&query=BJs+Gas+Norwood+MA'},
{name:'CITGO',address:'960 Boston Providence Hwy',phone:'781-769-8449',map:'https://www.google.com/maps/search/?api=1&query=Citgo+960+Boston+Providence+Hwy+Norwood+MA'},
{name:'Shell — Walpole Street',address:'491 Walpole St',phone:'781-551-9184',map:'https://www.google.com/maps/search/?api=1&query=Shell+491+Walpole+St+Norwood+MA'},
{name:'Mobil / On the Run — Norwood Center',address:'499 Washington St',phone:'781-769-6092',map:'https://www.google.com/maps/search/?api=1&query=Mobil+499+Washington+St+Norwood+MA'},
{name:'Shell — Pleasant Street',address:'238 Pleasant St',phone:'781-762-1952',map:'https://www.google.com/maps/search/?api=1&query=Shell+238+Pleasant+St+Norwood+MA'}
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root=document.querySelector('#gasStations');
function priceBox(label,value){return '<div class="gas-price"><span>'+esc(label)+'</span><b>'+(value?('$'+Number(value).toFixed(2)):'—')+'</b></div>';}
function render(prices={}){
 root.innerHTML=stations.map(s=>{const p=prices[s.name]||{};return '<article class="gas-card"><h2>'+esc(s.name)+'</h2><p>'+esc(s.address)+', Norwood, MA</p><div class="gas-prices">'+priceBox('Regular',p.regular)+priceBox('Midgrade',p.midgrade)+priceBox('Premium',p.premium)+priceBox('Diesel',p.diesel)+'</div>'+(p.updated?'<p><small>Price data updated '+esc(p.updated)+'</small></p>':'<p><small>Live price not currently available.</small></p>')+'<div class="gas-actions"><a href="'+esc(s.map)+'" target="_blank" rel="noopener">Directions ↗</a>'+(s.phone?'<a href="tel:'+esc(s.phone)+'">'+esc(s.phone)+'</a>':'')+'</div></article>';}).join('');
}
render();
fetch('data/gas-prices.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(d&&d.stations){render(d.stations);const el=document.querySelector('#priceStatus');if(el)el.innerHTML='<strong>Live prices:</strong> Latest available station price data. Check each station’s reported update time; pump prices may change.';}}).catch(()=>{});
})();