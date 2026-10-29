import {calendarDayKey} from './learning-streak.js';

export function speakingGoal(stats, minutes, now=new Date()) {
  const day=calendarDayKey(now), duration=Math.max(1,Math.min(60,Number(minutes)||10))*60;
  const previous=stats.speakingGoal;
  if(previous?.day!==day) return {day,minutes:duration/60,usedSeconds:0,allowedSeconds:duration};
  const usedSeconds=Math.max(0,Number(previous.usedSeconds)||0);
  const allowedSeconds=previous.minutes===duration/60 ? Math.max(usedSeconds,Number(previous.allowedSeconds)||duration) : usedSeconds+duration;
  return {day,minutes:duration/60,usedSeconds,allowedSeconds};
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
