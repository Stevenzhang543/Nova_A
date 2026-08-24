const INPUT_DELAY_MS = 420
let installed = false
const timers = new WeakMap<EventTarget, number>()

function labelFor(target: HTMLElement): string {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return target.labels?.[0]?.innerText.trim().replace(/\s+/g, ' ').slice(0, 120) || target.getAttribute('aria-label') || target.name || target.type
  }
  return target.getAttribute('aria-label') || target.getAttribute('title') || target.innerText.trim().replace(/\s+/g, ' ').slice(0, 120) || 'Project property'
}

async function commitControlMutation(target: HTMLElement): Promise<void> {
  if (target.closest('[data-non-project-control],[role="dialog"]')?.hasAttribute('data-non-project-control')) return
  const { physicsState, pushHistory } = await import('../store/physics')
  if (physicsState.playMode !== 'editing') return
  const testId = target.dataset.testid || target.id || target.getAttribute('name') || 'stable-control'
  const surface = target.closest<HTMLElement>('[data-control-scope],[data-surface]')?.dataset.controlScope || target.dataset.surface || 'project'
  pushHistory(`Edit ${labelFor(target)}`, `control:${surface}:${testId}`, `${surface}/${testId}`)
}

function route(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return
  if (target.disabled || ('readOnly' in target && target.readOnly) || target.closest('[data-non-project-control]')) return
  const previous = timers.get(target)
  if (previous !== undefined) window.clearTimeout(previous)
  const delay = event.type === 'change' ? 0 : INPUT_DELAY_MS
  timers.set(target, window.setTimeout(() => { timers.delete(target); void commitControlMutation(target) }, delay))
}

/**
 * Safety net for stable project controls. Explicit domain commands still win;
 * this router records only when the serialized project actually changed.
 */
export function installProjectMutationRouter(): void {
  if (installed || typeof document === 'undefined') return
  installed = true
  document.addEventListener('input', route, true)
  document.addEventListener('change', route, true)
}
