import { resolveAsset } from '../assets/AssetDatabase'
import type { Entity } from '../world/Entity'
import type { AudioListener, AudioSource } from '../world/components'
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
  ducking: AudioDuckingRule[]
  masterVoiceLimit: number
}

export interface AudioProjectSettings {
  masterVolume: number
  sampleRate: 44100 | 48000 | 96000
  /** Compatibility gains retained for Schema 5–19 projects and the compact Settings view. */
  buses: Record<'Master' | 'Music' | 'SFX' | 'UI', number>
  mixer: AudioMixerSettings
}

export interface AudioRuntimeDiagnostics {
  activeVoices: number
  streamingVoices: number
  bufferedVoices: number
  contextState: AudioContextState | 'unavailable'
  busMeters: Record<string, number>
  limitedVoices: number
}

const DEFAULT_BUS_IDS = ['Master', 'Music', 'SFX', 'UI'] as const
const MAX_BUSES = 32
const MAX_EFFECTS_PER_BUS = 8
const MAX_SENDS_PER_BUS = 16
const MAX_SNAPSHOTS = 32
const MAX_DUCKING_RULES = 32

function defaultBus(id: string, parent: string | null): AudioMixerBusSettings {
  return { id, name: id, gain: 1, mute: false, solo: false, parent, voiceLimit: id === 'Music' ? 4 : 32, sends: [], effects: [] }
}

export function defaultAudioSettings(): AudioProjectSettings {
  return {
    masterVolume: 1,
    sampleRate: 48000,
    buses: { Master: 1, Music: 1, SFX: 1, UI: 1 },
    mixer: {
      buses: [defaultBus('Master', null), defaultBus('Music', 'Master'), defaultBus('SFX', 'Master'), defaultBus('UI', 'Master')],
      snapshots: [{ id: 'default', name: 'Default', masterVolume: 1, busGains: { Master: 1, Music: 1, SFX: 1, UI: 1 } }],
      activeSnapshot: null, ducking: [], masterVoiceLimit: 128
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
    })
  }
  if (!ids.has('Master')) { ids.add('Master'); buses.unshift(defaultBus('Master', null)) }
  for (const id of DEFAULT_BUS_IDS) if (!ids.has(id)) { ids.add(id); buses.push(defaultBus(id, 'Master')) }
  const edges = new Map<string, string[]>()
  for (const bus of buses) {
    if (bus.id === 'Master') bus.parent = null
    else if (!bus.parent || !ids.has(bus.parent) || bus.parent === bus.id || wouldCycle(edges, bus.id, bus.parent)) bus.parent = 'Master'
    edges.set(bus.id, bus.parent ? [bus.parent] : [])
    bus.sends = bus.sends.filter(send => ids.has(send.target) && send.target !== bus.id && !wouldCycle(edges, bus.id, send.target))
    edges.get(bus.id)!.push(...bus.sends.filter(send => send.enabled).map(send => send.target))
  }
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
    mixer: { buses, snapshots, activeSnapshot: typeof mixerSource.activeSnapshot === 'string' && snapshots.some(snapshot => snapshot.id === mixerSource.activeSnapshot) ? mixerSource.activeSnapshot : null, ducking, masterVoiceLimit: Math.round(clamp(mixerSource.masterVoiceLimit, 128, 1, 1024)) }
  }
}

interface ActiveAudio {
  reference: string
  bus: string
  element: HTMLAudioElement
  source: MediaElementAudioSourceNode | null
  gain: GainNode | null
  panner: StereoPannerNode | null
  started: boolean
  manuallyPaused: boolean
  streaming: boolean
  loopStart: number
  loopEnd: number
  timeUpdate: () => void
}

