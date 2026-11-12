// Spoken bookends share the existing Realtime voice session. Never replay them
// on pause/resume, duplicate configuration events, or repeated timer ticks.
export function createConversationBookends({send,greetingInstructions,onReady,onClosing,onClosed,farewellInstructions,schedule=setTimeout,cancel=clearTimeout,token=crypto.randomUUID()}){
 const phases={greeting:{sent:false,done:false,id:null},farewell:{sent:false,done:false,id:null}};
 const rejected=new Set();let expected=null,closing=false,closed=false,ready=false,disposed=false,busy=false,drainTimer=null,timeoutTimer=null;
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
  const instructions=phase==='greeting'?greetingInstructions():farewellInstructions?farewellInstructions():"Speak one brief, warm English farewell as Emma. Our practice time has ended. Thank the learner for the conversation and say goodbye. For example: 'Our time is up. Thank you for our conversation today. Have a lovely day, and see you next time!' Do not ask a question, invite another answer, give a lesson, or assess their performance. Then stop.";
  const sent=send({type:'response.create',event_id:`storycards-${phase}-${token}`,response:{output_modalities:['audio'],metadata:{storycards_phase:phase,storycards_token:token},instructions}});
  if(sent===false){fail(phase);return;}
  timeoutTimer=schedule(()=>fail(phase),45000);
 }
 function settle(){
  clearDrain();if(disposed || closed || busy)return;
  if(closing && !phases.farewell.sent)drainTimer=schedule(()=>{drainTimer=null;if(!busy)request('farewell');},700);
  else if(closing && phases.farewell.done)drainTimer=schedule(()=>{drainTimer=null;if(!busy && !closed){closed=true;clearTimeout();onClosed({failed:false});}},700);
  else if(!closing && phases.greeting.done && !ready)drainTimer=schedule(()=>{drainTimer=null;if(!busy && !ready){ready=true;clearTimeout();onReady({failed:false});}},700);
 }
 return {
  get ready(){return ready;},
  waitForConfiguration(instructions){if(disposed || phases.greeting.sent || expected!==null)return;expected=instructions;clearTimeout();timeoutTimer=schedule(()=>fail('greeting'),30000);},
  accept(event){
   if(disposed)return false;
   const id=event.response?.id||event.response_id;
   if(event.type==='response.created'){
    const meta=event.response?.metadata,phase=meta?.storycards_token===token?meta.storycards_phase:null;
    const allowed=closing?phase==='farewell' && phases.farewell.sent && !phases.farewell.done:ready && !meta?.storycards_phase || phase==='greeting' && phases.greeting.sent && !phases.greeting.done;
    if(!allowed){if(id)rejected.add(id);send({type:'response.cancel',response_id:id});return false;}
    if(phase && phases[phase])phases[phase].id=id;
   }
   return !id || !rejected.has(id);
  },
  observe(event,activity){
   if(disposed || closed)return;busy=Boolean(activity);
   if(event.type==='session.updated' && !closing && !phases.greeting.sent && expected && event.session?.instructions===expected)request('greeting');
   if(event.type==='response.done')for(const [phase,item]of Object.entries(phases))if(item.id && item.id===event.response?.id){if(event.response.status && event.response.status!=='completed')fail(phase);else item.done=true;}
   if(event.type==='error')for(const phase of ['greeting','farewell'])if(event.error?.event_id===`storycards-${phase}-${token}`)fail(phase);
   settle();
  },
  close(activity){if(disposed || closed)return;if(!closing){closing=true;expected=null;clearTimeout();}busy=Boolean(activity);settle();},
  dispose(){disposed=true;clearDrain();clearTimeout();}
 };
}
