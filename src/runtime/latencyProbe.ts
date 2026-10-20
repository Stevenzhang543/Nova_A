/**
 * Opt-in latency probe. Off unless a loopback collector endpoint is supplied (desktop: the
 * NOVA_LATENCY_PROBE environment variable read by the native host; Web: ?latencyProbe=…).
 *
 * It follows one input through the real path and records, on this page's performance clock:
 *   received  – the app's input handler ran (Runtime InputManager or the editor viewport)
 *   consumed  – the Runtime fixed step that consumed the edge, or the editor command that applied the drag
 *   submitted – the WebGL2 world submission (flush) of the first frame rendered after consumption
 * plus per-frame timing. Records stay in bounded memory and are posted in batches about once a
 * second, never per frame. "submitted" is a command submission, not a present or a lit pixel.
 */
export type ProbeInputKind = 'key' | 'mouse-button' | 'editor-drag'
export interface ProbeInputRecord {
  id: number
  kind: ProbeInputKind
  code: string
  down: boolean
  eventTimeStamp: number | null
  receivedAt: number
  consumedAt: number | null
  consumedStage: 'fixed-step' | 'editor-command' | null
  consumedTick: number | null
  coalesced: number
  frameRenderStartAt: number | null
  submittedAt: number | null
  submittedFrame: number | null
}
export interface ProbeFrameRecord {
  frame: number
  rafTime: number | null
  cpuStart: number
  simulationEnd: number
  renderStart: number
  submittedAt: number | null
  deferred: boolean
  gpuMs: number | null
  fixedSteps: number
}

const MAX_PENDING = 4096
const MAX_BATCH_FRAMES = 4096

/** 26.44: how batches reach the collector. The desktop host passes them through native code (browser
 * network policies such as WebView2's Local Network Access checks dropped direct requests in 26.43);
 * the Web build uses fetch. */
export type LatencyProbeTransport = (path: '/sync' | '/probe', body: string | null) => Promise<string>

class LatencyProbe {
  enabled = false
  endpoint = ''
  label = ''
  private transport: LatencyProbeTransport | null = null
  /** Requests that failed (collector gone or blocked); reported with the next batch that gets through. */
  private failures = 0
  /** 26.42 P-E3: context attributes reported with every batch (for example whether the canvas is desynchronized). */
  readonly context: Record<string, string | number | boolean | null> = {}
  private nextId = 1
  private frameSerial = 0
  private pending: ProbeInputRecord[] = []
  private completed: ProbeInputRecord[] = []
  private frames: ProbeFrameRecord[] = []
  private dropped = 0
  private flushes = 0
  private syncs: Array<{ t0: number; t1: number; collector: number }> = []

  /** Enables the probe only for a loopback HTTP collector. */
  configure(endpoint: string, label: string, transport?: LatencyProbeTransport): boolean {
    let url: URL
    try { url = new URL(endpoint) } catch { return false }
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return false
    this.endpoint = url.origin
    this.label = label.slice(0, 80)
    this.transport = transport ?? (async (path, body) => {
      const response = await fetch(`${this.endpoint}${path}`, body === null ? { cache: 'no-store' } : { method: 'POST', body, headers: { 'content-type': 'application/json' } })
      if (!response.ok) throw new Error(`collector answered ${response.status}`)
      return response.text()
    })
    this.enabled = true
    void this.synchronizeClock()
    setInterval(() => { void this.flush() }, 1000)
    return true
  }

  /** A game-relevant input edge reached the app's handler. */
  inputReceived(kind: ProbeInputKind, code: string, down: boolean, eventTimeStamp: number | null): void {
    if (!this.enabled) return
    if (this.pending.length >= MAX_PENDING) { this.pending.shift(); this.dropped++ }
    this.pending.push({ id: this.nextId++, kind, code: code.slice(0, 32), down, eventTimeStamp: Number.isFinite(eventTimeStamp) ? eventTimeStamp : null,
      receivedAt: performance.now(), consumedAt: null, consumedStage: null, consumedTick: null, coalesced: 0, frameRenderStartAt: null, submittedAt: null, submittedFrame: null })
  }

