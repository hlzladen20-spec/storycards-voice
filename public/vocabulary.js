import {calendarDayKey} from './learning-streak.js';
export const VOCABULARY_SECONDS=900;
const intervals=[1,3,7,14,30];
export function addVocabulary(state,front,back,example='',now=Date.now()) {
 front=String(front||'').trim();back=String(back||'').trim();
 if(!isShortVocabulary({front,back})) throw Error('Bitte wirklich kurze Sätze: je 2–6 Wörter und höchstens 70 Zeichen auf Deutsch und Englisch.');
 if(state.words.some(w=>w.front.toLocaleLowerCase()===front.toLocaleLowerCase() && w.back.toLocaleLowerCase()===back.toLocaleLowerCase())) throw Error('Dieses Wort ist schon im Trainer.');
 return {...state,words:[...state.words,{id:crypto.randomUUID(),front,back,example:String(example).slice(0,500),stage:0,attempts:0,nextReviewAt:now}]};
}
export function initialVocabulary(now=Date.now()) {
 return {version:2,words:[],dailyLimit:15,newLimit:3,autoIncrease:true,history:[]};
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
  if(card.source!=='conversation' || !isShortVocabulary(card) || card.lastRating==='yes' || card.knownStreak>0 || (state.ignoredSourceIds||[]).includes(card.id))continue;
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
 return {total:ids.size,learned:state.words.filter(w=>ids.has(w.id) && rated.has(w.id) && w.lastRating==='yes').length};
}
export function additionalVocabularyLesson(state,now=Date.now()) {
 if(state.lesson && !state.lesson.closed && state.lesson.queue.length)return state;
 const day=calendarDayKey(now),same=state.lesson?.day===day;
 const finished=finishVocabulary(state);
 const weak=finished.words.filter(w=>w.attempts>0 && w.lastRating!=='yes').sort((a,b)=>a.nextReviewAt-b.nextReviewAt);
 const due=finished.words.filter(w=>w.attempts>0 && w.lastRating==='yes' && w.nextReviewAt<=now).sort((a,b)=>a.nextReviewAt-b.nextReviewAt);
 const fresh=finished.words.filter(w=>!w.attempts).slice(0,Math.max(0,Math.min(15,finished.newLimit??3)));
 let selected=[...weak,...due,...fresh].slice(0,Math.max(1,Math.min(50,finished.dailyLimit||15))),practiceOnly=false;
 if(!selected.length){selected=finished.words.filter(w=>w.attempts>0).sort((a,b)=>(a.lastReviewedAt||0)-(b.lastReviewedAt||0)).slice(0,finished.dailyLimit||15);practiceOnly=true;}
 if(!selected.length)return finished;
 const previous=finished.lesson;
 return {...finished,lesson:{day,extraRound:true,previousIds:same?[...new Set([...(previous?.previousIds||[]),...(previous?.ids||[])])]:[],previousRated:same?[...new Set([...(previous?.previousRated||[]),...(previous?.rated||[])])]:[],ids:selected.map(w=>w.id),queue:selected.map(w=>({id:w.id,practiceOnly})),introduced:[],rated:[],retryIds:[],activeMs:0,reviewCount:0,correctCount:0,closed:false}};
}
export function swipeRating(dx,dy) {return Math.abs(dx)>=70 && Math.abs(dx)>Math.abs(dy)*1.5 ? dx>0?'yes':'no':null;}
export function vocabularyLesson(state,now=Date.now()) {
 const day=calendarDayKey(now);
 if(state.lesson?.day===day) return {...state,lesson:{...state.lesson,queue:state.lesson.queue.map(item=>({...item,introduce:false}))}};
 const due=state.words.filter(w=>w.attempts>0 && w.nextReviewAt<=now).sort((a,b)=>a.nextReviewAt-b.nextReviewAt);
 const fresh=state.words.filter(w=>!w.attempts).slice(0,Math.max(0,Math.min(15,state.newLimit??3)));
 const selected=[...due,...fresh].slice(0,Math.max(1,Math.min(50,state.dailyLimit||15)));
 return {...state,lesson:{day,ids:selected.map(w=>w.id),queue:selected.map(w=>({id:w.id})),introduced:[],rated:[],retryIds:[],activeMs:0,reviewCount:0,correctCount:0,closed:false}};
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
 const stage=rating==='yes'?Math.min(5,(word.stage||0)+1):rating==='hard'?1:0;
 const due=new Date(now);
 if(rating==='no') due.setTime(now+10*60*1000);
 else {due.setDate(due.getDate()+intervals[stage-1]);due.setHours(9,0,0,0);}
 const updated=item.practiceOnly && rating==='yes'?word:{...word,stage,attempts:(word.attempts||0)+1,lastRating:rating,lastReviewedAt:now,nextReviewAt:due.getTime()};
 lesson.queue.shift();lesson.rated.push(item.id);
 if(!item.retry && !item.practiceOnly && word.attempts>0) {lesson.reviewCount++;lesson.correctCount+=Number(rating==='yes');}
 if(rating!=='yes' && !item.retry && lesson.retryIds.length<3) {
  lesson.retryIds.push(item.id);lesson.queue.splice(Math.min(2,lesson.queue.length),0,{id:item.id,retry:true});
 }
 return {...state,words:state.words.map(w=>w.id===word.id?updated:w),lesson};
}
export function finishVocabulary(state) {
 if(!state.lesson || state.lesson.closed) return state;
 const lesson={...state.lesson,closed:true};
 if(lesson.extraRound)return {...state,lesson};
 const result={day:lesson.day,reviews:lesson.reviewCount,accuracy:lesson.reviewCount?lesson.correctCount/lesson.reviewCount:0,seconds:Math.ceil(lesson.activeMs/1000)};
 const history=[...(state.history||[]).filter(h=>h.day!==lesson.day),result].slice(-90);
 const last=history.slice(-3),since=state.lastIncreaseDay;
 const increase=state.autoIncrease!==false && state.newLimit!==0 && last.length===3 && last.every(h=>h.reviews>=3 && h.accuracy>=.85 && h.seconds<VOCABULARY_SECONDS && (!since || h.day>since));
 return {...state,lesson,history,newLimit:increase?Math.min(15,state.dailyLimit||15,(state.newLimit??3)+1):(state.newLimit??3),lastIncreaseDay:increase?lesson.day:since||null};
}
