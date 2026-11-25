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
 let serial=0,current=null,playingUrl=null,foreground=null,waiting=[],lastStatus=()=>{};
 const cache=new Map(),prepared=new Map();
 function stop(){
  serial++;
  if(foreground&&!prepared.has(foreground.key))foreground.controller.abort();
  foreground=null;
  if(current){current.pause();current=null;}
  if(playingUrl){urls.revokeObjectURL(playingUrl);playingUrl=null;}
  lastStatus('');lastStatus=()=>{};
 }
 function cancelPreparation(){
  waiting=[];
  for(const task of prepared.values())if(task!==foreground)task.controller.abort();
  prepared.clear();
 }
 async function loadAudio({text,language,voice,key,cacheOnDevice},signal){
  const stored=cacheOnDevice?await openWordAudioCache(key):null;
  let blob;
  if(stored){
   try{blob=await (await stored.cache.match(stored.request))?.blob();}catch{/* Try the server. */}
  }
  signal.throwIfAborted();
  if(!validAudio(blob)){
   const response=await fetcher('/api/card-speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,language,voice}),signal});
   if(!response.ok){const result=await response.json().catch(()=>({}));throw Error(result.error||'Emma kann gerade nicht vorlesen. Bitte erneut versuchen.');}
   blob=await response.blob();
   if(!validAudio(blob))throw Error('Keine gültige Sprachausgabe erhalten.');
   signal.throwIfAborted();
   if(stored)void saveWordAudio(stored,blob);
  }
  // Keep blobs in memory so preparing another word cannot revoke a clip in use.
  cache.set(key,blob);
  while(cache.size>cacheLimit)cache.delete(cache.keys().next().value);
  return blob;
 }
 function requestAudio(audio){
  const controller=new AbortController();
  return {key:audio.key,controller,result:loadAudio(audio,controller.signal)};
 }
 function audioInput(text,language,cacheOnDevice){
  const voice=getVoice();
  return {text,language,voice,cacheOnDevice,key:JSON.stringify([text,language,voice])};
 }
 function loadPreparedAudio(){
  // The server allows three concurrent generations. Leave one slot for direct playback.
  while(prepared.size<2&&waiting.length){
   const audio=waiting.shift();
   if(cache.has(audio.key)||foreground?.key===audio.key||prepared.has(audio.key))continue;
   const task=requestAudio(audio);
   prepared.set(audio.key,task);
   const finish=()=>{
    if(prepared.get(audio.key)!==task)return;
    prepared.delete(audio.key);
    loadPreparedAudio();
   };
   void task.result.then(finish,finish);
  }
 }
 function prepare(clips){
  waiting=clips.slice(0,3)
   .filter(({text})=>typeof text==='string'&&text.trim())
   .map(({text,language='en',cacheOnDevice=false})=>audioInput(text,language,cacheOnDevice));
  loadPreparedAudio();
 }
 async function speak(text,{language='en',onStatus=()=>{},cacheOnDevice=false}={}){
  stop();if(typeof text!=='string' || !text.trim())return;
  const audio=audioInput(text,language,cacheOnDevice),{key,voice}=audio,name=coachName(voice),token=serial;lastStatus=onStatus;
  try{
   let blob=cache.get(key);
   if(!blob){
    onStatus(name+' lädt den Satz …');
    foreground=prepared.get(key)||requestAudio(audio);
    blob=await foreground.result;
   }
   if(token!==serial)return;
   playingUrl=urls.createObjectURL(blob);
   current=makeAudio(playingUrl);current.onended=()=>{if(token===serial)onStatus('');};
   current.onerror=()=>{if(token===serial)onStatus('Der Ton konnte nicht abgespielt werden. Bitte erneut antippen.');};
   await current.play();if(token===serial)onStatus(name+' liest vor · KI-Stimme');
  }catch(error){if(token!==serial || error.name==='AbortError')return;onStatus(coachText(error.name==='NotAllowedError'?'Ton bereit. Bitte den Satz noch einmal antippen, um Emma zu hören.':error.message||'Emma kann gerade nicht vorlesen.',voice));}
  finally{if(token===serial)foreground=null;}
 }
 function clear(){stop();cancelPreparation();cache.clear();}
 return {speak,prepare,stop,cancelPreparation,clear,name:()=>coachName(getVoice())};
}
