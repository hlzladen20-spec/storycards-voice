import {VOCABULARY_COURSES,vocabularyCollectionProgress,vocabularyCollectionIndex} from './vocabulary-collections.js';
const node=(tag,text='',className='')=>{const element=document.createElement(tag);element.textContent=text;if(className)element.className=className;return element;};
export function setupVocabularyCoursePicker({anchor,getState,onStart,course}){
 if(course.target!=='en')return null;
 const choice=document.getElementById('cardChoice'),root=node('section','','word-course-picker'),list=node('div','','word-course-list'),catalog=node('div','','word-course-catalog');
 root.setAttribute('aria-label','Wortschatz nach Lernstufen');catalog.hidden=true;root.append(list,catalog);anchor.after(root);
 const progressViews=[];
 function progress(host,collection){
  const bar=node('progress'),label=node('small');bar.setAttribute('aria-label','Gekonnte Vokabeln: '+(collection.topicId?'Thema':'Wortschatz'));
  host.append(bar,label);progressViews.push({bar,label,collection});
 }
 for(const item of VOCABULARY_COURSES){
  const entry=node('article','','word-course-entry'),button=node('button','','word-course-button');button.type='button';
  button.append(node('strong',item.title),node('span','›'));button.onclick=()=>open(item.id);entry.append(button);progress(entry,{courseId:item.id});list.append(entry);
 }
 function refresh(){
  const state=getState(),index=vocabularyCollectionIndex(state);for(const {bar,label,collection} of progressViews){const p=vocabularyCollectionProgress(state,collection,index);bar.max=p.total;bar.value=p.known;label.textContent=`${p.known.toLocaleString('de-DE')} von ${p.total.toLocaleString('de-DE')} gekonnt${p.known===p.total?' ✓':''}`;}
 }
 function reset(){choice.classList.remove('word-course-open');catalog.hidden=true;list.hidden=false;refresh();}
 function open(courseId){
  const selected=VOCABULARY_COURSES.find(item=>item.id===courseId);if(!selected)return;
  progressViews.splice(VOCABULARY_COURSES.length);catalog.replaceChildren();list.hidden=true;catalog.hidden=false;choice.classList.add('word-course-open');
  const back=node('button','‹ Karten','ghost word-course-back');back.type='button';back.onclick=()=>{reset();anchor.focus();};
  const heading=node('h2',selected.title),summary=node('div','','word-course-summary');
  progress(summary,{courseId});
  const count=selected.topics.reduce((sum,topic)=>sum+topic.entries.length,0);
  const description=node('p',`${count.toLocaleString('de-DE')} Wörter und Wendungen · ${selected.topics.length} Themen`,'word-course-description');
  const mixed=node('button','Alles gemischt üben →','primary');mixed.type='button';mixed.onclick=()=>onStart({courseId});
  const topics=node('div','','word-topic-list');
  for(const topic of selected.topics){
   const card=node('article','','word-topic-card'),start=node('button','','word-topic-start');start.type='button';start.append(node('strong',topic.title),node('span','Üben ›'));
   start.onclick=()=>onStart({courseId,topicId:topic.id});card.append(start);progress(card,{courseId,topicId:topic.id});
   const details=node('details'),show=node('summary',`${topic.entries.length} Wörter ansehen`),words=node('div','','word-topic-words');details.append(show,words);
   details.ontoggle=()=>{
    if(!details.open)return;words.replaceChildren();
    for(const entry of topic.entries){const row=node('p'),german=node('span',entry.front),english=node('strong',entry.back);german.lang='de';english.lang='en';row.append(english,german);words.append(row);}
   };
   card.append(details);topics.append(card);
  }
  const info=node('details','','word-course-info');info.append(node('summary','Wie wird gezählt?'),node('p','Der Balken zählt die Wörter dieses festen StoryCards-Pakets, die du als gewusst bewertet hast. Nach einem Fehler oder „Mit Mühe“ zählt ein Wort erst nach drei fehlerfreien Antworten wieder dazu. Aufdecken allein zählt nicht. Die Wortanzahl ist keine Einstufung deines Sprachniveaus.'));
  catalog.append(back,heading,description,summary,mixed,node('h3','Nach Themen üben'),topics,info);refresh();heading.tabIndex=-1;heading.focus();
 }
 document.addEventListener('storycards-card-choice-opened',reset);
 refresh();return {refresh,open,reset};
}
