/** 临时弹层交互：统一指针离开延迟、容错区域及事件清理，避免顶栏弹层相互遮挡。 */
import type { ObjectDirective } from 'vue'

export interface TransientPopoverOptions {
  isOpen(): boolean
  regions(): readonly HTMLElement[]
  close(restoreFocus: boolean): void
  delayMs?: number
  paddingPx?: number
}

/** Pointer travel tolerance for transient controls; never attach to a draft-bearing dialog. */
/** 为临时面板安装带容错边距与关闭延时的指针行为，同时保护键盘焦点并返回完整清理函数。 */ export function installTransientPopover(options: TransientPopoverOptions): () => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  let keyboardFocus = false
  const clear = /** 取消待执行的自动关闭计时器并清空句柄。 */ () => { if (timeout !== null) clearTimeout(timeout); timeout = null }
  const regions = /* 调用 options.regions().filter(element => element.isConnected && !element.inert) 并返回调用结果。 */ () => options.regions().filter(/* 先计算 element.isConnected；仅当其为真值时求右侧 !element.inert，返回短路求值结果。 */ element => element.isConnected && !element.inert)
  const contains = /* 先计算 target instanceof Node；仅当其为真值时求右侧 regions().some(element => element.contains(target))，返回短路求值结果。 */ (target: EventTarget | null) => target instanceof Node && regions().some(/* 调用 element.contains(target) 并返回调用结果。 */ element => element.contains(target))
  const close = /** 取消计时并关闭仍打开的面板，按调用选项决定是否恢复触发器焦点。 */ (restoreFocus = false) => { clear(); if (options.isOpen()) options.close(restoreFocus) }
  const move = /** 忽略触屏悬停；指针离开容错区域且键盘焦点未受保护时安排延迟关闭。 */ (event: PointerEvent) => {
    if (!options.isOpen() || event.pointerType === 'touch') { clear(); return }
    const padding = options.paddingPx ?? 12
    const inside = regions().some(/** 检查指针是否位于元素矩形及配置容错边距内。 */ element => { const r = element.getBoundingClientRect(); return event.clientX >= r.left - padding && event.clientX <= r.right + padding && event.clientY >= r.top - padding && event.clientY <= r.bottom + padding })
    if (inside || keyboardFocus && contains(document.activeElement)) { clear(); return }
    if (timeout === null) timeout = setTimeout(/** 延时到期后清空计时句柄并关闭面板。 */ () => { timeout = null; close() }, options.delayMs ?? 350)
  }
  const down = /** 指针按下时退出键盘保护并清除延时，点击面板区域外则关闭面板。 */ (event: PointerEvent) => { keyboardFocus = false; clear(); if (options.isOpen() && !contains(event.target)) close() }
  const focus = /** 打开面板的焦点移动到所有保护区域之外时关闭面板。 */ (event: FocusEvent) => { if (options.isOpen() && !contains(event.target)) close() }
  const key = /** 键盘交互取消自动关闭，Escape 消费事件并关闭面板且恢复触发器焦点。 */ (event: KeyboardEvent) => {
    if (!options.isOpen()) return
    keyboardFocus = true; clear()
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true) }
  }
  document.addEventListener('pointermove', move, { passive: true })
  document.addEventListener('pointerdown', down, true)
  document.addEventListener('focusin', focus)
  document.addEventListener('keydown', key, true)
  return /** 卸载指针、焦点及键盘监听并取消待执行关闭，释放面板行为。 */ () => { clear(); document.removeEventListener('pointermove', move); document.removeEventListener('pointerdown', down, true); document.removeEventListener('focusin', focus); document.removeEventListener('keydown', key, true) }
}

const detailDisposers = new WeakMap<HTMLDetailsElement, () => void>()
export const vTransientPopover: ObjectDirective<HTMLDetailsElement> = {
  /** 为 details 元素安装临时面板行为，将其子元素纳入保护区域并保存清理函数。 */ mounted(element) {
    detailDisposers.set(element, installTransientPopover({
      isOpen: /* 返回 element.open 的当前值。 */ () => element.open,
      regions: /* 返回按声明顺序构造的数组 [element, ...Array.from(element.children).filter((child): child is HTMLElement => child instanceof HTMLElement)]。 */ () => [element, ...Array.from(element.children).filter(/** 仅将 HTML 子元素纳入临时面板保护区域。 */ (child): child is HTMLElement => child instanceof HTMLElement)],
      close: /** 收起 details 面板，按需将键盘焦点返回 summary 触发器。 */ restoreFocus => { element.open = false; if (restoreFocus) element.querySelector('summary')?.focus() }
    }))
  },
  /** 调用并移除 details 元素的行为清理函数。 */ beforeUnmount(element) { detailDisposers.get(element)?.(); detailDisposers.delete(element) }
}
