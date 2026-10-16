import { reactive, toRaw } from 'vue'
import { installPerformanceStateAdapter, type PerformanceStateAdapter } from '../runtime/largeWorldPerformance'
import { installProfilerStateAdapter } from '../runtime/profiler'

const wrapPerformanceState: PerformanceStateAdapter = target => {
  const view = reactive(target) as typeof target
  if (toRaw(view) !== target) throw new TypeError('Editor performance state must retain the same raw Owner')
  return view
}
/** Install before Editor services and component setup; no mirror state, watcher or frame clock is created. */
export function installEditorPerformanceState(): void {
  installPerformanceStateAdapter(wrapPerformanceState)
  installProfilerStateAdapter({ wrap: wrapPerformanceState, unwrap: toRaw })
}
