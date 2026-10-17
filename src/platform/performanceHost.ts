import { performanceCoordinator } from '../runtime/performance/services'
import { normalizePerformanceConfig, type BudgetSnapshot, type PerformanceConfigV1, type SessionMode } from '../runtime/performance/coordinator'
import type { FrameObservation } from '../runtime/performance/observability'
import { installPressureObservationFeed } from '../runtime/performance/pressureFeed'

const key = 'nova-a.performance-policy.v1'
let hardwareHint: number | null = null
export type VisiblePerformanceActivity = Exclude<SessionMode, 'hidden'>
export interface PerformanceHostServices {
  /** The host observes the existing frame owner; it never starts another frame clock. */
  subscribeFrames?: (listener: (sample: Readonly<FrameObservation>, observedAtMs: number) => void) => () => void
  publishBudget?: (snapshot: BudgetSnapshot) => void
  subscribeActivity?: (listener: (activity: VisiblePerformanceActivity) => void) => () => void
}
export function configurePerformancePreferences(value: unknown): Readonly<PerformanceConfigV1> {
  const normalized = normalizePerformanceConfig(value)
  performanceCoordinator.configure(normalized, hardwareHint)
  try { localStorage.setItem(key, JSON.stringify(normalized)) } catch { /* Session policy survives denied storage. */ }
  return performanceCoordinator.config
}
/** Host configuration is separate from authoring data and never makes installed hardware a GPU capability claim. */
export function installPerformanceHost(services: PerformanceHostServices = {}): { dispose(): void; configure(value: unknown): Readonly<PerformanceConfigV1> } {
  let stored: unknown = {}
  try { stored = JSON.parse(localStorage.getItem(key) ?? '{}') } catch { /* Malformed disposable preferences use conservative defaults. */ }
  const hint = typeof navigator === 'undefined' ? null : navigator.hardwareConcurrency
  hardwareHint = hint
  const config = normalizePerformanceConfig(stored)
  // Profiling tracks are explicit and never silently saved as user preferences.
  if (import.meta.env.VITE_NOVA_PERFORMANCE_TRACE === '1') {
    const requested = new URLSearchParams(location.search).get('novaBenchmarkMode')
    if (requested === 'quality-locked' || requested === 'adaptive-experience') config.benchmarkMode = requested
  }
  performanceCoordinator.configure(config, hint)
  let disposed = false, activity: VisiblePerformanceActivity = 'interactive'
  const publish = () => { if (!disposed) services.publishBudget?.(performanceCoordinator.snapshot) }
  const unsubscribe = performanceCoordinator.subscribe(publish)
  let disposeObservations = () => {}, disposeActivity = () => {}
  const visibility = () => { if (!disposed) performanceCoordinator.setMode(document.hidden ? 'hidden' : activity) }
  const dispose = () => {
    if (disposed) return
    disposed = true
    try { disposeObservations() }
    finally { try { disposeActivity() } finally { unsubscribe(); document.removeEventListener('visibilitychange', visibility) } }
  }
  try {
    if (services.subscribeFrames) disposeObservations = installPressureObservationFeed(performanceCoordinator, services.subscribeFrames,
      () => performanceCoordinator.resources.activeHeavyJobs > 0)
    if (services.subscribeActivity) disposeActivity = services.subscribeActivity(next => {
      if (disposed || !(['interactive', 'playing', 'loading', 'exporting', 'idle', 'recovering'] as const).includes(next)) return
      activity = next; visibility()
    })
    document.addEventListener('visibilitychange', visibility); visibility(); publish()
  } catch (error) { dispose(); throw error }
  return {
    configure(value: unknown) {
      if (disposed) throw new Error('PERFORMANCE_HOST_DISPOSED')
      return configurePerformancePreferences(value)
    },
    dispose
  }
}
