/** Original audio value algorithms, shared by Runtime and Editor. */
import {finiteNumber} from '../world/geometry'
import type {AudioEffectKind,AudioMixerEffect,AudioMixerSend,AudioMixerBusSettings,AudioMixerSnapshot,AudioDuckingRule,AudioMixerSettings,AudioProjectSettings} from './audioSettingsContracts'
const DEFAULT_BUS_IDS = ['Master', 'Music', 'SFX', 'UI'] as const
const MAX_BUSES = 32
const MAX_EFFECTS_PER_BUS = 8
const MAX_SENDS_PER_BUS = 16
const MAX_SNAPSHOTS = 32
const MAX_DUCKING_RULES = 32

/** 构造并返回记录 { id, name: id, gain: 1, mute: false, solo: false, parent, voiceLimit: id === 'Music' ? 4 : 32, sends: [], effects: [], automation: [], automationLoopSeconds: 0 }，字段按当前实参及捕获状态求值。 */ function defaultBus(id: string, parent: string | null): AudioMixerBusSettings {
  return { id, name: id, gain: 1, mute: false, solo: false, parent, voiceLimit: id === 'Music' ? 4 : 32, sends: [], effects: [], automation: [], automationLoopSeconds: 0 }
}

/** 结构说明（自动提取）：defaultAudioSettings；无显式参数；直接调用 defaultBus。 */ export function defaultAudioSettings(): AudioProjectSettings {
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

/* 调用 Math.min(maximum, Math.max(minimum, finiteNumber(value, fallback))) 并返回调用结果。 */ export function clamp(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, finiteNumber(value, fallback)))
}

/** 结构说明（自动提取）：safeId；输入 value、fallback；直接调用 slice、replace、trim、String。 */ function safeId(value: unknown, fallback: string): string {
  const id = String(value ?? '').trim().replace(/[^A-Za-z0-9_.-]/g, '-').slice(0, 80)
  return id || fallback
}

/** 结构说明（自动提取）：normalizeEffect；输入 source、index；直接调用 safeId、kinds.includes、clamp。 */ function normalizeEffect(source: unknown, index: number): AudioMixerEffect {
  const item = source && typeof source === 'object' ? source as Partial<AudioMixerEffect> : {}
  const kinds: AudioEffectKind[] = ['LowPass', 'HighPass', 'Compressor', 'Delay', 'Reverb']
  return {
    id: safeId(item.id, `effect-${index}`), kind: kinds.includes(item.kind as AudioEffectKind) ? item.kind as AudioEffectKind : 'LowPass', enabled: item.enabled !== false,
    wet: clamp(item.wet, 1, 0, 1), frequency: clamp(item.frequency, 1200, 10, 24_000), q: clamp(item.q, .7, .0001, 1000),
    threshold: clamp(item.threshold, -24, -100, 0), ratio: clamp(item.ratio, 4, 1, 20), time: clamp(item.time, .18, 0, 5), feedback: clamp(item.feedback, .25, 0, .95)
  }
}

/** 结构说明（自动提取）：wouldCycle；输入 edges、source、target；直接调用 Set、stack.pop、visited.has、visited.add、stack.push 等；包含循环处理。 */ function wouldCycle(edges: Map<string, string[]>, source: string, target: string): boolean {
  const stack = [target], visited = new Set<string>()
  while (stack.length) {
    const current = stack.pop()!
    if (current === source) return true
    if (visited.has(current)) continue
    visited.add(current); stack.push(...(edges.get(current) ?? []))
  }
  return false
}

