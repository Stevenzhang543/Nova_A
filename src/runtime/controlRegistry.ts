export type StableControlKind = 'button' | 'input' | 'select' | 'textarea' | 'link' | 'tab' | 'menuitem' | 'control'

export interface StableControlRecord {
  testId: string
  kind: StableControlKind
  label: string
  surface: string
  identitySource: 'authored' | 'structural'
  structuralPath: string
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

function derivedVisibleText(element: HTMLElement): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return element.labels?.[0]?.innerText.trim() || element.placeholder || element.name || element.type
  if (element instanceof HTMLSelectElement) return element.labels?.[0]?.innerText.trim() || element.name || 'Select'
  return element.getAttribute('title') || element.innerText.trim().replace(/\s+/g, ' ') || element.textContent?.trim().replace(/\s+/g, ' ') || ''
}

function visibleText(element: HTMLElement): string {
  const authoredAriaLabel = element.dataset.generatedAriaLabel === 'true' ? '' : element.getAttribute('aria-label')
  return authoredAriaLabel || derivedVisibleText(element)
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

/**
 * Build a locale-independent path for controls that have not been assigned an
 * authored key yet.  Text and translated labels are deliberately excluded, so
 * the identifier remains the same in English, German, Chinese and pseudo/RTL
 * qualification.  `nth-of-type` is evaluated in the rendered component scope,
 * which is deterministic for a given reachable UI state.
 */
function structuralPath(element: HTMLElement, scope: HTMLElement): string {
  const parts: string[] = []
  let current: HTMLElement | null = element
  while (current && current !== scope && parts.length < 12) {
    const authored = current.dataset.testKey || current.id || current.getAttribute('name') || current.dataset.command || current.dataset.doc || current.dataset.shortcut
    if (authored) {
      parts.unshift(`${current.tagName.toLocaleLowerCase()}-${slug(authored)}`)
      break
    }
    const tag = current.tagName.toLocaleLowerCase()
    const siblings = current.parentElement ? [...current.parentElement.children].filter(item => item.tagName === current!.tagName) : []
    const index = Math.max(0, siblings.indexOf(current)) + 1
    parts.unshift(`${tag}-${index}`)
    current = current.parentElement
  }
  return parts.join('--') || `${kindOf(element)}-1`
}

function assignStableIdentity(element: HTMLElement): void {
  if (element.matches(INTERNAL_SELECTOR) || element.closest(INTERNAL_SELECTOR)) return
  const label = visibleText(element)
  const surface = surfaceName(element)
  element.dataset.surface ||= surface
  if (!element.dataset.testid) {
    const scope = element.closest<HTMLElement>('[data-control-scope],[data-surface]') || document.documentElement
    const explicitKey = element.dataset.testKey || element.id || element.getAttribute('name') || element.dataset.command || element.dataset.doc || element.dataset.shortcut
    const stableKey = explicitKey ? slug(explicitKey) : structuralPath(element, scope)
    const base = `nova-${slug(surface)}-${stableKey}`
    let id = base, suffix = 2
    while (document.querySelector(`[data-testid="${CSS.escape(id)}"]`)) id = `${base}-${suffix++}`
    element.dataset.testid = id
    element.dataset.testIdentity = explicitKey ? 'authored' : 'structural'
    element.dataset.testPath = structuralPath(element, scope)
  }
  if (!element.getAttribute('aria-labelledby')) {
    const generatedLabel = derivedVisibleText(element) || kindOf(element)
    if (element.dataset.generatedAriaLabel === 'true') {
      if (element.getAttribute('aria-label') !== generatedLabel) element.setAttribute('aria-label', generatedLabel)
    } else if (!element.getAttribute('aria-label') && (!label || !element.innerText.trim())) {
      element.dataset.generatedAriaLabel = 'true'
      element.setAttribute('aria-label', generatedLabel)
    }
  }
  if ((element as HTMLButtonElement).disabled) {
    const generatedReason = element.getAttribute('title') || 'Unavailable in the current context'
    if (!element.dataset.disabledReason || element.dataset.generatedDisabledReason === 'true') {
      element.dataset.generatedDisabledReason = 'true'
      element.dataset.disabledReason = generatedReason
    }
    const reason = element.dataset.disabledReason
    if (!element.getAttribute('title')) element.setAttribute('title', reason)
  }
}

function refreshTextOwner(node: Node): void {
  const parent = node instanceof HTMLElement ? node : node.parentElement
  if (!parent) return
  if (parent.matches(SELECTOR)) assignStableIdentity(parent)
  const label = parent.closest('label')
  label?.querySelectorAll<HTMLElement>(SELECTOR).forEach(assignStableIdentity)
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
      if (record.type === 'characterData' || record.type === 'childList') refreshTextOwner(record.target)
      record.addedNodes.forEach(node => { if (node instanceof HTMLElement) scan(node) })
    }
  })
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'aria-label', 'title'] })
}

export function stableControlInventory(root: ParentNode = document): StableControlRecord[] {
  scan(root)
  return [...root.querySelectorAll<HTMLElement>('[data-testid]')].filter(element => element.matches(SELECTOR)).map(element => ({
    testId: element.dataset.testid!, kind: kindOf(element), label: visibleText(element), surface: surfaceName(element),
    identitySource: element.dataset.testIdentity === 'authored' ? 'authored' : 'structural', structuralPath: element.dataset.testPath || '',
    disabled: 'disabled' in element && Boolean((element as HTMLButtonElement).disabled), disabledReason: element.dataset.disabledReason || element.getAttribute('title') || '',
    shortcut: element.dataset.shortcut || ''
  }))
}

export function focusStableControl(testId: string): boolean {
  const control = document.querySelector<HTMLElement>(`[data-testid="${CSS.escape(testId)}"]`)
  if (!control) return false
  control.scrollIntoView({ block: 'nearest', inline: 'nearest' }); control.focus(); return true
}
