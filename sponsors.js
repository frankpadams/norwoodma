(()=>{'use strict';
const slot=document.getElementById('homeAdSlot'),view=document.getElementById('sponsorCreative'),next=document.getElementById('sponsorNext');
if(!slot||!view||!next)return;
const backup=[{id:'boston-mobile-tire',name:'Boston Mobile Tire',image:'/assets/ads/wide_rectangular_advertising_banner_for_a_mobile_t.png',url:'https://bostonmobiletire.com',alt:'Boston Mobile Tire — Tires installed, mounted and balanced at your work or home.',placements:['home-primary'],active:true},{id:'advertise',name:'Advertise on Norwood.ma',url:'/support.html#advertise',placements:['home-primary'],active:true}];
let sponsors=backup,index=0,timer=null,pauseUntil=0;
const safeUrl=value=>{try{const u=new URL(value,location.href);return /^https?:$/.test(u.protocol)?u.href:null}catch{return null}};
const eligible=s=>s&&s.active!==false&&Array.isArray(s.placements)&&s.placements.includes('home-primary')&&safeUrl(s.url)&&(!s.start||Date.now()>=Date.parse(s.start))&&(!s.end||Date.now()<=Date.parse(s.end+'T23:59:59'));
function track(kind,s){try{const key='norwood-sponsor-'+kind,d=JSON.parse(localStorage.getItem(key)||'{}');d[s.id]=(d[s.id]||0)+1;localStorage.setItem(key,JSON.stringify(d))}catch{}}
function render(){
 const s=sponsors[index];if(!s)return;
 const a=document.createElement('a');a.href=safeUrl(s.url);a.rel='noopener sponsored';if(new URL(a.href).origin!==location.origin)a.target='_blank';
 const fallback=()=>{a.className='ad-placeholder';a.replaceChildren();const strong=document.createElement('strong');strong.textContent=s.name||'Sponsor';const small=document.createElement('span');small.textContent=s.id==='advertise'?'Advertise on Norwood.ma →':'Visit sponsor →';a.append(strong,small)};
 if(s.image){a.className='home-ad-image-link';const img=document.createElement('img');img.alt=s.alt||s.name||'Sponsor';img.onerror=fallback;img.src=s.image;a.append(img)}else fallback();
 a.addEventListener('click',()=>track('clicks',s));view.replaceChildren(a);slot.hidden=false;next.hidden=sponsors.length<2;track('impressions',s);
}
function advance(manual=false){if(manual)pauseUntil=Date.now()+60000;index=(index+1)%sponsors.length;render();schedule()}
function schedule(){clearTimeout(timer);if(sponsors.length<2)return;timer=setTimeout(()=>{if(document.hidden||Date.now()<pauseUntil){schedule();return}advance()},20000)}
next.addEventListener('click',()=>advance(true));
render();schedule();
fetch('/data/sponsors.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Sponsor registry unavailable');return r.json()}).then(data=>{
 const valid=(Array.isArray(data.sponsors)?data.sponsors:[]).filter(eligible);
 if(!valid.some(s=>s.id!=='advertise'))return;
 sponsors=valid;index=Math.max(0,sponsors.findIndex(s=>s.id==='boston-mobile-tire'));render();schedule();
}).catch(()=>{});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
})();