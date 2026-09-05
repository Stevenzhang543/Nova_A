import { resolveAsset } from '../assets/AssetDatabase'
import type { Entity } from '../world/Entity'
import { AudioSource, type AudioListener } from '../world/components'
import { MediaClock, mediaSample } from './mediaClock'
import { AudioBufferCache, BufferedAudioPlayback, type AudioPlaybackElement } from './audioBuffers'
import { finiteNumber } from '../world/geometry'
import { worldTransform } from '../world/hierarchy'

export type AudioEffectKind = 'LowPass' | 'HighPass' | 'Compressor' | 'Delay' | 'Reverb'

export interface AudioMixerEffect {
  id: string
  kind: AudioEffectKind
  enabled: boolean
  wet: number
  frequency: number
  q: number
  threshold: number
  ratio: number
  time: number
  feedback: number
}

export interface AudioMixerSend { target: string; gain: number; enabled: boolean }

export interface AudioMixerBusSettings {
  id: string
  name: string
  gain: number
  mute: boolean
  solo: boolean
  parent: string | null
  voiceLimit: number
  sends: AudioMixerSend[]
  effects: AudioMixerEffect[]
  automation: Array<{ time: number; gain: number }>
  automationLoopSeconds: number
}

export interface AudioMixerSnapshot {
  id: string
  name: string
  masterVolume: number
  busGains: Record<string, number>
}

export interface AudioDuckingRule {
  id: string
  triggerBus: string
  targetBus: string
  reductionDb: number
  attack: number
  release: number
  enabled: boolean
}

export interface AudioMixerSettings {
  buses: AudioMixerBusSettings[]
  snapshots: AudioMixerSnapshot[]
  activeSnapshot: string | null
  snapshotTransitionSeconds: number
  ducking: AudioDuckingRule[]
  masterVoiceLimit: number
  outputDeviceId: string
  limiterEnabled: boolean
  limiterCeilingDb: number
}

export interface AudioProjectSettings {
  masterVolume: number
  sampleRate: 44100 | 48000 | 96000
  /** Compatibility gains retained for Schema 5–19 projects and the compact Settings view. */
  buses: Record<'Master' | 'Music' | 'SFX' | 'UI', number>
  mixer: AudioMixerSettings
}

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

const DEFAULT_BUS_IDS = ['Master', 'Music', 'SFX', 'UI'] as const
const MAX_BUSES = 32
const MAX_EFFECTS_PER_BUS = 8
const MAX_SENDS_PER_BUS = 16
const MAX_SNAPSHOTS = 32
const MAX_DUCKING_RULES = 32

function defaultBus(id: string, parent: string | null): AudioMixerBusSettings {
  return { id, name: id, gain: 1, mute: false, solo: false, parent, voiceLimit: id === 'Music' ? 4 : 32, sends: [], effects: [], automation: [], automationLoopSeconds: 0 }
}

export function defaultAudioSettings(): AudioProjectSettings {
  return {
    masterVolume: 1,
    sampleRate: 48000,
    buses: { Master: 1, Music: 1, SFX: 1, UI: 1 },
    mixer: {
      buses: [defaultBus('Master', null), defaultBus('Music', 'Master'), defaultBus('SFX', 'Master'), defaultBus('UI', 'Master')],
      snapshots: [{ id: 'default', name: 'Default', masterVolume: 1, busGains: { Master: 1, Music: 1, SFX: 1, UI: 1 } }],
      activeSnapshot: null, snapshotTransitionSeconds: .12, ducking: [], masterVoiceLimit: 128, outputDeviceId: 'default', limiterEnabled: true, limiterCeilingDb: -1
    }
  }
}

function clamp(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, finiteNumber(value, fallback)))
}

function safeId(value: unknown, fallback: string): string {
  const id = String(value ?? '').trim().replace(/[^A-Za-z0-9_.-]/g, '-').slice(0, 80)
  return id || fallback
}

function normalizeEffect(source: unknown, index: number): AudioMixerEffect {
  const item = source && typeof source === 'object' ? source as Partial<AudioMixerEffect> : {}
  const kinds: AudioEffectKind[] = ['LowPass', 'HighPass', 'Compressor', 'Delay', 'Reverb']
  return {
    id: safeId(item.id, `effect-${index}`), kind: kinds.includes(item.kind as AudioEffectKind) ? item.kind as AudioEffectKind : 'LowPass', enabled: item.enabled !== false,
    wet: clamp(item.wet, 1, 0, 1), frequency: clamp(item.frequency, 1200, 10, 24_000), q: clamp(item.q, .7, .0001, 1000),
    threshold: clamp(item.threshold, -24, -100, 0), ratio: clamp(item.ratio, 4, 1, 20), time: clamp(item.time, .18, 0, 5), feedback: clamp(item.feedback, .25, 0, .95)
  }
}

function wouldCycle(edges: Map<string, string[]>, source: string, target: string): boolean {
  const stack = [target], visited = new Set<string>()
  while (stack.length) {
    const current = stack.pop()!
    if (current === source) return true
    if (visited.has(current)) continue
    visited.add(current); stack.push(...(edges.get(current) ?? []))
  }
  return false
}

