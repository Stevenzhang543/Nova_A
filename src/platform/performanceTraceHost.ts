/** Explicit profiling host bridge. Metadata and observations are injected by their actual owners. */
import { PerformanceBenchmarkTrace } from '../runtime/performance/benchmarkTrace'
import type { FrameObservation, BenchmarkMode } from '../runtime/performance/observability'

export interface PerformanceTraceMetadata {
  contentHash: string
  qualitySignature: string
  actualBenchmarkMode: BenchmarkMode
  buildId: string
  backend: string
  executionMode: string
  wasmVariant: string
  environment: Record<string, unknown>
}
export interface PerformanceTraceHostOptions {
  target: Record<string, unknown>
  subscribe: (listener: (observation: Readonly<FrameObservation>, observedAtMs: number) => void) => () => void
  metadata: () => PerformanceTraceMetadata
  profilingEnabled?: boolean
  maxSamples?: number
  maxBytes?: number
}

/** Returned cleanup removes only this installation; the hook never changes runtime configuration. */
export function installPerformanceTraceHost(options: PerformanceTraceHostOptions): () => void {
  const enabled = options.profilingEnabled ?? import.meta.env.VITE_NOVA_PERFORMANCE_TRACE === '1'
  if (!enabled || options.target.novaPerformanceDiagnosticsV1 !== undefined) return () => {}
  const trace = new PerformanceBenchmarkTrace(options.maxSamples, options.maxBytes)
  const unsubscribe = options.subscribe((observation, now) => trace.push(observation, now))
  let disposed = false
  const api = Object.freeze({
    schemaVersion: 1,
    metadata: () => { if (disposed) throw new Error('Performance diagnostics disposed'); return structuredClone(options.metadata()) },
    snapshot: () => trace.snapshot,
    drain: (maximum?: number) => trace.drain(maximum),
    scope: 'CPU owner observations and API submission timestamps. GPU/display/input flow without evidence remains null.'
  })
  options.target.novaPerformanceDiagnosticsV1 = api
  return () => {
    if (disposed) return
    disposed = true
    try { unsubscribe() }
    finally {
      trace.dispose()
      if (options.target.novaPerformanceDiagnosticsV1 === api) delete options.target.novaPerformanceDiagnosticsV1
    }
  }
}
