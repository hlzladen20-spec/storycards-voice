import {fsrs,createEmptyCard,Rating} from './fsrs.mjs';
const scheduler=fsrs({request_retention:0.9,enable_fuzz:false});
const DAY=86400000;
// Legacy records keep their saved due date until the next real review. At that
// review, seed FSRS from their existing interval instead of starting over.
export function reviewSchedule(item,rating,now=Date.now(),{practiceOnly=false}={}){
 const grade={no:Rating.Again,hard:Rating.Hard,yes:Rating.Good}[rating];
 if(!grade)throw Error('Unbekannte Bewertung.');
 let previous=item.fsrs;
 if(!previous){
  previous=createEmptyCard(new Date(now));
  if(item.attempts>0){
   const last=Number(item.lastReviewedAt)||now-DAY;
   const interval=Math.max(1,(Number(item.nextReviewAt||now)-last)/DAY);
   previous={...previous,due:new Date(Number(item.nextReviewAt)||now),last_review:new Date(last),state:2,reps:item.attempts,lapses:item.misses||0,difficulty:5,stability:interval,scheduled_days:Math.round(interval),elapsed_days:Math.max(0,Math.floor((now-last)/DAY))};
  }
 }
 const result=scheduler.next(previous,new Date(now),grade);
 const last=Number(item.lastReviewedAt);
 const log={...result.log,measurementVersion:1,previousReviewAt:Number.isFinite(last)&&last>0?last:null,practiceOnly:Boolean(practiceOnly)};
 return {fsrs:result.card,nextReviewAt:result.card.due.getTime(),reviewLog:[...(item.reviewLog||[]),log]};
}
export function reviewIntervalLabel(item,rating,now=Date.now()){
 const seconds=Math.max(60,Math.round((reviewSchedule(item,rating,now).nextReviewAt-now)/1000));
 if(seconds<3600)return 'in '+Math.ceil(seconds/60)+' Min.';
 if(seconds<86400)return 'in '+Math.ceil(seconds/3600)+' Std.';
 const days=Math.round(seconds/86400);return days===1?'morgen':'in '+days+' Tagen';
}
