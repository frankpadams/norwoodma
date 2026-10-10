(()=>{'use strict';
const slot=document.getElementById('homeAdSlot'),view=document.getElementById('sponsorCreative'),next=document.getElementById('sponsorNext');
if(!slot||!view||!next)return;
let sponsors=[],index=0,pausedUntil=0,seen=new Set();
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
function advance(manual){if(sponsors.length<2)return;index=(index+1)%sponsors.length;if(manual)pausedUntil=Date.now()+60000;render()}
next.addEventListener('click',()=>advance(true));
fetch('/data/sponsors.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Sponsor registry unavailable');return r.json()}).then(d=>{sponsors=(d.sponsors||[]).filter(eligible);if(sponsors.length)render()}).catch(()=>{next.hidden=true});
setInterval(()=>{if(document.hidden||Date.now()<pausedUntil)return;advance(false)},20000);
})();