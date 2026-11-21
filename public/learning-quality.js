import {proficiencyLevels,proficiencyView} from './proficiency.js';
const labels={vocabulary:'Wortschatz',grammar:'Grammatik',interaction:'Gesprächsführung',structure:'Zusammenhang'};
const median=values=>{const sorted=values.map(value=>proficiencyLevels.indexOf(value)).sort((a,b)=>a-b);return proficiencyLevels[sorted[Math.floor((sorted.length-1)/2)]];};
export function learningQuality(profile={}){
 const sessions=(Array.isArray(profile?.proficiency?.sessions)?profile.proficiency.sessions:[]).filter(item=>item&&item.rubricVersion===2&&item.kind!=='placement');
 const skills=Object.entries(labels).map(([key,label])=>{
  const observations=sessions.filter(item=>proficiencyLevels.includes(item.dimensions?.[key]?.level)&&typeof item.dimensions[key].quote==='string'&&item.dimensions[key].quote.trim());
  const current=observations.slice(-3),previous=observations.slice(-6,-3);
  const level=current.length===3?median(current.map(item=>item.dimensions[key].level)):null;
  const before=previous.length===3?median(previous.map(item=>item.dimensions[key].level)):null;
  const trend=level&&before?Math.sign(proficiencyLevels.indexOf(level)-proficiencyLevels.indexOf(before)):null;
  return {key,label,level,previous:before,trend,samples:observations.length,quote:observations.at(-1)?.dimensions[key].quote||''};
 });
 const view=proficiencyView(profile),nextGoal=view.goals.find(goal=>!goal.confirmed);
 const focus=(Array.isArray(profile?.focus)?profile.focus:[]).find(item=>item&&typeof item.pattern==='string'&&typeof item.practice==='string');
 return {skills,sessions:sessions.length,recommendation:focus?`${focus.pattern}: ${focus.practice}`:nextGoal?nextGoal.label:'Sprich über ein eigenes Erlebnis und begründe deine Meinung. Weitere Gespräche helfen, deinen nächsten Lernschritt zu erkennen.'};
}
export function renderLearningQuality(host,profile,{onPractice=()=>{}}={}){
 const data=learningQuality(profile),node=(tag,text)=>{const element=document.createElement(tag);element.textContent=text;return element;};
 host.replaceChildren(node('h3','Deine Lernentwicklung'),node('p','Vorläufige Hinweise aus eigenen Gesprächsbeiträgen. Keine Prozentwerte und keine Sprachprüfung.'));
 const list=node('div','');list.className='quality-skills';
 for(const skill of data.skills){
  const row=node('div','');row.className='quality-skill';
  row.append(node('strong',skill.label),node('span',skill.level?`ungefähr ${skill.level}`:`${Math.min(3,skill.samples)}/3 Gesprächsbelege`));
  const scale=node('div','');scale.className='quality-scale';scale.setAttribute('aria-label',skill.level?`${skill.label}: ungefähr ${skill.level}`:'Noch nicht genügend Belege');
  for(const level of proficiencyLevels){const point=node('span',level);if(level===skill.level)point.className='current';scale.append(point);}row.append(scale);
  if(skill.previous)row.append(node('small',`Vorherige 3 → letzte 3 auswertbare Gespräche: ${skill.previous} → ${skill.level}. ${skill.trend>0?'Hinweis auf Entwicklung.':skill.trend<0?'Zuletzt anspruchsvoller oder unsicherer – weitere Gespräche abwarten.':'In diesem Bereich zuletzt ähnlich eingeordnet.'}`));
  list.append(row);
 }
 const next=node('div','');next.className='quality-next';next.append(node('strong','Dein nächster Lernschritt'),node('p',data.recommendation));
 const button=node('button','Mit Emma gezielt üben →');button.type='button';button.className='primary';button.onclick=onPractice;next.append(button);
 host.append(list,next,node('small','Sprachfluss, Aussprache und Hörverständnis werden aus dem Gesprächstext nicht zuverlässig bewertet.'));
}
