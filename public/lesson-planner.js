export const MAX_NEW_CARDS = 3;
export const MAX_DAILY_CARDS = 10;
export const MAX_EXTRA_RETRIES = 3;
// Use the latest assessment, not lifetime misses: recovered cards leave this list.
export function difficultCards(cards) {
  return cards.filter(card => {
    const latest=card.lastRating || ({1:'no',2:'hard',3:'yes',4:'yes'}[card.reviewLog?.at(-1)?.rating]);
    return latest ? ['no','hard'].includes(latest) : Number(card.attempts)>0 && !Number(card.knownStreak) && Number(card.misses)>0;
  }).sort((a,b)=>(Number(a.lastReviewedAt)||0)-(Number(b.lastReviewedAt)||0));
}
export function eligibleForLesson(card) {
  return typeof card.front==='string' && typeof card.back==='string' && card.front.length<=220 && card.back.length<=220 && card.back.trim().split(/\s+/).length<=24;
}
export function planDailyLesson(cards, previous, day, limit, now=Date.now()) {
  const cap=Math.max(1,Math.min(MAX_DAILY_CARDS,Math.round(Number(limit)||MAX_DAILY_CARDS)));
  const same=previous?.day===day;
  const completed=same ? [...new Set(previous.completed||[])] : [];
  if(same && Array.isArray(previous.plannedIds)) {
    return {...previous,limit:Math.min(cap,previous.limit||cap),plannedIds:previous.plannedIds.slice(0,Math.min(cap,previous.limit||cap))};
  }
  const remaining=Math.max(0,cap-completed.length);
  const candidates=cards.filter(c=>!completed.includes(c.id) && eligibleForLesson(c) && ((Number(c.nextReviewAt)||0)<=now || (c.dailyReviewBy && c.dailyReviewBy<=now)));
  const phrase=card=>card.back.toLocaleLowerCase().replace(/[.!?,;:]/g,'').replace(/\s+/g,' ').trim();
  const seen=new Set();
  const unique=card=>{const value=phrase(card);if(seen.has(value)) return false;seen.add(value);return true;};
  const weak=new Set(difficultCards(candidates).map(c=>c.id));
  const reviews=candidates.filter(c=>Number(c.attempts)>0).sort((a,b)=>Number(Boolean(b.dailyReviewBy && b.dailyReviewBy<=now))-Number(Boolean(a.dailyReviewBy && a.dailyReviewBy<=now)) || Number(weak.has(b.id))-Number(weak.has(a.id)) || (b.misses||0)-(a.misses||0) || a.nextReviewAt-b.nextReviewAt).filter(unique);
  const known=new Set(cards.filter(c=>Number(c.attempts)>0).map(phrase));
  const fresh=candidates.filter(c=>!Number(c.attempts) && !known.has(phrase(c))).filter(unique);
  // Backlogs take priority. New learning is capped, never a growing obligation.
  const selected=reviews.slice(0,remaining);
  const newCount=reviews.length>=remaining ? 0 : Math.min(MAX_NEW_CARDS,remaining-selected.length);
  selected.push(...fresh.slice(0,newCount));
  return {day,limit:cap,plannedIds:[...completed,...selected.map(c=>c.id)].slice(0,cap),completed,introduced:[],retryUsed:0,retriedIds:[],pendingRetries:[],results:{}};
}
export function lessonQueue(cards,plan) {
  const byId=new Map(cards.map(c=>[c.id,c]));
  const initial=plan.plannedIds.filter(id=>!(plan.completed||[]).includes(id) && byId.has(id)).map(id=>{
    const card=byId.get(id);
    return {...card,lessonStage:!card.attempts && !(plan.introduced||[]).includes(id)?'introduce':'recall'};
  });
  const retries=[...new Set(plan.pendingRetries||[])].filter(id=>plan.plannedIds.includes(id) && byId.has(id)).slice(0,MAX_EXTRA_RETRIES).map(id=>({...byId.get(id),lessonStage:'recall',retryPractice:true,scheduleApplied:false}));
  return [...initial,...retries];
}
export function retryAllowed(plan,id) {
  return (plan.retryUsed||0)<MAX_EXTRA_RETRIES && !(plan.retriedIds||[]).includes(id);
}
