/** Fixed-world Replay input/checksum history and deterministic callback seed source. No clock or Editor default. */
import type { InputSnapshot } from './input'
import { NOVA_ENGINE_VERSION } from '../projects/projectFormat'

export interface ReplayFrame {
  tick: number
  input: InputSnapshot
  physicsChecksum: string
}
export interface ReplayDocument {
  format: 'nova-replay'
  version: 1
  engineVersion: string
  seed: number
  tickRate: number
  initialProject: string
  frames: ReplayFrame[]
}

export interface ReplayWorld { readonly entities: readonly unknown[] }
export interface ReplaySettings { seed: number; capacity: number; strictChecksums: boolean }
export interface ReplayHost { readonly world: ReplayWorld; readReplaySettings(): ReplaySettings }
export function createInitialReplayState(seed: number) { return {
  mode: 'idle' as 'idle' | 'recording' | 'playback',
  tick: 0,
  frames: [] as ReplayFrame[],
  mismatches: [] as Array<{ tick: number; expected: string; actual: string }>,
  seed: seed,
  initialProject: '',
  status: '',
  completed: false
} }
export type ReplayState = ReturnType<typeof createInitialReplayState>

/** 结构说明（自动提取）：cloneInput；输入 input；直接调用 Array.isArray、Object.fromEntries、map、Object.entries。 */ function cloneInput(input: InputSnapshot): InputSnapshot {
  const mousePosition = Array.isArray(input.mousePosition) ? input.mousePosition : [0, 0]
  const mouseWorldPosition = Array.isArray(input.mouseWorldPosition) ? input.mouseWorldPosition : mousePosition
  const viewBounds = Array.isArray(input.viewBounds) && input.viewBounds.length >= 4 ? input.viewBounds : [0, 0, 0, 0]
  const viewportSize = Array.isArray(input.viewportSize) ? input.viewportSize : [0, 0]
  return {
    down: { ...input.down }, pressed: { ...input.pressed }, released: { ...input.released }, performed: { ...input.performed }, cancelled: { ...input.cancelled }, phases: { ...input.phases }, durations: { ...input.durations }, tapCounts: { ...input.tapCounts }, consumed: { ...input.consumed }, axes: { ...input.axes },
    vectors: Object.fromEntries(Object.entries(input.vectors ?? {}).map(/* 返回按声明顺序构造的数组 [key, [value[0], value[1]] as [number, number]]。 */ ([key, value]) => [key, [value[0], value[1]] as [number, number]])),
    mousePosition: [mousePosition[0] ?? 0, mousePosition[1] ?? 0], mouseWorldPosition: [mouseWorldPosition[0] ?? 0, mouseWorldPosition[1] ?? 0], viewBounds: [viewBounds[0] ?? 0, viewBounds[1] ?? 0, viewBounds[2] ?? 0, viewBounds[3] ?? 0], viewportSize: [viewportSize[0] ?? 0, viewportSize[1] ?? 0], wheel: [input.wheel?.[0] ?? 0, input.wheel?.[1] ?? 0], pointerDelta: [input.pointerDelta?.[0] ?? 0, input.pointerDelta?.[1] ?? 0], touches: input.touches ?? 0, devices: (input.devices ?? []).map(/** 构造并返回记录 { ...device }，字段按当前实参及捕获状态求值。 */ device => ({ ...device })), contexts: [...(input.contexts ?? [])], maps: [...(input.maps ?? [])], scheme: input.scheme ?? 'Any'
  }
}

