(()=> {
 const questions=[
  {type:"choice",category:"NORWOOD KNOWLEDGE",prompt:"What is the shorter line at Spot for?",options:["Bagel-club members","Bagged bagels to go","Sandwiches","Drinks only"],correct:"Bagged bagels to go",explanation:"The shorter line is for bagged bagels to go."},
  {type:"choice",category:"NORWOOD KNOWLEDGE",prompt:"D&G Deli has the best what in town?",options:["Chicken salad","Pastrami","Homemade cannolis","Brazilian jiu-jitsu lessons"],correct:"Chicken salad",explanation:"The answer is chicken salad."},
  {type:"choice",category:"NORWOOD KNOWLEDGE",prompt:"Who first used the phrase “Come on down!” on television?",options:["Rod Roddy","Ernie Boch Sr.","Johnny Olson"],correct:"Ernie Boch Sr.",explanation:"Ernie Boch Sr. (1964) was a Norwood car dealer known for his TV commercials. Johnny Olson (1972) was the announcer on The Price Is Right. Rod Roddy (1986) later became that show’s announcer.",detail:'<p><a href="https://www.massbroadcastershof.org/hall-of-fame/hall-of-fame-2018/ernie-boch%20/" target="_blank" rel="noopener">Ernie Boch Sr. — Massachusetts Broadcasters Hall of Fame ↗</a><br><a href="https://www.washingtonpost.com/archive/local/1985/10/14/johnny-olson/3c106a1f-0844-419d-83f1-5f26666cda17/" target="_blank" rel="noopener">Johnny Olson — The Washington Post ↗</a><br><a href="https://www.paramountpressexpress.com/cbs-entertainment/releases/?view=5163" target="_blank" rel="noopener">Rod Roddy — CBS/Paramount ↗</a></p>'},
  {type:"match",category:"MATCH THE McDONOUGHS",prompt:"Match each McDonough to the Norwood office they held.",rows:[["Timothy McDonough","Selectman"],["Patrick McDonough","School Committee"]],offices:["Selectman","School Committee"],explanation:"Timothy McDonough was a Selectman. Patrick McDonough served on the School Committee."},
  {type:"choice",category:"NORWOOD KNOWLEDGE",prompt:"Lou and Deb’s is known by true townies as…",options:["The Biz Club","Froggies","The (Irish) Heaven","Washington #7"],correct:"The (Irish) Heaven",explanation:"It’s known as The (Irish) Heaven."},
  {type:"choice",category:"NORWOOD KNOWLEDGE",prompt:"What Norwood business is known for its work with modified messenger ribonucleic acid?",options:["Moderna","Allied Group Chemical Cleaning","Home Market Foods","Honolulu"],correct:"Moderna",explanation:"Moderna is known for its work with modified messenger RNA."},
  {type:"choice",category:"NORWOOD KNOWLEDGE",prompt:"Holocaust survivor and business owner Aron Greenfield is honored with a memorial bench in Bernie Cooper Park. What longtime Norwood business did he own?",options:["Brenner’s Children’s Clothing","Mott’s Shoes","Paperama","Concannon Village"],correct:"Brenner’s Children’s Clothing",explanation:"He owned Brenner’s Children’s Clothing."},
  {type:"choice",category:"NORWOOD KNOWLEDGE",prompt:"What is the address of Eagle Shoe Repair?",options:["51 Day Street","Winsmith Mill","137 Nahatan Street","245 Nichols Street"],correct:"51 Day Street",explanation:"Eagle Shoe Repair is at 51 Day Street."},
  {type:"choice",category:"NORWOOD KNOWLEDGE",prompt:"Which Norwood bridge had claimed dozens of truck roofs before a cement truck pushed it about five feet out of place in 2023?",options:["Morse Street Bridge","George Lee Memorial Bridge","Washington Street Bridge over Hawes Brook","Route 1 bridge over the Neponset River"],correct:"Morse Street Bridge",explanation:"The cement truck struck the Morse Street Bridge in 2023."},
  {type:"choice",category:"NORWOOD KNOWLEDGE",prompt:"When is Norwood’s overnight parking ban in effect?",options:["November 15 through April 1","From the first day of winter through the first day of spring","December 1 through March 1","When there is more than one inch of snow on the road"],correct:"November 15 through April 1",explanation:"The overnight parking ban runs from November 15 through April 1."},
  {type:"choice",category:"NORWOOD KNOWLEDGE",prompt:"What did Aaron Guild leave in his field?",options:["His iPhone","His ox and plow","A gift certificate to Olivadi’s","A BLT with avocado on an everything bagel"],correct:"His ox and plow",explanation:"Aaron Guild left his ox and plow in the field."},
  {type:"choice",category:"NORWOOD KNOWLEDGE",prompt:"When Norwood sold the old Civic Center to Norwood Hospital, what recreation facility did the town give up and never get back?",options:["An indoor swimming pool","Tennis courts","A gymnasium","A social hall"],correct:"An indoor swimming pool",explanation:"The old Civic Center had an indoor swimming pool."},
  {type:"townie",category:"HAVE YOU EVER…?",prompt:"Have you ever marched in a Norwood parade?"},
  {type:"townie",category:"HAVE YOU EVER…?",prompt:"Have you ever been elected to Town Meeting or to another office in Norwood town government?"},
  {type:"townie",category:"HAVE YOU EVER…?",prompt:"Have you ever attended a Concert on the Common?"},
  {type:"townie",category:"HAVE YOU EVER…?",prompt:"Have you ever gone to Norwood Day?"},
  {type:"townie",category:"HAVE YOU EVER…?",prompt:"Have you ever taken the 34E to Forest Hills?"},
  {type:"townie",category:"HAVE YOU EVER…?",prompt:"Have you ever skated at Roll-Land?"},
  {type:"townie",category:"HAVE YOU EVER…?",prompt:"Have you ever attended the meat raffle?"},
  {type:"townie",category:"HAVE YOU EVER…?",prompt:"Have you ever met Mustang Sally?"},
  {type:"townie",category:"HAVE YOU EVER…?",prompt:"Have you ever volunteered with a Norwood organization, such as youth sports, a town committee, or a service organization?"},
  {type:"townie",category:"HAVE YOU EVER…?",prompt:"Have you ever attended Norwood’s fishing derby and rubber duck race?"},
  {type:"townie",category:"HAVE YOU EVER…?",prompt:"Do you have a vehicle sticker for Norwood’s Winter Street Recycling Facility?"},
  {type:"townie",category:"HAVE YOU EVER…?",prompt:"Have you ever been to a race at Norwood Arena?"},
  {type:"townie",category:"HAVE YOU EVER…?",prompt:"Do you own at least one piece of clothing that references Norwood?",context:'If not, <a href="https://www.norwood.ma/nts.html" target="_blank" rel="noopener">visit Norwood Trading &amp; Supply ↗</a>.'}
 ];
 const $=id=>document.getElementById(id);
 const intro=$("townieIntro"),game=$("townieGame"),results=$("townieResults"),questionTitle=$("townieQuestion");
 const choices=$("townieChoices"),match=$("townieMatch"),feedback=$("townieFeedback"),next=$("townieNext"),context=$("townieContext");
 let current=0,knowledgePoints=0,experiencePoints=0,answered=false;
 const shuffle=list=>{const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 function updateScore(){const total=knowledgePoints+experiencePoints;$("towniePoints").textContent="Townie points: "+total;$("townieProgress").setAttribute("aria-valuenow",String(current));$("townieProgressBar").style.width=(current/questions.length*100)+"%"}
 function announceFeedback(isPoint,message,detail){feedback.hidden=false;feedback.innerHTML="";const p=document.createElement("p");p.textContent=message;feedback.appendChild(p);if(detail){const d=document.createElement("div");d.innerHTML=detail;feedback.appendChild(d)}}
 function finishQuestion(isPoint,message,detail){answered=true;choices.querySelectorAll("button").forEach(b=>b.disabled=true);match.querySelectorAll("select,button").forEach(e=>e.disabled=true);next.hidden=false;announceFeedback(isPoint,message,detail);updateScore()}
 function makeTownieChoice(label,yes){const b=document.createElement("button");b.type="button";b.className="townie-choice";b.textContent=label;b.addEventListener("click",()=>{if(answered)return;if(yes)experiencePoints++;finishQuestion(yes,yes?"Yes — you earned a Townie point.":"No point this time.", "")});choices.appendChild(b)}
 function render(){
  answered=false;const q=questions[current];choices.innerHTML="";match.innerHTML="";match.hidden=true;choices.hidden=false;feedback.hidden=true;next.hidden=true;context.innerHTML=q.context||"";context.hidden=!q.context;
  $("townieProgressText").textContent="Question "+(current+1)+" of "+questions.length;
  $("townieCategory").textContent=q.category;questionTitle.textContent=q.prompt;
  if(q.type==="choice"){
   shuffle(q.options).forEach(option=>{const b=document.createElement("button");b.type="button";b.className="townie-choice";b.textContent=option;b.addEventListener("click",()=>{if(answered)return;const correct=option===q.correct;if(correct)knowledgePoints++;choices.querySelectorAll("button").forEach(x=>{x.disabled=true;if(x.textContent===q.correct)x.classList.add("is-correct")});if(!correct)b.classList.add("is-wrong");finishQuestion(correct,correct?"Correct!":"Not quite. The answer is "+q.correct+".",q.explanation+(q.detail||""))});choices.appendChild(b)});
  }else if(q.type==="match"){
   choices.hidden=true;match.hidden=false;
   q.rows.forEach((row,index)=>{const wrap=document.createElement("div");wrap.className="townie-match-row";const label=document.createElement("label");label.htmlFor="townieMatch"+index;label.textContent=row[0];const select=document.createElement("select");select.id="townieMatch"+index;select.className="townie-select";select.setAttribute("aria-label","Choose an office for "+row[0]);const placeholder=document.createElement("option");placeholder.value="";placeholder.textContent="Choose an office";select.appendChild(placeholder);q.offices.forEach(office=>{const opt=document.createElement("option");opt.value=office;opt.textContent=office;select.appendChild(opt)});wrap.append(label,select);match.appendChild(wrap)});
   const selects=Array.from(match.querySelectorAll("select"));
   const refreshOptions=()=>selects.forEach((select,index)=>Array.from(select.options).forEach(option=>{if(!option.value){option.disabled=false;return}const other=selects[1-index]?.value;option.disabled=option.value===other&&option.value!==select.value}));
   selects.forEach(select=>select.addEventListener("change",()=>{refreshOptions();submit.disabled=selects.some(s=>!s.value)}));
   const submit=document.createElement("button");submit.type="button";submit.className="townie-button townie-button-primary townie-match-submit";submit.textContent="Check matches";submit.disabled=true;submit.addEventListener("click",()=>{if(answered)return;const correct=selects.every((s,index)=>s.value===q.rows[index][1]);if(correct)knowledgePoints++;finishQuestion(correct,correct?"Both matches are right.":"Here are the correct matches.",q.explanation)});match.appendChild(submit);refreshOptions();
  }else{
   choices.hidden=false;makeTownieChoice("Yes",true);makeTownieChoice("No",false);
  }
  updateScore();questionTitle.focus({preventScroll:true});
 }
 function complete(){game.hidden=true;results.hidden=false;$("townieTotal").textContent=String(knowledgePoints+experiencePoints);$("knowledgeScore").textContent=knowledgePoints+" / 12";$("experienceScore").textContent=experiencePoints+" / 13";window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"})}
 $("townieStart").addEventListener("click",()=>{current=0;knowledgePoints=0;experiencePoints=0;intro.hidden=true;results.hidden=true;game.hidden=false;render()});
 next.addEventListener("click",()=>{if(current<questions.length-1){current++;render()}else complete()});
 $("townieReplay").addEventListener("click",()=>{$("townieStart").click()});
})();