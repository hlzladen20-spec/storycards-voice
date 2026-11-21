import {chartPeriods} from './retention-history.js';
const words=text=>typeof text==='string'?(text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)||[]).length:0;
const nonnegative=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
export function createSpeakingMetrics({id=crypto.randomUUID(),now=Date.now}={}){
 const items=new Map();let connection=0,prefix=300,silence=1000,endedAt=null;
 function interrupt(){for(const item of items.values())if(item.end===undefined)item.invalid=true;}
 function beginConnection(){interrupt();connection++;}
 function observe(event,{blocked=false}={}){
  if(!event||typeof event!=='object')return;
  if(event.type==='session.updated'){
   const vad=event.session?.audio?.input?.turn_detection;
   if(nonnegative(vad?.prefix_padding_ms))prefix=vad.prefix_padding_ms;
   if(nonnegative(vad?.silence_duration_ms))silence=vad.silence_duration_ms;
   return;
  }
  if(!['input_audio_buffer.speech_started','input_audio_buffer.speech_stopped','conversation.item.input_audio_transcription.completed'].includes(event.type)||typeof event.item_id!=='string')return;
  const key=connection+':'+event.item_id,item=items.get(key)||{};
  if(items.size>=2048&&!items.has(key))return;
  if(event.type==='input_audio_buffer.speech_started'){
   if(item.start!==undefined)return;
   item.start=event.audio_start_ms;item.prefix=prefix;item.silence=silence;item.invalid||=blocked;endedAt=null;
  }else if(event.type==='input_audio_buffer.speech_stopped'){
   if(item.end!==undefined)return;item.end=event.audio_end_ms;item.invalid||=blocked;
  }else item.words=words(event.transcript);
  items.set(key,item);
 }
 function snapshot({language='en',complete=true,kind='conversation'}={}){
  const measured=[...items.values()].filter(item=>!item.invalid&&nonnegative(item.start)&&nonnegative(item.end)&&item.words>0&&item.end-item.start-item.prefix-item.silence>=250&&item.end-item.start<=180000);
  const wordCount=measured.reduce((n,item)=>n+item.words,0),speechSeconds=measured.reduce((n,item)=>n+(item.end-item.start-item.prefix-item.silence)/1000,0),turns=measured.length;
  const wordsPerMinute=speechSeconds>0?wordCount/speechSeconds*60:null;
  const valid=complete&&turns>=4&&wordCount>=40&&speechSeconds>=20&&wordsPerMinute<=400;
  endedAt??=now();
  return {version:1,id,at:endedAt,language,kind,complete,valid,words:wordCount,turns,speechSeconds,wordsPerMinute,meanSegmentSeconds:turns?speechSeconds/turns:null,method:'server_vad_trimmed_v1',reason:valid?null:'insufficient_timing_or_speech'};
 }
 return {observe,interrupt,beginConnection,snapshot};
}
export function saveSpeakingMeasurement(stats,measurement){
 if(!measurement?.id||!measurement.turns)return stats;
 const previous=Array.isArray(stats.speakingMeasurements)?stats.speakingMeasurements:[];
 const cutoff=new Date(measurement.at);cutoff.setDate(1);cutoff.setHours(0,0,0,0);cutoff.setMonth(cutoff.getMonth()-5);
 return {...stats,speakingMeasurements:[...previous.filter(item=>item.id!==measurement.id),measurement].filter(item=>item.at>=Number(cutoff)).sort((a,b)=>a.at-b.at)};
}
export function speakingChart(stats,{mode='week',metric='pace',now=new Date(),language}={}){
 const periods=chartPeriods(mode,now),unique=new Map();
 for(const row of Array.isArray(stats.speakingMeasurements)?stats.speakingMeasurements:[]){
  if(row?.version!==1||row.method!=='server_vad_trimmed_v1'||!row.complete||!row.valid||row.kind!=='conversation'||(language&&row.language!==language))continue;
  if(typeof row.id!=='string'||!Number.isFinite(row.at)||row.at>Number(now)||!Number.isFinite(row.words)||row.words<40||!Number.isFinite(row.turns)||row.turns<4||!Number.isFinite(row.speechSeconds)||row.speechSeconds<20||row.words/row.speechSeconds*60>400)continue;
  unique.set(row.id,row);
 }
 const points=periods.map(period=>{
  const rows=[...unique.values()].filter(row=>row.at>=period.start&&row.at<period.end),total=rows.length;
  const wordCount=rows.reduce((n,r)=>n+r.words,0),seconds=rows.reduce((n,r)=>n+r.speechSeconds,0),turns=rows.reduce((n,r)=>n+r.turns,0);
  return {total,value:total<3?null:metric==='segment'?seconds/turns:wordCount/seconds*60};
 });
 return {periods,series:[{key:'speech',label:metric==='segment'?'Mittlerer Sprechabschnitt':'Sprechtempo',points}],minimum:3,unit:metric==='segment'?'Sek.':'Wörter/Min.',hasData:points.some(p=>p.value!==null)};
}
