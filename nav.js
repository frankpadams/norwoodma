(()=>{
  const SITE_VERSION='2.1.3';
  if(!document.querySelector('script[data-norwood-pwa]')){const s=document.createElement('script');s.src='/pwa.js?v=20260928-rounded2';s.dataset.norwoodPwa='true';document.head.appendChild(s);}
  const menu=document.querySelector('#menu'),nav=document.querySelector('#nav');
  if(!menu||!nav)return;
  // Site-wide time-sensitive alert strip. Severe weather and public-safety alerts
  // are fetched live from NWS; alerts.json can carry verified local/state emergency notices.
  async function sitewideTimelyAlerts(){
    const existing=document.querySelector('.site-timely-alert');
    // Keep the current strip in place while refreshing. Removing it before the
    // async fetches complete causes a visible 34–36px layout jump once a minute.
    const priority={Extreme:40,Severe:35,Moderate:30,Minor:25,Unknown:20};
    const allowed=/tornado|severe thunderstorm|flash flood|flood warning|flood watch|hurricane|tropical storm|winter storm|blizzard|ice storm|snow squall|extreme cold|extreme heat|high wind|red flag|fire warning|civil emergency|evacuation|shelter in place|law enforcement warning|child abduction|amber alert|silver alert|missing person|911 telephone outage|local area emergency|nuclear power plant warning|hazardous materials warning/i;
    const govLive='https://norwoodcommunitymedia.org/programs/site/government-3/broadcast/';
    const NORWOOD_TIME_ZONE='America/New_York';
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const easternParts=()=>{
      // All civic-alert timing follows Norwood, MA local time, regardless of the visitor's device timezone.
      const parts=new Intl.DateTimeFormat('en-US',{timeZone:NORWOOD_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
      const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));
      return {date:`${v.year}-${v.month}-${v.day}`,minutes:Number(v.hour)*60+Number(v.minute)};
    };
    function confirmedNcmLive(notice,schedule,now){
      if(schedule?.date!==now.date)return false;
      const channel=schedule.channels?.[/school committee/i.test(notice.title||'')?'schools':'government'];
      if(channel?.status!=='scheduled')return false;
      const slots=(channel.slots||[]).filter(s=>Number.isInteger(s.minute)&&s.minute>=0&&s.minute<1440).sort((a,b)=>a.minute-b.minute);
      const index=slots.findLastIndex(s=>s.minute<=now.minutes);
      if(index<0)return false;
      const slot=slots[index],end=slots[index+1]?.minute??Math.min(1440,slot.minute+180);
      if(now.minutes>=end)return false;
      const title=String(slot.title||'');
      if(/\b(rebroadcast|replay|repeat|recorded)\b/i.test(title))return false;
      const recorded=title.match(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4}|\d{2})\b/);
      if(recorded){
        const year=recorded[3].length===2?'20'+recorded[3]:recorded[3];
        const date=year+'-'+recorded[1].padStart(2,'0')+'-'+recorded[2].padStart(2,'0');
        if(date!==now.date)return false;
      }
      if(slot.live!==true&&slot.is_live!==true&&!/\blive\b/i.test(title))return false;
      const key=s=>String(s).toLowerCase().replace(/\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/g,'').replace(/\b(live|meeting|broadcast|norwood)\b/g,'').replace(/[^a-z0-9]/g,'');
      return key(title)===key(notice.title)&&key(notice.title)!=='';
    }
    const normalize=a=>({title:String(a.title||a.event||'Emergency alert'),summary:String(a.summary||a.headline||a.description||''),url:String(a.url||a.web||a['@id']||''),severity:String(a.severity||'Unknown'),expires:a.expires||null,source:a.source||'Public alert',rank:priority[String(a.severity||'Unknown')]||20,kind:'urgent'});
    const items=[];
    try{
      const r=await fetch('https://api.weather.gov/alerts/active?point=42.1945,-71.1995',{headers:{Accept:'application/geo+json'}});
      if(r.ok){const j=await r.json();for(const f of (j.features||[])){const p=f.properties||{};if(allowed.test(p.event||'')){const alertId=String(f.id||'').split('/').pop();const publicUrl=alertId?'https://forecast.weather.gov/wwamap/wwatxtget.php?cwa=BOX&wwa='+encodeURIComponent(p.event||'Weather Alert'):'https://forecast.weather.gov/MapClick.php?lat=42.1945&lon=-71.1995';items.push(normalize({event:p.event,headline:p.headline,description:p.description,severity:p.severity,expires:p.expires,url:publicUrl,source:p.senderName||'National Weather Service'}));}}}
    }catch(e){}
    try{
      const r=await fetch('data/alerts.json?fresh='+Date.now(),{cache:'no-store'});
      if(r.ok){const j=await r.json();for(const a of (Array.isArray(j)?j:[])){const exp=a.expires?Date.parse(a.expires):Infinity;if(a.active!==false&&exp>Date.now()&&allowed.test((a.type||'')+' '+(a.title||'')))items.push(normalize(a));}}
    }catch(e){}
    try{
      const r=await fetch('data/civic-notices.json?fresh='+Date.now(),{cache:'no-store'});
      if(r.ok){
        const data=await r.json(), list=Array.isArray(data)?data:(data.notices||[]), now=easternParts();
        let ncmSchedule=null;
        try{
          const response=await fetch('data/ncm-now-playing.json?fresh='+Date.now(),{cache:'no-store'});
          if(response.ok)ncmSchedule=await response.json();
        }catch(e){}
        for(const n of list){
          if(n.kind==='election'){
            const first=n.show_from||n.start_date, last=n.election_date||n.end_date;
            if(first&&last&&now.date>=first&&now.date<=last)items.push({kind:'election',rank:15,title:n.title||'Election Day notice',url:n.url||'https://www.norwoodma.gov/',date:last});
          }else if(n.kind==='community_meeting'&&n.date){
            const first=n.show_from||n.date;
            if(now.date<first||now.date>n.date)continue;
            const hm=x=>{if(!x)return null;const m=String(x).match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null;};
            const st=hm(n.start_time), en=hm(n.end_time);
            const isToday=now.date===n.date;
            if(isToday){
              const cutoff=st!==null?Math.max(en!==null?en:st,st+120):en;
              if(cutoff!==null&&now.minutes>cutoff)continue;
            }
            items.push({kind:'community_meeting',rank:isToday?13:11,title:n.title||'Community meeting',url:n.url||'events.html',today:isToday,date:n.date,eventTime:n.start_time});
          }else if(n.kind==='meeting'&&n.date===now.date){
            const hm=x=>{if(!x)return null;const m=String(x).match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null;};
            const st=hm(n.start_time), en=hm(n.end_time);
            // A meeting notice is useful before/during the meeting, but should disappear
            // completely once the scheduled meeting window has ended. When no end time is
            // available, use a 2-hour-from-start safety window rather than showing it all day.
            const broadcastEnd=hm(n.broadcast_end_time);
            const scheduledCutoff=st!==null?(en!==null?en+60:st+180):en;
            // A verified NCM broadcast transition may end LIVE NOW earlier than the
            // schedule-based grace period. Never infer an early end merely because
            // broadcast data is missing.
            const cutoff=broadcastEnd!==null&&st!==null&&broadcastEnd>=st
              ? Math.min(scheduledCutoff!==null?scheduledCutoff:broadcastEnd,broadcastEnd)
              : scheduledCutoff;
            if(cutoff!==null&&now.minutes>cutoff)continue;
            const liveCutoff=broadcastEnd!==null&&st!==null&&broadcastEnd>=st?broadcastEnd:(en!==null?en:st!==null?st+120:null);
            const live=st!==null&&now.minutes>=st&&(liveCutoff===null||now.minutes<liveCutoff)&&confirmedNcmLive(n,ncmSchedule,now);
            let title=n.title||'Public meeting';
            if(!/\bmeeting\b/i.test(title))title+=' Meeting';
            let url=n.url||'https://www.norwoodma.gov/calendar.php';
            // Never send visitors to Revize's raw JSON/data handler. Use the human-readable
            // Town calendar page for non-live meeting notices instead.
            if(/calendar_data_handler\.php/i.test(url)){
              const d=new Date(n.date+'T12:00:00');
              url='https://www.norwoodma.gov/calendar.php?view=month&month='+String(d.getMonth()+1).padStart(2,'0')+'&day=01&year='+d.getFullYear();
            }
            const fmtTime=x=>{const m=String(x||'').match(/^(\d{1,2}):(\d{2})/);if(!m)return '';const h=Number(m[1]),min=m[2],ap=h>=12?'PM':'AM',h12=((h+11)%12)+1;return h12+':'+min+' '+ap;};
            items.push({kind:'meeting',rank:live?18:12,title,url,live,date:n.date,eventTime:n.start_time,startTime:fmtTime(n.start_time),scheduledEnd:n.end_time||null,overrun:en!==null&&now.minutes>en});
          }
        }
      }
    }catch(e){}
    if(!items.length){if(existing)existing.remove();return;}
    const electionOnly=easternParts().date>='2026-10-29'&&easternParts().date<='2026-11-03';
    const visibleItems=electionOnly?items.filter(a=>a.kind==='election'):items;
    const meetings=visibleItems.filter(a=>a.kind==='meeting'||a.kind==='community_meeting');
    const titleKey=title=>String(title||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/ meeting$/,'');
    const timeKey=time=>String(time||'').slice(0,5).padStart(5,'0');
    if(meetings.length){
      try{
        const response=await fetch('/data/events.json',{cache:'no-cache'});
        const events=response.ok?await response.json():[];
        for(const meeting of meetings){
          const explicitId=new URL(meeting.url,location.href).searchParams.get('event');
          const explicit=explicitId&&events.find(event=>event.id===explicitId);
          const matching=events.filter(event=>event.id&&event.start?.date===meeting.date
            &&titleKey(event.title)===titleKey(meeting.title)
            &&(!meeting.eventTime||timeKey(event.start.time)===timeKey(meeting.eventTime)));
          const event=explicit||(matching.length===1?matching[0]:null);
          if(event)meeting.calendarUrl='/events.html?event='+encodeURIComponent(event.id);
        }
      }catch(e){/* Keep the notice’s source link if the calendar is unavailable. */}
    }
    const seen=new Set();
    const alerts=visibleItems.sort((a,b)=>b.rank-a.rank).filter(a=>{
      const key=a.kind==='meeting'||a.kind==='community_meeting'
        ? [a.date,timeKey(a.eventTime),titleKey(a.title)].join('|')
        : [a.kind,a.title,a.url].join('|').toLowerCase();
      if(seen.has(key))return false;
      seen.add(key);
      return true;
    });
    if(!alerts.length){existing?.remove();return;}
    const signature=JSON.stringify(alerts);
    if(existing?.dataset.alertSignature===signature)return;
    const strip=document.createElement('aside');
    strip.dataset.alertSignature=signature;
    strip.className='site-timely-alert';strip.setAttribute('role','region');strip.setAttribute('aria-label','Time-sensitive Norwood notices');
    strip.innerHTML='<button class="site-timely-prev" type="button" aria-label="Previous alert">‹</button><div class="site-timely-track" tabindex="0">'+alerts.map(a=>{
      let label='NOTICE';
      if(a.kind==='urgent')label=/child abduction|amber/i.test(a.title)?'AMBER ALERT':/silver alert|missing person/i.test(a.title)?'SILVER / MISSING PERSON ALERT':/tornado|storm|flood|hurricane|blizzard|squall|heat|cold|wind|fire/i.test(a.title)?'WEATHER ALERT':'EMERGENCY ALERT';
      if(a.kind==='election')label='ELECTION DAY';
      if(a.kind==='community_meeting')label=a.today?'TODAY':'UPCOMING';
      if(a.kind==='meeting')label=a.live?'LIVE NOW':'TODAY';
      const meetingTime=a.kind==='meeting'&&a.startTime?' — '+esc(a.startTime):'';
      const main='<strong>'+label+':</strong> '+esc(a.title)+meetingTime;
      const href=esc(a.calendarUrl||a.url||'#');
      const external=a.calendarUrl?'':' target="_blank" rel="noopener"';
      if(a.kind==='meeting'&&a.live){
        let endNote='';
        if(a.scheduledEnd){
          const m=String(a.scheduledEnd).match(/^(\\d{1,2}):(\\d{2})/);
          if(m){
            const h=Number(m[1]),min=m[2],ap=h>=12?'PM':'AM',h12=((h+11)%12)+1;
            if(a.overrun)endNote=' <span class="meeting-scheduled-end">(Scheduled end: '+h12+':'+min+' '+ap+')</span>';
          }
        }
        return '<span class="site-timely-item"><a href="'+href+'"'+external+'>'+main+' <span aria-hidden="true">→</span></a> <a class="watch-live" href="'+govLive+'" target="_blank" rel="noopener">Watch Live →</a>'+endNote+'</span>';
      }
      if(a.kind==='community_meeting'){
        const liveLink=a.today?' <a class="watch-live" href="'+govLive+'" target="_blank" rel="noopener">If televised: Watch on NCM →</a>':'';
        return '<span class="site-timely-item"><a href="'+href+'"'+external+'>'+main+' <span aria-hidden="true">→</span></a>'+liveLink+'</span>';
      }
      return '<a class="site-timely-item" href="'+href+'"'+external+'>'+main+' <span aria-hidden="true">→</span></a>';
    }).join('')+'</div><button class="site-timely-next" type="button" aria-label="Next alert">›</button><span class="site-timely-status sr-only" aria-live="polite"></span>';
    const track=strip.querySelector('.site-timely-track'), slides=[...strip.querySelectorAll('.site-timely-item')];
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(slides.length>1&&!reduced){
      strip.classList.add('site-timely-marquee');
      strip.querySelector('.site-timely-prev')?.remove();
      strip.querySelector('.site-timely-next')?.remove();
      const group=document.createElement('div');
      group.className='site-timely-marquee-group';
      slides.forEach(el=>{el.classList.add('is-active');group.appendChild(el);});
      track.appendChild(group);
      const duplicate=group.cloneNode(true);
      duplicate.setAttribute('aria-hidden','true');
      duplicate.querySelectorAll('a,button,[tabindex]').forEach(el=>el.setAttribute('tabindex','-1'));
      track.appendChild(duplicate);
      const size=()=>{const w=group.getBoundingClientRect().width;track.style.setProperty('--ticker-distance',w+'px');track.style.setProperty('--ticker-duration',Math.max(12,w/45)+'s');};
      size();
      if('ResizeObserver' in window)new ResizeObserver(size).observe(group);
      else window.addEventListener('resize',size);
      track.addEventListener('touchstart',()=>strip.classList.add('ticker-paused'),{passive:true});
      track.addEventListener('touchend',()=>strip.classList.remove('ticker-paused'),{passive:true});
      track.addEventListener('touchcancel',()=>strip.classList.remove('ticker-paused'),{passive:true});
    }else{
      let active=0;
      const show=index=>{
        active=(index+slides.length)%slides.length;
        slides.forEach((el,i)=>{el.classList.toggle('is-active',i===active);el.setAttribute('aria-hidden',String(i!==active));});
      };
      show(0);
      const prev=strip.querySelector('.site-timely-prev'), next=strip.querySelector('.site-timely-next');
      if(slides.length>1){
        prev.addEventListener('click',()=>show(active-1));
        next.addEventListener('click',()=>show(active+1));
      }else{
        prev.remove();
        next.remove();
        strip.classList.add('site-timely-single');
      }
    }
    const independent=document.querySelector('.independent');
    if(existing)existing.replaceWith(strip);
    else if(independent)independent.insertAdjacentElement('afterend',strip);
    else document.body.prepend(strip);
    // A single alert may fit on desktop but overflow on a narrow phone.
    // Measure the rendered text against the actual strip width after insertion.
    if(slides.length===1&&!reduced){
      const item=slides[0];
      const measure=()=>{
        const available=track.clientWidth;
        const contentWidth=item.scrollWidth;
        const needsScroll=contentWidth>available+1;
        if(needsScroll&&!strip.classList.contains('site-timely-marquee')){
          strip.classList.add('site-timely-marquee');
          strip.classList.remove('site-timely-single');
          item.classList.add('is-active');
          const group=document.createElement('div');
          group.className='site-timely-marquee-group';
          group.appendChild(item);
          track.appendChild(group);
          const duplicate=group.cloneNode(true);
          duplicate.setAttribute('aria-hidden','true');
          duplicate.querySelectorAll('a,button,[tabindex]').forEach(el=>el.setAttribute('tabindex','-1'));
          track.appendChild(duplicate);
        }else if(!needsScroll&&strip.classList.contains('site-timely-marquee')){
          const group=track.querySelector('.site-timely-marquee-group');
          if(group){track.appendChild(item);track.querySelectorAll('.site-timely-marquee-group').forEach(el=>el.remove());}
          strip.classList.remove('site-timely-marquee');
          strip.classList.add('site-timely-single');
        }
        if(needsScroll){
          const group=track.querySelector('.site-timely-marquee-group');
          if(group){
            const width=group.getBoundingClientRect().width;
            track.style.setProperty('--ticker-distance',width+'px');
            track.style.setProperty('--ticker-duration',Math.max(12,width/45)+'s');
          }
        }
      };
      requestAnimationFrame(measure);
      if('ResizeObserver' in window)new ResizeObserver(measure).observe(track);
      else window.addEventListener('resize',measure);
      document.fonts?.ready.then(measure);
      track.addEventListener('touchstart',()=>strip.classList.add('ticker-paused'),{passive:true});
      track.addEventListener('touchend',()=>strip.classList.remove('ticker-paused'),{passive:true});
      track.addEventListener('touchcancel',()=>strip.classList.remove('ticker-paused'),{passive:true});
    }
  }
  sitewideTimelyAlerts();
  // Re-check critical alerts on already-open pages. The underlying alert/event fetches
  // use cache:'no-store' plus a unique timestamp, so each pass asks for current data.
  setInterval(sitewideTimelyAlerts,60000);
  // Keep iOS Home Screen metadata consistent on every page that loads the shared nav.
  let apple=document.querySelector('link[rel="apple-touch-icon"]');
  if(!apple){apple=document.createElement('link');apple.rel='apple-touch-icon';document.head.appendChild(apple);}
  apple.href='https://www.norwood.ma/assets/favicon-approved.png?v=0.13.4.4';apple.sizes='1024x1024';
  let appTitle=document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if(!appTitle){appTitle=document.createElement('meta');appTitle.name='apple-mobile-web-app-title';document.head.appendChild(appTitle);}
  appTitle.content='Norwood.ma';
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent||'')||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const isStandalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  if(!document.getElementById('norwood-primary-nav-style')){
    const navStyle=document.createElement('style');
    navStyle.id='norwood-primary-nav-style';
    navStyle.textContent="\n/* Navigation experiment: production header aesthetics, responsive fit, prototype menus. */\nheader.top{display:flex!important;align-items:center!important;justify-content:space-between!important;flex-wrap:nowrap!important;gap:16px!important;min-height:82px!important;height:auto!important;padding:10px 18px!important;overflow:visible!important;position:relative!important}\nheader.top>.brand.approved{display:block!important;flex:0 1 260px!important;width:min(260px,45vw)!important;max-width:260px!important;min-width:120px!important;height:auto!important;min-height:0!important;margin:0!important}\nheader.top>.brand.approved img{display:block!important;width:100%!important;max-height:none!important;height:auto!important}\nheader.top>#nav.nav-lab{display:flex!important;position:static!important;flex:0 0 auto!important;align-items:center!important;justify-content:flex-end!important;gap:7px!important;overflow:visible!important;min-height:60px!important;height:auto!important;padding:0!important;margin:0!important;background:transparent!important;border:0!important;box-shadow:none!important;width:auto!important}\n#nav.nav-lab .lab-item{position:relative;flex:0 0 auto;min-width:0}\n#nav.nav-lab>a::before{content:none!important;display:none!important}\n#nav.nav-lab .lab-trigger,#nav.nav-lab .lab-direct{appearance:none;display:inline-flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;min-height:60px!important;padding:7px 9px!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:transparent!important;color:#fff!important;font-family:inherit!important;font-size:12px!important;font-weight:750!important;line-height:1.2!important;text-align:center!important;white-space:nowrap!important;cursor:pointer!important;text-decoration:none!important}\n#nav.nav-lab .lab-direct{min-width:54px!important}\n#nav.nav-lab .lab-symbol{display:block!important;width:18px!important;height:18px!important;flex:none;fill:currentColor;stroke:none}\n#nav.nav-lab .lab-caption{display:flex;align-items:center;justify-content:center;gap:5px}\n#nav.nav-lab .lab-trigger:hover,#nav.nav-lab .lab-direct:hover,#nav.nav-lab .lab-trigger:focus-visible,#nav.nav-lab .lab-direct:focus-visible,#nav.nav-lab .lab-trigger[aria-expanded=\"true\"]{background:transparent!important;color:var(--gold,#f2c100)!important}\n#nav.nav-lab .lab-trigger:focus-visible,#nav.nav-lab .lab-direct:focus-visible,#nav.nav-lab .lab-panel a:focus-visible,header.top>#menu:focus-visible{outline:2px solid #d6a800!important;outline-offset:2px}\n#nav.nav-lab .lab-panel{position:absolute!important;top:calc(100% + 2px)!important;left:0!important;right:auto!important;z-index:10000!important;min-width:245px!important;max-height:min(72vh,620px)!important;overflow-y:auto!important;overscroll-behavior:contain;padding:8px!important;background:#fff!important;border:1px solid #cddce5!important;border-radius:10px!important;box-shadow:0 12px 28px rgba(0,35,65,.18)!important;text-align:left}\n#nav.nav-lab .lab-panel[hidden]{display:none!important}\n#nav.nav-lab .lab-panel a{display:block!important;width:auto!important;height:auto!important;min-height:34px!important;padding:8px 12px!important;border:0!important;border-radius:7px!important;background:transparent!important;color:#153b56!important;opacity:1!important;visibility:visible!important;font-family:inherit!important;font-weight:650!important;font-size:14px!important;line-height:1.4!important;text-decoration:none!important}\n#nav.nav-lab .lab-panel a::before{content:none!important;display:none!important}\n#nav.nav-lab .lab-panel a:hover{background:#edf4f7!important;color:#003b71!important}\n#nav.nav-lab .lab-section-label{color:#657a88;font:850 10px/1.4 inherit;font-family:inherit;letter-spacing:.08em;text-transform:uppercase;padding:12px 12px 5px;margin-top:5px;border-top:1px solid #e3ebef}\n#nav.nav-lab .lab-panel .lab-section-label:first-child{border-top:0;margin-top:0;padding-top:7px}\n#nav.nav-lab .lab-item:last-of-type .lab-panel{right:0!important;left:auto!important}\nheader.top>#menu{display:none!important;position:relative!important;order:2!important;flex:0 0 44px!important;width:44px!important;max-width:44px!important;min-height:44px!important;height:44px!important;margin:0 0 0 auto!important;padding:0!important;align-items:center!important;justify-content:center!important;background:#0a3652!important;background-image:none!important;border:1px solid #ffffff66!important;border-radius:8px!important;color:#fff!important;box-shadow:none!important;text-shadow:none!important;font-size:0!important;line-height:0!important;cursor:pointer!important}\nheader.top>#menu::before,header.top>#menu::after,header.top.norwood-menu-collapsed>#menu::before,header.top.norwood-menu-collapsed>#menu::after{content:none!important;display:none!important;background:none!important;border:0!important;box-shadow:none!important}\nheader.top>#menu svg{display:block!important;position:relative!important;z-index:2!important;flex:0 0 24px!important;width:24px!important;height:24px!important}\nheader.top.norwood-menu-collapsed>#menu{display:inline-flex!important}\nheader.top.norwood-menu-collapsed>#nav.nav-lab{display:none!important;position:absolute!important;left:auto!important;right:14px!important;top:calc(100% - 1px)!important;z-index:9999!important;width:max-content!important;min-width:220px!important;max-width:calc(100vw - 28px)!important;max-height:70vh!important;overflow-y:auto!important;overscroll-behavior:contain;flex-direction:column!important;align-items:stretch!important;justify-content:flex-start!important;gap:2px!important;padding:8px!important;background:#fff!important;border:1px solid #ccd6e3!important;border-radius:10px!important;box-shadow:0 12px 28px #00183730!important;box-sizing:border-box!important}\nheader.top.norwood-menu-collapsed>#nav.nav-lab.open{display:flex!important}\nheader.top.norwood-menu-collapsed #nav.nav-lab .lab-item{width:100%!important}\nheader.top.norwood-menu-collapsed #nav.nav-lab .lab-trigger,header.top.norwood-menu-collapsed #nav.nav-lab .lab-direct{width:100%!important;min-width:0!important;min-height:48px!important;flex-direction:row!important;justify-content:flex-start!important;text-align:left!important;gap:12px!important;padding:12px!important;color:#003b71!important;font-size:15px!important;box-sizing:border-box!important}\nheader.top.norwood-menu-collapsed #nav.nav-lab .lab-caption{flex:1;justify-content:flex-start}\nheader.top.norwood-menu-collapsed #nav.nav-lab .lab-panel{position:static!important;width:100%!important;min-width:0!important;max-height:none!important;overflow:visible!important;box-sizing:border-box!important;box-shadow:none!important;border:0!important;border-radius:0!important;background:#f7fafc!important;padding:3px 8px 8px 30px!important}\nheader.top.norwood-menu-collapsed #nav.nav-lab .lab-panel a{padding:10px 12px!important;font-size:14px!important}\nheader.top.norwood-menu-collapsed #nav.nav-lab .lab-trigger[aria-expanded=\"true\"]{background:#f1f6fb!important;color:#003b71!important}\n\n/* Align prototype menu windows and row treatments with the live compact navigation. */\nheader.top.norwood-menu-collapsed #nav.nav-lab .lab-item{border-bottom:1px solid #e3e9ef!important}\nheader.top.norwood-menu-collapsed #nav.nav-lab .lab-item:last-of-type{border-bottom:0!important}\nheader.top.norwood-menu-collapsed #nav.nav-lab .lab-trigger,header.top.norwood-menu-collapsed #nav.nav-lab .lab-direct{min-height:44px!important;padding:10px 12px!important;gap:10px!important;font-size:14px!important;font-weight:650!important;line-height:1.35!important}\nheader.top.norwood-menu-collapsed #nav.nav-lab .lab-panel{margin:0!important;padding:2px 0 6px 0!important;background:#fff!important;border-top:1px solid #e3e9ef!important;box-shadow:none!important}\nheader.top.norwood-menu-collapsed #nav.nav-lab .lab-panel a{min-height:0!important;padding:10px 12px 10px 28px!important;font-size:14px!important;font-weight:500!important;line-height:1.4!important;border-bottom:1px solid #e9edf2!important;border-radius:0!important}\nheader.top.norwood-menu-collapsed #nav.nav-lab .lab-panel a:last-child{border-bottom:0!important}\n#nav.nav-lab .lab-panel a{border-bottom:1px solid #e9edf2!important;border-radius:0!important}\n#nav.nav-lab .lab-panel a:last-child{border-bottom:0!important}\n#nav.nav-lab .lab-panel{padding:2px 7px!important}\n#nav.nav-lab .lab-panel a{font-family:inherit!important;font-size:14px!important;font-weight:500!important;line-height:1.4!important;padding:10px 12px!important}\n";
    document.head.appendChild(navStyle);
  }
  menu.setAttribute('aria-controls','nav');
  menu.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" focusable="false"><path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>';
  nav.classList.add('nav-lab');
  nav.setAttribute('aria-label','Primary navigation');
  nav.innerHTML=`
    <a class="lab-direct" href="/" aria-label="Home"><svg class="lab-symbol" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/></svg><span class="lab-caption">Home</span></a>
    <div class="lab-item"><button class="lab-trigger" type="button" aria-expanded="false" aria-controls="lab-pulse"><svg class="lab-symbol" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h18v16H3zm3 3v4h6V7zm8 0v2h4V7zm0 4v2h4v-2zM6 14v2h12v-2z"/></svg><span class="lab-caption">Pulse</span></button><div id="lab-pulse" class="lab-panel" hidden><a href="news.html">News</a><a href="events.html">Events Calendar</a><a href="weather.html">Weather &amp; Webcam</a><a href="transit.html">Live MBTA Transit</a><a href="fundraising.html">Current Local Fundraisers</a><a href="live-music.html">Live Music</a><a href="https://norwoodcommunitymedia.org/">Norwood Community Media</a></div></div>
    <div class="lab-item"><button class="lab-trigger" type="button" aria-expanded="false" aria-controls="lab-explore"><svg class="lab-symbol" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm3.8 6.2-2.1 5.5-5.5 2.1 2.1-5.5z"/></svg><span class="lab-caption">Explore</span></button><div id="lab-explore" class="lab-panel" hidden><a href="map.html">Norwood SuperMap</a><a href="things.html">Things to Do</a><a href="restaurants.html">Food &amp; Restaurants</a><a href="businesses.html">Business Directory</a><a href="trails.html">Norwood Trails</a><a href="parks-trails.html">Parks</a><a href="sports-recreation.html">Sports &amp; Recreation</a><a href="artists-crafters-artisans.html">Artists &amp; Artisans</a><a href="museum-discounts.html">Museum Discounts</a><a href="get-involved.html">Get Involved</a></div></div>
    <div class="lab-item"><button class="lab-trigger" type="button" aria-expanded="false" aria-controls="lab-resources"><svg class="lab-symbol" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM1 21v-3c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5v3zm15 0v-3c0-1.8-.7-3.4-2-4.6.7-.3 1.5-.4 2.3-.4 3.7 0 6.7 2.1 6.7 5v3z"/></svg><span class="lab-caption">Resources</span></button><div id="lab-resources" class="lab-panel" hidden><a href="resources.html">Local Resource Directory</a><a href="trash-recycling.html">Trash &amp; Recycling</a><a href="utilities.html">Utilities</a><a href="transit.html">Live MBTA Transit</a><a href="jobs.html">Jobs &amp; Employment</a><a href="gas-prices.html">Gas Prices</a><a href="real-estate.html">Living in Norwood / Real Estate</a><a href="how-do-i.html">How Do I?</a><a href="opportunity-center.html#grants">Grant Opportunities</a><a href="conflict-contraption.html">Calendar &amp; Conflict Contraption</a></div></div>
    <div class="lab-item"><button class="lab-trigger" type="button" aria-expanded="false" aria-controls="lab-government"><svg class="lab-symbol" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 10 6v2H2V8zm-8 9h3v8H4zm6 0h4v8h-4zm7 0h3v8h-3zM2 20h20v2H2z"/></svg><span class="lab-caption">Civic Life</span></button><div id="lab-government" class="lab-panel" hidden><div class="lab-section-label">Town Government</div><a href="government-guide.html">Understanding Town Government</a><a href="how-do-i.html">How Do I…?</a><a href="unofficialsitemap.html">Unofficial Town Sitemap</a><a href="town-meeting-archive.html">Town Meeting &amp; Archive</a><a href="elections.html">Elections &amp; Voting</a><div class="lab-section-label">Civic Data &amp; Tools</div><a href="map.html">Explore Map &amp; Precincts</a></div></div>
    <a class="lab-direct" href="discover.html"><svg class="lab-symbol" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/></svg><span class="lab-caption">More</span></a>
    <a class="lab-direct" href="contact.html"><svg class="lab-symbol" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 5h20v14H2zm2 2 8 6 8-6v-1H4zm16 10V9.5l-8 6-8-6V17z"/></svg><span class="lab-caption">Contact</span></a>`;
  const buttons=[...nav.querySelectorAll('.lab-trigger')];
  const closeDropdowns=(except=null)=>buttons.forEach(b=>{if(b===except)return;b.setAttribute('aria-expanded','false');const panel=document.getElementById(b.getAttribute('aria-controls'));if(panel)panel.hidden=true;});
  const close=()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation menu');closeDropdowns();};
  const open=()=>{nav.classList.add('open');menu.setAttribute('aria-expanded','true');menu.setAttribute('aria-label','Close navigation menu');};
  buttons.forEach(b=>b.addEventListener('click',()=>{const wasOpen=b.getAttribute('aria-expanded')==='true';closeDropdowns();b.setAttribute('aria-expanded',String(!wasOpen));const panel=document.getElementById(b.getAttribute('aria-controls'));if(panel)panel.hidden=wasOpen;}));
  menu.addEventListener('click',e=>{e.stopPropagation();nav.classList.contains('open')?close():open();});
  nav.querySelectorAll('.lab-panel a,.lab-direct').forEach(a=>a.addEventListener('click',close));
  document.addEventListener('click',e=>{if(!nav.contains(e.target)&&e.target!==menu){closeDropdowns();if(nav.classList.contains('open'))close();}},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const opened=buttons.find(b=>b.getAttribute('aria-expanded')==='true');if(opened){closeDropdowns();opened.focus();}else if(nav.classList.contains('open')){close();menu.focus();}}});
  const header=menu.closest('header.top');
  // Pointer hover enhances the existing production menu; its links, Home,
  // controls, click behavior and responsive navigation remain unchanged.
  if(header){
    let hoverOpenTimer,hoverCloseTimer;
    const hoverEnabled=()=>window.matchMedia('(hover: hover) and (pointer: fine)').matches&&!header.classList.contains('norwood-menu-collapsed');
    const cancelHover=()=>{clearTimeout(hoverOpenTimer);clearTimeout(hoverCloseTimer);};
    const revealHovered=button=>{
      if(!hoverEnabled())return;
      closeDropdowns(button);
      button.setAttribute('aria-expanded','true');
      const panel=document.getElementById(button.getAttribute('aria-controls'));
      if(panel)panel.hidden=false;
    };
    nav.querySelectorAll('.lab-item').forEach(item=>{
      const button=item.querySelector('.lab-trigger');
      if(!button)return;
      item.addEventListener('pointerenter',event=>{
        if(event.pointerType!=='mouse'||!hoverEnabled())return;
        cancelHover();
        const switching=buttons.some(other=>other.getAttribute('aria-expanded')==='true');
        hoverOpenTimer=setTimeout(()=>revealHovered(button),switching?85:175);
      });
      item.addEventListener('pointerleave',event=>{
        if(event.pointerType!=='mouse'||!hoverEnabled())return;
        cancelHover();
        hoverCloseTimer=setTimeout(closeDropdowns,350);
      });
    });
    nav.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')clearTimeout(hoverCloseTimer);});
    nav.addEventListener('pointerleave',event=>{
      if(event.pointerType!=='mouse'||!hoverEnabled())return;
      cancelHover();
      hoverCloseTimer=setTimeout(closeDropdowns,350);
    });
    window.addEventListener('resize',cancelHover,{passive:true});
  }
  if(header){
    const fit=()=>{
      header.classList.remove('norwood-menu-collapsed');
      const brand=header.querySelector('.brand');
      const headerStyle=getComputedStyle(header);
      const padding=(parseFloat(headerStyle.paddingLeft)||0)+(parseFloat(headerStyle.paddingRight)||0);
      const gap=parseFloat(headerStyle.columnGap||headerStyle.gap)||0;
      const brandWidth=brand?.getBoundingClientRect().width||0;
      const available=header.clientWidth-padding-brandWidth-gap;
      const required=nav.scrollWidth;
      const compact=window.matchMedia('(max-width:760px)').matches;
      const collapse=compact||required>available+1;
      const wasCollapsed=header.classList.contains('norwood-menu-collapsed');
      header.classList.toggle('norwood-menu-collapsed',collapse);
      if((!collapse||(collapse&&!wasCollapsed))&&nav.classList.contains('open'))close();
    };
    requestAnimationFrame(fit);
    window.addEventListener('resize',fit,{passive:true});
    document.fonts?.ready.then(fit);
  }
  const root=document.documentElement;const saved=localStorage.getItem('norwood-text-size')||'standard';root.dataset.textSize=saved;const contrast=localStorage.getItem('norwood-high-contrast')==='true';root.dataset.highContrast=String(contrast);
  const ctl=document.createElement('div');ctl.className='text-size-controls accessibility-controls';ctl.setAttribute('aria-label','Accessibility and language controls');ctl.innerHTML='<span class="sr-only">Display and language settings</span><button type="button" data-text-size-menu aria-haspopup="menu" aria-expanded="false" aria-label="Choose text size">Aa</button><button type="button" data-contrast aria-label="Toggle high contrast">◐</button><button type="button" data-translate aria-haspopup="menu" aria-expanded="false" aria-label="Translate this page">🌐</button>';document.body.appendChild(ctl);
  const textSizeMenu=document.createElement('div');textSizeMenu.className='text-size-menu';textSizeMenu.hidden=true;textSizeMenu.setAttribute('role','menu');textSizeMenu.setAttribute('aria-label','Choose text size');textSizeMenu.innerHTML='<button type="button" role="menuitemradio" data-size="smallest">Smallest</button><button type="button" role="menuitemradio" data-size="compact">Smaller</button><button type="button" role="menuitemradio" data-size="standard">Standard</button><button type="button" role="menuitemradio" data-size="large">Larger</button><button type="button" role="menuitemradio" data-size="largest">Largest</button>';document.body.appendChild(textSizeMenu);
  const textSizeButton=ctl.querySelector('[data-text-size-menu]');
  const closeTextSize=()=>{textSizeMenu.hidden=true;textSizeButton&&textSizeButton.setAttribute('aria-expanded','false');};
  const translateMenu=document.createElement('div');translateMenu.className='translate-menu';translateMenu.hidden=true;translateMenu.setAttribute('role','menu');translateMenu.setAttribute('aria-label','Translate this page');translateMenu.innerHTML='<button type="button" role="menuitem" data-lang="en">English</button><button type="button" role="menuitem" data-lang="es">Español</button><button type="button" role="menuitem" data-lang="pt">Português</button><button type="button" role="menuitem" data-lang="fr">Français</button><button type="button" role="menuitem" data-lang="zh-CN">中文</button><button type="button" role="menuitem" data-lang="ar">العربية</button><button type="button" role="menuitem" data-lang="ht">Kreyòl ayisyen</button><button type="button" role="menuitem" data-lang="vi">Tiếng Việt</button><button type="button" role="menuitem" data-lang="more">More languages…</button>';document.body.appendChild(translateMenu);
  const translateButton=ctl.querySelector('[data-translate]');
  const closeTranslate=()=>{translateMenu.hidden=true;translateButton&&translateButton.setAttribute('aria-expanded','false');};
  const currentPublicUrl=()=>{const canonical=document.querySelector('link[rel="canonical"]')?.href;if(canonical&&/https?:\/\/(www\.)?norwood\.ma\//i.test(canonical))return canonical;const here=new URL(location.href);if(/(^|\.)norwood\.ma$/i.test(here.hostname))return here.href;return 'https://www.norwood.ma/'+(location.pathname.split('/').pop()||'index.html')+location.search+location.hash;};
  // Keep the English reset option literally labeled "English" even if a translation service
  // modifies the surrounding page. It is the stable way to return to the original site language.
  const englishReset=translateMenu.querySelector('[data-lang="en"]');
  if(englishReset){englishReset.textContent='English';englishReset.setAttribute('translate','no');englishReset.classList.add('notranslate');}
  const openTranslated=(lang)=>{const page=currentPublicUrl();if(lang==='en'){location.href=page;closeTranslate();return;}const url=lang==='more'?'https://translate.google.com/?sl=auto&u='+encodeURIComponent(page):'https://translate.google.com/translate?sl=auto&tl='+encodeURIComponent(lang)+'&u='+encodeURIComponent(page);window.open(url,'_blank','noopener');closeTranslate();};
  if(translateButton)translateButton.addEventListener('click',e=>{e.stopPropagation();const show=translateMenu.hidden;translateMenu.hidden=!show;translateButton.setAttribute('aria-expanded',String(show));if(show){const r=translateButton.getBoundingClientRect();translateMenu.style.right=Math.max(10,window.innerWidth-r.right)+'px';translateMenu.style.bottom=(window.innerHeight-r.top+8)+'px';const first=translateMenu.querySelector('button');if(first)first.focus();}});
  translateMenu.addEventListener('click',e=>{const b=e.target.closest('[data-lang]');if(b)openTranslated(b.dataset.lang);});
  document.addEventListener('click',e=>{if(!translateMenu.hidden&&!translateMenu.contains(e.target)&&e.target!==translateButton)closeTranslate();if(!textSizeMenu.hidden&&!textSizeMenu.contains(e.target)&&e.target!==textSizeButton)closeTextSize();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!translateMenu.hidden){closeTranslate();if(translateButton)translateButton.focus();}if(e.key==='Escape'&&!textSizeMenu.hidden){closeTextSize();if(textSizeButton)textSizeButton.focus();}});
  const sync=()=>{textSizeMenu.querySelectorAll('button[data-size]').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.size===(root.dataset.textSize||'standard'))));const cb=ctl.querySelector('[data-contrast]');if(cb)cb.setAttribute('aria-pressed',String(root.dataset.highContrast==='true'));};
  if(textSizeButton)textSizeButton.addEventListener('click',e=>{e.stopPropagation();const show=textSizeMenu.hidden;textSizeMenu.hidden=!show;textSizeButton.setAttribute('aria-expanded',String(show));if(show){const r=textSizeButton.getBoundingClientRect();textSizeMenu.style.right=Math.max(10,window.innerWidth-r.right)+'px';textSizeMenu.style.bottom=(window.innerHeight-r.top+8)+'px';const active=textSizeMenu.querySelector('[aria-checked="true"]')||textSizeMenu.querySelector('button');if(active)active.focus();}});
  textSizeMenu.addEventListener('click',e=>{const b=e.target.closest('button[data-size]');if(!b)return;root.dataset.textSize=b.dataset.size;localStorage.setItem('norwood-text-size',b.dataset.size);sync();closeTextSize();if(textSizeButton)textSizeButton.focus();});
  ctl.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-contrast')){const next=root.dataset.highContrast!=='true';root.dataset.highContrast=String(next);localStorage.setItem('norwood-high-contrast',String(next));sync();}});sync();
  // Static sponsor recognition lives above (not inside) the shared footer.
  const sponsorFooter=document.querySelector('footer');
  if(sponsorFooter && !document.getElementById('footer-sponsor-strip')){
    const strip=document.createElement('aside');
    strip.id='footer-sponsor-strip';
    strip.setAttribute('aria-label','Local sponsors');
    strip.innerHTML='<div class="footer-sponsor-inner"><span class="footer-sponsor-label">THANK YOU TO OUR LOCAL SPONSORS</span><div class="footer-sponsor-logos"><a href="https://bostonmobiletire.com" target="_blank" rel="noopener sponsored" aria-label="Boston Mobile Tire"><img src="/assets/ads/boston-mobile-tire-footer-logo.svg" alt="Boston Mobile Tire" loading="lazy" decoding="async"><span class="footer-sponsor-name">Boston Mobile Tire</span></a><a href="https://towncommonbooks.com" target="_blank" rel="noopener sponsored" aria-label="Town Common Books"><img src="/assets/ads/town-common-books-footer-logo.svg" alt="Town Common Books circular logo" loading="lazy" decoding="async"><span class="footer-sponsor-name">Town Common Books</span></a><a href="https://toplegendbarbershop.com/" target="_blank" rel="noopener sponsored" aria-label="Top Legend Barbershop" class="footer-sponsor-top-legend"><img src="/assets/ads/top-legend-footer-logo.svg" alt="Top Legend Barbershop circular logo" loading="lazy" decoding="async"><span class="footer-sponsor-name">Top Legend Barbershop</span></a><a href="/nts.html" aria-label="Norwood Trading and Supply"><img src="/assets/ads/norwood-trading-supply.webp" alt="Norwood Trading &amp; Supply" loading="lazy" decoding="async"><span class="footer-sponsor-name">Norwood Trading &amp; Supply</span></a></div></div>';
    const stripStyle=document.createElement('style');
    stripStyle.id='footer-sponsor-strip-styles';
    stripStyle.textContent='#footer-sponsor-strip{clear:both;width:100%;box-sizing:border-box;background:#f5f8fb;border-top:1px solid #dce5ed;border-bottom:1px solid #dce5ed;padding:14px 18px 15px;color:#526777}#footer-sponsor-strip .footer-sponsor-inner{max-width:1180px;margin:0 auto;text-align:center}#footer-sponsor-strip .footer-sponsor-label{display:block;margin-bottom:10px;font-size:10px;font-weight:700;letter-spacing:.12em;line-height:1.5}#footer-sponsor-strip .footer-sponsor-logos{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:14px 22px}#footer-sponsor-strip .footer-sponsor-logos a{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:7px;width:170px;max-width:calc(50% - 14px);min-height:78px;text-decoration:none;border-radius:5px;color:#173a59;text-align:center}#footer-sponsor-strip .footer-sponsor-logos img{display:block;width:100%;max-width:170px;height:55px;object-fit:contain}#footer-sponsor-strip .footer-sponsor-name{display:block;font-size:12px;font-weight:700;line-height:1.25;letter-spacing:0;color:#173a59}#footer-sponsor-strip .footer-sponsor-logos a:focus-visible{outline:2px solid #003b71;outline-offset:3px}#footer-sponsor-strip .top-legend-circle{background:#111;color:#fff;border:2px solid #111;border-radius:50%;width:62px;height:62px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;text-align:center;box-shadow:inset 0 0 0 2px #fff}#footer-sponsor-strip .top-legend-tools{font-size:18px;line-height:1}#footer-sponsor-strip .top-legend-name{font-size:10px;font-weight:800;font-style:italic;font-family:Georgia,serif;white-space:nowrap}#footer-sponsor-strip .top-legend-sub{font-size:5.5px;font-weight:800;letter-spacing:.03em;margin-top:3px}@media(max-width:480px){#footer-sponsor-strip{padding:12px 10px}#footer-sponsor-strip .footer-sponsor-logos{gap:10px 12px}#footer-sponsor-strip .footer-sponsor-logos a{width:145px;max-width:calc(50% - 7px)}#footer-sponsor-strip .footer-sponsor-logos img{height:47px}}';
    document.head.appendChild(stripStyle);
    sponsorFooter.before(strip);
  }
  // Canonical site footer: every page that loads nav.js renders the same footer as the homepage.
  const footer=document.querySelector('footer');
  if(footer){
    footer.className='old-footer';
    footer.innerHTML='<div class="footer-brand"><a class="footer-logo" href="https://www.norwood.ma/"><img alt="Norwood.ma — Our Town. Online." src="https://www.norwood.ma/assets/logo-dark-approved.png"/></a><div class="footer-meta">© 2026 Norwood.ma<br>Version '+SITE_VERSION+'</div></div><div class="footer-legal"><p><strong>Independent community information site. Not affiliated with the Town of Norwood government.</strong></p><p>Inclusion of a news story, organization, business, event, resource, or external link does not constitute endorsement or support by Norwood.ma.</p><p class="footer-info-disclaimer">Norwood.ma compiles information from a variety of sources, including government agencies, community organizations, businesses, news outlets, and other official and unofficial sources. While we work to keep information useful and current, we cannot guarantee its accuracy, completeness, or timeliness. Always confirm important information with the original source. Norwood.ma is not responsible for errors, omissions, outdated information, or actions taken in reliance on information presented on this site.</p><p class="footer-links"><a href="https://www.norwood.ma/about.html">About &amp; Editorial Standards →</a><span aria-hidden="true"> · </span><a href="https://www.norwood.ma/support.html">Support Norwood.ma →</a><span aria-hidden="true"> · </span><a href="https://www.norwoodma.gov/" rel="noopener" target="_blank">Official Town website ↗</a></p></div>';
  }
})();
(function iosHomePrompt(){try{const ua=navigator.userAgent||'',ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;if(!ios||standalone||localStorage.getItem('norwood-ios-home-dismissed'))return;const today=new Date().toISOString().slice(0,10),last=localStorage.getItem('norwood-ios-last-visit');let visits=Number(localStorage.getItem('norwood-ios-visits')||0);if(last!==today){visits++;localStorage.setItem('norwood-ios-visits',String(visits));localStorage.setItem('norwood-ios-last-visit',today)}if(visits<3)return;const el=document.createElement('aside');el.className='ios-home-prompt';el.setAttribute('role','dialog');el.setAttribute('aria-label','Add Norwood.ma to your Home Screen');el.innerHTML='<button class="ios-home-close" aria-label="Dismiss">×</button><img src="https://www.norwood.ma/assets/apple-touch-icon.png?v=20260921" alt=""><div><strong>Keep Norwood.ma handy</strong><p>Add Norwood.ma to your Home Screen for quick access. Tap <b>Share</b> ↑ and choose <b>Add to Home Screen</b>.</p><button class="ios-home-gotit">Got it</button><button class="ios-home-later">Not now</button></div>';document.body.appendChild(el);const dismiss=()=>{localStorage.setItem('norwood-ios-home-dismissed','1');el.remove()};el.querySelector('.ios-home-close').onclick=dismiss;el.querySelector('.ios-home-gotit').onclick=dismiss;el.querySelector('.ios-home-later').onclick=()=>{localStorage.setItem('norwood-ios-visits','0');localStorage.setItem('norwood-ios-last-visit',today);el.remove()};}catch(e){}})();

