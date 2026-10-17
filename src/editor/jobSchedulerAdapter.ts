import { reactive, watch } from 'vue'
import { jobSchedulerState as coreState, subscribeJobScheduler, configureJobScheduler } from '../runtime/jobScheduler'
import { productionSettings } from '../runtime/production'
import { recordStaleWorkerResult, recordWorkerPerformance } from '../runtime/largeWorldPerformance'

export { scheduleJob } from '../runtime/jobScheduler'
export const jobSchedulerState = reactive({ ...coreState })
export function installEditorJobScheduler(): () => void {
  const unsubscribe = subscribeJobScheduler(() => Object.assign(jobSchedulerState, coreState))
  const stop = watch(() => productionSettings.jobs, value => configureJobScheduler(value,
    { worker: recordWorkerPerformance, stale: recordStaleWorkerResult }), { immediate: true, deep: true })
  return () => { stop(); unsubscribe() }
}
