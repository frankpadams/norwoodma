// Generate the same topic cards and ordering used by the resource directory.
// Run after editing resource data, business data, or resource-renderer.js.
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const root={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[],scrollIntoView:()=>{}};
const count={textContent:''};
const context={window:{addEventListener:()=>{}},document:{querySelector:s=>s==='#resourceTopics'?root:s==='#resourceCount'?count:null},location:{hash:''},requestAnimationFrame:()=>{},console};
vm.createContext(context);
for(const file of ['data/resources-data.js','data/businesses-data.js'])vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),context);
let renderer=fs.readFileSync(path.join(base,'scripts/resource-renderer.js'),'utf8');
renderer=renderer.replace(/\}\)\(\);\s*$/, 'window.resourceBuild={topics,render};})();');
vm.runInContext(renderer,context);
const sections=[];
for(const topic of context.window.resourceBuild.topics){
 context.location.hash='#'+topic[0];
 context.window.resourceBuild.render();
 sections.push(root.innerHTML.replace('id="selected-'+topic[0]+'"','id="'+topic[0]+'"').replace('<section ', '<section hidden data-resource-topic="'+topic[0]+'" '));
}
const start='<!-- BEGIN GENERATED RESOURCE HTML -->';
const end='<!-- END GENERATED RESOURCE HTML -->';
let html=fs.readFileSync(path.join(base,'resources.html'),'utf8');
const block=start+'<div id="resourceTopics">'+sections.join('\n')+'</div>'+end;
if(html.includes(start))html=html.replace(new RegExp(start+'[\\s\\S]*?'+end),()=>block);
else html=html.replace('<div id="resourceTopics"></div>',()=>block);
html=html.replace(/<script src="data\/(?:resources|businesses)-data\.js[^\"]*"><\/script>/g,'');
html=html.replace(/resources\.js\?v=[^\"]+/, 'resources.js?v=html-topics-20261021');
if(!html.includes('id="resource-nojs"'))html=html.replace('</head>','<style>[data-resource-topic][hidden]{display:none!important}</style><noscript id="resource-nojs"><style>[data-resource-topic][hidden]{display:block!important}.resource-back,.resource-basic-needs-tools{display:none!important}</style></noscript></head>');
html=html.replace(/<span id="resourceCount">[^<]*<\/span>/,'<span id="resourceCount">'+context.window.NORWOOD_RESOURCES.length+' curated entries in this build.</span>');
fs.writeFileSync(path.join(base,'resources.html'),html);
console.log(`Generated ${sections.length} resource topics; ${Buffer.byteLength(html)} bytes of HTML.`);
