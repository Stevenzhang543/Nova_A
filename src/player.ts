/** 导出播放器启动入口：挂载独立游戏运行界面。 */
import { createApp, reactive, toRaw, watch } from 'vue'
import PlayerApp from './PlayerApp.vue'
import '@fontsource-variable/nunito-sans/wght.css'
import '@fontsource-variable/noto-sans-sc/wght.css'
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

// Keep the existing compatibility Player's reactive presentation on the same targets.
// A future framework-free Player leaves the Runtime's plain-state default in place.
installPerformanceStateAdapter(target => reactive(target) as typeof target)
installProductionStateAdapter(target => reactive(target) as typeof target)
installScriptStateAdapter(target => reactive(target) as typeof target)
installProfilerStateAdapter({ wrap: target => reactive(target) as typeof target, unwrap: target => toRaw(target) })
installInputStateAdapter({ wrap: target => reactive(target) as typeof target, unwrap: target => toRaw(target) })
installCrashReporter('Nova Player')
// Explicit adapter for the existing Vue compatibility Player. The new independent Player
// must supply its own pure runtime owner; this entry remains an M1 migration gap.
const performanceHost = installPerformanceHost({ subscribeFrames: subscribePerformanceObservations,
  publishBudget: snapshot => applyPerformancePresentationPolicy({ benchmarkMode: snapshot.benchmarkMode, tier: 0,
    renderScale: 1, particleScale: 1, revision: snapshot.revision, reason: snapshot.reasonCodes.join(',') }),
  subscribeActivity: listener => watch(() => physicsState.simulationRunning, running => listener(running ? 'playing' : 'interactive'), { immediate: true, flush: 'sync' }) })
if (import.meta.hot) import.meta.hot.dispose(() => performanceHost.dispose())
createApp(PlayerApp).mount('#app')
