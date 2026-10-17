/** 游戏原生文本输入：协调浏览器输入控件与游戏文本状态及焦点。 */
import { truncateUtf16 } from './uiTextLayout'

/** Browser selection/composition remains native; the scene receives only committed values. */
export class UiNativeInputBridge {
  private owner = ''
  private composing = false
  private compositionCommittedAt = -Infinity
  /** 结构说明（自动提取）：匿名回调；输入 commit；空实现，不执行额外操作。 */ constructor(private readonly commit: (uuid: string, value: string) => boolean) {}
  /* 返回 this.composing 的当前值。 */ get isComposing(): boolean { return this.composing }
  /** 结构说明（自动提取）：bind；输入 input、uuid、value；直接调用 input.setSelectionRange、Math.min；写入 owner、composing、compositionCommittedAt、input.value。 */ bind(input: HTMLInputElement, uuid: string, value: string): void {
    if (uuid !== this.owner) { this.owner = uuid; this.composing = false; this.compositionCommittedAt = -Infinity; input.value = value; return }
    if (this.composing || input.value === value) return
    const start = input.selectionStart, end = input.selectionEnd, direction = input.selectionDirection
    input.value = value
    if (start !== null && end !== null) input.setSelectionRange(Math.min(start, value.length), Math.min(end, value.length), direction ?? undefined)
  }
  /** 将 true 赋给 this.composing，不显式返回值。 */ compositionStart(): void { this.composing = true }
  /** 结构说明（自动提取）：compositionEnd；输入 input、maximum；直接调用 performance.now、flush；写入 composing、compositionCommittedAt。 */ compositionEnd(input: HTMLInputElement, maximum: number): boolean { this.composing = false; this.compositionCommittedAt = performance.now(); return this.flush(input, maximum) }
  /* 根据 this.composing || isComposing 的真假，分别返回 false 或 this.flush(input, maximum)。 */ input(input: HTMLInputElement, maximum: number, isComposing = false): boolean { return this.composing || isComposing ? false : this.flush(input, maximum) }
  /** 结构说明（自动提取）：flush；输入 input、maximum；直接调用 truncateUtf16、Math.min、input.setSelectionRange、commit；写入 input.value。 */ flush(input: HTMLInputElement, maximum: number): boolean {
    if (!this.owner || this.composing) return false
    const value = truncateUtf16(input.value, Math.min(100_000, maximum))
    if (value !== input.value) { const start = input.selectionStart; input.value = value; if (start !== null) input.setSelectionRange(Math.min(start, value.length), Math.min(start, value.length)) }
    return this.commit(this.owner, value)
  }
  /** 结构说明（自动提取）：ownsCompositionKey；输入 event；直接调用 performance.now。 */ ownsCompositionKey(event: Pick<KeyboardEvent, 'isComposing' | 'keyCode' | 'key'>): boolean { return this.composing || event.isComposing || event.keyCode === 229 || event.key === 'Enter' && performance.now() - this.compositionCommittedAt < 32 }
  /** 结构说明（自动提取）：reset；无显式参数；写入 owner、composing、compositionCommittedAt。 */ reset(): void { this.owner = ''; this.composing = false; this.compositionCommittedAt = -Infinity }
}

/** Editor buttons, links and form controls keep their own keyboard activation. */
/** 结构说明（自动提取）：isExternalUiControl；输入 target、gameSurface；直接调用 gameSurface.contains、target.closest、Boolean。 */ export function isExternalUiControl(target: EventTarget | null, gameSurface: HTMLElement | null): boolean {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return false
  if (gameSurface?.contains(target) && target.closest('[data-game-ui-control], .overlay-canvas')) return false
  return Boolean(target.closest('button, input, textarea, select, a[href], [contenteditable]:not([contenteditable="false"]), [role="button"], [role="tab"], [role="menuitem"], [role="textbox"], [role="slider"], [role="checkbox"]'))
}
