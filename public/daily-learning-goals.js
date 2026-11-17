import {calendarDayKey} from './learning-streak.js';
import {initialVocabulary,vocabularyLesson} from './vocabulary.js';

// Read-only projection of the existing rounds. Opening Home never completes one.
export function dailyLearningGoals({stats={},minutes=10,lesson={},vocabulary={},now=new Date()}){
 const day=calendarDayKey(now),date=new Date(now),lessonDay=`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
 const target=Math.max(1,Math.min(60,Number(minutes)||10))*60;
 const seconds=stats.speakingGoal?.day===day?Math.max(0,Number(stats.speakingGoal.usedSeconds)||0):0;
 const plan=lesson.day===lessonDay?lesson:{};
 const ids=[...new Set(plan.plannedIds||[])],completed=new Set(plan.completed||[]);
 const remaining=ids.filter(id=>!completed.has(id)).length+(plan.pendingRetries||[]).length;
 const state=vocabularyLesson({...initialVocabulary(),...vocabulary,words:Array.isArray(vocabulary.words)?vocabulary.words:[]},Number(date));
 const round=state.lesson,history=(state.history||[]).find(item=>item.day===day&&item.reviews>0);
 const available=round.ids.length>0||Boolean(history),vocabDone=Boolean(history&&(round.extraRound||round.closed));
 const rows=[
  {id:'speaking',label:'Sprechen',done:seconds>=target,detail:`${Math.min(Math.floor(seconds/60),target/60)} / ${target/60} Min.`,available:true},
  {id:'cards',label:'Tageslektion & Wiederholungen',done:remaining===0,detail:ids.length?`${ids.length-ids.filter(id=>!completed.has(id)).length} / ${ids.length} Karten${(plan.pendingRetries||[]).length?' · Wiederholung offen':''}`:'Keine Karten fällig',available:ids.length>0},
  {id:'vocabulary',label:'Vokabeltrainer',done:!available||vocabDone,detail:vocabDone?'Tagesrunde geschafft':available?`${round.rated?.length||0} / ${round.ids.length} Karten`:'Keine Vokabeln fällig',available}
 ];
 const complete=rows.every(row=>row.done);
 const extraVocabulary=round.extraRound===true&&round.closed===true&&round.ids.length>0&&round.queue.length===0&&round.reviewCount>=round.ids.length;
 return {day,rows,completed:rows.filter(row=>row.done).length,total:rows.length,complete,bonus:complete&&(seconds>=target*2||extraVocabulary)};
}
