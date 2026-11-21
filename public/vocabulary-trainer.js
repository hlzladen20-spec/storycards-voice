import {LANGUAGE_COURSES} from './language-courses.js';
import {initialVocabulary,personalVocabulary,importConversationVocabulary,addVocabulary,vocabularyLesson,additionalVocabularyLesson,rateVocabulary,finishVocabulary,vocabularyProgress,vocabularyKnown,vocabularyNeedsRepeat,vocabularyTotalMs,setVocabularySettings,VOCABULARY_SECONDS} from './vocabulary.js';
import {vocabularyIcon} from './card-vocabulary.js';
import {calendarDayKey} from './learning-streak.js';
import {confirmDialog} from './app-dialog.js';
import {setupVocabularyCreator} from './vocabulary-creator.js';
import {addSuggestedVocabulary} from './vocabulary-suggestions.js';
import {removeVocabulary} from './vocabulary.js';
import {vocabularySessionSeconds} from './vocabulary.js';
import {vocabularyRoundProgress,vocabularyDailyProgress} from './vocabulary.js';
import {reviewIntervalLabel} from '../lib/review-scheduler.js';

export function setupVocabularyTrainer({storage,onOpen,onPractice,onChange=()=>{},getCards=()=>[],getQuickMode=()=>false,speech,course=LANGUAGE_COURSES.en}) {
 let state=personalVocabulary(storage.load('vocabulary',null)||initialVocabulary()),answerCard=null,lastTick=Date.now(),deleting=false,listening=false,spokenId=null;
 state={...state,totalActiveMs:vocabularyTotalMs(state)};
 const panel=document.createElement('section');panel.id='vocabulary';panel.className='panel hidden vocabulary-trainer';
 panel.setAttribute('aria-label','Vokabeltrainer');
 panel.innerHTML=`<div class="vocab-toolbar"><button class="ghost vocab-back" type="button">← Karten</button><details class="vocab-menu"><summary aria-label="Weitere Kartenaktionen">⋮</summary><button class="ghost vocab-delete" type="button" aria-label="Aktuelle Vokabel löschen">🗑 Löschen</button><button class="ghost vocab-manage-open" type="button">Verwalten</button><p class="vocab-time"></p></details></div>
 <button type="button" class="ghost vocab-mode">Übersetzen ⇄ Hören</button><p class="vocab-progress" role="status"></p><progress class="vocab-bar" aria-label="Erledigte Karten dieser Lernrunde" max="15" value="0"></progress>
 <div class="vocab-word" tabindex="0" aria-label="Kurzer Satz zur Selbstkontrolle"></div>
 <p class="vocab-audio-status emma-speech-status" role="status"></p><div class="vocab-controls">
 <p class="vocab-status" role="status" aria-live="polite"></p>
 <button class="primary vocab-reveal" type="button">Antwort aufdecken</button>
 <div class="vocab-ratings" role="group" aria-label="Wie sicher war deine Antwort?" hidden><button type="button" data-grade="no" class="secondary">Nochmal</button><button type="button" data-grade="hard" class="secondary">Mit Mühe</button><button type="button" data-grade="yes" class="secondary">Gewusst</button></div>
 <button class="secondary vocab-finish" type="button" hidden>Beenden</button>
 <button class="primary vocab-continue" type="button" hidden>Weiterlernen →</button>
 </div>
 <nav class="bottom-nav" aria-label="Hauptmenü"><button type="button" data-target="choiceHomeButton">⌂<small>Home</small></button><button type="button" data-target="choiceCardsButton" class="active">▣<small>Karten</small></button><button type="button" data-target="choiceProgressButton">▥<small>Statistiken</small></button><button type="button" data-target="choiceProfileButton">♙<small>Profil</small></button></nav>`;
 document.querySelector('main.app').append(panel);
 const $=selector=>panel.querySelector(selector),save=()=>{storage.save('vocabulary',state);onChange();};
 const management=document.createElement('section');management.className='profile-card vocab-management';
 management.innerHTML=`<h3>Deine Vokabelkarten</h3><details class="vocab-learned"><summary>Gelernte Karten nach SRS <span class="vocab-learned-count"></span></summary><div class="vocab-learned-list"></div></details>
 <details class="vocab-manager"><summary>Kurze Sätze hinzufügen und verwalten</summary><form class="vocab-add"><label>Deutsch (2–6 Wörter)<input name="front" required maxlength="70"></label><label>${course.name} (2–6 Wörter)<input name="back" required maxlength="70"></label><button class="primary" type="submit">＋ Kurzen Satz hinzufügen</button></form><p class="vocab-archive"></p><div class="vocab-list"></div><p class="vocab-management-status" role="status"></p></details>`;
 document.getElementById('profile').insertBefore(management,document.getElementById('profile').querySelector('nav'));
 const manage=selector=>management.querySelector(selector);
 const settings=document.createElement('section');settings.className='profile-card vocab-settings';
 settings.innerHTML=`<h3>Dein Vokabelziel</h3><form><label for="vocabDailyLimit">Vokabelkarten pro Tag (inklusive Wiederholungen)<input id="vocabDailyLimit" type="number" min="1" max="50" step="1" required></label><label for="vocabNewLimit">Davon höchstens neue Karten (0 = nur Wiederholungen)<input id="vocabNewLimit" type="number" min="0" max="15" step="1" required></label><label class="vocab-auto-label"><input id="vocabAutoIncrease" type="checkbox">Neue Karten bei guten Lernergebnissen langsam steigern</label><p>Fällige Wiederholungen zuerst. Maximal 15 Minuten. Eine angefangene Tagesrunde bleibt unverändert; Änderungen gelten für die nächste Runde.</p><button class="primary" type="submit">Vokabelziel speichern</button></form><p class="vocab-setting-status" role="status"></p>`;
 document.getElementById('profile').insertBefore(settings,document.getElementById('profile').querySelector('nav'));
 function refreshSettings(){settings.querySelector('#vocabDailyLimit').value=state.dailyLimit||15;settings.querySelector('#vocabNewLimit').value=state.newLimit??3;settings.querySelector('#vocabAutoIncrease').checked=state.autoIncrease!==false;}
 function saveSettings(){
  if(!settings.querySelector('form').reportValidity())return;
  try{state=setVocabularySettings(state,{dailyLimit:Number(settings.querySelector('#vocabDailyLimit').value),newLimit:Number(settings.querySelector('#vocabNewLimit').value),autoIncrease:settings.querySelector('#vocabAutoIncrease').checked});save();refreshSettings();settings.querySelector('.vocab-setting-status').textContent=`Gespeichert: bis zu ${state.dailyLimit} Karten pro Tag, davon bis zu ${state.newLimit} neue. Angefangene Runden bleiben unverändert.`;}
  catch(error){settings.querySelector('.vocab-setting-status').textContent=error.message;}
 }
 settings.querySelector('form').onsubmit=e=>{e.preventDefault();saveSettings();};
 settings.querySelectorAll('input').forEach(input=>input.addEventListener('change',saveSettings));
 document.getElementById('saveProfileButton')?.addEventListener('click',saveSettings);
 refreshSettings();
 const button=document.createElement('button');button.type='button';button.className='card-choice-option';button.id='vocabularyChoiceButton';
 button.innerHTML=vocabularyIcon+'<span><strong>Vokabeltrainer</strong><small>Aufdecken, vergleichen und üben</small></span><b aria-hidden="true">›</b>';
 document.getElementById('cardChoice').insertBefore(button,document.getElementById('freePracticeButton'));
 function refreshChoice(){
  const lesson=state.lesson,done=vocabularyDailyProgress(state).done;
  button.classList[done?'add':'remove']('is-complete');
  button.querySelector('strong').textContent=done?'Vokabeltrainer ✓':'Vokabeltrainer';
  button.querySelector('small').textContent=done?(lesson.closed?'Tagesrunde geschafft! Freiwillig weiterlernen.':'Tagesziel geschafft · Zusatzrunde fortsetzen.'):'Aufdecken, vergleichen und üben';
 }
 function line(text,tag='p'){const node=document.createElement(tag);node.textContent=text;return node;}
 function say(text){void speech?.speak(text,{language:course.target,onStatus:value=>{$('.vocab-audio-status').textContent=value;}});}
 function wordView(word,answer=false){
  const box=$('.vocab-word');box.replaceChildren();
  if(listening&&!answer){
   box.append(line('Höre zu. Was bedeutet der Satz?','h3'));
   const audio=line('Satz noch einmal anhören','button');audio.type='button';audio.className='ghost';audio.onclick=()=>say(word.back);box.append(audio);
   if(spokenId!==word.id){spokenId=word.id;say(word.back);}
  }else{
   box.append(line(listening?word.back:word.front,'h3'));
   if(answer){const answerLine=line(listening?word.front:word.back,'button');answerLine.type='button';answerLine.className='ghost';answerLine.onclick=()=>say(word.back);box.append(answerLine);}
  }
 }
 async function deleteWord(id){
  if(deleting)return;const word=state.words.find(item=>item.id===id);if(!word)return;
  deleting=true;speech?.stop();
  try{
   if(!await confirmDialog({title:'Vokabel löschen?',message:word.front,note:'Dieser Satz wird aus deinem Vokabeltrainer und den Wiederholungen entfernt. Er wird nicht automatisch erneut aus deinen Gesprächskarten übernommen. Andere Karten und deine bisherige Lernzeit bleiben erhalten.',confirmText:'Vokabel löschen',danger:true}))return;
   const next=removeVocabulary(state,id);storage.save('vocabulary',next);state=next;answerCard=null;lastTick=Date.now();render();
   $('.vocab-status').textContent=manage('.vocab-management-status').textContent='Vokabel gelöscht. Sie kommt nicht mehr in die Wiederholung.';
  }catch{$('.vocab-status').textContent=manage('.vocab-management-status').textContent='Löschen konnte nicht gespeichert werden. Bitte versuche es erneut.';}
  finally{lastTick=Date.now();deleting=false;}
 }
 function progress(){
  const p=vocabularyRoundProgress(state),minutes=Math.floor(vocabularyTotalMs(state)/60000);
  $('.vocab-time').textContent='Insgesamt '+minutes+' Minuten gelernt';
  const pending=new Set((state.lesson?.queue||[]).filter(item=>item.retry).map(item=>item.id)).size;
  $('.vocab-progress').textContent=p.total?(state.lesson.extraRound?'Zusatzrunde · ':'Heute · ')+p.completed+' von '+p.total+' Karten erledigt'+(pending?' · '+pending+(pending===1?' Wiederholung offen':' Wiederholungen offen'):''):'Keine Karten fällig';
  $('.vocab-bar').max=p.total||1;$('.vocab-bar').value=p.completed;$('.vocab-bar').hidden=!p.total;
 }
 function renderLists(){
  const list=manage('.vocab-list'),learned=manage('.vocab-learned-list');list.replaceChildren();learned.replaceChildren();
  const known=state.words.filter(vocabularyKnown).sort((a,b)=>a.nextReviewAt-b.nextReviewAt);
  manage('.vocab-learned-count').textContent=`(${known.length})`;
  for(const w of known){const row=line(`${w.front} – ${w.back} · nächste Wiederholung am ${new Date(w.nextReviewAt).toLocaleDateString('de-DE')}`);const audio=line('🔊 Anhören','button');audio.type='button';audio.className='ghost';audio.onclick=()=>say(w.back);row.append(audio);learned.append(row);}
  if(!known.length)learned.append(line('Noch keine Karte sicher erinnert. Nur Aufdecken zählt noch nicht: Erst vergleichen und ehrlich bewerten.'));
  for(const word of state.words){
   const row=document.createElement('div');row.append(line(`${word.front} – ${word.back}`,'span'));
   const remove=line('Entfernen','button');remove.type='button';remove.className='ghost';
   remove.onclick=()=>deleteWord(word.id);
   row.append(remove);list.append(row);
  }
  manage('.vocab-archive').textContent=state.archivedWords?.length?`${state.archivedWords.length} frühere Wortkarten bleiben als Archiv gespeichert und erscheinen nicht mehr in der Satzrunde.`:'';
 }
 function render(){
  speech?.stop();
  state={...state,quickModeDay:getQuickMode()?calendarDayKey(new Date()):null};
  state=vocabularyLesson(state);
  if(!state.lesson.queue.length && !state.lesson.closed && !answerCard)state=finishVocabulary(state);
  save();progress();renderLists();refreshSettings();refreshChoice();
  const word=answerCard||state.words.find(w=>w.id===state.lesson.queue[0]?.id),ended=state.lesson.closed||!word;
  $('.vocab-delete').hidden=ended;
  $('.vocab-menu').open=false;
  $('.vocab-reveal').hidden=ended||Boolean(answerCard);
  $('.vocab-ratings').hidden=ended||!answerCard;
  $('.vocab-continue').hidden=!ended || !state.words.length;
  $('.vocab-finish').hidden=!ended;
  if(ended){
   $('.vocab-word').replaceChildren(line(!state.words.length?'Noch keine persönlichen Kurzsätze':state.lesson.activeMs>=vocabularySessionSeconds(state)*1000?'Deine Lernzeit ist geschafft!':'Runde geschafft!','h3'));
   $('.vocab-status').textContent=!state.words.length?'Führe ein Gespräch. Erkannte Schwierigkeiten werden danach automatisch als kurze Sätze übernommen.':'Dein SRS-Plan ist gespeichert. Mit „Weiterlernen“ startest du freiwillig eine weitere Runde – schwierige Karten zuerst.';return;
  }
  wordView(word,Boolean(answerCard));
  if(answerCard)for(const button of panel.querySelectorAll('[data-grade]')){
   const hint=document.createElement('small');hint.textContent=vocabularyNeedsRepeat(word)||button.dataset.grade!=='yes'?'erneut in dieser Runde':reviewIntervalLabel(word,button.dataset.grade);
   button.replaceChildren(line({no:'Nochmal',hard:'Mit Mühe',yes:'Gewusst'}[button.dataset.grade],'span'),hint);
  }
  $('.vocab-status').textContent=vocabularyNeedsRepeat(word)?`Wiederholung · ${word.cleanStreak||0} von 3 hintereinander fehlerfrei`:'';
 }
 function tick(){
  const now=Date.now(),delta=now-lastTick;lastTick=now;
  if(deleting||panel.classList.contains('hidden')||document.visibilityState!=='visible'||!state.lesson||state.lesson.closed)return;
  const elapsed=Math.min(Math.max(0,delta),Math.max(0,vocabularySessionSeconds(state)*1000-state.lesson.activeMs));
  state.totalActiveMs=vocabularyTotalMs(state)+elapsed;
  state.lesson.activeMs+=elapsed;
  if(state.lesson.activeMs>=vocabularySessionSeconds(state)*1000){answerCard=null;state=finishVocabulary(state);render();}
  else{save();progress();}
 }
 function revealCurrent(){
  tick();if(state.lesson?.closed || answerCard)return;
  const word=state.words.find(w=>w.id===state.lesson.queue[0]?.id);if(!word)return;
  answerCard=word;render();
 }
 function rate(rating){
  tick();if(state.lesson?.closed)return;
  if(!answerCard){$('.vocab-status').textContent='Bitte zuerst die Antwort aufdecken und mit deiner eigenen Antwort vergleichen.';return;}
  const word=state.words.find(w=>w.id===state.lesson.queue[0]?.id);if(!word || word.id!==answerCard.id)return;
  state=rateVocabulary(state,rating);answerCard=null;spokenId=null;onPractice();render();
 }
 function syncCards(){state=importConversationVocabulary(state,getCards());save();renderLists();refreshChoice();}
 button.onclick=()=>{syncCards();onOpen();panel.classList.remove('hidden');lastTick=Date.now();answerCard=null;spokenId=null;render();};
 $('.vocab-back').onclick=()=>{speech?.stop();document.getElementById('choiceCardsButton').click();};
 $('.vocab-delete').onclick=()=>{const id=answerCard?.id||state.lesson?.queue[0]?.id;if(id)void deleteWord(id);};
 $('.vocab-manage-open').onclick=()=>{speech?.stop();document.dispatchEvent(new CustomEvent('storycards-open-library',{detail:'vocabulary'}));};
 $('.vocab-mode').onclick=()=>{listening=!listening;spokenId=null;answerCard=null;$('.vocab-mode').textContent=listening?'Hörmodus · zum Übersetzen wechseln':'Übersetzen · zum Hören wechseln';render();};
 $('.vocab-finish').onclick=()=>{speech?.stop();tick();save();window.speechSynthesis?.cancel();document.getElementById('choiceCardsButton').click();};
 panel.querySelectorAll('[data-target]').forEach(n=>n.onclick=()=>document.getElementById(n.dataset.target).click());
 panel.querySelectorAll('[data-grade]').forEach(n=>n.onclick=()=>rate(n.dataset.grade));
 $('.vocab-reveal').onclick=revealCurrent;
 $('.vocab-continue').onclick=()=>{syncCards();state=additionalVocabularyLesson(state);answerCard=null;lastTick=Date.now();render();if(state.lesson.closed && state.words.length)$('.vocab-status').textContent='Es gibt noch keine Wiederholungen. Im Profil kannst du neue Karten aktivieren (aktuell 0).';};
 const box=$('.vocab-word');
 box.addEventListener('click',e=>{if(!e.target.closest('button'))revealCurrent();});
 box.addEventListener('keydown',e=>{if(e.target===box && (e.key===' '||e.key==='Enter')){e.preventDefault();revealCurrent();}});
 manage('.vocab-add').onsubmit=e=>{e.preventDefault();try{const data=new FormData(e.target);state=addVocabulary(state,data.get('front'),data.get('back'));save();e.target.reset();renderLists();manage('.vocab-management-status').textContent='Kurzer Satz gespeichert. Er kommt in eine kommende Tagesportion.';}catch(error){manage('.vocab-management-status').textContent=error.message;}};
 document.addEventListener('storycards-cards-updated',syncCards);
 document.addEventListener('storycards-quick-mode-changed',()=>{state={...state,quickModeDay:getQuickMode()?calendarDayKey(new Date()):null};state=vocabularyLesson(state);answerCard=null;if(!state.lesson.queue.length&&!state.lesson.closed)state=finishVocabulary(state);save();progress();refreshChoice();});
 document.addEventListener('storycards-card-choice-opened',refreshChoice);
 document.addEventListener('storycards-vocabulary-changed',()=>{state=personalVocabulary(storage.load('vocabulary',null)||initialVocabulary());answerCard=null;if(!panel.classList.contains('hidden'))render();else renderLists();});
 document.addEventListener('visibilitychange',()=>{lastTick=Date.now();});
 window.addEventListener('pagehide',tick);setInterval(tick,1000);syncCards();renderLists();
 const creator=setupVocabularyCreator({anchor:button,course,onListen:say,onLearn:()=>button.onclick(),onSave:(word,draft)=>{
  const next=addSuggestedVocabulary(state,word,draft);storage.save('vocabulary',next);state=next;renderLists();refreshChoice();
 }});
 document.addEventListener('storycards-vocabulary-changed',creator.reset);
 document.dispatchEvent?.(new Event('storycards-navigation-updated'));
 return {panel};
}
