let activeDialog=null;

// Promise-based rather than replacing window.confirm with a truthy Promise.
// A second simultaneous request is declined, never silently approved.
export function confirmDialog(options){return showDialog(typeof options==='string'?{message:options}:options);}
export function noticeDialog(options){return showDialog({...(typeof options==='string'?{message:options}:options),cancelText:null,confirmText:'Verstanden'});}
export function chooseDialog(options){return showDialog({...options,confirmText:null,cancelText:'Zurück zum Gespräch'});}

function showDialog({title='Ein kurzer Hinweis',message='',items=[],note='',confirmText='Weiter',cancelText='Abbrechen',danger=false,choices=[],selected=''}={}){
 if(activeDialog)return Promise.resolve(false);
 return new Promise(resolve=>{
  const previous=document.activeElement,app=document.querySelector('main.app'),wasInert=app?.inert;
  const overlay=document.createElement('div');overlay.className='app-dialog-overlay';
  const dialog=document.createElement('dialog');dialog.className=`app-dialog${danger?' app-dialog-danger':''}${choices.length?' app-dialog-choice':''}`;
  dialog.setAttribute('aria-labelledby','app-dialog-title');dialog.setAttribute('aria-describedby','app-dialog-message');dialog.setAttribute('aria-modal','true');
  const icon=document.createElement('div');icon.className='app-dialog-icon';icon.setAttribute('aria-hidden','true');
  icon.innerHTML='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 3v1"/></svg>';
  const heading=document.createElement('h2');heading.id='app-dialog-title';heading.textContent=title;
  const content=document.createElement('div');content.id='app-dialog-message';content.className='app-dialog-message';
  if(message){const text=document.createElement('p');text.textContent=message;content.append(text);}
  if(items.length){const list=document.createElement('ul');for(const text of items){const item=document.createElement('li');item.textContent=text;list.append(item);}content.append(list);}
  const choiceButtons=[];
  if(choices.length){
   const grid=document.createElement('div');grid.className='app-dialog-choices';grid.setAttribute('role','group');grid.setAttribute('aria-label','Gesprächsthema');
   for(const choice of choices){
    const button=document.createElement('button');button.type='button';button.className='app-dialog-option';button.setAttribute('aria-pressed',String(choice.value===selected));
    const emoji=document.createElement('span');emoji.className='app-choice-icon';emoji.setAttribute('aria-hidden','true');emoji.textContent=choice.icon||'';
    const label=document.createElement('strong');label.textContent=choice.label;
    const hint=document.createElement('small');hint.textContent=choice.hint||'';
    const check=document.createElement('span');check.className='app-choice-check';check.setAttribute('aria-hidden','true');check.textContent=choice.value===selected?'✓':'';
    button.append(emoji,label,hint,check);grid.append(button);choiceButtons.push({button,value:choice.value});
   }content.append(grid);
  }
  if(note){const text=document.createElement('p');text.className='app-dialog-note';text.textContent=note;content.append(text);}
  const actions=document.createElement('div');actions.className='app-dialog-actions';
  let cancel;
  if(cancelText){cancel=document.createElement('button');cancel.type='button';cancel.className='secondary';cancel.textContent=cancelText;actions.append(cancel);}
  let confirm;
  if(confirmText){confirm=document.createElement('button');confirm.type='button';confirm.className='primary';confirm.textContent=confirmText;actions.append(confirm);}
  dialog.append(icon,heading,content,actions);overlay.append(dialog);document.body.append(overlay);
  activeDialog=dialog;let settled=false;
  const finish=value=>{
   if(settled)return;settled=true;activeDialog=null;
   if(dialog.open && typeof dialog.close==='function')dialog.close();
   overlay.remove();if(app)app.inert=wasInert;
   if(previous?.isConnected)previous.focus();resolve(value);
  };
  if(cancel)cancel.onclick=()=>finish(false);if(confirm)confirm.onclick=()=>finish(true);
  for(const choice of choiceButtons)choice.button.onclick=()=>finish(choice.value);
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
   const first=choiceButtons[0]?.button||cancel||confirm,last=confirm||cancel||choiceButtons.at(-1)?.button;
   if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
  });
  try{
   if(app)app.inert=true;
   if(typeof dialog.showModal==='function')dialog.showModal();
   else{overlay.classList.add('app-dialog-fallback');dialog.setAttribute('open','');dialog.setAttribute('role','dialog');}
   (choiceButtons.find(choice=>choice.value===selected)?.button||choiceButtons[0]?.button||cancel||confirm).focus();
  }catch{finish(false);}
 });
}
