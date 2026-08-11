import { resolveAsset } from '../assets/AssetDatabase'
import type { Entity } from '../world/Entity'
import type { AudioBus, AudioListener, AudioSource } from '../world/components'
import { finiteNumber } from '../world/geometry'
import { worldTransform } from '../world/hierarchy'

export interface AudioProjectSettings {
  masterVolume: number
  sampleRate: 44100 | 48000 | 96000
  buses: Record<AudioBus, number>
}

export function defaultAudioSettings(): AudioProjectSettings {
  return { masterVolume: 1, sampleRate: 48000, buses: { Master: 1, Music: 1, SFX: 1, UI: 1 } }
}

export function normalizeAudioSettings(source: unknown): AudioProjectSettings {
  const item = source && typeof source === 'object' ? source as Partial<AudioProjectSettings> : {}
  const buses: Partial<Record<AudioBus, unknown>> = item.buses && typeof item.buses === 'object' ? item.buses : {}
  const gain = (value: unknown, fallback = 1) => Math.min(1, Math.max(0, finiteNumber(value, fallback)))
  const rawRate = Math.round(finiteNumber(item.sampleRate, 48000))
  const sampleRate = ([44100, 48000, 96000] as const).reduce((closest, rate) => Math.abs(rate - rawRate) < Math.abs(closest - rawRate) ? rate : closest, 48000 as 44100 | 48000 | 96000)
  return {
    masterVolume: gain(item.masterVolume), sampleRate,
    buses: { Master: gain(buses.Master), Music: gain(buses.Music), SFX: gain(buses.SFX), UI: gain(buses.UI) }
  }
}

interface ActiveAudio {
  reference: string
  bus: AudioBus
  element: HTMLAudioElement
  source: MediaElementAudioSourceNode | null
  gain: GainNode | null
  panner: StereoPannerNode | null
  started: boolean
  manuallyPaused: boolean
}

class AudioRuntime {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private buses = new Map<AudioBus, GainNode>()
  private active = new Map<string, ActiveAudio>()
  private settings: AudioProjectSettings = defaultAudioSettings()

  begin(settings: AudioProjectSettings): void {
    this.settings = normalizeAudioSettings(settings)
    this.refreshContextForSampleRate()
    this.ensureContext()
    void this.context?.resume().catch(() => undefined)
    this.applyMix()
  }

  update(entities: Entity[], settings: AudioProjectSettings, playing: boolean): void {
    this.settings = normalizeAudioSettings(settings)
    this.refreshContextForSampleRate()
    if (playing) this.ensureContext()
    this.applyMix()
    const live = new Set<string>()
    const listener = entities.find(entity => {
      const component = entity.getComponent<AudioListener>('AudioListener')
      return entity.enabled && component?.enabled && component.active
    })
    const listenerPosition = listener ? worldTransform(listener, entities).position : { x: 0, y: 0 }
    for (const entity of entities) {
      const component = entity.getComponent<AudioSource>('AudioSource')
      if (!entity.enabled || !component?.enabled || !component.audioClip) continue
      live.add(component.uuid)
      const asset = resolveAsset(component.audioClip)
      if (!asset || asset.assetType !== 'audio' || !asset.source) { this.release(component.uuid); continue }
      let audio = this.active.get(component.uuid)
      if (!audio || audio.reference !== component.audioClip) {
        this.release(component.uuid)
        const element = new Audio(asset.source)
        element.preload = 'auto'
        audio = { reference: component.audioClip, bus: component.bus, element, source: null, gain: null, panner: null, started: false, manuallyPaused: false }
        this.connect(component, audio)
        this.active.set(component.uuid, audio)
      }
      if (audio.bus !== component.bus) {
        audio.bus = component.bus
        audio.panner?.disconnect()
        audio.panner?.connect(this.buses.get(component.bus) ?? this.master!)
      }
      audio.element.loop = component.loop
      audio.element.playbackRate = Math.min(4, Math.max(.25, finiteNumber(component.pitch, 1)))
      const spatial = Math.min(1, Math.max(0, finiteNumber(component.spatialBlend)))
      const sourcePosition = worldTransform(entity, entities).position
      const distance = Math.hypot(sourcePosition.x - listenerPosition.x, sourcePosition.y - listenerPosition.y)
      const min = Math.max(0, finiteNumber(component.minDistance, 1))
      const max = Math.max(min + 1e-6, finiteNumber(component.maxDistance, 50))
      const attenuation = distance <= min ? 1 : distance >= max ? 0 : 1 - (distance - min) / (max - min)
      const volume = Math.min(1, Math.max(0, finiteNumber(component.volume, 1))) * ((1 - spatial) + spatial * attenuation)
      if (audio.gain) audio.gain.gain.value = volume
      else audio.element.volume = volume * this.settings.masterVolume * this.settings.buses[component.bus]
      if (audio.panner) audio.panner.pan.value = spatial * Math.min(1, Math.max(-1, (sourcePosition.x - listenerPosition.x) / max))
      if (playing && component.autoplay && !audio.started) {
        audio.started = true
        void audio.element.play().catch(() => { audio!.started = false })
      }
      if (playing && audio.started && audio.element.paused && !audio.manuallyPaused) void audio.element.play().catch(() => undefined)
      if (!playing && !audio.element.paused) audio.element.pause()
    }
    for (const uuid of this.active.keys()) if (!live.has(uuid)) this.release(uuid)
  }