export class ReplayOwner {
  readonly world: ReplayWorld
  readonly state: ReplayState
  private readonly host: ReplayHost
  private pendingInput: InputSnapshot | null = null
  private randomState: number
  constructor(host: ReplayHost, state?: ReplayState) {
    if (!host?.world || !Array.isArray(host.world.entities) || typeof host.readReplaySettings !== 'function') throw new Error('REPLAY_HOST_REQUIRED: Supply the fixed World and this game replay configuration.')
    this.world = host.world
    this.host = Object.freeze({ world: this.world, readReplaySettings: host.readReplaySettings.bind(host) })
    this.state = state ?? createInitialReplayState(this.host.readReplaySettings().seed)
    this.randomState = this.host.readReplaySettings().seed >>> 0
  }
  /** Editor-only compatibility bridge; old owners retain their fixed World and cannot retarget a Core. */
  rebindLegacySingleRootHost(host: ReplayHost): ReplayOwner {
    const next = new ReplayOwner(host, this.state)
    next.pendingInput = this.pendingInput
    next.randomState = this.randomState
    return next
  }

/** 结构说明（自动提取）：resetDeterministicSeed；输入 seed；写入 this.state.seed、this.randomState。 */ resetDeterministicSeed(seed = this.host.readReplaySettings().seed): void {
  this.state.seed = seed >>> 0
  this.randomState = this.state.seed || 0x6d2b79f5
}

/** 结构说明（自动提取）：deterministicRandom；无显式参数；写入 this.randomState。 */ deterministicRandom(): number {
  this.randomState ^= this.randomState << 13; this.randomState ^= this.randomState >>> 17; this.randomState ^= this.randomState << 5
  return (this.randomState >>> 0) / 0x1_0000_0000
}

/** 结构说明（自动提取）：startReplayRecording；输入 initialProject、tickRate；直接调用 this.state.frames.splice、this.state.mismatches.splice、resetDeterministicSeed、Number.isFinite、Error；写入 this.state.mode、this.state.tick、this.state.initialProject、this.state.status 等；包含显式抛错路径。 */ startReplayRecording(initialProject: string, tickRate: number): void {
  this.state.mode = 'recording'; this.state.tick = 0; this.state.frames.splice(0); this.state.mismatches.splice(0)
  this.state.initialProject = initialProject; this.state.status = 'Recording'; this.state.completed = false
  this.resetDeterministicSeed(); this.pendingInput = null
  if (!Number.isFinite(tickRate) || tickRate <= 0) throw new Error('Replay tick rate must be finite and positive')
}

/** 结构说明（自动提取）：stopReplay；无显式参数；写入 this.state.mode、this.state.status、this.pendingInput。 */ stopReplay(): void {
  this.state.mode = 'idle'; this.state.status = this.state.completed ? 'Playback complete' : 'Stopped'; this.pendingInput = null
}

/** 结构说明（自动提取）：startReplayPlayback；输入 document；直接调用 normalizeReplayDocument、this.state.frames.splice、this.state.mismatches.splice、resetDeterministicSeed；写入 this.state.mode、this.state.tick、this.state.initialProject、this.state.status 等；返回路径包含 normalized.initialProject。 */ startReplayPlayback(document: ReplayDocument): string {
  const normalized = this.normalizeReplayDocument(document)
  this.state.mode = 'playback'; this.state.tick = 0; this.state.frames.splice(0, this.state.frames.length, ...normalized.frames)
  this.state.mismatches.splice(0); this.state.initialProject = normalized.initialProject; this.state.status = 'Playing'; this.state.completed = false
  this.resetDeterministicSeed(normalized.seed); this.pendingInput = null
  return normalized.initialProject
}

/** 结构说明（自动提取）：replayFixedInput；输入 live；直接调用 stopReplay、cloneInput；写入 this.state.completed、this.pendingInput；返回路径包含 live。 */ replayFixedInput(live: InputSnapshot): InputSnapshot {
  if (this.state.mode === 'playback') {
    const frame = this.state.frames[this.state.tick]
    if (!frame) { this.state.completed = true; this.stopReplay(); return cloneInput(live) }
    this.pendingInput = cloneInput(frame.input)
    return cloneInput(frame.input)
  }
  this.pendingInput = cloneInput(live)
  return live
}

/** 结构说明（自动提取）：completeReplayFixedStep；输入 physicsChecksum；直接调用 physicsChecksum.slice、this.state.frames.push、this.state.frames.splice、this.state.mismatches.push、this.state.mismatches.splice 等；写入 this.state.status、this.pendingInput、this.state.completed。 */ completeReplayFixedStep(physicsChecksum: string): void {
  const checksum = physicsChecksum.slice(0, 32)
  if (this.state.mode === 'recording' && this.pendingInput) {
    this.state.frames.push({ tick: this.state.tick, input: this.pendingInput, physicsChecksum: checksum })
    if (this.state.frames.length > this.host.readReplaySettings().capacity) this.state.frames.splice(0, this.state.frames.length - this.host.readReplaySettings().capacity)
  } else if (this.state.mode === 'playback') {
    const expected = this.state.frames[this.state.tick]?.physicsChecksum ?? ''
    if (expected && expected !== checksum) {
      this.state.mismatches.push({ tick: this.state.tick, expected, actual: checksum })
      if (this.state.mismatches.length > 256) this.state.mismatches.splice(0, this.state.mismatches.length - 256)
      this.state.status = `Checksum mismatch at tick ${this.state.tick}`
      if (this.host.readReplaySettings().strictChecksums) this.stopReplay()
    }
  }
  this.state.tick++; this.pendingInput = null
  if (this.state.mode === 'playback' && this.state.tick >= this.state.frames.length) { this.state.completed = true; this.stopReplay() }
}

/** 结构说明（自动提取）：exportReplay；输入 tickRate；直接调用 Math.min、Math.max、Number.isFinite、map、this.state.frames.slice。 */ exportReplay(tickRate: number): ReplayDocument {
  return {
    format: 'nova-replay', version: 1, engineVersion: NOVA_ENGINE_VERSION, seed: this.state.seed,
    tickRate: Math.min(1_000, Math.max(1, Number.isFinite(tickRate) ? tickRate : 60)), initialProject: this.state.initialProject,
    frames: this.state.frames.slice(0, this.host.readReplaySettings().capacity).map(/** 构造并返回记录 { ...frame, input: cloneInput(frame.input) }，字段按当前实参及捕获状态求值。 */ frame => ({ ...frame, input: cloneInput(frame.input) }))
  }
}

/** 结构说明（自动提取）：normalizeReplayDocument；输入 value；直接调用 Error、map、slice、Array.isArray、Number.isFinite 等；包含显式抛错路径。 */ normalizeReplayDocument(value: unknown): ReplayDocument {
  const source = value && typeof value === 'object' ? value as Partial<ReplayDocument> : {}
  if (source.format !== 'nova-replay' || source.version !== 1 || typeof source.initialProject !== 'string') throw new Error('Invalid Nova replay document')
  const frames = (Array.isArray(source.frames) ? source.frames : []).slice(0, 60_000).map(/** 结构说明（自动提取）：map 回调；输入 frame、index；直接调用 cloneInput、item.physicsChecksum.slice。 */ (frame, index) => {
    const item = frame && typeof frame === 'object' ? frame as Partial<ReplayFrame> : {}
    const input = item.input && typeof item.input === 'object' ? item.input : { down: {}, pressed: {}, released: {}, axes: {}, vectors: {}, mousePosition: [0, 0], wheel: [0, 0] }
    return { tick: index, input: cloneInput(input as InputSnapshot), physicsChecksum: typeof item.physicsChecksum === 'string' ? item.physicsChecksum.slice(0, 32) : '' }
  })
  return {
    format: 'nova-replay', version: 1, engineVersion: NOVA_ENGINE_VERSION, seed: Number.isFinite(source.seed) ? Number(source.seed) >>> 0 : this.host.readReplaySettings().seed,
    tickRate: Math.min(1_000, Math.max(1, Number(source.tickRate) || 60)), initialProject: source.initialProject.slice(0, 50_000_000), frames
  }
}
}
