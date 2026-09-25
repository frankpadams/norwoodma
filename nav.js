(()=>{
  const menu=document.querySelector('#menu'),nav=document.querySelector('#nav');
  if(!menu||!nav)return;
  // Shared navigation additions.
  if(!nav.querySelector('a[href="map.html"]')){
    const exploreLink=nav.querySelector('a[href="explore.html"]');
    const mapLink=document.createElement('a');
    mapLink.href='map.html';mapLink.textContent='Map';
    if(/\/map\.html$/i.test(location.pathname))mapLink.setAttribute('aria-current','page');
    if(exploreLink)exploreLink.insertAdjacentElement('afterend',mapLink);else nav.appendChild(mapLink);
  }
  if(!nav.querySelector('a[href="discover.html"]')){
    const discoverLink=document.createElement('a');
    discoverLink.href='discover.html';discoverLink.textContent='Discover';
    if(/\/discover\.html$/i.test(location.pathname))discoverLink.setAttribute('aria-current','page');
    const mapLink=nav.querySelector('a[href="map.html"]');
    if(mapLink)mapLink.insertAdjacentElement('afterend',discoverLink);else nav.appendChild(discoverLink);
  }
})();