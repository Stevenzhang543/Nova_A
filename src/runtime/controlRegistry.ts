/** 游戏控件登记：按实体和控件身份建立运行查询及清理边界。 */
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

type StableControlElement = HTMLElement | SVGElement
/* 先计算 node instanceof HTMLElement；仅当其为假值时求右侧 node instanceof SVGElement，返回短路求值结果。 */ function isControlElement(node: Node): node is StableControlElement { return node instanceof HTMLElement || node instanceof SVGElement }
/* 调用 ('innerText' in element ? element.innerText : element.textContent ?? '').trim() 并返回调用结果。 */ function renderedText(element: StableControlElement): string { return ('innerText' in element ? element.innerText : element.textContent ?? '').trim() }

const SELECTOR = 'button,input,select,textarea,a[href],[role="button"],[role="tab"],[role="menuitem"],[data-stable-control]'
const INTERNAL_SELECTOR = '[data-feature-state="internal"]'
let observer: MutationObserver | null = null
let identityBatch: { used: Set<string>; next: Map<string, number> } | null = null
/** 结构说明（自动提取）：withIdentityBatch；输入 action；直接调用 action、Set、map、document.querySelectorAll、Map；写入 identityBatch。 */ function withIdentityBatch(action: () => void): void {
  if (identityBatch) { action(); return }
  identityBatch = { used: new Set([...document.querySelectorAll<StableControlElement>('[data-testid]')].map(/** 结构说明（自动提取）：map 回调；输入 element；返回表达式求值结果。 */ element => element.dataset.testid!)), next: new Map() }
  try { action() } finally { identityBatch = null }
}

/** 结构说明（自动提取）：slug；输入 value；直接调用 replace、toLocaleLowerCase、value.normalize、normalized.slice。 */ function slug(value: string): string {
  const normalized = value.normalize('NFKD').toLocaleLowerCase().replace(/[^a-z0-9\u3400-\u9fff]+/g, '-').replace(/^-|-$/g, '')
  return normalized.slice(0, 56) || 'control'
}

/** 结构说明（自动提取）：derivedVisibleText；输入 element；直接调用 element.labels[…].textContent.trim、element.getAttribute、replace、renderedText、element.textContent.trim。 */ function derivedVisibleText(element: StableControlElement): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return element.labels?.[0]?.textContent?.trim() || element.placeholder || element.name || element.type
  if (element instanceof HTMLSelectElement) return element.labels?.[0]?.textContent?.trim() || element.name || 'Select'
  return element.getAttribute('title') || renderedText(element).replace(/\s+/g, ' ') || element.textContent?.trim().replace(/\s+/g, ' ') || ''
}

/** 结构说明（自动提取）：visibleText；输入 element；直接调用 element.getAttribute、derivedVisibleText。 */ function visibleText(element: StableControlElement): string {
  const authoredAriaLabel = element.dataset.generatedAriaLabel === 'true' ? '' : element.getAttribute('aria-label')
  return authoredAriaLabel || derivedVisibleText(element)
}

/** 结构说明（自动提取）：surfaceName；输入 element；直接调用 element.closest。 */ function surfaceName(element: StableControlElement): string {
  const scope = element.closest<StableControlElement>('[data-control-scope],[data-surface]')
  return scope?.dataset.controlScope || scope?.dataset.surface || 'application'
}

