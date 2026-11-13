// One evidence contract for early completion, final recording and partial-result feedback.
// These are app safeguards, not a psychometrically validated examination standard.
export const checkBands=Object.freeze(['A1','A2','B1','B2','C1','C2']);
export const checkAreas=Object.freeze(['daily','past','practical','reasoning']);
export const checkSkills=Object.freeze(['vocabulary','grammar','interaction','structure']);
export const skillLabels=Object.freeze({vocabulary:'Wortschatz',grammar:'Grammatik',interaction:'Gesprächsführung',structure:'Zusammenhang'});
export const normaliseCheckText=text=>String(text||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function checkPolicy(level){return ['A1','A2'].includes(level)?{turns:6,words:40,quoteWords:2}:{turns:8,words:100,quoteWords:4};}
export function independentAnswers(transcript){
 const turns=Array.isArray(transcript)?transcript:[],coach=turns.filter(turn=>turn?.role==='coach').map(turn=>normaliseCheckText(turn.text));
 return [...new Set(turns.filter(turn=>turn?.role==='learner').map(turn=>normaliseCheckText(turn.text)).filter(text=>text.split(' ').length>=2 && !coach.some(line=>` ${line} `.includes(` ${text} `))))];
}
export function checkAssessment(assessment,transcript){
 const turns=Array.isArray(transcript)?transcript:[],answers=independentAnswers(turns);
 const missing=[],observed={},tasks=[],normalise=normaliseCheckText;
 const add=(code,message,instruction)=>missing.push({code,message,instruction});
 const quoteIndex=(quote,min=2)=>{
  if(typeof quote!=='string'||quote.length>240)return -1;const text=normalise(quote);
  const words=text.split(' ').length;return words>=min && words<=40?answers.findIndex(answer=>` ${answer} `.includes(` ${text} `)):-1;
 };
 for(const skill of checkSkills){const value=assessment?.dimensions?.[skill];if(checkBands.includes(value?.level) && quoteIndex(value.quote)>=0)observed[skill]={level:value.level,quote:value.quote};}
 const skillBands=Object.values(observed).map(value=>checkBands.indexOf(value.level)).sort((a,b)=>a-b);
 const level=skillBands.length>=3?checkBands[skillBands[Math.floor((skillBands.length-1)/2)]]:null;
 const policy=checkPolicy(level||assessment?.level||(skillBands.length?checkBands[skillBands[Math.floor((skillBands.length-1)/2)]]:null)),wordCount=answers.length?answers.join(' ').split(' ').length:0;
 if(answers.length<policy.turns || wordCount<policy.words)add('sample',`Noch zu wenig eigene Sprache für diese Einschätzung (${answers.length} unterschiedliche Antworten, ${wordCount} Wörter).`,'Invite another independent answer with a reason or a concrete example. Simplify for beginners; do not demand advanced vocabulary.');
 if(assessment?.rubricVersion!==2 || !checkBands.includes(assessment?.level))add('assessment','Die KI hat noch keine vollständig belegte Einstufung geliefert.','Build a rubricVersion:2 assessment from actual saved learner answers; never guess a level.');
 const evidence=(Array.isArray(assessment?.evidence)?assessment.evidence:[]).filter(quote=>quoteIndex(quote,policy.quoteWords)>=0);
 if(new Set(evidence.map(quote=>quoteIndex(quote,policy.quoteWords))).size<2)add('evidence','Für die Einstufung fehlen zwei eindeutig belegte eigene Aussagen.','Use verbatim quotes from two distinct independent learner turns, not paraphrases.');
 const skillSources=new Set(Object.values(observed).map(value=>quoteIndex(value.quote,policy.quoteWords)));
 if(skillBands.length<3 || skillSources.has(-1) || skillSources.size<3)add('skills','Mindestens drei Sprachbereiche müssen durch verschiedene eigene Antworten belegt sein.','Probe the missing skill with one task, then cite three distinct learner turns for three skill dimensions.');
 if(skillBands.length && skillBands.at(-1)-skillBands[0]>1)add('spread','Die beobachteten Sprachbereiche liegen zu weit auseinander für eine einzelne Niveauangabe.','Clarify the strongest and weakest observed skill with one targeted follow-up; preserve uncertainty if the difference remains.');
 if(!['medium','high'].includes(assessment?.confidence) || typeof assessment?.reason!=='string' || !assessment.reason.trim())add('confidence','Die Einstufung ist noch nicht ausreichend begründet oder zu unsicher.','Give an evidence-based German reason and only medium/high confidence when supported. Otherwise continue diagnostic tasks.');
 for(const task of (Array.isArray(assessment?.tasks)?assessment.tasks:[]))if(checkAreas.includes(task?.area) && quoteIndex(task.quote,policy.quoteWords)>=0)tasks.push({area:task.area,quote:task.quote});
 const covered=[...new Set(tasks.map(task=>task.area))];
 if(covered.length<3 || new Set(tasks.map(task=>quoteIndex(task.quote,policy.quoteWords))).size<3){
  const absent=checkAreas.filter(area=>!covered.includes(area)),names={daily:'Alltag',past:'Erzählen über Vergangenes',practical:'eine praktische Situation',reasoning:'Begründen und Vergleichen'};
  add('tasks',`Es fehlen ausreichend belegte Aufgabenbereiche${absent.length?': '+absent.map(area=>names[area]).join(', '):' aus unterschiedlichen Antworten'}.`,`Ask one short task in a missing area: ${absent.join(', ')||'a different task'}. Adapt it to demonstrated ability; an attempted beginner answer can be brief.`);
 }
 const boundary=assessment?.boundary,question=normalise(boundary?.question),answerIndex=quoteIndex(boundary?.quote,policy.quoteWords);
 let paired=false;
 for(let i=0;i<turns.length;i++)if(turns[i]?.role==='coach' && question && ` ${normalise(turns[i].text)} `.includes(` ${question} `)){
  const next=[];for(let j=i+1;j<turns.length && turns[j]?.role!=='coach';j++)if(turns[j]?.role==='learner')next.push(normalise(turns[j].text));
  if(next.some(text=>` ${text} `.includes(` ${normalise(boundary?.quote)} `)))paired=true;
 }
 const boundaryValid=level && checkBands.includes(boundary?.level) && checkBands.indexOf(boundary.level)>=checkBands.indexOf(level) && ['successful','limited'].includes(boundary.outcome) && !(boundary.outcome==='limited' && boundary.level===level) && answerIndex>=0 && typeof boundary.question==='string' && question.split(' ').length>=4 && boundary.question.length<=500 && paired;
 if(!boundaryValid)add('boundary','Es fehlt eine passende Nachfrage an der Niveaugrenze mit zugehöriger eigener Antwort.','Ask a boundary task at the proposed level or one band higher. If difficult, simplify once. Record the actual coach question and the learner response; a failed higher task is not proof of that higher level.');
 return {ready:missing.length===0,level,observed,evidence,tasks,boundary:boundaryValid?boundary:null,missing,counts:{turns:answers.length,words:wordCount},policy};
}