class AudioRuntime {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private busInputs = new Map<string, GainNode>()
  private busOutputs = new Map<string, GainNode>()
  private busMeters = new Map<string, AnalyserNode>()
  private mixerNodes: AudioNode[] = []
  private sendNodes: GainNode[] = []
  private active = new Map<string, ActiveAudio>()
  private settings: AudioProjectSettings = defaultAudioSettings()
  private mixerSignature = ''
  readonly diagnostics: AudioRuntimeDiagnostics = { activeVoices: 0, streamingVoices: 0, bufferedVoices: 0, contextState: 'unavailable', busMeters: {}, limitedVoices: 0 }

  begin(settings: AudioProjectSettings): void {
    this.settings = normalizeAudioSettings(settings)
    this.refreshContextForSampleRate(); this.ensureContext(); void this.context?.resume().catch(() => undefined); this.applyMix()
  }

  update(entities: Entity[], settings: AudioProjectSettings, playing: boolean): void {
    this.settings = normalizeAudioSettings(settings)
    this.refreshContextForSampleRate(); if (playing) this.ensureContext(); this.configureMixerGraph(); this.applyMix()
    const live = new Set<string>(), voicesByBus = new Map<string, number>()
    let voiceCount = 0, limited = 0
    const listener = entities.find(entity => { const component = entity.getComponent<AudioListener>('AudioListener'); return entity.enabled && component?.enabled && component.active })
    const listenerPosition = listener ? worldTransform(listener, entities).position : { x: 0, y: 0 }
    const sources = entities.flatMap(entity => {
      const component = entity.getComponent<AudioSource>('AudioSource')
      return entity.enabled && component?.enabled && component.audioClip ? [{ entity, component }] : []
    }).sort((first, second) => first.component.voicePriority - second.component.voicePriority)
    for (const { entity, component } of sources) {
      const busSettings = this.settings.mixer.buses.find(bus => bus.id === component.bus) ?? this.settings.mixer.buses.find(bus => bus.id === 'SFX')!
      const busVoices = voicesByBus.get(busSettings.id) ?? 0
      if (voiceCount >= this.settings.mixer.masterVoiceLimit || busVoices >= busSettings.voiceLimit) { this.release(component.uuid); limited++; continue }
      voiceCount++; voicesByBus.set(busSettings.id, busVoices + 1); live.add(component.uuid)
      const reference = component.audioClip
      if (!reference) continue
      const asset = resolveAsset(reference)
      if (!asset || asset.assetType !== 'audio' || !asset.source) { this.release(component.uuid); continue }
      const streaming = component.streamOverride === 'Stream' || component.streamOverride === 'ImportSetting' && asset.settings.audioSettings.streaming
      const loopStart = clamp(asset.settings.audioSettings.loopStart, 0, 0, Math.max(0, asset.duration))
      const loopEnd = clamp(asset.settings.audioSettings.loopEnd, 0, 0, Math.max(0, asset.duration))
      let audio = this.active.get(component.uuid)
      if (!audio || audio.reference !== reference || audio.streaming !== streaming) {
        this.release(component.uuid)
        const element = new Audio(asset.source); element.preload = streaming ? 'metadata' : 'auto'
        let created: ActiveAudio
        const timeUpdate = () => { if (element.loop && created.loopEnd > created.loopStart && element.currentTime >= created.loopEnd) element.currentTime = created.loopStart }
        element.addEventListener('timeupdate', timeUpdate)
        created = { reference, bus: busSettings.id, element, source: null, gain: null, panner: null, started: false, manuallyPaused: false, streaming, loopStart, loopEnd, timeUpdate }
        this.connect(component, created); this.active.set(component.uuid, created); audio = created
      }
      if (!audio) continue
      if (audio.bus !== busSettings.id) { audio.bus = busSettings.id; audio.panner?.disconnect(); audio.panner?.connect(this.busInputs.get(busSettings.id) ?? this.master!) }
      audio.loopStart = loopStart; audio.loopEnd = loopEnd; audio.element.loop = component.loop
      audio.element.playbackRate = clamp(component.pitch, 1, .25, 4)
      const spatial = clamp(component.spatialBlend, 0, 0, 1), sourcePosition = worldTransform(entity, entities).position
      const distance = Math.hypot(sourcePosition.x - listenerPosition.x, sourcePosition.y - listenerPosition.y)
      const min = Math.max(0, finiteNumber(component.minDistance, 1)), max = Math.max(min + 1e-6, finiteNumber(component.maxDistance, 50))
      const attenuation = this.attenuation(component, distance, min, max)
      const normalizeGain = asset.settings.audioSettings.normalize ? clamp(asset.settings.audioSettings.normalizationGain, 1, .01, 16) : 1
      const volume = clamp(component.volume, 1, 0, 1) * normalizeGain * ((1 - spatial) + spatial * attenuation)
      if (audio.gain) audio.gain.gain.value = volume
      else audio.element.volume = clamp(volume * this.settings.masterVolume * (this.settings.buses[component.bus as keyof typeof this.settings.buses] ?? 1), 1, 0, 1)
      if (audio.panner) audio.panner.pan.value = spatial * Math.min(1, Math.max(-1, (sourcePosition.x - listenerPosition.x) / max))
      if (playing && component.autoplay && !audio.started) { audio.started = true; if (loopStart > 0) audio.element.currentTime = loopStart; void audio.element.play().catch(() => { audio!.started = false }) }
      if (playing && audio.started && audio.element.paused && !audio.manuallyPaused) void audio.element.play().catch(() => undefined)
      if (!playing && !audio.element.paused) audio.element.pause()
    }
    for (const uuid of [...this.active.keys()]) if (!live.has(uuid)) this.release(uuid)
    this.updateDucking(voicesByBus); this.updateDiagnostics(limited)
  }

