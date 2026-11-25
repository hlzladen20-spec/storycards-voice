import {addVocabulary,isShortVocabulary,isVocabularyAssessment,rateVocabulary} from './vocabulary.js';
import {authenticatedFetch} from './authenticated-fetch.js';

export function vocabularyRequest(input){
 const word=typeof input?.word==='string'?input.word.trim().replace(/\s+/g,' '):'';
 const context=typeof input?.context==='string'?input.context.trim():'';
 if(!word || word.length>80 || word.split(' ').length>6 || !/^[\p{L}\p{M}][\p{L}\p{M}'’\- ]*$/u.test(word))throw Error('Bitte ein Wort oder einen kurzen Ausdruck in deiner Lernsprache eingeben.');
 if(context.length>160 || input?.context!=null && typeof input.context!=='string')throw Error('Der Kontext darf höchstens 160 Zeichen lang sein.');
 return {word,context};
}
export function validateVocabularySuggestion(value,word){
 if(!isShortVocabulary(value))throw Error('Bitte je einen kurzen Satz mit 2–6 Wörtern und höchstens 70 Zeichen verwenden.');
 const front=value.front.trim(),back=value.back.trim(),meaning=typeof value.meaning==='string'?value.meaning.trim().slice(0,160):'';
 const escaped=word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 if(!new RegExp(`(^|[^\\p{L}\\p{M}])${escaped}($|[^\\p{L}\\p{M}])`,'iu').test(back))throw Error('Der Satz muss deine eingegebene Vokabel enthalten.');
 return {front,back,meaning};
}
export function cleanVocabularySuggestions(output,word){
 if(!Array.isArray(output?.suggestions))throw Error('Keine passenden Sätze erhalten. Bitte erneut versuchen.');
 const result=[];
 for(const value of output.suggestions.slice(0,3)){
  try{const item=validateVocabularySuggestion(value,word);if(!result.some(previous=>previous.back.toLocaleLowerCase()===item.back.toLocaleLowerCase()))result.push(item);}catch{}
 }
 if(!result.length)throw Error('Kein passender kurzer Satz gefunden. Prüfe das Wort oder ergänze einen Kontext.');
 return result;
}
export async function requestVocabularySuggestions(input,language,{signal,request=authenticatedFetch}={}){
 const response=await request('/api/vocabulary-suggestion',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({...input,language})});
 const output=await response.json();
 if(!response.ok)throw Error(output.error||'Der Satz konnte nicht erstellt werden.');
 return cleanVocabularySuggestions(output,input.word);
}
const timeExamples={
 'a.m.':{back:'It starts at 9 a.m.',front:'Es beginnt um 9 Uhr.',meaning:'vormittags'},
 'p.m.':{back:'We meet at 6 p.m.',front:'Wir treffen uns um 18 Uhr.',meaning:'nachmittags oder abends'}
};
export async function requestAssessmentSentence(word,language,signal){
 if(language==='en'&&Object.hasOwn(timeExamples,word.back))return timeExamples[word.back];
 const input=vocabularyRequest({word:word.back,context:word.front});
 return (await requestVocabularySuggestions(input,language,{signal}))[0];
}
export function saveAssessmentSentence(state,word,draft,now=Date.now()){
 if(!word.courseId||!isVocabularyAssessment(state)||state.lesson?.queue[0]?.id!==word.id)throw Error('Diese Vokabel ist gerade nicht in der Abfrage.');
 const {front,back,meaning}=validateVocabularySuggestion(draft,word.back);
 const sentenceId='assessment:'+word.id;
 const existing=state.words.find(card=>card.id===sentenceId)||state.words.find(card=>!card.courseId&&card.front.toLowerCase()===front.toLowerCase()&&card.back.toLowerCase()===back.toLowerCase());
 const id=existing?.id||sentenceId;
 const rated=rateVocabulary(state,'no',now);
 const sentence={...existing,id,front,back,example:meaning,source:'assessment-sentence',sourceWord:word.back,attempts:Math.max(1,existing?.attempts||0),
  stage:0,lastRating:'no',lastReviewedAt:now,cleanStreak:0,relearning:true,nextReviewAt:now};
 const words=rated.words.map(card=>card.id===word.id?{...card,assessmentSentenceId:id}:card.id===id?sentence:card);
 if(!existing)words.push(sentence);
 return {...rated,words};
}
export function addSuggestedVocabulary(state,word,draft,now=Date.now()){
 const suggestion=validateVocabularySuggestion(draft,vocabularyRequest({word}).word);
 const next=addVocabulary(state,suggestion.front,suggestion.back,suggestion.meaning,now);
 next.words[next.words.length-1]={...next.words.at(-1),source:'manual-ai',sourceWord:word};
 // An empty old portion must not strand the first personally added vocabulary.
 if(!next.lesson?.ids?.length)next.lesson=null;
 return next;
}
export const vocabularySuggestionFormat={type:'json_schema',name:'vocabulary_suggestions',strict:true,schema:{type:'object',additionalProperties:false,properties:{suggestions:{type:'array',items:{type:'object',additionalProperties:false,properties:{front:{type:'string'},back:{type:'string'},meaning:{type:'string'}},required:['front','back','meaning']}}},required:['suggestions']}};
