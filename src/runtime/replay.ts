/** 游戏回放：记录输入与运行状态，组织重放以及一致性检查。 */
import { reactive } from 'vue'
import type { InputSnapshot } from './input'
import { productionSettings } from './production'
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

export const replayState = reactive({
  mode: 'idle' as 'idle' | 'recording' | 'playback',
  tick: 0,
  frames: [] as ReplayFrame[],
  mismatches: [] as Array<{ tick: number; expected: string; actual: string }>,
  seed: productionSettings.replay.seed,
  initialProject: '',
  status: '',
  completed: false
})

let pendingInput: InputSnapshot | null = null
let randomState = productionSettings.replay.seed >>> 0

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

/** 结构说明（自动提取）：resetDeterministicSeed；输入 seed；写入 replayState.seed、randomState。 */ export function resetDeterministicSeed(seed = productionSettings.replay.seed): void {
  replayState.seed = seed >>> 0
  randomState = replayState.seed || 0x6d2b79f5
}

/** 结构说明（自动提取）：deterministicRandom；无显式参数；写入 randomState。 */ export function deterministicRandom(): number {
  randomState ^= randomState << 13; randomState ^= randomState >>> 17; randomState ^= randomState << 5
  return (randomState >>> 0) / 0x1_0000_0000
}

/** 结构说明（自动提取）：startReplayRecording；输入 initialProject、tickRate；直接调用 replayState.frames.splice、replayState.mismatches.splice、resetDeterministicSeed、Number.isFinite、Error；写入 replayState.mode、replayState.tick、replayState.initialProject、replayState.status 等；包含显式抛错路径。 */ export function startReplayRecording(initialProject: string, tickRate: number): void {
  replayState.mode = 'recording'; replayState.tick = 0; replayState.frames.splice(0); replayState.mismatches.splice(0)
  replayState.initialProject = initialProject; replayState.status = 'Recording'; replayState.completed = false
  resetDeterministicSeed(); pendingInput = null
  if (!Number.isFinite(tickRate) || tickRate <= 0) throw new Error('Replay tick rate must be finite and positive')
}

/** 结构说明（自动提取）：stopReplay；无显式参数；写入 replayState.mode、replayState.status、pendingInput。 */ export function stopReplay(): void {
  replayState.mode = 'idle'; replayState.status = replayState.completed ? 'Playback complete' : 'Stopped'; pendingInput = null
}

/** 结构说明（自动提取）：startReplayPlayback；输入 document；直接调用 normalizeReplayDocument、replayState.frames.splice、replayState.mismatches.splice、resetDeterministicSeed；写入 replayState.mode、replayState.tick、replayState.initialProject、replayState.status 等；返回路径包含 normalized.initialProject。 */ export function startReplayPlayback(document: ReplayDocument): string {
  const normalized = normalizeReplayDocument(document)
  replayState.mode = 'playback'; replayState.tick = 0; replayState.frames.splice(0, replayState.frames.length, ...normalized.frames)
  replayState.mismatches.splice(0); replayState.initialProject = normalized.initialProject; replayState.status = 'Playing'; replayState.completed = false
  resetDeterministicSeed(normalized.seed); pendingInput = null
  return normalized.initialProject
}

/** 结构说明（自动提取）：replayFixedInput；输入 live；直接调用 stopReplay、cloneInput；写入 replayState.completed、pendingInput；返回路径包含 live。 */ export function replayFixedInput(live: InputSnapshot): InputSnapshot {
  if (replayState.mode === 'playback') {
    const frame = replayState.frames[replayState.tick]
    if (!frame) { replayState.completed = true; stopReplay(); return cloneInput(live) }
    pendingInput = cloneInput(frame.input)
    return cloneInput(frame.input)
  }
  pendingInput = cloneInput(live)
  return live
}

/** 结构说明（自动提取）：completeReplayFixedStep；输入 physicsChecksum；直接调用 physicsChecksum.slice、replayState.frames.push、replayState.frames.splice、replayState.mismatches.push、replayState.mismatches.splice 等；写入 replayState.status、pendingInput、replayState.completed。 */ export function completeReplayFixedStep(physicsChecksum: string): void {
  const checksum = physicsChecksum.slice(0, 32)
  if (replayState.mode === 'recording' && pendingInput) {
    replayState.frames.push({ tick: replayState.tick, input: pendingInput, physicsChecksum: checksum })
    if (replayState.frames.length > productionSettings.replay.capacity) replayState.frames.splice(0, replayState.frames.length - productionSettings.replay.capacity)
  } else if (replayState.mode === 'playback') {
    const expected = replayState.frames[replayState.tick]?.physicsChecksum ?? ''
    if (expected && expected !== checksum) {
      replayState.mismatches.push({ tick: replayState.tick, expected, actual: checksum })
      if (replayState.mismatches.length > 256) replayState.mismatches.splice(0, replayState.mismatches.length - 256)
      replayState.status = `Checksum mismatch at tick ${replayState.tick}`
      if (productionSettings.replay.strictChecksums) stopReplay()
    }
  }
  replayState.tick++; pendingInput = null
  if (replayState.mode === 'playback' && replayState.tick >= replayState.frames.length) { replayState.completed = true; stopReplay() }
}

/** 结构说明（自动提取）：exportReplay；输入 tickRate；直接调用 Math.min、Math.max、Number.isFinite、map、replayState.frames.slice。 */ export function exportReplay(tickRate: number): ReplayDocument {
  return {
    format: 'nova-replay', version: 1, engineVersion: NOVA_ENGINE_VERSION, seed: replayState.seed,
    tickRate: Math.min(1_000, Math.max(1, Number.isFinite(tickRate) ? tickRate : 60)), initialProject: replayState.initialProject,
    frames: replayState.frames.slice(0, productionSettings.replay.capacity).map(/** 构造并返回记录 { ...frame, input: cloneInput(frame.input) }，字段按当前实参及捕获状态求值。 */ frame => ({ ...frame, input: cloneInput(frame.input) }))
  }
}

/** 结构说明（自动提取）：normalizeReplayDocument；输入 value；直接调用 Error、map、slice、Array.isArray、Number.isFinite 等；包含显式抛错路径。 */ export function normalizeReplayDocument(value: unknown): ReplayDocument {
  const source = value && typeof value === 'object' ? value as Partial<ReplayDocument> : {}
  if (source.format !== 'nova-replay' || source.version !== 1 || typeof source.initialProject !== 'string') throw new Error('Invalid Nova replay document')
  const frames = (Array.isArray(source.frames) ? source.frames : []).slice(0, 60_000).map(/** 结构说明（自动提取）：map 回调；输入 frame、index；直接调用 cloneInput、item.physicsChecksum.slice。 */ (frame, index) => {
    const item = frame && typeof frame === 'object' ? frame as Partial<ReplayFrame> : {}
    const input = item.input && typeof item.input === 'object' ? item.input : { down: {}, pressed: {}, released: {}, axes: {}, vectors: {}, mousePosition: [0, 0], wheel: [0, 0] }
    return { tick: index, input: cloneInput(input as InputSnapshot), physicsChecksum: typeof item.physicsChecksum === 'string' ? item.physicsChecksum.slice(0, 32) : '' }
  })
  return {
    format: 'nova-replay', version: 1, engineVersion: NOVA_ENGINE_VERSION, seed: Number.isFinite(source.seed) ? Number(source.seed) >>> 0 : productionSettings.replay.seed,
    tickRate: Math.min(1_000, Math.max(1, Number(source.tickRate) || 60)), initialProject: source.initialProject.slice(0, 50_000_000), frames
  }
}
