import {randomUUID} from 'node:crypto';
import {SUPABASE_URL,SUPABASE_PUBLIC_KEY} from '../public/account-config.js';

const problem=(status,message)=>Object.assign(Error(message),{status});
export function usageNumbers(usage){
 if(!usage || typeof usage!=='object')return null;
 const number=value=>Number.isSafeInteger(value)&&value>=0?value:null;
 const input=number(usage.input_tokens??usage.prompt_tokens),output=number(usage.output_tokens??usage.completion_tokens);
 return {input_tokens:input,output_tokens:output,total_tokens:number(usage.total_tokens)??(input!==null&&output!==null?input+output:null),
  cached_tokens:number(usage.input_token_details?.cached_tokens??usage.input_tokens_details?.cached_tokens??usage.prompt_tokens_details?.cached_tokens),
  audio_input_tokens:number(usage.input_token_details?.audio_tokens??usage.prompt_tokens_details?.audio_tokens),
  audio_output_tokens:number(usage.output_token_details?.audio_tokens??usage.completion_tokens_details?.audio_tokens),
  text_input_tokens:number(usage.input_token_details?.text_tokens),text_output_tokens:number(usage.output_token_details?.text_tokens),
  audio_seconds:typeof usage.seconds==='number'&&Number.isFinite(usage.seconds)&&usage.seconds>=0?usage.seconds:null};
}
export function adminUser(user,emails=['markcecil2@gmail.com']){
 return Boolean(user?.email_confirmed_at&&!user.is_anonymous&&emails.includes(String(user.email||'').toLowerCase()));
}
export function reportRange(params,now=new Date()){
 const end=params.get('to')||now.toISOString().slice(0,10),start=params.get('from')||new Date(now.getTime()-29*86400000).toISOString().slice(0,10);
 if(![start,end].every(s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s)||start>end||Date.parse(end)-Date.parse(start)>365*86400000)throw problem(400,'Bitte einen gültigen Zeitraum von höchstens 366 Tagen wählen.');
 return {from:new Date(start).toISOString(),to:new Date(Date.parse(end)+86400000).toISOString(),feature:params.get('feature')||null};
}
export function createAccountService({fetcher=(...args)=>fetch(...args),url=SUPABASE_URL,publicKey=SUPABASE_PUBLIC_KEY,secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,adminEmails=(process.env.ADMIN_EMAILS||'markcecil2@gmail.com').split(',').map(s=>s.trim().toLowerCase())}={}){
 const base=new URL(url);if(base.protocol!=='https:')throw Error('Supabase HTTPS required');
 async function database(path,{method='GET',data,prefer}={}){
  if(!secret)throw problem(503,'Die sichere Verbrauchserfassung ist noch nicht eingerichtet. Bitte den Betreiber informieren.');
  const headers={apikey:secret,'Content-Type':'application/json'};
  if(!secret.startsWith('sb_secret_'))headers.Authorization=`Bearer ${secret}`;
  if(prefer)headers.Prefer=prefer;
  let response;try{response=await fetcher(`${base.origin}/rest/v1/${path}`,{method,headers,body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(12000)});}catch{throw problem(503,'Die Verbrauchsdatenbank ist derzeit nicht erreichbar.');}
  if(!response.ok)throw problem(503,'Die Verbrauchserfassung konnte nicht gespeichert werden.');
  const text=await response.text();return text?JSON.parse(text):null;
 }
 async function authenticate(req){
  const match=/^Bearer ([^\s]{16,8192})$/.exec(req.headers?.authorization||'');
  if(!match)throw problem(401,'Bitte melde dich an, um weiterzulernen.');
  let response;try{response=await fetcher(`${base.origin}/auth/v1/user`,{headers:{apikey:publicKey,Authorization:`Bearer ${match[1]}`},signal:AbortSignal.timeout(12000)});}catch{throw problem(503,'Die Anmeldung ist gerade nicht erreichbar. Bitte erneut versuchen.');}
  if(!response.ok)throw problem(response.status===401||response.status===403?401:503,'Deine Anmeldung konnte nicht bestätigt werden. Bitte erneut anmelden.');
  const user=await response.json();
  if(!/^[0-9a-f-]{36}$/i.test(user.id||'')||!user.email_confirmed_at||user.is_anonymous)throw problem(403,'Bitte bestätige zuerst deine E-Mail-Adresse.');
  return user;
 }
 async function begin(user,feature,model,kind='request',eventKey=randomUUID()){
  const row={id:randomUUID(),event_key:eventKey,user_id:user.id,feature,model,kind,status:'pending'};
  await database('ai_usage_events',{method:'POST',data:row,prefer:'return=minimal'});return row;
 }
 async function finish(row,{usage,status='recorded',providerId,model}={}){
  const numbers=usageNumbers(usage);
  const data={...(numbers||{}),status:status==='recorded'&&numbers?.total_tokens==null?'missing_usage':status,finished_at:new Date().toISOString(),provider_id:providerId||null};
  if(model)data.model=String(model).slice(0,120);
  // Failed writes leave the durable pending row visible to the administrator.
  await database(`ai_usage_events?id=eq.${row.id}`,{method:'PATCH',data,prefer:'return=minimal'});
 }
 async function realtimeEvent(user,feature,callId,event){
  const transcription=event.type==='conversation.item.input_audio_transcription.completed';
  const response=transcription?event:event.response;
  const id=transcription?`${event.item_id}:${event.content_index??0}`:response?.id;
  if(!id)return;
  const numbers=usageNumbers(response?.usage),row={id:randomUUID(),event_key:`${callId}:${transcription?'transcription':'response'}:${id}`,user_id:user.id,feature:transcription?'conversation-transcription':feature,model:transcription?'gpt-4o-mini-transcribe':response.model||'gpt-realtime-2.1',kind:'event',provider_id:id,status:numbers?.total_tokens!=null?'recorded':'missing_usage',...(numbers||{}),finished_at:new Date().toISOString()};
  // Unique event keys make replayed server events idempotent.
  await database('ai_usage_events?on_conflict=event_key',{method:'POST',data:row,prefer:'resolution=ignore-duplicates,return=minimal'});
 }
 return {authenticate,begin,finish,realtimeEvent,isAdmin:user=>adminUser(user,adminEmails),
  async touch(user){await database('usage_accounts?on_conflict=user_id',{method:'POST',data:{user_id:user.id,email:user.email,last_seen_at:new Date().toISOString()},prefer:'resolution=merge-duplicates,return=minimal'});},
  async report(user,params){if(!adminUser(user,adminEmails))throw problem(403,'Dieser Bereich ist nur für Administratoren.');const range=reportRange(params);return database('rpc/admin_usage_report',{method:'POST',data:{from_time:range.from,to_time:range.to,feature_filter:range.feature}});}
 };
}
