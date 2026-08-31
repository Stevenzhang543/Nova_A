import { reactive } from 'vue'
import { productionSettings } from './production'

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
  inputMs: 0, allocations: 0, gpuPasses: 0, assetJobs: 0
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

export function beginProfilerMarker(name: string, category = 'custom', detail = ''): () => void {
  if (!profilerState.enabled || profilerState.frozen || profilerState.overheadMode === 'Off') return () => undefined
  const start = performance.now(), frame = profilerState.current.frame
  return () => { const marker: ProfilerMarker = { id: markerSerial++, frame, name: name.slice(0, 120), category: category.slice(0, 80), startMs: start, durationMs: Math.max(0, performance.now() - start), detail: detail.slice(0, 500) }; profilerState.markers.push(marker); if (profilerState.markers.length > 10_000) profilerState.markers.splice(0, profilerState.markers.length - 10_000) }
}
export function recordProfilerCounter(name: string, value: number, unit = ''): void { if (!Number.isFinite(value) || profilerState.overheadMode === 'Off') return; profilerState.counters.push({ frame: profilerState.current.frame, name: name.slice(0, 120), value, unit: unit.slice(0, 24) }); if (profilerState.counters.length > 10_000) profilerState.counters.splice(0, profilerState.counters.length - 10_000) }
export function addProfilerAnnotation(text: string): void { const value = text.trim().slice(0, 500); if (!value) return; profilerState.annotations.push({ frame: profilerState.current.frame, createdAt: new Date().toISOString(), text: value }); profilerState.annotations.splice(128) }

export function recordScriptFunction(scriptUuid: string, scriptName: string, functionName: string, durationMs: number, allocationEstimateBytes: number): void {
  if (!profilerState.enabled || profilerState.frozen || !Number.isFinite(durationMs)) return
  const key = `${scriptUuid}:${functionName}`
  const item = functionProfiles.get(key) ?? { scriptUuid, scriptName, functionName, calls: 0, totalMs: 0, lastMs: 0, maximumMs: 0, allocationEstimateBytes: 0 }
  item.calls++; item.lastMs = Math.max(0, durationMs); item.totalMs += item.lastMs; item.maximumMs = Math.max(item.maximumMs, item.lastMs); item.allocationEstimateBytes += Math.max(0, Math.round(allocationEstimateBytes))
  functionProfiles.set(key, item)
  const values = [...functionProfiles.values()].sort((first, second) => second.totalMs - first.totalMs).slice(0, 2_000)
  profilerState.scriptFunctions.splice(0, profilerState.scriptFunctions.length, ...values)
}

export function captureScriptProfile(engineVersion = '6.4.0'): ScriptProfileCapture {
  const capture: ScriptProfileCapture = { format: 'nova-script-profile', version: 1, engineVersion, createdAt: new Date().toISOString(), entries: profilerState.scriptFunctions.map(item => ({ ...item })) }
  profilerState.scriptCaptures.push(capture)
  if (profilerState.scriptCaptures.length > 16) profilerState.scriptCaptures.splice(0, profilerState.scriptCaptures.length - 16)
  return capture
}

export function compareScriptProfiles(first: ScriptProfileCapture, second: ScriptProfileCapture): Array<{ key: string; callsDelta: number; totalMsDelta: number; allocationDelta: number }> {
  const keys = new Set([...first.entries, ...second.entries].map(item => `${item.scriptUuid}:${item.functionName}`))
  return [...keys].map(key => {
    const before = first.entries.find(item => `${item.scriptUuid}:${item.functionName}` === key), after = second.entries.find(item => `${item.scriptUuid}:${item.functionName}` === key)
    return { key, callsDelta: (after?.calls ?? 0) - (before?.calls ?? 0), totalMsDelta: (after?.totalMs ?? 0) - (before?.totalMs ?? 0), allocationDelta: (after?.allocationEstimateBytes ?? 0) - (before?.allocationEstimateBytes ?? 0) }
  }).sort((a, b) => Math.abs(b.totalMsDelta) - Math.abs(a.totalMsDelta))
}

export function recordFrameProfile(sample: Omit<FrameProfile, 'frame' | 'timestamp' | 'inputMs' | 'allocations' | 'gpuPasses' | 'assetJobs'> & Partial<Pick<FrameProfile, 'inputMs' | 'allocations' | 'gpuPasses' | 'assetJobs'>>): FrameProfile | null {
  if (!profilerState.enabled || profilerState.frozen || profilerState.overheadMode === 'Off') return null
  const next: FrameProfile = { inputMs: 0, allocations: 0, gpuPasses: 0, assetJobs: 0, ...sample, frame: profilerState.current.frame + 1, timestamp: performance.now() }
  Object.assign(profilerState.current, next)
  profilerState.samples.push(next)
  if (profilerState.overheadMode === 'Full') {
    let cursor = next.timestamp - next.frameMs
    for (const [name, duration] of [['input', next.inputMs], ['physics', next.physicsMs], ['scripts', next.scriptsMs], ['animation', next.animationMs], ['audio', next.audioMs], ['rendering', next.renderingMs], ['assets', next.assetsMs], ['other', next.otherMs]] as Array<[string, number]>) { if (duration > 0) profilerState.markers.push({ id: markerSerial++, frame: next.frame, name, category: 'frame', startMs: cursor, durationMs: duration, detail: `Frame ${next.frame}` }); cursor += duration }
    if (profilerState.markers.length > 10_000) profilerState.markers.splice(0, profilerState.markers.length - 10_000)
  }
  profilerState.counters.push({ frame: next.frame, name: 'fps', value: next.fps, unit: 'Hz' }, { frame: next.frame, name: 'allocations', value: next.allocations, unit: 'count' }, { frame: next.frame, name: 'gpuPasses', value: next.gpuPasses, unit: 'count' }); if (next.memoryMb !== null) profilerState.counters.push({ frame: next.frame, name: 'memory', value: next.memoryMb, unit: 'MB' }); if (profilerState.counters.length > 10_000) profilerState.counters.splice(0, profilerState.counters.length - 10_000)
  profilerState.estimatedOverheadPercent = profilerState.overheadMode === 'Full' ? Math.min(25, .25 + profilerState.markers.length / 50_000 + profilerState.counters.length / 100_000) : .08
  profilerState.capacity = productionSettings.performance.traceCapacity
  if (profilerState.samples.length > profilerState.capacity) profilerState.samples.splice(0, profilerState.samples.length - profilerState.capacity)
  return next
}

export function clearProfiler(): void {
  profilerState.samples.splice(0)
  profilerState.scriptFunctions.splice(0)
  profilerState.markers.splice(0); profilerState.counters.splice(0); profilerState.annotations.splice(0)
  functionProfiles.clear()
  Object.assign(profilerState.current, EMPTY)
}
