// Realtime voices; the closed list is shared by browser and Node server.
export const EMMA_VOICES=Object.freeze(['marin','cedar','coral','sage','shimmer','alloy']);
export function resolveVoice(value='marin'){
 if(!EMMA_VOICES.includes(value))throw new RangeError('Unbekannte Stimme.');
 return value;
}
export function setupVoiceSettings({profile,getVoice,onChange}){
 const section=profile.querySelector('.coach-choice');section.replaceChildren();
 const title=document.createElement('strong');title.textContent='Emmas Stimme';
 const hint=document.createElement('p');hint.textContent='Wähle eine KI-Stimme fürs nächste Gespräch. Die Stimme lässt sich im laufenden Gespräch nicht austauschen. Karten und Vokabeln nutzen dieselbe gewählte KI-Stimme. Beim ersten Vorlesen entstehen zusätzliche KI-Kosten; bereits geladene Sätze werden zwischengespeichert.';
 const choices=document.createElement('div');choices.className='emma-voice-choices';
 const status=document.createElement('p');status.setAttribute('role','status');
 function refresh(){for(const button of choices.children)button.setAttribute('aria-pressed',String(button.dataset.voice===getVoice()));}
 for(const voice of EMMA_VOICES){
  const button=document.createElement('button');button.type='button';button.className='secondary';button.dataset.voice=voice;button.textContent=voice[0].toUpperCase()+voice.slice(1)+(voice==='marin'?' · bisherige Stimme':'');
  button.onclick=()=>{try{onChange(voice);refresh();status.textContent='Gespeichert – gilt ab dem nächsten Gespräch.';}catch{status.textContent='Nicht gespeichert. Bitte versuche es erneut.';}};choices.append(button);
 }
 section.append(title,hint,choices,status);refresh();
}