export function normalizeAudioSettings(source: unknown): AudioProjectSettings {
  const defaults = defaultAudioSettings()
  const item = source && typeof source === 'object' ? source as Partial<AudioProjectSettings> : {}
  const legacy = item.buses && typeof item.buses === 'object' ? item.buses as Partial<Record<typeof DEFAULT_BUS_IDS[number], unknown>> : {}
  const gain = (value: unknown, fallback = 1) => clamp(value, fallback, 0, 1)
  const rawRate = Math.round(finiteNumber(item.sampleRate, 48000))
  const sampleRate = ([44100, 48000, 96000] as const).reduce((closest, rate) => Math.abs(rate - rawRate) < Math.abs(closest - rawRate) ? rate : closest, 48000 as 44100 | 48000 | 96000)
  const mixerSource = item.mixer && typeof item.mixer === 'object' ? item.mixer as Partial<AudioMixerSettings> : {}
  const requestedBuses = Array.isArray(mixerSource.buses) ? mixerSource.buses : defaults.mixer.buses
  const ids = new Set<string>(), buses: AudioMixerBusSettings[] = []
  for (const [index, raw] of requestedBuses.slice(0, MAX_BUSES).entries()) {
    const value = raw && typeof raw === 'object' ? raw as Partial<AudioMixerBusSettings> : {}
    let id = safeId(value.id, `Bus-${index + 1}`)
    if (ids.has(id)) id = safeId(`${id}-${index + 1}`, `Bus-${index + 1}`)
    ids.add(id)
    buses.push({
      id, name: String(value.name ?? id).trim().slice(0, 80) || id, gain: gain(value.gain), mute: value.mute === true, solo: value.solo === true,
      parent: typeof value.parent === 'string' ? safeId(value.parent, 'Master') : null,
      voiceLimit: Math.round(clamp(value.voiceLimit, id === 'Music' ? 4 : 32, 1, 512)),
      sends: Array.isArray(value.sends) ? value.sends.slice(0, MAX_SENDS_PER_BUS).map(send => ({
        target: safeId(send?.target, 'Master'), gain: gain(send?.gain), enabled: send?.enabled !== false
      })) : [],
      effects: Array.isArray(value.effects) ? value.effects.slice(0, MAX_EFFECTS_PER_BUS).map(normalizeEffect) : []
      ,automation: (Array.isArray(value.automation) ? value.automation : []).slice(0, 64).map(point => ({ time: clamp(point?.time, 0, 0, 3_600), gain: gain(point?.gain) })).sort((a, b) => a.time - b.time),
      automationLoopSeconds: clamp(value.automationLoopSeconds, 0, 0, 3_600)
    })
  }
  if (!ids.has('Master')) { ids.add('Master'); buses.unshift(defaultBus('Master', null)) }
  for (const id of DEFAULT_BUS_IDS) if (!ids.has(id)) { ids.add(id); buses.push(defaultBus(id, 'Master')) }
  const edges = new Map<string, string[]>()
  for(const bus of buses){
    if(bus.id==='Master')bus.parent=null
    else if(!bus.parent||!ids.has(bus.parent)||bus.parent===bus.id||wouldCycle(edges,bus.id,bus.parent))bus.parent='Master'
    edges.set(bus.id,bus.parent?[bus.parent]:[])
  }
  // Validate sends only after every parent edge exists, including parents declared later.
  for(const bus of buses){const accepted:AudioMixerSend[]=[];for(const send of bus.sends){if(!ids.has(send.target)||send.target===bus.id||wouldCycle(edges,bus.id,send.target))continue;accepted.push(send);if(send.enabled)edges.get(bus.id)!.push(send.target)}bus.sends=accepted}
  const snapshots = (Array.isArray(mixerSource.snapshots) ? mixerSource.snapshots : defaults.mixer.snapshots).slice(0, MAX_SNAPSHOTS).map((raw, index) => {
    const value = raw && typeof raw === 'object' ? raw as Partial<AudioMixerSnapshot> : {}
    const busGains: Record<string, number> = {}
    if (value.busGains && typeof value.busGains === 'object') for (const [id, amount] of Object.entries(value.busGains)) if (ids.has(id)) busGains[id] = gain(amount)
    return { id: safeId(value.id, `snapshot-${index + 1}`), name: String(value.name ?? `Snapshot ${index + 1}`).slice(0, 80), masterVolume: gain(value.masterVolume), busGains }
  })
  const ducking = (Array.isArray(mixerSource.ducking) ? mixerSource.ducking : []).slice(0, MAX_DUCKING_RULES).flatMap((raw, index) => {
    const value = raw && typeof raw === 'object' ? raw as Partial<AudioDuckingRule> : {}
    const triggerBus = safeId(value.triggerBus, 'SFX'), targetBus = safeId(value.targetBus, 'Music')
    if (!ids.has(triggerBus) || !ids.has(targetBus) || triggerBus === targetBus) return []
    return [{ id: safeId(value.id, `duck-${index + 1}`), triggerBus, targetBus, reductionDb: clamp(value.reductionDb, -12, -80, 0), attack: clamp(value.attack, .04, 0, 10), release: clamp(value.release, .35, 0, 30), enabled: value.enabled !== false }]
  })
  const hasMixer = Boolean(item.mixer && typeof item.mixer === 'object')
  const synchronizedGain = (id: typeof DEFAULT_BUS_IDS[number]) => {
    const mixerGain = buses.find(bus => bus.id === id)?.gain ?? 1
    return hasMixer ? gain(mixerGain) : gain(legacy[id], mixerGain)
  }
  const busesLegacy = {
    Master: synchronizedGain('Master'), Music: synchronizedGain('Music'),
    SFX: synchronizedGain('SFX'), UI: synchronizedGain('UI')
  }
  for (const id of DEFAULT_BUS_IDS) { const bus = buses.find(candidate => candidate.id === id); if (bus) bus.gain = busesLegacy[id] }
  return {
    masterVolume: gain(item.masterVolume), sampleRate, buses: busesLegacy,
    mixer: { buses, snapshots, activeSnapshot: typeof mixerSource.activeSnapshot === 'string' && snapshots.some(snapshot => snapshot.id === mixerSource.activeSnapshot) ? mixerSource.activeSnapshot : null, snapshotTransitionSeconds: clamp(mixerSource.snapshotTransitionSeconds, .12, 0, 30), ducking, masterVoiceLimit: Math.round(clamp(mixerSource.masterVoiceLimit, 128, 1, 1024)), outputDeviceId: typeof mixerSource.outputDeviceId === 'string' ? mixerSource.outputDeviceId.slice(0, 256) || 'default' : 'default', limiterEnabled: mixerSource.limiterEnabled !== false, limiterCeilingDb: clamp(mixerSource.limiterCeilingDb, -1, -24, 0) }
  }
}

interface ActiveAudio {
  reference: string
  bus: string
  element: AudioPlaybackElement
  source: AudioNode | null
  gain: GainNode | null
  panner: StereoPannerNode | null
  started: boolean
  manuallyPaused: boolean
  completed: boolean
  streaming: boolean
  loopStart: number
  loopEnd: number
  timeUpdate: () => void
  pitchVariation: number
  volumeVariation: number
}

export class AudioRuntime {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private limiter: DynamicsCompressorNode | null = null
  private limiterEnabledApplied: boolean | null = null
  private busInputs = new Map<string, GainNode>()
  private busOutputs = new Map<string, GainNode>()
  private busMeters = new Map<string, AnalyserNode>()
  private mixerNodes: AudioNode[] = []
  private sendNodes: GainNode[] = []
  private active = new Map<string, ActiveAudio>()
  private polyphonic = new Map<string, ActiveAudio[]>()
  private uiVoices = new Map<string,ActiveAudio>()
  private bufferCache:AudioBufferCache|null=null
  private voicePositions=new Map<ActiveAudio,{seconds:number;transport:number}>()
  private transportSupplied=false
  private timelineVoices=new Map<string,{voice:ActiveAudio;component:AudioSource;request:TimelineAudioVoiceRequest}>()
  private transport=new MediaClock()
  private transportScale=1
  private settings: AudioProjectSettings = defaultAudioSettings()
  private mixerSignature = ''
  private deviceListenerInstalled = false
  private lastUpdateAt = 0
  private lastContextTime = 0
  private lastUnderrunAt = 0
  private voiceSerial = 0
  private manualLimitedVoices = 0
  private integratedLoudnessEnergy = 0
  private integratedLoudnessSamples = 0
  readonly diagnostics: AudioRuntimeDiagnostics = { clock:{ticks:0,seconds:0,sample:0,sampleRate:48000,playing:false,scale:1},voiceClocks:{},activeVoices: 0, streamingVoices: 0, bufferedVoices: 0, contextState: 'unavailable', busMeters: {}, limitedVoices: 0, virtualVoices: 0, baseLatencyMs: null, outputLatencyMs: null, underruns: 0, deviceChanges: 0, lastDeviceChange: '', busMeterDetails: {}, clippingEvents: 0, loudnessDb: -120, momentaryLufs: -120, integratedLufs: -120, truePeakDb: -120, crestFactorDb: 0, stolenVoices: 0, failures: [], outputDevices: [], selectedOutputDevice: 'default', recoveryCount: 0 }

  begin(settings: AudioProjectSettings): void {
    this.settings = normalizeAudioSettings(settings)
    this.refreshContextForSampleRate(); this.ensureContext(); void this.recover(); this.applyMix()
  }

