export const API_VERSION:string;
export const SUPPORTED_APIS:string[];
export const ERROR_CODES:string[];
export const METHODS:Record<string,{permission:string|null;platforms:string[];params:any;result:any;since:string;version:string;timeoutMs:number}>;
export class PluginError extends Error{code:string;details?:unknown;constructor(code:string,message:string,details?:unknown);}
export function checkJSON(value:any,schema?:any,path?:string,depth?:number):any;
export type HostCapabilities={api:string;supportedApis:string[];hostVersion:string;platform:string;permissions:string[];methods:Record<string,{version:string;timeoutMs:number}>;features:Record<string,unknown>;limits:{requestBytes:number;responseBytes:number;pendingRequests:number;storageBytes:number}};
export function capabilities(platform:string,hostVersion:string,permissions?:string[]):HostCapabilities;
export function assertRequest(method:string,params:any,profile:HostCapabilities):typeof METHODS[string];
export function normalizeError(error:unknown):{code:string;message:string};
export function negotiate(manifest:{api:string;platforms:string[];requiresHost?:string;requiredMethods?:string[]},profile:HostCapabilities):{hostApi:string;pluginApi:string;negotiatedApi:string};
