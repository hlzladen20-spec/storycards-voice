import {conversationMode} from './conversation-modes.js';
import {chooseDialog,noticeDialog} from './app-dialog.js';

const icons={essen:'🍳',politik:'🏛️',alltag:'☕',reisen:'✈️',beruf:'🚚',einkaufen:'🛒',rollenspiel:'🎭',ueberraschung:'🎲',schwaechen:'🎯'};
const hints={essen:'Gerichte, Rezepte & Restaurant',politik:'Gesellschaft & Meinungen',alltag:'Dein Tag & Hobbys',reisen:'Unterwegs & im Urlaub',beruf:'Kollegen & Aufgaben',einkaufen:'Produkte & Preise',rollenspiel:'Eine Situation nachspielen',ueberraschung:'Emma sucht ein Thema aus',schwaechen:'Deine schwierigen Sätze gezielt üben'};

export function setupConversationTopicPicker({button,select,onSelect,isLocked=()=>false,choose=chooseDialog,notice=noticeDialog,course={name:'Englisch'},getCoachName=()=> 'Emma'}){
 let opened=false;
 button.classList.add('topic-picker-trigger');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Gesprächsthema wählen');
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg><span>Thema</span>';
 button.onclick=async()=>{
  if(opened)return;
  if(isLocked()){await notice({title:`Du bist im ${course.name}-Check`,message:getCoachName()+' führt dich durch die Aufgaben des Checks. Danach kannst du wieder ein eigenes Gesprächsthema auswählen.'});return;}
  opened=true;button.setAttribute('aria-expanded','true');
  try{
   const choices=Array.from(select.options).map(option=>({value:option.value,label:conversationMode(option.value).label,icon:icons[option.value],hint:option.value==='ueberraschung'?getCoachName()+' sucht ein Thema aus':hints[option.value]}));
   const choice=await choose({title:'Worüber sprechen wir?',message:'Tippe auf ein Thema. '+getCoachName()+' greift es bei der nächsten Antwort auf.',choices,selected:select.value});
   if(choice && choices.some(item=>item.value===choice) && choice!==select.value && !isLocked())onSelect(choice);
  }finally{opened=false;button.setAttribute('aria-expanded','false');}
 };
}
