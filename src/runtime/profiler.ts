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
  capacity: 180
})

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
  Object.assign(profilerState.current, EMPTY)
}
