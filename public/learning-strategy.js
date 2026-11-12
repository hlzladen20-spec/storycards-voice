import {LANGUAGE_COURSES,courseText} from './language-courses.js';
export function setupLearningStrategy(course=LANGUAGE_COURSES.en){
 let previous=null;
 const dialog=document.createElement('dialog');dialog.className='learning-strategy-dialog';dialog.setAttribute('aria-labelledby','strategyTitle');
 dialog.innerHTML='<h2 id="strategyTitle"></h2><p></p><button class="primary" type="button">Los geht’s</button>';
 document.body.append(dialog);
 let ready=null;
 function proceed(){const callback=ready;ready=null;dialog.close();callback?.();}
 dialog.querySelector('button').onclick=proceed;
 dialog.addEventListener('cancel',event=>{event.preventDefault();proceed();});
 return {reset(){previous=null;ready=null;if(dialog.open)dialog.close();},announce(strategy,onReady){
  if(strategy===previous){onReady();return;}
  previous=strategy;ready=onReady;
  const listen=strategy==='listen';
  dialog.querySelector('h2').textContent=listen?'Höre zu und sprich nach.':'Jetzt aus dem Gedächtnis';
  dialog.querySelector('p').textContent=courseText(listen?'Du siehst nur den englischen Satz. Er wird automatisch vorgelesen. Sprich ihn danach nach.':'Übersetze den deutschen Satz ins Englische. Die Lösung bleibt zunächst verborgen.',course);
  if(dialog.open)dialog.close();dialog.showModal();
 }};
}
