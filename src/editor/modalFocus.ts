/** 模态焦点管理：按优先级选择活动对话框，约束焦点与 Tab 导航并在卸载时清理。 */
import type { ObjectDirective } from 'vue'

interface ModalEntry { root: HTMLElement; previous: HTMLElement | null; last: HTMLElement | null; ownedTabIndex: boolean }
const entries: ModalEntry[] = []
const selector = 'a[href],area[href],button,input,select,textarea,iframe,[contenteditable="true"],[tabindex]'
/** 检查控件仍连接文档、未处于隐藏或惰性容器且有可见布局矩形。 */ function visible(element: HTMLElement): boolean {
  return element.isConnected && !element.closest('[inert],[hidden]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden'
}
/** 筛选可见且可用的键盘控件，按正 tabindex 优先的顺序排列。 */ function controls(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(selector)].filter(/* 先计算 element.tabIndex >= 0 && !element.matches(':disabled')；仅当其为真值时求右侧 visible(element)，返回短路求值结果。 */ element => element.tabIndex >= 0 && !element.matches(':disabled') && visible(element))
    .sort(/* 计算表达式 (a.tabIndex > 0 ? a.tabIndex : Infinity) - (b.tabIndex > 0 ? b.tabIndex : Infinity) 并返回结果，沿用操作数的原有类型规则。 */ (a,b) => (a.tabIndex > 0 ? a.tabIndex : Infinity) - (b.tabIndex > 0 ? b.tabIndex : Infinity))
}
/** 沿祖先链读取有限 z-index，使用最大值评估模态层级。 */ function priority(root: HTMLElement): number {
  let highest = 0
  for (let element: HTMLElement | null = root; element; element = element.parentElement) {
    const value = Number.parseInt(getComputedStyle(element).zIndex, 10)
    if (Number.isFinite(value)) highest = Math.max(highest, value)
  }
  return highest
}
/** 选择当前可见且层级最高的模态记录，同层时采用较晚登记者。 */ function top(): ModalEntry | undefined {
  return entries.filter(/* 调用 visible(entry.root) 并返回调用结果。 */ entry => visible(entry.root)).reduce<ModalEntry | undefined>(/* 根据 !best || priority(entry.root) >= priority(best.root) 的真假，分别返回 entry 或 best。 */ (best, entry) => !best || priority(entry.root) >= priority(best.root) ? entry : best, undefined)
}
/** 优先恢复模态内上次焦点，或选择首尾控件；无可用控件时聚焦模态根节点。 */ function focus(entry: ModalEntry, last = false): void {
  const items = controls(entry.root)
  const target = last ? items.at(-1) : entry.last && visible(entry.last) && !entry.last.matches(':disabled') ? entry.last : items[0]
  ;(target ?? entry.root).focus({ preventScroll: true })
}
/** 记住顶层模态内部的新焦点，将外部焦点重新引入顶层模态。 */ function containFocus(event: FocusEvent): void {
  const entry = top(), target = event.target
  if (!entry || !(target instanceof HTMLElement)) return
  if (entry.root.contains(target)) entry.last = target
  else focus(entry)
}
/** 处理未被拦截的 Tab 导航，在顶层模态首尾循环并支持空控件集合。 */ function containTab(event: KeyboardEvent): void {
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
  /** 登记模态及原焦点，必要时设置根节点 tabindex，并在首个模态挂载时安装全局焦点约束。 */ mounted(root) {
    const entry: ModalEntry = { root, previous: document.activeElement instanceof HTMLElement ? document.activeElement : null, last: null, ownedTabIndex: !root.hasAttribute('tabindex') }
    if (entry.ownedTabIndex) root.tabIndex = -1
    entries.push(entry)
    if (entries.length === 1) { document.addEventListener('focusin', containFocus, true); document.addEventListener('keydown', containTab, true) }
    queueMicrotask(/** 布局更新后仅为仍登记且居于顶层的模态补充初始焦点。 */ () => { if (entries.includes(entry) && top() === entry && !root.contains(document.activeElement)) focus(entry) })
  },
  /** 撤销模态记录和自建 tabindex，最后一个模态移除时清理监听，并延后恢复适当焦点。 */ beforeUnmount(root) {
    const at = entries.findIndex(/* 比较 entry.root 与 root，返回严格相等的判断结果。 */ entry => entry.root === root); if (at < 0) return
    const [entry] = entries.splice(at, 1), ownedFocus = root.contains(document.activeElement)
    if (!entries.length) { document.removeEventListener('focusin', containFocus, true); document.removeEventListener('keydown', containTab, true) }
    if (entry.ownedTabIndex) root.removeAttribute('tabindex')
    queueMicrotask(/** 只在被移除模态原本持有焦点时恢复可见原控件，否则聚焦剩余顶层模态。 */ () => {
      if (!ownedFocus) return
      const parent = top()
      if (entry.previous && visible(entry.previous) && (!parent || parent.root.contains(entry.previous))) entry.previous.focus({ preventScroll: true })
      else if (parent) focus(parent)
    })
  },
}
