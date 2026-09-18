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
  const saved=localStorage.getItem('norwood-text-size')||'standard';document.documentElement.dataset.textSize=saved;const ctl=document.createElement('div');ctl.className='text-size-controls';ctl.setAttribute('aria-label','Text size');ctl.innerHTML='<button type="button" data-size="compact" aria-label="Smaller text">A−</button><button type="button" data-size="standard" aria-label="Standard text">A</button><button type="button" data-size="large" aria-label="Larger text">A+</button>';document.body.appendChild(ctl);const sync=()=>ctl.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.size===(document.documentElement.dataset.textSize||'standard'))));ctl.addEventListener('click',e=>{const b=e.target.closest('button[data-size]');if(!b)return;document.documentElement.dataset.textSize=b.dataset.size;localStorage.setItem('norwood-text-size',b.dataset.size);sync();});sync();
})();
