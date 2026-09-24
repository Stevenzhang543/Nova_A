/** 运行性能采样：记录时间和计数指标，维护有界采样数据供性能面板使用。 */
import { reactive, toRaw } from 'vue'
import { productionSettings } from './production'
import { NOVA_ENGINE_VERSION } from '../projects/projectFormat'

export interface FrameProfile {
  frame: number
  timestamp: number
  frameMs: number
  physicsMs: number
  renderingMs: number
  scriptsMs: number
  animationMs: number
  audioMs: number
  assetsMs: number
  otherMs: number
  fps: number
  memoryMb: number | null
  inputMs: number
  allocations: number
  gpuPasses: number
  assetJobs: number
  mainThreadMs: number
  workerMs: number
  queueWaitMs: number
  cacheHitRate: number
  worstFrameMs: number
  onePercentLowFps: number
  inputToPixelMs: number
}
export interface ScriptFunctionProfile {
  scriptUuid: string
  scriptName: string
  functionName: string
  calls: number
  totalMs: number
  lastMs: number
  maximumMs: number
  allocationEstimateBytes: number
}

export interface ScriptProfileCapture {
  format: 'nova-script-profile'
  version: 1
  engineVersion: string
  createdAt: string
  entries: ScriptFunctionProfile[]
}
export interface ProfilerMarker { id: number; frame: number; name: string; category: string; startMs: number; durationMs: number; detail: string }
export interface ProfilerCounter { frame: number; name: string; value: number; unit: string }
export interface ProfilerAnnotation { frame: number; createdAt: string; text: string }

const EMPTY: FrameProfile = {
  frame: 0, timestamp: 0, frameMs: 0, physicsMs: 0, renderingMs: 0, scriptsMs: 0,
  animationMs: 0, audioMs: 0, assetsMs: 0, otherMs: 0, fps: 0, memoryMb: null,
  inputMs: 0, allocations: 0, gpuPasses: 0, assetJobs: 0, mainThreadMs: 0, workerMs: 0,
  queueWaitMs: 0, cacheHitRate: 1, worstFrameMs: 0, onePercentLowFps: 0, inputToPixelMs: 0
}

export const profilerState = reactive({
  enabled: true,
  frozen: false,
  current: { ...EMPTY },
  samples: [] as FrameProfile[],
  scriptFunctions: [] as ScriptFunctionProfile[],
  scriptCaptures: [] as ScriptProfileCapture[],
  markers: [] as ProfilerMarker[],
  counters: [] as ProfilerCounter[],
  annotations: [] as ProfilerAnnotation[],
  // Full tracing remains available on demand. The normal editor records a
  // representative frame sample without allocating per-subsystem markers on
  // every animation frame.
  overheadMode: 'Low overhead' as 'Full' | 'Low overhead' | 'Off',
  estimatedOverheadPercent: 0,
  remotePeer: '' as string,
  capacity: 180
})

const functionProfiles = new Map<string, ScriptFunctionProfile>()
let markerSerial = 1
let captureGeneration = 0

/** 在采样启用时捕获时间和代次，返回只能记录一次且跨清空失效的结束回调。 */ export function beginProfilerMarker(name: string, category = 'custom', detail = ''): () => void {
  if (!profilerState.enabled || profilerState.frozen || profilerState.overheadMode === 'Off') return /* 返回 undefined 的当前值。 */ () => undefined
  const start = performance.now(), frame = profilerState.current.frame, generation = captureGeneration
  let completed = false
  return /** 校验标记仍属于当前采样代次，记录有界名称、耗时和帧信息，并限制标记缓存数量。 */ () => { if (completed || generation !== captureGeneration || !profilerState.enabled || profilerState.frozen || profilerState.overheadMode === 'Off') return; completed = true; const marker: ProfilerMarker = { id: markerSerial++, frame, name: name.slice(0, 120), category: category.slice(0, 80), startMs: start, durationMs: Math.max(0, performance.now() - start), detail: detail.slice(0, 500) }; profilerState.markers.push(marker); if (profilerState.markers.length > 10_000) profilerState.markers = toRaw(profilerState.markers).slice(-10_000) }
}
/** 采样允许且数值有限时追加计数器，保留最近一万条记录。 */ export function recordProfilerCounter(name: string, value: number, unit = ''): void { if (!profilerState.enabled || profilerState.frozen || !Number.isFinite(value) || profilerState.overheadMode === 'Off') return; profilerState.counters.push({ frame: profilerState.current.frame, name: name.slice(0, 120), value, unit: unit.slice(0, 24) }); if (profilerState.counters.length > 10_000) profilerState.counters = toRaw(profilerState.counters).slice(-10_000) }
/** 截取非空批注并记录当前帧及时间，按现有数组策略保留最多一百二十八条。 */ export function addProfilerAnnotation(text: string): void { const value = text.trim().slice(0, 500); if (!value) return; profilerState.annotations.push({ frame: profilerState.current.frame, createdAt: new Date().toISOString(), text: value }); profilerState.annotations.splice(128) }

