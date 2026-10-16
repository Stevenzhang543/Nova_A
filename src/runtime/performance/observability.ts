/** Pure observation helpers. CPU work, rAF opportunities and API submission are different measurements. */
export type ObservedMetric = number | null
export type BenchmarkMode = 'quality-locked' | 'adaptive-experience' | 'off'
export const FRAME_INTERVAL_CAPACITY = 600
export interface IntervalStatistics {
  count: number
  averageMs: ObservedMetric
  medianMs: ObservedMetric
  p95Ms: ObservedMetric
  p99Ms: ObservedMetric
  worstMs: ObservedMetric
  onePercentLowFps: ObservedMetric
}

export function intervalStatistics(samples: readonly number[]): IntervalStatistics {
  const sorted = samples.filter(value => Number.isFinite(value) && value > 0).sort((a, b) => a - b)
  if (!sorted.length) return { count: 0, averageMs: null, medianMs: null, p95Ms: null, p99Ms: null, worstMs: null, onePercentLowFps: null }
  const at = (quantile: number) => sorted[Math.floor((sorted.length - 1) * quantile)]
  const slowest = sorted.slice(-Math.ceil(sorted.length * .01))
  return {
    count: sorted.length, averageMs: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    medianMs: at(.5), p95Ms: at(.95), p99Ms: at(.99), worstMs: sorted[sorted.length - 1],
    // Definition: reciprocal of the mean of the slowest ceil(1% * N) observed intervals.
    onePercentLowFps: 1000 / (slowest.reduce((sum, value) => sum + value, 0) / slowest.length)
  }
}

class IntervalRing {
  private readonly values = new Float64Array(FRAME_INTERVAL_CAPACITY)
  private cursor = 0
  private count = 0
  constructor(private readonly allowZero = false) {}
  push(value: number): void { if (!Number.isFinite(value) || value < 0 || (!this.allowZero && value === 0)) return; this.values[this.cursor] = value; this.cursor = (this.cursor + 1) % this.values.length; this.count = Math.min(this.count + 1, this.values.length) }
  snapshot(): number[] { return Array.from(this.values.slice(0, this.count)) }
  clear(): void { this.values.fill(0); this.cursor = this.count = 0 }
}

export interface FrameObservation {
  cpuFrameMs: ObservedMetric
  rafIntervalMs: ObservedMetric
  submissionIntervalMs: ObservedMetric
  inputToSubmitMs: ObservedMetric
  gpuMs: ObservedMetric
}

/** No scheduler or animation loop: owners provide measured timestamps and consumed input identity. */
export class FrameObservability {
  private frameStart: ObservedMetric = null
  private lastRaf: ObservedMetric = null
  private lastSubmission: ObservedMetric = null
  private nextInputSequence = 1
  private readonly inputs = new Map<number, number>()
  private readonly rafIntervals = new IntervalRing()
  private readonly submissionIntervals = new IntervalRing()
  private readonly inputLatencies = new IntervalRing(true)
  readonly current: FrameObservation = { cpuFrameMs: null, rafIntervalMs: null, submissionIntervalMs: null, inputToSubmitMs: null, gpuMs: null }

  begin(cpuStartedAt: number, rafTimestamp?: number): void {
    this.frameStart = Number.isFinite(cpuStartedAt) && cpuStartedAt >= 0 ? cpuStartedAt : null
    this.current.cpuFrameMs = this.current.rafIntervalMs = this.current.submissionIntervalMs = this.current.inputToSubmitMs = null
    if (rafTimestamp === undefined || !Number.isFinite(rafTimestamp) || rafTimestamp < 0) return
    if (this.lastRaf !== null && rafTimestamp <= this.lastRaf) return
    if (this.lastRaf !== null && rafTimestamp > this.lastRaf) {
      this.current.rafIntervalMs = rafTimestamp - this.lastRaf
      this.rafIntervals.push(this.current.rafIntervalMs)
    }
    this.lastRaf = rafTimestamp
  }

  receipt(now: number): number | null {
    if (!Number.isFinite(now) || now < 0) return null
    const sequence = this.nextInputSequence++
    this.inputs.set(sequence, now)
    // Observational retention only; this does not discard any real input event.
    if (this.inputs.size > 256) this.inputs.delete(this.inputs.keys().next().value!)
    return sequence
  }

  /** A viewport releases only receipts it owns; old cleanup cannot erase a replacement viewport's input. */
  forgetInput(sequence: number): void { this.inputs.delete(sequence) }

  submission(now: number, consumedInputSequence?: number): void {
    if (!Number.isFinite(now) || now < 0) return
    this.current.submissionIntervalMs = null
    this.current.inputToSubmitMs = null
    if (this.lastSubmission !== null && now <= this.lastSubmission) return
    if (this.lastSubmission !== null && now > this.lastSubmission) {
      this.current.submissionIntervalMs = now - this.lastSubmission
      this.submissionIntervals.push(this.current.submissionIntervalMs)
    }
    this.lastSubmission = now
    // A timestamp alone cannot prove that this submission contains a particular input.
    const receipt = consumedInputSequence === undefined ? undefined : this.inputs.get(consumedInputSequence)
    if (receipt !== undefined && now >= receipt) {
      this.current.inputToSubmitMs = now - receipt
      this.inputLatencies.push(this.current.inputToSubmitMs)
      this.inputs.delete(consumedInputSequence!)
    }
  }