/** 结构说明（自动提取）：kindOf；输入 element；直接调用 element.getAttribute、element.tagName.toLocaleLowerCase、includes；返回路径包含 role。 */ function kindOf(element: StableControlElement): StableControlKind {
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
/** 结构说明（自动提取）：structuralPath；输入 element、scope；直接调用 current.getAttribute、parts.unshift、current.tagName.toLocaleLowerCase、slug、filter 等；写入 current；包含循环处理。 */ function structuralPath(element: StableControlElement, scope: StableControlElement): string {
  const parts: string[] = []
  let current: StableControlElement | null = element
  while (current && current !== scope && parts.length < 12) {
    const authored = current.dataset.testKey || current.id || current.getAttribute('name') || current.dataset.command || current.dataset.doc || current.dataset.shortcut
    if (authored) {
      parts.unshift(`${current.tagName.toLocaleLowerCase()}-${slug(authored)}`)
      break
    }
    const tag = current.tagName.toLocaleLowerCase()
    const siblings = current.parentElement ? [...current.parentElement.children].filter(/* 比较 item.tagName 与 current!.tagName，返回严格相等的判断结果。 */ item => item.tagName === current!.tagName) : []
    const index = Math.max(0, siblings.indexOf(current)) + 1
    parts.unshift(`${tag}-${index}`)
    current = current.parentElement
  }
  return parts.join('--') || `${kindOf(element)}-1`
}

/** 结构说明（自动提取）：assignStableIdentity；输入 element；直接调用 element.matches、element.closest、visibleText、surfaceName、element.getAttribute 等；写入 element.dataset.surface、suffix、id、element.dataset.testid 等；包含循环处理。 */ function assignStableIdentity(element: StableControlElement): void {
  if (element.matches(INTERNAL_SELECTOR) || element.closest(INTERNAL_SELECTOR)) return
  const label = visibleText(element)
  const surface = surfaceName(element)
  element.dataset.surface ||= surface
  if (!element.dataset.testid) {
    const scope = element.closest<StableControlElement>('[data-control-scope],[data-surface]') || document.documentElement
    const explicitKey = element.dataset.testKey || element.id || element.getAttribute('name') || element.dataset.command || element.dataset.doc || element.dataset.shortcut
    const stableKey = explicitKey ? slug(explicitKey) : structuralPath(element, scope)
    const base = `nova-${slug(surface)}-${stableKey}`
    let id = base, suffix = 2
    if (identityBatch) {
      suffix = identityBatch.next.get(base) ?? 2
      while (identityBatch.used.has(id)) id = `${base}-${suffix++}`
      identityBatch.used.add(id)
      identityBatch.next.set(base, suffix)
    } else {
    while (document.querySelector(`[data-testid="${CSS.escape(id)}"]`)) id = `${base}-${suffix++}`
    }
    element.dataset.testid = id
    element.dataset.testIdentity = explicitKey ? 'authored' : 'structural'
    element.dataset.testPath = structuralPath(element, scope)
  }
  if (!element.getAttribute('aria-labelledby')) {
    const generatedLabel = derivedVisibleText(element) || kindOf(element)
    if (element.dataset.generatedAriaLabel === 'true') {
      if (element.getAttribute('aria-label') !== generatedLabel) element.setAttribute('aria-label', generatedLabel)
    } else if (!element.getAttribute('aria-label') && (!label || !renderedText(element))) {
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
    if (!element.getAttribute('title')) {
      element.dataset.generatedDisabledTitle = reason
      element.setAttribute('title', reason)
    }
  } else {
    // A generated disabled hint must not survive when a control becomes usable.
    // Preserve authored titles (including a title changed while disabled).
    if (element.dataset.generatedDisabledTitle !== undefined) {
      if (element.getAttribute('title') === element.dataset.generatedDisabledTitle) element.removeAttribute('title')
      delete element.dataset.generatedDisabledTitle
    }
    if (element.dataset.generatedDisabledReason === 'true') {
      delete element.dataset.disabledReason
      delete element.dataset.generatedDisabledReason
    }
  }
}

/** 结构说明（自动提取）：refreshTextOwner；输入 node；直接调用 isControlElement、parent.matches、assignStableIdentity、parent.closest、forEach 等。 */ function refreshTextOwner(node: Node): void {
  const parent = isControlElement(node) ? node : node.parentElement
  if (!parent) return
  if (parent.matches(SELECTOR)) assignStableIdentity(parent)
  const label = parent.closest('label')
  label?.querySelectorAll<StableControlElement>(SELECTOR).forEach(assignStableIdentity)
}

/** 结构说明（自动提取）：scan；输入 root；直接调用 isControlElement、root.matches、assignStableIdentity、forEach、root.querySelectorAll。 */ function scan(root: ParentNode = document): void {
  if (root instanceof Node && isControlElement(root) && root.matches(SELECTOR)) assignStableIdentity(root)
  root.querySelectorAll<StableControlElement>(SELECTOR).forEach(assignStableIdentity)
}

/** 结构说明（自动提取）：installStableControlRegistry；无显式参数；直接调用 withIdentityBatch、MutationObserver、observer.observe；写入 observer。 */ export function installStableControlRegistry(): void {
  if (typeof document === 'undefined' || observer) return
  withIdentityBatch(/* 调用 scan() 并返回调用结果。 */ () => scan())
  observer = new MutationObserver(/** 结构说明（自动提取）：匿名回调；输入 records；直接调用 withIdentityBatch；返回表达式求值结果。 */ records => withIdentityBatch(/** 结构说明（自动提取）：withIdentityBatch 回调；无显式参数；直接调用 Set、isControlElement、attributeTargets.add、textOwners.add、record.addedNodes.forEach 等；包含循环处理。 */ () => {
    // Vue may append thousands of options to one select in a single turn.
    // Re-reading that select's complete label per record is quadratic work.
    const attributeTargets = new Set<StableControlElement>()
    const textOwners = new Set<Node>()
    const addedRoots = new Set<StableControlElement>()
    for (const record of records) {
      if (record.type === 'attributes' && isControlElement(record.target)) attributeTargets.add(record.target)
      if (record.type === 'characterData' || record.type === 'childList') textOwners.add(record.target)
      record.addedNodes.forEach(/** 结构说明（自动提取）：record.addedNodes.forEach 回调；输入 node；直接调用 isControlElement、addedRoots.add。 */ node => { if (isControlElement(node)) addedRoots.add(node) })
    }
    for (const target of attributeTargets) if (target.isConnected) assignStableIdentity(target)
    for (const owner of textOwners) if (owner.isConnected) refreshTextOwner(owner)
    for (const node of addedRoots) if (node.isConnected) scan(node)
  }))
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'aria-label', 'title'] })
}

