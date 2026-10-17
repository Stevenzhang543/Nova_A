import type {AudioRuntimeCapabilities} from './audioRuntimeContracts'
let port:AudioRuntimeCapabilities|null=null
export function installLegacyAudioPort(value:AudioRuntimeCapabilities):void{if(!value?.platform||typeof value.resources?.resolveAsset!=='function')throw new Error('AUDIO_SERVICES_REQUIRED');if(port&&port!==value)throw new Error('AUDIO_LEGACY_PORT_ALREADY_INSTALLED');port=value}
export function requireLegacyAudioPort():AudioRuntimeCapabilities{if(!port)throw new Error('AUDIO_SERVICES_REQUIRED: The Editor audio adapter has not been installed.');return port}
/** Cold imports never construct a World, open a device or call the provider. */
export function lazyLegacyAudioCapabilities():AudioRuntimeCapabilities{return {
 resources:{resolveAsset:r=>requireLegacyAudioPort().resources.resolveAsset(r)},
 platform:{get Audio(){return requireLegacyAudioPort().platform.Audio},get AudioContext(){return requireLegacyAudioPort().platform.AudioContext},get mediaDevices(){return requireLegacyAudioPort().platform.mediaDevices},createReadAbortController:()=>requireLegacyAudioPort().platform.createReadAbortController(),nowMilliseconds:()=>requireLegacyAudioPort().platform.nowMilliseconds(),dateIso:()=>requireLegacyAudioPort().platform.dateIso(),readAudioBytes:(...args)=>requireLegacyAudioPort().platform.readAudioBytes(...args)}
}}
