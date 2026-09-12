import { getProjectSessionGeneration } from '../projects/projectSession'

const INPUT_DELAY_MS = 420
let installed = false
let installationGeneration = 0
let nextControlId = 0
const timers = new Map<HTMLElement, number>()
const controlIds = new WeakMap<HTMLElement, number>()

function labelFor(target: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  return target.labels?.[0]?.innerText.trim().replace(/\s+/g, ' ').slice(0, 120)
    || target.getAttribute('aria-label') || target.name || target.type
}

function eligible(target: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): boolean {
  return target.isConnected && !target.disabled && !('readOnly' in target && target.readOnly)
    && !target.closest('[data-non-project-control]')
}

function route(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) || !eligible(target)) return
  const previous = timers.get(target)
  if (previous !== undefined) window.clearTimeout(previous)
  if (!controlIds.has(target)) controlIds.set(target, ++nextControlId)
  const session = getProjectSessionGeneration()
  const installation = installationGeneration
  const scope = target.closest<HTMLElement>('[data-control-scope],[data-surface]')
  const surface = scope?.dataset.controlScope || scope?.dataset.surface || 'project'
  const testId = target.dataset.testid || target.id || target.name || 'control'
  const label = labelFor(target)
  const mergeKey = `control:${surface}:${testId}:${controlIds.get(target)}`
  const current = () => installed && installation === installationGeneration
    && session === getProjectSessionGeneration() && eligible(target)
  timers.set(target, window.setTimeout(() => {
    timers.delete(target)
    if (!current()) return
    // Keep the launcher/player split lazy. Recheck after module loading too.
    void import('../store/physics').then(({ physicsState, pushHistory }) => {
      if (current() && physicsState.playMode === 'editing') pushHistory(`Edit ${label}`, mergeKey, `${surface}/${testId}`)
    }).catch(error => console.warn('Nova_A could not record the control edit.', error))
  }, event.type === 'change' ? 0 : INPUT_DELAY_MS))
}

/** Safety net only: explicit domain commands and snapshot no-op checks still apply. */
export function installProjectMutationRouter(): void {
  if (installed || typeof document === 'undefined') return
  installed = true
  installationGeneration += 1
  document.addEventListener('input', route, true)
  document.addEventListener('change', route, true)
}

export function disposeProjectMutationRouter(): void {
  if (!installed) return
  installed = false
  installationGeneration += 1
  document.removeEventListener('input', route, true)
  document.removeEventListener('change', route, true)
  for (const timer of timers.values()) window.clearTimeout(timer)
  timers.clear()
}