/** 结构说明（自动提取）：stableControlInventory；输入 root；直接调用 withIdentityBatch、map、filter、root.querySelectorAll。 */ export function stableControlInventory(root: ParentNode = document): StableControlRecord[] {
  withIdentityBatch(/* 调用 scan(root) 并返回调用结果。 */ () => scan(root))
  return [...root.querySelectorAll<StableControlElement>('[data-testid]')].filter(/* 调用 element.matches(SELECTOR) 并返回调用结果。 */ element => element.matches(SELECTOR)).map(/** 结构说明（自动提取）：map 回调；输入 element；直接调用 kindOf、visibleText、surfaceName、Boolean、element.getAttribute；返回表达式求值结果。 */ element => ({
    testId: element.dataset.testid!, kind: kindOf(element), label: visibleText(element), surface: surfaceName(element),
    identitySource: element.dataset.testIdentity === 'authored' ? 'authored' : 'structural', structuralPath: element.dataset.testPath || '',
    disabled: 'disabled' in element && Boolean((element as HTMLButtonElement).disabled), disabledReason: element.dataset.disabledReason || element.getAttribute('title') || '',
    shortcut: element.dataset.shortcut || ''
  }))
}

/** 结构说明（自动提取）：focusStableControl；输入 testId；直接调用 document.querySelector、CSS.escape、control.scrollIntoView、control.focus。 */ export function focusStableControl(testId: string): boolean {
  const control = document.querySelector<StableControlElement>(`[data-testid="${CSS.escape(testId)}"]`)
  if (!control) return false
  control.scrollIntoView({ block: 'nearest', inline: 'nearest' }); control.focus(); return true
}
