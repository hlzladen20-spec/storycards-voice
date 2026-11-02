import {calendarDayKey} from './learning-streak.js';
export const VOCABULARY_SECONDS=900;
const intervals=[1,3,7,14,30];
const seeds=[['langsam','slow'],['schnell','fast'],['heute','today'],['morgen','tomorrow'],['gestern','yesterday'],['brauchen','need'],['verstehen','understand'],['wiederholen','repeat'],['fragen','ask'],['antworten','answer'],['Werkzeug','tool'],['Werkstatt','workshop'],['bestellen','order'],['Rechnung','bill'],['Bahnhof','train station']];
export function addVocabulary(state,front,back,example='',now=Date.now()) {
 front=String(front||'').trim();back=String(back||'').trim();
 if(!front || !back || front.length>160 || back.length>160) throw Error('Bitte ein deutsches und ein englisches Wort mit höchstens 160 Zeichen eingeben.');
 if(state.words.some(w=>w.front.toLocaleLowerCase()===front.toLocaleLowerCase() && w.back.toLocaleLowerCase()===back.toLocaleLowerCase())) throw Error('Dieses Wort ist schon im Trainer.');
 return {...state,words:[...state.words,{id:crypto.randomUUID(),front,back,example:String(example).slice(0,500),stage:0,attempts:0,nextReviewAt:now}]};
}
export function initialVocabulary(now=Date.now()) {
 let state={words:[],newLimit:3,history:[]};
 for(const [front,back] of seeds) state=addVocabulary(state,front,back,'',now);
 return state;
}
export function vocabularyLesson(state,now=Date.now()) {
 const day=calendarDayKey(now);
 if(state.lesson?.day===day) return state;
 const due=state.words.filter(w=>w.attempts>0 && w.nextReviewAt<=now).sort((a,b)=>a.nextReviewAt-b.nextReviewAt);
 const fresh=state.words.filter(w=>!w.attempts).slice(0,Math.max(3,Math.min(10,state.newLimit||3)));
 const selected=[...due,...fresh].slice(0,20);
 return {...state,lesson:{day,ids:selected.map(w=>w.id),queue:selected.map(w=>({id:w.id,introduce:!w.attempts})),introduced:[],rated:[],retryIds:[],activeMs:0,reviewCount:0,correctCount:0,closed:false}};
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
 const updated={...word,stage,attempts:(word.attempts||0)+1,lastRating:rating,lastReviewedAt:now,nextReviewAt:due.getTime()};
 lesson.queue.shift();lesson.rated.push(item.id);
 if(!item.retry && word.attempts>0) {lesson.reviewCount++;lesson.correctCount+=Number(rating==='yes');}
 if(rating!=='yes' && !item.retry && lesson.retryIds.length<3) {
  lesson.retryIds.push(item.id);lesson.queue.splice(Math.min(2,lesson.queue.length),0,{id:item.id,retry:true});
 }
 return {...state,words:state.words.map(w=>w.id===word.id?updated:w),lesson};
}
export function finishVocabulary(state) {
 if(!state.lesson || state.lesson.closed) return state;
 const lesson={...state.lesson,closed:true};
 const result={day:lesson.day,reviews:lesson.reviewCount,accuracy:lesson.reviewCount?lesson.correctCount/lesson.reviewCount:0,seconds:Math.ceil(lesson.activeMs/1000)};
 const history=[...(state.history||[]).filter(h=>h.day!==lesson.day),result].slice(-90);
 const last=history.slice(-3),since=state.lastIncreaseDay;
 const increase=last.length===3 && last.every(h=>h.reviews>=3 && h.accuracy>=.85 && h.seconds<VOCABULARY_SECONDS && (!since || h.day>since));
 return {...state,lesson,history,newLimit:Math.min(10,(state.newLimit||3)+Number(increase)),lastIncreaseDay:increase?lesson.day:since||null};
}
