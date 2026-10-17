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

