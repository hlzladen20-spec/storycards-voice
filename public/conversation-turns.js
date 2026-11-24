// Keep the same short thinking pause on first connect, continuation and final reply.
export function conversationTurnDetection({createResponse=true}={}){
 return {type:'server_vad',threshold:0.7,prefix_padding_ms:300,silence_duration_ms:1600,create_response:createResponse,interrupt_response:false,idle_timeout_ms:null};
}
