import {calendarDayKey} from './learning-streak.js';

const labels=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
const states={learned:{symbol:'✓',label:'Gelernt'},rescued:{symbol:'🛡',label:'Serie gerettet, nicht gelernt'},missed:{symbol:'×',label:'Nicht gelernt'},today:{symbol:'○',label:'Heute noch offen'},future:{symbol:'–',label:'Steht noch an'}};
export function learningWeek(stats={},now=new Date()){
 const today=calendarDayKey(now),monday=new Date(now);monday.setHours(12,0,0,0);monday.setDate(monday.getDate()-((monday.getDay()+6)%7));
 const actual=new Set(Array.isArray(stats.practiceDays)?stats.practiceDays:[]),rescued=new Set(Array.isArray(stats.streakRewards?.protectedDays)?stats.streakRewards.protectedDays:[]);
 return labels.map((label,index)=>{
  const date=new Date(monday);date.setDate(monday.getDate()+index);const day=calendarDayKey(date);
  const state=day>today?'future':actual.has(day)?'learned':rescued.has(day)?'rescued':day===today?'today':'missed';
  return {day,label,short:label.slice(0,2),number:date.getDate(),today:day===today,state,symbol:states[state].symbol,statusText:states[state].label};
 });
}
export function renderLearningWeek(root,stats,now=new Date()){
 const week=learningWeek(stats,now),list=root.querySelector('#statisticsWeekDays');list.replaceChildren();
 const date=day=>new Date(`${day}T12:00:00`).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'});
 root.querySelector('#statisticsWeekRange').textContent=`${date(week[0].day)} – ${date(week[6].day)}`;
 root.querySelector('#statisticsWeekCount').textContent=`${week.filter(day=>day.state==='learned').length} von 7 Tagen gelernt`;
 for(const day of week){
  const item=document.createElement('li');item.className=`learning-week-day status-${day.state}`;
  item.setAttribute('aria-label',`${day.label}, ${date(day.day)}: ${day.statusText}${day.today?' · Heute':''}`);
  if(day.today)item.setAttribute('aria-current','date');
  for(const [tag,text]of [['span',day.short],['strong',day.symbol],['small',String(day.number)]]){const node=document.createElement(tag);node.textContent=text;node.setAttribute('aria-hidden','true');item.append(node);}
  list.append(item);
 }
}
