/** Bounded, opt-in trace retention; no DOM, reactive state or independent clock. */
import type { FrameObservation } from './observability'

export interface PerformanceTraceSample extends FrameObservation { sequence: number; observedAtMs: number }
export interface PerformanceTraceBatch { schemaVersion: 1; samples: PerformanceTraceSample[]; droppedSamples: number; producedSamples: number; queuedBytes: number }
export class PerformanceBenchmarkTrace {
  private queue: Array<{ sample: PerformanceTraceSample; bytes: number }> = []
  private queuedBytes = 0
  private sequence = 0
  private dropped = 0
  private disposed = false
  readonly maxSamples: number
  readonly maxBytes: number
  constructor(maxSamples = 8192, maxBytes = 1024 * 1024) {
    this.maxSamples = Number.isFinite(maxSamples) ? Math.max(1, Math.min(65536, Math.floor(maxSamples))) : 8192
    this.maxBytes = Number.isFinite(maxBytes) ? Math.max(256, Math.min(8 * 1024 * 1024, Math.floor(maxBytes))) : 1024 * 1024
  }
  push(observation: Readonly<FrameObservation>, observedAtMs: number): void {
    if (this.disposed || !Number.isFinite(observedAtMs) || observedAtMs < 0) return
    const metric = (value: number | null, interval = false) => value !== null && Number.isFinite(value) && (interval ? value > 0 : value >= 0) ? value : null
    const sample = { sequence: ++this.sequence, observedAtMs, cpuFrameMs: metric(observation.cpuFrameMs), rafIntervalMs: metric(observation.rafIntervalMs, true), submissionIntervalMs: metric(observation.submissionIntervalMs, true), inputToSubmitMs: metric(observation.inputToSubmitMs), gpuMs: metric(observation.gpuMs) }
    const bytes = JSON.stringify(sample).length * 2
    while (this.queue.length && (this.queue.length >= this.maxSamples || this.queuedBytes + bytes > this.maxBytes)) { this.queuedBytes -= this.queue.shift()!.bytes; this.dropped++ }
    if (bytes > this.maxBytes) { this.dropped++; return }
    this.queue.push({ sample, bytes }); this.queuedBytes += bytes
  }
  drain(maximum = 512): PerformanceTraceBatch {
    const count = Number.isFinite(maximum) ? Math.max(0, Math.min(8192, Math.floor(maximum))) : 512
    const rows = this.queue.splice(0, count)
    for (const row of rows) this.queuedBytes -= row.bytes
    return { schemaVersion: 1, samples: rows.map(row => ({ ...row.sample })), droppedSamples: this.dropped, producedSamples: this.sequence, queuedBytes: this.queuedBytes }
  }
  get snapshot() { return Object.freeze({ queuedSamples: this.queue.length, queuedBytes: this.queuedBytes, droppedSamples: this.dropped, producedSamples: this.sequence, disposed: this.disposed }) }
  dispose(): void { this.disposed = true; this.queue = []; this.queuedBytes = 0 }
}