  async refreshOutputDevices(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) { this.diagnostics.outputDevices = [{ id: 'default', label: 'System default' }]; return }
    try { const devices = await navigator.mediaDevices.enumerateDevices(); this.diagnostics.outputDevices = [{ id: 'default', label: 'System default' }, ...devices.filter(device => device.kind === 'audiooutput' && device.deviceId !== 'default').map((device, index) => ({ id: device.deviceId, label: device.label || `Audio output ${index + 1}` }))] }
    catch (error) { this.reportFailure('enumerate devices', error, 'Grant media-device permission or keep the system default output.') }
  }

  async selectOutputDevice(deviceId: string): Promise<boolean> {
    const requestedDevice = deviceId || 'default'
    this.settings.mixer.outputDeviceId = requestedDevice
    const context = this.context as (AudioContext & { setSinkId?: (id: string) => Promise<void> }) | null
    if (!context?.setSinkId) { this.diagnostics.selectedOutputDevice = 'default'; if (requestedDevice !== 'default') this.reportFailure('select output device', new Error('This runtime does not expose AudioContext.setSinkId.'), 'Use the system default output or a Chromium/WebView build with output routing support.'); return requestedDevice === 'default' }
    if (requestedDevice === 'default') {
      // The Web Audio default sink is the empty ID. Routing to it is optional:
      // if a browser or headless host has no enumerated output, its existing
      // implicit route remains the safest fallback and must not block builds.
      try { await context.setSinkId('') } catch { /* Keep the browser's implicit default route. */ }
      this.diagnostics.selectedOutputDevice = 'default'
      return true
    }
    try { await context.setSinkId(requestedDevice); this.diagnostics.selectedOutputDevice = requestedDevice; return true } catch (error) { this.reportFailure('select output device', error, 'Reconnect the device, choose System default, then retry.'); return false }
  }

  async recover(): Promise<boolean> {
    this.ensureContext(); if (!this.context) return false
    try { if (this.context.state === 'suspended') await this.context.resume(); await this.selectOutputDevice(this.settings.mixer.outputDeviceId); this.diagnostics.recoveryCount++; return this.context.state === 'running' }
    catch (error) { this.reportFailure('resume audio context', error, 'Interact with the document once, then press Recover audio.'); return false }
  }

  setTransportTime(value:AudioTransportTime):void{
    this.transportSupplied=true;this.transport.seek(value.seconds);this.transportScale=Math.max(0,Math.min(100,finiteNumber(value.scale,1)))
    const sampleRate=this.context?.sampleRate??this.settings.sampleRate
    this.diagnostics.clock={ticks:this.transport.ticks,seconds:this.transport.seconds,sample:mediaSample(this.transport.seconds,sampleRate),sampleRate,playing:value.playing,scale:this.transportScale}
  }

  update(entities: Entity[], settings: AudioProjectSettings, playing: boolean, transport?:AudioTransportTime): void {
    if(transport)this.setTransportTime(transport)
    playing=playing&&this.transportScale>0;this.diagnostics.clock.playing=playing
    for(const entry of this.timelineVoices.values()){
      const {voice,request}=entry,supported=this.setPlaybackRate(voice,request.playbackRate*this.transportScale),wantsPlayback=playing&&supported&&request.playing&&request.playbackRate!==0&&!voice.completed
      voice.manuallyPaused=!wantsPlayback
      if(!wantsPlayback)voice.element.pause()
      else if(voice.started&&voice.element.paused)void voice.element.play().catch(error=>this.reportFailure('resume timeline audio',error,'Interact with the game view and resume playback.'))
      const clock=this.diagnostics.voiceClocks['timeline:'+request.key];if(clock){clock.playing=wantsPlayback;clock.playbackRate=request.playbackRate*this.transportScale}
    }
    const updateAt = performance.now()
    this.settings = normalizeAudioSettings(settings)
    this.refreshContextForSampleRate(); if (playing) this.ensureContext(); this.configureMixerGraph(); this.applyMix()
    if(this.context&&typeof AudioContext!=='undefined'&&this.context instanceof AudioContext){if(!playing&&this.context.state==='running')void this.context.suspend().catch(()=>undefined);else if(playing&&this.context.state==='suspended')void this.context.resume().catch(()=>undefined)}
    const live = new Set<string>(), voicesByBus = new Map<string, number>()
    let voiceCount=[...[...this.polyphonic.values()].flat(),...this.uiVoices.values(),...[...this.timelineVoices.values()].map(entry=>entry.voice)].filter(voice=>voice.started&&!voice.manuallyPaused&&!voice.completed&&!voice.element.paused).length,limited=0,virtual=0
    for (const voices of this.polyphonic.values()) for (const voice of voices) if(voice.started&&!voice.manuallyPaused&&!voice.completed)voicesByBus.set(voice.bus, (voicesByBus.get(voice.bus) ?? 0) + 1)
    for(const {voice} of this.timelineVoices.values())if(voice.started&&!voice.manuallyPaused&&!voice.completed)voicesByBus.set(voice.bus,(voicesByBus.get(voice.bus)??0)+1)
    const listener = entities.find(entity => { const component = entity.getComponent<AudioListener>('AudioListener'); return entity.enabled && component?.enabled && component.active })
    const listenerPosition = listener ? worldTransform(listener, entities).position : { x: 0, y: 0 }
    const sources = entities.flatMap(entity => {
      const component = entity.getComponent<AudioSource>('AudioSource')
      return entity.enabled && component?.enabled && (component.audioClip || component.playlist.length) ? [{ entity, component }] : []
    }).sort((first, second) => first.component.voicePriority - second.component.voicePriority)
    for(const voice of this.uiVoices.values()){this.enforceLoopBounds(voice);if(!playing)voice.element.pause();else if(voice.started&&!voice.completed&&voice.element.paused&&!voice.manuallyPaused)void voice.element.play().catch(()=>undefined);this.setPlaybackRate(voice,this.transportScale);this.syncVoiceClock(voice,playing,1,'ui:'+voice.reference)}
    for (const { entity, component } of sources) {
      const busSettings = this.settings.mixer.buses.find(bus => bus.id === component.bus) ?? this.settings.mixer.buses.find(bus => bus.id === 'SFX')!
      const busVoices = voicesByBus.get(busSettings.id) ?? 0
      if (voiceCount >= this.settings.mixer.masterVoiceLimit || busVoices >= busSettings.voiceLimit) { this.release(component.uuid); limited++; if (component.virtualizeWhenLimited) virtual++; continue }
      live.add(component.uuid)
      const reference = this.sourceReference(component)
      if (!reference) continue
      const asset = resolveAsset(reference)
      if (!asset || asset.assetType !== 'audio' || !asset.source) { this.release(component.uuid); continue }
      const streaming = component.streamOverride === 'Stream' || component.streamOverride === 'ImportSetting' && asset.settings.audioSettings.streaming
      const trimStart = clamp(asset.settings.audioSettings.trimStart, 0, 0, Math.max(0, asset.duration))
      const trimEnd = clamp(asset.settings.audioSettings.trimEnd, 0, 0, Math.max(0, asset.duration))
      const selectedLoop = asset.settings.audioSettings.loopRegions.find(region => region.id === asset.settings.audioSettings.activeLoopRegion)
      const loopStart = Math.max(trimStart, clamp(selectedLoop?.start ?? asset.settings.audioSettings.loopStart, 0, 0, Math.max(0, asset.duration)))
      const loopEnd = Math.min(trimEnd > trimStart ? trimEnd : Math.max(0, asset.duration), clamp(selectedLoop?.end ?? asset.settings.audioSettings.loopEnd, 0, 0, Math.max(0, asset.duration)) || Math.max(0, asset.duration))
      let audio = this.active.get(component.uuid)
      if (!audio || audio.reference !== reference || audio.streaming !== streaming) {
        this.release(component.uuid)
        const element = this.createPlayback(asset.source,streaming); element.preload = streaming || asset.settings.audioSettings.preload === 'Metadata' ? 'metadata' : asset.settings.audioSettings.preload === 'None' ? 'none' : 'auto'
        let created: ActiveAudio
        const timeUpdate = () => { this.enforceLoopBounds(created); if (created.completed && component.playlistMode !== 'Single' && component.playlist.length && !component.loop) { component.playlistIndex = component.playlistMode === 'Random' ? Math.abs(Math.round(seededVariation(`${component.uuid}:${this.voiceSerial++}`) * 1_000_000)) % component.playlist.length : (component.playlistIndex + 1) % component.playlist.length; this.release(component.uuid) } }
        element.addEventListener('timeupdate', timeUpdate)
        const pitchVariation = seededVariation(`${component.uuid}:pitch:${this.diagnostics.activeVoices}`), volumeVariation = seededVariation(`${component.uuid}:volume:${this.diagnostics.activeVoices}`)
        created = { reference, bus: busSettings.id, element, source: null, gain: null, panner: null, started: false, manuallyPaused: false, completed: false, streaming, loopStart, loopEnd, timeUpdate, pitchVariation, volumeVariation }
        this.connect(component, created); this.active.set(component.uuid, created); audio = created
      }
      if (!audio) continue
      if (audio.bus !== busSettings.id) { audio.bus = busSettings.id; audio.panner?.disconnect(); audio.panner?.connect(this.busInputs.get(busSettings.id) ?? this.master!) }
      audio.loopStart = loopStart; audio.loopEnd = loopEnd; audio.element.loop = component.loop
      this.enforceLoopBounds(audio)
      if(audio.completed&&component.playlistMode!=='Single'&&component.playlist.length&&!component.loop){audio.timeUpdate();continue}
      const audioRateSupported=this.setPlaybackRate(audio,clamp(component.pitch * (1 + component.randomPitch * audio.pitchVariation),1,.25,4)*this.transportScale)
      const spatial = clamp(component.spatialBlend, 0, 0, 1), sourcePosition = worldTransform(entity, entities).position
      const distance = Math.hypot(sourcePosition.x - listenerPosition.x, sourcePosition.y - listenerPosition.y)
      const min = Math.max(0, finiteNumber(component.minDistance, 1)), max = Math.max(min + 1e-6, finiteNumber(component.maxDistance, 50))
      const attenuation = this.attenuation(component, distance, min, max)
      const normalizeGain = asset.settings.audioSettings.normalize ? clamp(asset.settings.audioSettings.normalizationGain, 1, .01, 16) : 1
      const volume = clamp(component.volume * (1 + component.randomVolume * audio.volumeVariation), 1, 0, 1) * normalizeGain * ((1 - spatial) + spatial * attenuation) * this.fadeEnvelope(component, audio)
      if (audio.gain) audio.gain.gain.value = volume
      else audio.element.volume = clamp(volume * this.fallbackBusGain(component.bus), 1, 0, 1)
      if (audio.panner) audio.panner.pan.value = spatial * Math.min(1, Math.max(-1, (sourcePosition.x - listenerPosition.x) / max))
      for (const voice of this.polyphonic.get(component.uuid) ?? []) {
        voice.loopStart = loopStart; voice.loopEnd = loopEnd; voice.element.loop = component.loop
        this.enforceLoopBounds(voice)
        const voiceRateSupported=this.setPlaybackRate(voice,clamp(component.pitch * (1 + component.randomPitch * voice.pitchVariation),1,.25,4)*this.transportScale)
        const voiceVolume = clamp(component.volume * (1 + component.randomVolume * voice.volumeVariation), 1, 0, 1) * normalizeGain * ((1 - spatial) + spatial * attenuation) * this.fadeEnvelope(component, voice)
        if (voice.gain) voice.gain.gain.value = voiceVolume
        else voice.element.volume = clamp(voiceVolume * this.fallbackBusGain(component.bus), 1, 0, 1)
        if (voice.panner) voice.panner.pan.value = spatial * Math.min(1, Math.max(-1, (sourcePosition.x - listenerPosition.x) / max))
        if (playing && voiceRateSupported && voice.started && voice.element.paused && !voice.manuallyPaused && !voice.completed && !voice.element.ended) void voice.element.play().catch(() => undefined)
        if (!playing && !voice.element.paused) voice.element.pause()
      }
      if (playing && audioRateSupported && component.autoplay && !audio.started && !audio.manuallyPaused && !audio.completed) { audio.started = true; audio.element.currentTime = Math.min(loopEnd || Number.POSITIVE_INFINITY, loopStart + Math.max(0, finiteNumber(component.startOffsetSeconds, 0))); void audio.element.play().catch(error => { audio!.started = false; this.reportFailure('autoplay source', error, 'Interact with the game view or disable autoplay and trigger playback from input.') }) }
      if (playing && audioRateSupported && audio.started && audio.element.paused && !audio.manuallyPaused && !audio.completed && !audio.element.ended) void audio.element.play().catch(() => undefined)
      if (!playing && !audio.element.paused) audio.element.pause()
      this.syncVoiceClock(audio,playing&&audioRateSupported,clamp(component.pitch*(1+component.randomPitch*audio.pitchVariation),1,.25,4),'source:'+component.uuid)
      for(const [index,voice] of (this.polyphonic.get(component.uuid)??[]).entries())this.syncVoiceClock(voice,playing,clamp(component.pitch*(1+component.randomPitch*voice.pitchVariation),1,.25,4),`polyphonic:${component.uuid}:${index}`)
      if(playing&&audio.started&&!audio.completed&&!audio.manuallyPaused){voiceCount++;voicesByBus.set(busSettings.id,busVoices+1)}
    }
    for (const uuid of [...this.active.keys()]) if (!live.has(uuid)) this.release(uuid)
    for (const uuid of [...this.polyphonic.keys()]) if (!live.has(uuid)) this.releasePolyphonic(uuid)
    for(const [uuid,voices] of this.polyphonic)for(const voice of [...voices])if(voice.completed&&!voice.element.loop)this.releasePolyphonicVoice(uuid,voice)
    if (playing && this.context && this.active.size && this.lastUpdateAt > 0) {
      const wallDelta = (updateAt - this.lastUpdateAt) / 1000, contextDelta = this.context.currentTime - this.lastContextTime
      if (wallDelta < 1 && wallDelta > .08 && contextDelta < wallDelta * .35 && updateAt - this.lastUnderrunAt > 500) { this.diagnostics.underruns++; this.lastUnderrunAt = updateAt }
    }
    this.lastUpdateAt = updateAt; this.lastContextTime = this.context?.currentTime ?? 0
    const sounding=new Map<string,number>();for(const voice of this.allVoices())if(playing&&voice.started&&!voice.completed&&!voice.manuallyPaused&&!voice.element.paused){const visited=new Set<string>();for(let id:string|null=voice.bus;id&&!visited.has(id);id=this.settings.mixer.buses.find(bus=>bus.id===id)?.parent??null){visited.add(id);sounding.set(id,(sounding.get(id)??0)+1)}}
    this.updateDucking(sounding); this.updateDiagnostics(limited, virtual)
  }

  play(entity: Entity, entities: Entity[] = [entity]): void {
    const component = entity.getComponent<AudioSource>('AudioSource'); if (!component) return
    this.update(entities, this.settings, true)
    const active = this.active.get(component.uuid); if (!active) return
    if (active.started && !active.element.paused) {
      this.playPolyphonic(component, active)
      return
    }
    const audible=this.allVoices().filter(voice=>voice!==active&&voice.started&&!voice.completed&&!voice.manuallyPaused&&!voice.element.paused),bus=this.settings.mixer.buses.find(value=>value.id===active.bus)
    if(audible.length>=this.settings.mixer.masterVoiceLimit||audible.filter(voice=>voice.bus===active.bus).length>=(bus?.voiceLimit??32)){this.manualLimitedVoices++;return}
    const resume=active.started&&active.manuallyPaused&&!active.completed&&!active.element.ended
    active.started = true; active.manuallyPaused = false; active.completed=false
    if(!resume)active.element.currentTime = Math.min(active.loopEnd||Number.POSITIVE_INFINITY,active.loopStart + Math.max(0, finiteNumber(component.startOffsetSeconds, 0)))
    this.voicePositions.delete(active);void this.recover(); void active.element.play().catch(error => { active.started = false; this.reportFailure('play source', error, 'Verify the imported audio asset and browser autoplay permission, then retry.') })
  }

  pause(entity: Entity): void { const component = entity.getComponent<AudioSource>('AudioSource'); const active = component ? this.active.get(component.uuid) : null; if (active) { active.manuallyPaused = true; active.element.pause() }; if (component) for (const voice of this.polyphonic.get(component.uuid) ?? []) { voice.manuallyPaused = true; voice.element.pause() } }
  stop(entity: Entity): void { const component = entity.getComponent<AudioSource>('AudioSource'); const active = component ? this.active.get(component.uuid) : null; if (active) { active.element.pause(); active.element.currentTime = active.loopStart; active.started = false; active.manuallyPaused = true; active.completed=false;this.voicePositions.delete(active) }; if (component) this.releasePolyphonic(component.uuid) }
  scrub(entity: Entity, seconds: number): boolean {
    const component = entity.getComponent<AudioSource>('AudioSource'), active = component ? this.active.get(component.uuid) : null
    if (!active || !Number.isFinite(seconds)) return false
    const maximum = active.loopEnd > active.loopStart ? active.loopEnd : Number.isFinite(active.element.duration) ? active.element.duration : Math.max(active.loopStart, seconds)
    active.element.pause(); active.element.currentTime = Math.min(maximum, Math.max(active.loopStart, seconds)); active.manuallyPaused = true;active.completed=false;this.voicePositions.delete(active); return true
  }
  playbackTime(entity: Entity): number | null { const component = entity.getComponent<AudioSource>('AudioSource'), active = component ? this.active.get(component.uuid) : null; return active ? active.element.currentTime : null }
  stopAll(): void { for(const key of [...this.timelineVoices.keys()])this.releaseTimelineVoice(key);this.diagnostics.voiceClocks={};for (const uuid of [...this.active.keys()]) this.release(uuid); for (const uuid of [...this.polyphonic.keys()]) this.releasePolyphonic(uuid); for(const key of [...this.uiVoices.keys()])this.releaseUiVoice(key);this.voicePositions.clear() }

  /** Independent keyed voices share the mixer, spatialization and authoritative timeline sample clock. */
  reconcileTimelineVoices(requests:readonly TimelineAudioVoiceRequest[],entities:Entity[]):Array<{key:string;message:string}>{
    const live=new Set<string>(),diagnostics:Array<{key:string;message:string}>=[],listener=entities.find(entity=>{const value=entity.getComponent<AudioListener>('AudioListener');return entity.enabled&&value?.enabled&&value.active}),listenerPosition=listener?worldTransform(listener,entities).position:{x:0,y:0}
    this.ensureContext();this.configureMixerGraph()
    const sampleRate=this.context?.sampleRate??this.settings.sampleRate
    for(const request of requests){
      if(live.has(request.key)){diagnostics.push({key:request.key,message:'Duplicate timeline voice identity.'});continue}live.add(request.key)
      const asset=resolveAsset(request.reference)
      if(!asset||asset.assetType!=='audio'||!asset.source||!Number.isFinite(request.time)||!Number.isFinite(request.playbackRate)){diagnostics.push({key:request.key,message:'Timeline audio asset/time/rate is invalid.'});this.releaseTimelineVoice(request.key);continue}
      let entry=this.timelineVoices.get(request.key)
      const authored=request.entity.getComponent<AudioSource>('AudioSource'),component=authored??entry?.component??new AudioSource()
      const bus=this.settings.mixer.buses.find(bus=>bus.id===component.bus)??this.settings.mixer.buses.find(bus=>bus.id==='SFX')!,streaming=component.streamOverride==='Stream'||component.streamOverride==='ImportSetting'&&asset.settings.audioSettings.streaming
      if(entry&&(entry.voice.reference!==request.reference||entry.voice.streaming!==streaming)){this.releaseTimelineVoice(request.key);entry=undefined}
      if(!entry){
        const all=[...this.active.values(),...[...this.polyphonic.values()].flat(),...[...this.timelineVoices.values()].map(value=>value.voice)],audible=all.filter(voice=>voice.started&&!voice.completed&&!voice.manuallyPaused)
        if(audible.length+this.uiVoices.size>=this.settings.mixer.masterVoiceLimit||audible.filter(voice=>voice.bus===bus.id).length>=bus.voiceLimit){diagnostics.push({key:request.key,message:'Timeline audio voice limit reached.'});continue}
        const element=this.createPlayback(asset.source,streaming);element.preload=streaming?'metadata':'auto';let voice:ActiveAudio
        const timeUpdate=()=>this.enforceLoopBounds(voice)
        voice={reference:request.reference,bus:bus.id,element,source:null,gain:null,panner:null,started:false,manuallyPaused:false,completed:false,streaming,loopStart:0,loopEnd:asset.duration,timeUpdate,pitchVariation:seededVariation(request.key+':pitch'),volumeVariation:seededVariation(request.key+':volume')}
        element.addEventListener('timeupdate',timeUpdate);this.connect(component,voice);entry={voice,component,request:{...request}};this.timelineVoices.set(request.key,entry)
      }
      const {voice}=entry
      if(voice.bus!==bus.id){voice.bus=bus.id;voice.panner?.disconnect();voice.panner?.connect(this.busInputs.get(bus.id)??this.master!)}
      const trimStart=clamp(asset.settings.audioSettings.trimStart,0,0,asset.duration),trimEnd=clamp(asset.settings.audioSettings.trimEnd,0,0,asset.duration),end=trimEnd>trimStart?trimEnd:asset.duration
      const position=Math.max(trimStart,Math.min(end,trimStart+request.time)),sample=mediaSample(position,sampleRate),seconds=sample/sampleRate
      const rate=request.playbackRate*this.transportScale
      const supported=this.setPlaybackRate(voice,rate),playing=request.playing&&(!this.transportSupplied||this.diagnostics.clock.playing)&&supported&&rate!==0&&(rate<0?position>trimStart:position<end)
      if(!supported)diagnostics.push({key:request.key,message:'The streaming transport cannot reproduce this rate; audio remains paused at the requested sample.'})
      voice.loopStart=trimStart;voice.loopEnd=end;voice.element.loop=false
      if(!playing||!voice.started||Math.abs(voice.element.currentTime-seconds)>.025)voice.element.currentTime=seconds

      const sourcePosition=worldTransform(request.entity,entities).position,distance=Math.hypot(sourcePosition.x-listenerPosition.x,sourcePosition.y-listenerPosition.y),minimum=Math.max(0,component.minDistance),maximum=Math.max(minimum+1e-6,component.maxDistance),spatial=clamp(component.spatialBlend,0,0,1),attenuation=this.attenuation(component,distance,minimum,maximum)
      const volume=clamp(request.gain,1,0,1)*clamp(component.volume*(1+component.randomVolume*voice.volumeVariation),1,0,1)*(asset.settings.audioSettings.normalize?clamp(asset.settings.audioSettings.normalizationGain,1,.01,16):1)*((1-spatial)+spatial*attenuation)
      if(voice.gain)voice.gain.gain.value=volume;else voice.element.volume=clamp(volume*this.fallbackBusGain(bus.id),1,0,1)
      if(voice.panner)voice.panner.pan.value=spatial*Math.max(-1,Math.min(1,(sourcePosition.x-listenerPosition.x)/maximum))
      voice.manuallyPaused=!playing;voice.completed=rate<0?position<=trimStart:position>=end
      if(playing&&(!voice.started||voice.element.paused)){voice.started=true;void voice.element.play().catch(error=>{voice.started=false;this.reportFailure('timeline audio',error,'Interact with the game view, then resume the timeline.')})}
      if(!playing)voice.element.pause()
      entry.request={...request};this.diagnostics.voiceClocks['timeline:'+request.key]={sample,seconds,playbackRate:rate,playing,streaming}
    }
    for(const key of [...this.timelineVoices.keys()])if(!live.has(key))this.releaseTimelineVoice(key)
    return diagnostics
  }
  private releaseTimelineVoice(key:string):void{
    const entry=this.timelineVoices.get(key);if(!entry)return
    const voice=entry.voice;voice.element.pause();voice.element.removeEventListener('timeupdate',voice.timeUpdate);voice.element.removeAttribute('src');voice.element.load();voice.source?.disconnect();voice.gain?.disconnect();voice.panner?.disconnect();this.timelineVoices.delete(key);this.voicePositions.delete(voice);delete this.diagnostics.voiceClocks['timeline:'+key]
  }

  playUiClip(reference: string | null | undefined, bus = 'UI'): boolean {
    const asset=resolveAsset(reference);if(!asset||asset.assetType!=='audio'||!asset.source||typeof Audio==='undefined')return false
    this.ensureContext();this.configureMixerGraph()
    const selected=this.settings.mixer.buses.find(item=>item.id===bus)??this.settings.mixer.buses.find(item=>item.id==='UI')!,all=this.allVoices().filter(voice=>voice.started&&!voice.completed&&!voice.manuallyPaused)
    if(all.length>=this.settings.mixer.masterVoiceLimit||all.filter(voice=>voice.bus===selected.id).length>=selected.voiceLimit){this.manualLimitedVoices++;return false}
    const element=this.createPlayback(asset.source,asset.settings.audioSettings.streaming),component=new AudioSource();component.bus=selected.id
    const key=`ui:${this.voiceSerial++}`,voice:ActiveAudio={reference:reference!,bus:selected.id,element,source:null,gain:null,panner:null,started:true,manuallyPaused:false,completed:false,streaming:asset.settings.audioSettings.streaming,loopStart:asset.settings.audioSettings.trimStart,loopEnd:asset.settings.audioSettings.trimEnd||asset.duration,timeUpdate:()=>this.enforceLoopBounds(voice),pitchVariation:0,volumeVariation:0}
    element.addEventListener('timeupdate',voice.timeUpdate);this.connect(component,voice);this.uiVoices.set(key,voice)
    element.currentTime=voice.loopStart;if(!this.setPlaybackRate(voice,this.transportScale)){this.releaseUiVoice(key);return false}
    const volume=asset.settings.audioSettings.normalize?asset.settings.audioSettings.normalizationGain:1
    if(voice.gain)voice.gain.gain.value=volume;else element.volume=clamp(volume*this.fallbackBusGain(selected.id),1,0,1)
    const release=()=>this.releaseUiVoice(key);element.addEventListener('ended',release,{once:true});element.addEventListener('error',release,{once:true});void element.play().catch(release);return true
  }
  private releaseUiVoice(key:string):void{const voice=this.uiVoices.get(key);if(!voice)return;voice.element.pause();voice.element.removeEventListener('timeupdate',voice.timeUpdate);voice.element.removeAttribute('src');voice.element.load();voice.source?.disconnect();voice.gain?.disconnect();voice.panner?.disconnect();this.voicePositions.delete(voice);this.uiVoices.delete(key)}
  private createPlayback(source:string,streaming:boolean):AudioPlaybackElement{return !streaming&&this.context&&this.bufferCache?new BufferedAudioPlayback(this.context,source,this.bufferCache):new Audio(source)}
  private allVoices():ActiveAudio[]{return [...this.active.values(),...[...this.polyphonic.values()].flat(),...[...this.timelineVoices.values()].map(entry=>entry.voice),...this.uiVoices.values()]}
  private setPlaybackRate(voice:ActiveAudio,rate:number):boolean{
    if(rate===0){voice.element.pause();return true}
    if(!(voice.element instanceof BufferedAudioPlayback)&&(rate<.0625||rate>16)){voice.element.pause();this.reportFailure('streaming playback rate',new Error(`Rate ${rate} is outside the streaming transport range 0.0625-16.`),'Use buffered import for signed or high-rate playback.');return false}
    try{voice.element.playbackRate=rate;return true}catch(error){voice.element.pause();this.reportFailure('playback rate',error,'Use buffered import for this playback rate.');return false}
  }
  private syncVoiceClock(voice:ActiveAudio,playing:boolean,rate:number,key:string):void{
    let position=this.voicePositions.get(voice),seconds=voice.element.currentTime
    if(this.transportSupplied&&voice.started&&!voice.completed){
      if(position){seconds=position.seconds+(playing&&!voice.manuallyPaused?this.transport.seconds-position.transport:0)*rate;const span=voice.loopEnd-voice.loopStart;if(voice.element.loop&&span>0)seconds=voice.loopStart+((seconds-voice.loopStart)%span+span)%span;seconds=Math.max(voice.loopStart,Math.min(voice.loopEnd||Number.POSITIVE_INFINITY,seconds));if(Math.abs(voice.element.currentTime-seconds)>.025||!playing)voice.element.currentTime=seconds}
      position={seconds,transport:this.transport.seconds};this.voicePositions.set(voice,position);this.enforceLoopBounds(voice)
    }
    const sampleRate=this.context?.sampleRate??this.settings.sampleRate,sample=mediaSample(seconds,sampleRate)
    this.diagnostics.voiceClocks[key]={sample,seconds:sample/sampleRate,playbackRate:rate*this.transportScale,playing:playing&&voice.started&&!voice.manuallyPaused&&!voice.completed,streaming:voice.streaming}
  }
  async dispose():Promise<void>{this.stopAll();this.bufferCache?.clear();this.bufferCache=null;this.destroyMixerGraph();this.master?.disconnect();this.limiter?.disconnect();const context=this.context;this.context=null;this.master=null;this.limiter=null;this.limiterEnabledApplied=null;this.transport.seek(0);this.transportSupplied=false;this.transportScale=1;this.lastUpdateAt=0;this.integratedLoudnessEnergy=0;this.integratedLoudnessSamples=0;if(this.deviceListenerInstalled&&typeof navigator!=='undefined')navigator.mediaDevices?.removeEventListener('devicechange',this.onDeviceChange);this.deviceListenerInstalled=false;this.diagnostics.clock={ticks:0,seconds:0,sample:0,sampleRate:this.settings.sampleRate,playing:false,scale:1};this.diagnostics.activeVoices=0;this.diagnostics.streamingVoices=0;this.diagnostics.bufferedVoices=0;this.diagnostics.busMeters={};this.diagnostics.busMeterDetails={};this.diagnostics.contextState='unavailable';if(context&&context.state!=='closed')await context.close().catch(()=>undefined)}

  private ensureContext(): void {
    if (this.context || typeof AudioContext === 'undefined') return
    try { this.context = new AudioContext({ sampleRate: this.settings.sampleRate }); this.bufferCache=new AudioBufferCache(this.context);this.master = this.context.createGain(); this.limiter = this.context.createDynamicsCompressor(); this.limiter.knee.value = 0; this.limiter.ratio.value = 20; this.limiter.attack.value = .001; this.limiter.release.value = .05; this.configureMasterOutput(); this.mixerSignature = ''; this.configureMixerGraph(); this.installDeviceListener(); void this.refreshOutputDevices(); void this.selectOutputDevice(this.settings.mixer.outputDeviceId) }
    catch (error) { this.reportFailure('create audio context', error, 'Check the output device and browser audio permissions, then press Recover audio.'); this.context = null; this.master = null; this.limiter = null; this.destroyMixerGraph() }
  }

  private configureMixerGraph(): void {
    if (!this.context || !this.master) return
    const signature = JSON.stringify(this.settings.mixer.buses.map(bus => ({ id: bus.id, parent: bus.parent, sends: bus.sends, effects: bus.effects })))
    if (signature === this.mixerSignature) return
    for (const active of [...this.active.values(), ...[...this.polyphonic.values()].flat(), ...[...this.timelineVoices.values()].map(entry=>entry.voice),...this.uiVoices.values()]) active.panner?.disconnect()
    this.destroyMixerGraph(); this.mixerSignature = signature
    for (const bus of this.settings.mixer.buses) {
      const input = this.context.createGain(), output = this.context.createGain(), meter = this.context.createAnalyser(); meter.fftSize = 256
      this.busInputs.set(bus.id, input); this.busOutputs.set(bus.id, output); this.busMeters.set(bus.id, meter); this.mixerNodes.push(input, output, meter)
      let cursor: AudioNode = input
      for (const effect of bus.effects) if (effect.enabled) {
        const chain = this.createEffect(effect)
        if (chain) { cursor.connect(chain.input); cursor = chain.output; this.mixerNodes.push(...chain.nodes) }
      }
      cursor.connect(output); output.connect(meter)
    }
    for (const bus of this.settings.mixer.buses) {
      const output = this.busOutputs.get(bus.id); if (!output) continue
      if (bus.id === 'Master') output.connect(this.master)
      else output.connect(this.busInputs.get(bus.parent ?? 'Master') ?? this.master)
      for (const send of bus.sends) if (send.enabled) {
        const target = this.busInputs.get(send.target); if (!target) continue
        const gain = this.context.createGain(); gain.gain.value = send.gain; output.connect(gain).connect(target); this.sendNodes.push(gain)
      }
    }
    for (const active of [...this.active.values(), ...[...this.polyphonic.values()].flat(), ...[...this.timelineVoices.values()].map(entry=>entry.voice),...this.uiVoices.values()]) active.panner?.connect(this.busInputs.get(active.bus) ?? this.master)
  }

  private createEffect(effect: AudioMixerEffect): { input: GainNode; output: GainNode; nodes: AudioNode[] } | null {
    if (!this.context) return null
    const input = this.context.createGain(), output = this.context.createGain(), dry = this.context.createGain(), wet = this.context.createGain()
    dry.gain.value = 1 - effect.wet; wet.gain.value = effect.wet; input.connect(dry).connect(output)
    let processor: AudioNode
    const nodes: AudioNode[] = [input, output, dry, wet]
    if (effect.kind === 'LowPass' || effect.kind === 'HighPass') {
      const node = this.context.createBiquadFilter(); node.type = effect.kind === 'LowPass' ? 'lowpass' : 'highpass'; node.frequency.value = effect.frequency; node.Q.value = effect.q; processor = node
    } else if (effect.kind === 'Compressor') {
      const node = this.context.createDynamicsCompressor(); node.threshold.value = effect.threshold; node.ratio.value = effect.ratio; processor = node
    } else if (effect.kind === 'Delay') {
      const delay = this.context.createDelay(5), feedback = this.context.createGain(); delay.delayTime.value = effect.time; feedback.gain.value = effect.feedback; delay.connect(feedback).connect(delay); processor = delay; nodes.push(feedback)
    } else {
      const convolver = this.context.createConvolver(), length = Math.min(this.context.sampleRate * 3, Math.max(1, Math.round(this.context.sampleRate * Math.max(.05, effect.time))))
      const impulse = this.context.createBuffer(2, length, this.context.sampleRate)
      for (let channel = 0; channel < impulse.numberOfChannels; channel++) { const data = impulse.getChannelData(channel); for (let index = 0; index < length; index++) data[index] = seededVariation(`${effect.id}:${channel}:${index}`) * Math.pow(1 - index / length, 2) }
      convolver.buffer = impulse; processor = convolver
    }
    input.connect(processor); processor.connect(wet).connect(output); nodes.push(processor)
    return { input, output, nodes }
  }

  private refreshContextForSampleRate(): void { if (!this.context || this.context.sampleRate === this.settings.sampleRate) return; this.stopAll(); void this.context.close().catch(() => undefined);this.bufferCache?.clear();this.bufferCache=null;this.limiterEnabledApplied=null; this.context = null; this.master = null; this.destroyMixerGraph() }

  private connect(component: AudioSource, active: ActiveAudio): void {
    if (!this.context) return
    try { active.source = active.element instanceof BufferedAudioPlayback?active.element.output:this.context.createMediaElementSource(active.element as HTMLAudioElement); active.gain = this.context.createGain(); active.panner = this.context.createStereoPanner(); active.source.connect(active.gain).connect(active.panner).connect(this.busInputs.get(component.bus) ?? this.busInputs.get('SFX') ?? this.master!) }
    catch { active.source = null; active.gain = null; active.panner = null }
  }

  private audibleBus(id:string):boolean{
    const buses=this.settings.mixer.buses,solo=buses.filter(bus=>bus.solo)
    if(!solo.length)return true
    const ancestors=(start:string)=>{const path=new Set<string>();for(let next:string|null=start;next&&!path.has(next);next=buses.find(bus=>bus.id===next)?.parent??null)path.add(next);return path}
    return solo.some(bus=>ancestors(bus.id).has(id)||ancestors(id).has(bus.id))
  }
  private fallbackBusGain(id:string):number{
    const snapshot=this.settings.mixer.snapshots.find(value=>value.id===this.settings.mixer.activeSnapshot),visited=new Set<string>();let gain=this.settings.masterVolume*(snapshot?.masterVolume??1),next:string|null=id
    while(next&&!visited.has(next)){visited.add(next);const bus=this.settings.mixer.buses.find(value=>value.id===next);if(!bus)break;if(bus.mute||!this.audibleBus(bus.id))return 0;gain*=(snapshot?.busGains[bus.id]??bus.gain)*this.automationGain(bus);next=bus.parent}return gain
  }
  private applyMix(): void {
    if (!this.master || !this.context) return
    this.configureMasterOutput()
    const snapshot = this.settings.mixer.snapshots.find(candidate => candidate.id === this.settings.mixer.activeSnapshot)
    const transition = Math.max(.001, this.settings.mixer.snapshotTransitionSeconds / 3)
    this.master.gain.setTargetAtTime(this.settings.masterVolume * (snapshot?.masterVolume ?? 1), this.context.currentTime, transition)
    for (const bus of this.settings.mixer.buses) {
      const output = this.busOutputs.get(bus.id); if (!output) continue
      const requested = (snapshot?.busGains[bus.id] ?? bus.gain) * this.automationGain(bus)
      const audible = !bus.mute && this.audibleBus(bus.id)
      output.gain.setTargetAtTime(audible ? requested : 0, this.context.currentTime, transition)
    }
  }

  private updateDucking(voicesByBus:Map<string,number>):void{
    if(!this.context)return
    const targets=new Map<string,{reduction:number;seconds:number}>()
    for(const rule of this.settings.mixer.ducking){if(!rule.enabled)continue;const active=(voicesByBus.get(rule.triggerBus)??0)>0,previous=targets.get(rule.targetBus)??{reduction:1,seconds:0};previous.reduction*=active?Math.pow(10,rule.reductionDb/20):1;previous.seconds=Math.max(previous.seconds,active?rule.attack:rule.release);targets.set(rule.targetBus,previous)}
    const snapshot=this.settings.mixer.snapshots.find(value=>value.id===this.settings.mixer.activeSnapshot)
    for(const [id,target] of targets){const output=this.busOutputs.get(id),bus=this.settings.mixer.buses.find(value=>value.id===id);if(!output||!bus)continue;const gain=!bus.mute&&this.audibleBus(id)?(snapshot?.busGains[id]??bus.gain)*this.automationGain(bus)*target.reduction:0;output.gain.setTargetAtTime(gain,this.context.currentTime,Math.max(.001,target.seconds/3))}
  }

  private attenuation(component: AudioSource, distance: number, minimum: number, maximum: number): number {
    if (distance <= minimum) return 1; if (distance >= maximum) return 0
    const ratio = (distance - minimum) / (maximum - minimum)
    if (component.attenuationCurve === 'Inverse') return 1 / (1 + 4 * ratio)
    if (component.attenuationCurve === 'Exponential') return Math.pow(1 - ratio, 2)
    if (component.attenuationCurve === 'Custom') {
      const points = component.customAttenuation.slice().sort((a, b) => a.distance - b.distance)
      const normalized = distance / maximum
      for (let index = 1; index < points.length; index++) if (normalized <= points[index].distance) {
        const first = points[index - 1], second = points[index], amount = (normalized - first.distance) / Math.max(1e-9, second.distance - first.distance)
        return clamp(first.gain + (second.gain - first.gain) * amount, 0, 0, 1)
      }
    }
    return 1 - ratio
  }

  private updateDiagnostics(limited: number, virtual: number): void {
    const voices = [...this.active.values(), ...[...this.polyphonic.values()].flat(), ...[...this.timelineVoices.values()].map(entry=>entry.voice),...this.uiVoices.values()]
    this.diagnostics.activeVoices = voices.filter(voice=>voice.started&&!voice.completed&&!voice.manuallyPaused&&!voice.element.paused).length; this.diagnostics.streamingVoices = voices.filter(audio => audio.streaming&&audio.started&&!audio.completed&&!audio.manuallyPaused&&!audio.element.paused).length
    this.diagnostics.bufferedVoices = voices.filter(voice=>!voice.streaming&&voice.started&&!voice.completed&&!voice.manuallyPaused&&!voice.element.paused).length; this.diagnostics.contextState = this.context?.state ?? 'unavailable'; this.diagnostics.limitedVoices = limited + this.manualLimitedVoices; this.diagnostics.virtualVoices = virtual
    this.manualLimitedVoices = 0
    this.diagnostics.baseLatencyMs = this.context && Number.isFinite(this.context.baseLatency) ? this.context.baseLatency * 1000 : null
    const outputLatency = this.context && 'outputLatency' in this.context ? Number((this.context as AudioContext & { outputLatency: number }).outputLatency) : Number.NaN
    this.diagnostics.outputLatencyMs = Number.isFinite(outputLatency) ? outputLatency * 1000 : null
    const samples = new Float32Array(128), meters: Record<string, number> = {}, details: AudioRuntimeDiagnostics['busMeterDetails'] = {}; let masterLoudness = -120
    for (const [id, analyser] of this.busMeters) { analyser.getFloatTimeDomainData(samples); let energy = 0, peak = 0; for (const sample of samples) { energy += sample * sample; peak = Math.max(peak, Math.abs(sample)) } const rms = Math.min(1, Math.sqrt(energy / samples.length)), rmsDb = 20 * Math.log10(Math.max(1e-6, rms)), peakDb = 20 * Math.log10(Math.max(1e-6, peak)), clipped = peak >= .999; meters[id] = rms; details[id] = { rms, peak, rmsDb, peakDb, clipped }; if (clipped) this.diagnostics.clippingEvents++; if (id === 'Master') masterLoudness = rmsDb }
    const master = details.Master, masterEnergy = master ? master.rms * master.rms : 0
    if (master && master.rmsDb > -70) {
      if (this.integratedLoudnessSamples >= 10_000_000) { this.integratedLoudnessEnergy *= .9999999; this.integratedLoudnessSamples = 9_999_999 }
      this.integratedLoudnessEnergy += masterEnergy; this.integratedLoudnessSamples++
    }
    const integratedRms = this.integratedLoudnessSamples ? Math.sqrt(this.integratedLoudnessEnergy / this.integratedLoudnessSamples) : 0
    this.diagnostics.busMeters = meters; this.diagnostics.busMeterDetails = details; this.diagnostics.loudnessDb = masterLoudness
    this.diagnostics.momentaryLufs = master ? Math.max(-120, -0.691 + master.rmsDb) : -120
    this.diagnostics.integratedLufs = integratedRms > 0 ? Math.max(-120, -0.691 + 20 * Math.log10(integratedRms)) : -120
    this.diagnostics.truePeakDb = master?.peakDb ?? -120
    this.diagnostics.crestFactorDb = master ? Math.max(0, master.peakDb - master.rmsDb) : 0
  }

  private onDeviceChange=()=>{this.diagnostics.deviceChanges++;this.diagnostics.lastDeviceChange=new Date().toISOString();void this.refreshOutputDevices();void this.recover();this.applyMix()}
  private installDeviceListener(): void {
    if (this.deviceListenerInstalled || typeof navigator === 'undefined' || !navigator.mediaDevices) return
    navigator.mediaDevices.addEventListener('devicechange', this.onDeviceChange)
    this.deviceListenerInstalled = true
  }

  private destroyMixerGraph(): void {
    for (const node of [...this.sendNodes, ...this.mixerNodes]) try { node.disconnect() } catch { /* already disconnected */ }
    this.busInputs.clear(); this.busOutputs.clear(); this.busMeters.clear(); this.mixerNodes = []; this.sendNodes = []; this.mixerSignature = ''
  }

  private release(uuid: string): void {
    const active = this.active.get(uuid); if (!active) return
    active.element.pause(); active.element.removeEventListener('timeupdate', active.timeUpdate); active.element.removeAttribute('src'); active.element.load()
    active.source?.disconnect(); active.gain?.disconnect(); active.panner?.disconnect(); this.active.delete(uuid);this.voicePositions.delete(active);delete this.diagnostics.voiceClocks['source:'+uuid]
  }


  /** Keeps imported trim/loop points authoritative even between the browser's coarse timeupdate events. */
  private enforceLoopBounds(active: ActiveAudio): void {
    if(active.element instanceof BufferedAudioPlayback)active.element.setBounds(active.loopStart,active.loopEnd)
    if(!active.element.loop&&active.started&&(active.element.ended||active.loopEnd>active.loopStart&&active.element.currentTime>=active.loopEnd)){active.completed=true;active.element.pause();if(active.loopEnd>active.loopStart)active.element.currentTime=active.loopEnd;return}
    if (!active.element.loop || active.loopEnd <= active.loopStart || active.element.currentTime < active.loopEnd) return
    const span = active.loopEnd - active.loopStart
    const overrun = Math.max(0, active.element.currentTime - active.loopEnd)
    active.element.currentTime = active.loopStart + overrun % span
  }

  private fadeEnvelope(component: AudioSource, active: ActiveAudio): number {
    const current = Math.max(0, active.element.currentTime - active.loopStart), remaining = active.loopEnd > active.loopStart ? active.loopEnd - active.element.currentTime : Number.POSITIVE_INFINITY
    const fadeIn = component.fadeInSeconds > 0 ? Math.min(1, current / component.fadeInSeconds) : 1
    const fadeOut = component.fadeOutSeconds > 0 ? Math.min(1, Math.max(0, remaining) / component.fadeOutSeconds) : 1
    return Math.min(fadeIn, fadeOut)
  }

  private sourceReference(component: AudioSource): string | null {
    if (component.playlistMode === 'Single' || !component.playlist.length) return component.audioClip
    const playlist = component.playlist.filter(reference => typeof reference === 'string' && reference).slice(0, 256)
    if (!playlist.length) return component.audioClip
    component.playlistIndex = Math.max(0, Math.min(playlist.length - 1, Math.round(finiteNumber(component.playlistIndex, 0))))
    return playlist[component.playlistIndex]
  }

  private automationGain(bus: AudioMixerBusSettings): number {
    if (!bus.automation.length) return 1
    const duration=bus.automationLoopSeconds,time=duration>0?((this.transport.seconds%duration)+duration)%duration:Math.max(0,this.transport.seconds)
    if (time <= bus.automation[0].time) return bus.automation[0].gain
    for (let index = 1; index < bus.automation.length; index++) if (time <= bus.automation[index].time) { const first = bus.automation[index - 1], second = bus.automation[index], amount = (time - first.time) / Math.max(1e-6, second.time - first.time); return first.gain + (second.gain - first.gain) * amount }
    return bus.automation[bus.automation.length - 1].gain
  }

  private configureMasterOutput(): void {
    if (!this.master || !this.context || !this.limiter) return
    this.limiter.threshold.value = this.settings.mixer.limiterCeilingDb
    if (this.limiterEnabledApplied === this.settings.mixer.limiterEnabled) return
    try { this.master.disconnect(); this.limiter.disconnect() } catch { /* graph was not connected */ }
    if (this.settings.mixer.limiterEnabled) this.master.connect(this.limiter).connect(this.context.destination)
    else this.master.connect(this.context.destination)
    this.limiterEnabledApplied = this.settings.mixer.limiterEnabled
  }

  private reportFailure(operation: string, error: unknown, recovery: string): void { const message = error instanceof Error ? error.message : String(error); if(this.diagnostics.failures[0]?.operation===operation&&this.diagnostics.failures[0]?.message===message)return;this.diagnostics.failures.unshift({ at: new Date().toISOString(), operation, message, recovery }); this.diagnostics.failures.splice(32) }

  private playPolyphonic(component: AudioSource, template: ActiveAudio): void {
    const maximum = Math.round(clamp(component.polyphony, 1, 1, 64)), voices = this.polyphonic.get(component.uuid) ?? []
    if (1 + voices.length >= maximum && voices.length) { this.releasePolyphonicVoice(component.uuid, voices[0]); this.diagnostics.stolenVoices++ }
    else if (1 + voices.length >= maximum) { this.manualLimitedVoices++; return }
    const bus = this.settings.mixer.buses.find(item => item.id === template.bus) ?? this.settings.mixer.buses.find(item => item.id === 'SFX')!
    const audible=this.allVoices().filter(voice=>voice.started&&!voice.completed&&!voice.manuallyPaused&&!voice.element.paused),busCount=audible.filter(voice=>voice.bus===bus.id).length
    if (audible.length >= this.settings.mixer.masterVoiceLimit || busCount >= bus.voiceLimit) { this.manualLimitedVoices++; return }
    const asset = resolveAsset(template.reference)
    if (!asset || asset.assetType !== 'audio' || !asset.source || typeof Audio === 'undefined') return
    const element = this.createPlayback(asset.source,template.streaming); element.preload = template.streaming ? 'metadata' : 'auto'; element.loop = component.loop
    let created: ActiveAudio
    const timeUpdate = () => this.enforceLoopBounds(created)
    element.addEventListener('timeupdate', timeUpdate)
    const serial = this.voiceSerial++
    created = { reference: template.reference, bus: template.bus, element, source: null, gain: null, panner: null, started: true, manuallyPaused: false, completed: false, streaming: template.streaming, loopStart: template.loopStart, loopEnd: template.loopEnd, timeUpdate, pitchVariation: seededVariation(`${component.uuid}:pitch:${serial}`), volumeVariation: seededVariation(`${component.uuid}:volume:${serial}`) }
    this.connect(component, created)
    this.setPlaybackRate(created,clamp(component.pitch * (1 + component.randomPitch * created.pitchVariation),1,.25,4)*this.transportScale)
    const normalizedVolume = clamp(component.volume * (1 + component.randomVolume * created.volumeVariation), 1, 0, 1)
    if (created.gain) created.gain.gain.value = normalizedVolume
    else element.volume = normalizedVolume
    if (created.panner && template.panner) created.panner.pan.value = template.panner.pan.value
    if (created.loopStart > 0) element.currentTime = created.loopStart
    voices.push(created); this.polyphonic.set(component.uuid, voices)
    const release = () => this.releasePolyphonicVoice(component.uuid, created)
    element.addEventListener('ended', release, { once: true }); element.addEventListener('error', release, { once: true })
    void this.context?.resume().catch(() => undefined); void element.play().catch(release)
  }

  private releasePolyphonicVoice(uuid: string, voice: ActiveAudio): void {
    const voices = this.polyphonic.get(uuid); if (!voices?.includes(voice)) return
    voice.element.pause(); voice.element.removeEventListener('timeupdate', voice.timeUpdate); voice.element.removeAttribute('src'); voice.element.load()
    voice.source?.disconnect(); voice.gain?.disconnect(); voice.panner?.disconnect()
    this.voicePositions.delete(voice)
    const remaining = voices.filter(candidate => candidate !== voice)
    if (remaining.length) this.polyphonic.set(uuid, remaining); else this.polyphonic.delete(uuid)
  }

  private releasePolyphonic(uuid: string): void { for (const voice of [...(this.polyphonic.get(uuid) ?? [])]) this.releasePolyphonicVoice(uuid, voice) }
}

export const audioRuntime = new AudioRuntime()

function seededVariation(seed: string): number {
  let hash = 2_166_136_261
  for (const character of seed) hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619) >>> 0
  return hash / 0xffff_ffff * 2 - 1
}
