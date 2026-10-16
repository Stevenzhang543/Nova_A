/** Pure policy and admission ownership. Clock/capability observations are injected by the host. */
export type ExperienceMode = 'balanced' | 'responsive' | 'quiet' | 'quality'
export type BenchmarkMode = 'off' | 'quality-locked' | 'adaptive-experience'
export type WorkClass = 'critical' | 'visible' | 'required' | 'background' | 'idle'
export type WorkOwner = 'main' | 'engine' | 'asset' | 'compute' | 'native'
export type SessionMode = 'interactive' | 'playing' | 'loading' | 'exporting' | 'idle' | 'hidden' | 'recovering'
export interface PerformanceConfigV1 {
  schemaVersion: 1
  experienceMode: ExperienceMode
  benchmarkMode: BenchmarkMode
  maxAssetWorkers: number
  maxComputeHelpers: number
  maxAuxiliaryHeavyJobs: number
  maxQueueTasks: number
  maxQueueBytes: number
  maxScratchBytes: number
  maxOutputBytes: number
  maxSubmissionCredits: number
  adaptiveQuality: boolean
}
const MiB = 1024 * 1024
export const DEFAULT_PERFORMANCE_CONFIG: Readonly<PerformanceConfigV1> = Object.freeze({
  schemaVersion: 1, experienceMode: 'balanced', benchmarkMode: 'off', maxAssetWorkers: 2,
  maxComputeHelpers: 2, maxAuxiliaryHeavyJobs: 8, maxQueueTasks: 256,
  maxQueueBytes: 1024 * MiB, maxScratchBytes: 2 * 1024 * MiB, maxOutputBytes: 2 * 1024 * MiB,
  maxSubmissionCredits: 2, adaptiveQuality: false
})
const finiteInteger = (value: unknown, fallback: number, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback
export function normalizePerformanceConfig(value: unknown): PerformanceConfigV1 {
  const source = value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}
  const enumValue = <T extends string>(key: string, values: readonly T[], fallback: T): T => values.includes(source[key] as T) ? source[key] as T : fallback
  return {
    schemaVersion: 1,
    experienceMode: enumValue('experienceMode', ['balanced', 'responsive', 'quiet', 'quality'], 'balanced'),
    benchmarkMode: enumValue('benchmarkMode', ['off', 'quality-locked', 'adaptive-experience'], 'off'),
    maxAssetWorkers: finiteInteger(source.maxAssetWorkers, 2, 1, 4),
    maxComputeHelpers: finiteInteger(source.maxComputeHelpers, 2, 0, 8),
    maxAuxiliaryHeavyJobs: finiteInteger(source.maxAuxiliaryHeavyJobs, 8, 0, 8),
    maxQueueTasks: finiteInteger(source.maxQueueTasks, 256, 8, 2048),
    maxQueueBytes: finiteInteger(source.maxQueueBytes, DEFAULT_PERFORMANCE_CONFIG.maxQueueBytes, MiB, 2 * 1024 * MiB),
    maxScratchBytes: finiteInteger(source.maxScratchBytes, DEFAULT_PERFORMANCE_CONFIG.maxScratchBytes, MiB, 2 * 1024 * MiB),
    maxOutputBytes: finiteInteger(source.maxOutputBytes, DEFAULT_PERFORMANCE_CONFIG.maxOutputBytes, MiB, 2 * 1024 * MiB),
    maxSubmissionCredits: finiteInteger(source.maxSubmissionCredits, 2, 1, 3),
    adaptiveQuality: source.adaptiveQuality === true
  }
}
export interface BudgetSnapshot {
  readonly schemaVersion: 1; readonly revision: number; readonly sessionEpoch: number
  readonly mode: SessionMode; readonly targetRenderHz: number | null; readonly framePeriodEstimateMs: number | null
  readonly mainBackgroundSliceMs: number; readonly engineMaintenanceSliceMs: number
  readonly heavyJobAdmissionLimit: number; readonly assetWorkerLimit: number; readonly computeHelperLimit: number
  readonly uploadByteAllowance: number; readonly uploadCpuTimeAllowanceMs: number; readonly gpuSubmissionCreditLimit: number
  readonly qualityRevision: number; readonly confidence: 'measured' | 'estimated' | 'insufficient'
  readonly reasonCodes: readonly string[]; readonly benchmarkMode: BenchmarkMode
}
export interface HeavyLease { readonly id: number; readonly owner: WorkOwner; readonly epoch: number; release(): boolean }
export interface PressureObservation {
  observedAtMs: number; framePeriodMs: number | null; ownerCpuP95Ms: number | null
  inputQueueP95Ms: number | null; gpuP95Ms: number | null; backgroundContended: boolean
}
/** Presentation quality is independent of CPU admission and cannot be traded for throughput. */
export const VISUAL_QUALITY_FLOOR = Object.freeze({ density: 'comfortable', textPx: 16, controlPx: 44,
  labelGapPx: 12, fieldGapPx: 20, sectionGapPx: 28, panelPaddingPx: 20,
  inputRadiusPx: 12, panelRadiusPx: 16, dialogRadiusPx: 24, coreMotion: true })
