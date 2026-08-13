import { reactive } from 'vue'

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
}

const EMPTY: FrameProfile = {
  frame: 0, timestamp: 0, frameMs: 0, physicsMs: 0, renderingMs: 0, scriptsMs: 0,
  animationMs: 0, audioMs: 0, assetsMs: 0, otherMs: 0, fps: 0, memoryMb: null
}

export const profilerState = reactive({
  enabled: true,
  frozen: false,
  current: { ...EMPTY },
  samples: [] as FrameProfile[],
  capacity: 180
})

export function recordFrameProfile(sample: Omit<FrameProfile, 'frame' | 'timestamp'>): void {
  if (!profilerState.enabled || profilerState.frozen) return
  const next: FrameProfile = { ...sample, frame: profilerState.current.frame + 1, timestamp: performance.now() }
  Object.assign(profilerState.current, next)
  profilerState.samples.push(next)
  if (profilerState.samples.length > profilerState.capacity) profilerState.samples.splice(0, profilerState.samples.length - profilerState.capacity)
}

export function clearProfiler(): void {
  profilerState.samples.splice(0)
  Object.assign(profilerState.current, EMPTY)
}
