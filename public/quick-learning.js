import {calendarDayKey} from './learning-streak.js';
export const quickToday=(state,now=new Date())=>state?.quickModeDay===calendarDayKey(now);
export const dailyAmount=(amount,quick)=>quick?Math.max(1,Math.ceil(amount/2)):amount;
function selectedIds(ids,done,quick){
 if(!quick)return [...ids];const started=ids.filter(id=>done.includes(id));
 return [...started,...ids.filter(id=>!started.includes(id))].slice(0,Math.max(started.length,Math.ceil(ids.length/2)));
}
export function quickCardPlan(plan,quick){
 const normal=plan.normalPlannedIds||plan.plannedIds||[];
 const started=[...(plan.completed||[]),...(plan.introduced||[]),...(plan.pendingRetries||[])];
 return {...plan,...(quick||plan.normalPlannedIds?{normalPlannedIds:normal}:{}),plannedIds:selectedIds(normal,started,quick)};
}
export function quickVocabularyPlan(lesson,quick){
 if(lesson.extraRound)return lesson;
 const normal=lesson.normalIds||lesson.ids,ids=selectedIds(normal,lesson.rated||[],quick);
 const combined=[...lesson.queue,...(lesson.quickDeferred||[])],seen=new Set();
 const pending=combined.filter(item=>{if(seen.has(item.id))return false;seen.add(item.id);return true;});
 const queue=pending.filter(item=>ids.includes(item.id)),deferred=pending.filter(item=>!ids.includes(item.id));
 return {...lesson,...(quick||lesson.normalIds?{normalIds:normal,quickDeferred:deferred}:{}),ids,queue,closed:!quick&&lesson.normalIds&&lesson.quickDeferred?.length&&queue.length?false:lesson.closed};
}
export function setupQuickLearning({host,getStats,onChange,isBusy=()=>false,now=()=>new Date(),notice=async()=>{}}){
 const label=document.createElement('label');label.className='quick-learning';
 label.innerHTML='<input type="checkbox" role="switch" aria-label="Heute wenig Zeit: halber Lernplan, volle Lernpunkte"><span><strong>Heute wenig Zeit?</strong><small>Halber Plan · volle 10 Lernpunkte · nur heute</small></span>';
 host.append(label);const input=label.querySelector('input');let pending=false;
 function refresh(){input.checked=quickToday(getStats(),now());input.disabled=pending||isBusy()||Boolean(getStats().streakRewards?.earnedDays?.includes(calendarDayKey(now())));}
 input.onchange=async()=>{if(pending)return;const enabled=input.checked;refresh();if(input.disabled)return;
  pending=true;refresh();try{await onChange(enabled);}catch{await notice({title:'Noch nicht gespeichert',message:'Dein Tagesplan konnte nicht geändert werden. Bitte versuche es erneut.'});}finally{pending=false;refresh();}
 };
 refresh();return {refresh};
}
