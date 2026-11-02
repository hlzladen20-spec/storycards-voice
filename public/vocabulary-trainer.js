import {initialVocabulary,addVocabulary,vocabularyLesson,introduceVocabulary,rateVocabulary,finishVocabulary,VOCABULARY_SECONDS} from './vocabulary.js';

export function setupVocabularyTrainer({storage,onOpen,onPractice}) {
 let state=storage.load('vocabulary',null)||initialVocabulary(),revealed=false,independent=false,lastTick=Date.now();
 const panel=document.createElement('section');panel.id='vocabulary';panel.className='panel hidden vocabulary-trainer';
 panel.innerHTML=`<button class="ghost vocab-back" type="button">← Zurück zu den Karten</button><p class="eyebrow">WÖRTER SCHRITT FÜR SCHRITT</p><h2>Dein Vokabeltrainer</h2>
 <p>Erinnern statt nur lesen: am nächsten Tag, nach 3 Tagen, nach einer Woche. Vergessenes kommt früher zurück.</p>
 <p class="vocab-progress" role="status"></p><div class="vocab-word"></div>
 <form class="vocab-answer"><label>Englisches Wort aus dem Gedächtnis<input name="answer" autocomplete="off" autocapitalize="none" spellcheck="false"></label><button class="secondary" type="submit">Antwort aufdecken</button></form>
 <button class="primary vocab-introduce" type="button">Gelernt – später ohne Hilfe versuchen</button>
 <div class="vocab-ratings"><button type="button" data-grade="no" class="secondary">Nicht gewusst</button><button type="button" data-grade="hard" class="secondary">Unsicher</button><button type="button" data-grade="yes" class="primary">Gewusst</button></div>
 <p class="vocab-status" role="status" aria-live="polite"></p>
 <details class="vocab-manager"><summary>Wörter hinzufügen und verwalten</summary><form class="vocab-add"><label>Deutsch<input name="front" required maxlength="160"></label><label>Englisch<input name="back" required maxlength="160"></label><button class="primary" type="submit">＋ Wort hinzufügen</button></form><div class="vocab-list"></div></details>
 <nav class="bottom-nav" aria-label="Hauptmenü"><button type="button" data-target="choiceHomeButton">⌂<small>Home</small></button><button type="button" data-target="choiceCardsButton" class="active">▣<small>Karten</small></button><button type="button" data-target="choiceProgressButton">▥<small>Statistiken</small></button><button type="button" data-target="choiceProfileButton">♙<small>Profil</small></button></nav>`;
 document.querySelector('main.app').append(panel);
 const $=selector=>panel.querySelector(selector),save=()=>storage.save('vocabulary',state);
 const button=document.createElement('button');button.type='button';button.className='card-choice-option';button.id='vocabularyChoiceButton';
 button.innerHTML='<span><strong>Vokabeltrainer</strong><small>Neue Wörter und passende Wiederholungen · bis zu 15 Minuten</small></span><b aria-hidden="true">›</b>';
 document.getElementById('cardChoice').insertBefore(button,document.getElementById('cardChoice').querySelector('nav'));
 function say(text,lang) {
  if(!window.speechSynthesis) return;
  speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang=lang;utterance.rate=.85;speechSynthesis.speak(utterance);
 }
 function line(text,tag='p') {const node=document.createElement(tag);node.textContent=text;return node;}
 function wordView(word,answer=false) {
  const box=$('.vocab-word');box.replaceChildren(line(word.front,'h3'));
  if(answer) {
   const english=line(`🇬🇧 ${word.back}`,'button');english.type='button';english.className='ghost';english.title='Englisches Wort vorlesen';english.textContent+=' 🔊';english.onclick=()=>say(word.back,'en-GB');box.append(english);
   if(word.example) box.append(line(word.example));
  }
 }
 function renderList() {
  const list=$('.vocab-list');list.replaceChildren();
  for(const word of state.words) {
   const row=document.createElement('div');row.append(line(`${word.front} – ${word.back} · ${word.attempts?`Wiederholung: ${new Date(word.nextReviewAt).toLocaleDateString('de-DE')}`:'neu'}`,'span'));
   const remove=line('Entfernen','button');remove.type='button';remove.className='ghost';
   remove.onclick=()=>{if(!window.confirm(`„${word.back}“ aus dem Vokabeltrainer entfernen?`))return;state={...state,words:state.words.filter(w=>w.id!==word.id)};if(state.lesson)state.lesson.queue=state.lesson.queue.filter(item=>item.id!==word.id);save();renderList();render();};
   row.append(remove);list.append(row);
  }
 }
 function render() {
  state=vocabularyLesson(state);revealed=false;independent=false;$('.vocab-answer').reset();
  if(!state.lesson.queue.length && !state.lesson.closed) state=finishVocabulary(state);
  save();const lesson=state.lesson,item=lesson.queue[0],word=state.words.find(w=>w.id===item?.id);
  const done=lesson.ids.filter(id=>lesson.rated.includes(id)).length;
  $('.vocab-progress').textContent=`${done} von ${lesson.ids.length} Wörtern · ${Math.floor(lesson.activeMs/60000)} / 15 Minuten · bis zu ${state.newLimit} neue Wörter pro Tag`;
  const ended=lesson.closed || !word;
  $('.vocab-answer').hidden=ended || Boolean(item?.introduce);$('.vocab-introduce').hidden=ended || !item?.introduce;$('.vocab-ratings').hidden=true;
  if(ended) {
   $('.vocab-word').replaceChildren(line(lesson.activeMs>=VOCABULARY_SECONDS*1000?'Deine 15 Minuten sind geschafft!':'Für heute geschafft!','h3'),line('Deine nächsten Wiederholungen sind gespeichert. Morgen geht es weiter.'));
   $('.vocab-status').textContent='Wörter kannst du unten jederzeit ergänzen. Neue Wörter verlängern die heutige Runde nicht.';return;
  }
  wordView(word,item.introduce);
  $('.vocab-status').textContent=item.introduce?'Höre dir das neue Wort an und lerne es kennen. Später versuchst du es ohne Hilfe.':item.retry?'Noch einmal ohne Hilfe: Dieses Wort war gerade schwierig.':'Versuche erst, dich selbst zu erinnern. Mit Aufdecken allein gilt ein Wort noch nicht als gewusst.';
 }
 function tick() {
  const now=Date.now(),delta=now-lastTick;lastTick=now;
  if(panel.classList.contains('hidden') || document.visibilityState!=='visible' || !state.lesson || state.lesson.closed) return;
  state.lesson.activeMs=Math.min(VOCABULARY_SECONDS*1000,state.lesson.activeMs+Math.max(0,delta));
  if(state.lesson.activeMs>=VOCABULARY_SECONDS*1000) {state=finishVocabulary(state);render();}
  else {save();$('.vocab-progress').textContent=`${state.lesson.ids.filter(id=>state.lesson.rated.includes(id)).length} von ${state.lesson.ids.length} Wörtern · ${Math.floor(state.lesson.activeMs/60000)} / 15 Minuten · bis zu ${state.newLimit} neue Wörter pro Tag`;}
 }
 button.onclick=()=>{onOpen();panel.classList.remove('hidden');lastTick=Date.now();render();renderList();};
 $('.vocab-back').onclick=()=>document.getElementById('choiceCardsButton').click();
 panel.querySelectorAll('[data-target]').forEach(node=>node.onclick=()=>document.getElementById(node.dataset.target).click());
 $('.vocab-introduce').onclick=()=>{tick();if(state.lesson.closed)return;state=introduceVocabulary(state);onPractice();render();};
 $('.vocab-answer').onsubmit=event=>{
  event.preventDefault();tick();if(state.lesson.closed)return;
  const word=state.words.find(w=>w.id===state.lesson.queue[0]?.id);if(!word || revealed)return;
  independent=Boolean($('.vocab-answer input').value.trim());revealed=true;wordView(word,true);
  if(independent) $('.vocab-word').append(line(`Deine Antwort: ${$('.vocab-answer input').value.trim()}`));
  $('.vocab-answer').hidden=true;$('.vocab-ratings').hidden=false;
  panel.querySelector('[data-grade=yes]').disabled=!independent;panel.querySelector('[data-grade=hard]').disabled=!independent;
  $('.vocab-status').textContent=independent?'Vergleiche deine Antwort mit der Lösung und bewerte ehrlich, wie sicher du warst.':'Mit Hilfe aufgedeckt: Sprich das Wort nach. Es bleibt als noch nicht gewusst vorgemerkt.';
 };
 panel.querySelectorAll('[data-grade]').forEach(node=>node.onclick=()=>{tick();if(!revealed || state.lesson.closed || (!independent && node.dataset.grade!=='no'))return;state=rateVocabulary(state,node.dataset.grade);onPractice();render();});
 $('.vocab-add').onsubmit=event=>{
  event.preventDefault();try{const data=new FormData(event.target);state=addVocabulary(state,data.get('front'),data.get('back'));save();event.target.reset();renderList();$('.vocab-status').textContent='Wort gespeichert. Es kommt in eine kommende Tagesportion.';}catch(error){$('.vocab-status').textContent=error.message;}
 };
 document.addEventListener('storycards-save-vocabulary',event=>{
  try{state=addVocabulary(state,event.detail.front,event.detail.back,event.detail.example);save();event.detail.onResult?.('Im Vokabeltrainer gespeichert');}
  catch(error){event.detail.onResult?.(error.message);}
 });
 // Reset the sampling point on return: background time is not learning time.
 document.addEventListener('visibilitychange',()=>{lastTick=Date.now();});
 window.addEventListener('pagehide',tick);setInterval(tick,1000);save();
 return {panel};
}
