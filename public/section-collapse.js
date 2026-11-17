// Presentation only: never reset forms, learning queues, playback or saved data.
export function collapseSection(section){
 for(const details of section.querySelectorAll('details[open]'))details.open=false;
 for(const button of section.querySelectorAll('[aria-expanded="true"][aria-controls]')){
  button.setAttribute('aria-expanded','false');
  if(button.hasAttribute('aria-pressed'))button.setAttribute('aria-pressed','false');
  for(const id of button.getAttribute('aria-controls').split(/\s+/).filter(Boolean)){
   // Only hide disclosure content in this section, never another screen.
   const target=section.ownerDocument.getElementById(id);if(target&&section.contains(target))target.hidden=true;
  }
 }
 for(const button of section.querySelectorAll('.summary-metrics [aria-pressed="true"]'))button.setAttribute('aria-pressed','false');
}
export function setupSectionCollapse(root,{Observer=MutationObserver}={}){
 const visible=new Map();
 const isVisible=section=>!section.hidden&&!section.classList.contains('hidden');
 for(const section of root.querySelectorAll(':scope > section')){collapseSection(section);visible.set(section,isVisible(section));}
 const observer=new Observer(records=>{
  for(const {target} of records){
   if(!visible.has(target))continue;
   const next=isVisible(target),before=visible.get(target);visible.set(target,next);
   // Close on exit, not entry: deliberate links may open a specific detail
   // after navigation (e.g. vocabulary management or speaking assessment).
   if(before&&!next)collapseSection(target);
  }
 });
 observer.observe(root,{subtree:true,attributes:true,attributeFilter:['class','hidden']});
 return {dispose:()=>observer.disconnect()};
}
