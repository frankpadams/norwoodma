(()=>{
'use strict';
let installPrompt=null;
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function ensureManifest(){if(!document.querySelector('link[rel="manifest"]')){const l=document.createElement('link');l.rel='manifest';l.href='/manifest.webmanifest?v=20260928';document.head.appendChild(l);}}
ensureManifest();
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;window.dispatchEvent(new CustomEvent('norwood-install-ready'));});
window.addEventListener('appinstalled',()=>{installPrompt=null;window.dispatchEvent(new CustomEvent('norwood-installed'));});
window.NorwoodPWA={canInstall:()=>!!installPrompt&&!standalone(),isStandalone:standalone,install:async()=>{if(!installPrompt)return false;const p=installPrompt;installPrompt=null;await p.prompt();const choice=await p.userChoice;return choice.outcome==='accepted';}};
})();
