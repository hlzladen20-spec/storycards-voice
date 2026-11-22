export const VOCABULARY_MODES=['mixed','de-target','target-de','listening'];
const directions=['de-target','target-de'];
export const vocabularyMode=state=>VOCABULARY_MODES.includes(state.practiceMode)?state.practiceMode:'mixed';
export function setVocabularyMode(state,mode){
 if(!VOCABULARY_MODES.includes(mode))throw Error('Unbekannte Übungsrichtung.');
 const lesson=state.lesson?structuredClone(state.lesson):null;
 // Changing the mode never resets ratings, due dates or pending repetitions.
 if(lesson?.queue?.[0]&&!lesson.queue[0].retry)delete lesson.queue[0].direction;
 return {...state,practiceMode:mode,...(lesson?{lesson}:{})};
}
export function prepareVocabularyQuestion(state){
 const item=state.lesson?.queue?.[0];if(!item||state.lesson.closed)return state;
 const word=state.words.find(word=>word.id===item.id);if(!word)return state;
 if(directions.includes(item.direction))return state;
 const mode=vocabularyMode(state),difficult=word.relearning===true||['no','hard'].includes(word.lastRating);
 const remembered=difficult&&directions.includes(word.relearningDirection)?word.relearningDirection:null;
 const cursor=Number.isSafeInteger(state.directionCursor)&&state.directionCursor>=0?state.directionCursor%2:0;
 const direction=remembered||(mode==='mixed'?directions[cursor%2]:mode==='listening'?'target-de':mode);
 return {...state,directionCursor:(cursor+(mode==='mixed'&&!remembered?1:0))%2,lesson:{...state.lesson,queue:[{...item,direction},...state.lesson.queue.slice(1)]}};
}
export function vocabularyQuestion(state,word,revealed=false,course={target:'en',name:'Englisch'}){
 const direction=state.lesson?.queue?.[0]?.direction||'de-target',listening=vocabularyMode(state)==='listening'&&direction==='target-de';
 const reverse=direction==='target-de',label=listening?'Hören → Deutsch':reverse?course.name+' → Deutsch':'Deutsch → '+course.name;
 return {direction,listening,label,question:listening&&!revealed?'Höre zu. Was bedeutet der Satz?':reverse?word.back:word.front,questionLanguage:listening&&!revealed?'de':reverse?course.target:'de',answer:revealed?(reverse?word.front:word.back):null,answerLanguage:reverse?'de':course.target,canListen:listening||reverse||revealed};
}
