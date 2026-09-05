import type { ObjectDirective } from 'vue'

interface ModalEntry { root: HTMLElement; previous: HTMLElement | null; last: HTMLElement | null; ownedTabIndex: boolean }
const entries: ModalEntry[] = []
const selector = 'a[href],area[href],button,input,select,textarea,iframe,[contenteditable="true"],[tabindex]'
function visible(element: HTMLElement): boolean {
  return element.isConnected && !element.closest('[inert],[hidden]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden'
}
function controls(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(selector)].filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && visible(element))
    .sort((a,b) => (a.tabIndex > 0 ? a.tabIndex : Infinity) - (b.tabIndex > 0 ? b.tabIndex : Infinity))
}
function priority(root: HTMLElement): number {
  let highest = 0
  for (let element: HTMLElement | null = root; element; element = element.parentElement) {
    const value = Number.parseInt(getComputedStyle(element).zIndex, 10)
    if (Number.isFinite(value)) highest = Math.max(highest, value)
  }
  return highest
}
function top(): ModalEntry | undefined {
  return entries.filter(entry => visible(entry.root)).reduce<ModalEntry | undefined>((best, entry) => !best || priority(entry.root) >= priority(best.root) ? entry : best, undefined)
}
function focus(entry: ModalEntry, last = false): void {
  const items = controls(entry.root)
  const target = last ? items.at(-1) : entry.last && visible(entry.last) && !entry.last.matches(':disabled') ? entry.last : items[0]
  ;(target ?? entry.root).focus({ preventScroll: true })
}
function containFocus(event: FocusEvent): void {
  const entry = top(), target = event.target
  if (!entry || !(target instanceof HTMLElement)) return
  if (entry.root.contains(target)) entry.last = target
  else focus(entry)
}
function containTab(event: KeyboardEvent): void {
  if (event.key !== 'Tab' || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return
  const entry = top(); if (!entry) return
  const items = controls(entry.root), active = document.activeElement
  if (!items.length || !entry.root.contains(active) || active === entry.root || (event.shiftKey ? active === items[0] : active === items.at(-1))) {
    event.preventDefault()
    ;((event.shiftKey ? items.at(-1) : items[0]) ?? entry.root).focus({ preventScroll: true })
  }
}

/** Applied only to mounted modal roots. Native control keys and dialog decisions remain owned by the component. */
export const vModalFocus: ObjectDirective<HTMLElement> = {
  mounted(root) {
    const entry: ModalEntry = { root, previous: document.activeElement instanceof HTMLElement ? document.activeElement : null, last: null, ownedTabIndex: !root.hasAttribute('tabindex') }
    if (entry.ownedTabIndex) root.tabIndex = -1
    entries.push(entry)
    if (entries.length === 1) { document.addEventListener('focusin', containFocus, true); document.addEventListener('keydown', containTab, true) }
    queueMicrotask(() => { if (entries.includes(entry) && top() === entry && !root.contains(document.activeElement)) focus(entry) })
  },
  beforeUnmount(root) {
    const at = entries.findIndex(entry => entry.root === root); if (at < 0) return
    const [entry] = entries.splice(at, 1), ownedFocus = root.contains(document.activeElement)
    if (!entries.length) { document.removeEventListener('focusin', containFocus, true); document.removeEventListener('keydown', containTab, true) }
    if (entry.ownedTabIndex) root.removeAttribute('tabindex')
    queueMicrotask(() => {
      if (!ownedFocus) return
      const parent = top()
      if (entry.previous && visible(entry.previous) && (!parent || parent.root.contains(entry.previous))) entry.previous.focus({ preventScroll: true })
      else if (parent) focus(parent)
    })
  },
}
