import {LANGUAGE_COURSES} from './language-courses.js';
import {proficiencyView,proficiencyLevels,proficiencyStages,proficiencyMinimumSessions} from './proficiency.js';
import {skillLabels} from './check-assessment.js';
import {renderLearningQuality} from './learning-quality.js';
import {setupLearningChart} from './learning-chart.js';
export function setupProficiencyUI({getProfile,getCards,getVocabulary,getStats,onDetails,onCheck,onVocabularyGoalSave=null,course=LANGUAGE_COURSES.en,getCoachName=()=> 'Emma',coachLabel=text=>text}){
 const home=document.createElement('button');home.type='button';home.className='proficiency-home';home.onclick=onDetails;
 const panel=document.querySelector('#statistics .level-card');panel.className='level-card proficiency-card';
 document.querySelector('#statistics .statistics-topbar>strong').textContent='A1 → C2';
 const profileGoal=document.querySelector('#profileLearningPath');
 profileGoal.replaceChildren();const goalTitle=document.createElement('strong');goalTitle.textContent='Dein Lernweg';const goalText=document.createElement('p');goalText.textContent='A1 bis C2 · kleine Etappen · persönliche Sprechziele';profileGoal.append(goalTitle,goalText);
 function node(tag,text){const element=document.createElement(tag);element.textContent=text;return element;}
 function disclosure(title,...content){const details=document.createElement('details');details.className='proficiency-details';details.append(node('summary',title),...content);return details;}
 function checkButton(){const button=node('button',`🎙 ${course.name}-Check · bis zu 5 Minuten`);button.type='button';button.className='secondary proficiency-check-button';button.onclick=onCheck;return button;}
 profileGoal.append(home);
 const profilePath=document.createElement('section');profilePath.className='profile-learning-path';profileGoal.append(profilePath);
 goalTitle.hidden=true;goalText.hidden=true;home.hidden=true;
 const quality=document.createElement('section');quality.className='learning-quality';document.querySelector('#statisticsSpeakingSection').before(quality);
 const chartHost=document.createElement('section'),overview=document.querySelector('#statistics .statistics-overview');
 if(overview)overview.after(chartHost);else quality.before(chartHost);
 const chart=setupLearningChart(chartHost,{getCards,getVocabulary,getStats,getProfile,onVocabularyGoalSave,language:course.target});
 function learningPath(view){
  profilePath.replaceChildren(node('h3','Dein Lernpfad'));
  const path=node('ol','');path.className='learning-path';
  for(const level of proficiencyLevels){const point=node('li',level);if(level===view.level){point.className='current';point.setAttribute('aria-current','step');}path.append(point);}
  profilePath.append(path,node('p',view.legacy?'Frühere Schätzung (unbestätigt): '+view.level:view.level?'Ungefähr '+view.level+' · '+view.stage:'Dein Startpunkt wird noch eingeschätzt.'));
  if(view.legacy)profilePath.append(node('small',coachLabel('Neue auswertbare Gespräche mit Emma helfen, diese ältere Einordnung zu überprüfen.')));
  if(view.level&&!view.legacy){const progress=node('progress','');progress.max=5;progress.value=view.completed;progress.setAttribute('aria-label','Bestätigte Lernziele auf deinem aktuellen Niveau');profilePath.append(progress,node('small',view.completed+' von 5 Lernzielen mehrfach gezeigt · keine Prozentzahl bis zum nächsten Niveau.'));
   const goals=node('ul','');goals.className='path-next-goals';for(const goal of view.goals.filter(goal=>!goal.confirmed).slice(0,3))goals.append(node('li',goal.label));profilePath.append(node('h4','Deine nächsten Lernziele'),goals);
  }else if(!view.level)profilePath.append(assessmentProgress(view));
  profilePath.append(node('small',coachLabel('Die Einschätzung entsteht aus Gesprächen mit Emma und ist kein offizielles Prüfungsergebnis.')));
  const details=node('button','Belege und Entwicklung ansehen →');details.type='button';details.className='ghost';details.onclick=onDetails;profilePath.append(details);
 }

 if(onCheck){profileGoal.append(checkButton(),disclosure(`Was ist der ${course.name}-Check?`,node('p',`Freiwillig: Statt auf drei Gespräche zu warten, kannst du einen kurzen ${course.name}-Check machen. Bei genügend eigenen Antworten liefert er eine erste Orientierung. Du kannst ihn später wiederholen; er überschreibt deinen bisherigen Lernstand nicht.`)));}
 const practice=document.querySelector('#practice');practice.setAttribute('data-language-check','false');
 const checkResult=node('section','');checkResult.className='english-check-result';checkResult.hidden=true;checkResult.setAttribute('aria-label',`Ergebnis deines ${course.name}-Checks`);document.querySelector('#summaryText').after(checkResult);
 function renderCheckProgress(transcript){
  document.querySelector('#practice .conversation-topbar>strong').textContent=transcript?`${course.name}-Check`:'Gespräch';
  practice.setAttribute('data-language-check',String(Boolean(transcript)));
 }
 function renderCheckResult(id,report=null){
  checkResult.hidden=!id;checkResult.replaceChildren();if(!id)return;
  const sample=getProfile()?.proficiency?.sessions?.find(item=>item.id===id && item.kind==='placement');
  checkResult.append(node('h3',sample?`Dein ${course.name}-Check: ungefähr ${sample.level}`:'Noch keine verlässliche Einschätzung'));
  checkResult.append(node('p',sample?'Eine erste Orientierung aus verschiedenen Aufgaben und deinen eigenen Antworten. Kein zertifiziertes Ergebnis.':'Der bisherige Lernstand bleibt erhalten. Ein unvollständiger Check ist kein schlechtes Testergebnis.'));
  if(report?.cardWarning)checkResult.append(node('p',report.cardWarning));
  const observations=sample?.dimensions||report?.observed||{};
  if(Object.keys(observations).length){checkResult.append(node('h4',sample?'Deine Sprachbereiche (vorläufig)':'Bereits beobachtet – noch keine Gesamteinstufung'));const list=node('ul','');for(const [skill,value]of Object.entries(observations))if(skillLabels[skill])list.append(node('li',`${skillLabels[skill]}: Hinweis auf ${value.level}`));checkResult.append(list);}
  if(!sample){const list=node('ul','');for(const item of report?.missing||[{message:'Die KI hat noch keine ausreichend belegte Einschätzung geliefert.'}])list.append(node('li',item.message));checkResult.append(disclosure('Was für eine genauere Einschätzung noch fehlt',list),node('small','Es werden derzeit eigene verschriftlichte Antworten beurteilt, nicht verlässlich Aussprache, Sprechflüssigkeit oder Hörverständnis.'));
  }
  if(sample?.reason)checkResult.append(node('h4','Warum diese Einschätzung?'),node('p',sample.reason));
  if(sample?.limits)checkResult.append(node('h4','Was noch offen ist'),node('p',sample.limits));
  if(sample){checkResult.append(node('p','Stärken und Verbesserungsmöglichkeiten findest du unter „Lernbereiche“. Aussprache, Sprechflüssigkeit und Hörverständnis sind damit nicht zuverlässig geprüft. Kein Zertifikat.'));const details=node('button','Deinen Lernweg ansehen');details.type='button';details.className='secondary';details.onclick=onDetails;checkResult.append(details);}
 }
 function assessmentProgress(view){
  const section=node('div','');section.className='proficiency-assessment-progress';
  const count=Math.min(proficiencyMinimumSessions,view.sessions),remaining=proficiencyMinimumSessions-count;
  const label=node('span',`${count}/${proficiencyMinimumSessions} auswertbare Gespräche`);
  const bar=node('progress','');bar.max=proficiencyMinimumSessions;bar.value=count;bar.setAttribute('aria-label','Gespräche bis zur ersten Niveau-Einschätzung');
  const next=node('small',remaining===1?'Noch 1 auswertbares Gespräch bis zu deiner ersten Niveau-Einschätzung.':`Noch ${remaining} auswertbare Gespräche bis zu deiner ersten Niveau-Einschätzung.`);
  section.append(label,bar,next);return section;
 }
 function render(){
  chart.refresh();
  learningPath(proficiencyView(getProfile()));
  renderLearningQuality(quality,getProfile(),{getCoachName,onPractice:()=>document.dispatchEvent(new Event('storycards-targeted-practice'))});
  const view=proficiencyView(getProfile());home.replaceChildren(node('strong',view.level?`${view.legacy?'Frühere Schätzung (unbestätigt)':'Dein Sprachlevel'}: ungefähr ${view.level} · ${view.stage}`:'Dein Sprachlevel: Wir lernen dein Niveau noch kennen'));
  if(view.legacy)home.append(node('small',coachLabel('Neue normale Gespräche mit Emma helfen, diese frühere Schätzung zu überprüfen.')));
  if(!view.level){home.append(assessmentProgress(view),node('small','Sprich pro Gespräch mindestens 4 eigene Antworten mit zusammen etwa 40 Wörtern. Es zählt nach dem Beenden und erfolgreicher Auswertung – nicht nur die Gesprächszeit.'));}
  home.append(node('small',view.level?`${view.completed}/5 Lernziele gefestigt · Details ›`:'Dein Lernweg A1–C2 · Details ›'));
  panel.replaceChildren(node('h3','Dein Sprachlevel · A1 bis C2'));
  if(view.legacy)panel.append(node('p',coachLabel('Alte, unbestätigte Einordnung: Weitere normale Gespräche mit Emma helfen bei der neuen Einschätzung. Alte Ergebnisse werden nicht in die neue Einstufung hineingemittelt. Deine Karten und Lernstatistik bleiben erhalten.')));
  const assessmentNotes=[];
  if(view.reason)assessmentNotes.push(node('h4','Begründung'),node('p',view.reason));
  if(view.limits)assessmentNotes.push(node('h4','Noch nicht gesichert'),node('p',view.limits));
  const scale=node('div','');scale.className='proficiency-scale';for(const level of proficiencyLevels){const chip=node('span',level);if(level===view.level){chip.className='active';chip.setAttribute('aria-current','step');}scale.append(chip);}panel.append(scale);
  if(!view.level){panel.append(assessmentProgress(view),disclosure('Welche Gespräche zählen?',node('p','Wir lernen dein Niveau noch kennen. Für eine erste vorsichtige Einschätzung brauchen wir mindestens drei auswertbare Gespräche. Sprich pro Gespräch mindestens 4 eigene Antworten mit insgesamt mindestens 40 Wörtern. Die Auswertung muss außerdem mindestens zwei belegbare eigene Aussagen aus verschiedenen Antworten erkennen. Kurze Antworten und Nachsprechen allein reichen nicht. Ein Gespräch zählt erst nach dem Beenden und erfolgreicher Auswertung.')));}
  else{
   panel.append(node('h4',`Ungefähr ${view.level} · Etappe ${Math.min(5,view.completed+1)}/5: ${view.stage}`),node('p',view.fromCheck?`Erste Orientierung aus deinem ${course.name}-Check. Weitere Gespräche müssen sie noch bestätigen.`:view.broader?'Vorläufige Einschätzung aus mehreren Gesprächen und Themen.':'Erste vorläufige Einschätzung. Weitere Themen helfen, sie besser einzuordnen.'));
   const stages=node('p',proficiencyStages.join(' → '));stages.className='proficiency-stage-names';panel.append(stages);
   const bar=node('progress','');bar.max=5;bar.value=view.completed;bar.setAttribute('aria-label','Wiederholt gezeigte Lernziele auf diesem Niveau');panel.append(bar,node('p',`${view.completed} von 5 Lernzielen wiederholt gezeigt`));
   const goals=node('ul','');goals.className='proficiency-goals';for(const goal of view.goals){const row=node('li',`${goal.confirmed?'✓':goal.count?'◐':'○'} ${goal.label}`);row.append(node('small',goal.confirmed?'In mehreren Gesprächen gezeigt':goal.count?'Einmal beobachtet · weiter anwenden':'Noch nicht ausreichend beobachtet'));if(goal.quote){const quote=node('q',goal.quote);row.append(quote);}goals.append(row);}panel.append(disclosure('Lernziele & Beispiele',goals));
   const skills=node('p',Object.entries({vocabulary:'Wortschatz',grammar:'Grammatik',interaction:'Gesprächsführung',structure:'Zusammenhang'}).map(([key,label])=>`${label}: ${view.dimensions[key]||'noch offen'}`).join(' · '));assessmentNotes.push(skills);
  }
  if(assessmentNotes.length)panel.append(disclosure('Warum diese Einschätzung?',...assessmentNotes));
  panel.append(disclosure('So funktioniert die Einschätzung',node('p','Die fünf Etappen sind App-Lernschritte, keine offiziellen Zusatzniveaus. Gefestigte Ziele führen nicht automatisch zum nächsten CEFR-Niveau.'),node('p','Orientierung anhand eigener Gesprächsbeiträge, kein Zertifikat. Lesen, Schreiben, Hörverständnis, Aussprache und Sprechflüssigkeit werden hier nicht verlässlich geprüft. Auch C1/C2 bleiben vorläufige Hinweise und brauchen breitere Aufgaben.')));
 }
 render();return {render,renderCharts:chart.refresh,renderCheckProgress,renderCheckResult};
}
