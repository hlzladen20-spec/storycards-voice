import {DAILY_POINTS,STREAK_RESCUE_COST,rewardBalance,streakRescueOffer,rescueStreak,declineStreakRescue} from './streak-rewards.js';
import {confirmDialog,noticeDialog} from './app-dialog.js';

export function setupStreakRewardsUI({host,getStats,saveStats,isBusy=()=>false,now=()=>new Date(),confirm=confirmDialog,notice=noticeDialog}){
 const area=document.createElement('section');area.className='streak-rewards';area.setAttribute('aria-label','Lernpunkte und Serien-Retter');
 const title=document.createElement('strong'),help=document.createElement('p'),button=document.createElement('button'),status=document.createElement('p');
 button.type='button';button.className='secondary';status.className='streak-rewards-status';status.setAttribute('role','status');
 help.textContent=`+${DAILY_POINTS} Punkte pro echtem Lerntag · einmal täglich. ${STREAK_RESCUE_COST} Punkte retten einen ausgelassenen Tag. Kein Kauf, kein Geld.`;
 area.append(title,help,button,status);host.after(area);let pending=false;
 function refresh(){
  const offer=streakRescueOffer(getStats(),now());
  title.textContent=`⭐ ${rewardBalance(getStats(),now())} Lernpunkte`;
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
