/* First-party, privacy-minimal Norwood.ma event tracking.
 * Disabled until the Apps Script deployment URL is configured.
 * No cookies, fingerprinting, IP collection, or raw search text.
 */
(function () {
  'use strict';
  var endpoint = window.NORWOOD_ANALYTICS_ENDPOINT || '';
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint)) return;
  if (navigator.globalPrivacyControl || navigator.doNotTrack === '1') return;
  function emit(type, options) {
    options = options || {};
    var data = JSON.stringify({
      type: type,
      path: location.pathname,
      slot: options.slot || '',
      sponsor: options.sponsor || ''
    });
    try { navigator.sendBeacon(endpoint, new Blob([data], {type:'text/plain'})); } catch (_) {}
  }
  window.norwoodTrack = emit;
  emit('page_view');
})();