/** 结构说明（自动提取）：normalizeAudioSettings；输入 source；直接调用 defaultAudioSettings、Math.round、finiteNumber、reduce、Array.isArray 等；写入 id、bus.parent、bus.sends、bus.gain；包含循环处理。 */ export function normalizeAudioSettings(source: unknown): AudioProjectSettings {
  const defaults = defaultAudioSettings()
  const item = source && typeof source === 'object' ? source as Partial<AudioProjectSettings> : {}
  const legacy = item.buses && typeof item.buses === 'object' ? item.buses as Partial<Record<typeof DEFAULT_BUS_IDS[number], unknown>> : {}
  const gain = /* 调用 clamp(value, fallback, 0, 1) 并返回调用结果。 */ (value: unknown, fallback = 1) => clamp(value, fallback, 0, 1)
  const rawRate = Math.round(finiteNumber(item.sampleRate, 48000))
  const sampleRate = ([44100, 48000, 96000] as const).reduce(/* 根据 Math.abs(rate - rawRate) < Math.abs(closest - rawRate) 的真假，分别返回 rate 或 closest。 */ (closest, rate) => Math.abs(rate - rawRate) < Math.abs(closest - rawRate) ? rate : closest, 48000 as 44100 | 48000 | 96000)
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
      sends: Array.isArray(value.sends) ? value.sends.slice(0, MAX_SENDS_PER_BUS).map(/** 结构说明（自动提取）：map 回调；输入 send；直接调用 safeId、gain；返回表达式求值结果。 */ send => ({
        target: safeId(send?.target, 'Master'), gain: gain(send?.gain), enabled: send?.enabled !== false
      })) : [],
      effects: Array.isArray(value.effects) ? value.effects.slice(0, MAX_EFFECTS_PER_BUS).map(normalizeEffect) : []
      ,automation: (Array.isArray(value.automation) ? value.automation : []).slice(0, 64).map(/** 构造并返回记录 { time: clamp(point?.time, 0, 0, 3_600), gain: gain(point?.gain) }，字段按当前实参及捕获状态求值。 */ point => ({ time: clamp(point?.time, 0, 0, 3_600), gain: gain(point?.gain) })).sort(/* 计算表达式 a.time - b.time 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a.time - b.time),
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
  const snapshots = (Array.isArray(mixerSource.snapshots) ? mixerSource.snapshots : defaults.mixer.snapshots).slice(0, MAX_SNAPSHOTS).map(/** 结构说明（自动提取）：map 回调；输入 raw、index；直接调用 Object.entries、ids.has、gain、safeId、slice 等；写入 busGains[…]；包含循环处理。 */ (raw, index) => {
    const value = raw && typeof raw === 'object' ? raw as Partial<AudioMixerSnapshot> : {}
    const busGains: Record<string, number> = {}
    if (value.busGains && typeof value.busGains === 'object') for (const [id, amount] of Object.entries(value.busGains)) if (ids.has(id)) busGains[id] = gain(amount)
    return { id: safeId(value.id, `snapshot-${index + 1}`), name: String(value.name ?? `Snapshot ${index + 1}`).slice(0, 80), masterVolume: gain(value.masterVolume), busGains }
  })
  const ducking = (Array.isArray(mixerSource.ducking) ? mixerSource.ducking : []).slice(0, MAX_DUCKING_RULES).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 raw、index；直接调用 safeId、ids.has、clamp。 */ (raw, index) => {
    const value = raw && typeof raw === 'object' ? raw as Partial<AudioDuckingRule> : {}
    const triggerBus = safeId(value.triggerBus, 'SFX'), targetBus = safeId(value.targetBus, 'Music')
    if (!ids.has(triggerBus) || !ids.has(targetBus) || triggerBus === targetBus) return []
    return [{ id: safeId(value.id, `duck-${index + 1}`), triggerBus, targetBus, reductionDb: clamp(value.reductionDb, -12, -80, 0), attack: clamp(value.attack, .04, 0, 10), release: clamp(value.release, .35, 0, 30), enabled: value.enabled !== false }]
  })
  const hasMixer = Boolean(item.mixer && typeof item.mixer === 'object')
  const synchronizedGain = /** 结构说明（自动提取）：synchronizedGain；输入 id；直接调用 buses.find、gain。 */ (id: typeof DEFAULT_BUS_IDS[number]) => {
    const mixerGain = buses.find(/* 比较 bus.id 与 id，返回严格相等的判断结果。 */ bus => bus.id === id)?.gain ?? 1
    return hasMixer ? gain(mixerGain) : gain(legacy[id], mixerGain)
  }
  const busesLegacy = {
    Master: synchronizedGain('Master'), Music: synchronizedGain('Music'),
    SFX: synchronizedGain('SFX'), UI: synchronizedGain('UI')
  }
  for (const id of DEFAULT_BUS_IDS) { const bus = buses.find(/* 比较 candidate.id 与 id，返回严格相等的判断结果。 */ candidate => candidate.id === id); if (bus) bus.gain = busesLegacy[id] }
  return {
    masterVolume: gain(item.masterVolume), sampleRate, buses: busesLegacy,
    mixer: { buses, snapshots, activeSnapshot: typeof mixerSource.activeSnapshot === 'string' && snapshots.some(/* 比较 snapshot.id 与 mixerSource.activeSnapshot，返回严格相等的判断结果。 */ snapshot => snapshot.id === mixerSource.activeSnapshot) ? mixerSource.activeSnapshot : null, snapshotTransitionSeconds: clamp(mixerSource.snapshotTransitionSeconds, .12, 0, 30), ducking, masterVoiceLimit: Math.round(clamp(mixerSource.masterVoiceLimit, 128, 1, 1024)), outputDeviceId: typeof mixerSource.outputDeviceId === 'string' ? mixerSource.outputDeviceId.slice(0, 256) || 'default' : 'default', limiterEnabled: mixerSource.limiterEnabled !== false, limiterCeilingDb: clamp(mixerSource.limiterCeilingDb, -1, -24, 0) }
  }
}

/** 结构说明（自动提取）：seededVariation；输入 seed；直接调用 Math.imul、character.charCodeAt；写入 hash；包含循环处理。 */ export function seededVariation(seed: string): number {
  let hash = 2_166_136_261
  for (const character of seed) hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619) >>> 0
  return hash / 0xffff_ffff * 2 - 1
}
