// A shared player for cards and vocabulary. No keys or generated audio in learning snapshots.
import {authenticatedFetch} from './authenticated-fetch.js';
import {coachName,coachText} from './emma-voices.js';
export function createEmmaSpeech({getVoice=()=> 'marin',fetcher=(...args)=>authenticatedFetch(...args),makeAudio=url=>new Audio(url),urls=URL,cacheLimit=40}={}){
 let serial=0,current=null,controller=null,lastStatus=()=>{};const cache=new Map();
 function stop(){serial++;controller?.abort();controller=null;if(current){current.pause();current=null;}lastStatus('');lastStatus=()=>{};}
 async function speak(text,{language='en',onStatus=()=>{}}={}){
  stop();if(typeof text!=='string' || !text.trim())return;
  const voice=getVoice(),name=coachName(voice),token=serial,key=JSON.stringify([text,language,voice]);lastStatus=onStatus;
  try{
   let url=cache.get(key);
   if(!url){
    onStatus(name+' lädt den Satz …');controller=new AbortController();
    const response=await fetcher('/api/card-speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,language,voice}),signal:controller.signal});
    if(!response.ok){const result=await response.json().catch(()=>({}));throw Error(result.error||'Emma kann gerade nicht vorlesen. Bitte erneut versuchen.');}
    const blob=await response.blob();if(!blob.size || blob.size>524288 || !blob.type.startsWith('audio/'))throw Error('Keine gültige Sprachausgabe erhalten.');
    if(token!==serial)return;
    url=urls.createObjectURL(blob);cache.set(key,url);
    while(cache.size>cacheLimit){const first=cache.keys().next().value;urls.revokeObjectURL(cache.get(first));cache.delete(first);}
   }
   if(token!==serial)return;
   current=makeAudio(url);current.onended=()=>{if(token===serial)onStatus('');};
   current.onerror=()=>{if(token===serial)onStatus('Der Ton konnte nicht abgespielt werden. Bitte erneut antippen.');};
   await current.play();if(token===serial)onStatus(name+' liest vor · KI-Stimme');
  }catch(error){if(token!==serial || error.name==='AbortError')return;onStatus(coachText(error.name==='NotAllowedError'?'Ton bereit. Bitte den Satz noch einmal antippen, um Emma zu hören.':error.message||'Emma kann gerade nicht vorlesen.',voice));}
 }
 function clear(){stop();for(const url of cache.values())urls.revokeObjectURL(url);cache.clear();}
 return {speak,stop,clear,name:()=>coachName(getVoice())};
}
