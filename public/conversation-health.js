const harmless=new Set(['response_cancel_not_active','conversation_already_has_active_response','input_audio_buffer_commit_empty']);
export function conversationProblem(error={}){
 const code=String(error.code||'realtime_error');
 if(harmless.has(code))return null;
 if(['insufficient_quota','billing_hard_limit_reached'].includes(code))return {code:'quota',title:'Das KI-Kontingent ist ausgeschöpft',message:'Emma kann im Moment nicht weiter antworten. Bitte den Betreiber informieren. Du kannst das bisherige Gespräch auswerten lassen, sobald der KI-Zugang wieder verfügbar ist.',retryable:false};
 if(['invalid_api_key','authentication_error'].includes(code))return {code:'configuration',title:'Der Sprachdienst ist nicht verfügbar',message:'Der KI-Zugang muss vom Betreiber geprüft werden. Dein bisheriger Gesprächsverlauf bleibt in dieser Ansicht erhalten.',retryable:false};
 if(code==='rate_limit_exceeded')return {code:'rate_limit',title:'Emma braucht eine kurze Pause',message:'Der Sprachdienst ist gerade ausgelastet. Warte kurz und versuche dann erneut zu verbinden.',retryable:true};
 return {code:'response_error',title:'Emma konnte nicht antworten',message:'Bei der Sprachantwort ist ein technischer Fehler aufgetreten. Verbinde das Gespräch erneut oder beende es mit dem bisherigen Verlauf.',retryable:true};
}

// No idle alarms while the learner is thinking. Only watch a pending response,
// connection startup/loss, or an explicitly reported audio/microphone failure.
export function createConversationHealth({getState,onProblem,now=Date.now,schedule=setTimeout,cancel=clearTimeout,waitMs=25000,disconnectMs=8000}){
 let disposed=false,reported=false,pendingSince=now(),speaking=false,answered=false,disconnectedSince=null,connectionFailed=false,timer;
 function notify(problem){const state=getState();if(disposed||reported||!state.active||state.paused||state.ended)return;reported=true;cancel(timer);onProblem(problem);}
 function check(){
  if(disposed||reported)return;
  const state=getState();
  if(!state.active||state.paused||state.ended){pendingSince=null;disconnectedSince=null;}
  else if(connectionFailed||(disconnectedSince!==null&&now()-disconnectedSince>=disconnectMs))notify({code:'connection',title:'Die Verbindung zu Emma ist unterbrochen',message:'Deine Lernzeit ist pausiert. Prüfe deine Internetverbindung und verbinde das Gespräch erneut.',retryable:true});
  else if(!speaking&&!state.outputPlaying&&pendingSince!==null&&now()-pendingSince>=waitMs)notify({code:'no_response',title:'Emma antwortet gerade nicht',message:'Die Sprachantwort dauert ungewöhnlich lange. Deine Lernzeit ist pausiert. Du kannst erneut verbinden oder das bisherige Gespräch beenden.',retryable:true});
  if(!disposed&&!reported)timer=schedule(check,1000);
 }
 timer=schedule(check,1000);
 return {
  waiting(){if(!disposed&&!reported)pendingSince=now();},
  observe(event){
   if(disposed||reported)return;
   const state=getState();if(!state.active||state.paused||state.ended)return;
   if(event.type==='input_audio_buffer.speech_started'){speaking=true;answered=false;pendingSince=null;}
   if(event.type==='input_audio_buffer.speech_stopped'){speaking=false;pendingSince??=now();}
   if(event.type==='conversation.item.input_audio_transcription.completed'&&!answered&&String(event.transcript||'').trim())pendingSince??=now();
   if(event.type==='response.created'){answered=true;pendingSince=now();}
   if(['response.output_audio.delta','response.output_audio_transcript.delta','output_audio_buffer.started'].includes(event.type))pendingSince=now();
   if(event.type==='output_audio_buffer.stopped'||event.type==='output_audio_buffer.cleared')pendingSince=null;
   if(event.type==='response.done'){
    if(['failed','incomplete'].includes(event.response?.status))notify(conversationProblem(event.response?.status_details?.error)||conversationProblem());
    else if(event.response?.status==='cancelled')pendingSince=null;
    // Generation can finish before WebRTC audio plays. Only playback-stopped
    // clears the wait; otherwise a silent answer would be mistaken for success.
   }
   if(event.type==='conversation.item.input_audio_transcription.failed')notify({code:'transcription',title:'Deine Antwort konnte nicht verarbeitet werden',message:'Das ist kein Fehler deiner Aussprache. Bitte verbinde erneut und wiederhole deinen letzten Satz.',retryable:true});
   if(event.type==='error'){const problem=conversationProblem(event.error);if(problem)notify(problem);}
  },
  connection(state){
   if(disposed||reported)return;
   if(state==='connected'||state==='completed'){disconnectedSince=null;connectionFailed=false;return;}
   if(state==='disconnected')disconnectedSince??=now();
   if(state==='failed'||state==='closed'){connectionFailed=true;notify({code:'connection',title:'Die Verbindung zu Emma ist abgebrochen',message:'Dein Mikrofon und deine Lernzeit sind pausiert. Verbinde das Gespräch erneut oder beende es mit dem bisherigen Verlauf.',retryable:true});}
  },
  media(kind='audio'){notify({code:kind,title:kind==='microphone'?'Das Mikrofon ist nicht mehr verfügbar':'Emma ist gerade nicht zu hören',message:kind==='microphone'?'Prüfe die Mikrofonfreigabe oder dein Headset und verbinde erneut.':'Die Tonwiedergabe wurde blockiert oder unterbrochen. Prüfe Medienlautstärke und Headset. Tippe dann auf „Erneut verbinden“.',retryable:true});},
  offline(){notify({code:'offline',title:'Du bist gerade offline',message:'Deine Lernzeit ist pausiert. Sobald dein Internet wieder funktioniert, kannst du erneut verbinden.',retryable:true});},
  dispose(){disposed=true;cancel(timer);}
 };
}

export function mountConversationRecovery({host,onReconnect,onFinish}){
 const area=document.createElement('aside');area.className='conversation-recovery';area.hidden=true;area.setAttribute('role','alert');
 area.innerHTML='<strong class="recovery-title"></strong><p class="recovery-message"></p><small>Der bisherige Verlauf bleibt hier erhalten. Bitte die Seite nicht neu laden.</small><div><button type="button" class="primary recovery-reconnect">Erneut verbinden</button><button type="button" class="secondary recovery-finish">Gespräch beenden</button></div>';
 host.append(area);const retry=area.querySelector('.recovery-reconnect'),finish=area.querySelector('.recovery-finish');let busy=false;
 retry.onclick=async()=>{if(busy)return;busy=true;retry.disabled=true;finish.disabled=true;retry.textContent='Verbinde …';try{await onReconnect();}finally{busy=false;retry.disabled=false;finish.disabled=false;retry.textContent='Erneut verbinden';}};
 finish.onclick=()=>{if(!busy)onFinish();};
 return {show(problem,{canReconnect=true}={}){area.querySelector('.recovery-title').textContent=problem.title;area.querySelector('.recovery-message').textContent=problem.message;retry.hidden=!canReconnect||problem.retryable===false;area.hidden=false;},hide(){area.hidden=true;},area};
}
