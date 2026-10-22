(()=>{
'use strict';
const container=document.getElementById('resourceTopics');
if(!container)return;
const sections=[...container.querySelectorAll('[data-resource-topic]')];
function render(){
 const id=location.hash.slice(1);
 const root=sections.find(section=>section.dataset.resourceTopic===id);
 sections.forEach(section=>{section.hidden=section!==root;});
 if(!root)return;
 const t=[id];
 root.querySelectorAll('.resource-filter-item').forEach(el=>{el.hidden=false;});
 if(root.dataset.bound){
   root.querySelector('[data-basic-filter="food"]')?.click();
   root.querySelector('[data-topic-filter="all"]')?.click();
   requestAnimationFrame(()=>root.scrollIntoView({behavior:'smooth',block:'start'}));
   return;
 }
 root.dataset.bound='true';
 root.querySelector('.resource-back')?.addEventListener('click',()=>{history.pushState(null,'',location.pathname);render();document.querySelector('.resource-start')?.scrollIntoView({behavior:'smooth',block:'start'});});
 if(t[0]==='basic-needs'){
   const applyBasicFilter=id=>{
     root.querySelectorAll('[data-basic-filter]').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.basicFilter===id));
     root.querySelectorAll('.resource-filter-item').forEach(el=>{el.hidden=id!=='all'&&el.dataset.basicKind!==id;});
   };
   root.querySelectorAll('[data-basic-filter]').forEach(btn=>btn.addEventListener('click',()=>applyBasicFilter(btn.dataset.basicFilter)));
   applyBasicFilter('food');
   root.querySelector('[data-open-mini-pantries]')?.addEventListener('click',()=>{
     document.getElementById('miniPantriesOpen')?.click();
   });
 }
 if(root.querySelector('[data-topic-filter]')){
   const applyTopicFilter=id=>{
     root.querySelectorAll('[data-topic-filter]').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.topicFilter===id));
     root.querySelectorAll('.resource-filter-item').forEach(el=>{el.hidden=id!=='all'&&el.dataset.topicKind!==id;});
   };
   root.querySelectorAll('[data-topic-filter]').forEach(btn=>btn.addEventListener('click',()=>applyTopicFilter(btn.dataset.topicFilter)));
 }
 requestAnimationFrame(()=>root.scrollIntoView({behavior:'smooth',block:'start'}));
}
window.addEventListener('hashchange',render);
window.addEventListener('popstate',render);
render();
})();
