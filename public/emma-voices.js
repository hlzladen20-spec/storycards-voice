// Realtime voices; the closed list is shared by browser and Node server.
export const EMMA_VOICES=Object.freeze(['marin','cedar','coral','sage','shimmer','alloy']);
export const EMMA_VOICE_NAMES=Object.freeze({marin:'Emma',cedar:'Ben',coral:'Anna',sage:'Alex',shimmer:'Lea',alloy:'Paul'});
export function coachName(voice='marin'){return EMMA_VOICES.includes(voice)?EMMA_VOICE_NAMES[voice]:'Emma';}
// Only apply to app-owned labels/instructions, never to learner text or saved transcripts.
export function coachText(text,voice='marin'){
 if(typeof text!=='string')return text;
 const name=coachName(voice),possessive=/[sxz]$/i.test(name)?name+'’':name+'s';
 return text.replace(/\bEmmas\b/g,possessive).replace(/\bEmma\b/g,name);
}
export function coachIdentity(voice='marin'){
 const name=coachName(voice);return ` Your name is ${name}. Use ${name} consistently for your identity, including greetings, self-introductions and farewells. Keep this identity throughout the conversation. `;
}
export function applyCoachLabels(root,voice='marin'){
 const name=coachName(voice);
 root.querySelector('.emma-portrait')?.setAttribute('aria-label',name+', dein virtueller Sprachcoach');
 root.querySelector('#emmaAvatar')?.setAttribute('alt',name+', dein virtueller Sprachcoach');
 root.querySelectorAll('.emma-mini').forEach(image=>image.setAttribute('alt',name));
 root.querySelectorAll('[data-coach-template]').forEach(element=>{element.textContent=coachText(element.getAttribute('data-coach-template'),voice);});
}
export function resolveVoice(value='marin'){
 if(!EMMA_VOICES.includes(value))throw new RangeError('Unbekannte Stimme.');
 return value;
}
export function setupVoiceSettings({profile,getVoice,onChange,isBusy=()=>false,getChangeHint=()=> 'Karten und Vokabeln nutzen die Auswahl sofort; sie gilt auch ab dem nächsten Gespräch.'}){
 const section=profile.querySelector('.coach-choice');section.replaceChildren();
 const title=document.createElement('strong');
 const hint=document.createElement('p');hint.textContent='Wähle deinen Sprachcoach. Du kannst auch in einer laufenden Lektion wechseln. Ein pausiertes Gespräch übernimmt die Stimme beim Fortsetzen. Karten und Vokabeln nutzen dieselbe gewählte KI-Stimme. Beim ersten Vorlesen entstehen zusätzliche KI-Kosten; bereits geladene Sätze werden zwischengespeichert.';
 const choices=document.createElement('div');choices.className='emma-voice-choices';
 const status=document.createElement('p');status.setAttribute('role','status');
 function refresh(){title.textContent='Dein Sprachcoach · '+coachName(getVoice());for(const button of choices.children)button.setAttribute('aria-pressed',String(button.dataset.voice===getVoice()));}
 for(const voice of EMMA_VOICES){
  const button=document.createElement('button');button.type='button';button.className='secondary';button.dataset.voice=voice;
  const name=document.createElement('span');name.textContent=EMMA_VOICE_NAMES[voice];button.append(name);
  if(voice!=='marin'){const beta=document.createElement('small');beta.className='emma-voice-beta';beta.textContent='Beta';button.append(beta);}
  button.onclick=()=>{if(isBusy()){status.textContent='Bitte warte kurz, bis das Gespräch verbunden oder die Auswertung abgeschlossen ist.';return;}try{onChange(voice);refresh();status.textContent=coachName(voice)+' ausgewählt. '+getChangeHint();document.dispatchEvent?.(new Event('storycards-voice-changed'));}catch{status.textContent='Nicht gespeichert. Bitte versuche es erneut.';}};choices.append(button);
 }
 section.append(title,hint,choices,status);refresh();
}
