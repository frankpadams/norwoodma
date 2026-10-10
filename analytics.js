/* Norwood.ma analytics: official Microsoft Clarity bootstrap and Cloudflare Web Analytics. */
(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window,document,"clarity","script","ykyity024p");
(function(){
  var d=document, first=d.getElementsByTagName('script')[0];
  var cf=d.createElement('script');
  cf.type='module';
  cf.src='https://static.cloudflareinsights.com/beacon.min.js';
  cf.setAttribute('data-cf-beacon','{"token":"49f7256fc503442b94e2bf83181600c3"}');
  first.parentNode.insertBefore(cf,first);
})();

/*
 * First-party interaction instrumentation.
 * Intentionally inactive until a secured, rate-limited collector is configured.
 * Do not place Apps Script authentication tokens in browser code.
 */
(function () {
  'use strict';
  var endpoint = ''; // Set only after a protected collection endpoint is deployed.
  var allowed = { page_view: true, ad_impression: true, ad_click: true, search: true };
  var last = Object.create(null);

  function track(type, fields) {
    if (!allowed[type] || !endpoint || navigator.doNotTrack === '1') return false;
    fields = fields || {};
    var data = {
      type: type,
      page: location.pathname,
      sponsorId: String(fields.sponsorId || '').slice(0, 100),
      placement: String(fields.placement || '').slice(0, 100),
      searchTerm: String(fields.searchTerm || '').slice(0, 120),
      referrer: document.referrer ? (function () {
        try { return new URL(document.referrer).origin; } catch (_) { return ''; }
      })() : ''
    };
    // Avoid duplicate ad impressions and repeated identical searches.
    var key = [type, data.page, data.sponsorId, data.placement, data.searchTerm].join('|');
    var now = Date.now();
    if (last[key] && now - last[key] < (type === 'ad_impression' ? 20000 : 1500)) return false;
    last[key] = now;
    try {
      // Non-blocking; server must validate origin, rate-limit and sanitize inputs.
      fetch(endpoint, {
        method: 'POST', mode: 'no-cors', keepalive: true,
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(data)
      }).catch(function () {});
      return true;
    } catch (_) { return false; }
  }

  window.NorwoodAnalytics = Object.freeze({ track: track });
})();
