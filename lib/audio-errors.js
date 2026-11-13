// Never forward raw provider messages: they can contain request data or secrets.
export function audioServiceError(status,payload,stage='transcription'){
 const code=typeof payload?.error?.code==='string'?payload.error.code:'';
 const service=stage==='evaluation'?'Antwortbewertung':'Spracherkennung';
 if(code==='insufficient_quota' || code==='billing_hard_limit_reached')return {status:503,error:`${service} ist wegen des KI-Guthabens oder Ausgabenlimits nicht verfügbar. Bitte das API-Konto prüfen. Deine Karte wird nicht schlechter bewertet.`,errorCode:'speech_quota'};
 if(status===401 || status===403 || status===404 || code==='model_not_found')return {status:503,error:`${service} ist nicht richtig eingerichtet oder für dieses Projekt nicht freigeschaltet. Bitte den API-Zugang prüfen. Deine Karte wird nicht schlechter bewertet.`,errorCode:'speech_configuration'};
 if(status===429)return {status:429,error:`${service} ist gerade ausgelastet. Bitte warte kurz und versuche es erneut. Deine Karte wird nicht schlechter bewertet.`,errorCode:'speech_rate_limit'};
 if(status===400 || status===415 || status===422)return {status:502,error:`${service} hat die Aufnahme technisch abgelehnt. Das ist keine Bewertung deiner Aussprache. Bitte erneut versuchen; falls es bleibt, muss die Aufnahmeübertragung geprüft werden.`,errorCode:'speech_request_rejected'};
 return {status:503,error:`${service} ist vorübergehend nicht erreichbar. Bitte versuche es gleich noch einmal. Deine Karte wird nicht schlechter bewertet.`,errorCode:'speech_unavailable'};
}
