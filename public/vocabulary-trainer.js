import {initialVocabulary,personalVocabulary,importConversationVocabulary,addVocabulary,vocabularyLesson,additionalVocabularyLesson,rateVocabulary,finishVocabulary,vocabularyRoundProgress,swipeRating,setVocabularySettings,VOCABULARY_SECONDS} from './vocabulary.js';
import {vocabularyIcon} from './card-vocabulary.js';
import {calendarDayKey} from './learning-streak.js';

export function setupVocabularyTrainer({storage,onOpen,onPractice,getCards=()=>[]}) {
 let state=personalVocabulary(storage.load('vocabulary',null)||initialVocabulary()),answerCard=null,lastTick=Date.now(),gesture=null,suppressSwipeClick=false;
 const panel=document.createElement('section');panel.id='vocabulary';panel.className='panel hidden vocabulary-trainer';
 panel.setAttribute('aria-label','Vokabeltrainer');
 panel.innerHTML=`<button class="ghost vocab-back" type="button">← Zurück zu den Karten</button>
 <p class="vocab-progress" role="status"></p><progress class="vocab-bar" aria-label="Abgeschlossene Karten dieser Runde" max="15" value="0"></progress>
 <div class="vocab-word" tabindex="0" aria-label="Kurzer Satz zur Selbstkontrolle"></div>
 <div class="vocab-controls">
 <p class="vocab-status" role="status" aria-live="polite"></p>
 <button class="primary vocab-reveal" type="button">Antwort aufdecken</button>
 <p class="vocab-swipe-hint" hidden>← Nicht gewusst · ↑ Mit Fehlern · Gewusst →</p>
 <div class="vocab-ratings" hidden><button type="button" data-grade="no" class="secondary">← Nicht gewusst</button><button type="button" data-grade="hard" class="secondary">↑ Mit Fehlern<small>Kommt gleich wieder</small></button><button type="button" data-grade="yes" class="primary">Gewusst →</button></div>
 <button class="secondary vocab-finish" type="button" hidden>Beenden</button>
 <button class="primary vocab-continue" type="button" hidden>Weiterlernen →</button>
 </div>
 <nav class="bottom-nav" aria-label="Hauptmenü"><button type="button" data-target="choiceHomeButton">⌂<small>Home</small></button><button type="button" data-target="choiceCardsButton" class="active">▣<small>Karten</small></button><button type="button" data-target="choiceProgressButton">▥<small>Statistiken</small></button><button type="button" data-target="choiceProfileButton">♙<small>Profil</small></button></nav>`;
 document.querySelector('main.app').append(panel);
 const $=selector=>panel.querySelector(selector),save=()=>storage.save('vocabulary',state);
 const management=document.createElement('section');management.className='profile-card vocab-management';
 management.innerHTML=`<h3>Deine Vokabelkarten</h3><details class="vocab-learned"><summary>Gelernte Karten nach SRS <span class="vocab-learned-count"></span></summary><div class="vocab-learned-list"></div></details>
 <details class="vocab-manager"><summary>Kurze Sätze hinzufügen und verwalten</summary><form class="vocab-add"><label>Deutsch (2–6 Wörter)<input name="front" required maxlength="70"></label><label>Englisch (2–6 Wörter)<input name="back" required maxlength="70"></label><button class="primary" type="submit">＋ Kurzen Satz hinzufügen</button></form><p class="vocab-archive"></p><div class="vocab-list"></div><p class="vocab-management-status" role="status"></p></details>`;
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
 button.innerHTML=vocabularyIcon+'<span><strong>Vokabeltrainer</strong><small>Deine kurzen Gesprächssätze · mit Wischen lernen</small></span><b aria-hidden="true">›</b>';
 document.getElementById('cardChoice').insertBefore(button,document.getElementById('freePracticeButton'));
 function refreshChoice(){
  const lesson=state.lesson,hasCards=(lesson?.ids?.length||0)+(lesson?.previousIds?.length||0)>0;
  const done=lesson?.day===calendarDayKey(new Date()) && hasCards && (lesson.closed || lesson.extraRound===true);
  button.classList[done?'add':'remove']('is-complete');
  button.querySelector('strong').textContent=done?'Vokabeltrainer ✓':'Vokabeltrainer';
  button.querySelector('small').textContent=done?(lesson.closed?'Tagesrunde geschafft! Freiwillig weiterlernen.':'Tagesziel geschafft · Zusatzrunde fortsetzen.'):'Deine kurzen Gesprächssätze · mit Wischen lernen';
 }
 function line(text,tag='p'){const node=document.createElement(tag);node.textContent=text;return node;}
 function say(text){if(!window.speechSynthesis)return;window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-GB';utterance.rate=.85;window.speechSynthesis.speak(utterance);}
 function wordView(word,answer=false){
  const box=$('.vocab-word');box.replaceChildren(line(word.front,'h3'));
  if(answer){const english=line(`🇬🇧 ${word.back} 🔊`,'button');english.type='button';english.className='ghost';english.setAttribute('aria-label','Englischen kurzen Satz anhören');english.onclick=()=>say(word.back);box.append(english);}
 }
 function progress(){
  const p=vocabularyRoundProgress(state),name=state.lesson?.extraRound?'Zusatzrunde':'Tagesrunde';
  $('.vocab-progress').textContent=`${name}: ${p.completed}/${p.total} Karten abgeschlossen · ${Math.floor((state.lesson?.activeMs||0)/60000)}/15 Min.`;
  $('.vocab-bar').max=p.total||1;$('.vocab-bar').value=p.completed;$('.vocab-bar').hidden=!p.total;
 }
 function renderLists(){
  const list=manage('.vocab-list'),learned=manage('.vocab-learned-list');list.replaceChildren();learned.replaceChildren();
  const known=state.words.filter(w=>w.stage>0 && w.lastRating==='yes').sort((a,b)=>a.nextReviewAt-b.nextReviewAt);
  manage('.vocab-learned-count').textContent=`(${known.length})`;
  for(const w of known){const row=line(`${w.front} – ${w.back} · SRS-Stufe ${w.stage} · wieder am ${new Date(w.nextReviewAt).toLocaleDateString('de-DE')}`);const audio=line('🔊 Anhören','button');audio.type='button';audio.className='ghost';audio.onclick=()=>say(w.back);row.append(audio);learned.append(row);}
  if(!known.length)learned.append(line('Noch keine Karte sicher erinnert. Nur Aufdecken zählt noch nicht: Erst vergleichen und ehrlich bewerten.'));
  for(const word of state.words){
   const row=document.createElement('div');row.append(line(`${word.front} – ${word.back}`,'span'));
   const remove=line('Entfernen','button');remove.type='button';remove.className='ghost';
   remove.onclick=()=>{if(!window.confirm('Diesen kurzen Satz entfernen?'))return;state={...state,words:state.words.filter(w=>w.id!==word.id),ignoredSourceIds:[...(state.ignoredSourceIds||[]),word.sourceCardId].filter(Boolean)};if(state.lesson){state.lesson.queue=state.lesson.queue.filter(i=>i.id!==word.id);state.lesson.ids=state.lesson.ids.filter(id=>id!==word.id);}answerCard=null;render();};
   row.append(remove);list.append(row);
  }
  manage('.vocab-archive').textContent=state.archivedWords?.length?`${state.archivedWords.length} frühere Wortkarten bleiben als Archiv gespeichert und erscheinen nicht mehr in der Satzrunde.`:'';
 }
 function render(){
  resetGesture();
  state=vocabularyLesson(state);
  if(!state.lesson.queue.length && !state.lesson.closed && !answerCard)state=finishVocabulary(state);
  save();progress();renderLists();refreshSettings();refreshChoice();
  const word=answerCard||state.words.find(w=>w.id===state.lesson.queue[0]?.id),ended=state.lesson.closed||!word;
  $('.vocab-reveal').hidden=ended||Boolean(answerCard);
  $('.vocab-ratings').hidden=ended||!answerCard;$('.vocab-swipe-hint').hidden=ended||!answerCard;
  $('.vocab-continue').hidden=!ended || !state.words.length;
  $('.vocab-finish').hidden=!ended;
  if(ended){
   $('.vocab-word').replaceChildren(line(!state.words.length?'Noch keine persönlichen Kurzsätze':state.lesson.activeMs>=900000?'Deine 15 Minuten sind geschafft!':'Runde geschafft!','h3'));
   $('.vocab-status').textContent=!state.words.length?'Führe ein Gespräch. Erkannte Schwierigkeiten werden danach automatisch als kurze Sätze übernommen.':'Dein SRS-Plan ist gespeichert. Mit „Weiterlernen“ startest du freiwillig eine weitere Runde – schwierige Karten zuerst.';return;
  }
  wordView(word,Boolean(answerCard));
  $('.vocab-status').textContent='';
 }
 function tick(){
  const now=Date.now(),delta=now-lastTick;lastTick=now;
  if(panel.classList.contains('hidden')||document.visibilityState!=='visible'||!state.lesson||state.lesson.closed)return;
  state.lesson.activeMs=Math.min(VOCABULARY_SECONDS*1000,state.lesson.activeMs+Math.max(0,delta));
  if(state.lesson.activeMs>=VOCABULARY_SECONDS*1000){answerCard=null;state=finishVocabulary(state);render();}
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
  state=rateVocabulary(state,rating);answerCard=null;onPractice();render();
 }
 function syncCards(){state=importConversationVocabulary(state,getCards());save();renderLists();refreshChoice();}
 button.onclick=()=>{syncCards();onOpen();panel.classList.remove('hidden');lastTick=Date.now();answerCard=null;render();};
 $('.vocab-back').onclick=()=>document.getElementById('choiceCardsButton').click();
 $('.vocab-finish').onclick=()=>{tick();save();window.speechSynthesis?.cancel();document.getElementById('choiceCardsButton').click();};
 panel.querySelectorAll('[data-target]').forEach(n=>n.onclick=()=>document.getElementById(n.dataset.target).click());
 panel.querySelectorAll('[data-grade]').forEach(n=>n.onclick=()=>rate(n.dataset.grade));
 $('.vocab-reveal').onclick=revealCurrent;
 $('.vocab-continue').onclick=()=>{syncCards();state=additionalVocabularyLesson(state);answerCard=null;lastTick=Date.now();render();if(state.lesson.closed && state.words.length)$('.vocab-status').textContent='Es gibt noch keine Wiederholungen. Im Profil kannst du neue Karten aktivieren (aktuell 0).';};
 function resetGesture(){gesture=null;const card=$('.vocab-word');card.dataset.swipe='';card.dataset.swipeLabel='';}
 const box=$('.vocab-word');
 box.addEventListener('pointerdown',e=>{if(gesture||(e.pointerType==='mouse' && e.button!==0))return;suppressSwipeClick=false;gesture={id:e.pointerId,x:e.clientX,y:e.clientY};(e.target.closest('button')||box).setPointerCapture?.(e.pointerId);});
 box.addEventListener('pointermove',e=>{
  if(!gesture||gesture.id!==e.pointerId||!answerCard)return;
  const rating=swipeRating(e.clientX-gesture.x,e.clientY-gesture.y);
  box.dataset.swipe=rating||'';
  box.dataset.swipeLabel=rating==='yes'?'Gewusst →':rating==='no'?'← Nicht gewusst':rating==='hard'?'↑ Gewusst, aber mit Fehlern':'';
 });
 box.addEventListener('pointerup',e=>{if(!gesture||gesture.id!==e.pointerId)return;const rating=swipeRating(e.clientX-gesture.x,e.clientY-gesture.y);resetGesture();suppressSwipeClick=Boolean(rating);if(rating)rate(rating);});
 // A drag over the English audio button grades; only a tap should play audio.
 box.addEventListener('click',e=>{if(suppressSwipeClick){suppressSwipeClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
 box.addEventListener('pointercancel',resetGesture);
 box.addEventListener('lostpointercapture',resetGesture);
 box.addEventListener('keydown',e=>{if(e.target!==box)return;if(e.key===' '||e.key==='Enter'){e.preventDefault();revealCurrent();}else if(['ArrowRight','ArrowLeft','ArrowUp'].includes(e.key)){e.preventDefault();rate(e.key==='ArrowRight'?'yes':e.key==='ArrowLeft'?'no':'hard');}});
 manage('.vocab-add').onsubmit=e=>{e.preventDefault();try{const data=new FormData(e.target);state=addVocabulary(state,data.get('front'),data.get('back'));save();e.target.reset();renderLists();manage('.vocab-management-status').textContent='Kurzer Satz gespeichert. Er kommt in eine kommende Tagesportion.';}catch(error){manage('.vocab-management-status').textContent=error.message;}};
 document.addEventListener('storycards-cards-updated',syncCards);
 document.addEventListener('storycards-card-choice-opened',refreshChoice);
 document.addEventListener('storycards-vocabulary-changed',()=>{state=personalVocabulary(storage.load('vocabulary',null)||initialVocabulary());answerCard=null;if(!panel.classList.contains('hidden'))render();else renderLists();});
 document.addEventListener('visibilitychange',()=>{lastTick=Date.now();});
 window.addEventListener('pagehide',tick);setInterval(tick,1000);syncCards();renderLists();
 return {panel};
}
