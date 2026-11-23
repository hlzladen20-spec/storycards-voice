import {setupLearningPlan} from './learning-plan.js';
export function revealProfileTarget(target){
 const ancestors=[];
 for(let current=target;current;current=current.parentElement){
  if(current.tagName==='DETAILS')ancestors.unshift(current);
  if(current.classList?.contains('profile-subpage'))current.dispatchEvent(new Event('storycards-open-profile-page'));
 }
 for(const area of ancestors)area.open=true;
}
export function setupProfileLayout({profile,getPlan,getConfiguration=()=>null,getData=()=>({}),onPlanSave=async()=>{},sentencePractice=true,exactVocabularyTarget=false}){
 if(profile.querySelector('.profile-overview'))return;
 const nav=profile.querySelector('.profile-nav');profile.classList.add('profile-organized');
 profile.querySelector('h2').textContent='Dein Profil';
 const overview=document.createElement('section');overview.className='profile-overview';
 overview.innerHTML='<p class="profile-kicker">DEIN LERNPLAN</p><h3>Kleine Schritte. Dein Tempo.</h3><div class="profile-plan-grid"><div><strong data-plan="minutes"></strong><small>Sprechen / Tag</small></div><div><strong data-plan="cards"></strong><small>Satzkarten · bis zu</small></div><div><strong data-plan="vocabulary"></strong><small>Vokabeln · bis zu</small></div></div><button type="button" class="ghost profile-edit-plan">Lernplan ändern →</button>';
 profile.insertBefore(overview,nav);
 if(!sentencePractice)overview.querySelector('[data-plan=cards]').parentElement.hidden=true;
 if(exactVocabularyTarget)overview.querySelector('[data-plan=vocabulary]').parentElement.querySelector('small').textContent='Vokabeln / Tag';
 const menu=document.createElement('nav');menu.className='profile-root-menu';menu.setAttribute('aria-label','Profileinstellungen');profile.insertBefore(menu,nav);
 const find=selector=>profile.querySelector(selector),pages=[];let lastEntry=null;
 function open(page){
  for(const item of pages)item.hidden=item!==page;
  profile.classList.toggle('profile-has-subpage',Boolean(page));
  if(!page&&lastEntry&&!profile.classList.contains('hidden'))lastEntry.focus();
  if(page){const admin=page.querySelector('.admin-usage');if(admin)admin.open=true;page.querySelector('h3').focus();page.scrollIntoView({block:'start'});}
 }
 function page(id,label,hint,parts,admin=false){
  const area=document.createElement('section');area.id=id;area.className='profile-subpage';area.hidden=true;
  const top=document.createElement('div');top.className='profile-subpage-heading';
  const back=document.createElement('button');back.type='button';back.className='ghost';back.textContent='‹ Profil';back.onclick=()=>open(null);
  const heading=document.createElement('h3');heading.textContent=label;heading.tabIndex=-1;top.append(back,heading);area.append(top);
  const content=document.createElement('div');content.className='profile-page-content';for(const part of parts.filter(Boolean))content.append(part);area.append(content);profile.insertBefore(area,nav);pages.push(area);
  const entry=document.createElement('button');entry.type='button';entry.className='profile-menu-entry'+(admin?' profile-admin-entry':'');entry.setAttribute('aria-controls',id);
  const name=document.createElement('strong'),small=document.createElement('small'),arrow=document.createElement('span');name.textContent=label;small.textContent=hint;arrow.textContent='›';entry.append(name,small,arrow);entry.onclick=()=>{lastEntry=entry;open(area);};menu.append(entry);
  area.addEventListener('storycards-open-profile-page',()=>open(area));return {area,content,entry};
 }
 const legacy=document.createElement('div');legacy.hidden=true;
 for(const part of [find('#profileSpeakingSettings'),find('#profileDailySettings'),find('.vocab-settings'),find('#profileSaveArea')].filter(Boolean))legacy.append(part);
 const goals=page('profileGoalsSection','Lernplan','Tägliche Zeit und eine passende Lernportion',[legacy]);
 setupLearningPlan({host:goals.content,getConfiguration,getData,getCurrent:()=>{const p=getPlan();return {speakingMinutes:p.minutes,cardLimit:p.cards,vocabularyLimit:p.vocabulary};},onSave:onPlanSave,sentencePractice,exactVocabularyTarget});
 page('profileAssessmentSection','Sprachniveau','Dein Lernpfad von A1 bis C2',[find('#profileLearningPath')]);
 page('profilePreferencesSection','Sprache & Stimme','Lernsprache und Emma',[find('.language-settings'),find('.coach-choice')]);
 find('#profileImageSettings')?.remove();find('.developer-tools')?.remove();
 const accountPanel=find('.cloud-account'),account=page('profileAccountSection','Konto & Sicherung','Dein Konto und dein gesicherter Lernstand',[accountPanel]);
 const admin=find('.admin-usage');
 if(admin){page('profileAdminPage','Administration','Nutzer und KI-Verbrauch',[admin],true);admin.open=true;}
 for(const heading of profile.querySelectorAll(':scope > .profile-section-title'))heading.remove();
 find('.coach-choice>b')?.remove();
 overview.querySelector('.profile-edit-plan').onclick=()=>open(goals.area);
 function refresh(){const p=getPlan();overview.querySelector('[data-plan=minutes]').textContent=p.minutes+' Min.';overview.querySelector('[data-plan=cards]').textContent=String(p.cards);overview.querySelector('[data-plan=vocabulary]').textContent=String(p.vocabulary);}
 profile.addEventListener('change',refresh);profile.addEventListener('click',refresh);
 new MutationObserver(()=>{refresh();if(profile.classList.contains('hidden')&&profile.classList.contains('profile-has-subpage'))open(null);}).observe(profile,{attributes:true,attributeFilter:['class']});
 function revealAccountIssue(){if(accountPanel){const conflict=accountPanel.querySelector('.cloud-conflict');if(conflict&&!conflict.classList.contains('hidden')&&!profile.classList.contains('hidden'))open(account.area);}}
 if(accountPanel)new MutationObserver(revealAccountIssue).observe(accountPanel,{subtree:true,attributes:true,attributeFilter:['class']});
 refresh();return {refresh,open};
}
