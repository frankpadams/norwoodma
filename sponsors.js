(()=>{'use strict';
const slot=document.getElementById('homeAdSlot'),view=document.getElementById('sponsorCreative'),next=document.getElementById('sponsorNext');
if(!slot||!view||!next)return;
let sponsors=[],index=0,pausedUntil=0,paidTurns=0,timer=null;
const allowedUrl=u=>{try{const x=new URL(u,location.origin);return ['https:','http:'].includes(x.protocol)?x.href:null}catch{return null}};
const eligible=s=>s.active!==false&&Array.isArray(s.placements)&&s.placements.includes('home-primary')&&(!s.start||Date.now()>=Date.parse(s.start))&&(!s.end||Date.now()<=Date.parse(s.end+'T23:59:59'))&&allowedUrl(s.url);
function render(){
const s=sponsors[index];if(!s)return;view.replaceChildren();
const a=document.createElement('a');a.href=allowedUrl(s.url);a.className=s.image?'home-ad-image-link':'ad-placeholder';a.rel='noopener sponsored';if(new URL(a.href).origin!==location.origin)a.target='_blank';
if(s.image){const img=document.createElement('img');img.src=s.image;img.alt=s.alt||s.name||'Sponsor';a.append(img)}
else{const strong=document.createElement('strong');strong.textContent=s.name||'Local advertising space';const span=document.createElement('span');span.textContent='Advertise on Norwood.ma →';a.append(strong,span)}
a.addEventListener('click',()=>{try{const k='norwood-sponsor-clicks';const d=JSON.parse(localStorage.getItem(k)||'{}');d[s.id]=(d[s.id]||0)+1;localStorage.setItem(k,JSON.stringify(d))}catch{}});
view.append(a);next.hidden=sponsors.length<2;
try{const k='norwood-sponsor-impressions',d=JSON.parse(localStorage.getItem(k)||'{}');d[s.id]=(d[s.id]||0)+1;localStorage.setItem(k,JSON.stringify(d))}catch{}
}
function advance(manual){
if(sponsors.length<2)return;
const promo=sponsors.findIndex(s=>s.id==='advertise');
const paid=sponsors.map((s,i)=>i).filter(i=>i!==promo);
if(!paid.length)index=promo;
else if(promo<0)index=paid[(paid.indexOf(index)+1)%paid.length];
else if(index===promo){index=paid[0];paidTurns=0;}
else{paidTurns++;index=paidTurns%4===0?promo:paid[(paid.indexOf(index)+1)%paid.length]}
if(manual)pausedUntil=Date.now()+60000;
render();schedule();
}
function schedule(){
if(timer)clearTimeout(timer);
timer=setTimeout(()=>{if(document.hidden||Date.now()<pausedUntil){schedule();return}advance(false)},sponsors[index]?.id==='advertise'?10000:20000);
}
next.addEventListener('click',()=>advance(true));
fetch('/data/sponsors.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Sponsor registry unavailable');return r.json()}).then(d=>{sponsors=(d.sponsors||[]).filter(eligible);if(sponsors.length){index=Math.max(0,sponsors.findIndex(s=>s.id!=='advertise'));render();schedule()}}).catch(()=>{next.hidden=true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&sponsors.length)schedule()});
})();