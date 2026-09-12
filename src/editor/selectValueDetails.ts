/** Editor-only full selected values, shared by native selects without replacing them. */
let dispose: (() => void) | null = null
export function installSelectValueDetails(): void {
  if (dispose || typeof document === 'undefined') return
  const hint = document.createElement('div')
  hint.id = 'nova-selected-value-detail'
  hint.dataset.novaSelectDetail = 'true'
  hint.setAttribute('role', 'tooltip')
  hint.hidden = true
  document.body.append(hint)
  let active: HTMLSelectElement | null = null
  const hide = () => {
    if (active) {
      const tokens = (active.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(token => token && token !== hint.id)
      if (tokens.length) active.setAttribute('aria-describedby', tokens.join(' '))
      else active.removeAttribute('aria-describedby')
    }
    active = null; hint.hidden = true
  }
  const show = (element: HTMLSelectElement) => {
    hide()
    if (!element.isConnected || !element.closest('.editor-root,.project-manager')) return
    const text = element.selectedOptions[0]?.textContent?.trim()
    if (!text) return
    active = element; hint.textContent = text; hint.hidden = false
    element.setAttribute('aria-describedby', [element.getAttribute('aria-describedby'), hint.id].filter(Boolean).join(' '))
    const box = element.getBoundingClientRect()
    hint.style.left = `${Math.max(8, Math.min(box.left, innerWidth - hint.offsetWidth - 8))}px`
    hint.style.top = `${Math.max(8, Math.min(box.bottom + 4, innerHeight - hint.offsetHeight - 8))}px`
  }
  const reposition = () => { if (active) { const box = active.getBoundingClientRect(); if (!active.isConnected || !box.width || !box.height || box.bottom < 0 || box.top > innerHeight) hide(); else show(active) } }
  const enter = (event: Event) => { if (event.target instanceof HTMLSelectElement) show(event.target) }
  const leave = (event: Event) => { if (event.target === active && document.activeElement !== active) hide() }
  const blur = (event: Event) => { if (event.target === active) hide() }
  const change = (event: Event) => { if (event.target === active && active) show(active) }
  const key = (event: KeyboardEvent) => { if (event.key === 'Escape') hide() }
  document.addEventListener('pointerover', enter, true); document.addEventListener('focusin', enter, true)
  document.addEventListener('pointerout', leave, true); document.addEventListener('focusout', blur, true)
  document.addEventListener('change', change, true); document.addEventListener('input', change, true)
  document.addEventListener('keydown', key, true); document.addEventListener('scroll', reposition, true)
  window.addEventListener('resize', hide)
  dispose = () => {
    hide(); hint.remove()
    document.removeEventListener('pointerover', enter, true); document.removeEventListener('focusin', enter, true)
    document.removeEventListener('pointerout', leave, true); document.removeEventListener('focusout', blur, true)
    document.removeEventListener('change', change, true); document.removeEventListener('input', change, true)
    document.removeEventListener('keydown', key, true); document.removeEventListener('scroll', reposition, true)
    window.removeEventListener('resize', hide)
  }
}
export function disposeSelectValueDetails(): void { dispose?.(); dispose = null }
