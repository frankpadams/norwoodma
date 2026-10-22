(function(){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=x=>String(x).toUpperCase().replace(/[^A-Z]/g,'');
let data,selected=null,active='Yes',returnFocus=null;
const overlay=document.createElement('div');overlay.className='tm26-vote-overlay';overlay.setAttribute('aria-hidden','true');
overlay.innerHTML='<section class="tm26-vote-panel" role="dialog" aria-modal="true" aria-labelledby="tmMemberTitle"><div class="tm26-vote-head"><div><h2 id="tmMemberTitle" style="margin:0"></h2><p id="tmMemberSubtitle" class="tm26-vote-note"></p></div><button class="tm26-vote-close" type="button" aria-label="Close record">×</button></div><div id="tmMemberTabs" class="tm26-vote-tabs"></div><div id="tmMemberBody"></div></section>';
document.body.appendChild(overlay);
const el=id=>document.getElementById(id);
const memberKey=name=>data?.aliases[norm(name)]||null;
const memberButton=key=>'<button type="button" class="tm26-member-link" data-tm-member="'+esc(key)+'">'+esc(data.members[key].name)+'</button>';
const dateLabel=date=>new Date(date+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
function districtLabel(d){return d==='ATL'?'At large':d?'District '+d:'District unverified';}
function districtFor(period,key,date){const entries=period.roster[key]?.dates||{};if(date&&entries[date])return entries[date].district;const districts=[...new Set(Object.values(entries).map(x=>x.district))];return districts.length===1?districts[0]:null;}
function show(){overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');overlay.querySelector('.tm26-vote-close').focus();}
function close(){overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');if(returnFocus?.isConnected)returnFocus.focus();}
function table(head,rows){return '<div class="tm26-table-wrap"><table class="tm26-member-table"><thead><tr>'+head.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>';}
function recordFor(key,period){
const person=period.roster[key],results=period.motions.map(m=>({motion:m,choice:m.members[key],unresolved:m.unresolved.some(v=>v.candidates?.includes(key))}));
if(!person&&!results.some(r=>r.choice||r.unresolved))return '';
const attendance=period.dates.map(date=>{const entry=person?.dates[date];return '<tr><td>'+esc(dateLabel(date))+'</td><td>'+esc(entry?entry.status==='PRESENT'?'Present'+(entry.attendance_basis==='voting-record'?' (from voting record)':''):'Absent'+(entry.attendance_basis==='voting-record'?' (no recorded votes)':''):'Not listed in attendance report')+'</td><td>'+esc(districtLabel(entry?.district))+'</td></tr>';}).join('');
const count=c=>results.filter(r=>r.choice===c).length,unknown=results.filter(r=>r.unresolved&&!r.choice).length,missing=results.filter(r=>!r.choice&&!r.unresolved).length;
const votes=results.map(({motion:m,choice,unresolved})=>'<tr><td><a class="tm26-article-link" href="#'+esc(m.article_target)+'">'+esc(m.label)+'</a>'+(m.date?'<small style="display:block;color:#526878">'+esc(dateLabel(m.date))+'</small>':'')+'</td><td>'+esc(choice==='Abs'?'Abstain':choice|| (unresolved?'Identity unresolved in source':'No vote recorded'))+'</td></tr>').join('');
const summary=count('Yes')+' Yes · '+count('No')+' No · '+count('Abs')+' Abstain · '+missing+' No vote recorded'+(unknown?' · '+unknown+' Unresolved':'');
return '<h3>Attendance</h3>'+(period.attendance_note?'<p class="tm26-vote-note">'+esc(period.attendance_note)+'</p>':'')+table(['Meeting night','Attendance','District'],attendance)+'<h3>Recorded votes</h3><p>'+summary+'</p><p class="tm26-vote-note">Amendments and procedural motions are separate votes. A blank cell on one motion does not establish absence. Dates are shown only when identified by the voting report; combined reports remain grouped by meeting.</p>'+table(['Article / motion','Member’s vote'],votes)+'<p class="tm26-vote-note">Sources: '+period.sources.map(esc).join('; ')+'. Official Town records remain authoritative.</p>';
}
function openMember(key){
if(!data.members[key])return;
el('tmMemberTitle').textContent='Member voting & attendance record';el('tmMemberSubtitle').textContent=data.members[key].name;
el('tmMemberTabs').innerHTML=selected?'<button type="button" data-tm-back>← Back to vote results</button>':'';
let first=true;
el('tmMemberBody').innerHTML=data.meetings.map(period=>{const content=recordFor(key,period);if(!content)return '';const open=first;first=false;return '<details class="member-guide"'+(open?' open':'')+'><summary>'+esc(period.title)+'</summary><div class="member-guide-body">'+content+'</div></details>';}).join('')+'<p class="tm26-vote-note">'+esc(data.coverage_note)+'</p>';
show();
}
function renderVotes(){
const {period,motion}=selected;
el('tmMemberTitle').textContent='Individual voting record';el('tmMemberSubtitle').textContent=period.title+' — '+motion.label;
el('tmMemberTabs').innerHTML=['Yes','No','Abs'].map((c,i)=>'<button type="button" data-tm-choice="'+c+'" aria-pressed="'+(c===active)+'">'+(c==='Abs'?'Abstain':c)+' ('+motion.totals[i]+')</button>').join('');
const groups=new Map();
for(const [key,choice] of Object.entries(motion.members)){if(choice!==active)continue;const district=districtFor(period,key,motion.date),group=districtLabel(district);if(!groups.has(group))groups.set(group,[]);groups.get(group).push({key,name:data.members[key].name});}
for(const v of motion.unresolved){if(v.choice!==active)continue;const group='Identity unverified';if(!groups.has(group))groups.set(group,[]);groups.get(group).push({name:v.name});}
const rank=label=>label==='At large'?10:parseInt(label.replace(/\D/g,''))||99;
el('tmMemberBody').innerHTML=[...groups].sort((a,b)=>rank(a[0])-rank(b[0])).map(([label,people])=>'<details class="tm26-vote-district" open><summary>'+esc(label)+': ('+people.length+' '+(people.length===1?'member':'members')+')</summary><div class="tm26-vote-names">'+people.sort((a,b)=>a.name.localeCompare(b.name)).map(p=>p.key?memberButton(p.key):'<span>'+esc(p.name)+'</span>').join('')+'</div></details>').join('')||'<p>No named members recorded in this category.</p>';
if(motion.totals.some((n,i)=>n!==motion.named_totals[i]))el('tmMemberBody').innerHTML+='<p class="tm26-vote-note">Source discrepancy: the official summary reports '+motion.totals.join('–')+' (Yes–No–Abstain), while the named-voter table totals '+motion.named_totals.join('–')+'. Official summary totals are retained above; individual records reproduce the named-voter table.</p>';
el('tmMemberBody').innerHTML+='<p class="tm26-vote-note">Districts use the available historical roster. A blank cell on one motion does not establish absence.</p>';
}
function revealArticle(target){const row=el(target);if(!row?.matches('.article-ledger tr'))return;for(let p=row.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;requestAnimationFrame(()=>{row.scrollIntoView({block:'center',behavior:'smooth'});row.focus({preventScroll:true});});}
function setup(){
const section=document.createElement('details');section.className='member-guide';section.id='memberRecords';section.innerHTML='<summary>Member voting & attendance records · 2024–2026</summary><div class="member-guide-body"><p>Browse '+Object.keys(data.members).length+' members across '+data.meetings.length+' meeting cycles. Current and former members are grouped by their newest recorded district. Each record is organized by meeting, newest first.</p><label for="tmMemberSearch">Find a member</label> <input id="tmMemberSearch" type="search" placeholder="Name" style="padding:10px;max-width:100%;font:inherit"><div id="tmMemberDirectory"></div></div>';
const anchor=document.querySelector('.rep-finder');anchor.insertAdjacentElement('afterend',section);
function directory(){const query=norm(el('tmMemberSearch').value),groups=new Map();for(const [key,p] of Object.entries(data.members)){if(query&&!norm(p.name).includes(query)&&!p.aliases.some(a=>norm(a).includes(query)))continue;let d;for(const period of data.meetings){d=districtFor(period,key);if(d)break;}const label=districtLabel(d);if(!groups.has(label))groups.set(label,[]);groups.get(label).push(key);}const rank=label=>label==='At large'?10:parseInt(label.replace(/\D/g,''))||99;el('tmMemberDirectory').innerHTML=[...groups].sort((a,b)=>rank(a[0])-rank(b[0])).map(([label,keys])=>'<details class="tm26-vote-district"'+(query?' open':'')+'><summary>'+esc(label)+': ('+keys.length+' '+(keys.length===1?'member':'members')+')</summary><div class="tm26-vote-names">'+keys.sort((a,b)=>data.members[a].name.localeCompare(data.members[b].name)).map(memberButton).join('')+'</div></details>').join('')||'<p>No matching members.</p>';}
el('tmMemberSearch').addEventListener('input',directory);directory();
function enhanceRoster(){el('repResult')?.querySelectorAll('.member-list span').forEach(span=>{if(span.querySelector('button'))return;const key=memberKey(span.textContent);if(key)span.innerHTML=memberButton(key);});}
if(el('repResult')){new MutationObserver(enhanceRoster).observe(el('repResult'),{childList:true,subtree:true});enhanceRoster();}
const byId=new Map();for(const period of data.meetings)for(const motion of period.motions)byId.set(motion.id,{period,motion});
for(const row of document.querySelectorAll('.article-ledger tr[id]')){const motions=[...byId.values()].filter(x=>x.motion.article_target===row.id);if(!motions.length)continue;const cell=row.cells[2],buttons=motions.map(({motion})=>'<button type="button" class="tm26-vote-trigger" data-tm-motion="'+esc(motion.id)+'">'+esc(motions.length===1?'':motion.label.replace(/^.*? — /,''))+(motions.length===1?'':' · ')+motion.totals.join('–')+'</button>');cell.innerHTML=buttons.join('<br>');}
document.addEventListener('click',e=>{const member=e.target.closest('[data-tm-member]');if(member){if(!overlay.contains(member)){selected=null;returnFocus=member;}openMember(member.dataset.tmMember);return;}const motion=e.target.closest('[data-tm-motion]');if(motion){e.preventDefault();e.stopPropagation();selected=byId.get(motion.dataset.tmMotion);returnFocus=motion;active='Yes';renderVotes();show();return;}if(e.target.closest('[data-tm-back]')){renderVotes();return;}const choice=e.target.closest('[data-tm-choice]');if(choice){active=choice.dataset.tmChoice;renderVotes();return;}const article=e.target.closest('.tm26-article-link');if(article&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){e.preventDefault();close();const dialog=el('articleModal');dialog.classList.remove('open');dialog.setAttribute('aria-hidden','true');history.pushState(null,'',article.getAttribute('href'));revealArticle(article.getAttribute('href').slice(1));}});
revealArticle(location.hash.slice(1));
}
overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('.tm26-vote-close'))close();});
document.addEventListener('keydown',e=>{if(!overlay.classList.contains('open'))return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}if(e.key==='Tab'){const nodes=[...overlay.querySelectorAll('button,summary,a[href],input')].filter(n=>n.getClientRects().length),first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}},true);
window.addEventListener('hashchange',()=>revealArticle(location.hash.slice(1)));
fetch('data/town-meeting-member-records.json?v=20261022-october-descriptions').then(r=>{if(!r.ok)throw Error('Member records unavailable');return r.json();}).then(result=>{data=result;setup();}).catch(e=>{console.warn(e);const note=document.createElement('p');note.className='archive-note';note.textContent='Member voting and attendance records could not load. Please refresh to try again.';document.querySelector('.rep-finder')?.appendChild(note);});
})();