  complete(now: number): FrameObservation {
    this.current.cpuFrameMs = this.frameStart !== null && Number.isFinite(now) && now >= this.frameStart ? now - this.frameStart : null
    this.frameStart = null
    return { ...this.current }
  }
  rafStatistics(): IntervalStatistics { return intervalStatistics(this.rafIntervals.snapshot()) }
  submissionStatistics(): IntervalStatistics { return intervalStatistics(this.submissionIntervals.snapshot()) }
  latencyPercentile(quantile = .95): ObservedMetric {
    const values = this.inputLatencies.snapshot().sort((a, b) => a - b)
    return values.length ? values[Math.floor((values.length - 1) * Math.max(0, Math.min(1, Number.isFinite(quantile) ? quantile : .95)))] : null
  }
  /** Hidden time is outside a frame interval; historical measured slow frames remain in their rings. */
  rebaseFrameContinuity(): void {
    this.frameStart = this.lastRaf = this.lastSubmission = null
    Object.assign(this.current, { cpuFrameMs: null, rafIntervalMs: null, submissionIntervalMs: null, inputToSubmitMs: null, gpuMs: null })
  }
  reset(): void {
    this.frameStart = this.lastRaf = this.lastSubmission = null
    this.inputs.clear(); this.rafIntervals.clear(); this.submissionIntervals.clear(); this.inputLatencies.clear()
    Object.assign(this.current, { cpuFrameMs: null, rafIntervalMs: null, submissionIntervalMs: null, inputToSubmitMs: null, gpuMs: null })
  }
}

export interface ObservedInputReceiptIdentity { readonly inputEpoch: number; readonly sequence: number; readonly receivedAtMs: number }
export interface ObservedInputSampleIdentity {
  readonly inputEpoch: number
  readonly receipts: readonly ObservedInputReceiptIdentity[]
  readonly latestReceipt: ObservedInputReceiptIdentity
}

/** A profiling viewport owns its tokens. Runtime consumption, not a DOM timestamp alone, selects the candidate. */
export class InputReceiptTokenMap {
  private readonly tokens = new Map<string, number>()
  private candidate: number | undefined
  private epoch: number | null = null
  private disposed = false
  constructor(private readonly mark: (atMs: number) => number | null, private readonly forget: (token: number) => void) {}
  private key(receipt: ObservedInputReceiptIdentity): string | null {
    return Number.isSafeInteger(receipt.inputEpoch) && receipt.inputEpoch > 0 && Number.isSafeInteger(receipt.sequence) && receipt.sequence > 0
      && Number.isFinite(receipt.receivedAtMs) && receipt.receivedAtMs >= 0 ? `${receipt.inputEpoch}:${receipt.sequence}` : null
  }
  receipt(receipt: ObservedInputReceiptIdentity): void {
    if (this.disposed || this.epoch !== receipt.inputEpoch) return
    const key = this.key(receipt)
    if (key === null || this.tokens.has(key)) return
    const token = this.mark(receipt.receivedAtMs)
    if (token === null) return
    this.tokens.set(key, token)
    if (this.retainedReceipts > 256) {
      const oldest = this.tokens.keys().next().value!
      this.forget(this.tokens.get(oldest)!); this.tokens.delete(oldest)
    }
  }
  reset(inputEpoch: number): void {
    if (this.disposed) return
    if (this.candidate !== undefined) this.release(this.candidate)
    for (const token of this.tokens.values()) this.forget(token)
    this.tokens.clear()
    this.epoch = Number.isSafeInteger(inputEpoch) && inputEpoch > 0 ? inputEpoch : null
  }
  /** Returns one latest actually consumed receipt; all other consumed receipts are released, never reused. */
  consumeLatest(sample: ObservedInputSampleIdentity | null): number | undefined {
    if (this.candidate !== undefined) this.release(this.candidate)
    if (this.disposed || sample === null || sample.inputEpoch !== this.epoch || sample.latestReceipt.inputEpoch !== this.epoch) return undefined
    const latestKey = this.key(sample.latestReceipt)
    let candidate: number | undefined
    for (const receipt of sample.receipts) {
      if (receipt.inputEpoch !== this.epoch) continue
      const key = this.key(receipt)
      if (key === null) continue
      const token = this.tokens.get(key)
      if (token === undefined) continue
      this.tokens.delete(key)
      if (key === latestKey) candidate = token
      else this.forget(token)
    }
    this.candidate = candidate
    return candidate
  }
  /** The caller releases the candidate even when rendering is deferred, throws or is cancelled. */
  release(token: number): void { if (this.candidate !== token) return; this.forget(token); this.candidate = undefined }
  get retainedReceipts(): number { return this.tokens.size + (this.candidate === undefined ? 0 : 1) }
  dispose(): void { if (this.disposed) return; this.reset(0); this.disposed = true }
}

/** Legacy fields remain in archived JSON but cannot certify corrected measurement semantics. */
export function migrateFrameObservation(frame: Record<string, unknown>): FrameObservation {
  const metric = (key: string, interval = false): ObservedMetric => typeof frame[key] === 'number' && Number.isFinite(frame[key]) && (interval ? frame[key] > 0 : frame[key] >= 0) ? frame[key] as number : null
  return { cpuFrameMs: metric('cpuFrameMs'), rafIntervalMs: metric('rafIntervalMs', true), submissionIntervalMs: metric('submissionIntervalMs', true), inputToSubmitMs: metric('inputToSubmitMs'), gpuMs: metric('gpuMs') }
}
