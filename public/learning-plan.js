import {calendarDayKey} from './learning-streak.js';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,Math.round(Number(n)||min)));
export const LEARNING_PRESETS=Object.freeze({relaxed:{label:'Entspannt',totalMinutes:10},regular:{label:'Regelmäßig',totalMinutes:20},intense:{label:'Intensiv',totalMinutes:30}});
export function dailyWorkStarted({stats={},lesson={},vocabulary={},sentencePractice=true},now=new Date()){
 const day=calendarDayKey(now),oldDay=`${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
 return Boolean(stats.speakingGoal?.day===day&&stats.speakingGoal.usedSeconds>0||sentencePractice&&lesson?.day===oldDay&&((lesson.plannedIds||[]).length||(lesson.completed||[]).length||(lesson.introduced||[]).length)||vocabulary?.lesson?.day===day&&((vocabulary.lesson.ids||[]).length||(vocabulary.lesson.rated||[]).length||vocabulary.lesson.activeMs>0));
}
export function learningPace({stats={},vocabulary={}}={}){
 const recent=(vocabulary?.history||[]).filter(h=>h.seconds>0&&(h.planned||h.reviews)>0).slice(-7);
 const vocabularySeconds=clamp(recent.length?recent.reduce((n,h)=>n+h.seconds/(h.planned||h.reviews),0)/recent.length:25,15,90);
 const cardHistory=(stats.cardLearning||[]).filter(h=>h.seconds>0&&h.ids?.length).slice(-7);
 const cardSeconds=clamp(cardHistory.length?cardHistory.reduce((n,h)=>n+h.seconds/h.ids.length,0)/cardHistory.length:45,20,120);
 return {vocabularySeconds,cardSeconds};
}
export function estimatedLearningPlan(config,{stats={},vocabulary={},sentencePractice=true}={}){
 const preset=LEARNING_PRESETS[config?.mode],{vocabularySeconds,cardSeconds}=learningPace({stats,vocabulary});
 const recent=(vocabulary?.history||[]).filter(h=>h.seconds>0&&(h.planned||h.reviews)>0).slice(-7);
 const reliable=recent.slice(-3),strong=reliable.length===3&&reliable.every(h=>h.reviews>=3&&h.accuracy>=.85);
 const newLimit=strong?Math.min(8,3+Math.floor(reliable.reduce((n,h)=>n+h.reviews,0)/15)):3;
 if(!preset){
  const speakingMinutes=clamp(config?.speakingMinutes,1,60),cardLimit=clamp(config?.cardLimit,1,50),vocabularyLimit=clamp(config?.vocabularyLimit,1,50);
  return {mode:'manual',speakingMinutes,cardLimit,vocabularyLimit,newLimit,sessionSeconds:900,totalMinutes:Math.ceil(speakingMinutes+((sentencePractice?cardLimit*cardSeconds:0)+vocabularyLimit*vocabularySeconds)/60),estimated:true};
 }
 const totalMinutes=preset.totalMinutes,speakingMinutes=totalMinutes/2,cardTargetMinutes=totalMinutes*.2,cardMinutes=sentencePractice?cardTargetMinutes:0,vocabularyMinutes=totalMinutes-speakingMinutes-cardMinutes;
 return {mode:config.mode,totalMinutes,speakingMinutes,cardLimit:clamp(Math.floor(cardTargetMinutes*60/cardSeconds),1,50),vocabularyLimit:clamp(Math.floor(vocabularyMinutes*60/vocabularySeconds),1,50),newLimit,sessionSeconds:vocabularyMinutes*60,estimated:true};
}
export function resolveLearningPlan(config,data={},now=new Date()){
 const day=calendarDayKey(now),saved=data.stats?.dailyPlan;
 if(saved?.day===day&&(dailyWorkStarted(data,now)||saved.configId===config?.updatedAt))return saved;
 if(!config||config.effectiveDay>day)return saved?.day===day?saved:null;
 return {...estimatedLearningPlan(config,data),day,configId:config.updatedAt};
}
export function nextPlanConfiguration(input,data={},now=new Date()){
 if(!LEARNING_PRESETS[input.mode]&&input.mode!=='manual')throw Error('Bitte wähle einen Lernplan.');
 if(input.mode==='manual'&&![['speakingMinutes',60],['cardLimit',50],['vocabularyLimit',50]].every(([key,max])=>Number.isInteger(Number(input[key]))&&Number(input[key])>=1&&Number(input[key])<=max))throw Error('Bitte gültige Werte für deinen individuellen Plan wählen.');
 const date=new Date(now);if(dailyWorkStarted(data,now))date.setDate(date.getDate()+1);
 return {...input,effectiveDay:calendarDayKey(date),updatedAt:Number(now)};
}
export function sameLearningConfiguration(a,b){return Boolean(a&&b&&a.mode===b.mode&&(a.mode!=='manual'||['speakingMinutes','cardLimit','vocabularyLimit'].every(key=>Number(a[key])===Number(b[key]))));}
export function setupLearningPlan({host,getConfiguration,getData,getCurrent,onSave,sentencePractice=true,exactVocabularyTarget=false}){
 const area=document.createElement('section');area.className='learning-plan-settings';
 area.innerHTML=`<h3>Dein tägliches Lernziel</h3><p>Wie viel Zeit möchtest du dir nehmen?</p><form><div class="learning-plan-options"></div><div class="learning-plan-custom" hidden><label>Sprechen · Minuten<input type="number" name="speakingMinutes" min="1" max="60" required></label><label>Satzkarten · höchstens<input type="number" name="cardLimit" min="1" max="50" required></label><label>Vokabeln · höchstens<input type="number" name="vocabularyLimit" min="1" max="50" required></label></div><div class="learning-plan-preview" aria-live="polite"></div><small>Zeiten sind Schätzungen. Wiederholungen haben Vorrang. Angefangene Tagesrunden bleiben erhalten; Änderungen gelten dann ab morgen.</small><button class="primary" type="submit">Plan übernehmen</button><p role="status" class="learning-plan-status"></p></form>`;
 const form=area.querySelector('form'),options=area.querySelector('.learning-plan-options'),custom=area.querySelector('.learning-plan-custom'),preview=area.querySelector('.learning-plan-preview'),status=area.querySelector('.learning-plan-status'),saveButton=form.querySelector('button');
 let mode=getConfiguration()?.mode||'manual',pending=false;
 const current=getCurrent(),configuration=getConfiguration();for(const key of ['speakingMinutes','cardLimit','vocabularyLimit'])form.elements[key].value=configuration?.mode==='manual'?configuration[key]??current[key]:current[key];
 if(!sentencePractice){const input=form.elements.cardLimit;input.closest('label').hidden=true;input.disabled=true;}
 if(exactVocabularyTarget){const input=form.elements.vocabularyLimit;input.closest('label').firstChild.textContent='Vokabeln pro Tag';area.querySelector('form>small').textContent='Deine Kartenzahl bestimmt die Runde, die Minuten sind eine Schätzung. Schwierige und fällige Karten zuerst; weitere Karten füllen dein Ziel auf. Angefangene Lernstände bleiben erhalten.';}
 const buttons=[];
 for(const [key,label]of [...Object.entries(LEARNING_PRESETS).map(([key,p])=>[key,`${p.label} · ca. ${p.totalMinutes} Min.`]),['manual','Individuell einstellen']]){
  const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>{mode=key;refresh();};options.append(button);buttons.push([key,button]);
 }
 const values=()=>({mode,...Object.fromEntries(['speakingMinutes','cardLimit','vocabularyLimit'].map(key=>[key,Number(form.elements[key].value)]))});
 function refresh(){
  if(!sentencePractice)form.elements.cardLimit.disabled=true;
  custom.hidden=mode!=='manual';buttons.forEach(([key,button])=>button.setAttribute('aria-pressed',String(key===mode)));
  saveButton.disabled=pending||sameLearningConfiguration(getConfiguration(),values());
  const plan=estimatedLearningPlan(values(),{...getData(),sentencePractice});preview.textContent=`Dein Rahmen · ca. ${plan.totalMinutes} Min.: ${plan.speakingMinutes} Min. sprechen${sentencePractice?` · bis zu ${plan.cardLimit} Satzkarten`:''} · ${exactVocabularyTarget?'':'bis zu '}${plan.vocabularyLimit} Vokabeln. ${exactVocabularyTarget?'So viele unterschiedliche Karten kommen in deine Runde, sofern genug vorhanden sind.':'Auf Home siehst du die Schätzung für die tatsächlich heutige Portion.'}`;
 }
 form.oninput=refresh;
 form.onsubmit=async event=>{event.preventDefault();if(pending||sameLearningConfiguration(getConfiguration(),values())||!form.reportValidity())return;pending=true;form.querySelectorAll('button,input').forEach(el=>el.disabled=true);try{await onSave(values());}catch(error){status.textContent=error.message||'Dein Plan konnte nicht gespeichert werden.';}finally{pending=false;form.querySelectorAll('button,input').forEach(el=>el.disabled=false);refresh();}};
 const saved=getConfiguration();if(saved?.effectiveDay>calendarDayKey()){const effective=document.createElement('p');effective.className='learning-plan-effective';effective.textContent='Dein neuer Plan gilt ab '+new Date(saved.effectiveDay+'T12:00:00').toLocaleDateString('de-DE')+'. Deine heutige Runde bleibt unverändert.';area.prepend(effective);}
 host.prepend(area);refresh();return {refresh};
}
