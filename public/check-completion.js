// Finishing a check is a model request, not proof of a level. Validate the
// learner's actual transcript before closing; the final assessment runs later.
import {checkAssessment,checkAreas,checkBands,checkSkills} from './check-assessment.js';
export {checkAreas,independentAnswers} from './check-assessment.js';
const observation={type:'object',properties:{level:{type:['string','null'],enum:[...checkBands,null]},quote:{type:'string'}},required:['level','quote'],additionalProperties:false};
export const checkCompletionTool=Object.freeze({type:'function',name:'complete_language_check',description:'Request completion with a fully evidenced provisional assessment. The app applies the identical validator when recording the result; rejected evidence triggers a targeted follow-up, never a guessed score.',parameters:{type:'object',properties:{assessment:{type:'object',properties:{rubricVersion:{type:'integer',enum:[2]},level:{type:'string',enum:checkBands},confidence:{type:'string',enum:['medium','high','low']},reason:{type:'string'},limits:{type:'string'},evidence:{type:'array',items:{type:'string'}},dimensions:{type:'object',properties:Object.fromEntries(checkSkills.map(skill=>[skill,observation])),required:checkSkills,additionalProperties:false},tasks:{type:'array',items:{type:'object',properties:{area:{type:'string',enum:checkAreas},quote:{type:'string'}},required:['area','quote'],additionalProperties:false}},boundary:{type:'object',properties:{level:{type:'string',enum:checkBands},outcome:{type:'string',enum:['successful','limited']},question:{type:'string'},quote:{type:'string'}},required:['level','outcome','question','quote'],additionalProperties:false},goals:{type:'array',items:{type:'object',properties:{id:{type:'string'},quote:{type:'string'}},required:['id','quote'],additionalProperties:false}}},required:['rubricVersion','level','confidence','reason','limits','evidence','dimensions','tasks','boundary','goals'],additionalProperties:false}},required:['assessment'],additionalProperties:false}});
export function completionEvidence(input,transcript){
 return checkAssessment(input?.assessment,transcript).ready;
}

export function createCheckCompletion({isActive,getTranscript,send,onComplete,schedule=setTimeout,cancel=clearTimeout}){
 const seen=new Set();let pending=null,timer=null,disposed=false,done=false;
 function resolve(final=false){
  if(disposed || done || !pending || !isActive())return;
  const report=checkAssessment(pending.input?.assessment,getTranscript()),accepted=report.ready;
  if(!accepted && !final)return;
  cancel(timer);timer=null;const call=pending;pending=null;
  send({type:'conversation.item.create',item:{type:'function_call_output',call_id:call.id,output:JSON.stringify({accepted,missing:report.missing.map(item=>({code:item.code,message:item.message})),message:accepted?'The app will close the check now.':'Continue with the diagnostic follow-up; do not announce a score or goodbye.'})}});
  if(accepted){done=true;onComplete(pendingAssessment(call.input));}
  else send({type:'response.create',response:{instructions:'Continue the language check. '+report.missing.map(item=>item.instruction).join(' ')+' Ask only ONE useful diagnostic question now, adapting its difficulty. Do not announce a score or goodbye. Use verbatim quotes when calling the completion tool again.'}});
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
function pendingAssessment(input){return structuredClone(input.assessment);}
