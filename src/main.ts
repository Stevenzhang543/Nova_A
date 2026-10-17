/** 编辑器网页启动入口：注册应用及全局行为，挂载 Nova_A 编辑界面。 */
import { createApp, watch } from "vue";
// Install the lazy legacy world view before project loading can invoke its API.
import './editor/worldGameplayAdapter'
import App from "./App.vue";
import '@fontsource-variable/nunito-sans/wght.css'
import '@fontsource-variable/noto-sans-sc/wght.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import './ui/editor.css'
import { installCrashReporter } from './runtime/crashReporter'
import { reportFatalError } from './runtime/faultCenter'
import { installExternalLinkGuard } from './runtime/externalLinks'
import { installEditorUi } from './ui/register'
import { installUiMotion } from './ui/motion'
import { installAppBranding } from './ui/branding'
import { installPerformanceHost } from './platform/performanceHost'
import { installEditorPerformanceState } from './editor/performanceStateAdapter'
import { installEditorProductionState } from './editor/productionStateAdapter'
import { installEditorScriptState } from './editor/scriptStateAdapter'
import { installEditorInputState } from './editor/inputStateAdapter'
import { installEditorJobScheduler } from './editor/jobSchedulerAdapter'
import { installEditorPerformanceTrace } from './editor/performanceTraceAdapter'
import { applyPerformancePresentationPolicy, subscribePerformanceObservations } from './runtime/largeWorldPerformance'
import { physicsState } from './store/physics'
import { profilerState } from './runtime/profiler'
import { setEditorRendererGpuDiagnosticsMode } from './editor/rendererAdapter'

installEditorPerformanceState()
installEditorProductionState()
installEditorScriptState()
installEditorInputState()
installCrashReporter('Nova_A Editor')
installExternalLinkGuard()
const performanceHost = installPerformanceHost({ subscribeFrames: subscribePerformanceObservations,
  publishBudget: snapshot => applyPerformancePresentationPolicy({ benchmarkMode: snapshot.benchmarkMode, tier: 0,
    renderScale: 1, particleScale: 1, revision: snapshot.revision, reason: snapshot.reasonCodes.join(',') }),
  subscribeActivity: listener => watch(() => physicsState.simulationRunning, running => listener(running ? 'playing' : 'interactive'), { immediate: true, flush: 'sync' }) })
const disposeJobAdapter = installEditorJobScheduler()
const disposePerformanceTrace = installEditorPerformanceTrace()
const disposeGpuDiagnosticsPolicy = watch(() => [profilerState.enabled, profilerState.overheadMode] as const,
  ([enabled, mode]) => setEditorRendererGpuDiagnosticsMode(!enabled || mode === 'Off' ? 'off' : mode === 'Full' ? 'full' : 'sampled'),
  { immediate: true, flush: 'sync' })
if (import.meta.hot) import.meta.hot.dispose(() => { performanceHost.dispose(); disposeJobAdapter() })
if (import.meta.hot) import.meta.hot.dispose(disposePerformanceTrace)
if (import.meta.hot) import.meta.hot.dispose(disposeGpuDiagnosticsPolicy)
const disposeUiMotion = installUiMotion()
const disposeAppBranding = installAppBranding()
if (import.meta.hot) import.meta.hot.dispose(disposeUiMotion)
if (import.meta.hot) import.meta.hot.dispose(disposeAppBranding)
const app = createApp(App)
installEditorUi(app)
app.config.errorHandler = /** 执行时调用 reportFatalError(error, `Vue: ${info}`)；不显式返回调用结果。 */ (error, _instance, info) => { reportFatalError(error, `Vue: ${info}`) }
try { app.mount("#app") }
catch (error) {
  reportFatalError(error, 'Application mount')
  const root = document.querySelector<HTMLElement>('#app')
  if (root) root.innerHTML = '<main class="app-loading" role="alert">Nova_A could not start. Reload with ?safe-mode=1 or inspect the local crash log.</main>'
}
