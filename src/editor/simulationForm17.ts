import { ref } from 'vue'
import { simulationLabel17 } from './simulationLabels17'
/** Number drafts commit on change. Invalid drafts restore synchronously before the next simulation tick. */
export function useSimulationFormGuard17(commit: () => void) {
  const error = ref(''); const previous = new WeakMap<HTMLInputElement, string>(); let restoring = false
  const focus = (event: FocusEvent): void => { if (event.target instanceof HTMLInputElement && event.target.type === 'number') previous.set(event.target, event.target.value) }
  const change = (event: Event): void => {
    if (restoring) return
    const target = event.target
    if (target instanceof HTMLInputElement && target.type === 'number') {
      if (!Number.isFinite(target.valueAsNumber) || target.validity.rangeUnderflow || target.validity.rangeOverflow) {
        const value = previous.get(target)
        if (value !== undefined) { restoring = true; target.value = value; target.dispatchEvent(new Event('change', { bubbles: true })); restoring = false }
        error.value = simulationLabel17('bounds'); return
      }
      previous.set(target, target.value)
    }
    error.value = ''; commit()
  }
  return { error, focus, change }
}
