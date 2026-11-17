import {DAILY_POINTS,STREAK_RESCUE_COST,rewardBalance,rewardDailyGoals,streakRescueOffer,rescueStreak,declineStreakRescue} from './streak-rewards.js';
import {confirmDialog,noticeDialog} from './app-dialog.js';

export function setupStreakRewardsUI({host,getStats,saveStats,getProgress=()=>null,onLearn=()=>{},isBusy=()=>false,now=()=>new Date(),confirm=confirmDialog,notice=noticeDialog}){
 const area=document.createElement('section');area.className='streak-rewards';area.setAttribute('aria-label','Lernpunkte und Serien-Retter');
 const title=document.createElement('strong'),help=document.createElement('p'),button=document.createElement('button'),status=document.createElement('p');
 button.type='button';button.className='secondary';status.className='streak-rewards-status';status.setAttribute('role','status');
 const details=document.createElement('details'),summary=document.createElement('summary'),headline=document.createElement('h3'),progress=document.createElement('progress'),steps=document.createElement('div'),learn=document.createElement('button');
 summary.textContent='So funktionieren deine Lernpunkte';details.append(summary,help);
 help.textContent=`${DAILY_POINTS} Punkte für dein vollständiges Tagesziel: Sprechen, Tageslektion mit ihren Wiederholungen und Vokabelrunde. Weitere ${DAILY_POINTS} Punkte für eine vollständige zusätzliche Sprechlektion oder Vokabelrunde. Höchstens 20 Punkte pro Tag. Keine fälligen Karten? Dann ist dieser Teil nicht nötig. ${STREAK_RESCUE_COST} Punkte retten einen ausgelassenen Tag. Kein Kauf, kein Geld. Bereits verdiente Punkte bleiben erhalten.`;
 learn.type='button';learn.className='primary';learn.onclick=onLearn;steps.className='learning-goal-steps';progress.max=3;
 area.append(title,details,button,status,headline,progress,steps,learn);host.after(area);let pending=false;
 function refresh(){
  const goal=getProgress(),current=getStats();
  const next=isBusy()?current:rewardDailyGoals(current,goal,now());
  if(next!==current){try{saveStats(next);status.textContent=goal.bonus?'🎉 Tagesziel plus Zusatzrunde geschafft – heute insgesamt 20 Lernpunkte!':'🎉 Alles für heute geschafft – deine 10 Lernpunkte sind gutgeschrieben!';}catch{status.textContent='Tagesziel geschafft! Die Punkte konnten noch nicht gespeichert werden. Bitte öffne die Übersicht später erneut.';}}
  const offer=streakRescueOffer(getStats(),now());
  title.textContent=`⭐ ${rewardBalance(getStats(),now())} Lernpunkte`;
  const today=goal?.day;
  const earned=getStats().streakRewards?.earnedDays?.includes(today),bonus=getStats().streakRewards?.bonusDays?.includes(today);
  headline.textContent=bonus?'🎉 Heute 20 Lernpunkte verdient!':earned?(goal?.complete?'✓ Tagesziel geschafft · 10 Punkte verdient!':'Heute bereits 10 Punkte gutgeschrieben'):'Dein Tagesziel wartet · +10 Lernpunkte';
  progress.value=goal?.completed||0;progress.max=goal?.total||3;progress.setAttribute('aria-label',`${goal?.completed||0} von ${goal?.total||3} Tageszielen geschafft`);
  if(goal){steps.replaceChildren(...goal.rows.map(row=>{const item=document.createElement('p');item.className=row.done?'goal-done':'goal-open';item.textContent=`${row.done?'✓':'○'} ${row.label} · ${row.detail}`;return item;}));}
  learn.hidden=Boolean(bonus&&goal?.complete);learn.textContent=earned&&goal?.complete?'Freiwillig weiterlernen · +10 Bonuspunkte':'Heute weitermachen';
  area.setAttribute('data-complete',String(Boolean(earned)));
  button.hidden=!offer;button.disabled=pending || !offer?.canAfford;
  button.textContent=offer?.canAfford?`🔥 Serie retten · ${STREAK_RESCUE_COST} Punkte`:`Noch ${STREAK_RESCUE_COST-(offer?.balance||0)} Punkte zum Retten nötig`;
 }
 async function ask(manual=false){
  if(pending || isBusy() || document.hidden || document.querySelector('dialog[open], .app-dialog-overlay'))return;
  const offer=streakRescueOffer(getStats(),now());if(!offer?.canAfford || (!manual && offer.declined))return;
  pending=true;refresh();
  try{
   const approved=await confirm({title:'Deine Lernserie retten?',message:`Du hast gestern (${offer.day.split('-').reverse().join('.')}) ausgesetzt. Möchtest du ${offer.cost} deiner ${offer.balance} Punkte einsetzen, um deine Serie von ${offer.series} Tagen zu erhalten?`,items:[`Danach bleiben ${offer.balance-offer.cost} Punkte übrig.`,'Der gerettete Tag zählt nur für die Serie, nicht als gelernt.','Heute weiterlernen, um die Serie fortzusetzen.'],note:'Du entscheidest. Ohne Bestätigung werden keine Punkte abgezogen.',confirmText:`${offer.cost} Punkte einsetzen`,cancelText:'Nein, danke'});
   // Re-read after the dialog: midnight, another tab or new activity can change eligibility.
   if(isBusy())return;
   const current=getStats(),next=approved?rescueStreak(current,offer.day,now()):declineStreakRescue(current,offer.day,now());
   if(next===current){if(approved)status.textContent='Die Voraussetzungen haben sich geändert. Bitte prüfe deinen aktuellen Punktestand.';return;}
   saveStats(next);
   if(approved)status.textContent=`🔥 Serie erhalten! ${offer.cost} Punkte eingesetzt. Heute wartet dein nächster Lerntag.`;
  }catch{await notice({title:'Noch nicht gespeichert',message:'Bitte lade die App neu und prüfe deinen Punktestand, bevor du es erneut versuchst.'});}
  finally{pending=false;refresh();}
 }
 button.onclick=()=>ask(true);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh();void ask();}});
 window.addEventListener('pageshow',()=>{refresh();void ask();});
 refresh();void ask();return {refresh,ask};
}
