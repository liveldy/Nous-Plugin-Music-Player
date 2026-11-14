// Nous Plugin Interface 1.2 browser SDK. MIT. No application imports.
(function(){'use strict';let context=null,nonce='',counter=0,readyResolve;const pending=new Map(),listeners=new Map(),ready=new Promise(resolve=>readyResolve=resolve);
class PluginError extends Error{constructor(code,message){super(message);this.name='PluginError';this.code=code||'E_HOST';}}
function settle(id,error,value){const item=pending.get(id);if(!item)return;pending.delete(id);clearTimeout(item.timer);item.signal?.removeEventListener('abort',item.abort);error?item.reject(error):item.resolve(value);}
function send(value){parent.postMessage({protocol:'nous.plugin/1',nonce,...value},'*');}
function supports(method){return !!context?.methods?.[method];}
function request(method,params={},options={}){return ready.then(()=>new Promise((resolve,reject)=>{
 if(options.signal?.aborted){reject(new PluginError('E_CANCELLED','Request cancelled'));return;}
 if(pending.size>=32){reject(new PluginError('E_BUSY','At most 32 requests may be pending'));return;}
 if(context.api==='1.2'&&!supports(method)){reject(new PluginError('E_METHOD_NOT_FOUND','Unavailable host method: '+method));return;}
 let raw;try{raw=JSON.stringify(params);if(raw===undefined)throw Error('not JSON');}catch{reject(new PluginError('E_INVALID_PARAMS','Parameters must be JSON'));return;}if(new TextEncoder().encode(raw).length>1048576){reject(new PluginError('E_TOO_LARGE','Request exceeds 1 MiB'));return;}
 const id='plugin-'+(++counter),defaultTimeout=context.methods?.[method]?.timeoutMs||(method==='runtime.webLogin'?660000:method==='runtime.start'?900000:150000),timeout=options.timeoutMs??defaultTimeout;
 if(!Number.isInteger(timeout)||timeout<100||timeout>900000){reject(new PluginError('E_INVALID_PARAMS','timeoutMs must be between 100 and 900000'));return;}
 const cancel=code=>{send({kind:'cancel',id});settle(id,new PluginError(code,code==='E_TIMEOUT'?'Host request timed out':'Request cancelled'));if(method==='runtime.webLogin'&&supports('runtime.webLogin.cancel'))request('runtime.webLogin.cancel').catch(()=>{});};
 const item={resolve,reject,signal:options.signal,abort:()=>cancel('E_CANCELLED'),timer:setTimeout(()=>cancel('E_TIMEOUT'),timeout)};pending.set(id,item);options.signal?.addEventListener('abort',item.abort,{once:true});try{send({kind:'request',id,method,params});}catch{settle(id,new PluginError('E_INVALID_PARAMS','Parameters cannot be cloned'));}
}));}
addEventListener('message',event=>{const d=event.data;if(event.source!==parent||d?.protocol!=='nous.plugin/1')return;
 if(d.kind==='init'){if(context||typeof d.nonce!=='string'||!d.context?.pluginId)return;context=Object.freeze(d.context);nonce=d.nonce;document.documentElement.dataset.theme=context.theme;readyResolve(context);send({kind:'ready'});return;}
 if(!context||d.nonce!==nonce)return;
 if(d.kind==='result'){settle(d.id,d.error?new PluginError(d.error.code,d.error.message):null,d.value);return;}
 if(d.kind==='event'){if(d.event==='theme.changed')document.documentElement.dataset.theme=d.value;for(const fn of listeners.get(d.event)||[])try{fn(d.value);}catch(error){console.error('Plugin event listener failed',error);}}
});
async function authorize(params,options={}){const session=await request('auth.external.begin',params,options);try{while(true){if(options.signal?.aborted)throw new PluginError('E_CANCELLED','Authorization cancelled');const result=await request('auth.external.status',{sessionId:session.sessionId},options);if(result.status==='success')return result;if(result.status!=='pending')throw new PluginError(result.status==='expired'?'E_AUTH_EXPIRED':result.status==='cancelled'?'E_CANCELLED':'E_AUTH_DENIED',result.error||'Authorization ended');await new Promise(resolve=>setTimeout(resolve,800));}}finally{await request('auth.external.cancel',{sessionId:session.sessionId}).catch(()=>{});}}
window.NousPlugin={ready,request,supports,authorize,PluginError,on(event,handler){if(typeof handler!=='function')throw new TypeError('handler must be a function');if(!listeners.has(event))listeners.set(event,new Set());listeners.get(event).add(handler);return()=>listeners.get(event)?.delete(handler);},get context(){return context;}};
addEventListener('pagehide',()=>{for(const id of [...pending.keys()]){send({kind:'cancel',id});settle(id,new PluginError('E_CANCELLED','Plugin page closed'));}listeners.clear();});
})();
