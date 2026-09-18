(()=>{
  const menu=document.querySelector('#menu'),nav=document.querySelector('#nav');
  if(!menu||!nav)return;
  const close=()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation menu');};
  const open=()=>{nav.classList.add('open');menu.setAttribute('aria-expanded','true');menu.setAttribute('aria-label','Close navigation menu');};
  menu.addEventListener('click',e=>{e.stopPropagation();nav.classList.contains('open')?close():open();});
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
  document.addEventListener('click',e=>{if(nav.classList.contains('open')&&!nav.contains(e.target)&&e.target!==menu)close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){close();menu.focus();}});
  window.addEventListener('resize',()=>{if(window.innerWidth>1100)close();});
})();
