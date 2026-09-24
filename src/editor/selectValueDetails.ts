/** 下拉值详情辅助：让截断的选项值可查看完整内容，并统一管理事件监听的生命周期。 */
/** Editor-only full selected values, shared by native selects without replacing them. */
let dispose: (() => void) | null = null
/** 单次安装选择框完整值提示，联动指针、键盘及布局变化，并保存对应清理函数。 */ export function installSelectValueDetails(): void {
  if (dispose || typeof document === 'undefined') return
  const hint = document.createElement('div')
  hint.id = 'nova-selected-value-detail'
  hint.dataset.novaSelectDetail = 'true'
  hint.setAttribute('role', 'tooltip')
  hint.hidden = true
  document.body.append(hint)
  let active: HTMLSelectElement | null = null
  const hide = /** 移除当前选择框对提示的无障碍引用，同时保留其他描述引用并隐藏提示。 */ () => {
    if (active) {
      const tokens = (active.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(/* 先计算 token；仅当其为真值时求右侧 token !== hint.id，返回短路求值结果。 */ token => token && token !== hint.id)
      if (tokens.length) active.setAttribute('aria-describedby', tokens.join(' '))
      else active.removeAttribute('aria-describedby')
    }
    active = null; hint.hidden = true
  }
  const show = /** 为编辑器内有效选择框显示当前选项完整文本，将提示位置限制在视口边距内。 */ (element: HTMLSelectElement) => {
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
  const reposition = /** 滚动时隐藏已脱离可见布局的选择框提示，否则根据当前位置重排。 */ () => { if (active) { const box = active.getBoundingClientRect(); if (!active.isConnected || !box.width || !box.height || box.bottom < 0 || box.top > innerHeight) hide(); else show(active) } }
  const enter = /** 指针进入或焦点进入选择框时显示完整选项文本。 */ (event: Event) => { if (event.target instanceof HTMLSelectElement) show(event.target) }
  const leave = /** 指针离开当前选择框且该框不持有键盘焦点时隐藏提示。 */ (event: Event) => { if (event.target === active && document.activeElement !== active) hide() }
  const blur = /** 当前选择框失去焦点时隐藏提示。 */ (event: Event) => { if (event.target === active) hide() }
  const change = /** 当前选择框选项变化时刷新提示内容和位置。 */ (event: Event) => { if (event.target === active && active) show(active) }
  const key = /** 按 Escape 隐藏选择框完整值提示。 */ (event: KeyboardEvent) => { if (event.key === 'Escape') hide() }
  document.addEventListener('pointerover', enter, true); document.addEventListener('focusin', enter, true)
  document.addEventListener('pointerout', leave, true); document.addEventListener('focusout', blur, true)
  document.addEventListener('change', change, true); document.addEventListener('input', change, true)
  document.addEventListener('keydown', key, true); document.addEventListener('scroll', reposition, true)
  window.addEventListener('resize', hide)
  dispose = /** 移除提示节点及所有文档、窗口监听，防止重复安装产生悬挂资源。 */ () => {
    hide(); hint.remove()
    document.removeEventListener('pointerover', enter, true); document.removeEventListener('focusin', enter, true)
    document.removeEventListener('pointerout', leave, true); document.removeEventListener('focusout', blur, true)
    document.removeEventListener('change', change, true); document.removeEventListener('input', change, true)
    document.removeEventListener('keydown', key, true); document.removeEventListener('scroll', reposition, true)
    window.removeEventListener('resize', hide)
  }
}
/** 执行已登记清理函数并清空单例标记，允许后续重新安装。 */ export function disposeSelectValueDetails(): void { dispose?.(); dispose = null }
