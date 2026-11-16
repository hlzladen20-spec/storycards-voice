let tokenProvider=null;
export function setAccessTokenProvider(provider){tokenProvider=provider;}
export async function authenticatedFetch(input,options={}){
 const token=await tokenProvider?.();
 if(!token)throw Error('Bitte melde dich an, um weiterzulernen.');
 const headers=new Headers(options.headers);headers.set('Authorization',`Bearer ${token}`);
 const response=await fetch(input,{...options,headers});
 if(response.status===401)document.dispatchEvent(new Event('storycards-login-required'));
 return response;
}
