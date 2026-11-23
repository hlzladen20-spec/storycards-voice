// Keep the sentence-card implementation and saved progress available for a
// later release. This switch controls entry points and current daily goals.
export const APP_FEATURES=Object.freeze({sentencePractice:false,exactVocabularyTarget:true});
export function applyFeatureVisibility(root=document){
 const enabled=APP_FEATURES.sentencePractice;
 for(const id of ['dailyPracticeButton','weakPracticeButton','freePracticeButton','repeatPracticeButton','cards','summaryCardsButton','summaryCardsPreview']){
  const element=root.getElementById(id);if(!element)continue;
  if(!enabled){element.hidden=true;element.setAttribute('data-feature-disabled','true');if(element.tagName==='BUTTON')element.disabled=true;}
 }
 const button=root.getElementById('toCardsButton');if(button&&!enabled)button.textContent='Zu deinen Vokabeln';
}
