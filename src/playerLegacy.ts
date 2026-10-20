/** 兼容播放器（26.42 及以前的 Vue 播放器）：独立播放器无法运行某个游戏时由入口按需加载。
 * Network test instances (desktop overrides) and `?legacyPlayer=1` also use it. */
import { createApp, reactive, toRaw, watch } from 'vue'
import PlayerApp from './PlayerApp.vue'
import '@fontsource-variable/jetbrains-mono/wght.css'
import './assets/main.css'
import { installCrashReporter } from './runtime/crashReporter'
import { installPerformanceHost } from './platform/performanceHost'
import { applyPerformancePresentationPolicy, installPerformanceStateAdapter, subscribePerformanceObservations } from './runtime/largeWorldPerformance'
import { physicsState } from './store/physics'
import { installProductionStateAdapter } from './runtime/production'
import { installScriptStateAdapter } from './runtime/scriptStateAdapter'
import { installProfilerStateAdapter } from './runtime/profiler'
import { installInputStateAdapter } from './runtime/inputStateAdapter'
import { installPackageStateAdapter } from './runtime/packages'

export function mountLegacyPlayer(target: HTMLElement): void {
  // The compatibility Player presents through Vue: wrap the Runtime's plain state targets once.
  installPerformanceStateAdapter(target => reactive(target) as typeof target)
  installProductionStateAdapter(target => reactive(target) as typeof target)
  installScriptStateAdapter(target => reactive(target) as typeof target)
  installPackageStateAdapter(target => reactive(target) as typeof target)
  installProfilerStateAdapter({ wrap: target => reactive(target) as typeof target, unwrap: target => toRaw(target) })
  installInputStateAdapter({ wrap: target => reactive(target) as typeof target, unwrap: target => toRaw(target) })
  installCrashReporter('Nova Player')
  const performanceHost = installPerformanceHost({ subscribeFrames: subscribePerformanceObservations,
    publishBudget: snapshot => applyPerformancePresentationPolicy({ benchmarkMode: snapshot.benchmarkMode, tier: 0,
      renderScale: 1, particleScale: 1, revision: snapshot.revision, reason: snapshot.reasonCodes.join(',') }),
    subscribeActivity: listener => watch(() => physicsState.simulationRunning, running => listener(running ? 'playing' : 'interactive'), { immediate: true, flush: 'sync' }) })
  if (import.meta.hot) import.meta.hot.dispose(() => performanceHost.dispose())
  createApp(PlayerApp).mount(target)
}