export class PerformanceCoordinator {
  private configValue: PerformanceConfigV1
  private readonly listeners = new Set<() => void>()
  private readonly leases = new Map<number, { owner: WorkOwner; scratch: number; output: number }>()
  private nextLease = 1
  private scratch = 0
  private output = 0
  private hardwareHint: number | null
  private mode: SessionMode = 'interactive'
  private epoch = 1
  private revision = 0
  private lastObservation = -Infinity
  private pressureWindows = 0
  private pressureLimit: number | null = null
  private recoverySince: number | null = null
  private lastChange = -Infinity
  private snapshotValue!: BudgetSnapshot
  private framePeriod: number | null = null
  private hasMeasurement = false
  constructor(readonly now: () => number, hardwareConcurrency: number | null = null, config: unknown = {}) {
    this.configValue = normalizePerformanceConfig(config)
    this.hardwareHint = hardwareConcurrency !== null && Number.isFinite(hardwareConcurrency) && hardwareConcurrency > 0 ? Math.floor(hardwareConcurrency) : null
    this.publish(['conservative-start'])
  }
  get config(): Readonly<PerformanceConfigV1> { return Object.freeze({ ...this.configValue }) }
  get snapshot(): BudgetSnapshot { return this.snapshotValue }
  get resources() { return Object.freeze({ activeHeavyJobs: this.leases.size, scratchBytesReserved: this.scratch, outputBytesReserved: this.output }) }
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private notify(): void { for (const listener of [...this.listeners]) listener() }
  configure(config: unknown, hardwareConcurrency = this.hardwareHint): void {
    this.configValue = normalizePerformanceConfig(config)
    this.hardwareHint = hardwareConcurrency !== null && Number.isFinite(hardwareConcurrency) && hardwareConcurrency > 0 ? Math.floor(hardwareConcurrency) : null
    this.pressureLimit = null; this.pressureWindows = 0; this.recoverySince = null
    this.publish(['configuration-change'])
  }
  setMode(mode: SessionMode): void { if (this.mode !== mode) { this.mode = mode; this.publish(['mode-change']) } }
  advanceEpoch(): number { this.epoch++; this.publish(['session-change']); return this.epoch }
  private initialLimit(): number {
    const h = this.hardwareHint
    const initial = h === null || h <= 4 ? 1 : h <= 8 ? 2 : h <= 16 ? 3 : 4
    return Math.min(initial, this.configValue.maxAuxiliaryHeavyJobs, h === null ? 1 : Math.max(1, Math.min(8, h - 2)))
  }
  private publish(reasons: string[]): void {
    let limit = Math.min(this.initialLimit(), this.pressureLimit ?? 8)
    if (this.configValue.experienceMode === 'quiet') limit = Math.min(limit, 1)
    this.snapshotValue = Object.freeze({
      schemaVersion: 1, revision: ++this.revision, sessionEpoch: this.epoch, mode: this.mode,
      targetRenderHz: null, framePeriodEstimateMs: this.framePeriod,
      mainBackgroundSliceMs: this.mode === 'hidden' ? 0 : this.configValue.experienceMode === 'responsive' || this.configValue.experienceMode === 'quiet' ? .5 : 1, engineMaintenanceSliceMs: 1,
      heavyJobAdmissionLimit: limit, assetWorkerLimit: Math.min(4, this.configValue.maxAssetWorkers, Math.max(1, limit)),
      computeHelperLimit: Math.min(this.configValue.maxComputeHelpers, limit),
      uploadByteAllowance: 4 * MiB, uploadCpuTimeAllowanceMs: 2,
      gpuSubmissionCreditLimit: this.configValue.maxSubmissionCredits, qualityRevision: 0,
      confidence: this.hasMeasurement ? 'measured' : this.hardwareHint === null ? 'insufficient' : 'estimated',
      reasonCodes: Object.freeze(reasons), benchmarkMode: this.configValue.benchmarkMode
    })
    this.notify()
  }
  observe(sample: PressureObservation): void {
    const now = sample.observedAtMs
    if (!Number.isFinite(now) || now - this.lastObservation < 1000) return
    this.lastObservation = now
    this.framePeriod = sample.framePeriodMs !== null && Number.isFinite(sample.framePeriodMs) && sample.framePeriodMs > 0 ? sample.framePeriodMs : null
    this.hasMeasurement = this.framePeriod !== null && sample.ownerCpuP95Ms !== null && Number.isFinite(sample.ownerCpuP95Ms)
    const pressure = sample.backgroundContended && ((sample.inputQueueP95Ms !== null && sample.inputQueueP95Ms > 21.667) || (sample.ownerCpuP95Ms !== null && sample.framePeriodMs !== null && sample.ownerCpuP95Ms > sample.framePeriodMs))
    if (pressure) {
      this.recoverySince = null
      if (++this.pressureWindows >= 3 && now - this.lastChange >= 2000 && this.snapshot.heavyJobAdmissionLimit > 1) {
        this.pressureLimit = Math.max(1, this.snapshot.heavyJobAdmissionLimit - 1)
        this.lastChange = now; this.pressureWindows = 0
        this.publish(['owner-pressure-with-auxiliary-overlap', 'reduce-auxiliary-admission'])
        return
      }
    } else {
      this.pressureWindows = 0
      this.recoverySince ??= now
      if (this.pressureLimit !== null && now - this.recoverySince >= 10000 && now - this.lastChange >= 2000) {
        this.pressureLimit = Math.min(this.initialLimit(), this.pressureLimit + 1)
        if (this.pressureLimit >= this.initialLimit()) this.pressureLimit = null
        this.lastChange = now; this.recoverySince = now; this.publish(['stable-contention-recovery'])
        return
      }
    }
    this.publish(['observation-update'])
  }
  tryAcquire(owner: WorkOwner, epoch: number, scratchBytes: number, outputBytes: number, workClass: WorkClass): HeavyLease | null {
    for (const bytes of [scratchBytes, outputBytes]) if (!Number.isSafeInteger(bytes) || bytes < 0) throw new Error('Invalid byte reservation')
    if (scratchBytes > this.configValue.maxScratchBytes || outputBytes > this.configValue.maxOutputBytes) throw new Error('Task exceeds configured memory reservation limit')
    if (epoch !== this.epoch) throw new Error('Stale task epoch')
    if (this.mode === 'hidden' && (workClass === 'idle' || workClass === 'background')) return null
    const required = workClass === 'required' || workClass === 'critical' || workClass === 'visible'
    const requiredReserve = required ? Math.max(1, this.snapshot.heavyJobAdmissionLimit) : this.snapshot.heavyJobAdmissionLimit
    if (this.leases.size >= requiredReserve || this.scratch + scratchBytes > this.configValue.maxScratchBytes || this.output + outputBytes > this.configValue.maxOutputBytes) return null
    // A zero helper setting selects the serial executor for required work; it does not strand saves/loads.
    const ownerLimit = owner === 'asset' ? this.snapshot.assetWorkerLimit : owner === 'compute' ? (required ? Math.max(1, this.snapshot.computeHelperLimit) : this.snapshot.computeHelperLimit) : requiredReserve
    if (ownerLimit === 0 || [...this.leases.values()].filter(lease => lease.owner === owner).length >= ownerLimit) return null
    const id = this.nextLease++
    this.leases.set(id, { owner, scratch: scratchBytes, output: outputBytes }); this.scratch += scratchBytes; this.output += outputBytes
    return Object.freeze({ id, owner, epoch, release: () => {
      const lease = this.leases.get(id)
      if (!lease) return false
      this.leases.delete(id); this.scratch -= lease.scratch; this.output -= lease.output; this.notify(); return true
    } })
  }
}
