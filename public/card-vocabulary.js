import {initialVocabulary,personalVocabulary,addVocabulary,isShortVocabulary} from './vocabulary.js';
export const vocabularyIcon='<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="8" y="4" width="19" height="23" rx="3"/><path d="M5 9H4v20h18v-1M12 11h11M12 16h8M12 21h5"/></svg>';
const same=(word,card)=>word.sourceCardId===card.id || (word.front.toLowerCase()===card.front.trim().toLowerCase() && word.back.toLowerCase()===card.back.trim().toLowerCase());
export function toggleCardVocabulary(state,card){
 const existing=state.words.filter(word=>same(word,card));
 if(existing.length){const ids=new Set(existing.map(word=>word.id));const lesson=state.lesson?{...state.lesson,ids:state.lesson.ids.filter(id=>!ids.has(id)),queue:state.lesson.queue.filter(item=>!ids.has(item.id))}:state.lesson;
  return {...state,words:state.words.filter(word=>!ids.has(word.id)),ignoredSourceIds:[...new Set([...(state.ignoredSourceIds||[]),card.id])],lesson};}
 const next=addVocabulary(state,card.front,card.back);next.words.at(-1).sourceCardId=card.id;
 return {...next,ignoredSourceIds:(state.ignoredSourceIds||[]).filter(id=>id!==card.id)};
}
export function setupVocabularyMark({storage,getCard,onChange}){
 const toolbar=document.createElement('div');toolbar.className='card-vocabulary-toolbar';
 const button=document.createElement('button');button.type='button';button.className='ghost card-vocabulary-mark';
 const status=document.createElement('span');status.setAttribute('role','status');toolbar.append(button,status);
 const panel=document.getElementById('cards');panel.insertBefore(toolbar,document.getElementById('card'));
 const load=()=>personalVocabulary(storage.load('vocabulary',null)||initialVocabulary());
 function refresh(card=getCard()){
  toolbar.hidden=!card;status.textContent='';if(!card)return;
  const selected=load().words.some(word=>same(word,card));
  button.innerHTML=vocabularyIcon+`<span>${selected?'In deinen Vokabeln ✓':'Zu Vokabeln hinzufügen'}</span>`;
  button.setAttribute('aria-pressed',String(selected));button.disabled=!isShortVocabulary(card);
  button.title=button.disabled?'Im Vokabeltrainer sind nur kurze Sätze mit 2–6 Wörtern pro Seite möglich.':'';
 }
 button.onclick=()=>{const card=getCard();if(!card)return;try{storage.save('vocabulary',toggleCardVocabulary(load(),card));refresh(card);document.dispatchEvent(new Event('storycards-vocabulary-changed'));onChange();}catch(error){status.textContent=error.message;}};
 return {refresh,toolbar};
}
