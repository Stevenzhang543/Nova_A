/** A host-owned diagnostic policy, separate from visual quality and GPU submission credit. */
export type GpuDiagnosticsMode = 'off' | 'sampled' | 'full'
export interface GpuDiagnosticsBudget {
  readonly mode: GpuDiagnosticsMode
  readonly revision: number
  readonly sampleIntervalFrames: number | null
  readonly maxPendingQueries: number
}

/** Only finite, bounded modes are admitted. Full is an explicit diagnostic choice. */
export function gpuDiagnosticsBudget(mode: unknown = 'sampled', revision = 0): Readonly<GpuDiagnosticsBudget> {
  const selected = mode === 'off' || mode === 'full' ? mode : 'sampled'
  return Object.freeze({ mode: selected, revision: Number.isSafeInteger(revision) && revision >= 0 ? revision : 0,
    sampleIntervalFrames: selected === 'off' ? null : selected === 'full' ? 1 : 8,
    maxPendingQueries: selected === 'off' ? 0 : 4 })
}

/** The host changes this snapshot; the existing graphics Owner alone creates/polls queries. */
export function createGpuDiagnosticsBudgetOwner(initialMode: GpuDiagnosticsMode = 'sampled') {
  let snapshot = gpuDiagnosticsBudget(initialMode)
  return {
    get snapshot(): Readonly<GpuDiagnosticsBudget> { return snapshot },
    setMode(mode: GpuDiagnosticsMode): Readonly<GpuDiagnosticsBudget> {
      const next = gpuDiagnosticsBudget(mode, snapshot.revision)
      if (next.mode !== snapshot.mode) snapshot = gpuDiagnosticsBudget(next.mode, snapshot.revision + 1)
      return snapshot
    }
  }
}