  /** The Runtime fixed step consumed every edge received before this frame's input sample. */
  fixedStepConsumed(tick: number, sampledAt: number): void {
    if (!this.enabled) return
    const now = performance.now()
    for (const record of this.pending) if (record.consumedAt === null && record.kind !== 'editor-drag' && record.receivedAt <= sampledAt) {
      record.consumedAt = now; record.consumedStage = 'fixed-step'; record.consumedTick = tick
    }
  }

  /** The editor applied the latest pointer position; earlier coalesced moves are covered by it. */
  editorCommandApplied(): void {
    if (!this.enabled) return
    const now = performance.now()
    let open: ProbeInputRecord | null = null, coalesced = 0
    for (const record of this.pending) if (record.kind === 'editor-drag' && record.consumedAt === null) { if (open) coalesced++; open = record }
    if (!open) return
    // The oldest waiting move is reported with the count it was merged with, so the backlog stays visible.
    for (const record of this.pending) if (record.kind === 'editor-drag' && record.consumedAt === null) {
      record.consumedAt = now; record.consumedStage = 'editor-command'; record.coalesced = coalesced
    }
  }

  /** One host frame finished. A submitted frame is the first affected frame of every consumed, unsubmitted input. */
  frameCompleted(frame: Omit<ProbeFrameRecord, 'frame'>): void {
    if (!this.enabled) return
    const serial = ++this.frameSerial
    if (this.frames.length < MAX_BATCH_FRAMES) this.frames.push({ frame: serial, ...frame })
    if (frame.submittedAt === null) return
    const still: ProbeInputRecord[] = []
    for (const record of this.pending) {
      if (record.consumedAt !== null && record.consumedAt <= frame.renderStart) {
        record.frameRenderStartAt = frame.renderStart; record.submittedAt = frame.submittedAt; record.submittedFrame = serial
        this.completed.push(record)
      } else still.push(record)
    }
    this.pending = still
  }

  private async synchronizeClock(): Promise<void> {
    for (let index = 0; index < 24; index++) {
      try {
        const t0 = performance.now()
        const text = await this.transport!('/sync', null)
        const t1 = performance.now()
        const body = JSON.parse(text) as { collectorMs?: number }
        if (typeof body.collectorMs === 'number') this.syncs.push({ t0, t1, collector: body.collectorMs })
      } catch (error) { this.reportFailure(error); return }
    }
  }

  private async flush(): Promise<void> {
    if (!this.enabled || (!this.completed.length && !this.frames.length && !this.syncs.length)) return
    const now = performance.now()
    // Inputs still waiting for more than two seconds are reported as incomplete rather than dropped silently.
    const stale = this.pending.filter(record => now - record.receivedAt > 2000)
    if (stale.length) this.pending = this.pending.filter(record => now - record.receivedAt <= 2000)
    const body = JSON.stringify({ label: this.label, context: this.context, timeOrigin: performance.timeOrigin, sentAt: now, dropped: this.dropped, failures: this.failures,
      syncs: this.syncs.splice(0), inputs: this.completed.splice(0), incomplete: stale, frames: this.frames.splice(0) })
    try { await this.transport!('/probe', body) } catch (error) { this.reportFailure(error) /* Collector gone: the probe never blocks the app. */ }
    // Re-measure the clock mapping every ten seconds so slow drift stays inside the reported error.
    if (++this.flushes % 10 === 0) void this.synchronizeClock()
  }

  /** The first failure is logged once, so a blocked collector is visible in the console. */
  private reportFailure(error: unknown): void {
    if (this.failures++ === 0) console.warn(`Nova_A latency probe could not reach ${this.endpoint}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export const latencyProbe = new LatencyProbe()
