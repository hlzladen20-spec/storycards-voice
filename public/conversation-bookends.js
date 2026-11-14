// Spoken bookends share the existing Realtime voice session. Never replay them
// on pause/resume, duplicate configuration events, or repeated timer ticks.
export function createConversationBookends({send,greetingInstructions,onReady,onClosing,onClosed,farewellInstructions,onFinalReply=()=>{},onFinalReplyEnd=()=>{},schedule=setTimeout,cancel=clearTimeout,token=crypto.randomUUID()}){
 const phases={greeting:{sent:false,done:false,id:null},farewell:{sent:false,done:false,id:null}};
 const rejected=new Set();let expected=null,closing=false,closed=false,ready=false,disposed=false,busy=false,drainTimer=null,timeoutTimer=null;
 let reply=null,replyTimer=null,speaking=false,speechId=null;
 const replyActive=()=>reply && !reply.done;
 const clearReplyTimer=()=>{cancel(replyTimer);replyTimer=null;};
 function replyState(phase){
  if(!replyActive())return;clearReplyTimer();reply.phase=phase;onFinalReply(phase);
  if(phase==='listening')replyTimer=schedule(()=>endReply(false),45000);
  if(phase==='capturing')replyTimer=schedule(()=>endReply(false),120000);
  if(phase==='transcribing')replyTimer=schedule(()=>listenAgain(),15000);
 }
 function endReply(answered){
  if(!replyActive() || disposed)return;
  clearReplyTimer();clearDrain();reply.done=true;reply.answered=answered;closing=true;expected=null;clearTimeout();
  onFinalReplyEnd({answered});settle();
 }
 function listenAgain(){if(replyActive()){reply.itemId=null;speaking=false;replyState('listening');}}
 const clearDrain=()=>{cancel(drainTimer);drainTimer=null;};
 const clearTimeout=()=>{cancel(timeoutTimer);timeoutTimer=null;};
 function fail(phase){
  if(disposed || closed)return;clearDrain();clearTimeout();const item=phases[phase];item.sent=true;item.done=true;expected=null;
  if(item.id){rejected.add(item.id);send({type:'response.cancel',response_id:item.id});}
  if(phase==='farewell'){closed=true;onClosed({failed:true});}
  else if(!closing){ready=true;onReady({failed:true});}
 }
 function request(phase){
  if(disposed || closed || phases[phase].sent)return;
  phases[phase].sent=true;clearTimeout();if(phase==='farewell')onClosing();
  let instructions=phase==='greeting'?greetingInstructions():farewellInstructions?farewellInstructions():"Speak one brief, warm English farewell as Emma. Our practice time has ended. Thank the learner for the conversation and say goodbye. For example: 'Our time is up. Thank you for our conversation today. Have a lovely day, and see you next time!' Do not ask a question, invite another answer, give a lesson, or assess their performance. Then stop.";
  if(phase==='farewell' && reply?.answered)instructions+=' The learner has now given their final answer after the time limit. FIRST respond to its actual meaning in one short, natural sentence in the learning language, THEN thank them and say goodbye in this same response. Do not correct or grade them, ask any question, introduce a new topic, or invite another answer. Then stop.';
  const sent=send({type:'response.create',event_id:`storycards-${phase}-${token}`,response:{output_modalities:['audio'],tool_choice:'none',metadata:{storycards_phase:phase,storycards_token:token},instructions}});
  if(sent===false){fail(phase);return;}
  timeoutTimer=schedule(()=>fail(phase),45000);
 }
 function settle(){
  clearDrain();if(disposed || closed || busy)return;
  if(replyActive()){
   if(reply.phase==='draining' && reply.configured)drainTimer=schedule(()=>{drainTimer=null;if(!busy && replyActive() && reply.phase==='draining')replyState('listening');},700);
   return;
  }
  if(closing && !phases.farewell.sent)drainTimer=schedule(()=>{drainTimer=null;if(!busy)request('farewell');},700);
  else if(closing && phases.farewell.done)drainTimer=schedule(()=>{drainTimer=null;if(!busy && !closed){closed=true;clearTimeout();onClosed({failed:false});}},700);
  else if(!closing && phases.greeting.done && !ready)drainTimer=schedule(()=>{drainTimer=null;if(!busy && !ready){ready=true;clearTimeout();onReady({failed:false});}},700);
 }
 return {
  get ready(){return ready;},
  get awaitingFinalReply(){return Boolean(replyActive());},
  allowFinalReply(activity){
   if(disposed || closed || closing || reply)return false;
   busy=Boolean(activity);reply={phase:'draining',configured:false,done:false,answered:false,itemId:speaking?speechId:null};clearDrain();clearTimeout();
   const sent=send({type:'session.update',event_id:`storycards-final-reply-${token}`,session:{type:'realtime',audio:{input:{turn_detection:{type:'server_vad',threshold:0.7,prefix_padding_ms:300,silence_duration_ms:1200,create_response:false,interrupt_response:false,idle_timeout_ms:null}}}}});
   if(sent===false){endReply(false);return true;}
   replyState(speaking?'capturing':'draining');
   if(!speaking)replyTimer=schedule(()=>endReply(false),15000);
   settle();return true;
  },
  skipFinalReply(){endReply(false);},
  waitForConfiguration(instructions){if(disposed || phases.greeting.sent || expected!==null)return;expected=instructions;clearTimeout();timeoutTimer=schedule(()=>fail('greeting'),30000);},
  accept(event){
   if(disposed)return false;
   const id=event.response?.id||event.response_id;
   if(event.type==='response.created'){
    const meta=event.response?.metadata,phase=meta?.storycards_token===token?meta.storycards_phase:null;
    if(replyActive() && phase!=='greeting'){if(id)rejected.add(id);send({type:'response.cancel',response_id:id});return false;}
    const allowed=closing?phase==='farewell' && phases.farewell.sent && !phases.farewell.done:ready && !meta?.storycards_phase || phase==='greeting' && phases.greeting.sent && !phases.greeting.done;
    if(!allowed){if(id)rejected.add(id);send({type:'response.cancel',response_id:id});return false;}
    if(phase && phases[phase])phases[phase].id=id;
   }
   return !id || !rejected.has(id);
  },
  observe(event,activity){
   if(disposed || closed)return;busy=Boolean(activity);
   if(event.type==='input_audio_buffer.speech_started'){
    speaking=true;speechId=event.item_id;
    if(replyActive() && reply.phase==='listening'){reply.itemId=speechId;replyState('capturing');}
   }
   if(event.type==='input_audio_buffer.speech_stopped'){
    speaking=false;
    if(replyActive() && reply.phase==='capturing' && event.item_id===reply.itemId)replyState('transcribing');
   }
   if(replyActive() && !reply.configured && event.type==='session.updated' && event.session?.audio?.input?.turn_detection?.create_response===false){
    reply.configured=true;
    if(reply.phase==='draining'){clearReplyTimer();replyTimer=schedule(()=>endReply(false),90000);}
   }
   if(replyActive() && ['capturing','transcribing'].includes(reply.phase) && reply.itemId && event.item_id===reply.itemId){
    if(event.type==='conversation.item.input_audio_transcription.completed'){
     if(String(event.transcript||'').trim())endReply(true);else listenAgain();
    }
    if(event.type==='conversation.item.input_audio_transcription.failed')listenAgain();
   }
   if(replyActive() && event.type==='error' && event.error?.event_id===`storycards-final-reply-${token}`)endReply(false);
   if(event.type==='session.updated' && !closing && !phases.greeting.sent && expected && event.session?.instructions===expected)request('greeting');
   if(event.type==='response.done')for(const [phase,item]of Object.entries(phases))if(item.id && item.id===event.response?.id){if(event.response.status && event.response.status!=='completed')fail(phase);else item.done=true;}
   if(event.type==='error')for(const phase of ['greeting','farewell'])if(event.error?.event_id===`storycards-${phase}-${token}`)fail(phase);
   settle();
  },
  close(activity){if(disposed || closed || replyActive())return;if(!closing){closing=true;expected=null;clearTimeout();}busy=Boolean(activity);settle();},
  dispose(){disposed=true;clearReplyTimer();clearDrain();clearTimeout();}
 };
}
