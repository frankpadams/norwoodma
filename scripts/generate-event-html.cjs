/* Publish the same agenda markup used by the interactive event view. */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),agenda=require(path.join(root,'event-agenda.js'));
const today=process.env.NORWOOD_EVENT_TODAY||agenda.todayKey();
const events=JSON.parse(fs.readFileSync(path.join(root,'data/events.json'),'utf8')).filter(e=>{
 if(e.publish_candidate===false||!e.title||!/^\d{4}-\d{2}-\d{2}$/.test(e.start?.date||'')||(e.end?.date||e.start.date)<today)return false;
 if(!Array.isArray(e.calendar_ids)||!e.calendar_ids.includes('norwood-community'))return false;
 if(['private','members_only','team_only'].includes(String(e.public_access||'').toLowerCase()))return false;
 if(['castle-island-calendar','irish-brewing-events'].includes(e.source_id)){const place=[e.venue,e.address,e.town].join(' ');if(!/norwood|02062|31 astor/i.test(place))return false;}
 return !/^(?:event|events|calendar|schedule|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(e.title.trim());
});
function tier(e){const t=[e.title,e.notes,e.venue,e.address,e.organizer,e.source_id].join(' ').toLowerCase();if(/farmers'? market|farmer'?s market|town common|norwood common|580 washington st/.test(t))return 0;const religious=/\b(church|parish|chapel|congregation|temple|synagogue|mosque|worship|mass|bible|prayer|faith|ministry|saint catherine|st\. catherine)\b/.test(t);return 1+(religious?1:0)+(e.session_based===true&&e.drop_in!==true?2:0);}
events.sort((a,b)=>{const da=a.start.date<today?today:a.start.date,db=b.start.date<today?today:b.start.date;return da.localeCompare(db)||Number(!!(a.end?.date&&a.end.date>a.start.date))-Number(!!(b.end?.date&&b.end.date>b.start.date))||tier(a)-tier(b)||(a.start.time||'99:99').localeCompare(b.start.time||'99:99');});
const page=path.join(root,'events.html');let html=fs.readFileSync(page,'utf8');
const marker=/<!-- BEGIN GENERATED EVENT LIST -->[\s\S]*?<!-- END GENERATED EVENT LIST -->/;
if(!marker.test(html))throw Error('Event HTML marker missing');
html=html.replace(marker,()=>'<!-- BEGIN GENERATED EVENT LIST -->'+agenda.render(events,{today})+'<!-- END GENERATED EVENT LIST -->');
const graph=events.slice(0,150).map(e=>{const o={'@type':'Event',name:e.title,startDate:e.start.date,url:'https://www.norwood.ma/events.html?event='+encodeURIComponent(e.id)};if(e.end?.date)o.endDate=e.end.date;if(e.venue||e.address)o.location={'@type':'Place',name:e.venue||e.address,...(e.address?{address:e.address}:{})};if(e.notes||e.description)o.description=String(e.notes||e.description);const source=agenda.links(e).find(x=>x.label==='Official event information');if(source)o.sameAs=source.url;return o;});
const schema='<!-- BEGIN GENERATED EVENT SEO --><script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c')+'</script><!-- END GENERATED EVENT SEO -->';
html=html.replace(/<!-- BEGIN GENERATED EVENT SEO -->[\s\S]*?<!-- END GENERATED EVENT SEO -->/,()=>schema);
fs.writeFileSync(page,html);fs.writeFileSync(path.join(root,'data/event-seo-status.json'),JSON.stringify({events_in_html:events.length,events_in_schema:graph.length,generated_from:'data/events.json',date:today},null,2)+'\n');console.log(`Generated ${events.length} event listings in HTML and ${graph.length} structured events.`);
