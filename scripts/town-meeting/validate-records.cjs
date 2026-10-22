const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'../..'),data=JSON.parse(fs.readFileSync(path.join(root,'data/town-meeting-member-records.json'))),html=fs.readFileSync(path.join(root,'town-meeting-archive.html'),'utf8'),script=fs.readFileSync(path.join(root,'town-meeting-member-records.js'),'utf8');
new vm.Script(script);for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
const expected={'2024-05-13':[205,75],'2024-05-16':[168,111],'2025-05-12':[205,51],'2025-05-15':[186,70],'2025-05-19':[168,88],'2025-11-13':[177,77],'2025-11-17':[141,113],'2026-05-11':[195,56],'2026-05-14':[186,66]};
let total=0;
for(const period of data.meetings){
 for(const date of period.dates){const entries=Object.values(period.roster).map(p=>p.dates[date]).filter(Boolean);assert.deepEqual(['PRESENT','ABSENT'].map(status=>entries.filter(p=>p.status===status).length),expected[date],date);}
 for(const m of period.motions){total++;assert(ids.includes(m.article_target),m.label);const counts=['Yes','No','Abs'].map(c=>Object.values(m.members).filter(v=>v===c).length+m.unresolved.filter(v=>v.choice===c).length);assert.deepEqual(counts,m.named_totals,m.id);for(const key of Object.keys(m.members))assert(data.members[key],key);}
}
assert.equal(total,165);assert.equal(data.meetings.length,4);assert.equal(Object.keys(data.members).length,341);assert.equal(data.source_discrepancies.length,7);
assert(data.members.ERIKPBODENHOFER&&data.members.MYEVABODENHOFER);assert.notEqual(data.aliases.CHRISTOPHERPGRIFFIN,data.aliases.CHRISTOPHERPGRIFFINJR);
const frank=data.meetings[0].motions.map(m=>m.members.FRANKPADAMS);assert.deepEqual(['Yes','No','Abs'].map(c=>frank.filter(v=>v===c).length),[32,3,2]);
console.log('Data: 341 members, 165 motions, all article targets, all nine official attendance totals, separate identities and seven preserved discrepancies passed.');
let parseHTML;try{({parseHTML}=require('linkedom'));}catch{console.log('DOM checks skipped: install linkedom and supply NODE_PATH.');process.exit(0);}
const {window,document}=parseHTML(html);
Object.defineProperty(window.HTMLElement.prototype,'cells',{get(){return this.querySelectorAll('td,th');}});
window.HTMLElement.prototype.scrollIntoView=function(){document.scrolledTo=this.id;};window.HTMLElement.prototype.getClientRects=function(){return[{}];};window.HTMLElement.prototype.focus=function(){document.focusedId=this.id;};
const errors=[],history={pushState(_a,_b,url){context.location.hash=url;}};
const context=vm.createContext({window,document,MutationObserver:window.MutationObserver,console:{warn:e=>errors.push(e)},fetch:async()=>({ok:true,json:async()=>data}),requestAnimationFrame:fn=>fn(),location:{hash:''},history,Date,Map,Set});
vm.runInContext(script,context);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 await tick();assert.equal(errors.length,0,String(errors));assert(document.getElementById('memberRecords'));
 assert.equal(document.querySelectorAll('[data-tm-motion]').length,165);
 const rep=document.getElementById('repResult');rep.innerHTML='<div class="member-list"><span>Frank P. Adams</span><span>Normand P. Beauchemin</span></div>';await tick();
 assert.equal(rep.querySelectorAll('[data-tm-member]').length,2);const stable=rep.innerHTML;await tick();assert.equal(rep.innerHTML,stable,'Roster observer must settle');
 rep.querySelector('[data-tm-member="FRANKPADAMS"]').click();
 let body=document.getElementById('tmMemberBody');assert.equal(body.querySelectorAll(':scope > details').length,4);assert(body.textContent.includes('32 Yes · 3 No · 2 Abstain'));assert.equal(body.querySelectorAll('.tm26-article-link').length,165);
 const firstLink=body.querySelector('.tm26-article-link');const target=firstLink.getAttribute('href').slice(1);firstLink.click();assert.equal(document.scrolledTo,target);assert.equal(document.focusedId,target);assert(!document.querySelector('.tm26-vote-overlay').classList.contains('open'));assert(document.getElementById(target).closest('details').open);
 const vote=document.querySelector('[data-tm-motion]');vote.click();assert(document.getElementById('tmMemberBody').querySelector('[data-tm-member]'));
 document.querySelector('[data-tm-choice="Abs"]').click();assert(document.getElementById('tmMemberTabs').querySelector('[aria-pressed="true"]').textContent.includes('Abstain'));
 // Cloned article-detail buttons must use the same delegated handler.
 const clone=document.createElement('div');clone.innerHTML=vote.outerHTML;document.getElementById('modalBody').appendChild(clone);clone.querySelector('button').click();assert(document.getElementById('tmMemberSubtitle').textContent.includes(data.meetings[0].title));
 // Every directory member opens a record without requiring a current roster entry.
 const buttons=[...document.getElementById('tmMemberDirectory').querySelectorAll('[data-tm-member]')];assert.equal(buttons.length,341);
 for(const button of buttons){button.click();assert(document.getElementById('tmMemberBody').querySelector('details'),button.textContent);assert(!document.getElementById('tmMemberBody').textContent.includes('undefined'));}
 const search=document.getElementById('tmMemberSearch');search.value='Frank';search.dispatchEvent(new window.Event('input'));assert(document.getElementById('tmMemberDirectory').querySelector('[data-tm-member="FRANKPADAMS"]'));
 assert.equal(errors.length,0,String(errors));console.log('DOM: all 341 profiles, meeting grouping, roster links, article navigation, vote tabs, cloned article buttons, search and observer stability passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
