import {calendarDayKey} from './learning-streak.js';
import {quickToday,dailyAmount} from './quick-learning.js';

export function speakingGoal(stats, minutes, now=new Date()) {
  const day=calendarDayKey(now),normal=Math.max(1,Math.min(60,Number(minutes)||10)),quick=quickToday(stats,now),duration=dailyAmount(normal,quick)*60;
  const previous=stats.speakingGoal;
  const mode=quick||previous?.quick!==undefined?{quick,normalMinutes:normal}:{};
  if(previous?.day!==day) return {day,minutes:duration/60,usedSeconds:0,allowedSeconds:duration,...(quick?mode:{})};
  const usedSeconds=Math.max(0,Number(previous.usedSeconds)||0);
  const modeChanged=Boolean(previous.quick)!==quick&&(previous.normalMinutes||previous.minutes)===normal;
  const allowedSeconds=modeChanged?Math.max(usedSeconds,duration):previous.minutes===duration/60 ? Math.max(usedSeconds,Number(previous.allowedSeconds)||duration) : usedSeconds+duration;
  return {day,minutes:duration/60,usedSeconds,allowedSeconds,...mode};
}
export function remainingSpeakingSeconds(stats,minutes,now=new Date()) {
  const goal=speakingGoal(stats,minutes,now);
  return Math.max(0,Math.floor(goal.allowedSeconds-goal.usedSeconds));
}
export function addSpeakingSeconds(stats,minutes,seconds,now=new Date()) {
  const goal=speakingGoal(stats,minutes,now);
  goal.usedSeconds=Math.min(goal.allowedSeconds,goal.usedSeconds+Math.max(0,Number(seconds)||0));
  return {...stats,speakingGoal:goal};
}
export function approveAnotherSpeakingLesson(stats,minutes,now=new Date()) {
  const goal=speakingGoal(stats,minutes,now);
  goal.allowedSeconds=Math.max(goal.usedSeconds,goal.allowedSeconds)+goal.minutes*60;
  return {...stats,speakingGoal:goal};
}
