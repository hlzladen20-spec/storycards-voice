import {vocabularyRequest,requestVocabularySuggestions,validateVocabularySuggestion} from './vocabulary-suggestions.js';
import {authenticatedFetch} from './authenticated-fetch.js';

export function setupVocabularyCreator({anchor,course,onSave,onLearn,onListen,request=authenticatedFetch}){
 const open=document.createElement('button');open.type='button';open.className='secondary vocab-create-open';open.id='addVocabularyButton';open.textContent='＋ Vokabel hinzufügen';open.setAttribute('aria-expanded','false');open.setAttribute('aria-controls','vocabularyCreator');
 const area=document.createElement('section');area.id='vocabularyCreator';area.className='vocab-create';area.hidden=true;
 area.setAttribute('aria-label','Persönliche Vokabel hinzufügen');
 area.innerHTML=`<h3>Deine Vokabel. Dein Satz.</h3><p>Ein Wort eingeben, einen kurzen Satz auswählen und erst dann speichern.</p>
 <form class="vocab-create-request"><label>Wort oder kurzer Ausdruck (${course.name})<input name="word" maxlength="80" placeholder="${course.target==='en'?'actually':course.target==='es'?'siempre':'souvent'}" required autocomplete="off"></label><label>Bedeutung oder Kontext (optional)<input name="context" maxlength="160" placeholder="Zum Beispiel: im Alltag"></label><button type="submit" class="primary">Satz vorschlagen</button></form>
 <p class="vocab-create-status" role="status" aria-live="polite"></p>
 <div class="vocab-create-preview" hidden><h4>Wähle deinen Satz</h4><div class="vocab-create-choices" role="group" aria-label="Bedeutung und Satz auswählen"></div>
 <form class="vocab-create-save"><label>Deutsch (2–6 Wörter)<input name="front" maxlength="70" required></label><label>${course.name} (2–6 Wörter)<input name="back" maxlength="70" required></label><button type="button" class="ghost vocab-create-listen">🔊 Satz anhören</button><button type="submit" class="primary">Zum Vokabeltrainer hinzufügen</button></form></div>
 <button type="button" class="secondary vocab-create-learn" hidden>Zum Vokabeltrainer →</button><button type="button" class="ghost vocab-create-cancel">Schließen</button>`;
 anchor.after(open,area);
 const $=selector=>area.querySelector(selector),form=$('.vocab-create-request'),preview=$('.vocab-create-preview'),saveForm=$('.vocab-create-save');
 const word=form.querySelector('[name=word]'),context=form.querySelector('[name=context]'),front=saveForm.querySelector('[name=front]'),back=saveForm.querySelector('[name=back]'),generate=form.querySelector('button');
 const status=$('.vocab-create-status');let controller=null,revision=0,selected=null,sourceWord='',saved=false;
 function busy(value){generate.disabled=value;generate.textContent=value?'Satz wird erstellt …':'Satz vorschlagen';word.disabled=value;context.disabled=value;form.setAttribute('aria-busy',String(value));}
 function reset(){revision++;controller?.abort();controller=null;selected=null;sourceWord='';saved=false;preview.hidden=true;$('.vocab-create-learn').hidden=true;status.textContent='';busy(false);}
 function close(){reset();area.hidden=true;open.setAttribute('aria-expanded','false');open.focus();}
 open.onclick=()=>{if(!area.hidden){close();return;}area.hidden=false;open.setAttribute('aria-expanded','true');word.focus();};
 $('.vocab-create-cancel').onclick=close;
 $('.vocab-create-learn').onclick=()=>{close();onLearn();};
 form.addEventListener('input',reset);
 saveForm.addEventListener('input',()=>{saved=false;saveForm.querySelector('[type=submit]').disabled=false;$('.vocab-create-learn').hidden=true;status.textContent='';});
 form.onsubmit=async event=>{
  event.preventDefault();if(controller || !form.reportValidity())return;
  reset();let input;
  try{input=vocabularyRequest({word:word.value,context:context.value});}catch(error){status.textContent=error.message;return;}
  const current=revision;controller=new AbortController();const activeController=controller;
  const timeout=setTimeout(()=>activeController.abort(),30000);busy(true);status.textContent='Die KI erstellt kurze Sätze zur Auswahl …';
  try{
   const suggestions=await requestVocabularySuggestions(input,course.target,{signal:activeController.signal,request});
   if(current!==revision)return;
   const choices=$('.vocab-create-choices');choices.replaceChildren();sourceWord=input.word;
   const options=[];
   const choose=(suggestion,index)=>{selected=suggestion;saved=false;front.value=suggestion.front;back.value=suggestion.back;saveForm.querySelector('[type=submit]').disabled=false;$('.vocab-create-learn').hidden=true;status.textContent='Prüfe den Satz und die Übersetzung. Du kannst beide vor dem Speichern bearbeiten.';options.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));};
   suggestions.forEach((suggestion,index)=>{
    const button=document.createElement('button');button.type='button';button.className='vocab-create-option';
    const meaning=document.createElement('strong');meaning.textContent=suggestion.meaning||suggestion.back;
    const sentence=document.createElement('span');sentence.textContent=`${suggestion.back} — ${suggestion.front}`;button.append(meaning,sentence);button.onclick=()=>choose(suggestion,index);options.push(button);choices.append(button);
   });
   choose(suggestions[0],0);preview.hidden=false;saveForm.querySelector('[type=submit]').disabled=false;status.textContent='Prüfe den Satz und die Übersetzung. Du kannst beide vor dem Speichern bearbeiten.';
  }catch(error){if(current===revision)status.textContent=error.name==='AbortError'?'Die Anfrage hat zu lange gedauert. Bitte erneut versuchen.':error.message;}
  finally{clearTimeout(timeout);if(current===revision){controller=null;busy(false);}}
 };
 $('.vocab-create-listen').onclick=()=>{if(selected)onListen(back.value);};
 saveForm.onsubmit=event=>{
  event.preventDefault();if(saved || !selected || !saveForm.reportValidity())return;
  try{
   const draft=validateVocabularySuggestion({front:front.value,back:back.value,meaning:selected.meaning},sourceWord);
   onSave(sourceWord,draft);saved=true;saveForm.querySelector('[type=submit]').disabled=true;
   status.textContent='✓ Im Vokabeltrainer gespeichert. Der Satz wird in einer neuen Portion eingeplant; deine laufende Runde bleibt unverändert.';$('.vocab-create-learn').hidden=false;
  }catch(error){status.textContent=error.message;}
 };
 return {area,reset:()=>{reset();area.hidden=true;open.setAttribute('aria-expanded','false');}};
}
