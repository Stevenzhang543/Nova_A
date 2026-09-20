import type { ObjectDirective } from 'vue'

export interface TransientPopoverOptions {
  isOpen(): boolean
  regions(): readonly HTMLElement[]
  close(restoreFocus: boolean): void
  delayMs?: number
  paddingPx?: number
}

/** Pointer travel tolerance for transient controls; never attach to a draft-bearing dialog. */
export function installTransientPopover(options: TransientPopoverOptions): () => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  let keyboardFocus = false
  const clear = () => { if (timeout !== null) clearTimeout(timeout); timeout = null }
  const regions = () => options.regions().filter(element => element.isConnected && !element.inert)
  const contains = (target: EventTarget | null) => target instanceof Node && regions().some(element => element.contains(target))
  const close = (restoreFocus = false) => { clear(); if (options.isOpen()) options.close(restoreFocus) }
  const move = (event: PointerEvent) => {
    if (!options.isOpen() || event.pointerType === 'touch') { clear(); return }
    const padding = options.paddingPx ?? 12
    const inside = regions().some(element => { const r = element.getBoundingClientRect(); return event.clientX >= r.left - padding && event.clientX <= r.right + padding && event.clientY >= r.top - padding && event.clientY <= r.bottom + padding })
    if (inside || keyboardFocus && contains(document.activeElement)) { clear(); return }
    if (timeout === null) timeout = setTimeout(() => { timeout = null; close() }, options.delayMs ?? 350)
  }
  const down = (event: PointerEvent) => { keyboardFocus = false; clear(); if (options.isOpen() && !contains(event.target)) close() }
  const focus = (event: FocusEvent) => { if (options.isOpen() && !contains(event.target)) close() }
  const key = (event: KeyboardEvent) => {
    if (!options.isOpen()) return
    keyboardFocus = true; clear()
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true) }
  }
  document.addEventListener('pointermove', move, { passive: true })
  document.addEventListener('pointerdown', down, true)
  document.addEventListener('focusin', focus)
  document.addEventListener('keydown', key, true)
  return () => { clear(); document.removeEventListener('pointermove', move); document.removeEventListener('pointerdown', down, true); document.removeEventListener('focusin', focus); document.removeEventListener('keydown', key, true) }
}

const detailDisposers = new WeakMap<HTMLDetailsElement, () => void>()
export const vTransientPopover: ObjectDirective<HTMLDetailsElement> = {
  mounted(element) {
    detailDisposers.set(element, installTransientPopover({
      isOpen: () => element.open,
      regions: () => [element, ...Array.from(element.children).filter((child): child is HTMLElement => child instanceof HTMLElement)],
      close: restoreFocus => { element.open = false; if (restoreFocus) element.querySelector('summary')?.focus() }
    }))
  },
  beforeUnmount(element) { detailDisposers.get(element)?.(); detailDisposers.delete(element) }
}
