import {setupVocabularyGoal} from './vocabulary-goal.js';
export function setupLearningChart(host,{getVocabulary=()=>({}),getProfile=()=>({}),onVocabularyGoalSave=null}={}){
 host.className='learning-chart';host.setAttribute('aria-label','Deine Entwicklung');
 const heading=document.createElement('h3');heading.textContent='Deine Entwicklung';
 const goalHost=document.createElement('section'),goal=setupVocabularyGoal(goalHost,{getVocabulary,getGoal:()=>getProfile()?.vocabularyGoal,onSave:onVocabularyGoalSave});
 host.append(heading,goalHost);
 return {refresh:goal.refresh};
}
