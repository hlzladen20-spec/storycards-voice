let activeDialog=null;

// Promise-based rather than replacing window.confirm with a truthy Promise.
// A second simultaneous request is declined, never silently approved.
export function confirmDialog(options){return showDialog(typeof options==='string'?{message:options}:options);}
export function noticeDialog(options){return showDialog({...(typeof options==='string'?{message:options}:options),cancelText:null,confirmText:'Verstanden'});}

function showDialog({title='Ein kurzer Hinweis',message='',items=[],note='',confirmText='Weiter',cancelText='Abbrechen',danger=false}={}){
 if(activeDialog)return Promise.resolve(false);
 return new Promise(resolve=>{
  const previous=document.activeElement,app=document.querySelector('main.app'),wasInert=app?.inert;
  const overlay=document.createElement('div');overlay.className='app-dialog-overlay';
  const dialog=document.createElement('dialog');dialog.className=`app-dialog${danger?' app-dialog-danger':''}`;
  dialog.setAttribute('aria-labelledby','app-dialog-title');dialog.setAttribute('aria-describedby','app-dialog-message');dialog.setAttribute('aria-modal','true');
  const icon=document.createElement('div');icon.className='app-dialog-icon';icon.setAttribute('aria-hidden','true');
  icon.innerHTML='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 3v1"/></svg>';
  const heading=document.createElement('h2');heading.id='app-dialog-title';heading.textContent=title;
  const content=document.createElement('div');content.id='app-dialog-message';content.className='app-dialog-message';
  if(message){const text=document.createElement('p');text.textContent=message;content.append(text);}
  if(items.length){const list=document.createElement('ul');for(const text of items){const item=document.createElement('li');item.textContent=text;list.append(item);}content.append(list);}
  if(note){const text=document.createElement('p');text.className='app-dialog-note';text.textContent=note;content.append(text);}
  const actions=document.createElement('div');actions.className='app-dialog-actions';
  let cancel;
  if(cancelText){cancel=document.createElement('button');cancel.type='button';cancel.className='secondary';cancel.textContent=cancelText;actions.append(cancel);}
  const confirm=document.createElement('button');confirm.type='button';confirm.className='primary';confirm.textContent=confirmText;actions.append(confirm);
  dialog.append(icon,heading,content,actions);overlay.append(dialog);document.body.append(overlay);
  activeDialog=dialog;let settled=false;
  const finish=value=>{
   if(settled)return;settled=true;activeDialog=null;
   if(dialog.open && typeof dialog.close==='function')dialog.close();
   overlay.remove();if(app)app.inert=wasInert;
   if(previous?.isConnected)previous.focus();resolve(value);
  };
  if(cancel)cancel.onclick=()=>finish(false);confirm.onclick=()=>finish(true);
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
  dialog.addEventListener('close',()=>finish(false));
  overlay.addEventListener('click',event=>{if(event.target===overlay)finish(false);});
  dialog.addEventListener('click',event=>{
   if(event.target!==dialog)return;
   const rect=dialog.getBoundingClientRect();
   if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom)finish(false);
  });
  dialog.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();finish(false);return;}
   if(event.key!=='Tab')return;
   const first=cancel||confirm,last=confirm;
   if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
  });
  try{
   if(app)app.inert=true;
   if(typeof dialog.showModal==='function')dialog.showModal();
   else{overlay.classList.add('app-dialog-fallback');dialog.setAttribute('open','');dialog.setAttribute('role','dialog');}
   (cancel||confirm).focus();
  }catch{finish(false);}
 });
}
