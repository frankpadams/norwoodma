(function(){
 "use strict";
 const page=document.querySelector("[data-norwood-game]");
 if(!page)return;
 const game=page.dataset.norwoodGame;
 const byId=id=>document.getElementById(id);
 const status=byId("gameStatus");
 const claim=byId("certificateClaim");
 const certificate=byId("certificate");
 const certificateImage=byId("certificateImage");
 const certificateStatus=byId("certificateStatus");
 const shareUrl=window.location.origin+window.location.pathname;
 let latestCertificate=null;

 function readSaved(key,fallback){
  try{const value=JSON.parse(localStorage.getItem(key));return value&&typeof value==="object"?value:fallback}catch(error){return fallback}
 }
 function save(key,value){
  try{localStorage.setItem(key,JSON.stringify(value));return true}catch(error){return false}
 }
 function normalize(value){return String(value||"").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
 function mapsUrl(){return "map.html"}
 function makeLink(label,href,external){
  const a=document.createElement("a");a.className="passport-link";a.textContent=label;a.href=href;
  if(external){a.target="_blank";a.rel="noopener"}return a;
 }
 function makePhotoLogo(source){
  const canvas=document.createElement("canvas");canvas.width=source.width;canvas.height=source.height;
  const context=canvas.getContext("2d");context.drawImage(source,0,0);
  const imageData=context.getImageData(0,0,canvas.width,canvas.height),pixels=imageData.data;
  for(let i=0;i<pixels.length;i+=4){
   const x=(i/4)%canvas.width,y=Math.floor(i/4/canvas.width),r=pixels[i],g=pixels[i+1],b=pixels[i+2];
   const pinX=x-397,pinY=y-74,inPin=(pinX*pinX)/(30*30)+(pinY*pinY)/(27*27)<=1;
   if(pinX*pinX+pinY*pinY<=10*10){pixels[i]=255;pixels[i+1]=255;pixels[i+2]=255;pixels[i+3]=255;continue}
   if(r>238&&g>238&&b>238&&Math.max(r,g,b)-Math.min(r,g,b)<18){pixels[i+3]=0;continue}
   const isGold=r>150&&r>g*1.12&&g>b*1.25,isPinNavy=inPin&&b>r*1.45&&b>g*1.3;
   if(!isGold&&!isPinNavy){pixels[i]=255;pixels[i+1]=255;pixels[i+2]=255}
  }
  context.putImageData(imageData,0,0);return canvas;
 }
 async function drawCertificate(info){
  const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error("Could not load the certificate artwork."));image.src=new URL(src,document.baseURI).href});
  const [logo,background]=await Promise.all([loadImage("assets/logo-approved-transparent.png"),loadImage("assets/CommonGazeeboSeptember.png")]);
  const canvas=document.createElement("canvas");canvas.width=1200;canvas.height=630;
  const c=canvas.getContext("2d");
  c.fillStyle="#fbf8ef";c.fillRect(0,0,1200,630);

  // Keep the logo over the Town Common photo, then fade the image to a pale backdrop behind the certificate text.
  c.save();c.beginPath();c.roundRect(38,38,1124,554,11);c.clip();
  const photoRatio=1124/554,sourceHeight=background.width/photoRatio;
  const sourceY=Math.max(0,Math.min(background.height-sourceHeight,(background.height-sourceHeight)/2));
  c.drawImage(background,0,sourceY,background.width,sourceHeight,38,38,1124,554);
  const shade=c.createLinearGradient(0,38,0,265);shade.addColorStop(0,"rgba(0,20,38,.62)");shade.addColorStop(.72,"rgba(0,20,38,.42)");shade.addColorStop(1,"rgba(0,20,38,0)");
  c.fillStyle=shade;c.fillRect(38,38,1124,170);
  const wash=c.createLinearGradient(0,145,0,255);wash.addColorStop(0,"rgba(255,253,248,0)");wash.addColorStop(1,"rgba(255,253,248,.84)");
  c.fillStyle=wash;c.fillRect(38,145,1124,110);c.fillStyle="rgba(255,253,248,.84)";c.fillRect(38,255,1124,337);
  const brandLogo=makePhotoLogo(logo),logoWidth=490,logoHeight=brandLogo.height*logoWidth/brandLogo.width;
  c.drawImage(brandLogo,(1200-logoWidth)/2,42,logoWidth,logoHeight);
  c.restore();

  c.strokeStyle="#c89c18";c.lineWidth=4;c.beginPath();c.roundRect(20,20,1160,590,20);c.stroke();
  c.strokeStyle="#173b60";c.lineWidth=2;c.beginPath();c.roundRect(32,32,1136,566,15);c.stroke();
  c.textAlign="center";c.textBaseline="middle";
  c.fillStyle="#fff6d7";c.strokeStyle="#c89c18";c.lineWidth=3;c.beginPath();c.arc(600,224,38,0,Math.PI*2);c.fill();c.stroke();
  c.strokeStyle="#c89c18";c.lineWidth=2;c.beginPath();c.arc(600,224,22,0,Math.PI*2);c.stroke();
  c.fillStyle="#a47b00";c.font="800 25px system-ui, sans-serif";c.fillText("★",600,224);
  c.fillStyle="#987000";c.font="800 17px system-ui, sans-serif";c.fillText("ACHIEVEMENT UNLOCKED",600,284);
  c.fillStyle="#34566f";c.font="800 19px system-ui, sans-serif";c.fillText(info.kicker.toUpperCase(),600,324);
  c.fillStyle="#12385a";c.font="800 50px Georgia, serif";c.fillText(info.title,600,376,1040);
  c.fillStyle="#243f52";c.font="400 34px Georgia, serif";c.fillText(info.name,600,428,1000);
  c.strokeStyle="#c89c18";c.lineWidth=2;c.beginPath();c.moveTo(360,466);c.lineTo(840,466);c.stroke();
  c.fillStyle="#536b7b";c.font="500 22px system-ui, sans-serif";c.fillText(info.subtitle,600,500,1040);
  c.fillStyle="#153b56";c.font="800 17px system-ui, sans-serif";c.fillText("A LOCAL GAME FROM NORWOOD.MA",600,558);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve({blob,dataUrl:canvas.toDataURL("image/png")}):reject(new Error("Could not prepare the certificate image.")),"image/png"));
 }
 function downloadCertificate(){
  if(!latestCertificate)return;
  const a=document.createElement("a");a.href=URL.createObjectURL(latestCertificate.blob);a.download=latestCertificate.filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
 }
 function copyText(text){
  if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text);
  return new Promise((resolve,reject)=>{
   const input=document.createElement("textarea");input.value=text;input.setAttribute("readonly","");input.style.position="fixed";input.style.opacity="0";document.body.appendChild(input);input.select();
   let ok=false;try{ok=document.execCommand("copy")}catch(error){}input.remove();ok?resolve():reject(new Error("Clipboard unavailable"));
  });
 }
 async function shareCertificate(){
  if(!latestCertificate)return;
  const caption="I completed "+latestCertificate.title+" in Norwood! "+shareUrl;
  certificateStatus.textContent="Preparing your certificate to share…";
  try{
   if(!navigator.share)throw new Error("Native sharing is unavailable.");
   const file=new File([latestCertificate.blob],latestCertificate.filename,{type:"image/png"});
   if(navigator.canShare&&navigator.canShare({files:[file]}))await navigator.share({files:[file],title:latestCertificate.title,text:caption,url:shareUrl});
   else await navigator.share({title:latestCertificate.title,text:caption,url:shareUrl});
   certificateStatus.textContent="Share menu opened.";
  }catch(error){
   if(error&&error.name==="AbortError"){certificateStatus.textContent="Share canceled.";return}
   try{downloadCertificate();await copyText(caption);certificateStatus.textContent="Certificate downloaded and caption copied. Add both to your post."}
   catch(fallbackError){certificateStatus.textContent="Use Download certificate to save the image, or copy this page link: "+shareUrl}
  }
 }
 async function createCertificate(info){
  const prepared=await drawCertificate(info);
  latestCertificate={blob:prepared.blob,filename:info.filename,title:info.title};
  certificateImage.src=prepared.dataUrl;certificateImage.alt=info.title+" certificate for "+info.name+". "+info.subtitle;
  certificate.hidden=false;certificateStatus.textContent="Your certificate is ready.";
  certificate.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
 }
 function printCertificate(){document.body.classList.add("print-certificate");window.print();window.addEventListener("afterprint",()=>document.body.classList.remove("print-certificate"),{once:true})}
 byId("downloadCertificate").addEventListener("click",downloadCertificate);
 byId("shareCertificate").addEventListener("click",shareCertificate);
 byId("printCertificate").addEventListener("click",printCertificate);

 function stopCard(stop,visited,onToggle){
  const article=document.createElement("article");article.className="passport-stop"+(visited?" is-visited":"");
  const title=document.createElement("h3");title.textContent=stop.name;article.appendChild(title);
  const address=document.createElement("p");address.textContent=stop.address;article.appendChild(address);
  if(stop.note){const note=document.createElement("p");note.className="passport-note";note.textContent=stop.note;article.appendChild(note)}
  const links=document.createElement("div");links.className="passport-stop-links";
  if(stop.url)links.appendChild(makeLink(stop.linkLabel||"Official site ↗",stop.url,true));
  links.appendChild(makeLink("Find on Super Map →",mapsUrl(stop.name),false));article.appendChild(links);
  const button=document.createElement("button");button.type="button";button.className="passport-stamp";button.setAttribute("aria-pressed",String(visited));button.textContent=visited?"✓ Visit stamped":"Stamp after a visit";
  button.addEventListener("click",()=>onToggle(stop.id));article.appendChild(button);return article;
 }

 function pizzaStops(){
  const ids=["1a-pizza","bardos-pizza-trailer","buffalo-s-pizza-subs","crushed-peppers","domino-s-pizza","express-pizza","veggie-crust-norwood","mak-s-roast-beef-pizza","mustang-pizza","pizza-palace","pizzeria-bruno-s","royal-pizza","stashs-pizza-norwood"];
  const all=window.NORWOOD_RESTAURANTS||[];
  return ids.map(id=>all.find(item=>item.id===id)).filter(Boolean).map(item=>({
   id:item.id,name:item.name,address:item.address+", Norwood, MA",
   url:item.link_type==="official"?item.url:"",
   linkLabel:"Pizzeria website ↗",
   note:item.id==="bardos-pizza-trailer"?"At Castle Island Brewing. The trailer can be offsite; check its current schedule before visiting.":""
  }));
 }
 function initPizza(){
  const stops=pizzaStops(),key="norwood-pizza-passport-v1",data=readSaved(key,{visited:[],earned:[]});
  const milestones=[{count:5,title:"Pizza Explorer"},{count:9,title:"Norwood Slice Seeker"},{count:stops.length,title:"Norwood Pizza Passport Complete"}];
  const list=byId("pizzaStops"),count=byId("pizzaStampCount"),claimTitle=byId("claimTitle"),claimText=byId("claimText"),form=byId("certificateForm");
  function visited(){return new Set((Array.isArray(data.visited)?data.visited:[]).filter(id=>stops.some(s=>s.id===id)))}
  function nextMilestone(total){return milestones.find(m=>total>=m.count&&!data.earned.includes(m.count))}
  function render(){
   const found=visited();list.replaceChildren();
   stops.forEach(stop=>list.appendChild(stopCard(stop,found.has(stop.id),toggleStop)));
   count.textContent=found.size+" of "+stops.length+" visits stamped";
   const milestone=nextMilestone(found.size);
   if(milestone){claim.hidden=false;claimTitle.textContent="Claim your "+milestone.title+" certificate";claimText.textContent="You’ve reached the "+milestone.count+"-stop milestone. Add the name you want on your certificate.";form.dataset.milestone=String(milestone.count)}
   else{claim.hidden=true;if(found.size===stops.length&&milestones.every(m=>data.earned.includes(m.count)))status.textContent="You’ve earned all three passport certificates. Your stamps remain saved in this browser."}
  }
  function toggleStop(id){
   const next=visited();if(next.has(id))next.delete(id);else next.add(id);
   data.visited=Array.from(next);save(key,data);render();
   status.textContent="Passport saved on this device.";
  }
  byId("resetGame").addEventListener("click",()=>{
   if(!window.confirm("Clear this passport’s saved stamps and certificates on this device?"))return;
   localStorage.removeItem(key);data.visited=[];data.earned=[];certificate.hidden=true;render();status.textContent="Passport reset.";
  });
  form.addEventListener("submit",async event=>{
   event.preventDefault();
   const name=byId("certificateName").value.trim(),attested=byId("certificateAttest").checked;
   const milestone=nextMilestone(visited().size);
   if(!name){status.textContent="Enter the name you want printed on the certificate.";byId("certificateName").focus();return}
   if(!attested){status.textContent="Check the attestation box to unlock your certificate.";byId("certificateAttest").focus();return}
   if(!milestone)return;
   try{
    await createCertificate({kicker:"Norwood Pizza Passport",title:milestone.title,name:name,subtitle:"Milestone: "+milestone.count+" of "+stops.length+" Norwood pizza stops",filename:"norwood-pizza-passport-"+milestone.count+".png"});
    data.earned.push(milestone.count);save(key,data);byId("certificateAttest").checked=false;render();
   }catch(error){status.textContent=error.message||"The certificate could not be created."}
  });
  if(!stops.length){status.textContent="The restaurant list did not load. Refresh this page to try again.";return}
  status.textContent="Your stamps stay in this browser. No account is needed.";render();
 }

 function barVenues(){
  const curated=window.NORWOOD_BAR_CRAWL_VENUES&&window.NORWOOD_BAR_CRAWL_VENUES.venues;
  return Array.isArray(curated)?curated.map(v=>({id:v.id,name:v.name,address:v.address+", Norwood, MA",license:v.licenseId})):[];
 }
 function shuffle(list){
  const out=list.slice();
  for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}
  return out;
 }
 function makeBoard(venues){
  const board=shuffle(venues).slice(0,24).map(v=>v.id);board.splice(12,0,"FREE");return board;
 }
 function bingoLine(board,marked){
  const lines=[];
  for(let r=0;r<5;r++)lines.push([0,1,2,3,4].map(c=>r*5+c));
  for(let c=0;c<5;c++)lines.push([0,1,2,3,4].map(r=>r*5+c));
  lines.push([0,6,12,18,24],[4,8,12,16,20]);
  for(let n=0;n<lines.length;n++)if(lines[n].every(i=>board[i]==="FREE"||marked.has(board[i])))return n<5?"across":n<10?"down":n===10?"diagonal":"diagonal";
  return "";
 }
 function initBingo(){
  const venues=barVenues(),key="norwood-bar-crawl-bingo-v1";
  if(venues.length<24){status.textContent="The eligible venue list did not load. Refresh this page to try again.";return}
  const venueById=new Map(venues.map(v=>[v.id,v]));
  let data=readSaved(key,{board:makeBoard(venues),marked:[]});
  if(!Array.isArray(data.board)||data.board.length!==25||data.board[12]!=="FREE"||data.board.filter(id=>id!=="FREE").some(id=>!venueById.has(id)))data={board:makeBoard(venues),marked:[]};
  const boardEl=byId("bingoBoard"),list=byId("bingoVenueList"),claimForm=byId("certificateForm");
  function marked(){return new Set((Array.isArray(data.marked)?data.marked:[]).filter(id=>venueById.has(id)))}
  function render(){
   const selected=marked(),line=bingoLine(data.board,selected);boardEl.replaceChildren();
   data.board.forEach((id,index)=>{
    if(id==="FREE"){const free=document.createElement("div");free.className="bingo-cell is-free";free.setAttribute("aria-label","Free center square");free.textContent="FREE";boardEl.appendChild(free);return}
    const venue=venueById.get(id),button=document.createElement("button");button.type="button";button.className="bingo-cell"+(selected.has(id)?" is-marked":"");button.setAttribute("aria-pressed",String(selected.has(id)));button.setAttribute("aria-label",(selected.has(id)?"Visited: ":"Not visited: ")+venue.name+", "+venue.address);button.title=venue.name+" — "+venue.address;
    const label=document.createElement("span");label.textContent=venue.name;button.appendChild(label);
    if(selected.has(id)){const mark=document.createElement("span");mark.className="bingo-mark";mark.textContent="VISITED";button.appendChild(mark)}
    button.addEventListener("click",()=>toggleVenue(id));boardEl.appendChild(button);
   });
   byId("bingoCount").textContent=selected.size+" of 24 venue squares marked";
   byId("bingoWinStatus").textContent=line?"Bingo! You have a "+line+" line.":"Visit and mark four venues in a line to get Bingo.";
   claim.hidden=!line;
   if(line){byId("claimTitle").textContent="Claim your Bar Crawl Bingo certificate";byId("claimText").textContent="Add the name you want on your certificate."}
   list.replaceChildren();
   venues.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(venue=>{
    const li=document.createElement("li"),name=document.createElement("strong"),small=document.createElement("small"),link=makeLink("Open Super Map →",mapsUrl(),false);
    name.textContent=venue.name;small.textContent=venue.address;li.append(name,small,link);list.appendChild(li);
   });
   save(key,data);
  }
  function toggleVenue(id){
   const selected=marked();if(selected.has(id))selected.delete(id);else selected.add(id);
   data.marked=Array.from(selected);render();status.textContent="Bingo card saved on this device.";
  }
  byId("newCard").addEventListener("click",()=>{
   if(!window.confirm("Start a new random bingo card? Your current marked card will be cleared."))return;
   data={board:makeBoard(venues),marked:[]};certificate.hidden=true;byId("certificateAttest").checked=false;byId("certificateName").value="";render();status.textContent="New bingo card ready.";
  });
  claimForm.addEventListener("submit",async event=>{
   event.preventDefault();const name=byId("certificateName").value.trim();
   if(!name){status.textContent="Enter the name you want printed on the certificate.";byId("certificateName").focus();return}
   if(!byId("certificateAttest").checked){status.textContent="Check the attestation box to unlock your certificate.";byId("certificateAttest").focus();return}
   const line=bingoLine(data.board,marked());if(!line)return;
   try{
    await createCertificate({kicker:"Norwood Bar Crawl Bingo",title:"Bingo!",name:name,subtitle:"A "+line+" line across Norwood",filename:"norwood-bar-crawl-bingo.png"});
    byId("certificateAttest").checked=false;
   }catch(error){status.textContent=error.message||"The certificate could not be created."}
  });
  status.textContent="Your card stays in this browser. No account is needed.";render();
 }
 if(game==="pizza")initPizza();
 else if(game==="bar-crawl")initBingo();
})();
