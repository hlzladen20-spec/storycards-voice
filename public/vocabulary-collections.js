import {VOCABULARY_COURSES} from './vocabulary-course-data.js';
import {vocabularyKnown} from './vocabulary.js';
export {VOCABULARY_COURSES};
const pair=word=>JSON.stringify([word.front,word.back].map(text=>String(text).normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ')));
export const collectionKey=collection=>collection?`${collection.courseId}/${collection.topicId||'all'}`:'personal';
export function collectionEntries(collection){
 const course=VOCABULARY_COURSES.find(item=>item.id===collection?.courseId);
 if(!course)throw Error('Dieser Wortschatz ist nicht verfügbar.');
 const topics=collection.topicId?course.topics.filter(item=>item.id===collection.topicId):course.topics;
 if(!topics.length)throw Error('Dieses Thema ist nicht verfügbar.');
 return topics.flatMap(topic=>topic.entries.map(entry=>({...entry,id:`course:${course.id}:${entry.id}`,courseId:course.id,topicId:topic.id})));
}
export const vocabularyCollectionIndex=state=>new Map((state.words||[]).filter(word=>word.source!=='assessment-sentence').map(word=>[pair(word),word]));
export function vocabularyCollectionProgress(state,collection,words=vocabularyCollectionIndex(state)){
 const entries=collectionEntries(collection);
 const known=entries.filter(entry=>vocabularyKnown(words.get(pair(entry))||{})).length;
 return {known,total:entries.length,percent:entries.length?Math.round(known/entries.length*100):0};
}
export function activateVocabularyCollection(state,collection,now=Date.now()){
 if(!collection&& !state.activeCollection)return state;
 const entries=collection?collectionEntries(collection):[],byPair=vocabularyCollectionIndex(state),ignored=new Set(state.ignoredPhrases||[]);
 const words=[...state.words];let changed=false;
 for(const entry of entries){
  const existing=byPair.get(pair(entry));
  if(existing){
   if(existing.courseId!==entry.courseId||existing.topicId!==entry.topicId){const index=words.findIndex(word=>word.id===existing.id);words[index]={...existing,courseId:entry.courseId,topicId:entry.topicId};changed=true;}
   continue;
  }
  if(ignored.has(pair(entry)))continue;
  const word={...entry,stage:0,attempts:0,nextReviewAt:now};words.push(word);byPair.set(pair(word),word);changed=true;
 }
 if(collectionKey(collection)===collectionKey(state.activeCollection))return changed?{...state,words}:state;
 const collectionLessons={...state.collectionLessons,[collectionKey(state.activeCollection)]:state.lesson||null};
 const key=collectionKey(collection),lesson=Object.hasOwn(collectionLessons,key)?collectionLessons[key]:null;
 return {...state,words,activeCollection:collection?{courseId:collection.courseId,...(collection.topicId?{topicId:collection.topicId}:{})}:null,collectionLessons,lesson:lesson?structuredClone(lesson):null};
}
export function collectionLabel(collection){
 if(!collection)return '';
 const course=VOCABULARY_COURSES.find(item=>item.id===collection.courseId),topic=course?.topics.find(item=>item.id===collection.topicId);
 return course?course.title+(topic?' · '+topic.title:' · gemischt'):'';
}
