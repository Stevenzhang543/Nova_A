export type StableControlKind = 'button' | 'input' | 'select' | 'textarea' | 'link' | 'tab' | 'menuitem' | 'control'

export interface StableControlRecord {
  testId: string
  kind: StableControlKind
  label: string
  surface: string
  disabled: boolean
  disabledReason: string
  shortcut: string
}

const SELECTOR = 'button,input,select,textarea,a[href],[role="button"],[role="tab"],[role="menuitem"],[data-stable-control]'
const INTERNAL_SELECTOR = '[data-feature-state="internal"]'
let observer: MutationObserver | null = null

function slug(value: string): string {
  const normalized = value.normalize('NFKD').toLocaleLowerCase().replace(/[^a-z0-9\u3400-\u9fff]+/g, '-').replace(/^-|-$/g, '')
  return normalized.slice(0, 56) || 'control'
}

function visibleText(element: HTMLElement): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return element.labels?.[0]?.innerText.trim() || element.placeholder || element.name || element.type
  if (element instanceof HTMLSelectElement) return element.labels?.[0]?.innerText.trim() || element.name || 'Select'
  return element.getAttribute('aria-label') || element.getAttribute('title') || element.innerText.trim().replace(/\s+/g, ' ')
}

function surfaceName(element: HTMLElement): string {
  const scope = element.closest<HTMLElement>('[data-control-scope],[data-surface]')
  return scope?.dataset.controlScope || scope?.dataset.surface || 'application'
}

function kindOf(element: HTMLElement): StableControlKind {
  const role = element.getAttribute('role')
  if (role === 'tab' || role === 'menuitem') return role
  if (element instanceof HTMLAnchorElement) return 'link'
  const tag = element.tagName.toLocaleLowerCase()
  return ['button', 'input', 'select', 'textarea'].includes(tag) ? tag as StableControlKind : 'control'
}

function assignStableIdentity(element: HTMLElement): void {
  if (element.matches(INTERNAL_SELECTOR) || element.closest(INTERNAL_SELECTOR)) return
  const label = visibleText(element)
  const surface = surfaceName(element)
  element.dataset.surface ||= surface
  if (!element.dataset.testid) {
    const scope = element.closest<HTMLElement>('[data-control-scope],[data-surface]') || document.documentElement
    const controls = [...scope.querySelectorAll<HTMLElement>(SELECTOR)].filter(control => !control.matches(INTERNAL_SELECTOR) && !control.closest(INTERNAL_SELECTOR))
    const ordinal = Math.max(0, controls.indexOf(element)) + 1
    const explicitKey = element.dataset.testKey || element.id || element.getAttribute('name') || element.dataset.command || element.dataset.doc || element.dataset.shortcut
    const stableKey = explicitKey ? slug(explicitKey) : `${kindOf(element)}-${ordinal}`
    const base = `nova-${slug(surface)}-${stableKey}`
    let id = base, suffix = 2
    while (document.querySelector(`[data-testid="${CSS.escape(id)}"]`)) id = `${base}-${suffix++}`
    element.dataset.testid = id
  }
  if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby') && !label) element.setAttribute('aria-label', kindOf(element))
  else if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby') && !element.innerText.trim()) element.setAttribute('aria-label', label)
  if ((element as HTMLButtonElement).disabled) {
    const reason = element.dataset.disabledReason || element.getAttribute('title') || 'Unavailable in the current context'
    element.dataset.disabledReason = reason
    if (!element.getAttribute('title')) element.setAttribute('title', reason)
  }
}

function scan(root: ParentNode = document): void {
  if (root instanceof HTMLElement && root.matches(SELECTOR)) assignStableIdentity(root)
  root.querySelectorAll<HTMLElement>(SELECTOR).forEach(assignStableIdentity)
}

export function installStableControlRegistry(): void {
  if (typeof document === 'undefined' || observer) return
  scan()
  observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes' && record.target instanceof HTMLElement) assignStableIdentity(record.target)
      record.addedNodes.forEach(node => { if (node instanceof HTMLElement) scan(node) })
    }
  })
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'aria-label', 'title'] })
}

export function stableControlInventory(root: ParentNode = document): StableControlRecord[] {
  scan(root)
  return [...root.querySelectorAll<HTMLElement>('[data-testid]')].filter(element => element.matches(SELECTOR)).map(element => ({
    testId: element.dataset.testid!, kind: kindOf(element), label: visibleText(element), surface: surfaceName(element),
    disabled: 'disabled' in element && Boolean((element as HTMLButtonElement).disabled), disabledReason: element.dataset.disabledReason || element.getAttribute('title') || '',
    shortcut: element.dataset.shortcut || ''
  }))
}

export function focusStableControl(testId: string): boolean {
  const control = document.querySelector<HTMLElement>(`[data-testid="${CSS.escape(testId)}"]`)
  if (!control) return false
  control.scrollIntoView({ block: 'nearest', inline: 'nearest' }); control.focus(); return true
}
