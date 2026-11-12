import {proficiencyView,proficiencyLevels,proficiencyStages,proficiencyMinimumSessions} from './proficiency.js';
export function setupProficiencyUI({getProfile,onDetails}){
 const home=document.createElement('button');home.type='button';home.className='proficiency-home';home.onclick=onDetails;
 document.querySelector('.home-progress').after(home);
 const panel=document.querySelector('#statistics .level-card');panel.className='level-card proficiency-card';
 document.querySelector('#statistics .statistics-topbar>strong').textContent='A1 → C2';
 const profileGoal=document.querySelector('#profile .profile-card');
 profileGoal.replaceChildren();const goalTitle=document.createElement('strong');goalTitle.textContent='Dein Lernweg';const goalText=document.createElement('p');goalText.textContent='A1 bis C2 · kleine Etappen · persönliche Sprechziele';profileGoal.append(goalTitle,goalText);
 function node(tag,text){const element=document.createElement(tag);element.textContent=text;return element;}
 function assessmentProgress(view){
  const section=node('div','');section.className='proficiency-assessment-progress';
  const count=Math.min(proficiencyMinimumSessions,view.sessions),remaining=proficiencyMinimumSessions-count;
  const label=node('span',`${count}/${proficiencyMinimumSessions} auswertbare Gespräche`);
  const bar=node('progress','');bar.max=proficiencyMinimumSessions;bar.value=count;bar.setAttribute('aria-label','Gespräche bis zur ersten Niveau-Einschätzung');
  const next=node('small',remaining===1?'Noch 1 auswertbares Gespräch bis zu deiner ersten Niveau-Einschätzung.':`Noch ${remaining} auswertbare Gespräche bis zu deiner ersten Niveau-Einschätzung.`);
  section.append(label,bar,next);return section;
 }
 function render(){
  const view=proficiencyView(getProfile());home.replaceChildren(node('strong',view.level?`Dein Sprechen: ungefähr ${view.level} · ${view.stage}`:'Dein Sprechen: Wir lernen dein Niveau noch kennen'));
  if(!view.level){home.append(assessmentProgress(view),node('small','Sprich pro Gespräch mindestens 4 eigene Antworten mit zusammen etwa 40 Wörtern. Es zählt nach dem Beenden und erfolgreicher Auswertung – nicht nur die Gesprächszeit.'));}
  home.append(node('small',view.level?`${view.completed}/5 Lernziele gefestigt · Details ›`:'Dein Lernweg A1–C2 · Details ›'));
  panel.replaceChildren(node('h3','Dein Sprechen · A1 bis C2'));
  const scale=node('div','');scale.className='proficiency-scale';for(const level of proficiencyLevels){const chip=node('span',level);if(level===view.level){chip.className='active';chip.setAttribute('aria-current','step');}scale.append(chip);}panel.append(scale);
  if(!view.level){panel.append(assessmentProgress(view),node('p','Wir lernen dein Niveau noch kennen. Für eine erste vorsichtige Einschätzung brauchen wir mindestens drei auswertbare Gespräche. Sprich pro Gespräch mindestens 4 eigene Antworten mit insgesamt mindestens 40 Wörtern. Die Auswertung muss außerdem mindestens zwei belegbare eigene Aussagen aus verschiedenen Antworten erkennen. Kurze Antworten und Nachsprechen allein reichen nicht. Ein Gespräch zählt erst nach dem Beenden und erfolgreicher Auswertung.'));}
  else{
   panel.append(node('h4',`Ungefähr ${view.level} · Etappe ${Math.min(5,view.completed+1)}/5: ${view.stage}`),node('p',view.broader?'Vorläufige Einschätzung aus mehreren Gesprächen und Themen.':'Erste vorläufige Einschätzung. Weitere Themen helfen, sie besser einzuordnen.'));
   const stages=node('p',proficiencyStages.join(' → '));stages.className='proficiency-stage-names';panel.append(stages);
   const bar=node('progress','');bar.max=5;bar.value=view.completed;bar.setAttribute('aria-label','Wiederholt gezeigte Lernziele auf diesem Niveau');panel.append(bar,node('p',`${view.completed} von 5 Lernzielen wiederholt gezeigt`));
   const goals=node('ul','');goals.className='proficiency-goals';for(const goal of view.goals){const row=node('li',`${goal.confirmed?'✓':goal.count?'◐':'○'} ${goal.label}`);row.append(node('small',goal.confirmed?'In mehreren Gesprächen gezeigt':goal.count?'Einmal beobachtet · weiter anwenden':'Noch nicht ausreichend beobachtet'));if(goal.quote){const quote=node('q',goal.quote);row.append(quote);}goals.append(row);}panel.append(goals);
   const skills=node('p',Object.entries({vocabulary:'Wortschatz',grammar:'Grammatik',interaction:'Gesprächsführung',structure:'Zusammenhang'}).map(([key,label])=>`${label}: ${view.dimensions[key]||'noch offen'}`).join(' · '));panel.append(skills);
  }
  panel.append(node('p','Die fünf Etappen sind App-Lernschritte, keine offiziellen Zusatzniveaus. Gefestigte Ziele führen nicht automatisch zum nächsten CEFR-Niveau.'));
  panel.append(node('small','Orientierung anhand eigener Gesprächsbeiträge, kein Zertifikat. Lesen, Schreiben, Hörverständnis, Aussprache und Sprechflüssigkeit werden hier nicht verlässlich geprüft. Auch C1/C2 bleiben vorläufige Hinweise und brauchen breitere Aufgaben.'));
 }
 render();return {render};
}
