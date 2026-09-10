import { ref } from 'vue'
import { networkLabel18 } from './networkLabels18'
/** Capture before lazy v-model's change listener; invalid drafts never reach authoring/history/runtime. */
export function useNetworkForm18() {
  const error = ref('')
  let revision = 0
  const change = (event: Event): void => {
    const input = event.target
    if (!(input instanceof HTMLInputElement) || input.type !== 'number') return
    const current = ++revision
    if (!Number.isFinite(input.valueAsNumber) || input.validity.rangeUnderflow || input.validity.rangeOverflow || input.validity.stepMismatch) {
      event.stopImmediatePropagation()
      input.value = input.dataset.networkCommitted ?? ''
      error.value = networkLabel18('bounds')
      return
    }
    // A reactive render during capture can reset the draft before v-model reads it.
    setTimeout(() => { if (revision === current) error.value = '' }, 0)
  }
  return { error, change }
}
