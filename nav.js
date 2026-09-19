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

  const root=document.documentElement;
  const saved=localStorage.getItem('norwood-text-size')||'standard';
  root.dataset.textSize=saved;
  const contrast=localStorage.getItem('norwood-high-contrast')==='true';
  root.dataset.highContrast=String(contrast);

  const ctl=document.createElement('div');
  ctl.className='text-size-controls accessibility-controls';
  ctl.setAttribute('aria-label','Accessibility display controls');
  ctl.innerHTML='<span class="sr-only">Display settings</span><button type="button" data-size="compact" aria-label="Smaller text">A−</button><button type="button" data-size="standard" aria-label="Standard text">A</button><button type="button" data-size="large" aria-label="Larger text">A+</button><button type="button" data-contrast aria-label="Toggle high contrast">◐ <span>Contrast</span></button>';
  document.body.appendChild(ctl);

  const sync=()=>{
    ctl.querySelectorAll('button[data-size]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.size===(root.dataset.textSize||'standard'))));
    const cb=ctl.querySelector('[data-contrast]');
    if(cb)cb.setAttribute('aria-pressed',String(root.dataset.highContrast==='true'));
  };
  ctl.addEventListener('click',e=>{
    const b=e.target.closest('button');
    if(!b)return;
    if(b.dataset.size){root.dataset.textSize=b.dataset.size;localStorage.setItem('norwood-text-size',b.dataset.size);}
    if(b.hasAttribute('data-contrast')){const next=root.dataset.highContrast!=='true';root.dataset.highContrast=String(next);localStorage.setItem('norwood-high-contrast',String(next));}
    sync();
  });
  sync();

  // Always-visible deployment marker: makes it easy to confirm which public build is loaded.
  const footer=document.querySelector('footer');
  if(footer){
    const meta=document.createElement('p');
    meta.className='footer-build-meta';
    meta.setAttribute('aria-label','Site version and copyright');
    meta.innerHTML='© 2026 Norwood.ma <span aria-hidden="true">·</span> Version 0.13.3.1';
    footer.appendChild(meta);
  }
})();