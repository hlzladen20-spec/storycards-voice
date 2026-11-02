import {initialVocabulary,personalVocabulary,importConversationVocabulary,addVocabulary,vocabularyLesson,rateVocabulary,finishVocabulary,vocabularyProgress,swipeRating,setVocabularySettings,VOCABULARY_SECONDS} from './vocabulary.js';

export function setupVocabularyTrainer({storage,onOpen,onPractice,getCards=()=>[]}) {
 let state=personalVocabulary(storage.load('vocabulary',null)||initialVocabulary()),answerCard=null,lastTick=Date.now(),gesture=null;
 const panel=document.createElement('section');panel.id='vocabulary';panel.className='panel hidden vocabulary-trainer';
 panel.innerHTML=`<button class="ghost vocab-back" type="button">← Zurück zu den Karten</button><p class="eyebrow">DEINE PERSÖNLICHEN KURZSÄTZE</p><h2>Vokabeltrainer</h2>
 <p>Aus erkannten Schwierigkeiten deiner Gespräche · höchstens 6 Wörter pro Satz.</p>
 <p class="vocab-progress" role="status"></p><progress class="vocab-bar" aria-label="Heute nach SRS gelernt" max="15" value="0"></progress>
 <div class="vocab-word" tabindex="0" aria-label="Kurzer Satz: rechts gewusst, links nicht gewusst"></div>
 <p class="vocab-swipe-hint">← Nicht gewusst · Gewusst →</p>
 <div class="vocab-ratings"><button type="button" data-grade="no" class="secondary">← Nicht gewusst</button><button type="button" data-grade="yes" class="primary">Gewusst →</button></div>
 <button class="primary vocab-next" type="button" hidden>Weiter – noch einmal ohne Hilfe</button>
 <p class="vocab-status" role="status" aria-live="polite"></p>
 <details class="vocab-learned"><summary>Gelernte Karten nach SRS <span class="vocab-learned-count"></span></summary><div class="vocab-learned-list"></div></details>
 <details class="vocab-manager"><summary>Kurze Sätze hinzufügen und verwalten</summary><form class="vocab-add"><label>Deutsch (2–6 Wörter)<input name="front" required maxlength="70"></label><label>Englisch (2–6 Wörter)<input name="back" required maxlength="70"></label><button class="primary" type="submit">＋ Kurzen Satz hinzufügen</button></form><p class="vocab-archive"></p><div class="vocab-list"></div></details>
 <nav class="bottom-nav" aria-label="Hauptmenü"><button type="button" data-target="choiceHomeButton">⌂<small>Home</small></button><button type="button" data-target="choiceCardsButton" class="active">▣<small>Karten</small></button><button type="button" data-target="choiceProgressButton">▥<small>Statistiken</small></button><button type="button" data-target="choiceProfileButton">♙<small>Profil</small></button></nav>`;
 document.querySelector('main.app').append(panel);
 const $=selector=>panel.querySelector(selector),save=()=>storage.save('vocabulary',state);
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
 button.innerHTML='<span><strong>Vokabeltrainer</strong><small>Deine kurzen Gesprächssätze · mit Wischen lernen</small></span><b aria-hidden="true">›</b>';
 document.getElementById('cardChoice').insertBefore(button,document.getElementById('cardChoice').querySelector('nav'));
 function line(text,tag='p'){const node=document.createElement(tag);node.textContent=text;return node;}
 function say(text){if(!window.speechSynthesis)return;speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-GB';utterance.rate=.85;speechSynthesis.speak(utterance);}
 function wordView(word,answer=false){
  const box=$('.vocab-word');box.replaceChildren(line(word.front,'h3'));
  if(answer){const english=line(`🇬🇧 ${word.back} 🔊`,'button');english.type='button';english.className='ghost';english.setAttribute('aria-label','Englischen kurzen Satz anhören');english.onclick=()=>say(word.back);box.append(english);}
 }
 function progress(){
  const p=vocabularyProgress(state);$('.vocab-progress').textContent=`Heute ${p.learned}/${p.total} Vokabelkarten gelernt · ${Math.floor((state.lesson?.activeMs||0)/60000)}/15 Minuten`;
  $('.vocab-bar').max=p.total||1;$('.vocab-bar').value=p.learned;
 }
 function renderLists(){
  const list=$('.vocab-list'),learned=$('.vocab-learned-list');list.replaceChildren();learned.replaceChildren();
  const known=state.words.filter(w=>w.stage>0 && w.lastRating==='yes').sort((a,b)=>a.nextReviewAt-b.nextReviewAt);
  $('.vocab-learned-count').textContent=`(${known.length})`;
  for(const w of known){const row=line(`${w.front} – ${w.back} · SRS-Stufe ${w.stage} · wieder am ${new Date(w.nextReviewAt).toLocaleDateString('de-DE')}`);const audio=line('🔊 Anhören','button');audio.type='button';audio.className='ghost';audio.onclick=()=>say(w.back);row.append(audio);learned.append(row);}
  if(!known.length)learned.append(line('Noch keine Karte sicher erinnert. Aufgedeckte Lösungen zählen nicht als gelernt.'));
  for(const word of state.words){
   const row=document.createElement('div');row.append(line(`${word.front} – ${word.back}`,'span'));
   const remove=line('Entfernen','button');remove.type='button';remove.className='ghost';
   remove.onclick=()=>{if(!window.confirm('Diesen kurzen Satz entfernen?'))return;state={...state,words:state.words.filter(w=>w.id!==word.id),ignoredSourceIds:[...(state.ignoredSourceIds||[]),word.sourceCardId].filter(Boolean)};if(state.lesson){state.lesson.queue=state.lesson.queue.filter(i=>i.id!==word.id);state.lesson.ids=state.lesson.ids.filter(id=>id!==word.id);}answerCard=null;render();};
   row.append(remove);list.append(row);
  }
  $('.vocab-archive').textContent=state.archivedWords?.length?`${state.archivedWords.length} frühere Wortkarten bleiben als Archiv gespeichert und erscheinen nicht mehr in der Satzrunde.`:'';
 }
 function render(){
  state=vocabularyLesson(state);
  if(!state.lesson.queue.length && !state.lesson.closed && !answerCard)state=finishVocabulary(state);
  save();progress();renderLists();refreshSettings();
  const word=answerCard||state.words.find(w=>w.id===state.lesson.queue[0]?.id),ended=state.lesson.closed||!word;
  $('.vocab-ratings').hidden=ended||Boolean(answerCard);$('.vocab-next').hidden=ended||!answerCard;$('.vocab-swipe-hint').hidden=ended||Boolean(answerCard);
  if(ended){
   $('.vocab-word').replaceChildren(line(!state.words.length?'Noch keine persönlichen Kurzsätze':state.lesson.activeMs>=900000?'Deine 15 Minuten sind geschafft!':'Runde geschafft!','h3'));
   $('.vocab-status').textContent=!state.words.length?'Führe ein Gespräch. Erkannte Schwierigkeiten werden danach automatisch als kurze Sätze übernommen.':'Dein SRS-Plan ist gespeichert. Schwierige Karten bleiben früher fällig.';return;
  }
  wordView(word,Boolean(answerCard));
  $('.vocab-status').textContent=answerCard?'Höre die englische Lösung an und sprich sie nach. Danach geht es ohne sichtbare Lösung weiter.':'Übersetze im Kopf oder sprich den Satz. Rechts: ohne Hilfe gewusst. Links: Lösung lernen.';
 }
 function tick(){
  const now=Date.now(),delta=now-lastTick;lastTick=now;
  if(panel.classList.contains('hidden')||document.visibilityState!=='visible'||!state.lesson||state.lesson.closed)return;
  state.lesson.activeMs=Math.min(VOCABULARY_SECONDS*1000,state.lesson.activeMs+Math.max(0,delta));
  if(state.lesson.activeMs>=VOCABULARY_SECONDS*1000){answerCard=null;state=finishVocabulary(state);render();}
  else{save();progress();}
 }
 function rate(rating){
  tick();if(answerCard||state.lesson?.closed)return;
  const word=state.words.find(w=>w.id===state.lesson.queue[0]?.id);if(!word)return;
  state=rateVocabulary(state,rating);onPractice();if(rating==='no')answerCard=word;render();
 }
 function syncCards(){state=importConversationVocabulary(state,getCards());save();}
 button.onclick=()=>{syncCards();onOpen();panel.classList.remove('hidden');lastTick=Date.now();answerCard=null;render();};
 $('.vocab-back').onclick=()=>document.getElementById('choiceCardsButton').click();
 panel.querySelectorAll('[data-target]').forEach(n=>n.onclick=()=>document.getElementById(n.dataset.target).click());
 panel.querySelectorAll('[data-grade]').forEach(n=>n.onclick=()=>rate(n.dataset.grade));
 $('.vocab-next').onclick=()=>{answerCard=null;render();};
 const box=$('.vocab-word');
 box.addEventListener('pointerdown',e=>{if(e.button!==0||answerCard)return;gesture={id:e.pointerId,x:e.clientX,y:e.clientY};box.setPointerCapture?.(e.pointerId);});
 box.addEventListener('pointerup',e=>{if(!gesture||gesture.id!==e.pointerId)return;const rating=swipeRating(e.clientX-gesture.x,e.clientY-gesture.y);gesture=null;if(rating)rate(rating);});
 box.addEventListener('pointercancel',()=>{gesture=null;});
 box.addEventListener('keydown',e=>{if(e.target!==box)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();rate(e.key==='ArrowRight'?'yes':'no');}});
 $('.vocab-add').onsubmit=e=>{e.preventDefault();try{const data=new FormData(e.target);state=addVocabulary(state,data.get('front'),data.get('back'));save();e.target.reset();renderLists();$('.vocab-status').textContent='Kurzer Satz gespeichert. Er kommt in eine kommende Tagesportion.';}catch(error){$('.vocab-status').textContent=error.message;}};
 document.addEventListener('storycards-cards-updated',syncCards);
 document.addEventListener('visibilitychange',()=>{lastTick=Date.now();});
 window.addEventListener('pagehide',tick);setInterval(tick,1000);syncCards();
 return {panel};
}
