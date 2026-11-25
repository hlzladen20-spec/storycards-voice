import {difficultCards} from './lesson-planner.js';
import {completedCourseWord,vocabularyKnown,isShortVocabulary} from './vocabulary.js';

// These are current successful recalls, not lifetime views or permanently mastered words.
export function learnedStatistics(cards=[],vocabulary={words:[]}){
 const difficult=new Set(difficultCards(cards).map(card=>card.id));
 const latestFirst=(a,b)=>(Number(b.lastReviewedAt)||0)-(Number(a.lastReviewedAt)||0);
 return {
  cards:cards.filter(card=>Number(card.knownStreak)>0 && !difficult.has(card.id)).sort(latestFirst),
  vocabulary:(vocabulary?.words||[]).filter(word=>isShortVocabulary(word) && vocabularyKnown(word)).sort(latestFirst)
 };
}

export function renderLearnedStatistics(root,cards,vocabulary,course){
 const entries=learnedStatistics(cards,vocabulary);
 for(const [kind,countId,listId,empty] of [
  ['cards','learnedCardsCount','learnedCardsList','Noch keine Karten selbstständig abgerufen. Übe zuerst deine Tageslektion.'],
  ['vocabulary','learnedVocabularyCount','learnedVocabularyList','Noch keine Vokabeln sicher abgerufen. Übe deine Kurzsätze im Vokabeltrainer.']
 ]){
  root.querySelector('#'+countId).textContent=String(entries[kind].length);
  const list=root.querySelector('#'+listId);list.replaceChildren();
  const node=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el;};
  if(!entries[kind].length){list.append(node('li',empty));continue;}
  for(const card of entries[kind]){
   const row=node('li','');
   row.append(node('strong',card.front),node('p',`${course.flag} ${card.back}`));
   const due=Number(card.nextReviewAt);
   if(!completedCourseWord(card)&&Number.isFinite(due) && due>0)row.append(node('small',`Nächste Wiederholung: ${new Date(due).toLocaleDateString('de-DE')}`));
   list.append(row);
  }
 }
 return {cards:entries.cards.length,vocabulary:entries.vocabulary.length};
}
