import {addPracticeDay,calendarDayKey,learningStreak} from './learning-streak.js';

export const DAILY_POINTS=10;
export const STREAK_RESCUE_COST=30;
function days(values){return [...new Set((Array.isArray(values)?values:[]).filter(day=>typeof day==='string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && calendarDayKey(`${day}T12:00:00`)===day))].sort();}
function dayBefore(now,offset){const date=new Date(now);date.setHours(12,0,0,0);date.setDate(date.getDate()-offset);return calendarDayKey(date);}
function ledger(stats){const data=stats.streakRewards||{};return {earnedDays:days(data.earnedDays),...(data.bonusDays?{bonusDays:days(data.bonusDays)}:{}),protectedDays:days(data.protectedDays),declinedDays:days(data.declinedDays)};}
export function rewardBalance(stats,now=new Date()){
 const today=calendarDayKey(now),actual=new Set(days(stats.practiceDays)),data=ledger(stats);
 return Math.max(0,(data.earnedDays.filter(day=>day<=today && actual.has(day)).length+(data.bonusDays||[]).filter(day=>day<=today&&actual.has(day)&&data.earnedDays.includes(day)).length)*DAILY_POINTS-data.protectedDays.filter(day=>day<=today).length*STREAK_RESCUE_COST);
}
export function rewardDailyGoals(stats,progress,now=new Date()){
 const day=calendarDayKey(now);if(!day||progress?.day!==day||!progress.complete)return stats;
 const data=ledger(stats),earned=data.earnedDays.includes(day),bonus=(data.bonusDays||[]).includes(day);
 if(earned&&(!progress.bonus||bonus))return stats;
 return {...addPracticeDay(stats,now),streakRewards:{...data,earnedDays:days([...data.earnedDays,day]),...(progress.bonus?{bonusDays:days([...(data.bonusDays||[]),day])}:{})}};
}
export function rewardPracticeDay(stats,now=new Date()){
 const today=calendarDayKey(now);if(!today)return stats;
 const updated=addPracticeDay(stats,now),data=ledger(stats);
 return {...updated,streakRewards:{...data,earnedDays:days([...data.earnedDays,today])}};
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
