const MARKER='storycards-password-recovery';
export function passwordRecoveryError(error={}) {
 if(error.code==='same_password')return 'Bitte wähle ein anderes Passwort als dein bisheriges.';
 if(error.code==='weak_password')return 'Bitte wähle ein stärkeres Passwort mit mindestens 10 Zeichen.';
 if(['otp_expired','session_expired','session_not_found','reauthentication_needed','reauthentication_not_valid'].includes(error.code))return 'Der Link ist nicht mehr gültig. Bitte fordere einen neuen Link an.';
 if(error.status===429)return 'Zu viele Versuche. Bitte warte etwas und versuche es erneut.';
 return 'Das Speichern hat nicht geklappt. Prüfe deine Verbindung und versuche es erneut.';
}
// Read before the SDK consumes the fragment. Never persist the link or its tokens.
export function capturePasswordRecovery({location=globalThis.location,history=globalThis.history,storage=globalThis.sessionStorage,now=Date.now}={}) {
 const hash=new URLSearchParams((location?.hash||'').replace(/^#/,''));
 let requested=hash.get('type')==='recovery',userId=null;
 const invalid=Boolean(hash.get('error')),token=requested?hash.get('access_token'):null;
 let marker;try{marker=JSON.parse(storage?.getItem(MARKER)||'null');}catch{}
 const remember=session=>{if(!session?.user?.id)return;userId=session.user.id;marker={userId,until:now()+30*60000};try{storage?.setItem(MARKER,JSON.stringify(marker));}catch{}};
 const allowed=session=>!invalid&&Boolean(session?.user?.id&&(session.user.id===userId||token&&session.access_token===token||marker?.userId===session.user.id&&marker.until>now()));
 return {
  observe(event,session){if(event==='PASSWORD_RECOVERY'){requested=true;remember(session);}},
  active:session=>requested||invalid||Boolean(marker?.until>now()&&marker.userId===session?.user?.id),
  allowed,remember,
  clear(){marker=null;userId=null;try{storage?.removeItem(MARKER);}catch{}},
  cleanUrl(){if(requested||invalid)history?.replaceState(null,'',`${location.pathname||'/'}${location.search||''}`);}
 };
}
export function showPasswordRecovery({client,session,context,redirectTo}) {
 const area=document.createElement('section');area.className='account-gate password-recovery-screen';
 area.innerHTML=`<p>StoryCards Voice</p><h1>Neues Passwort setzen</h1><p class="recovery-intro"></p>
 <form class="recovery-password"><label>Neues Passwort<input name="password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required></label><label>Passwort wiederholen<input name="repeat" type="password" autocomplete="new-password" minlength="10" maxlength="128" required></label><p>Mindestens 10 Zeichen. Dein Lernstand bleibt erhalten.</p><button class="primary" type="submit">Neues Passwort speichern</button></form>
 <form class="recovery-request" hidden><label>Deine E-Mail-Adresse<input name="email" type="email" autocomplete="email" maxlength="254" required></label><button class="primary" type="submit">Neuen Link anfordern</button></form>
 <p class="recovery-status" role="status" aria-live="polite"></p><button class="ghost recovery-back" type="button">Zur Anmeldung</button>`;
 const form=area.querySelector('.recovery-password'),request=area.querySelector('.recovery-request'),status=area.querySelector('.recovery-status'),back=area.querySelector('.recovery-back');
 let pending=false,done=false,resolve;
 const finished=new Promise(r=>resolve=r);
 function invalid(){form.hidden=true;request.hidden=false;status.textContent='Der Link ist abgelaufen oder ungültig. Fordere bitte einen neuen an.';}
 const valid=context.allowed(session);
 area.querySelector('.recovery-intro').textContent=valid?`Lege dein neues Passwort für ${session.user.email||'dein Konto'} fest.`:'Hier kannst du einen neuen Passwort-Link anfordern.';
 if(valid)context.remember(session);else invalid();
 context.cleanUrl();document.body.append(area);
 async function action(work){if(pending)return;pending=true;area.querySelectorAll('button,input').forEach(el=>el.disabled=true);try{await work();}catch(error){status.textContent=passwordRecoveryError(error);}finally{pending=false;area.querySelectorAll('button,input').forEach(el=>el.disabled=false);}}
 form.elements.repeat.oninput=()=>form.elements.repeat.setCustomValidity('');
 form.onsubmit=event=>{
  event.preventDefault();if(pending)return;
  form.elements.repeat.setCustomValidity(form.elements.password.value===form.elements.repeat.value?'':'Die Passwörter stimmen noch nicht überein.');
  if(!form.reportValidity())return;
  action(async()=>{
   const fresh=await client.auth.getSession();if(fresh.error)throw fresh.error;
   if(!context.allowed(fresh.data.session)||fresh.data.session?.user?.id!==session?.user?.id){invalid();return;}
   const {error}=await client.auth.updateUser({password:form.elements.password.value});
   if(error){if(['otp_expired','session_expired','session_not_found'].includes(error.code))invalid();throw error;}
   form.reset();form.hidden=true;request.hidden=true;done=true;
   status.textContent='Dein Passwort wurde geändert. Melde dich jetzt mit deinem neuen Passwort an.';back.textContent='Jetzt anmelden';
  });
 };
 request.onsubmit=event=>{event.preventDefault();if(pending||!request.reportValidity())return;action(async()=>{
  const {error}=await client.auth.resetPasswordForEmail(request.elements.email.value.trim(),{redirectTo});if(error)throw error;
  status.textContent='Falls ein Konto existiert, erhältst du einen neuen Link per E-Mail. Öffne den neuesten Link.';
 });};
 back.onclick=()=>action(async()=>{
  // End only the session authorized by this recovery flow, never an unrelated login.
  const fresh=await client?.auth.getSession();
  if(context.allowed(fresh?.data?.session)){const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;}
  context.clear();form.reset();area.remove();resolve({changed:done});
 });
 return {area,finished};
}
