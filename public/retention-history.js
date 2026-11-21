import {calendarDayKey} from './learning-streak.js';
export const RETENTION_MIN_SAMPLES=20;
const validTime=value=>{const at=new Date(value).getTime();return Number.isFinite(at)&&at>0?at:null;};
export function reviewObservations(items,kind,now=Date.now()){
 const result=[],seenItems=new Set();
 for(const item of Array.isArray(items)?items:[]){
  if(!item?.id||seenItems.has(item.id))continue;seenItems.add(item.id);
  const logs=(Array.isArray(item.reviewLog)?item.reviewLog:[]).map(log=>({log,at:validTime(log?.review)})).filter(({log,at})=>at&&at<=now&&[1,2,3,4].includes(Number(log.rating))).sort((a,b)=>a.at-b.at);
  let previous=null;const days=new Set();
  for(const {log,at} of logs){
   const day=calendarDayKey(at),prior=validTime(log.previousReviewAt)||previous;
   const first=!days.has(day);days.add(day);
   if(first&&prior&&prior<at&&calendarDayKey(prior)!==day&&!log.practiceOnly)result.push({key:kind+':'+item.id+':'+day,kind,cardId:item.id,day,at,good:Number(log.rating)>=3,rating:Number(log.rating)});
   previous=at;
  }
 }
 return result;
}
export function archiveRetention(stats,items,kind,now=Date.now()){
 const records=reviewObservations(items,kind,now);if(!records.length)return stats;
 const archive=new Map((Array.isArray(stats.retentionArchive)?stats.retentionArchive:[]).map(item=>[item.key,item]));
 for(const item of records)archive.set(item.key,item);
 return {...stats,retentionArchive:[...archive.values()]};
}
export function retentionObservations({cards=[],vocabulary={},stats={}},now=Date.now()){
 const records=new Map();
 for(const row of Array.isArray(stats.retentionArchive)?stats.retentionArchive:[]){
  if(row&&['cards','vocabulary'].includes(row.kind)&&typeof row.cardId==='string'&&validTime(row.at)&&row.at<=now&&typeof row.good==='boolean'&&row.day===calendarDayKey(row.at))records.set(row.kind+':'+row.cardId+':'+row.day,row);
 }
 // A restored/edited active card takes precedence over its archived duplicate.
 for(const row of [...reviewObservations(cards,'cards',now),...reviewObservations(vocabulary?.words,'vocabulary',now)])records.set(row.key,row);
 return [...records.values()];
}
export function chartPeriods(mode='week',now=new Date()){
 const end=new Date(now);end.setHours(0,0,0,0);
 if(mode==='month')end.setDate(1);else end.setDate(end.getDate()-(end.getDay()+6)%7);
 const count=mode==='month'?6:8,result=[];
 for(let i=count-1;i>=0;i--){
  const start=new Date(end),next=new Date(end);
  if(mode==='month'){start.setMonth(start.getMonth()-i);next.setMonth(next.getMonth()-i+1);}else{start.setDate(start.getDate()-i*7);next.setDate(next.getDate()+(1-i)*7);}
  const label=mode==='month'?start.toLocaleDateString('de-DE',{month:'short'}):start.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'});
  const last=new Date(next);last.setDate(last.getDate()-1);
  result.push({start:Number(start),end:Number(next),label,title:start.toLocaleDateString('de-DE')+' – '+last.toLocaleDateString('de-DE')});
 }
 return result;
}
export function retentionChart(data,{mode='week',now=new Date(),minimum=RETENTION_MIN_SAMPLES}={}){
 const periods=chartPeriods(mode,now),observations=retentionObservations(data,Number(now));
 const series=['vocabulary','cards'].map(kind=>({key:kind,label:kind==='vocabulary'?'Vokabeln sicher erinnert':'Satzkarten sicher erinnert',points:periods.map(period=>{
  const rows=observations.filter(row=>row.kind===kind&&row.at>=period.start&&row.at<period.end),total=rows.length,good=rows.filter(row=>row.good).length;
  return {total,good,value:total>=minimum?good/total*100:null};
 })}));
 return {periods,series,minimum,unit:'%',hasData:series.some(s=>s.points.some(p=>p.value!==null))};
}
