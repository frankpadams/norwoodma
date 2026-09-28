(()=>{'use strict';
const stations=[
{name:'Norwood Gulf',address:'707 Neponset St',phone:'781-255-7368',map:'https://www.google.com/maps/search/?api=1&query=Norwood+Gulf+707+Neponset+St+Norwood+MA'},
{name:'Gulf — Broadway',address:'145 Broadway',map:'https://www.google.com/maps/search/?api=1&query=Gulf+145+Broadway+Norwood+MA'},
{name:"Mr. Frank's Food Mart",address:'917 Washington St',map:'https://www.google.com/maps/search/?api=1&query=Mr+Franks+Food+Mart+917+Washington+St+Norwood+MA'},
{name:'Sunoco — Route 1',address:'515 Providence Hwy',phone:'781-762-7380',map:'https://www.google.com/maps/search/?api=1&query=Sunoco+515+Providence+Hwy+Norwood+MA'},
{name:'Route 1 Auto Services',address:'305 Boston-Providence Turnpike',map:'https://www.google.com/maps/search/?api=1&query=Route+1+Auto+Services+305+Boston+Providence+Turnpike+Norwood+MA'},
{name:'Mobil — Route 1',address:'971 Providence Hwy',phone:'781-769-8945',map:'https://www.google.com/maps/search/?api=1&query=Mobil+971+Providence+Hwy+Norwood+MA'},
{name:'Irving Oil / Rojo',address:'69 Providence Hwy',phone:'781-762-8280',map:'https://www.google.com/maps/search/?api=1&query=Irving+Oil+69+Providence+Hwy+Norwood+MA'},
{name:"BJ's Gas Station",address:'1412–1420 Boston-Providence Turnpike',phone:'781-619-1250',map:'https://www.google.com/maps/search/?api=1&query=BJs+Gas+Norwood+MA'},
{name:'CITGO',address:'960 Boston Providence Hwy',phone:'781-769-8449',map:'https://www.google.com/maps/search/?api=1&query=Citgo+960+Boston+Providence+Hwy+Norwood+MA'},
{name:'Shell — Walpole Street',address:'491 Walpole St',phone:'781-551-9184',map:'https://www.google.com/maps/search/?api=1&query=Shell+491+Walpole+St+Norwood+MA'},
{name:'Mobil / On the Run — Norwood Center',address:'499 Washington St',phone:'781-769-6092',map:'https://www.google.com/maps/search/?api=1&query=Mobil+499+Washington+St+Norwood+MA'},
{name:'Shell — Pleasant Street',address:'238 Pleasant St',phone:'781-762-1952',map:'https://www.google.com/maps/search/?api=1&query=Shell+238+Pleasant+St+Norwood+MA'},
{name:'Costco Gas — Dedham',address:'200 Legacy Blvd, Dedham',phone:'781-251-9975',map:'https://www.google.com/maps/search/?api=1&query=Costco+Gas+200+Legacy+Blvd+Dedham+MA',nearby:true},
{name:'Costco Gas — Sharon',address:'160 Old Post Rd, Sharon',phone:'781-253-7640',map:'https://www.google.com/maps/search/?api=1&query=Costco+Gas+160+Old+Post+Rd+Sharon+MA',nearby:true}
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root=document.querySelector('#gasStations');
const money=v=>Number.isFinite(Number(v))?'$'+Number(v).toFixed(2):'—';
const age=t=>{const d=new Date(t),ms=Date.now()-d.getTime();if(!Number.isFinite(ms)||ms<0)return '';const m=Math.floor(ms/60000);if(m<1)return 'just now';if(m<60)return m+' min ago';const h=Math.floor(m/60),rm=m%60;if(h<48)return h+' hr'+(h===1?'':'s')+(rm?' '+rm+' min':'')+' ago';const days=Math.floor(h/24);if(days<7)return days+' day'+(days===1?'':'s')+' ago';return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});};
function render(prices={}){
 const rows=stations.map((s,i)=>({s,p:prices[s.name]||{},i})).sort((a,b)=>{const ap=Number(a.p.regular),bp=Number(b.p.regular),ah=Number.isFinite(ap)&&ap>0,bh=Number.isFinite(bp)&&bp>0;if(ah!==bh)return ah?-1:1;if(ah&&ap!==bp)return ap-bp;return a.i-b.i;});
 root.innerHTML=rows.map(({s,p})=>'<article class="gas-row"><div class="gas-station"><strong>'+esc(s.name)+(s.nearby?' <small>Nearby</small>':'')+'</strong><span>'+esc(s.address)+(s.nearby?', MA':', Norwood, MA')+'</span></div><div class="gas-fuel regular"><span>Regular</span><b>'+money(p.regular)+'</b></div><div class="gas-fuel"><span>Mid</span><b>'+money(p.midgrade)+'</b></div><div class="gas-fuel"><span>Premium</span><b>'+money(p.premium)+'</b></div><div class="gas-fuel"><span>Diesel</span><b>'+money(p.diesel)+'</b></div><div class="gas-links"><a href="'+esc(s.map)+'" target="_blank" rel="noopener">Directions ↗</a>'+(s.phone?'<a href="tel:'+esc(s.phone)+'">'+esc(s.phone)+'</a>':'')+(p.updated?'<small title="'+esc(new Date(p.updated).toLocaleString('en-US',{timeZone:'America/New_York'}))+'">Updated '+esc(age(p.updated))+'</small>':'')+'</div></article>').join('');
}
render();
fetch('data/gas-prices.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(d&&d.stations){render(d.stations);const el=document.querySelector('#priceStatus');if(el)el.innerHTML='<strong>Prices:</strong> Sorted lowest to highest by the latest available regular-gas price. Stations without a current regular price appear last.';}}).catch(()=>{});
})();