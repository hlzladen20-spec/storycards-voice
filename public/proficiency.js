import {proficiencyGoals} from './proficiency-goals.js';
import {ENGLISH_CHECK_MIN_TURNS,ENGLISH_CHECK_MIN_WORDS} from './english-check.js';
import {checkAssessment,checkPolicy,normaliseCheckText} from './check-assessment.js';
export const proficiencyLevels=Object.freeze(Object.keys(proficiencyGoals));
export const proficiencyStages=Object.freeze(['Einstieg','Aufbauen','Anwenden','Festigen','Sicher werden']);
export const proficiencyMinimumSessions=3;
const dimensions=['vocabulary','grammar','interaction','structure'];
const normalise=text=>String(text||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const bands=['A1','A2','B1','B2','C1','C2'];
function records(profile){return Array.isArray(profile?.proficiency?.sessions)?profile.proficiency.sessions.filter(item=>item && typeof item.id==='string' && proficiencyLevels.includes(item.level) && Array.isArray(item.goals) && Array.isArray(item.evidence) && item.evidence.length>=2).slice(-30).map(item=>({...item,goals:item.goals.filter(goal=>goal && typeof goal.id==='string' && typeof goal.quote==='string')})):[];}
function median(values){const sorted=values.map(value=>proficiencyLevels.indexOf(value)).filter(index=>index>=0).sort((a,b)=>a-b);return sorted.length?proficiencyLevels[sorted[Math.floor((sorted.length-1)/2)]]:null;}
export function recordProficiency(profile,assessment,{id,transcript,mode='alltag',now=Date.now()}){
 const previous=records(profile);if(previous.some(item=>item.id===id))return profile;
 if(mode==='niveaucheck' && assessment?.rubricVersion===2){
  const report=checkAssessment(assessment,transcript);if(!report.ready)return profile;
  const own=(transcript||[]).filter(turn=>turn?.role==='learner').map(turn=>normaliseCheckText(turn.text));
  const goals=(Array.isArray(assessment.goals)?assessment.goals:[]).filter(goal=>typeof goal?.id==='string' && /^(A1|A2|B1|B2|C1|C2)-[1-5]$/.test(goal.id) && typeof goal.quote==='string' && goal.quote.length<=240 && normaliseCheckText(goal.quote).split(' ').length>=report.policy.quoteWords && own.some(turn=>` ${turn} `.includes(` ${normaliseCheckText(goal.quote)} `))).filter((goal,index,list)=>list.findIndex(item=>item.id===goal.id)===index).slice(0,6).map(goal=>({id:goal.id,quote:goal.quote}));
  const sample={id,level:report.level,at:now,mode:'niveaucheck',kind:'placement',rubricVersion:2,evidence:report.evidence.slice(0,3),goals,dimensions:report.observed,confidence:assessment.confidence,reason:assessment.reason.trim().slice(0,800),limits:typeof assessment.limits==='string'?assessment.limits.trim().slice(0,800):'',tasks:report.tasks.slice(0,4),boundary:report.boundary,learnerTurns:report.counts.turns,learnerWords:report.counts.words};
  return {...profile,proficiency:{version:2,sessions:[...previous,sample].slice(-30)}};
 }
 if(!proficiencyLevels.includes(assessment?.level)||!Array.isArray(transcript))return profile;
 const learner=transcript.filter(turn=>turn?.role==='learner' && typeof turn.text==='string').map(turn=>normalise(turn.text)).filter(Boolean);
 if(learner.length<4 || learner.join(' ').split(/\s+/).length<40)return profile;
 const coach=transcript.filter(turn=>turn?.role==='coach').map(turn=>normalise(turn.text));
 const check=mode==='niveaucheck';
 const independent=[...new Set(learner.filter(turn=>turn.split(' ').length>=3 && !coach.some(line=>` ${line} `.includes(` ${turn} `))))];
 const learnerWords=independent.join(' ').split(/\s+/).length;
 if(check && (independent.length<ENGLISH_CHECK_MIN_TURNS || learnerWords<ENGLISH_CHECK_MIN_WORDS))return profile;
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
 if(assessment.rubricVersion===2){
  // Level follows multiple evidenced skills, not the model's one-word verdict.
  const skillBands=Object.values(observed).map(item=>bands.indexOf(item.level));
  const quotes=new Set(Object.values(observed).map(item=>learner.findIndex(turn=>` ${turn} `.includes(` ${normalise(item.quote)} `))));
  if(!['medium','high'].includes(assessment.confidence) || skillBands.length<3 || quotes.size<3 || typeof assessment.reason!=='string' || !assessment.reason.trim())return profile;
  if(Math.max(...skillBands)-Math.min(...skillBands)>1)return profile;
  sample.level=median(Object.values(observed).map(item=>item.level));
  const tasks=(Array.isArray(assessment.tasks)?assessment.tasks:[]).filter(task=>['daily','past','practical','reasoning'].includes(task?.area)&&validQuote(task.quote));
  sample.rubricVersion=2;sample.confidence=assessment.confidence;sample.reason=assessment.reason.trim().slice(0,800);
  sample.limits=typeof assessment.limits==='string'?assessment.limits.trim().slice(0,800):'';
  sample.tasks=tasks.slice(0,4);sample.boundary=null;
 }
 if(check){sample.kind='placement';sample.learnerTurns=independent.length;sample.learnerWords=learnerWords;}
 return {...profile,proficiency:{version:assessment.rubricVersion===2?2:1,sessions:[...previous,sample].slice(-30)}};
}
export function proficiencyView(profile){
 const history=records(profile),calibrated=history.filter(item=>item.rubricVersion===2);
 // Keep old history, but never average it into a recalibrated result.
 const sessions=calibrated.length?calibrated:history;
 const isCheck=item=>{const minimum=item.rubricVersion===2?checkPolicy(item.level):{turns:ENGLISH_CHECK_MIN_TURNS,words:ENGLISH_CHECK_MIN_WORDS};return item.kind==='placement' && item.mode==='niveaucheck' && item.learnerTurns>=minimum.turns && item.learnerWords>=minimum.words;};
 const latestCheck=sessions.findLastIndex(item=>item.rubricVersion===2 && isCheck(item));
 const current=latestCheck>=0?sessions.slice(latestCheck):sessions,recent=current.slice(-5);
 const placement=sessions.findLast(isCheck);
 const level=latestCheck>=0?(recent.length<3?current[0].level:median(recent.map(item=>item.level))):sessions.length>=proficiencyMinimumSessions?median(recent.map(item=>item.level)):placement?.level||null;
 const goals=level?proficiencyGoals[level].map((label,index)=>{
  const id=`${level}-${index+1}`,seen=sessions.filter(session=>session.goals.some(goal=>goal.id===id));
  return {id,label,count:seen.length,confirmed:seen.length>=2,quote:seen.at(-1)?.goals.find(goal=>goal.id===id)?.quote||''};
 }):[];
 const completed=goals.filter(goal=>goal.confirmed).length;
 const skillLevels={};for(const dimension of dimensions){const observations=recent.map(item=>item.dimensions?.[dimension]?.level).filter(Boolean);skillLevels[dimension]=observations.length>=3 || latestCheck>=0?median(observations):null;}
 const basis=recent.at(-1);
 return {level,legacy:Boolean(level && !calibrated.length),reason:basis?.reason||'',limits:basis?.limits||'',confidence:basis?.confidence||'unconfirmed',stage:proficiencyStages[Math.min(4,completed)],goals,completed,sessions:sessions.length,fromCheck:Boolean(level && placement && (sessions.length<proficiencyMinimumSessions || latestCheck>=0)),broader:sessions.length>=5 && new Set(recent.map(item=>item.mode)).size>=2,dimensions:skillLevels};
}
export function proficiencyCoachInstructions(profile){
 const view=proficiencyView(profile);
 if(!view.level)return ' Language range A1–C2. The learner’s level is not yet established. Begin with accessible concrete questions and adapt to the learner’s own responses. Invite a little elaboration when appropriate without turning the chat into an exam. Never assume a level from practice minutes or praise.';
 const next=view.goals.find(goal=>!goal.confirmed);
 return ` The learner’s provisional spoken-language estimate is ${view.level}, not a certified overall CEFR result.${view.legacy?' This older estimate is unconfirmed and may be wrong. Do not anchor your questions to it; actively explore easier and harder tasks.':''} Adapt vocabulary, question complexity and requested detail to demonstrated ability, using ${view.level} only as a tentative starting point. For A1/A2 use simple concrete questions. For B1/B2 invite connected accounts, reasons and comparisons. For C1/C2 invite nuanced argument, reformulation, register choices and complex or abstract topics within the selected conversation setting. Simplify if the learner struggles. ${next?`When it fits naturally, give an opportunity for this app learning goal: ${next.label}.`:''} Do not announce a level test or claim mastery. Keep each of your own turns concise, but let the learner give longer answers.`;
}
