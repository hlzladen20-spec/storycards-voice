import {addPracticeDay,calendarDayKey,learningStreak} from './learning-streak.js';

export const DAILY_POINTS=5;
const LEGACY_POINTS=10,POINTS_CHANGE_DAY='2026-11-24';
const newAward=day=>day<POINTS_CHANGE_DAY?LEGACY_POINTS:DAILY_POINTS;
export const STREAK_RESCUE_COST=30;
export const QUICK_DAY_COST=20;
function days(values){return [...new Set((Array.isArray(values)?values:[]).filter(day=>typeof day==='string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && calendarDayKey(`${day}T12:00:00`)===day))].sort();}
function dayBefore(now,offset){const date=new Date(now);date.setHours(12,0,0,0);date.setDate(date.getDate()-offset);return calendarDayKey(date);}
function ledger(stats){const data=stats.streakRewards||{};return {earnedDays:days(data.earnedDays),...(data.bonusDays?{bonusDays:days(data.bonusDays)}:{}),...(data.earnedValues?{earnedValues:{...data.earnedValues}}:{}),...(data.bonusValues?{bonusValues:{...data.bonusValues}}:{}),...(data.quickDays?{quickDays:days(data.quickDays)}:{}),protectedDays:days(data.protectedDays),declinedDays:days(data.declinedDays)};}
const recordedValue=(data,key,day)=>[DAILY_POINTS,LEGACY_POINTS].includes(data[key]?.[day])?data[key][day]:LEGACY_POINTS;
export function rewardEarnedOnDay(stats,day){
 const data=ledger(stats);if(!data.earnedDays.includes(day)||!days(stats.practiceDays).includes(day))return 0;
 return recordedValue(data,'earnedValues',day)+((data.bonusDays||[]).includes(day)?recordedValue(data,'bonusValues',day):0);
}
export function rewardBalance(stats,now=new Date()){
 const today=calendarDayKey(now),actual=new Set(days(stats.practiceDays)),data=ledger(stats);
 const earned=data.earnedDays.filter(day=>day<=today&&actual.has(day)).reduce((sum,day)=>sum+recordedValue(data,'earnedValues',day),0),bonus=(data.bonusDays||[]).filter(day=>day<=today&&actual.has(day)&&data.earnedDays.includes(day)).reduce((sum,day)=>sum+recordedValue(data,'bonusValues',day),0);
 return Math.max(0,earned+bonus-data.protectedDays.filter(day=>day<=today).length*STREAK_RESCUE_COST-(data.quickDays||[]).filter(day=>day<=today).length*QUICK_DAY_COST);
}
export function redeemQuickDay(stats,now=new Date()){
 const day=calendarDayKey(now),data=ledger(stats);
 if(stats.quickModeDay===day)return stats;
 if(data.earnedDays.includes(day))throw Error('Dein heutiges Tagesziel ist bereits gutgeschrieben.');
 if((data.quickDays||[]).includes(day))return {...stats,quickModeDay:day};
 if(rewardBalance(stats,now)<QUICK_DAY_COST)throw Error('Du brauchst 20 Lernpunkte für den halben Tagesplan.');
 return {...stats,quickModeDay:day,streakRewards:{...data,quickDays:days([...(data.quickDays||[]),day])}};
}
export function rewardDailyGoals(stats,progress,now=new Date()){
 const day=calendarDayKey(now);if(!day||progress?.day!==day||!progress.complete)return stats;
 const data=ledger(stats),earned=data.earnedDays.includes(day),bonus=(data.bonusDays||[]).includes(day);
 if(earned&&(!progress.bonus||bonus))return stats;
 return {...addPracticeDay(stats,now),streakRewards:{...data,earnedDays:days([...data.earnedDays,day]),...(!earned?{earnedValues:{...data.earnedValues,[day]:newAward(day)}}:{}),...(progress.bonus?{bonusDays:days([...(data.bonusDays||[]),day]),...(!bonus?{bonusValues:{...data.bonusValues,[day]:newAward(day)}}:{})}:{})}};
}
export function rewardPracticeDay(stats,now=new Date()){
 const today=calendarDayKey(now);if(!today)return stats;
 const updated=addPracticeDay(stats,now),data=ledger(stats);
 return {...updated,streakRewards:{...data,earnedDays:days([...data.earnedDays,today]),...(!data.earnedDays.includes(today)?{earnedValues:{...data.earnedValues,[today]:newAward(today)}}:{})}};
}
export function streakRescueOffer(stats,now=new Date()){
 const today=calendarDayKey(now);if(!today)return null;
 const yesterday=dayBefore(now,1),previous=dayBefore(now,2),actual=days(stats.practiceDays),data=ledger(stats);
 // Exactly one missed day, immediately after an actual learning day. Never buy a whole gap.
 if(actual.includes(yesterday) || data.protectedDays.includes(yesterday) || !actual.includes(previous))return null;
 const balance=rewardBalance(stats,now),series=learningStreak(actual,new Date(`${previous}T12:00:00`),data.protectedDays);
 return {day:yesterday,balance,cost:STREAK_RESCUE_COST,canAfford:balance>=STREAK_RESCUE_COST,series,declined:data.declinedDays.includes(yesterday)};
}
export function rescueStreak(stats,expectedDay,now=new Date()){
 const offer=streakRescueOffer(stats,now);
 if(!offer || offer.day!==expectedDay || !offer.canAfford)return stats;
 const data=ledger(stats);
 return {...stats,streakRewards:{...data,protectedDays:days([...data.protectedDays,offer.day])}};
}
export function declineStreakRescue(stats,expectedDay,now=new Date()){
 const offer=streakRescueOffer(stats,now);if(!offer || offer.day!==expectedDay)return stats;
 const data=ledger(stats);return {...stats,streakRewards:{...data,declinedDays:days([...data.declinedDays,offer.day])}};
}
