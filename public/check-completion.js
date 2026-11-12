// Finishing a check is a model request, not proof of a level. Validate the
// learner's actual transcript before closing; the final assessment runs later.
import {ENGLISH_CHECK_MIN_TURNS,ENGLISH_CHECK_MIN_WORDS} from './english-check.js';
const normalise=text=>String(text||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const checkAreas=Object.freeze(['daily','past','practical','reasoning']);
export const checkCompletionTool=Object.freeze({type:'function',name:'complete_language_check',description:'Request an early finish only after enough independent answers across three task areas and a level-boundary probe. No score is assigned here.',parameters:{type:'object',properties:{tasks:{type:'array',items:{type:'object',properties:{area:{type:'string',enum:checkAreas},quote:{type:'string'}},required:['area','quote'],additionalProperties:false}},boundaryTested:{type:'boolean'},boundary:{type:'object',properties:{question:{type:'string',description:'Verbatim coach question probing a level boundary'},quote:{type:'string',description:'Verbatim independent learner response'}},required:['question','quote'],additionalProperties:false}},required:['tasks','boundaryTested','boundary'],additionalProperties:false}});
export function independentAnswers(transcript){
 const coach=(transcript||[]).filter(turn=>turn?.role==='coach').map(turn=>normalise(turn.text));
 return [...new Set((transcript||[]).filter(turn=>turn?.role==='learner').map(turn=>normalise(turn.text)).filter(text=>text.split(' ').length>=3 && !coach.some(line=>` ${line} `.includes(` ${text} `))))];
}
export function completionEvidence(input,transcript){
 const answers=independentAnswers(transcript);
 if(answers.length<ENGLISH_CHECK_MIN_TURNS || answers.join(' ').split(' ').length<ENGLISH_CHECK_MIN_WORDS || input?.boundaryTested!==true || !Array.isArray(input.tasks))return false;
 if(typeof input.boundary?.question!=='string' || typeof input.boundary?.quote!=='string')return false;
 const question=normalise(input.boundary.question),quote=normalise(input.boundary.quote);
 if(question.split(' ').length<4 || quote.split(' ').length<4 || !answers.some(answer=>` ${answer} `.includes(` ${quote} `)) || !(transcript||[]).some(turn=>turn?.role==='coach' && ` ${normalise(turn.text)} `.includes(` ${question} `)))return false;
 const areas=new Set(),turns=new Set();
 for(const task of input.tasks){
  if(!checkAreas.includes(task?.area) || typeof task.quote!=='string')continue;
  const quote=normalise(task.quote),index=answers.findIndex(answer=>` ${answer} `.includes(` ${quote} `));
  if(quote.split(' ').length<4 || index<0 || turns.has(index))continue;
  turns.add(index);areas.add(task.area);
 }
 return areas.size>=3;
}

export function createCheckCompletion({isActive,getTranscript,send,onComplete,schedule=setTimeout,cancel=clearTimeout}){
 const seen=new Set();let pending=null,timer=null,disposed=false,done=false;
 function resolve(final=false){
  if(disposed || done || !pending || !isActive())return;
  const accepted=completionEvidence(pending.input,getTranscript());
  if(!accepted && !final)return;
  cancel(timer);timer=null;const call=pending;pending=null;
  send({type:'conversation.item.create',item:{type:'function_call_output',call_id:call.id,output:JSON.stringify({accepted,message:accepted?'The app will close the check now.':'Not enough verified independent answers/task evidence. Continue with one diagnostic question; do not assign a score.'})}});
  if(accepted){done=true;onComplete();}
  else send({type:'response.create',response:{instructions:'Continue the language check with one useful diagnostic question. More verified task evidence is needed. Do not announce a score or goodbye.'}});
 }
 return {observe(event){
  if(disposed || done || !isActive())return;
  if(event.type==='response.done' && event.response?.status==='completed')for(const item of event.response.output||[]){
   if(item.type!=='function_call' || item.name!=='complete_language_check' || typeof item.call_id!=='string' || seen.has(item.call_id))continue;
   seen.add(item.call_id);let input=null;try{input=JSON.parse(item.arguments);}catch{/* Invalid arguments are declined, never treated as completion. */}
   if(pending)continue;
   pending={id:item.call_id,input};resolve();
   if(pending)timer=schedule(()=>resolve(true),1500); // ASR may arrive just after the tool call.
  }
  if(event.type==='conversation.item.input_audio_transcription.completed')resolve();
 },dispose(){disposed=true;cancel(timer);pending=null;}};
}
