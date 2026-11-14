export type Platform='windows-x64'|'android-arm64'|'web';
export type Json=null|boolean|number|string|Json[]|{[key:string]:Json};
export interface RequestOptions{signal?:AbortSignal;timeoutMs?:number}
export interface Context{pluginId:string;platform:Platform;api:string;hostApi:string;pluginApi:string;supportedApis:string[];hostVersion:string;theme:string;locale:string;view:string;navigation:{id:string;label:string;icon?:string}[];capabilities:string[];permissions:string[];methods:Record<string,{version:string;timeoutMs:number}>;development?:boolean;limits:{requestBytes:number;responseBytes:number;pendingRequests:number;storageBytes:number}}
export interface WebLogin{url:string;domains:string[];cookieUrls:string[];requiredCookies:string[][];urls?:Partial<Record<Platform,string>>;userAgent?:string;userAgents?:Partial<Record<Platform,string>>;validation?:{url:string;path:string[];equals:string|number|boolean;nonEmpty?:string[];userAgent?:string}}
export interface ExternalAuthorization{authorizationEndpoint:string;clientId:string;scope?:string;extra?:Record<string,string>;timeoutMs?:number}
export interface AuthorizationResult{status:'success';code:string;codeVerifier:string;redirectUri:string}
export interface Methods{
 'host.info':{params:{};result:{version:string;api:string;platform:Platform;theme:string;locale:string}};
 'host.capabilities':{params:{};result:Pick<Context,'api'|'supportedApis'|'hostVersion'|'platform'|'permissions'|'methods'|'limits'>&{features:Record<string,Json>}};
 'navigation.go':{params:{view:string};result:{ok:true}};
 'storage.get':{params:{key:string};result:Json};
 'storage.set':{params:{key:string;value:Json};result:{ok:true}};
 'storage.remove':{params:{key:string};result:{ok:true}};
 'clipboard.write':{params:{text:string};result:{ok:true}};
 'external.open':{params:{url:string};result:{opened:true}};
 'runtime.status':{params:{};result:{installed:boolean;ready:boolean;running:boolean}};
 'runtime.start':{params:{};result:{running:boolean}};
 'runtime.stop':{params:{};result:{running:boolean}};
 'runtime.invoke':{params:{method:string;params?:Record<string,Json>};result:Json};
 'runtime.webLogin':{params:WebLogin;result:{cookie:string}};
 'runtime.webLogin.cancel':{params:{};result:{cancelled:true}};
 'auth.external.begin':{params:ExternalAuthorization;result:{sessionId:string;authorizationUrl:string;redirectUri:string;expiresAt:number}};
 'auth.external.status':{params:{sessionId:string};result:{status:'pending'|'success'|'cancelled'|'expired'|'error'|'consumed';code?:string;codeVerifier?:string;redirectUri?:string;error?:string}};
 'auth.external.cancel':{params:{sessionId:string};result:{cancelled:true}};
}
export declare class PluginError extends Error{code:string}
export interface Client{ready:Promise<Context>;readonly context:Context|null;supports(method:keyof Methods):boolean;request<M extends keyof Methods>(method:M,params?:Methods[M]['params'],options?:RequestOptions):Promise<Methods[M]['result']>;authorize(params:ExternalAuthorization,options?:RequestOptions):Promise<AuthorizationResult>;on(event:string,handler:(value:any)=>void):()=>void;PluginError:typeof PluginError}
declare global{interface Window{NousPlugin:Client}const NousPlugin:Client}
