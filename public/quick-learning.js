import {calendarDayKey} from './learning-streak.js';
import {rewardBalance,QUICK_DAY_COST} from './streak-rewards.js';
import {confirmDialog} from './app-dialog.js';
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
export function setupQuickLearning({host,getStats,onChange,isBusy=()=>false,now=()=>new Date(),notice=async()=>{},confirm=confirmDialog}){
 const label=document.createElement('label');label.className='quick-learning';
 label.innerHTML='<input type="checkbox" role="switch" aria-label="Heute wenig Zeit: halber Tagesplan für 20 Lernpunkte"><span><strong>Heute wenig Zeit?</strong><small>20 Punkte einsetzen · halber Plan · volle Tagespunkte</small></span>';
 host.append(label);const input=label.querySelector('input');let pending=false;
 function refresh(){input.checked=quickToday(getStats(),now());const balance=rewardBalance(getStats(),now());label.title=input.checked?'Für heute eingelöst':`Du hast ${balance} Lernpunkte. Einlösen kostet ${QUICK_DAY_COST} Punkte.`;input.disabled=pending||isBusy()||input.checked||balance<QUICK_DAY_COST||Boolean(getStats().streakRewards?.earnedDays?.includes(calendarDayKey(now())));}
 input.onchange=async()=>{if(pending)return;const enabled=input.checked;refresh();if(input.disabled)return;
  if(!enabled)return;
  pending=true;refresh();try{if(await confirm({title:'Heute den halben Plan lernen?',message:'Du setzt 20 Lernpunkte ein. Für heute halbieren sich Sprechzeit und Tagesportionen. Die vollen Tagespunkte verdienst du weiterhin durch das Lernen.',note:'Gilt nur heute. Die eingesetzten Punkte werden nicht zurückgebucht.',confirmText:'Für 20 Punkte einlösen'})){if(isBusy())throw Error('Bitte beende zuerst deine laufende Lernrunde.');await onChange(true);}}catch(error){await notice({title:'Noch nicht eingelöst',message:error.message||'Dein Tagesplan konnte nicht geändert werden. Bitte versuche es erneut.'});}finally{pending=false;refresh();}
 };
 refresh();return {refresh};
}
