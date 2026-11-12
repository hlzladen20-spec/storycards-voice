import {proficiencyGoals} from './proficiency-goals.js';
export const proficiencyLevels=Object.freeze(Object.keys(proficiencyGoals));
export const proficiencyStages=Object.freeze(['Einstieg','Aufbauen','Anwenden','Festigen','Sicher werden']);
export const proficiencyMinimumSessions=3;
const dimensions=['vocabulary','grammar','interaction','structure'];
const normalise=text=>String(text||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function records(profile){return Array.isArray(profile?.proficiency?.sessions)?profile.proficiency.sessions.filter(item=>item && typeof item.id==='string' && proficiencyLevels.includes(item.level) && Array.isArray(item.goals) && Array.isArray(item.evidence) && item.evidence.length>=2).slice(-30).map(item=>({...item,goals:item.goals.filter(goal=>goal && typeof goal.id==='string' && typeof goal.quote==='string')})):[];}
function median(values){const sorted=values.map(value=>proficiencyLevels.indexOf(value)).filter(index=>index>=0).sort((a,b)=>a-b);return sorted.length?proficiencyLevels[sorted[Math.floor((sorted.length-1)/2)]]:null;}
export function recordProficiency(profile,assessment,{id,transcript,mode='alltag',now=Date.now()}){
 const previous=records(profile);if(previous.some(item=>item.id===id))return profile;
 if(!proficiencyLevels.includes(assessment?.level)||!Array.isArray(transcript))return profile;
 const learner=transcript.filter(turn=>turn?.role==='learner' && typeof turn.text==='string').map(turn=>normalise(turn.text)).filter(Boolean);
 if(learner.length<4 || learner.join(' ').split(/\s+/).length<40)return profile;
 const coach=transcript.filter(turn=>turn?.role==='coach').map(turn=>normalise(turn.text));
 const validQuote=quote=>{if(typeof quote!=='string' || quote.length>240)return false;const text=normalise(quote);return text.split(' ').length>=4 && learner.some(turn=>` ${turn} `.includes(` ${text} `)) && !coach.some(turn=>` ${turn} `.includes(` ${text} `));};
 const evidence=[...new Set((Array.isArray(assessment.evidence)?assessment.evidence:[]).filter(validQuote))].slice(0,3);
 if(evidence.length<2 || new Set(evidence.map(quote=>learner.findIndex(turn=>` ${turn} `.includes(` ${normalise(quote)} `)))).size<2)return profile;
 const goals=[];
 for(const goal of (Array.isArray(assessment.goals)?assessment.goals:[]).slice(0,10)){
  const match=typeof goal?.id==='string' && goal.id.match(/^(A1|A2|B1|B2|C1|C2)-([1-5])$/);
  if(match && validQuote(goal.quote) && !goals.some(item=>item.id===goal.id))goals.push({id:goal.id,quote:goal.quote});
 }
 const observed={};for(const dimension of dimensions){const observation=assessment.dimensions?.[dimension];if(proficiencyLevels.includes(observation?.level)&&validQuote(observation.quote))observed[dimension]={level:observation.level,quote:observation.quote};}
 const sample={id,level:assessment.level,at:now,mode:String(mode).slice(0,40),evidence,goals,dimensions:observed};
 return {...profile,proficiency:{version:1,sessions:[...previous,sample].slice(-30)}};
}
export function proficiencyView(profile){
 const sessions=records(profile),recent=sessions.slice(-5),level=sessions.length>=proficiencyMinimumSessions?median(recent.map(item=>item.level)):null;
 const goals=level?proficiencyGoals[level].map((label,index)=>{
  const id=`${level}-${index+1}`,seen=sessions.filter(session=>session.goals.some(goal=>goal.id===id));
  return {id,label,count:seen.length,confirmed:seen.length>=2,quote:seen.at(-1)?.goals.find(goal=>goal.id===id)?.quote||''};
 }):[];
 const completed=goals.filter(goal=>goal.confirmed).length;
 const skillLevels={};for(const dimension of dimensions){const observations=recent.map(item=>item.dimensions?.[dimension]?.level).filter(Boolean);skillLevels[dimension]=observations.length>=3?median(observations):null;}
 return {level,stage:proficiencyStages[Math.min(4,completed)],goals,completed,sessions:sessions.length,broader:sessions.length>=5 && new Set(recent.map(item=>item.mode)).size>=2,dimensions:skillLevels};
}
export function proficiencyCoachInstructions(profile){
 const view=proficiencyView(profile);
 if(!view.level)return ' Language range A1–C2. The learner’s level is not yet established. Begin with accessible concrete questions and adapt to the learner’s own responses. Invite a little elaboration when appropriate without turning the chat into an exam. Never assume a level from practice minutes or praise.';
 const next=view.goals.find(goal=>!goal.confirmed);
 return ` The learner’s provisional spoken-language estimate is ${view.level}, not a certified overall CEFR result. Adapt vocabulary, question complexity and requested detail to ${view.level}. For A1/A2 use simple concrete questions. For B1/B2 invite connected accounts, reasons and comparisons. For C1/C2 invite nuanced argument, reformulation, register choices and complex or abstract topics within the selected conversation setting. Simplify if the learner struggles. ${next?`When it fits naturally, give an opportunity for this app learning goal: ${next.label}.`:''} Do not announce a level test or claim mastery. Keep each of your own turns concise, but let the learner give longer answers.`;
}
