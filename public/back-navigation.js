// A stable history guard keeps Android's Back button inside the installed app.
export function setupBackNavigation({onHome,window:win=globalThis.window}={}){
 const {history,location}=win;
 if(!history?.pushState)return;
 const guard=()=>history.pushState({...history.state,storycardsBackGuard:true},'',location.href);
 history.replaceState({...history.state,storycardsHome:true},'',location.href);guard();
 const back=()=>{
  // Let an open dialog handle Back before navigating away from its form.
  const dialog=win.document?.querySelector('dialog[open]');
  if(dialog){dialog.close();guard();return;}
  onHome();guard();
 };
 win.addEventListener('popstate',back);
 return ()=>win.removeEventListener('popstate',back);
}
