// A shared player for cards and vocabulary. No keys or generated audio in learning snapshots.
import {authenticatedFetch} from './authenticated-fetch.js';
import {coachName,coachText} from './emma-voices.js';
const deviceCacheName='storycards-public-word-audio-v1';
const validAudio=blob=>blob?.size>0&&blob.size<=524288&&blob.type.startsWith('audio/');

async function openWordAudioCache(key){
 if(!globalThis.caches || !globalThis.location?.origin || globalThis.location.origin==='null')return null;
 try{
  const cache=await globalThis.caches.open(deviceCacheName);
  const request=new URL('/word-audio-cache/'+encodeURIComponent(key),globalThis.location.origin);
  return {cache,request};
 }catch{return null;}
}

async function saveWordAudio({cache,request},blob){
 try{
  await cache.put(request,new Response(blob));
  const items=await cache.keys();
  await Promise.all(items.slice(0,Math.max(0,items.length-200)).map(item=>cache.delete(item)));
 }catch{/* Device storage is optional. */}
}
export function createEmmaSpeech({getVoice=()=> 'marin',fetcher=(...args)=>authenticatedFetch(...args),makeAudio=url=>new Audio(url),urls=URL,cacheLimit=40}={}){
 let serial=0,current=null,controller=null,lastStatus=()=>{};const cache=new Map();
 function stop(){serial++;controller?.abort();controller=null;if(current){current.pause();current=null;}lastStatus('');lastStatus=()=>{};}
 async function speak(text,{language='en',onStatus=()=>{},cacheOnDevice=false}={}){
  stop();if(typeof text!=='string' || !text.trim())return;
  const voice=getVoice(),name=coachName(voice),token=serial,key=JSON.stringify([text,language,voice]);lastStatus=onStatus;
  try{
   let url=cache.get(key);
   if(!url){
    onStatus(name+' lädt den Satz …');
    const stored=cacheOnDevice?await openWordAudioCache(key):null;
    let blob;
    if(stored){
     try{blob=await (await stored.cache.match(stored.request))?.blob();}catch{/* Try the server. */}
    }
    if(token!==serial)return;
    if(!validAudio(blob)){
     controller=new AbortController();
     const response=await fetcher('/api/card-speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,language,voice}),signal:controller.signal});
     if(!response.ok){const result=await response.json().catch(()=>({}));throw Error(result.error||'Emma kann gerade nicht vorlesen. Bitte erneut versuchen.');}
     blob=await response.blob();
     if(!validAudio(blob))throw Error('Keine gültige Sprachausgabe erhalten.');
     if(stored)void saveWordAudio(stored,blob);
    }
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
