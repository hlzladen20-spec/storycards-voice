import {calendarDayKey} from './learning-streak.js';
import {quickToday,quickVocabularyPlan} from './quick-learning.js';
import {reviewSchedule} from '../lib/review-scheduler.js';
export const vocabularySessionSeconds=(state,now=new Date())=>state.fillDailyLimit?Infinity:Math.max(60,Number(state.lesson?.sessionSeconds)||Number(state.sessionSeconds)||900)*(quickToday(state,now)?.5:1);
export const VOCABULARY_SECONDS=900;
const phraseKey=word=>JSON.stringify([word.front,word.back].map(text=>String(text||'').normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g,' ')));
export function removeVocabulary(state,id){
 const word=state.words.find(item=>item.id===id);if(!word)return state;
 const next={...state,words:state.words.filter(item=>item.id!==id),ignoredSourceIds:[...new Set([...(state.ignoredSourceIds||[]),word.sourceCardId].filter(Boolean))],ignoredPhrases:[...new Set([...(state.ignoredPhrases||[]),phraseKey(word)])]};
 if(state.lesson){const lesson={...state.lesson,queue:state.lesson.queue.filter(item=>item.id!==id)};for(const key of ['ids','normalIds','rated','introduced','retryIds','previousIds','previousRated'])if(Array.isArray(lesson[key]))lesson[key]=lesson[key].filter(value=>value!==id);if(Array.isArray(lesson.quickDeferred))lesson.quickDeferred=lesson.quickDeferred.filter(item=>item.id!==id);next.lesson=lesson;}
 return next;
}
export function addVocabulary(state,front,back,example='',now=Date.now()) {
 front=String(front||'').trim();back=String(back||'').trim();
 if(!isShortVocabulary({front,back})) throw Error('Bitte wirklich kurze Sätze: je 2–6 Wörter und höchstens 70 Zeichen pro Sprache.');
 if(state.words.some(w=>w.front.toLocaleLowerCase()===front.toLocaleLowerCase() && w.back.toLocaleLowerCase()===back.toLocaleLowerCase())) throw Error('Dieses Wort ist schon im Trainer.');
 return {...state,words:[...state.words,{id:crypto.randomUUID(),front,back,example:String(example).slice(0,500),stage:0,attempts:0,nextReviewAt:now}]};
}
export function initialVocabulary(now=Date.now()) {
 return {version:2,words:[],dailyLimit:15,newLimit:3,autoIncrease:true,history:[],totalActiveMs:0};
}
export function setVocabularySettings(state,{dailyLimit,newLimit,autoIncrease}) {
 if(!Number.isInteger(dailyLimit)||dailyLimit<1||dailyLimit>50)throw Error('Bitte 1 bis 50 Vokabelkarten pro Tag wählen.');
 if(!Number.isInteger(newLimit)||newLimit<0||newLimit>15||newLimit>dailyLimit)throw Error('Neue Karten: 0 bis 15, höchstens so viele wie dein Tagesziel.');
 const lesson=state.lesson;
 const unstarted=lesson && (!(lesson.rated||[]).length && !lesson.activeMs || !lesson.ids.length);
 return {...state,dailyLimit,newLimit,autoIncrease:Boolean(autoIncrease),lesson:unstarted?null:lesson};
}
export function isShortVocabulary(card) {
 return ['front','back'].every(key=>typeof card?.[key]==='string' && card[key].trim().length<=70 && card[key].trim().split(/\s+/).length>=2 && card[key].trim().split(/\s+/).length<=6);
}
export function personalVocabulary(state) {
 if(state.version===2)return state;
 const keep=state.words.filter(isShortVocabulary);
 return {...state,version:2,words:keep,archivedWords:[...(state.archivedWords||[]),...state.words.filter(w=>!keep.includes(w))],archivedLesson:state.lesson,lesson:null};
}
export function importConversationVocabulary(state,cards,now=Date.now()) {
 let next=state;
 for(const card of cards) {
  if(card.source!=='conversation' || !isShortVocabulary(card) || card.lastRating==='yes' || card.knownStreak>0 || (state.ignoredSourceIds||[]).includes(card.id) || (state.ignoredPhrases||[]).includes(phraseKey(card)))continue;
  if(next.words.some(w=>w.sourceCardId===card.id || (w.front.toLowerCase()===card.front.trim().toLowerCase() && w.back.toLowerCase()===card.back.trim().toLowerCase())))continue;
  next=addVocabulary(next,card.front,card.back,'',now);
  next.words[next.words.length-1].sourceCardId=card.id;
 }
 if(next!==state && next.lesson?.ids.length===0)next={...next,lesson:null};
 return next;
}
export function vocabularyProgress(state) {
 const ids=new Set([...(state.lesson?.previousIds||[]),...(state.lesson?.ids||[])]);
 const rated=new Set([...(state.lesson?.previousRated||[]),...(state.lesson?.rated||[])]);
 return {total:[...ids].filter(id=>state.words.some(w=>w.id===id)).length,learned:state.words.filter(w=>ids.has(w.id) && rated.has(w.id) && vocabularyKnown(w)).length};
}
export function vocabularyNeedsRepeat(word){return word.relearning===true || ['no','hard'].includes(word.lastRating);}
export function vocabularyKnown(word){return word.lastRating==='yes' && !vocabularyNeedsRepeat(word);}
// Recover only recorded time for older accounts; future rounds accumulate independently.
export function vocabularyTotalMs(state){
 if(Number.isFinite(state.totalActiveMs))return Math.max(0,state.totalActiveMs);
 const history=(state.history||[]).reduce((sum,day)=>sum+Math.max(0,Number(day.seconds)||0)*1000,0);
 const lesson=state.lesson,recorded=lesson && !lesson.extraRound && (state.history||[]).some(day=>day.day===lesson.day);
 return history+(lesson && !recorded?Math.max(0,Number(lesson.activeMs)||0):0);
}
// Round completion is not mastery: failed cards remain pending until their retry.
// Earlier rounds and already-known words must never pre-fill a new round's bar.
export function vocabularyRoundProgress(state) {
 const available=new Set(state.words.map(word=>word.id));
 const ids=new Set((state.lesson?.ids||[]).filter(id=>available.has(id)));
 const rated=new Set(state.lesson?.rated||[]);
 const pending=new Set((state.lesson?.queue||[]).map(item=>item.id));
 return {total:ids.size,completed:[...ids].filter(id=>rated.has(id) && !pending.has(id)).length};
}
export function vocabularyDailyProgress(state,now=new Date()){
 const day=calendarDayKey(now),lesson=state.lesson;
 if(lesson?.day!==day)return {total:0,completed:0,pending:0,done:false,hasWork:false};
 const history=(state.history||[]).find(item=>item.day===day);
 if(lesson.extraRound&&history?.finished)return {total:history.planned||0,completed:history.completed||0,pending:history.pending||0,done:Boolean(history.timedOut||history.planned>0&&history.completed>=history.planned),hasWork:history.planned>0};
 if(lesson.extraRound&&history&&!history.finished){const previous=[...new Set(lesson.previousIds||[])],rated=new Set(lesson.previousRated||[]);return {total:previous.length,completed:previous.filter(id=>rated.has(id)).length,pending:0,done:Boolean(history.reviews>0||previous.length&&previous.every(id=>rated.has(id))),hasWork:previous.length>0||history.reviews>0};}
 const progress=vocabularyRoundProgress(state);
 const timedOut=lesson.closed&&lesson.rated?.length>0&&lesson.activeMs>=vocabularySessionSeconds(state,now)*1000;
 return {...progress,pending:lesson.queue.length,repetitions:new Set(lesson.queue.filter(item=>item.retry).map(item=>item.id)).size,done:progress.total>0&&Boolean(timedOut||lesson.closed&&progress.completed===progress.total),hasWork:progress.total>0};
}
function vocabularyPortion(state,now,excluded=[]){
 const blocked=new Set(excluded),cap=Math.max(1,Math.min(50,state.dailyLimit||15));
 const due=state.words.filter(w=>!blocked.has(w.id)&&w.attempts>0&&(vocabularyNeedsRepeat(w)||w.nextReviewAt<=now)).sort((a,b)=>Number(vocabularyNeedsRepeat(b))-Number(vocabularyNeedsRepeat(a))||a.nextReviewAt-b.nextReviewAt);
 const fresh=state.words.filter(w=>!blocked.has(w.id)&&!w.attempts).slice(0,state.newLimit===0?0:state.fillDailyLimit?cap:Math.max(0,Math.min(15,state.newLimit??3)));
 const selected=[...due,...fresh].slice(0,cap).map(word=>({word,practiceOnly:false}));
 if(state.fillDailyLimit&&selected.length<cap){
  const used=new Set(selected.map(item=>item.word.id));
  const early=state.words.filter(w=>!blocked.has(w.id)&&!used.has(w.id)&&w.attempts>0).sort((a,b)=>(a.nextReviewAt||0)-(b.nextReviewAt||0)||(a.lastReviewedAt||0)-(b.lastReviewedAt||0));
  selected.push(...early.slice(0,cap-selected.length).map(word=>({word,practiceOnly:true})));
 }
 return selected;
}
function expandVocabularyTarget(state,lesson,now){
 if(!state.fillDailyLimit)return lesson;
 const ids=lesson.normalIds||lesson.ids,cap=Math.max(1,Math.min(50,state.dailyLimit||15)),needed=Math.max(0,cap-ids.length);
 const additions=needed?vocabularyPortion(state,now,ids).slice(0,needed):[];
 if(!additions.length)return lesson.closed&&lesson.queue.length?{...lesson,closed:false}:lesson;
 const expanded=[...ids,...additions.map(item=>item.word.id)];
 return {...lesson,ids:expanded,...(lesson.normalIds?{normalIds:expanded}:{}),queue:[...lesson.queue,...additions.map(({word,practiceOnly})=>({id:word.id,practiceOnly}))],closed:false};
}
export function additionalVocabularyLesson(state,now=Date.now()) {
 if(state.lesson && !state.lesson.closed && state.lesson.queue.length)return state;
 const day=calendarDayKey(now),same=state.lesson?.day===day;
 const finished=finishVocabulary(state);
 const weak=finished.words.filter(w=>w.attempts>0 && vocabularyNeedsRepeat(w)).sort((a,b)=>a.nextReviewAt-b.nextReviewAt);
 const due=finished.words.filter(w=>w.attempts>0 && vocabularyKnown(w) && w.nextReviewAt<=now).sort((a,b)=>a.nextReviewAt-b.nextReviewAt);
 const fresh=finished.words.filter(w=>!w.attempts).slice(0,Math.max(0,Math.min(15,finished.newLimit??3)));
 let selected=[...weak,...due,...fresh].slice(0,Math.max(1,Math.min(50,finished.dailyLimit||15))),practiceOnly=false;
 if(!selected.length){selected=finished.words.filter(w=>w.attempts>0).sort((a,b)=>(a.lastReviewedAt||0)-(b.lastReviewedAt||0)).slice(0,finished.dailyLimit||15);practiceOnly=true;}
 if(!selected.length)return finished;
 const previous=finished.lesson,portion=state.fillDailyLimit?vocabularyPortion(finished,now):selected.map(word=>({word,practiceOnly}));
 return {...finished,lesson:{day,extraRound:true,countsAsDaily:!vocabularyDailyProgress(finished,new Date(now)).done,sessionSeconds:Number(state.sessionSeconds)||900,previousIds:same?[...new Set([...(previous?.previousIds||[]),...(previous?.ids||[])])]:[],previousRated:same?[...new Set([...(previous?.previousRated||[]),...(previous?.rated||[])])]:[],ids:portion.map(({word})=>word.id),queue:portion.map(({word,practiceOnly})=>({id:word.id,practiceOnly})),introduced:[],rated:[],retryIds:[],activeMs:0,reviewCount:0,correctCount:0,closed:false}};
}
export function vocabularyLesson(state,now=Date.now()) {
 const day=calendarDayKey(now);
 if(state.lesson?.day===day){const lesson=expandVocabularyTarget(state,{...state.lesson,queue:state.lesson.queue.map(item=>({...item,introduce:false}))},now);return {...state,lesson:quickVocabularyPlan(lesson,quickToday(state,now))};}
 const selected=vocabularyPortion(state,now);
 return {...state,lesson:quickVocabularyPlan({day,sessionSeconds:Number(state.sessionSeconds)||900,ids:selected.map(({word})=>word.id),queue:selected.map(({word,practiceOnly})=>({id:word.id,...(practiceOnly?{practiceOnly:true}:{})})),introduced:[],rated:[],retryIds:[],activeMs:0,reviewCount:0,correctCount:0,closed:false},quickToday(state,now))};
}
export function introduceVocabulary(state) {
 const lesson=structuredClone(state.lesson),item=lesson.queue.shift();
 if(!item?.introduce) throw Error('Kein neues Wort ausgewählt.');
 lesson.introduced.push(item.id);
 lesson.queue.splice(Math.min(2,lesson.queue.length),0,{id:item.id});
 return {...state,lesson};
}
export function rateVocabulary(state,rating,now=Date.now()) {
 if(!['no','hard','yes'].includes(rating)) throw Error('Ungültige Bewertung.');
 const lesson=structuredClone(state.lesson),item=lesson.queue[0];
 if(lesson.closed || !item || item.introduce) throw Error('Bitte erst das Wort kennenlernen.');
 const word=state.words.find(w=>w.id===item.id);if(!word) throw Error('Wort nicht gefunden.');
 const difficult=vocabularyNeedsRepeat(word)||rating!=='yes';
 const cleanStreak=rating==='yes'?Math.min(3,(word.cleanStreak||0)+1):0;
 const relearning=difficult && cleanStreak<3;
 const stage=rating==='yes'?(relearning?(word.stage||0):Math.min(5,(word.stage||0)+1)):rating==='hard'?1:0;
 const schedule=reviewSchedule(word,rating,now,{practiceOnly:Boolean(item.practiceOnly)});
 if(['de-target','target-de'].includes(item.direction))schedule.reviewLog.at(-1).direction=item.direction;
 const updated=item.practiceOnly && rating==='yes' && !difficult?word:{...word,...schedule,stage,cleanStreak,relearning,relearningDirection:relearning?(item.direction||word.relearningDirection||null):null,attempts:(word.attempts||0)+1,lastRating:rating,lastReviewedAt:now};
 lesson.queue.shift();lesson.rated.push(item.id);
 if(!item.retry && !item.practiceOnly && word.attempts>0) {lesson.reviewCount++;lesson.correctCount+=Number(rating==='yes');}
 if(relearning) {
  if(!lesson.retryIds.includes(item.id))lesson.retryIds.push(item.id);
  lesson.queue.splice(Math.min(2,lesson.queue.length),0,{id:item.id,retry:true,...(item.direction?{direction:item.direction}:{})});
 }
 return {...state,words:state.words.map(w=>w.id===word.id?updated:w),lesson};
}
export function finishVocabulary(state) {
 if(!state.lesson || state.lesson.closed) return state;
 const lesson={...state.lesson,closed:true};
 const round=vocabularyRoundProgress(state);
 const result={day:lesson.day,reviews:lesson.reviewCount,accuracy:lesson.reviewCount?lesson.correctCount/lesson.reviewCount:0,seconds:Math.ceil(lesson.activeMs/1000),finished:true,completed:round.completed,planned:round.total,pending:lesson.queue.length,timedOut:lesson.rated.length>0&&lesson.activeMs>=vocabularySessionSeconds(state,new Date(lesson.day+'T12:00:00'))*1000};
 if(lesson.extraRound){
  if(!lesson.countsAsDaily)return {...state,lesson};
  const previous=(state.history||[]).find(item=>item.day===lesson.day);
  return {...state,lesson,history:[...(state.history||[]).filter(item=>item.day!==lesson.day),{...result,seconds:(previous?.seconds||0)+result.seconds}].slice(-90)};
 }
 const history=[...(state.history||[]).filter(h=>h.day!==lesson.day),result].slice(-90);
 const last=history.slice(-3),since=state.lastIncreaseDay;
 const increase=state.autoIncrease!==false && state.newLimit!==0 && last.length===3 && last.every(h=>h.reviews>=3 && h.accuracy>=.85 && h.seconds<VOCABULARY_SECONDS && (!since || h.day>since));
 return {...state,lesson,history,newLimit:increase?Math.min(15,state.dailyLimit||15,(state.newLimit??3)+1):(state.newLimit??3),lastIncreaseDay:increase?lesson.day:since||null};
}
