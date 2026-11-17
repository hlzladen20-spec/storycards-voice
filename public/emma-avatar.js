// Analyze only Emma's remote audio, never the learner microphone. The source is
// not connected to speakers: the existing audio element remains the only output.
export function createEmmaAudioMeter({makeContext=()=>{const Context=globalThis.AudioContext||globalThis.webkitAudioContext;return Context?new Context():null;}}={}){
 let context=null,source=null,analyser=null,samples=null;
 function disconnect(){try{source?.disconnect();analyser?.disconnect();}catch{}source=analyser=samples=null;}
 return {
  attach(stream){disconnect();try{context ||= makeContext();if(!context)return;analyser=context.createAnalyser();analyser.fftSize=256;samples=new Uint8Array(analyser.fftSize);source=context.createMediaStreamSource(stream);source.connect(analyser);void context.resume().catch(()=>{});}catch{disconnect();}},
  level(){if(!analyser||context?.state!=='running')return null;try{analyser.getByteTimeDomainData(samples);let energy=0;for(const sample of samples)energy+=((sample-128)/128)**2;return Math.min(1,Math.max(0,(Math.sqrt(energy/samples.length)-.008)*12));}catch{return null;}},
  dispose(){disconnect();const previous=context;context=null;if(previous)void previous.close().catch(()=>{});}
 };
}

// Keep one fixed portrait; independently blend only the masked mouth and eyes.
// Audio energy follows syllables and pauses, not phoneme-level lip sync.
export function createEmmaAvatar({stage,isVisible=()=>true,reducedMotion=()=>false,schedule=setTimeout,cancel=clearTimeout,random=Math.random,meter=createEmmaAudioMeter()}){
 let speaking=false,open=false,blinking=false,disposed=false,mouthTimer=null,blinkTimer=null,blinkEnd=null,amount=0;
 const active=()=>!disposed && isVisible() && !reducedMotion();
 function frame(){
  const animated=active(),talking=animated && speaking;
  const next=animated && blinking?'blink':talking && open?'talking':'rest';
  stage.dataset.frame=next;stage.dataset.motion=animated?'on':'off';
  stage.dataset.blinking=String(animated&&blinking);
  stage.style?.setProperty('--emma-mouth',String(talking?amount:0));
  if(stage.classList.contains('speaking')!==talking)stage.classList.toggle('speaking',talking);
 }
 function stopTimers(){cancel(mouthTimer);cancel(blinkTimer);cancel(blinkEnd);mouthTimer=blinkTimer=blinkEnd=null;blinking=false;}
 function mouth(){
  mouthTimer=null;if(!active() || !speaking){frame();return;}
  const level=meter.level();
  if(level===null){open=!open;amount=open ? .7 : 0;}
  else{amount+=(level-amount)*(level>amount ? .75 : .6);if(amount<.025)amount=0;open=amount>.08;}
  frame();mouthTimer=schedule(mouth,level===null?110+Math.floor(random()*150):65);
 }
 function blink(){
  blinkTimer=null;if(!active()){frame();return;}
  blinking=true;frame();blinkEnd=schedule(()=>{blinkEnd=null;blinking=false;refresh();},130);
 }
 function refresh(){
  if(!active()){stopTimers();open=false;amount=0;frame();return;}
  if(speaking && mouthTimer===null)mouthTimer=schedule(mouth,150);
  if(!speaking){cancel(mouthTimer);mouthTimer=null;open=false;amount=0;}
  if(blinkTimer===null && blinkEnd===null)blinkTimer=schedule(blink,3200+Math.floor(random()*2400));
  frame();
 }
 return {
  attachAudio(stream){if(!disposed)meter.attach(stream);},
  setSpeaking(value){const next=Boolean(value);if(next!==speaking){speaking=next;const level=next?meter.level():0;amount=level===null ? .7 : level;open=amount>.08;}refresh();},
  refresh,
  dispose(){disposed=true;speaking=false;stopTimers();meter.dispose();frame();}
 };
}
