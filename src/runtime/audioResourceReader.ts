import type {RuntimeAudioAsset,AudioResources} from './audioRuntimeContracts'
const record=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value))
const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)
/** Minimal checked read view of the actual bound normalized record, never an AssetRecord cast or Editor fallback. */
export function readRuntimeAudioAsset(value:unknown):RuntimeAudioAsset|null{
 if(!record(value)||value.assetType!=='audio'||typeof value.source!=='string'||!finite(value.duration)||!record(value.settings)||!record(value.settings.audioSettings))return null
 const a=value.settings.audioSettings
 if(typeof a.streaming!=='boolean'||typeof a.normalize!=='boolean'||typeof a.preload!=='string'||![a.trimStart,a.trimEnd,a.normalizationGain,a.loopStart,a.loopEnd].every(finite)||!(a.activeLoopRegion===null||typeof a.activeLoopRegion==='string')||!Array.isArray(a.loopRegions))return null
 const regions:Array<{id:string;start:number;end:number}>=[]
 for(const r of a.loopRegions){if(!record(r)||typeof r.id!=='string'||!finite(r.start)||!finite(r.end))return null;regions.push({id:r.id,start:r.start,end:r.end})}
 return {assetType:'audio',source:value.source,duration:value.duration,settings:{audioSettings:{streaming:a.streaming,normalize:a.normalize,preload:a.preload,trimStart:a.trimStart as number,trimEnd:a.trimEnd as number,normalizationGain:a.normalizationGain as number,loopStart:a.loopStart as number,loopEnd:a.loopEnd as number,activeLoopRegion:a.activeLoopRegion,loopRegions:regions}}}
}
export function createAudioResourceReader(resources:AudioResources):AudioRuntimeCapabilitiesResources{
 if(!resources||typeof resources.resolveAsset!=='function')throw new Error('AUDIO_RESOURCES_REQUIRED: Supply this Runtime catalog.')
 return {resolveAsset(reference){return readRuntimeAudioAsset(resources.resolveAsset(reference))}}
}
type AudioRuntimeCapabilitiesResources={resolveAsset(reference:string|null|undefined):RuntimeAudioAsset|null}
