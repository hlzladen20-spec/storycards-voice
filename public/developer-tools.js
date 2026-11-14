import {calendarDayKey} from './learning-streak.js';
import {speakingGoal} from './speaking-goal.js';
import {confirmDialog} from './app-dialog.js';

// Reset only daily gates. Never rewrite cards, review dates or historical results.
export function resetDailyState({stats,lesson,vocabulary},{minutes,now=new Date()}){
 const day=calendarDayKey(now),date=new Date(now);
 const lessonDay=`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
 const nextStats={...stats,speakingGoal:speakingGoal({},minutes,now)};
 const nextLesson=lesson?.day===lessonDay && lesson.plannedIds?.length
  ? {...lesson,completed:[],introduced:[],retryUsed:0,retriedIds:[],pendingRetries:[],results:{},weakCompleted:false}
  : {};
 let nextVocabulary=vocabulary;
 if(vocabulary){
  const previous=vocabulary.lesson,available=new Set(vocabulary.words.map(word=>word.id));
  const ids=previous?.day===day?[...new Set(previous.ids||[])].filter(id=>available.has(id)):[];
  nextVocabulary={...vocabulary,lesson:ids.length?{day,ids,queue:ids.map(id=>({id})),introduced:[],rated:[],retryIds:[],activeMs:0,reviewCount:0,correctCount:0,closed:false}:null};
 }
 return {stats:nextStats,lesson:nextLesson,vocabulary:nextVocabulary};
}

export function setupDeveloperTools({profile,deviceStorage,isBusy,onReset,confirm=message=>confirmDialog({title:'Heutigen Lernstand zurücksetzen?',message,confirmText:'Heute zurücksetzen',danger:true})}){
 const area=document.createElement('details');area.className='profile-card developer-tools';
 area.innerHTML=`<summary>Entwicklerwerkzeuge</summary>
 <label><input type="checkbox" class="developer-enabled"> Entwicklermodus auf diesem Gerät aktivieren</label>
 <p>Nur zum Testen: Heutige Sprechzeit, Tageslektion und Vokabelrunde erneut freigeben. Statistik, Lernserie, Niveau, Karten und SRS-Termine bleiben erhalten. Weitere Testübungen zählen normal zur Statistik. Gilt für das aktuell geöffnete Konto und die Lernsprache, auch bei der Synchronisierung.</p>
 <button type="button" class="secondary developer-reset" disabled>Heutigen Lernstand zurücksetzen</button>
 <p class="developer-status" role="status" aria-live="polite"></p>`;
 profile.insertBefore(area,profile.querySelector('nav'));
 const enabled=area.querySelector('.developer-enabled'),button=area.querySelector('.developer-reset'),status=area.querySelector('.developer-status');
 // Local opt-in, not an administrator permission or a server-side access control.
 enabled.checked=deviceStorage.getItem('storycards-developer-mode')==='on';
 button.disabled=!enabled.checked;
 enabled.onchange=()=>{deviceStorage.setItem('storycards-developer-mode',enabled.checked?'on':'off');button.disabled=!enabled.checked;status.textContent='';};
 button.onclick=async()=>{
  if(!enabled.checked)return;
  if(isBusy()){status.textContent='Bitte zuerst das laufende Gespräch, die Aufnahme oder die Auswertung beenden.';return;}
  if(!await confirm('Sprechzeit, Tageslektion und Vokabelrunde starten erneut. Statistik, Lernserie, Niveau, Karten und Wiederholungstermine bleiben erhalten.'))return;
  if(!enabled.checked)return;
  if(isBusy()){status.textContent='Der Lernstand wird gerade verwendet. Bitte erst den laufenden Vorgang beenden.';return;}
  try{onReset();status.textContent='✓ Heute wieder freigeschaltet. Statistik und langfristiger Lernfortschritt sind unverändert.';}
  catch{status.textContent='Der Tagesstand konnte nicht vollständig gespeichert werden. Bitte prüfe den Gerätespeicher und versuche es erneut.';}
 };
 return {area};
}
