import { watch } from 'vue'
import { installPerformanceTraceHost } from '../platform/performanceTraceHost'
import { subscribePerformanceObservations, performanceRuntimeState } from '../runtime/largeWorldPerformance'
import { auxiliaryWork, performanceCoordinator } from '../runtime/performance/services'
import { jobSchedulerOwnershipDiagnostics } from '../runtime/jobScheduler'
import { physicsState, getPerformanceAuthoringSource } from '../store/physics'
import { rendererCapabilityState } from '../renderer/capabilities'
import { renderingSettings } from '../renderer/renderSettings'
import { sha256Bytes } from '../assets/contentHash'
import { getUiMotionDiagnostics } from '../ui/motion'

/** Editor-owned content identity is captured once at Play; runtime transforms never change the benchmark denominator. */
export function installEditorPerformanceTrace(): () => void {
  if (import.meta.env.VITE_NOVA_PERFORMANCE_TRACE !== '1') return () => {}
  let contentHash = 'NOT_CAPTURED'
  const stop = watch(() => physicsState.simulationRunning, running => {
    if (running) contentHash = sha256Bytes(new TextEncoder().encode(getPerformanceAuthoringSource()))
  }, { immediate: true, flush: 'sync' })
  const dispose = installPerformanceTraceHost({ target: window as unknown as Record<string, unknown>, subscribe: subscribePerformanceObservations,
    metadata: () => ({ contentHash, qualitySignature: sha256Bytes(new TextEncoder().encode(JSON.stringify({ rendering: renderingSettings,
      renderScale: performanceRuntimeState.adaptivePixelRatioScale, particleScale: performanceRuntimeState.adaptiveParticleScale }))),
      actualBenchmarkMode: performanceCoordinator.snapshot.benchmarkMode,
      buildId: import.meta.env.VITE_NOVA_BUILD_ID || 'UNIDENTIFIED_LOCAL_BUILD',
      backend: rendererCapabilityState.report?.backend ?? 'UNINITIALIZED', executionMode: 'single-thread-compat', wasmVariant: 'baseline',
      environment: { userAgent: navigator.userAgent, hardwareConcurrencyHint: navigator.hardwareConcurrency ?? null,
        dpr: window.devicePixelRatio, cssViewport: { width: innerWidth, height: innerHeight }, physicalMonitorDpi: null,
        webview: '__TAURI_INTERNALS__' in window ? 'Tauri WebView (version unmeasured)' : null,
        adapterReportedByCapabilityProbe: rendererCapabilityState.report?.device ?? null,
        adapterUsedByRenderingContext: null, policy: performanceCoordinator.snapshot,
        auxiliaryTasks: auxiliaryWork.state,
        uiMotion: getUiMotionDiagnostics(),
        computeWorkerOwnership: jobSchedulerOwnershipDiagnostics(),
        auxiliaryWorkTrace: auxiliaryWork.trace.slice(-32),
        measurementScope: 'Editor CPU/rAF and available identity-linked Runtime keyboard/mouse-button consumption to world-render API submission. GPU execution, the actual graphics adapter on this trace, and input-to-photon remain unmeasured.' } }) })
  return () => { stop(); dispose() }
}
