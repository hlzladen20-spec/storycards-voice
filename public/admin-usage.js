import {authenticatedFetch} from './authenticated-fetch.js';
export function usageCSV(rows){
 const keys=['day','email','user_id','feature','model','requests','input_tokens','output_tokens','total_tokens','cached_tokens','audio_input_tokens','audio_output_tokens','audio_seconds','unresolved'];
 const cell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
 return '\uFEFF'+[keys,...rows.map(row=>keys.map(key=>row[key]))].map(row=>row.map(cell).join(';')).join('\r\n');
}
const featureLabels={'conversation':'Gespräch','conversation-transcription':'Spracherkennung','realtime/session':'Gespräch','flashcards':'Gesprächsauswertung','card-answer':'Ausspracheprüfung','card-speech':'Emma liest vor','translate-word':'Wortübersetzung','vocabulary-suggestion':'Neue Vokabeln'};
export function adminPresetRange(days,now=new Date()){
 const to=now.toISOString().slice(0,10);
 return {from:new Date(Date.parse(to)-(days-1)*86400000).toISOString().slice(0,10),to};
}
export function mountAdminUsage(profile,identity,{request=authenticatedFetch,now=()=>new Date()}={}){
 if(!identity?.admin)return;
 const area=document.createElement('details');area.className='profile-settings-group admin-usage';area.id='profileAdminSection';area.setAttribute('name','profile-settings');
 area.innerHTML=`<summary><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6ZM9 12l2 2 4-4"/></svg><span><strong>Adminbereich</strong><small>Übersicht, Nutzer & Werkzeuge</small></span><b aria-hidden="true">⌄</b></summary><div class="profile-group-content">
 <div class="usage-heading"><div><p class="usage-kicker">DEINE APP</p><h3>Alles im Blick</h3></div><button type="button" class="primary usage-sync"><span aria-hidden="true">↻</span> <span class="usage-sync-label">Synchronisieren</span></button></div>
 <p class="usage-last-sync">Noch nicht synchronisiert</p>
 <div class="usage-presets" role="group" aria-label="Zeitraum auswählen"><button type="button" data-days="1" aria-pressed="false">Heute</button><button type="button" data-days="7" aria-pressed="false">7 Tage</button><button type="button" data-days="30" aria-pressed="true">30 Tage</button></div>
 <p class="usage-period-label"></p>
 <details class="usage-period"><summary>Zeitraum anpassen</summary><form class="usage-filter"><label>Von<input type="date" name="from" required></label><label>Bis<input type="date" name="to" required></label><button class="secondary" type="submit">Zeitraum anwenden</button></form></details>
 <p role="status" class="usage-status" aria-live="polite"></p><section class="usage-overview" aria-label="Verbrauchsübersicht"><div class="usage-totals"></div></section>
 <section class="usage-people"><div class="usage-section-heading"><h4>Nutzer</h4><span class="usage-user-count"></span></div><label class="usage-search-label">Konto suchen<input type="search" class="usage-search" placeholder="E-Mail-Adresse" autocomplete="off"></label><div class="usage-users"></div></section>
 <details class="usage-info"><summary>Hinweise zur Erfassung</summary><p class="usage-note">Der Sync-Button lädt Verbrauch und Konten vom Server neu. Lernstände werden dabei nicht verändert. Erfassung ab Aktivierung; keine rückwirkende Zuordnung früherer Verbräuche. Zeitraum in UTC. Audio- und Cache-Tokens sind Teilmengen. Fehlende Messwerte bedeuten nicht null Verbrauch. Keine Gesprächsinhalte oder pauschale Euro-Schätzung.</p></details>
 <button type="button" class="ghost usage-export" disabled>↓ Verbrauchsdetails als CSV</button></div>`;
 profile.insertBefore(area,profile.querySelector('.profile-nav'));
 const $=selector=>area.querySelector(selector),form=$('.usage-filter'),status=$('.usage-status'),exportButton=$('.usage-export'),syncButton=$('.usage-sync'),search=$('.usage-search');
 const presets=[...area.querySelectorAll('[data-days]')],dateLabel=value=>new Date(value+'T00:00:00Z').toLocaleDateString('de-DE',{timeZone:'UTC'});
 const number=n=>Number(n||0).toLocaleString('de-DE');let report=null,running=false,presetDays=30,activeRange=adminPresetRange(30,now()),reportRange=null;
 function showRange(range){
  form.elements.from.value=range.from;form.elements.to.value=range.to;
  $('.usage-period-label').textContent=`${dateLabel(range.from)} – ${dateLabel(range.to)} · UTC`;
  presets.forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.days)===presetDays)));
 }
 showRange(activeRange);
 function renderUsers(){
  const host=$('.usage-users');host.replaceChildren();if(!report)return;
  const term=search.value.trim().toLocaleLowerCase('de-DE'),users=report.users.filter(user=>String(user.email||user.user_id).toLocaleLowerCase('de-DE').includes(term));
  $('.usage-user-count').textContent=term?`${users.length} / ${report.users.length}`:String(report.users.length);
  if(!users.length){const empty=document.createElement('p');empty.className='usage-empty';empty.textContent=term?'Kein passendes Konto gefunden.':'Noch keine angemeldeten Nutzer erfasst.';host.append(empty);return;}
  for(const user of users){
   const item=document.createElement('details');item.className='usage-user';
   const summary=document.createElement('summary'),name=document.createElement('span'),amount=document.createElement('strong'),chevron=document.createElement('span');
   name.className='usage-user-name';name.textContent=user.email||user.user_id;
   amount.className='usage-user-amount';amount.textContent=`${number(user.total_tokens)} Tokens`;
   chevron.className='usage-chevron';chevron.textContent='⌄';chevron.setAttribute('aria-hidden','true');summary.append(name,amount,chevron);item.append(summary);
   const info=document.createElement('div');info.className='usage-user-content';
   const metrics=document.createElement('dl');metrics.className='usage-user-metrics';
   for(const [label,value] of [['Eingabe',user.input_tokens],['Ausgabe',user.output_tokens],['Davon Cache',user.cached_tokens]]){const pair=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=number(value);pair.append(dt,dd);metrics.append(pair);}info.append(metrics);
   if(user.unresolved){const warning=document.createElement('p');warning.className='usage-warning';warning.textContent=`${number(user.unresolved)} Messungen noch offen oder unvollständig.`;info.append(warning);}
   const rows=report.breakdown.filter(row=>row.user_id===user.user_id);
   if(rows.length){
    const details=document.createElement('details');details.className='usage-breakdown';const title=document.createElement('summary');title.textContent='Tage & Funktionen anzeigen';details.append(title);
    for(const row of rows){const line=document.createElement('div'),label=document.createElement('strong'),amount=document.createElement('span'),model=document.createElement('small');line.className='usage-detail';label.textContent=`${dateLabel(row.day)} · ${featureLabels[row.feature]||row.feature}`;amount.textContent=`${number(row.total_tokens)} Tokens${row.unresolved?' · Messung offen':''}`;model.textContent=row.model;line.append(label,amount,model);details.append(line);}info.append(details);
   }else{const empty=document.createElement('p');empty.textContent='Noch kein KI-Verbrauch in diesem Zeitraum.';info.append(empty);}
   item.append(info);host.append(item);
  }
 }
 function renderTotals(){
  const totals=$('.usage-totals');totals.replaceChildren();
  for(const [label,value] of [['Konten',report.users.length],['Bestätigte Tokens',report.totals.total_tokens],['Messungen offen',report.totals.unresolved]]){
   const tile=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=number(value);small.textContent=label;tile.append(strong,small);totals.append(tile);
  }
 }
 async function load(range=presetDays?adminPresetRange(presetDays,now()):activeRange){
  if(running)return;running=true;
  const requested={...range};syncButton.disabled=true;form.querySelector('button').disabled=true;exportButton.disabled=true;
  presets.forEach(button=>button.disabled=true);form.elements.from.disabled=true;form.elements.to.disabled=true;
  $('.usage-sync-label').textContent='Lädt …';area.setAttribute('aria-busy','true');status.dataset.kind='loading';status.textContent='Aktuelle Serverdaten werden geladen …';
  try{
   const response=await request('/api/admin/usage?'+new URLSearchParams(requested),{cache:'no-store',signal:AbortSignal.timeout(30000)});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Verbrauch konnte nicht geladen werden.');
   if(!Array.isArray(data.users)||!Array.isArray(data.breakdown)||!data.totals)throw Error('Die Serverantwort ist unvollständig. Bitte erneut synchronisieren.');
   report=data;reportRange=requested;activeRange=requested;showRange(requested);renderTotals();renderUsers();
   $('.usage-last-sync').textContent=`Zuletzt synchronisiert: ${now().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`;
   status.dataset.kind=data.totals.unresolved?'warning':'success';
   status.textContent=data.totals.unresolved?'Offene Messungen: Die angezeigten Tokens sind der bestätigte Mindestverbrauch.':'✓ Serverdaten aktuell';
  }catch(error){status.dataset.kind='error';status.textContent=`Synchronisieren fehlgeschlagen. ${report?'Die bisherige Anzeige bleibt erhalten. ':''}${error.name==='TimeoutError'?'Bitte erneut versuchen.':error.message}`;}
  finally{running=false;syncButton.disabled=false;form.querySelector('button').disabled=false;exportButton.disabled=!report;presets.forEach(button=>button.disabled=false);form.elements.from.disabled=false;form.elements.to.disabled=false;$('.usage-sync-label').textContent='Synchronisieren';area.setAttribute('aria-busy','false');}
 }
 form.onsubmit=event=>{event.preventDefault();if(running||!form.reportValidity())return;presetDays=null;return load({from:form.elements.from.value,to:form.elements.to.value});};
 syncButton.onclick=()=>load();search.oninput=renderUsers;
 for(const button of presets)button.onclick=()=>{if(running)return;presetDays=Number(button.dataset.days);return load(adminPresetRange(presetDays,now()));};
 area.addEventListener('toggle',()=>{if(area.open&&!report)load();});
 exportButton.onclick=()=>{
  if(!report||running)return;const href=URL.createObjectURL(new Blob([usageCSV(report.breakdown)],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=href;link.download=`StoryCards-Verbrauch-${reportRange.from}-${reportRange.to}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
 };
 return {area,refresh:()=>load()};
}
