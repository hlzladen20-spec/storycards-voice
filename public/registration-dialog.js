import {cleanLearnerName} from './learner-name.js';
let activeRegistration=null;

// Opening this window never signs up. Only a validated, explicit submit does.
export function openRegistrationDialog({email='',onSubmit,onReturn=()=>{}}){
 if(activeRegistration)return activeRegistration;
 if(document.querySelector('dialog[open], .app-dialog-overlay'))return null;
 const previous=document.activeElement,overlay=document.createElement('div'),dialog=document.createElement('dialog');
 overlay.className='app-dialog-overlay';dialog.className='app-dialog registration-dialog';
 dialog.setAttribute('aria-labelledby','registration-title');dialog.setAttribute('aria-describedby','registration-description');dialog.setAttribute('aria-modal','true');
 dialog.innerHTML=`<p class="registration-kicker">STORYCARDS VOICE</p><h2 id="registration-title">Dein neues Konto</h2>
 <p id="registration-description">Schön, dass du dabei bist. Erstelle dein Konto und bestätige danach deine E-Mail-Adresse. Dein bisheriger Lernstand bleibt erhalten.</p>
 <form class="registration-form"><label>Dein Vorname<input name="firstName" autocomplete="given-name" maxlength="60" required></label><label>E-Mail-Adresse<input name="email" type="email" autocomplete="email" maxlength="254" required></label>
 <label>Neues Passwort<input name="password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required aria-describedby="registration-password-help"></label>
 <small id="registration-password-help">Mindestens 10 Zeichen. Verwende ein eigenes Passwort für StoryCards Voice.</small>
 <label>Passwort wiederholen<input name="repeatPassword" type="password" autocomplete="new-password" minlength="10" maxlength="128" required></label>
 <button class="primary" type="submit">Konto anlegen & Bestätigungsmail erhalten</button></form>
 <section class="registration-success" hidden><span aria-hidden="true">✓</span><p>Wir haben eine Bestätigungsmail an <strong class="registration-email"></strong> angefordert.</p><p>Öffne den Link in deinem Postfach. Prüfe auch den Spamordner. Danach kannst du dich hier anmelden.</p></section>
 <p class="registration-status" role="status" aria-live="polite"></p><button class="ghost registration-back" type="button">← Zurück zur Anmeldung</button>`;
 overlay.append(dialog);document.body.append(overlay);
 const form=dialog.querySelector('form'),fields=form.elements,title=dialog.querySelector('h2'),description=dialog.querySelector('#registration-description'),back=dialog.querySelector('.registration-back'),status=dialog.querySelector('.registration-status');
 fields.email.value=String(email).trim();let pending=false,closed=false,registeredEmail='';
 const roots=[document.querySelector('main.app'),document.querySelector('.account-gate')].filter(Boolean).map(element=>({element,inert:element.inert}));
 function close(){
  if(pending||closed)return;closed=true;activeRegistration=null;
  form.reset();if(dialog.open&&typeof dialog.close==='function')dialog.close();overlay.remove();
  for(const root of roots)root.element.inert=root.inert;
  if(registeredEmail)onReturn(registeredEmail);
  if(previous?.isConnected)previous.focus();
 }
 const instance={close,dialog};activeRegistration=instance;
 back.onclick=close;
 fields.password.oninput=fields.repeatPassword.oninput=()=>fields.repeatPassword.setCustomValidity('');
 fields.firstName.oninput=()=>fields.firstName.setCustomValidity('');
 form.onsubmit=async event=>{
  event.preventDefault();if(pending||closed||registeredEmail)return;
  fields.repeatPassword.setCustomValidity(fields.password.value===fields.repeatPassword.value?'':'Die Passwörter stimmen noch nicht überein.');
  fields.firstName.setCustomValidity(cleanLearnerName(fields.firstName.value)?'':'Bitte gib deinen Vornamen ein.');
  if(!form.reportValidity())return;
  const values={email:fields.email.value.trim(),password:fields.password.value,firstName:cleanLearnerName(fields.firstName.value)};
  pending=true;for(const field of [...form.querySelectorAll('input,button'),back])field.disabled=true;
  status.textContent='Dein Konto wird angelegt …';
  try{
   const result=await onSubmit(values);
   if(result?.signedIn){pending=false;close();return;}
   registeredEmail=values.email;form.reset();form.hidden=true;description.hidden=true;
   title.textContent='Prüfe jetzt dein Postfach';dialog.querySelector('.registration-email').textContent=values.email;
   dialog.querySelector('.registration-success').hidden=false;status.textContent='Nach der E-Mail-Bestätigung kannst du dich anmelden.';back.textContent='Zur Anmeldung';
  }catch(error){status.textContent=error?.userMessage||'Dein Konto konnte gerade nicht erstellt werden. Bitte versuche es erneut.';}
  finally{pending=false;for(const field of [...form.querySelectorAll('input,button'),back])field.disabled=false;if(registeredEmail)back.focus();}
 };
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('close',close);
 overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
 dialog.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();close();return;}
  if(event.key!=='Tab')return;
  const first=form.hidden?back:fields.firstName,last=back;
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 });
 try{
  for(const root of roots)root.element.inert=true;
  if(typeof dialog.showModal==='function')dialog.showModal();
  else{overlay.classList.add('app-dialog-fallback');dialog.setAttribute('open','');dialog.setAttribute('role','dialog');}
  fields.firstName.focus();
 }catch{close();}
 return instance;
}
