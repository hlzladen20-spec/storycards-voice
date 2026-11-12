export function cleanConversationReview(review) {
 const result={};
 for(const key of ['strengths','difficulties','improvements'])result[key]=Array.isArray(review?.[key])?review[key].filter(item=>typeof item==='string' && item.trim()).map(item=>item.trim().slice(0,500)).slice(0,3):[];
 return result;
}
export function setupConversationSummary({onCelebrate,course={name:'Englisch'}}) {
 const $=id=>document.getElementById(id);
 const cardsButton=$('summaryCardsButton'),hintsButton=$('summaryHintsButton'),minutesButton=$('summaryMinutesButton');
 function select(button){
  for(const tile of [minutesButton,cardsButton,hintsButton])tile.setAttribute('aria-pressed',String(tile===button));
  for(const [tile,panel]of [[cardsButton,$('summaryCardsPreview')],[hintsButton,$('summaryHintsPreview')]]){const expanded=tile===button;tile.setAttribute('aria-expanded',String(expanded));panel.hidden=!expanded;}
 }
 const toggle=button=>select(button.getAttribute('aria-pressed')==='true'?null:button);
 cardsButton.onclick=()=>toggle(cardsButton);
 hintsButton.onclick=()=>toggle(hintsButton);
 minutesButton.onclick=()=>{select(minutesButton);onCelebrate();$('summaryCelebration').classList.remove('summary-cheer');requestAnimationFrame(()=>$('summaryCelebration').classList.add('summary-cheer'));};
 function node(tag,text){const element=document.createElement(tag);element.textContent=text;return element;}
 return {render({cards,focus,review,seconds}){
  const minutes=Math.max(0,Math.round(seconds/60)),feedback=cleanConversationReview(review);
  $('summaryText').textContent=`Du hast ${minutes} Minuten ${course.name} gesprochen.`;
  $('summaryMinutes').textContent=minutes;$('summaryCards').textContent=cards.length;$('summaryFocus').textContent=3;
  $('summaryFocusText').textContent=feedback.improvements[0]||focus[0]?.practice||'Noch kein konkreter Verbesserungspunkt belegt. Sprich beim nächsten Mal in kurzen eigenen Sätzen weiter.';
  $('summaryFocusCard').classList.remove('hidden');
  const preview=$('summaryCardsPreview');preview.replaceChildren(node('h3','Deine neuen Karten'));
  for(const card of cards){const row=node('article','');row.append(node('strong',card.front),node('p',card.back));preview.append(row);}
  if(!cards.length)preview.append(node('p','Für dieses Gespräch wurden keine neuen Schwierigkeiten als Karten erkannt.'));
  const hints=$('summaryHintsPreview');hints.replaceChildren();
  for(const [key,title,fallback]of [
   ['strengths','Was lief gut?','Für ein konkretes Lob gibt es noch zu wenig belegte Gesprächsdaten.'],
   ['difficulties','Wo waren Schwierigkeiten?',focus.map(item=>`${item.pattern}: ${item.practice}`).join(' ')||'Keine konkrete Schwierigkeit sicher erkannt.'],
   ['improvements','Was kann man verbessern?',focus[0]?.practice||'Mit weiteren kurzen Gesprächen sammeln wir eine verlässlichere Grundlage.']
  ]){const section=node('section','');section.append(node('h3',title));const list=node('ul','');for(const text of feedback[key].length?feedback[key]:[fallback])list.append(node('li',text));section.append(list);hints.append(section);}
  const topics=$('summaryTopics');topics.replaceChildren();for(const item of focus){const chip=node('span',item.pattern);chip.className='summary-topic';topics.append(chip);}
  select(null);
 }};
}
