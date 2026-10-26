import {createAccountStorage,guestSnapshot,validateSnapshot} from './account-data.js';

const URL='https://tidaagozwtxphtkoavab.supabase.co';
// This is intentionally public. Database access is restricted by RLS, not this key.
const KEY='sb_publishable_17GIrUmozZ_v-eTtc3ykRQ_S5c4W0jM';
const SITE='https://storycards-voice.onrender.com';

export async function initCloudAccount(raw) {
  let client,session,errorText='',notice='',panel,conflict=null,started=false,timer,running=null,identityChanged=false;
  const recovery=location.hash.includes('type=recovery');
  try {
    client=window.supabase.createClient(URL,KEY,{
      auth:{storageKey:'storycards-auth-session',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,
        storage:{getItem:key=>raw.getItem(key)||null,setItem:(key,value)=>raw.setItem(key,value),removeItem:key=>raw.setItem(key,'')}},
      global:{fetch:(input,options={})=>fetch(input,{...options,signal:options.signal || AbortSignal.timeout(15000)})}
    });
    const result=await client.auth.getSession();
    if(result.error) throw result.error;
    session=result.data.session;
  } catch(error) { errorText='Anmeldung derzeit nicht erreichbar. Deine lokalen Karten bleiben verfügbar.'; }
  const owner=session?.user?.id || null;
  if(client) client.auth.onAuthStateChange((_event,current)=>{
    if(started && (current?.user?.id || null)!==owner) {
      identityChanged=true;clearTimeout(timer);location.reload();
    }
  });
  const metaKey=owner ? `storycards-sync:${owner}` : null;
  let meta={version:0,dirty:false};
  if(metaKey) { try {meta={...meta,...JSON.parse(raw.getItem(metaKey)||'{}')};} catch {} }
  const saveMeta=()=>{if(metaKey) raw.setItem(metaKey,JSON.stringify(meta));};
  function changed() {
    if(!owner) return;
    meta.dirty=true;saveMeta();
    notice='Änderungen auf diesem Gerät gespeichert. Sicherung steht aus.';update();
    if(started) {clearTimeout(timer);timer=setTimeout(()=>sync().catch(()=>{}),1800);}
  }
  const storage=createAccountStorage(raw,owner,changed);
  const message=error=>{
    if(error?.message?.includes('sync_conflict') || error?.code==='40001') return 'Auf einem anderen Gerät gibt es einen anderen Lernstand. Bitte wähle unten, welchen du verwenden möchtest.';
    if(['42P01','PGRST202','PGRST205'].includes(error?.code)) return 'Die Datenbank ist noch nicht eingerichtet. Deine Daten bleiben lokal gespeichert.';
    if(error?.status===429 || error?.code==='over_email_send_rate_limit') return 'Zu viele Anfragen. Bitte warte etwas und versuche es erneut.';
    if(error?.code==='invalid_credentials') return 'E-Mail-Adresse oder Passwort stimmt nicht.';
    if(error?.code==='email_not_confirmed') return 'Bitte bestätige zuerst deine E-Mail-Adresse.';
    if(error?.code==='weak_password') return 'Bitte wähle ein stärkeres Passwort mit mindestens 10 Zeichen.';
    if(error?.code==='otp_expired') return 'Der Link ist abgelaufen. Bitte fordere einen neuen an.';
    return 'Das hat gerade nicht geklappt. Prüfe die Verbindung und versuche es erneut. Deine lokalen Daten bleiben erhalten.';
  };
  async function cloud() {
    if(identityChanged) throw new Error('Account changed');
    const {data,error}=await client.from('learning_snapshots').select('payload,version,updated_at').eq('user_id',owner).maybeSingle();
    if(error) throw error;
    if(data) validateSnapshot(data.payload);
    return data;
  }
  async function upload() {
    if(identityChanged) throw new Error('Account changed');
    const payload=storage.snapshot(), serial=JSON.stringify(payload);
    const {data,error}=await client.rpc('save_learning_snapshot',{expected_version:meta.version,new_payload:payload});
    if(error) {
      if(error.code==='40001' || error.message?.includes('sync_conflict')) conflict=await cloud();
      throw error;
    }
    meta.version=Number(data.version);
    meta.dirty=serial!==JSON.stringify(storage.snapshot());
    meta.lastSync=data.updated_at;saveMeta();
    notice=meta.dirty?'Weitere Änderungen werden gesichert.':'Lerndaten sind online gesichert.';
  }
  async function initialSync() {
    const remote=await cloud();
    const version=Number(remote?.version||0);
    if(meta.dirty) {
      if(version!==meta.version) {conflict=remote || {payload:{},version:0};throw new Error('sync_conflict');}
      await upload();
    } else {
      if(remote) storage.replace(remote.payload);
      meta.version=version;meta.lastSync=remote?.updated_at;saveMeta();
      notice=remote?'Dein gespeicherter Lernstand wurde geladen.':'Dein Konto ist bereit. Noch keine Lerndaten online gespeichert.';
    }
  }
  if(owner) {try {await initialSync();} catch(error) {errorText=message(error);} }

  async function sync() {
    if(!owner || !client || conflict) return;
    if(running) return running;
    running=(async()=>{
      errorText='';notice='Lerndaten werden abgeglichen …';update();
      try {
        if(meta.dirty) await upload();
        else {
          const remote=await cloud();
          if(Number(remote?.version||0)!==meta.version) {
            conflict=remote || {payload:{},version:0};
            notice='Ein anderes Gerät hat einen neueren Stand. Lade ihn unten ausdrücklich, bevor du weiterlernst.';
          } else notice=meta.lastSync?'Lerndaten sind online gesichert.':'Noch keine Lerndaten online gespeichert.';
        }
      } catch(error) {errorText=message(error);}
      finally {running=null;update();}
    })();
    await running;
    // A save made during an in-flight request must not be lost.
    if(meta.dirty && !errorText && !conflict) {clearTimeout(timer);timer=setTimeout(()=>sync().catch(()=>{}),1800);}
  }
  function update() {
    if(!panel) return;
    panel.querySelector('.cloud-status').textContent=errorText || notice || 'Ohne Konto bleiben deine Daten auf diesem Gerät.';
    panel.querySelector('.cloud-conflict').classList.toggle('hidden',!conflict);
    const syncButton=panel.querySelector('[data-action=sync]');
    if(syncButton) syncButton.disabled=Boolean(running);
  }
  function mount(profile,isBusy=()=>false) {
    panel=document.createElement('section');panel.className='profile-card cloud-account';
    panel.innerHTML=`<h3>Dein Konto & Datensicherung</h3>
      <p class="cloud-identity"></p>
      <div class="cloud-guest"><p>Mit einem Konto kannst du deine Karten und deinen Lernstand auf einem anderen Gerät wiederfinden. Dein Passwort wird von Supabase verwaltet.</p>
      <form class="cloud-auth"><label>E-Mail<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
      <label>Passwort<input name="password" type="password" autocomplete="current-password" minlength="10" maxlength="128" required></label>
      <button class="primary" type="submit">Anmelden</button><button class="secondary" type="button" data-action="signup">Konto erstellen</button>
      <button class="ghost" type="button" data-action="reset">Passwort vergessen?</button></form></div>
      <div class="cloud-member hidden"><button class="primary" type="button" data-action="sync">Jetzt synchronisieren</button>
      <button class="secondary" type="button" data-action="import">Bisherige lokale Lerndaten übernehmen</button>
      <p class="cloud-import-help">Die Daten ohne Anmeldung bleiben erhalten. Eine Übernahme ist nur in einen noch leeren Lernstand möglich.</p>
      <button class="ghost" type="button" data-action="export">Sicherung herunterladen</button><button class="ghost" type="button" data-action="logout">Abmelden</button></div>
      <form class="cloud-recovery hidden"><label>Neues Passwort<input name="newPassword" type="password" minlength="10" maxlength="128" autocomplete="new-password" required></label><button type="submit" class="primary">Neues Passwort speichern</button></form>
      <p class="cloud-status" role="status" aria-live="polite"></p>
      <div class="cloud-conflict hidden"><strong>Unterschiedliche Lernstände</strong><p>Es wird nichts automatisch überschrieben. Lade zuerst eine Sicherung herunter.</p>
      <button class="secondary" type="button" data-action="remote">Online-Stand laden</button><button class="secondary" type="button" data-action="local">Diesen Gerätestand online übernehmen</button></div>`;
    profile.insertBefore(panel,profile.querySelector('.profile-card'));
    panel.querySelector('.cloud-identity').textContent=owner ? `Angemeldet: ${session.user.email || 'Dein Konto'}` : 'Du nutzt die App ohne Anmeldung.';
    panel.querySelector('.cloud-guest').classList.toggle('hidden',Boolean(owner));
    panel.querySelector('.cloud-member').classList.toggle('hidden',!owner);
    panel.querySelector('.cloud-recovery').classList.toggle('hidden',!recovery);
    const form=panel.querySelector('.cloud-auth');
    const busy=()=>{if(isBusy()) {const error=new Error();error.userMessage='Bitte beende zuerst das laufende Gespräch oder die Aufnahme.';throw error;}};
    async function action(work) {
      const buttons=[...panel.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
      errorText='';notice='Bitte warten …';update();
      try {await work();} catch(error) {errorText=error.userMessage || message(error);}
      finally {buttons.forEach(b=>b.disabled=false);update();}
    }
    function credentials(needsPassword=true) {
      if(!form.elements.email.reportValidity() || (needsPassword && !form.elements.password.reportValidity())) return null;
      return {email:form.elements.email.value.trim(),password:form.elements.password.value};
    }
    form.onsubmit=event=>{
      event.preventDefault();const values=credentials();if(!values) return;
      action(async()=>{busy();const {error}=await client.auth.signInWithPassword(values);if(error) throw error;form.reset();location.reload();});
    };
    panel.querySelector('[data-action=signup]').onclick=()=>{
      const values=credentials();if(!values) return;
      action(async()=>{busy();const {data,error}=await client.auth.signUp({...values,options:{emailRedirectTo:SITE}});if(error) throw error;form.elements.password.value='';if(data.session) location.reload();else notice='Bitte bestätige deine E-Mail über den Link in deinem Postfach. Melde dich anschließend hier an.';});
    };
    panel.querySelector('[data-action=reset]').onclick=()=>{
      const values=credentials(false);if(!values) return;
      action(async()=>{const {error}=await client.auth.resetPasswordForEmail(values.email,{redirectTo:SITE});if(error) throw error;notice='Falls ein Konto existiert, erhältst du eine E-Mail zum Zurücksetzen. Öffne den Link im Browser.';});
    };
    panel.querySelector('.cloud-recovery').onsubmit=event=>{
      event.preventDefault();const recoveryForm=event.currentTarget;if(!recoveryForm.reportValidity()) return;
      action(async()=>{const {error}=await client.auth.updateUser({password:recoveryForm.elements.newPassword.value});if(error) throw error;recoveryForm.reset();recoveryForm.classList.add('hidden');notice='Dein Passwort wurde geändert.';});
    };
    panel.querySelector('[data-action=sync]').onclick=()=>sync();
    panel.querySelector('[data-action=logout]').onclick=()=>action(async()=>{
      busy();if(meta.dirty && !confirm('Es gibt noch nicht gesicherte Änderungen. Sie bleiben auf diesem Gerät beim Konto gespeichert. Trotzdem abmelden?')) return;
      const {error}=await client.auth.signOut({scope:'local'});if(error) throw error;location.reload();
    });
    panel.querySelector('[data-action=import]').onclick=()=>action(async()=>{
      busy();const current=storage.snapshot();
      const meaningful=Object.entries(current).some(([key,value])=>key.endsWith(':cards')?JSON.parse(value).length>0:key.endsWith(':stats')?Number(JSON.parse(value).conversations)>0:false);
      if(meaningful) {notice='Dein Konto enthält bereits Lerndaten. Sie werden nicht überschrieben. Die bisherigen lokalen Daten bleiben ohne Anmeldung verfügbar.';return;}
      if(!confirm('Möchtest du die bisherigen lokalen Karten, Lernstände und Einstellungen in dieses Konto kopieren?')) return;
      const data=guestSnapshot(raw);storage.replace(data);changed();await sync();location.reload();
    });
    panel.querySelector('[data-action=export]').onclick=()=>{
      const blob=new Blob([JSON.stringify({format:'storycards-backup-v1',createdAt:new Date().toISOString(),data:storage.snapshot()},null,2)],{type:'application/json'});
      const href=window.URL.createObjectURL(blob),link=document.createElement('a');link.href=href;link.download='StoryCards-Sicherung.json';link.click();setTimeout(()=>window.URL.revokeObjectURL(href),1000);
    };
    panel.querySelector('[data-action=remote]').onclick=()=>action(async()=>{
      busy();if(!confirm('Online-Stand laden? Dein aktueller Gerätestand wird vorsichtshalber separat auf diesem Gerät gesichert.')) return;
      const remote=await cloud();raw.setItem(`storycards-conflict-backup:${owner}:${Date.now()}`,JSON.stringify(storage.snapshot()));
      storage.replace(remote?.payload||{});meta={version:Number(remote?.version||0),dirty:false,lastSync:remote?.updated_at};saveMeta();location.reload();
    });
    panel.querySelector('[data-action=local]').onclick=()=>action(async()=>{
      busy();if(!confirm('Diesen Gerätestand online übernehmen? Der bisherige Online-Stand wird zuerst lokal als Sicherheitskopie gespeichert.')) return;
      const remote=await cloud();raw.setItem(`storycards-conflict-online:${owner}:${Date.now()}`,JSON.stringify(remote?.payload||{}));
      meta.version=Number(remote?.version||0);meta.dirty=true;saveMeta();conflict=null;await sync();
    });
    if(recovery) {profile.classList.remove('hidden'); document.getElementById('home').classList.add('hidden');}
    update();started=true;
    if(owner) {
      window.addEventListener('online',()=>sync().catch(()=>{}));
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync().catch(()=>{});});
      if(meta.dirty && !conflict) timer=setTimeout(()=>sync().catch(()=>{}),1800);
      setInterval(()=>{if(document.visibilityState==='visible')sync().catch(()=>{});},60000);
    }
  }
  return {storage,mount,user:session?.user||null,sync};
}
