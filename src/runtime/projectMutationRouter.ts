/** 项目修改分发：将统一编辑意图路由到对应资源或场景处理边界。 */
import { getProjectSessionGeneration } from '../projects/projectSession'

const INPUT_DELAY_MS = 420
let installed = false
let installationGeneration = 0
let nextControlId = 0
const timers = new Map<HTMLElement, number>()
const controlIds = new WeakMap<HTMLElement, number>()
const queued = new Map<HTMLElement, () => void>()
let lastControl: HTMLElement | null = null
let recorder: ((label:string, mergeKey:string, resource:string) => void) | null = null
/** The loaded editor supplies its command sink without making launcher imports eager. */
/** 将 sink 赋给 recorder，不显式返回值。 */ export function setProjectMutationRecorder(sink: typeof recorder): void { recorder = sink }
/** 复制待提交回调列表后逐项执行，允许提交过程安全移除队列条目。 */ export function flushPendingProjectMutations(): void { for (const commit of [...queued.values()]) commit() }

/** 从关联标签、无障碍标签、名称或类型提取控件编辑历史描述。 */ function labelFor(target: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  return target.labels?.[0]?.innerText.trim().replace(/\s+/g, ' ').slice(0, 120)
    || target.getAttribute('aria-label') || target.name || target.type
}

/** 仅允许仍连接、可编辑、非显式项目外控件进入修改路由。 */ function eligible(target: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): boolean {
  return target.isConnected && !target.disabled && !('readOnly' in target && target.readOnly)
    && !target.closest('[data-non-project-control]')
}

/** 为有效输入构造作用域与资源合并键，切换控件时结算旧编辑，按事件类型防抖提交历史。 */ function route(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) || !eligible(target)) return
  if (lastControl && lastControl !== target) queued.get(lastControl)?.()
  lastControl = target
  const previous = timers.get(target)
  if (previous !== undefined) window.clearTimeout(previous)
  if (!controlIds.has(target)) controlIds.set(target, ++nextControlId)
  const session = getProjectSessionGeneration()
  const installation = installationGeneration
  const scope = target.closest<HTMLElement>('[data-control-scope],[data-surface]')
  const surface = scope?.dataset.controlScope || scope?.dataset.surface || 'project'
  const testId = target.dataset.testid || target.id || target.name || 'control'
  const label = labelFor(target)
  const resource = target.closest<HTMLElement>('[data-resource-key]')?.dataset.resourceKey || ''
  const mergeKey = `control:${surface}:${resource}:${testId}:${controlIds.get(target)}`
  const current = /** 校验路由安装代次、项目会话、控件可编辑状态和资源归属仍与捕获时一致。 */ () => installed && installation === installationGeneration
    && session === getProjectSessionGeneration() && eligible(target)
    && (target.closest<HTMLElement>('[data-resource-key]')?.dataset.resourceKey || '') === resource
  const commit = /** 清理控件计时和队列，确认上下文有效后调用记录器，或延迟加载编辑存储并再次检查。 */ () => {
    const timer = timers.get(target)
    if (timer !== undefined) window.clearTimeout(timer)
    timers.delete(target)
    queued.delete(target)
    if (!current()) return
    if (recorder) { recorder(`Edit ${label}`, mergeKey, resource ? `${surface}/${resource}/${testId}` : `${surface}/${testId}`); return }
    // Keep the launcher/player split lazy. Recheck after module loading too.
    void import('../store/physics').then(/** 懒加载完成后再次确认当前上下文和编辑模式，再记录控件历史。 */ ({ physicsState, pushHistory }) => {
      if (current() && physicsState.playMode === 'editing') pushHistory(`Edit ${label}`, mergeKey, `${surface}/${testId}`)
    }).catch(/* 调用 console.warn('Nova_A could not record the control edit.', error) 并返回调用结果。 */ error => console.warn('Nova_A could not record the control edit.', error))
  }
  queued.set(target, commit)
  timers.set(target, window.setTimeout(commit, event.type === 'change' ? 0 : INPUT_DELAY_MS))
}

/** Cancel queued and already-importing callbacks after an explicit document boundary. */
/** 失效异步提交代次并清空所有计时、队列和最近控件。 */ export function cancelPendingProjectMutations(): void {
  installationGeneration += 1
  for (const timer of timers.values()) window.clearTimeout(timer)
  timers.clear()
  queued.clear()
  lastControl = null
}

/** Safety net only: explicit domain commands and snapshot no-op checks still apply. */
/** 在有文档且尚未安装时监听捕获阶段输入与变更事件。 */ export function installProjectMutationRouter(): void {
  if (installed || typeof document === 'undefined') return
  installed = true
  installationGeneration += 1
  document.addEventListener('input', route, true)
  document.addEventListener('change', route, true)
}

/** 失效路由并移除事件监听，释放全部待提交控件及定时器引用。 */ export function disposeProjectMutationRouter(): void {
  if (!installed) return
  installed = false
  installationGeneration += 1
  document.removeEventListener('input', route, true)
  document.removeEventListener('change', route, true)
  for (const timer of timers.values()) window.clearTimeout(timer)
  timers.clear()
  queued.clear()
  lastControl = null
}
