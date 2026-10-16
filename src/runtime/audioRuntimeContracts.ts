import type {Entity} from '../world/Entity'
import type {AudioPlaybackElement} from './audioBuffers'
import type {AudioProjectSettings} from './audioSettingsContracts'
export interface TimelineAudioVoiceRequest {key:string;ownerUuid:string;entity:Entity;reference:string;time:number;playbackRate:number;gain:number;playing:boolean}
export interface AudioTransportTime {seconds:number;playing:boolean;scale:number}
export interface AudioVoiceClock {sample:number;seconds:number;playbackRate:number;playing:boolean;streaming:boolean}
export interface AudioRuntimeDiagnostics {
  clock: {ticks:number;seconds:number;sample:number;sampleRate:number;playing:boolean;scale:number}
  voiceClocks:Record<string,AudioVoiceClock>
  activeVoices: number
  streamingVoices: number
  bufferedVoices: number
  contextState: AudioContextState | 'unavailable'
  busMeters: Record<string, number>
  limitedVoices: number
  virtualVoices: number
  baseLatencyMs: number | null
  outputLatencyMs: number | null
  underruns: number
  deviceChanges: number
  lastDeviceChange: string
  busMeterDetails: Record<string, { rms: number; peak: number; rmsDb: number; peakDb: number; clipped: boolean }>
  clippingEvents: number
  loudnessDb: number
  momentaryLufs: number
  integratedLufs: number
  truePeakDb: number
  crestFactorDb: number
  stolenVoices: number
  failures: Array<{ at: string; operation: string; message: string; recovery: string }>
  outputDevices: Array<{ id: string; label: string }>
  selectedOutputDevice: string
  recoveryCount: number
}


export interface RuntimeAudioAsset {
 readonly assetType:'audio';readonly source:string;readonly duration:number
 readonly settings:{readonly audioSettings:{readonly streaming:boolean;readonly trimStart:number;readonly trimEnd:number;readonly normalize:boolean;readonly normalizationGain:number;readonly preload:string;readonly loopRegions:readonly {id:string;start:number;end:number}[];readonly activeLoopRegion:string|null;readonly loopStart:number;readonly loopEnd:number}}
}
export interface AudioResources {resolveAsset(reference:string|null|undefined):unknown}
export interface RuntimeAudioPlatform {
 readonly Audio: (new(source?:string)=>AudioPlaybackElement)|undefined
 readonly AudioContext:(new(options?:AudioContextOptions)=>AudioContext)|undefined
 readonly mediaDevices:Pick<MediaDevices,'enumerateDevices'|'addEventListener'|'removeEventListener'>|undefined
 createReadAbortController():AbortController
 nowMilliseconds():number;dateIso():string
 readAudioBytes(source:string,maximumBytes:number,signal?:AbortSignal):Promise<ArrayBuffer>
}
export interface AudioRuntimeCapabilities {readonly resources:{resolveAsset(reference:string|null|undefined):RuntimeAudioAsset|null};readonly platform:RuntimeAudioPlatform}
export interface AudioWorld {readonly entities:Entity[]}
export type AudioSettings=AudioProjectSettings
