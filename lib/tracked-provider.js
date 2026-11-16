import {AsyncLocalStorage} from 'node:async_hooks';
export const apiContext=new AsyncLocalStorage();

// Only this server observes provider responses. No usage supplied by a browser is accepted.
export async function trackedFetch(url,options){
 const context=apiContext.getStore();
 if(!context)throw Object.assign(Error('Authenticated API context required'),{status:401});
 const {accounts,user,feature}=context;
 let model='unknown';try{model=options.body instanceof FormData?options.body.get('model'):JSON.parse(options.body).model;}catch{}
 const row=await accounts.begin(user,feature,model);
 let response;
 try{response=await fetch(url,options);}catch(error){await accounts.finish(row,{status:'incomplete'});throw error;}
 let result;try{result=await response.clone().json();}catch{}
 await accounts.finish(row,{usage:result?.usage,status:response.ok?'recorded':'provider_error',providerId:result?.id||response.headers.get('x-request-id'),model:result?.model});
 return response;
}
