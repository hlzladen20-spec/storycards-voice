// Lightweight 2D animation using existing portraits, not phoneme-level lip sync.
export function createEmmaAvatar({stage,isVisible=()=>true,reducedMotion=()=>false,schedule=setTimeout,cancel=clearTimeout,random=Math.random}){
 let speaking=false,open=false,blinking=false,disposed=false,mouthTimer=null,blinkTimer=null,blinkEnd=null;
 const active=()=>!disposed && isVisible() && !reducedMotion();
 function frame(){
  const animated=active(),talking=animated && speaking;
  const next=animated && blinking?'blink':talking && open?'talking':'rest';
  stage.dataset.frame=next;stage.dataset.motion=animated?'on':'off';
  if(stage.classList.contains('speaking')!==talking)stage.classList.toggle('speaking',talking);
 }
 function stopTimers(){cancel(mouthTimer);cancel(blinkTimer);cancel(blinkEnd);mouthTimer=blinkTimer=blinkEnd=null;blinking=false;}
 function mouth(){
  mouthTimer=null;if(!active() || !speaking){frame();return;}
  open=!open;frame();mouthTimer=schedule(mouth,110+Math.floor(random()*150));
 }
 function blink(){
  blinkTimer=null;if(!active()){frame();return;}
  blinking=true;frame();blinkEnd=schedule(()=>{blinkEnd=null;blinking=false;refresh();},130);
 }
 function refresh(){
  if(!active()){stopTimers();open=false;frame();return;}
  if(speaking && mouthTimer===null)mouthTimer=schedule(mouth,150);
  if(!speaking){cancel(mouthTimer);mouthTimer=null;open=false;}
  if(blinkTimer===null && blinkEnd===null)blinkTimer=schedule(blink,3200+Math.floor(random()*2400));
  frame();
 }
 return {
  setSpeaking(value){const next=Boolean(value);if(next!==speaking){speaking=next;open=next;}refresh();},
  refresh,
  dispose(){disposed=true;speaking=false;stopTimers();frame();}
 };
}
