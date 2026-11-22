import {confirmDialog} from './app-dialog.js';
export function pruneSentenceLesson(lesson,removedIds){
 if(!lesson||!removedIds.length)return lesson;
 const removed=new Set(removedIds),next={...lesson};
 for(const key of ['plannedIds','normalPlannedIds','completed','introduced','pendingRetries','retriedIds'])if(Array.isArray(lesson[key]))next[key]=lesson[key].filter(id=>!removed.has(id));
 if(lesson.results)next.results=Object.fromEntries(Object.entries(lesson.results).filter(([id])=>!removed.has(id)));
 return next;
}
export function setupSentenceCardDeletion({toolbar,getCard,onDelete,isBusy=()=>false,confirm=confirmDialog}){
 const button=document.createElement('button');button.type='button';button.className='ghost sentence-card-delete';button.textContent='Löschen';button.setAttribute('aria-label','Aktuelle Voice-Karte löschen');
 const status=document.createElement('span');status.className='sentence-delete-status';status.setAttribute('role','status');toolbar.append(button,status);let pending=false;
 function refresh(card=getCard()){button.hidden=!card;button.disabled=pending||isBusy();status.textContent='';}
 button.onclick=async()=>{
  const card=getCard();if(!card||pending||isBusy())return;
  pending=true;refresh();
  try{
   if(!await confirm({title:'Voice-Karte löschen?',message:card.front,note:'Die Satzkarte wird aus deiner Sammlung, der Tageslektion und den Wiederholungen entfernt. Deine bisherige Lernzeit und Statistik bleiben erhalten.',confirmText:'Karte löschen',danger:true}))return;
   if(isBusy()||getCard()?.id!==card.id)throw Error('Die angezeigte Karte hat sich geändert. Bitte wähle sie erneut aus.');
   await onDelete(card);status.textContent='Karte gelöscht.';
  }catch(error){status.textContent=error.message||'Die Karte konnte nicht gelöscht werden. Bitte erneut versuchen.';}
  finally{pending=false;button.disabled=isBusy();button.hidden=!getCard();}
 };
 refresh();return {refresh};
}