/** 按脚本和函数累计调用、耗时及估计分配量，按总耗时更新前两千条展示记录。 */ export function recordScriptFunction(scriptUuid: string, scriptName: string, functionName: string, durationMs: number, allocationEstimateBytes: number): void {
  if (!profilerState.enabled || profilerState.frozen || !Number.isFinite(durationMs)) return
  const key = `${scriptUuid}:${functionName}`
  const item = functionProfiles.get(key) ?? { scriptUuid, scriptName, functionName, calls: 0, totalMs: 0, lastMs: 0, maximumMs: 0, allocationEstimateBytes: 0 }
  item.calls++; item.lastMs = Math.max(0, durationMs); item.totalMs += item.lastMs; item.maximumMs = Math.max(item.maximumMs, item.lastMs); item.allocationEstimateBytes += Math.max(0, Math.round(allocationEstimateBytes))
  functionProfiles.set(key, item)
  const values = [...functionProfiles.values()].sort(/* 计算表达式 second.totalMs - first.totalMs 并返回结果，沿用操作数的原有类型规则。 */ (first, second) => second.totalMs - first.totalMs).slice(0, 2_000)
  profilerState.scriptFunctions.splice(0, profilerState.scriptFunctions.length, ...values)
}

/** 复制当前函数统计为带版本的捕获记录，保留最近十六次。 */ export function captureScriptProfile(engineVersion = NOVA_ENGINE_VERSION): ScriptProfileCapture {
  const capture: ScriptProfileCapture = { format: 'nova-script-profile', version: 1, engineVersion, createdAt: new Date().toISOString(), entries: profilerState.scriptFunctions.map(/** 构造并返回记录 { ...item }，字段按当前实参及捕获状态求值。 */ item => ({ ...item })) }
  profilerState.scriptCaptures.push(capture)
  if (profilerState.scriptCaptures.length > 16) profilerState.scriptCaptures.splice(0, profilerState.scriptCaptures.length - 16)
  return capture
}

