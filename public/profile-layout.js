// Reparent existing controls, never recreate forms or their event handlers.
export function revealProfileTarget(target){
 const ancestors=[];
 for(let current=target;current;current=current.parentElement){if(current.tagName==='DETAILS')ancestors.unshift(current);}
 for(const area of ancestors)area.open=true;
}

export function setupProfileLayout({profile,getPlan}){
 const nav=profile.querySelector('.profile-nav');
 if(profile.querySelector('.profile-overview'))return;
 profile.classList.add('profile-organized');
 const title=profile.querySelector('h2');title.textContent='Dein Profil';
 const overview=document.createElement('section');overview.className='profile-overview';overview.setAttribute('aria-label','Deine eingestellten Tagesziele');
 overview.innerHTML=`<p class="profile-kicker">DEIN LERNPLAN</p><h3>Kleine Schritte. Dein Tempo.</h3>
 <div class="profile-plan-grid"><div><strong data-plan="minutes"></strong><small>Sprechen / Tag</small></div><div><strong data-plan="cards"></strong><small>Satzkarten / Tag</small></div><div><strong data-plan="vocabulary"></strong><small>Vokabeln / Tag</small></div></div>
 <button type="button" class="ghost profile-edit-plan">Lernziele ändern <span aria-hidden="true">→</span></button>`;
 profile.insertBefore(overview,nav);
 const sections=[];
 function group(id,label,hint,path,parts){
  const area=document.createElement('details');area.id=id;area.className='profile-settings-group';area.setAttribute('name','profile-settings');
  area.innerHTML=`<summary><svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg><span><strong>${label}</strong><small>${hint}</small></span><b aria-hidden="true">⌄</b></summary>`;
  const content=document.createElement('div');content.className='profile-group-content';area.append(content);
  for(const part of parts.filter(Boolean))content.append(part);
  profile.insertBefore(area,nav);sections.push(area);return area;
 }
 const find=selector=>profile.querySelector(selector);
 const goals=group('profileGoalsSection','Lernziele','Sprechzeit und tägliche Kartenportionen','<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',[
  find('#profileSpeakingSettings'),find('#profileDailySettings'),find('.vocab-settings'),find('#profileSaveArea')
 ]);
 group('profileAssessmentSection','Dein Sprachlevel','Deine Einschätzung aus Gesprächen mit Emma','<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 12l2 2 4-4M9 18h6"/>',[
  find('#profileLearningPath')
 ]);
 group('profileCardsSection','Karten verwalten','Satzkarten und Vokabeln an einem Ort','<rect x="7" y="3" width="13" height="17" rx="2"/><path d="M4 7H3v14h13v-1M11 7h5M11 11h5"/>',[
  find('.card-manager'),find('.vocab-management')
 ]);
 group('profilePreferencesSection','Sprache & Lernhilfen','Lernsprache, Emma und Merkbilder','<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z"/>',[
  find('.language-settings'),find('.coach-choice'),find('#profileImageSettings')
 ]);
 const accountPanel=find('.cloud-account');
 const account=group('profileAccountSection','Konto & Sicherung','Anmelden, synchronisieren und Daten sichern','<path d="M7 18H6a4 4 0 0 1-1-8 7 7 0 0 1 13-2 5 5 0 0 1 0 10h-1M12 12v9m-3-3 3 3 3-3"/>',[accountPanel]);
 find('.developer-tools')?.remove();
 const admin=find('.admin-usage');
 if(admin){profile.insertBefore(admin,nav);sections.push(admin);}
 // Old loose headings are replaced by the labelled groups; voice controls keep their handlers.
 for(const heading of profile.querySelectorAll(':scope > .profile-section-title'))heading.remove();
 find('.coach-choice>b')?.remove();
 for(const area of sections)area.addEventListener('toggle',()=>{
  if(area.open)for(const other of sections)if(other!==area)other.open=false;
 });
 overview.querySelector('.profile-edit-plan').onclick=()=>{goals.open=true;goals.scrollIntoView({block:'start',behavior:'smooth'});};
 function refresh(){
  const plan=getPlan();
  overview.querySelector('[data-plan=minutes]').textContent=`${plan.minutes} Min.`;
  overview.querySelector('[data-plan=cards]').textContent=String(plan.cards);
  overview.querySelector('[data-plan=vocabulary]').textContent=String(plan.vocabulary);
 }
 profile.addEventListener('change',refresh);profile.addEventListener('click',refresh);
 document.addEventListener('storycards-vocabulary-changed',refresh);
 document.addEventListener('storycards-cards-updated',refresh);
 new MutationObserver(refresh).observe(profile,{attributes:true,attributeFilter:['class']});
 function revealAccountIssue(){
  if(accountPanel && ['.cloud-recovery','.cloud-conflict'].some(selector=>{const item=accountPanel.querySelector(selector);return item && !item.classList.contains('hidden');}))account.open=true;
 }
 if(accountPanel)new MutationObserver(revealAccountIssue).observe(accountPanel,{subtree:true,attributes:true,attributeFilter:['class']});
 refresh();revealAccountIssue();return {refresh};
}