  play(entity: Entity, entities: Entity[] = [entity]): void {
    const component = entity.getComponent<AudioSource>('AudioSource')
    if (!component) return
    this.update(entities, this.settings, true)
    const active = this.active.get(component.uuid)
    if (!active) return
    active.started = true
    active.manuallyPaused = false
    void this.context?.resume().catch(() => undefined)
    void active.element.play().catch(() => { active.started = false })
  }

  pause(entity: Entity): void {
    const component = entity.getComponent<AudioSource>('AudioSource')
    const active = component ? this.active.get(component.uuid) : null
    if (active) { active.manuallyPaused = true; active.element.pause() }
  }

  stop(entity: Entity): void {
    const component = entity.getComponent<AudioSource>('AudioSource')
    const active = component ? this.active.get(component.uuid) : null
    if (!active) return
    active.element.pause(); active.element.currentTime = 0; active.started = false; active.manuallyPaused = false
  }

  stopAll(): void {
    for (const uuid of [...this.active.keys()]) this.release(uuid)
  }

  private ensureContext(): void {
    if (this.context || typeof AudioContext === 'undefined') return
    try {
      this.context = new AudioContext({ sampleRate: this.settings.sampleRate })
      this.master = this.context.createGain()
      this.master.connect(this.context.destination)
      for (const name of ['Master', 'Music', 'SFX', 'UI'] as AudioBus[]) {
        const gain = this.context.createGain()
        gain.connect(this.master)
        this.buses.set(name, gain)
      }
    } catch { this.context = null; this.master = null; this.buses.clear() }
  }

  private refreshContextForSampleRate(): void {
    if (!this.context || this.context.sampleRate === this.settings.sampleRate) return
    this.stopAll()
    void this.context.close().catch(() => undefined)
    this.context = null; this.master = null; this.buses.clear()
  }

  private connect(component: AudioSource, active: ActiveAudio): void {
    if (!this.context) return
    try {
      active.source = this.context.createMediaElementSource(active.element)
      active.gain = this.context.createGain()
      active.panner = this.context.createStereoPanner()
      active.source.connect(active.gain).connect(active.panner).connect(this.buses.get(component.bus) ?? this.master!)
    } catch { active.source = null; active.gain = null; active.panner = null }
  }

  private applyMix(): void {
    if (this.master) this.master.gain.value = this.settings.masterVolume * this.settings.buses.Master
    for (const [name, gain] of this.buses) gain.gain.value = name === 'Master' ? 1 : this.settings.buses[name]
  }

  private release(uuid: string): void {
    const active = this.active.get(uuid)
    if (!active) return
    active.element.pause(); active.element.removeAttribute('src'); active.element.load()
    active.source?.disconnect(); active.gain?.disconnect(); active.panner?.disconnect()
    this.active.delete(uuid)
  }
}

export const audioRuntime = new AudioRuntime()
