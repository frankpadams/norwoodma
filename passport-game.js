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
 function drawCertificate(info){
  const canvas=document.createElement("canvas");canvas.width=1200;canvas.height=630;
  const c=canvas.getContext("2d");
  c.fillStyle="#f5f8fb";c.fillRect(0,0,1200,630);
  c.fillStyle="#003b71";c.fillRect(0,0,1200,18);
  c.strokeStyle="#d7ad00";c.lineWidth=5;c.strokeRect(32,34,1136,562);
  c.textAlign="center";c.textBaseline="middle";
  c.fillStyle="#003b71";c.font="800 34px system-ui, sans-serif";c.fillText("NORWOOD.MA",600,105);
  c.fillStyle="#9a7600";c.font="800 22px system-ui, sans-serif";c.fillText(info.kicker.toUpperCase(),600,165);
  c.fillStyle="#153b56";c.font="800 52px Georgia, serif";c.fillText(info.title,600,235);
  c.fillStyle="#2f495b";c.font="700 31px system-ui, sans-serif";c.fillText(info.name,600,328);
  c.fillStyle="#536b7b";c.font="500 24px system-ui, sans-serif";
  c.fillText(info.subtitle,600,385);
  c.strokeStyle="#d7ad00";c.lineWidth=2;c.beginPath();c.moveTo(285,435);c.lineTo(915,435);c.stroke();
  c.fillStyle="#003b71";c.font="800 24px system-ui, sans-serif";c.fillText("OUR TOWN. ONLINE.",600,490);
  c.fillStyle="#687d89";c.font="500 18px system-ui, sans-serif";c.fillText("An independent community game from Norwood.ma",600,535);
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
  certificate.hidden=false;certificateStatus.textContent="Your self-attestation unlocked this certificate. The attestation itself is not printed on it.";
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
   if(milestone){claim.hidden=false;claimTitle.textContent="Claim your "+milestone.title+" certificate";claimText.textContent="You’ve reached the "+milestone.count+"-stop milestone. Attest that your stamps reflect places you visited, then add the name you want on your certificate.";form.dataset.milestone=String(milestone.count)}
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
   if(line){byId("claimTitle").textContent="Claim your Bar Crawl Bingo certificate";byId("claimText").textContent="Attest that you visited the places you marked, then enter the name you want printed on your certificate."}
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
