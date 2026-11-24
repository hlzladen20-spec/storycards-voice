import {vocabularyKnown} from './vocabulary.js';
export function vocabularyGoalProgress(vocabulary={},target){
 const unique=new Map();
 for(const word of vocabulary.words||[]){
  if(!word.front||!word.back)continue;
  const key=[word.front,word.back].map(text=>String(text).normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g,' ')).join('\u0000');
  unique.set(key,Boolean(unique.get(key)||vocabularyKnown(word)));
 }
 const known=[...unique.values()].filter(Boolean).length,goal=Number.isInteger(target)&&target>=1&&target<=10000?target:null;
 return {known,total:unique.size,goal,remaining:goal===null?null:Math.max(0,goal-known),percent:goal===null?null:Math.min(100,Math.round(known/goal*1000)/10)};
}
export function setupVocabularyGoal(host,{getVocabulary,getGoal,onSave}){
 const node=(tag,text='')=>{const element=document.createElement(tag);element.textContent=text;return element;};
 host.className='vocabulary-goal';
 const title=node('h4','Dein Wortschatzziel'),count=node('strong'),bar=node('progress'),hint=node('p'),note=node('small','Gezählt werden deine als gekonnt bewerteten Vokabelkarten. Ein Kurzsatz zählt als eine Karte.'),editor=node('details'),summary=node('summary'),form=node('form'),label=node('label','Dein Gesamtziel · Vokabelkarten'),input=node('input'),save=node('button','Ziel speichern'),status=node('p');
 bar.setAttribute('aria-label','Fortschritt zu deinem Wortschatzziel');status.setAttribute('role','status');
 input.type='number';input.min='1';input.max='10000';input.step='1';input.required=true;input.placeholder='z. B. 500';save.type='submit';save.className='secondary';label.append(input);form.append(label,save,status);editor.append(summary,form);editor.hidden=!onSave;host.append(title,count,bar,hint,note,editor);
 function refresh(){
  const progress=vocabularyGoalProgress(getVocabulary(),getGoal());
  count.textContent=progress.goal===null?`${progress.known} Vokabelkarten gekonnt`:`${progress.known} von ${progress.goal} Vokabelkarten gekonnt`;
  bar.hidden=progress.goal===null;bar.max=progress.goal||1;bar.value=Math.min(progress.known,bar.max);
  hint.textContent=progress.goal===null?'Setze dir ein Gesamtziel und sieh, wie dein Wortschatz wächst.':progress.remaining?`${progress.percent.toLocaleString('de-DE')} % geschafft · noch ${progress.remaining} bis zu deinem Ziel.`:'✓ Wortschatzziel erreicht! Du kannst dein nächstes Ziel setzen.';
  summary.textContent=progress.goal===null?'Wortschatzziel setzen':'Ziel ändern';if(!editor.open)input.value=progress.goal===null?'':String(progress.goal);
 }
 let pending=false;
 form.onsubmit=async event=>{event.preventDefault();if(pending||!form.reportValidity())return;const goal=Number(input.value);if(!Number.isInteger(goal)||goal<1||goal>10000)return;pending=true;save.disabled=true;status.textContent='';try{await onSave(goal);editor.open=false;refresh();}catch{status.textContent='Das Ziel konnte nicht gespeichert werden. Bitte erneut versuchen.';}finally{pending=false;save.disabled=false;}};
 refresh();return {refresh};
}
