import {authenticatedFetch,setAccessTokenProvider} from './authenticated-fetch.js';
import {guestSnapshot,hasLearningProgress} from './account-data.js';
import {confirmDialog} from './app-dialog.js';

export async function requireAccount(account,raw){
 setAccessTokenProvider(account.accessToken);
 let identity=null,message='';
 if(account.user){try{const response=await authenticatedFetch('/api/account');if(!response.ok)throw Error();identity=await response.json();}catch{message='Deine Anmeldung konnte gerade nicht bestätigt werden. Bitte erneut versuchen. Deine Lerndaten bleiben erhalten.';}}
 if(!identity){
  const gate=document.createElement('section');gate.className='account-gate';gate.setAttribute('aria-label','Bei StoryCards Voice anmelden');
  gate.innerHTML='<img src="/icon-192.png" alt=""><h1>Willkommen bei<br>StoryCards Voice</h1><p>Melde dich an. Dein bisheriger Lernstand bleibt erhalten.</p><p class="account-privacy">Für den Testbetrieb erfassen wir den KI- und Tokenverbrauch je Konto. Diese Verbrauchserfassung enthält keine Gesprächsinhalte.</p><p class="account-gate-message" role="status"></p><button type="button" class="secondary gate-retry">Erneut versuchen</button>';
  gate.querySelector('.account-gate-message').textContent=message;
  gate.querySelector('.gate-retry').onclick=()=>location.reload();
  gate.querySelector('.gate-retry').hidden=!message;
  document.body.append(gate);account.mount(gate);
  // Keep all app initialization and learning side effects behind the gate.
  await new Promise(()=>{});
 }
 const guest=guestSnapshot(raw);
 if(hasLearningProgress(guest)&&!raw.getItem(`storycards-import-choice:${account.user.id}`)){
  const empty=!hasLearningProgress(account.storage.snapshot());
  const accepted=await confirmDialog({title:'Deinen bisherigen Lernstand übernehmen?',message:empty?'Auf diesem Gerät liegen schon Karten oder Lernfortschritte ohne Konto. Möchtest du sie in dein angemeldetes Konto kopieren?':'Dein Konto und dieses Gerät enthalten bereits Lernstände. Es wird nichts automatisch überschrieben. Du kannst die lokalen Daten im Profil sichern.',note:'Die ursprünglichen lokalen Daten bleiben in jedem Fall erhalten.',confirmText:empty?'Lernstand übernehmen':'Verstanden',cancelText:empty?'Später':'Schließen'});
  if(empty&&accepted){account.importGuest();await account.sync();}
  if(accepted)raw.setItem(`storycards-import-choice:${account.user.id}`,'seen');
 }
 document.body.classList.remove('account-locked');
 document.addEventListener('storycards-login-required',()=>{document.body.classList.add('account-locked');location.reload();});
 return identity;
}
