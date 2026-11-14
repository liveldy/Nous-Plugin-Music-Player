export type PluginPlatform='windows-x64'|'android-arm64'|'web';
export type PluginApi='1.0'|'1.1'|'1.2'|'1.3';
export type Permission='storage'|'clipboard.write'|'external.open'|'native.runtime'|'auth.external'|'native.application'|'native.bridge';
export interface ReleaseAsset{url:string;sha256:string;bytes:number}
export interface JvmRuntime{type:'jvm';entry:string;mainJar?:string;asset:ReleaseAsset}
export interface DexRuntime{type:'android-dex';entry:string;minSdk?:number;asset:ReleaseAsset}
export interface PluginAuthor{name:string;url?:string;email?:string}
export interface PluginRelease{version:string;publishedAt:string;changes:string[]}
export interface PluginManifest {author?:PluginAuthor;changelog?:PluginRelease[];id:string;name:string;version:string;api:PluginApi;description:string;platforms:PluginPlatform[];permissions:Permission[];entry:string;icon?:string;repository:string;license:string;native?:Record<string,any>;runtime?:{'windows-x64'?:JvmRuntime;'android-arm64'?:DexRuntime};navigation?:{id:string;label:string;icon?:string}[];defaultView?:string;requiresHost?:string;requiredMethods?:string[];optionalMethods?:string[];}
export interface PluginBundle {format:'nous.plugin/v1';manifest:PluginManifest;files:Record<string,string>}
export const HOST_API:string;export const PLATFORMS:string[];export const PERMISSIONS:string[];
export function versionParts(value:string):number[];export function compareVersions(a:string,b:string):number;
export function validPath(path:string):boolean;export function validateBundle(bundle:any,platform?:string):PluginBundle;
export function githubURL(value:string,repo?:string):URL;export function b64bytes(value:string):Uint8Array;
export function sha256(value:string|Uint8Array):Promise<string>;export function verifyEnvelope(envelope:any,publicKey:string):Promise<any>;
export function pluginDocument(bundle:PluginBundle,nonce:string):string;
