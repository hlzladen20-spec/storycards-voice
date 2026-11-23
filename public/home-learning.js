import {APP_FEATURES} from './app-features.js';
import {calendarDayKey} from './learning-streak.js';
import {speakingGoal} from './speaking-goal.js';
import {initialVocabulary,vocabularyLesson,vocabularyDailyProgress,vocabularySessionSeconds} from './vocabulary.js';
import {learningPace} from './learning-plan.js';
const clock=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
export function todayLearningOverview({stats={},minutes=10,vocabulary={},lesson={},sentencePractice=APP_FEATURES.sentencePractice,exactVocabularyTarget=APP_FEATURES.exactVocabularyTarget,coach='Emma',now=new Date()}={}){
 const day=calendarDayKey(now),goal=speakingGoal(stats,minutes,now);
 const state=vocabularyLesson({...initialVocabulary(),...vocabulary,fillDailyLimit:exactVocabularyTarget||vocabulary.fillDailyLimit===true,words:Array.isArray(vocabulary.words)?vocabulary.words:[],quickModeDay:stats.quickModeDay},Number(now));
 const progress=vocabularyDailyProgress(state,now),round=state.lesson;
 const available=new Set(state.words.map(word=>word.id));
 let count=new Set((round.ids||[]).filter(id=>available.has(id))).size;
 if(round.extraRound){
  const daily=(state.history||[]).find(row=>row.day===day&&row.finished);
  if(daily)count=Math.max(0,Number(daily.planned)||0);
  else count=new Set((round.previousIds||[]).filter(id=>available.has(id))).size;
 }
 const {vocabularySeconds,cardSeconds}=learningPace({stats,vocabulary:state});
 const vocabSeconds=Math.min(count*vocabularySeconds,vocabularySessionSeconds(state,now));
 const cardCount=sentencePractice?new Set(lesson.plannedIds||[]).size:0;
 const totalMinutes=Math.ceil(goal.minutes+(vocabSeconds+cardCount*cardSeconds)/60);
 const used=Math.max(0,Number(goal.usedSeconds)||0),target=goal.minutes*60,complete=used>=target;
 return {totalMinutes,speakingMinutes:goal.minutes,vocabularyCount:count,vocabularyDone:progress.done,cardCount,usedSeconds:used,targetSeconds:target,progress:Math.min(1,used/target),clock:clock(used),targetLabel:`von ${goal.minutes} Min.`,speakingComplete:complete,complete:complete&&(!progress.hasWork||progress.done),description:`${goal.minutes} Min. mit ${coach}${count?` · ${count} Vokabel${count===1?'':'n'}`:' · keine Vokabeln fällig'}${cardCount?` · ${cardCount} Satzkarten`:''}`};
}
export function renderHomeLearning(host,view){
 if(!host)return;
 host.querySelector('.home-today').textContent='Dein Lernplan heute · ca.';
 host.querySelector('h2').textContent=view.totalMinutes+' Minuten';
 host.querySelector('.home-plan-details').textContent=view.description;
 const ring=host.querySelector('.home-countdown');
 ring.querySelector('strong').textContent=view.clock;ring.querySelector('small').textContent=view.targetLabel;
 ring.style.setProperty('--speaking-progress',view.progress*360+'deg');
 ring.setAttribute('aria-valuemin','0');ring.setAttribute('aria-valuemax',String(view.targetSeconds));ring.setAttribute('aria-valuenow',String(Math.min(view.targetSeconds,view.usedSeconds)));
 ring.setAttribute('aria-valuetext',`${view.clock} Gesprächszeit heute · Ziel ${view.speakingMinutes} Minuten${view.speakingComplete?' erreicht':''}`);
 host.querySelector('.home-speaking-progress').setAttribute('data-complete',String(view.speakingComplete));
 host.querySelector('.home-speaking-check').hidden=!view.speakingComplete;
}
