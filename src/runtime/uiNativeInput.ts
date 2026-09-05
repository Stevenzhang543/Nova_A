import { truncateUtf16 } from './uiTextLayout'

/** Browser selection/composition remains native; the scene receives only committed values. */
export class UiNativeInputBridge {
  private owner = ''
  private composing = false
  private compositionCommittedAt = -Infinity
  constructor(private readonly commit: (uuid: string, value: string) => boolean) {}
  get isComposing(): boolean { return this.composing }
  bind(input: HTMLInputElement, uuid: string, value: string): void {
    if (uuid !== this.owner) { this.owner = uuid; this.composing = false; this.compositionCommittedAt = -Infinity; input.value = value; return }
    if (this.composing || input.value === value) return
    const start = input.selectionStart, end = input.selectionEnd, direction = input.selectionDirection
    input.value = value
    if (start !== null && end !== null) input.setSelectionRange(Math.min(start, value.length), Math.min(end, value.length), direction ?? undefined)
  }
  compositionStart(): void { this.composing = true }
  compositionEnd(input: HTMLInputElement, maximum: number): boolean { this.composing = false; this.compositionCommittedAt = performance.now(); return this.flush(input, maximum) }
  input(input: HTMLInputElement, maximum: number, isComposing = false): boolean { return this.composing || isComposing ? false : this.flush(input, maximum) }
  flush(input: HTMLInputElement, maximum: number): boolean {
    if (!this.owner || this.composing) return false
    const value = truncateUtf16(input.value, Math.min(100_000, maximum))
    if (value !== input.value) { const start = input.selectionStart; input.value = value; if (start !== null) input.setSelectionRange(Math.min(start, value.length), Math.min(start, value.length)) }
    return this.commit(this.owner, value)
  }
  ownsCompositionKey(event: Pick<KeyboardEvent, 'isComposing' | 'keyCode' | 'key'>): boolean { return this.composing || event.isComposing || event.keyCode === 229 || event.key === 'Enter' && performance.now() - this.compositionCommittedAt < 32 }
  reset(): void { this.owner = ''; this.composing = false; this.compositionCommittedAt = -Infinity }
}

/** Editor buttons, links and form controls keep their own keyboard activation. */
export function isExternalUiControl(target: EventTarget | null, gameSurface: HTMLElement | null): boolean {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return false
  if (gameSurface?.contains(target) && target.closest('[data-game-ui-control], .overlay-canvas')) return false
  return Boolean(target.closest('button, input, textarea, select, a[href], [contenteditable]:not([contenteditable="false"]), [role="button"], [role="tab"], [role="menuitem"], [role="textbox"], [role="slider"], [role="checkbox"]'))
}
