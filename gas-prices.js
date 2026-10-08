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
const reportDialog=document.querySelector('#gasReportDialog'),reportForm=document.querySelector('#gasReportForm');
root.addEventListener('click',e=>{const b=e.target.closest('.gas-submit');if(!b||!reportDialog)return;const s=stations[Number(b.dataset.station)];if(!s)return;reportForm.reset();document.querySelector('#gasReportStation').textContent=s.name+' — '+fullAddress(s);document.querySelector('#gasReportStationField').value=s.name;document.querySelector('#gasReportStatus').textContent='';reportDialog.showModal();});
document.querySelector('#gasReportCancel')?.addEventListener('click',()=>reportDialog.close());
reportForm?.addEventListener('submit',async e=>{e.preventDefault();const status=document.querySelector('#gasReportStatus'),button=reportForm.querySelector('button[type=submit]');button.disabled=true;status.textContent='Sending…';try{const body=new FormData(reportForm);body.set('message',`${body.get('station')}: ${body.get('fuel_type')} ${body.get('price')} per gallon, observed ${body.get('observed')}. Pending review; not automatically published.`);const res=await fetch('https://api.web3forms.com/submit',{method:'POST',body});const data=await res.json();if(!res.ok||!data.success)throw Error('Submission failed');status.textContent='Thank you! Your price report was sent for review.';reportForm.querySelectorAll('input:not([type=hidden]),select').forEach(el=>el.disabled=true);}catch(_){status.textContent='Could not send. Please try again later.';}finally{button.disabled=false;}});
const money=v=>Number.isFinite(Number(v))?'$'+Number(v).toFixed(2):'—';
const age=t=>{const d=new Date(t),ms=Date.now()-d.getTime();if(!Number.isFinite(ms)||ms<0)return '';const m=Math.floor(ms/60000);if(m<1)return 'just now';if(m<60)return m+' min ago';const h=Math.floor(m/60),rm=m%60;if(h<48)return h+' hr'+(h===1?'':'s')+(rm?' '+rm+' min':'')+' ago';const days=Math.floor(h/24);if(days<7)return days+' day'+(days===1?'':'s')+' ago';return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});};
const fullAddress=s=>s.address+(s.nearby?', MA':', Norwood, MA');
const directions=s=>{const d=encodeURIComponent(fullAddress(s));return {
 google:'https://www.google.com/maps/dir/?api=1&destination='+d,
 apple:'https://maps.apple.com/?daddr='+d
};};
function render(prices={}){
 const maxAgeMs=36*60*60*1000;
 const freshPrice=p=>{const t=p.checked||p.updated;if(!t)return p;const ms=Date.now()-new Date(t).getTime();return Number.isFinite(ms)&&ms>maxAgeMs?{}:p;};
 const rows=stations.map((s,i)=>({s,p:freshPrice(prices[s.name]||{}),i})).sort((a,b)=>{const ap=Number(a.p.regular),bp=Number(b.p.regular),ah=Number.isFinite(ap)&&ap>0,bh=Number.isFinite(bp)&&bp>0;if(ah!==bh)return ah?-1:1;if(ah&&ap!==bp)return ap-bp;return a.i-b.i;});
 root.innerHTML=rows.map(({s,p,i})=>{const d=directions(s);return '<article class="gas-row"><div class="gas-station"><strong>'+esc(s.name)+(s.nearby?' <small>Nearby</small>':'')+'</strong><span>'+esc(fullAddress(s))+'</span></div><div class="gas-fuel regular"><span>Regular</span><b>'+money(p.regular)+'</b></div><div class="gas-fuel"><span>Mid</span><b>'+money(p.midgrade)+'</b></div><div class="gas-fuel"><span>Premium</span><b>'+money(p.premium)+'</b></div><div class="gas-fuel"><span>Diesel</span><b>'+money(p.diesel)+'</b></div><div class="gas-links"><div class="gas-directions" aria-label="Directions"><span>Directions:</span><a class="map-link" href="'+esc(d.google)+'" target="_blank" rel="noopener" aria-label="Directions in Google Maps" title="Google Maps"><img src="https://www.google.com/favicon.ico" alt="" width="16" height="16"></a><a class="map-link" href="'+esc(d.apple)+'" target="_blank" rel="noopener" aria-label="Directions in Apple Maps" title="Apple Maps"><img src="https://www.apple.com/favicon.ico" alt="" width="16" height="16"></a></div>'+(s.phone?'<a href="tel:'+esc(s.phone)+'">'+esc(s.phone)+'</a>':'')+(p.updated?'<small title="'+esc(new Date(p.updated).toLocaleString('en-US',{timeZone:'America/New_York'}))+'">Updated '+esc(age(p.updated))+'</small>':p.checked?'<small>Source checked '+esc(age(p.checked))+(p.stale?' · source price may be >24h old':'')+'</small>':'')+'<button type="button" class="gas-submit" data-station="'+i+'" aria-label="Submit current price for '+esc(s.name)+'">Submit current price</button></div></article>';}).join('');
}
render();
fetch('data/gas-prices.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(d&&d.stations){render(d.stations);const el=document.querySelector('#priceStatus');if(el){const src=d.source_url?'<a href="'+esc(d.source_url)+'" target="_blank" rel="noopener">'+esc(d.source||'source')+' ↗</a>':esc(d.source||'available sources');el.innerHTML='<strong>Prices:</strong> Sorted lowest to highest by the latest available regular-gas price. Current data source: '+src+'. Stations without a current regular price appear last.';}}}).catch(()=>{});
})();