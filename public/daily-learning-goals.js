import {calendarDayKey} from './learning-streak.js';
import {initialVocabulary,vocabularyLesson,vocabularyDailyProgress} from './vocabulary.js';
import {quickToday,dailyAmount} from './quick-learning.js';

// Read-only projection of the existing rounds. Opening Home never completes one.
export function dailyLearningGoals({stats={},minutes=10,lesson={},vocabulary={},now=new Date(),sentencePractice=true}){
 const day=calendarDayKey(now),date=new Date(now),lessonDay=`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
 const target=dailyAmount(Math.max(1,Math.min(60,Number(minutes)||10)),quickToday(stats,now))*60;
 const seconds=stats.speakingGoal?.day===day?Math.max(0,Number(stats.speakingGoal.usedSeconds)||0):0;
 const plan=lesson.day===lessonDay?lesson:{};
 const ids=[...new Set(plan.plannedIds||[])],completed=new Set(plan.completed||[]);
 const remaining=ids.filter(id=>!completed.has(id)).length+(plan.pendingRetries||[]).length;
 const state=vocabularyLesson({...initialVocabulary(),...vocabulary,quickModeDay:stats.quickModeDay,words:Array.isArray(vocabulary.words)?vocabulary.words:[]},Number(date));
 const round=state.lesson,vocab=vocabularyDailyProgress(state,now);
 const available=vocab.hasWork,vocabDone=vocab.done;
 const rows=[
  {id:'speaking',label:'Sprechen',done:seconds>=target,detail:`${Math.min(Math.floor(seconds/60),target/60)} / ${target/60} Min.`,available:true},
  ...(sentencePractice?[{id:'cards',label:'Tageslektion & Wiederholungen',done:remaining===0,detail:ids.length?`${ids.length-ids.filter(id=>!completed.has(id)).length} / ${ids.length} Karten${(plan.pendingRetries||[]).length?' · Wiederholung offen':''}`:'Keine Karten fällig',available:ids.length>0}]:[]),
  {id:'vocabulary',label:'Vokabeltrainer',done:!available||vocabDone,detail:vocabDone?'Tagesrunde geschafft':available?`${vocab.completed} / ${vocab.total} Karten erledigt${vocab.repetitions?' · Wiederholungen offen':''}`:'Keine Vokabeln fällig',available}
 ];
 const complete=rows.every(row=>row.done);
 const extraVocabulary=round.extraRound===true&&!round.countsAsDaily&&round.closed===true&&round.ids.length>0&&round.queue.length===0&&round.reviewCount>=round.ids.length;
 return {day,rows,completed:rows.filter(row=>row.done).length,total:rows.length,complete,bonus:complete&&(seconds>=target*2||extraVocabulary)};
}
