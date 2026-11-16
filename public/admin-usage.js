import {authenticatedFetch} from './authenticated-fetch.js';
export function usageCSV(rows){
 const keys=['day','email','user_id','feature','model','requests','input_tokens','output_tokens','total_tokens','cached_tokens','audio_input_tokens','audio_output_tokens','audio_seconds','unresolved'];
 const cell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
 return '\uFEFF'+[keys,...rows.map(row=>keys.map(key=>row[key]))].map(row=>row.map(cell).join(';')).join('\r\n');
}
export function mountAdminUsage(profile,identity){
 if(!identity?.admin)return;
 const area=document.createElement('details');area.className='profile-settings-group admin-usage';area.id='profileAdminSection';area.setAttribute('name','profile-settings');
 area.innerHTML=`<summary><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6ZM9 12l2 2 4-4"/></svg><span><strong>Adminbereich</strong><small>Konten und tatsächlicher KI-Verbrauch</small></span><b aria-hidden="true">⌄</b></summary><div class="profile-group-content"><p>Nur für dein Administratorkonto. Erfassung ab Aktivierung dieser Version; frühere Verbräuche lassen sich nicht rückwirkend Konten zuordnen.</p>
 <form class="usage-filter"><label>Von<input type="date" name="from" required></label><label>Bis<input type="date" name="to" required></label><button class="primary" type="submit">Anzeigen</button></form><p role="status" class="usage-status" aria-live="polite"></p><div class="usage-totals"></div><div class="usage-users"></div><button type="button" class="secondary usage-export" disabled>Details als CSV herunterladen</button><p class="usage-note">Zeitraum in UTC. Audio- und Cache-Tokens sind Teilmengen, keine zusätzlichen Tokens. Fehlende Messwerte sind nicht null Verbrauch. Keine Gesprächsinhalte; keine pauschale Euro-Schätzung.</p></div>`;
 profile.insertBefore(area,profile.querySelector('.profile-nav'));
 const form=area.querySelector('form'),status=area.querySelector('.usage-status'),exportButton=area.querySelector('.usage-export');
 const today=new Date();form.elements.to.value=today.toISOString().slice(0,10);form.elements.from.value=new Date(today.getTime()-29*86400000).toISOString().slice(0,10);
 const number=n=>Number(n||0).toLocaleString('de-DE');let report=null,running=false;
 async function load(){
  if(running||!form.reportValidity())return;running=true;form.querySelector('button').disabled=true;exportButton.disabled=true;status.textContent='Verbrauch wird geladen …';
  report=null;area.querySelector('.usage-totals').replaceChildren();area.querySelector('.usage-users').replaceChildren();
  try{
   const response=await authenticatedFetch('/api/admin/usage?'+new URLSearchParams({from:form.elements.from.value,to:form.elements.to.value}));
   const data=await response.json();if(!response.ok)throw Error(data.error||'Verbrauch konnte nicht geladen werden.');report=data;
   const totals=area.querySelector('.usage-totals');
   for(const [label,value] of [['Konten',data.users.length],['Bestätigte Tokens',data.totals.total_tokens],['Offen / unvollständig',data.totals.unresolved]]){
    const tile=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=number(value);small.textContent=label;tile.append(strong,small);totals.append(tile);
   }
   const users=area.querySelector('.usage-users');
   for(const user of data.users){
    const item=document.createElement('details'),summary=document.createElement('summary');summary.textContent=`${user.email||user.user_id} · ${number(user.total_tokens)} Tokens`;item.append(summary);
    const info=document.createElement('p');info.textContent=`Eingabe: ${number(user.input_tokens)} · Ausgabe: ${number(user.output_tokens)} · davon Cache: ${number(user.cached_tokens)} · offene Messungen: ${number(user.unresolved)}`;item.append(info);
    for(const row of data.breakdown.filter(r=>r.user_id===user.user_id)){
     const line=document.createElement('p');line.className='usage-detail';line.textContent=`${row.day} · ${row.feature} · ${row.model}: ${number(row.total_tokens)} Tokens${row.unresolved?` · ${row.unresolved} offen`:''}`;item.append(line);
    }users.append(item);
   }
   status.textContent=data.totals.unresolved?'Einige Messungen sind noch offen oder unvollständig. Die Tokenzahlen sind deshalb nur der bestätigte Mindestverbrauch.':'Alle erfassten Aufrufe im Zeitraum sind abgeschlossen. Sitzungen können während eines Gesprächs noch offen sein.';
   exportButton.disabled=false;
  }catch(error){status.textContent=error.message;}
  finally{running=false;form.querySelector('button').disabled=false;}
 }
 form.onsubmit=event=>{event.preventDefault();load();};
 area.addEventListener('toggle',()=>{if(area.open&&!report)load();});
 exportButton.onclick=()=>{
  if(!report)return;const href=URL.createObjectURL(new Blob([usageCSV(report.breakdown)],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=href;link.download=`StoryCards-Verbrauch-${form.elements.from.value}-${form.elements.to.value}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
 };
}
