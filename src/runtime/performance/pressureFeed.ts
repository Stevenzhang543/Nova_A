import type { PerformanceCoordinator } from './coordinator'
import type { FrameObservation } from './observability'

type Subscribe = (listener: (sample: Readonly<FrameObservation>, observedAtMs: number) => void) => () => void
/** Bounded passive windows on the existing owner loop; overlap is a conservative admission hint, not proof of CPU causation. */
export function installPressureObservationFeed(coordinator: PerformanceCoordinator, subscribe: Subscribe,
  backgroundActive: () => boolean): () => void {
  const cpu: number[] = [], intervals: number[] = []
  let windowStart: number | null = null, lastTimestamp: number | null = null, overlapSamples = 0, closed = false
  const reset = () => { cpu.length = intervals.length = 0; overlapSamples = 0; windowStart = null }
  const quantile = (values: number[], fraction: number): number | null => {
    if (!values.length) return null
    const ordered = values.slice().sort((a, b) => a - b)
    return ordered[Math.floor((ordered.length - 1) * fraction)]
  }
  const unsubscribe = subscribe((sample, observedAtMs) => {
    if (closed || !Number.isFinite(observedAtMs) || observedAtMs < 0) return
    if (coordinator.snapshot.mode === 'hidden') { reset(); lastTimestamp = observedAtMs; return }
    if (lastTimestamp !== null && (observedAtMs <= lastTimestamp || observedAtMs - lastTimestamp > 2000)) reset()
    lastTimestamp = observedAtMs; windowStart ??= observedAtMs
    if (sample.cpuFrameMs !== null && Number.isFinite(sample.cpuFrameMs) && sample.cpuFrameMs >= 0 && cpu.length < 600) cpu.push(sample.cpuFrameMs)
    if (sample.rafIntervalMs !== null && Number.isFinite(sample.rafIntervalMs) && sample.rafIntervalMs > 0 && sample.rafIntervalMs <= 1000 && intervals.length < 600) intervals.push(sample.rafIntervalMs)
    if (backgroundActive()) overlapSamples++
    if (observedAtMs - windowStart < 1000) return
    // GPU execution and identity-linked input queue latency are unavailable on this observation path.
    coordinator.observe({ observedAtMs, framePeriodMs: intervals.length >= 2 ? quantile(intervals, .5) : null,
      ownerCpuP95Ms: cpu.length >= 2 ? quantile(cpu, .95) : null, inputQueueP95Ms: null, gpuP95Ms: null,
      backgroundContended: overlapSamples >= 2 })
    reset(); windowStart = observedAtMs
  })
  return () => { if (closed) return; closed = true; unsubscribe(); reset() }
}