  play(entity: Entity, entities: Entity[] = [entity]): void {
    const component = entity.getComponent<AudioSource>('AudioSource'); if (!component) return
    this.update(entities, this.settings, true)
    const active = this.active.get(component.uuid); if (!active) return
    active.started = true; active.manuallyPaused = false; if (active.loopStart > 0) active.element.currentTime = active.loopStart
    void this.context?.resume().catch(() => undefined); void active.element.play().catch(() => { active.started = false })
  }

  pause(entity: Entity): void { const component = entity.getComponent<AudioSource>('AudioSource'); const active = component ? this.active.get(component.uuid) : null; if (active) { active.manuallyPaused = true; active.element.pause() } }
  stop(entity: Entity): void { const component = entity.getComponent<AudioSource>('AudioSource'); const active = component ? this.active.get(component.uuid) : null; if (!active) return; active.element.pause(); active.element.currentTime = active.loopStart; active.started = false; active.manuallyPaused = false }
  stopAll(): void { for (const uuid of [...this.active.keys()]) this.release(uuid) }

  private ensureContext(): void {
    if (this.context || typeof AudioContext === 'undefined') return
    try { this.context = new AudioContext({ sampleRate: this.settings.sampleRate }); this.master = this.context.createGain(); this.master.connect(this.context.destination); this.mixerSignature = ''; this.configureMixerGraph() }
    catch { this.context = null; this.master = null; this.destroyMixerGraph() }
  }

