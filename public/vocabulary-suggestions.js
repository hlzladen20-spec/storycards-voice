import {addVocabulary,isShortVocabulary} from './vocabulary.js';

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
export function addSuggestedVocabulary(state,word,draft,now=Date.now()){
 const suggestion=validateVocabularySuggestion(draft,vocabularyRequest({word}).word);
 const next=addVocabulary(state,suggestion.front,suggestion.back,suggestion.meaning,now);
 next.words[next.words.length-1]={...next.words.at(-1),source:'manual-ai',sourceWord:word};
 // An empty old portion must not strand the first personally added vocabulary.
 if(!next.lesson?.ids?.length)next.lesson=null;
 return next;
}
export const vocabularySuggestionFormat={type:'json_schema',name:'vocabulary_suggestions',strict:true,schema:{type:'object',additionalProperties:false,properties:{suggestions:{type:'array',items:{type:'object',additionalProperties:false,properties:{front:{type:'string'},back:{type:'string'},meaning:{type:'string'}},required:['front','back','meaning']}}},required:['suggestions']}};
