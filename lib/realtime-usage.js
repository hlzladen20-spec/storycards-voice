import WebSocket from 'ws';

export function createRealtimeUsage({accounts,getKey,makeSocket=(url,options)=>new WebSocket(url,options),fetcher=(...args)=>fetch(...args)}={}){
 const active=new Map();
 async function hangup(callId){try{await fetcher(`https://api.openai.com/v1/realtime/calls/${callId}/hangup`,{method:'POST',headers:{Authorization:`Bearer ${getKey()}`},signal:AbortSignal.timeout(8000)});}catch{}}
 async function attach({callId,user,row,feature}){
  if(!/^rtc_[a-zA-Z0-9_-]+$/.test(callId||''))throw Object.assign(Error('Die Verbrauchserfassung konnte nicht verbunden werden.'),{status:503});
  let queue=Promise.resolve(),closed=false,hadGap=false;
  const socket=makeSocket(`wss://api.openai.com/v1/realtime?call_id=${encodeURIComponent(callId)}`,{headers:{Authorization:`Bearer ${getKey()}`},handshakeTimeout:10000,maxPayload:2*1024*1024});
  const fail=()=>{hadGap=true;hangup(callId);socket.close();};
  const persist=work=>{queue=queue.then(work).catch(()=>{fail();});return queue;};
  socket.on('message',raw=>{
   let event;try{event=JSON.parse(String(raw));}catch{return;}
   if(event.type==='response.done'||event.type==='conversation.item.input_audio_transcription.completed')persist(()=>accounts.realtimeEvent(user,feature,callId,event));
   if(event.type==='error')fail();
  });
  socket.on('error',fail);
  socket.on('close',code=>{
   closed=true;active.delete(callId);
   persist(()=>accounts.finish(row,{status:code===1000&&!hadGap?'closed':'incomplete'}));
  });
  active.set(callId,{userId:user.id,socket});
  try{
   await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Sideband timed out')),12000);timer.unref?.();
    const clean=()=>{clearTimeout(timer);socket.off('error',failed);socket.off('close',failed);};
    const failed=()=>{clean();reject(Error('Sideband connection failed'));};
    socket.once('open',()=>{clean();resolve();});socket.once('error',failed);socket.once('close',failed);
   });
   if(closed)throw Error('Sideband closed');
   await persist(()=>accounts.finish(row,{status:'monitoring',providerId:callId}));
   if(closed||hadGap)throw Error('Sideband closed');
  }catch{
   hadGap=true;socket.close();await hangup(callId);await accounts.finish(row,{status:'incomplete'});
   throw Object.assign(Error('Die sichere Gesprächserfassung ist gerade nicht verfügbar. Bitte erneut versuchen.'),{status:503});
  }
 }
 return {attach,activeCount:userId=>[...active.values()].filter(c=>c.userId===userId).length,
  async close(){await Promise.all([...active.keys()].map(hangup));for(const c of active.values())c.socket.close();}
 };
}