  private configureMixerGraph(): void {
    if (!this.context || !this.master) return
    const signature = JSON.stringify(this.settings.mixer.buses.map(bus => ({ id: bus.id, parent: bus.parent, sends: bus.sends, effects: bus.effects })))
    if (signature === this.mixerSignature) return
    for (const active of this.active.values()) active.panner?.disconnect()
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
    for (const active of this.active.values()) active.panner?.connect(this.busInputs.get(active.bus) ?? this.master)
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
      for (let channel = 0; channel < impulse.numberOfChannels; channel++) { const data = impulse.getChannelData(channel); for (let index = 0; index < length; index++) data[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / length, 2) }
      convolver.buffer = impulse; processor = convolver
    }
    input.connect(processor); processor.connect(wet).connect(output); nodes.push(processor)
    return { input, output, nodes }
  }

  private refreshContextForSampleRate(): void { if (!this.context || this.context.sampleRate === this.settings.sampleRate) return; this.stopAll(); void this.context.close().catch(() => undefined); this.context = null; this.master = null; this.destroyMixerGraph() }

  private connect(component: AudioSource, active: ActiveAudio): void {
    if (!this.context) return
    try { active.source = this.context.createMediaElementSource(active.element); active.gain = this.context.createGain(); active.panner = this.context.createStereoPanner(); active.source.connect(active.gain).connect(active.panner).connect(this.busInputs.get(component.bus) ?? this.busInputs.get('SFX') ?? this.master!) }
    catch { active.source = null; active.gain = null; active.panner = null }
  }

  private applyMix(): void {
    if (!this.master || !this.context) return
    const snapshot = this.settings.mixer.snapshots.find(candidate => candidate.id === this.settings.mixer.activeSnapshot)
    this.master.gain.setTargetAtTime(this.settings.masterVolume * (snapshot?.masterVolume ?? 1), this.context.currentTime, .02)
    const anySolo = this.settings.mixer.buses.some(bus => bus.solo)
    for (const bus of this.settings.mixer.buses) {
      const output = this.busOutputs.get(bus.id); if (!output) continue
      const requested = snapshot?.busGains[bus.id] ?? bus.gain
      const audible = !bus.mute && (!anySolo || bus.solo || bus.id === 'Master')
      output.gain.setTargetAtTime(audible ? requested : 0, this.context.currentTime, .015)
    }
  }

  private updateDucking(voicesByBus: Map<string, number>): void {
    if (!this.context) return
    for (const rule of this.settings.mixer.ducking) {
      if (!rule.enabled) continue
      const output = this.busOutputs.get(rule.targetBus), bus = this.settings.mixer.buses.find(candidate => candidate.id === rule.targetBus)
      if (!output || !bus) continue
      const active = (voicesByBus.get(rule.triggerBus) ?? 0) > 0, reduction = active ? Math.pow(10, rule.reductionDb / 20) : 1
      const time = Math.max(.001, active ? rule.attack : rule.release)
      const snapshot = this.settings.mixer.snapshots.find(candidate => candidate.id === this.settings.mixer.activeSnapshot)
      const anySolo = this.settings.mixer.buses.some(candidate => candidate.solo)
      const audible = !bus.mute && (!anySolo || bus.solo || bus.id === 'Master')
      output.gain.setTargetAtTime(audible ? (snapshot?.busGains[bus.id] ?? bus.gain) * reduction : 0, this.context.currentTime, time / 3)
    }
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

  private updateDiagnostics(limited: number): void {
    this.diagnostics.activeVoices = this.active.size; this.diagnostics.streamingVoices = [...this.active.values()].filter(audio => audio.streaming).length
    this.diagnostics.bufferedVoices = this.active.size - this.diagnostics.streamingVoices; this.diagnostics.contextState = this.context?.state ?? 'unavailable'; this.diagnostics.limitedVoices = limited
    const samples = new Float32Array(128), meters: Record<string, number> = {}
    for (const [id, analyser] of this.busMeters) { analyser.getFloatTimeDomainData(samples); let energy = 0; for (const sample of samples) energy += sample * sample; meters[id] = Math.min(1, Math.sqrt(energy / samples.length)) }
    this.diagnostics.busMeters = meters
  }

  private destroyMixerGraph(): void {
    for (const node of [...this.sendNodes, ...this.mixerNodes]) try { node.disconnect() } catch { /* already disconnected */ }
    this.busInputs.clear(); this.busOutputs.clear(); this.busMeters.clear(); this.mixerNodes = []; this.sendNodes = []; this.mixerSignature = ''
  }

  private release(uuid: string): void {
    const active = this.active.get(uuid); if (!active) return
    active.element.pause(); active.element.removeEventListener('timeupdate', active.timeUpdate); active.element.removeAttribute('src'); active.element.load()
    active.source?.disconnect(); active.gain?.disconnect(); active.panner?.disconnect(); this.active.delete(uuid)
  }
}

export const audioRuntime = new AudioRuntime()
