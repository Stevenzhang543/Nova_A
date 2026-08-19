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
  capacity: 180
})

const functionProfiles = new Map<string, ScriptFunctionProfile>()

export function recordScriptFunction(scriptUuid: string, scriptName: string, functionName: string, durationMs: number, allocationEstimateBytes: number): void {
  if (!profilerState.enabled || profilerState.frozen || !Number.isFinite(durationMs)) return
  const key = `${scriptUuid}:${functionName}`
  const item = functionProfiles.get(key) ?? { scriptUuid, scriptName, functionName, calls: 0, totalMs: 0, lastMs: 0, maximumMs: 0, allocationEstimateBytes: 0 }
  item.calls++; item.lastMs = Math.max(0, durationMs); item.totalMs += item.lastMs; item.maximumMs = Math.max(item.maximumMs, item.lastMs); item.allocationEstimateBytes += Math.max(0, Math.round(allocationEstimateBytes))
  functionProfiles.set(key, item)
  const values = [...functionProfiles.values()].sort((first, second) => second.totalMs - first.totalMs).slice(0, 2_000)
  profilerState.scriptFunctions.splice(0, profilerState.scriptFunctions.length, ...values)
}

export function captureScriptProfile(engineVersion = '4.0.0'): ScriptProfileCapture {
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
  if (!profilerState.enabled || profilerState.frozen) return null
  const next: FrameProfile = { inputMs: 0, allocations: 0, gpuPasses: 0, assetJobs: 0, ...sample, frame: profilerState.current.frame + 1, timestamp: performance.now() }
  Object.assign(profilerState.current, next)
  profilerState.samples.push(next)
  profilerState.capacity = productionSettings.performance.traceCapacity
  if (profilerState.samples.length > profilerState.capacity) profilerState.samples.splice(0, profilerState.samples.length - profilerState.capacity)
  return next
}

export function clearProfiler(): void {
  profilerState.samples.splice(0)
  profilerState.scriptFunctions.splice(0)
  functionProfiles.clear()
  Object.assign(profilerState.current, EMPTY)
}
