/** Compatibility entry: one shared engine and original standalone AudioRuntime constructor for Editor audition. */
import {AudioRuntime as OwnedAudioRuntime} from './audioRuntime'
import {lazyLegacyAudioCapabilities} from './audioLegacy'
export {defaultAudioSettings,normalizeAudioSettings} from './audioDocuments'
export type {AudioEffectKind,AudioMixerEffect,AudioMixerSend,AudioMixerBusSettings,AudioMixerSnapshot,AudioDuckingRule,AudioMixerSettings,AudioProjectSettings} from './audioSettingsContracts'
export type {TimelineAudioVoiceRequest,AudioTransportTime,AudioVoiceClock,AudioRuntimeDiagnostics} from './audioRuntimeContracts'
export class AudioRuntime extends OwnedAudioRuntime{constructor(){super(lazyLegacyAudioCapabilities())}}
export const audioRuntime=new AudioRuntime()
