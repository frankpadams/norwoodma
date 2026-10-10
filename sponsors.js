(()=>{'use strict';
const first=document.getElementById('homeAdSlot'),calendar=document.querySelector('.dashboard-grid .dash-stack'),transit=document.querySelector('.dashboard-grid .transit-preview');
if(!first||!calendar||!transit)return;
const grid=calendar.closest('.dashboard-grid'),second=first.cloneNode(true);
second.id='homeAdSlotSecondary';second.querySelector('#sponsorNext').id='sponsorNextSecondary';second.querySelector('#sponsorCreative').id='sponsorCreativeSecondary';second.hidden=true;
const slots=[first,second],views=slots.map(s=>s.querySelector('[id^="sponsorCreative"]')),buttons=slots.map(s=>s.querySelector('[id^="sponsorNext"]'));
let sponsors=[],indices=[-1,-1],turns=[0,0],paused=[0,0],timers=[null,null],positioning=false;
const url=u=>{try{const x=new URL(u,location.origin);return /^(https?:)$/.test(x.protocol)?x.href:null}catch{return null}};
const eligible=s=>s.active!==false&&Array.isArray(s.placements)&&s.placements.includes('home-primary')&&(!s.start||Date.now()>=Date.parse(s.start))&&(!s.end||Date.now()<=Date.parse(s.end+'T23:59:59'))&&url(s.url);
const paid=()=>sponsors.map((s,i)=>i).filter(i=>s.id!=='advertise'),promo=()=>sponsors.findIndex(s=>s.id==='advertise');
function track(kind,s){try{const k='norwood-sponsor-'+kind,d=JSON.parse(localStorage.getItem(k)||'{}');d[s.id]=(d[s.id]||0)+1;localStorage.setItem(k,JSON.stringify(d))}catch{}}
function render(n){const i=indices[n],slot=slots[n],view=views[n],button=buttons[n];if(i<0||!sponsors[i]){slot.hidden=true;return}
const s=sponsors[i];slot.hidden=false;view.replaceChildren();
const a=document.createElement('a');a.href=url(s.url);a.className=s.image?'home-ad-image-link':'ad-placeholder';a.rel='noopener sponsored';if(new URL(a.href).origin!==location.origin)a.target='_blank';
if(s.image){const img=document.createElement('img');img.src=s.image;img.alt=s.alt||s.name||'Sponsor';a.append(img)}else{const strong=document.createElement('strong');strong.textContent=s.name||'Sponsor Norwood.ma';const span=document.createElement('span');span.textContent='Advertise on Norwood.ma →';a.append(strong,span)}
a.addEventListener('click',()=>track('clicks',s));view.append(a);button.hidden=sponsors.length<2;track('impressions',s);
}
function choose(n,preferPromo=false){const other=indices[1-n],choices=paid().filter(i=>i!==other),house=promo();
if(preferPromo&&house>=0&&house!==other)return house;
if(choices.length){const prev=indices[n],next=choices.find(i=>i>prev);return next===undefined?choices[0]:next}
return house>=0&&house!==other?house:-1;
}
function schedule(n){clearTimeout(timers[n]);if(indices[n]<0||slots[n].hidden)return;const delay=sponsors[indices[n]]?.id==='advertise'?10000:20000;timers[n]=setTimeout(()=>{if(document.hidden||Date.now()<paused[n]){schedule(n);return}advance(n,false)},delay)}
function advance(n,manual){if(indices[n]<0)return;turns[n]++;indices[n]=choose(n,turns[n]%4===0);if(manual)paused[n]=Date.now()+60000;render(n);schedule(n);if(indices[1-n]<0&& !slots[1-n].hidden){render(1-n);schedule(1-n)}}
buttons.forEach((b,n)=>b.addEventListener('click',()=>advance(n,true)));
function layout(){if(positioning)return;positioning=true;
requestAnimationFrame(()=>{positioning=false;const narrow=window.matchMedia('(max-width:760px)').matches;
const left=calendar.querySelector('.event-splash'),lh=left?.getBoundingClientRect().height||0,rh=transit.getBoundingClientRect().height;
const shorter=lh<=rh?calendar:transit,longer=shorter===calendar?transit:calendar;
if(first.parentElement!==shorter)shorter.append(first);
const two=!narrow&&Math.abs(lh-rh)<=100&&sponsors.length>=2;
if(two){if(second.parentElement!==longer)longer.append(second);if(indices[1]<0||indices[1]===indices[0])indices[1]=choose(1);render(1);schedule(1)}
else{clearTimeout(timers[1]);second.hidden=true;indices[1]=-1;if(second.parentElement)second.remove()}
if(indices[0]>=0){render(0);schedule(0)}
})}
let layoutTimer;const relayout=()=>{clearTimeout(layoutTimer);layoutTimer=setTimeout(layout,120)};
const observer=new ResizeObserver(relayout);observer.observe(calendar.querySelector('.event-splash'));observer.observe(transit);
window.addEventListener('resize',relayout,{passive:true});
fetch('/data/sponsors.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Sponsor registry unavailable');return r.json()}).then(d=>{sponsors=(d.sponsors||[]).filter(eligible);indices[0]=choose(0);layout()}).catch(()=>{buttons[0].hidden=true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)slots.forEach((s,n)=>schedule(n))});
})();