/** 合并两个捕获的函数身份，计算调用、耗时和分配差异，按耗时变化绝对值降序排列。 */ export function compareScriptProfiles(first: ScriptProfileCapture, second: ScriptProfileCapture): Array<{ key: string; callsDelta: number; totalMsDelta: number; allocationDelta: number }> {
  const keys = new Set([...first.entries, ...second.entries].map(/** 按模板 `${item.scriptUuid}:${item.functionName}` 生成并返回字符串。 */ item => `${item.scriptUuid}:${item.functionName}`))
  return [...keys].map(/** 找到同一函数前后统计，缺失按零处理并返回三类差值。 */ key => {
    const before = first.entries.find(/* 比较 `${item.scriptUuid}:${item.functionName}` 与 key，返回严格相等的判断结果。 */ item => `${item.scriptUuid}:${item.functionName}` === key), after = second.entries.find(/* 比较 `${item.scriptUuid}:${item.functionName}` 与 key，返回严格相等的判断结果。 */ item => `${item.scriptUuid}:${item.functionName}` === key)
    return { key, callsDelta: (after?.calls ?? 0) - (before?.calls ?? 0), totalMsDelta: (after?.totalMs ?? 0) - (before?.totalMs ?? 0), allocationDelta: (after?.allocationEstimateBytes ?? 0) - (before?.allocationEstimateBytes ?? 0) }
  }).sort(/* 计算表达式 Math.abs(b.totalMsDelta) - Math.abs(a.totalMsDelta) 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => Math.abs(b.totalMsDelta) - Math.abs(a.totalMsDelta))
}

/** 记录当前帧及环形历史，完整模式生成分阶段标记，附加计数器并根据容量限制内存。 */ export function recordFrameProfile(sample: Omit<FrameProfile, 'frame' | 'timestamp' | 'inputMs' | 'allocations' | 'gpuPasses' | 'assetJobs' | 'mainThreadMs' | 'workerMs' | 'queueWaitMs' | 'cacheHitRate' | 'worstFrameMs' | 'onePercentLowFps' | 'inputToPixelMs'> & Partial<Pick<FrameProfile, 'inputMs' | 'allocations' | 'gpuPasses' | 'assetJobs' | 'mainThreadMs' | 'workerMs' | 'queueWaitMs' | 'cacheHitRate' | 'worstFrameMs' | 'onePercentLowFps' | 'inputToPixelMs'>>): FrameProfile | null {
  if (!profilerState.enabled || profilerState.frozen || profilerState.overheadMode === 'Off') return null
  const next: FrameProfile = { inputMs: 0, allocations: 0, gpuPasses: 0, assetJobs: 0, mainThreadMs: 0, workerMs: 0, queueWaitMs: 0, cacheHitRate: 1, worstFrameMs: 0, onePercentLowFps: 0, inputToPixelMs: 0, ...sample, frame: profilerState.current.frame + 1, timestamp: performance.now() }
  Object.assign(profilerState.current, next)
  profilerState.samples.push(next)
  if (profilerState.overheadMode === 'Full') {
    let cursor = next.timestamp - next.frameMs
    for (const [name, duration] of [['input', next.inputMs], ['physics', next.physicsMs], ['scripts', next.scriptsMs], ['animation', next.animationMs], ['audio', next.audioMs], ['rendering', next.renderingMs], ['assets', next.assetsMs], ['other', next.otherMs]] as Array<[string, number]>) { if (duration > 0) profilerState.markers.push({ id: markerSerial++, frame: next.frame, name, category: 'frame', startMs: cursor, durationMs: duration, detail: `Frame ${next.frame}` }); cursor += duration }
    if (profilerState.markers.length > 10_000) profilerState.markers = toRaw(profilerState.markers).slice(-10_000)
  }
  profilerState.counters.push({ frame: next.frame, name: 'fps', value: next.fps, unit: 'Hz' }, { frame: next.frame, name: 'allocations', value: next.allocations, unit: 'count' }, { frame: next.frame, name: 'gpuPasses', value: next.gpuPasses, unit: 'count' }); if (next.memoryMb !== null) profilerState.counters.push({ frame: next.frame, name: 'memory', value: next.memoryMb, unit: 'MB' }); if (profilerState.counters.length > 10_000) profilerState.counters = toRaw(profilerState.counters).slice(-10_000)
  profilerState.estimatedOverheadPercent = profilerState.overheadMode === 'Full' ? Math.min(25, .25 + profilerState.markers.length / 50_000 + profilerState.counters.length / 100_000) : .08
  profilerState.capacity = productionSettings.performance.traceCapacity
  if (profilerState.samples.length > profilerState.capacity) profilerState.samples = toRaw(profilerState.samples).slice(-profilerState.capacity)
  return next
}

/** 递增捕获代次使未结束标记失效，清空样本、函数统计、标记、计数器和批注。 */ export function clearProfiler(): void {
  captureGeneration++
  profilerState.samples.splice(0)
  profilerState.scriptFunctions.splice(0)
  profilerState.markers.splice(0); profilerState.counters.splice(0); profilerState.annotations.splice(0)
  functionProfiles.clear()
  Object.assign(profilerState.current, EMPTY)
}
